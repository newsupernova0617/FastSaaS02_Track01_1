import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { createTestApp, type TestAppHandle } from '../../helpers/app';
import { authHeaders } from '../../helpers/auth';
import { expectAuthContract } from '../../helpers/auth-contract';
import { seedUser, seedUserSubscription } from '../../helpers/fixtures';
import * as googlePlayBilling from '../../../src/services/google-play-billing';

let counter = 0;
function uid(prefix = 'billing') {
  counter += 1;
  return `${prefix}-${counter}`;
}

function makeRequest(
  method: string,
  path: string,
  body: object | null,
  headers: Record<string, string> = {},
): Request {
  return new Request(`http://test${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== null ? JSON.stringify(body) : undefined,
  });
}

async function appFetch(handle: TestAppHandle, req: Request) {
  return handle.app.fetch(req, handle.env as any, {} as any);
}

describe('routes/billing', () => {
  let dbHandle: TestDbHandle;
  let appHandle: TestAppHandle;

  beforeEach(async () => {
    dbHandle = await createTestDb();
    appHandle = createTestApp(dbHandle);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    appHandle.cleanup();
  });

  it('enforces auth for GET /api/billing/plan', async () => {
    await expectAuthContract(appHandle, 'GET', '/api/billing/plan');
  });

  it('returns free when the user has no subscription', async () => {
    const userId = uid('free');
    await seedUser(dbHandle.db, { id: userId, email: 'free@test.com' });
    const headers = await authHeaders(userId);

    const res = await appFetch(appHandle, makeRequest('GET', '/api/billing/plan', null, headers));
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.plan).toBe('free');
  });

  it('returns paid when the user has an active unexpired subscription', async () => {
    const userId = uid('paid');
    await seedUser(dbHandle.db, { id: userId, email: 'paid@test.com' });
    await seedUserSubscription(dbHandle.db, {
      userId,
      status: 'active',
      plan: 'paid',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const headers = await authHeaders(userId);

    const res = await appFetch(appHandle, makeRequest('GET', '/api/billing/plan', null, headers));
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.plan).toBe('paid');
    expect(body.status).toBe('active');
  });

  it('downgrades to free when the stored subscription is expired', async () => {
    const userId = uid('expired');
    await seedUser(dbHandle.db, { id: userId, email: 'expired@test.com' });
    await seedUserSubscription(dbHandle.db, {
      userId,
      status: 'active',
      plan: 'paid',
      expiresAt: new Date(Date.now() - 86400000).toISOString(),
    });
    const headers = await authHeaders(userId);

    const res = await appFetch(appHandle, makeRequest('GET', '/api/billing/plan', null, headers));
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.plan).toBe('free');
  });

  it('verifies a purchase and persists the subscription', async () => {
    const userId = uid('verify');
    await seedUser(dbHandle.db, { id: userId, email: 'verify@test.com' });
    const headers = await authHeaders(userId);

    vi.spyOn(googlePlayBilling, 'verifyGooglePlaySubscription').mockResolvedValue({
      platform: 'android',
      productId: 'easy_ai_budget_premium_monthly',
      purchaseToken: 'purchase-token-1',
      status: 'active',
      plan: 'paid',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      autoRenewing: true,
      rawProviderData: '{"subscriptionState":"SUBSCRIPTION_STATE_ACTIVE"}',
      lastVerifiedAt: new Date().toISOString(),
    });

    const res = await appFetch(
      appHandle,
      makeRequest(
        'POST',
        '/api/billing/google-play/verify',
        {
          productId: 'easy_ai_budget_premium_monthly',
          purchaseToken: 'purchase-token-1',
        },
        headers,
      ),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.plan).toBe('paid');

    const planRes = await appFetch(appHandle, makeRequest('GET', '/api/billing/plan', null, headers));
    const planBody = (await planRes.json()) as any;
    expect(planBody.plan).toBe('paid');
  });

  it('processes RTDN and refreshes the stored subscription by purchase token', async () => {
    const userId = uid('rtdn');
    await seedUser(dbHandle.db, { id: userId, email: 'rtdn@test.com' });
    await seedUserSubscription(dbHandle.db, {
      userId,
      productId: 'easy_ai_budget_premium_monthly',
      purchaseToken: 'purchase-token-rtdn',
      status: 'active',
      plan: 'paid',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    appHandle.env.GOOGLE_PLAY_PACKAGE_NAME = 'com.example.app';
    appHandle.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL = 'billing@test-project.iam.gserviceaccount.com';
    appHandle.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY = 'unused-in-test';
    appHandle.env.GOOGLE_PLAY_ACCESS_TOKEN = 'google-access-token';

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (
          url ===
          'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.example.app/purchases/subscriptionsv2/tokens/purchase-token-rtdn'
        ) {
          return new Response(
            JSON.stringify({
              subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED',
              lineItems: [
                {
                  productId: 'easy_ai_budget_premium_monthly',
                  expiryTime: new Date(Date.now() - 86400000).toISOString(),
                },
              ],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      }),
    );

    const payload = {
      version: '1.0',
      packageName: 'com.example.app',
      eventTimeMillis: `${Date.now()}`,
      subscriptionNotification: {
        version: '1.0',
        notificationType: 13,
        purchaseToken: 'purchase-token-rtdn',
        subscriptionId: 'easy_ai_budget_premium_monthly',
      },
    };

    const data = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
    const res = await appFetch(
      appHandle,
      makeRequest('POST', '/billing/google-play/rtdn', {
        message: {
          data,
          messageId: 'msg-1',
        },
        subscription: 'projects/demo/subscriptions/rtdn',
      }),
    );

    expect(res.status).toBe(202);

    const headers = await authHeaders(userId);
    const planRes = await appFetch(appHandle, makeRequest('GET', '/api/billing/plan', null, headers));
    const planBody = (await planRes.json()) as any;
    expect(planBody.plan).toBe('free');
    expect(planBody.status).toBe('expired');
  });

  it('ignores RTDN test notifications', async () => {
    const res = await appFetch(
      appHandle,
      makeRequest('POST', '/billing/google-play/rtdn', {
        message: {
          data: Buffer.from(
            JSON.stringify({
              version: '1.0',
              packageName: 'com.example.app',
              eventTimeMillis: `${Date.now()}`,
              testNotification: {},
            }),
            'utf-8',
          ).toString('base64'),
        },
      }),
    );

    expect(res.status).toBe(202);
  });

  it('ignores RTDN when purchase token is not found locally', async () => {
    const res = await appFetch(
      appHandle,
      makeRequest('POST', '/billing/google-play/rtdn', {
        message: {
          data: Buffer.from(
            JSON.stringify({
              version: '1.0',
              packageName: 'com.example.app',
              eventTimeMillis: `${Date.now()}`,
              subscriptionNotification: {
                version: '1.0',
                notificationType: 4,
                purchaseToken: 'missing-token',
                subscriptionId: 'easy_ai_budget_premium_monthly',
              },
            }),
            'utf-8',
          ).toString('base64'),
        },
      }),
    );

    expect(res.status).toBe(202);
  });

  it('returns 502 when Google Play verification fails', async () => {
    const userId = uid('verify-fail');
    await seedUser(dbHandle.db, { id: userId, email: 'verify-fail@test.com' });
    const headers = await authHeaders(userId);

    vi.spyOn(googlePlayBilling, 'verifyGooglePlaySubscription').mockRejectedValue(
      new Error('google verification failed'),
    );

    const res = await appFetch(
      appHandle,
      makeRequest(
        'POST',
        '/api/billing/google-play/verify',
        {
          productId: 'easy_ai_budget_premium_monthly',
          purchaseToken: 'purchase-token-fail',
        },
        headers,
      ),
    );

    expect(res.status).toBe(502);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
  });
});
