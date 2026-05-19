import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pushSubscriptions, sessions, transactions } from '../../src/db/schema';
import { createTestApp, type TestAppHandle } from '../helpers/app';
import { authHeaders } from '../helpers/auth';
import { mockLlmResponse } from '../helpers/llm-mock';
import { createTestDb, type TestDbHandle } from '../helpers/db';
import { seedTransaction, seedUser } from '../helpers/fixtures';

function makeRequest(
  method: string,
  path: string,
  body: object | null,
  headers: Record<string, string>
): Request {
  return new Request(`http://test${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== null ? JSON.stringify(body) : undefined,
  });
}

describe('push quick entry flow', () => {
  let dbHandle: TestDbHandle;
  let appHandle: TestAppHandle;

  beforeEach(async () => {
    dbHandle = await createTestDb();
    appHandle = createTestApp(dbHandle);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    appHandle.cleanup();
    dbHandle.client.close();
  });

  it('registers push subscriptions and accepts inline reply submissions', async () => {
    const userId = 'push-user';
    await seedUser(dbHandle.db, { id: userId, email: 'push@example.com', name: 'Push User' });
    await seedTransaction(dbHandle.db, {
      userId,
      type: 'expense',
      amount: 3200,
      category: '식비',
      memo: '샘플',
      date: '2026-04-27',
    });

    const headers = await authHeaders(userId);
    const subscription = {
      endpoint: 'https://example.com/push/123',
      expirationTime: null,
      keys: {
        p256dh: 'p256dh-value',
        auth: 'auth-value',
      },
    };

    const subscribeResponse = await appHandle.app.fetch(
      makeRequest('POST', '/api/app/push/subscribe', subscription, headers),
      appHandle.env as any
    );

    expect(subscribeResponse.status).toBe(200);
    const subscribeBody = await subscribeResponse.json() as any;
    expect(subscribeBody.success).toBe(true);
    expect(subscribeBody.quickEntryToken).toBeTruthy();

    const storedSubscription = await dbHandle.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .all();

    expect(storedSubscription).toHaveLength(1);
    expect(storedSubscription[0].userId).toBe(userId);

    mockLlmResponse({
      type: 'create',
      payload: {
        transactionType: 'expense',
        amount: 4500,
        category: '식비',
        memo: '커피',
        date: '2026-04-28',
      },
      confidence: 0.98,
    });

    const replyResponse = await appHandle.app.fetch(
      makeRequest(
        'POST',
        '/api/app/push/reply',
        {
          token: subscribeBody.quickEntryToken,
          reply: '오늘 커피 4500원',
        },
        {}
      ),
      appHandle.env as any
    );

    expect(replyResponse.status).toBe(200);
    const replyBody = await replyResponse.json() as any;
    expect(replyBody.success).toBe(true);
    expect(replyBody.sessionId).toBeDefined();
    expect(replyBody.messages).toHaveLength(2);

    const insertedSessions = await dbHandle.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, replyBody.sessionId))
      .all();

    expect(insertedSessions).toHaveLength(1);
    expect(insertedSessions[0].userId).toBe(userId);

    const insertedTransactions = await dbHandle.db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .all();

    expect(insertedTransactions.some((transaction) => transaction.amount === 4500)).toBe(true);
  });
});
