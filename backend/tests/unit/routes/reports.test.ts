/**
 * Tests for POST /api/reports and related endpoints.
 *
 * NOTE: There is an older test file at tests/routes/reports.test.ts that has
 * type errors. This file is the authoritative test and lives at
 * tests/unit/routes/reports.test.ts. The old file is intentionally left as-is.
 *
 * The reports route provides CRUD for saved report documents.
 * Rate limit: 10 writes per minute per user (createRateLimiter(10, 60_000) on POST /).
 *
 * Data-isolation contract: getReports and getReportDetail filter by userId.
 * A report created by alice must not be accessible by bob.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { createTestApp, type TestAppHandle } from '../../helpers/app';
import { authHeaders } from '../../helpers/auth';
import { expectAuthContract } from '../../helpers/auth-contract';
import { seedUser } from '../../helpers/fixtures';

// ---------------------------------------------------------------------------
// Rate-limiter isolation: unique userId per test prevents count bleed.
// ---------------------------------------------------------------------------
let _counter = 0;
function freshUserId(prefix = 'rep-user') {
  return `${prefix}-${++_counter}`;
}

// ---------------------------------------------------------------------------
// Valid report payload factory
// ---------------------------------------------------------------------------

function validReportBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    reportType: 'monthly_summary',
    title: 'April 2026 Summary',
    subtitle: 'All categories',
    reportData: [{ section: 'food', total: 50000 }],
    params: { month: '2026-04' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Request builder
// ---------------------------------------------------------------------------

function makeRequest(
  method: string,
  path: string,
  body: object | null,
  headers: Record<string, string>
): Request {
  return new Request(`http://test${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== null ? JSON.stringify(body) : undefined,
  });
}

async function postReport(
  appHandle: TestAppHandle,
  body: object,
  headers: Record<string, string>
): Promise<Response> {
  return appHandle.app.fetch(
    makeRequest('POST', '/api/reports', body, headers),
    appHandle.env as any
  );
}

async function getReports(
  appHandle: TestAppHandle,
  headers: Record<string, string>,
  query = ''
): Promise<Response> {
  return appHandle.app.fetch(
    new Request(`http://test/api/reports${query}`, {
      method: 'GET',
      headers,
    }),
    appHandle.env as any
  );
}

async function getReportById(
  appHandle: TestAppHandle,
  id: number,
  headers: Record<string, string>
): Promise<Response> {
  return appHandle.app.fetch(
    new Request(`http://test/api/reports/${id}`, { method: 'GET', headers }),
    appHandle.env as any
  );
}

async function deleteReport(
  appHandle: TestAppHandle,
  id: number,
  headers: Record<string, string>
): Promise<Response> {
  return appHandle.app.fetch(
    new Request(`http://test/api/reports/${id}`, { method: 'DELETE', headers }),
    appHandle.env as any
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('routes/reports.ts', () => {
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

  // -------------------------------------------------------------------------
  // 1. Universal auth contract
  // -------------------------------------------------------------------------

  describe('auth contract — POST /api/reports', () => {
    it('rejects missing / malformed / expired JWT with 401', async () => {
      await expectAuthContract(appHandle, 'POST', '/api/reports', validReportBody());
    });
  });

  describe('auth contract — GET /api/reports', () => {
    it('rejects missing / malformed / expired JWT with 401', async () => {
      await expectAuthContract(appHandle, 'GET', '/api/reports');
    });
  });

  // -------------------------------------------------------------------------
  // 2. POST /api/reports — basic create and user isolation
  // -------------------------------------------------------------------------

  describe('POST /api/reports', () => {
    it('creates a report and returns 201 with id and createdAt', async () => {
      const userId = freshUserId();
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const res = await postReport(appHandle, validReportBody(), headers);
      expect(res.status).toBe(201);

      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(typeof body.id).toBe('number');
      expect(body.createdAt).toBeDefined();
    });

    it('stores report with the JWT userId — not any body field', async () => {
      const alice = freshUserId('alice');
      const bob = freshUserId('bob');
      await seedUser(dbHandle.db, { id: alice });
      await seedUser(dbHandle.db, { id: bob });

      const aliceHeaders = await authHeaders(alice);
      const res = await postReport(appHandle, validReportBody({ title: 'Alice Report' }), aliceHeaders);
      expect(res.status).toBe(201);
      const { id } = await res.json() as any;

      // bob cannot retrieve alice's report
      const bobHeaders = await authHeaders(bob);
      const getRes = await getReportById(appHandle, id, bobHeaders);
      expect(getRes.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // 3. GET /api/reports — data isolation between users
  // -------------------------------------------------------------------------

  describe('GET /api/reports — per-user isolation', () => {
    it('returns only the requesting user\'s saved reports', async () => {
      const alice = freshUserId('alice');
      const bob = freshUserId('bob');
      await seedUser(dbHandle.db, { id: alice });
      await seedUser(dbHandle.db, { id: bob });

      const aliceHeaders = await authHeaders(alice);
      const bobHeaders = await authHeaders(bob);

      // Alice saves 2 reports
      await postReport(appHandle, validReportBody({ title: 'Alice Report 1' }), aliceHeaders);
      await postReport(appHandle, validReportBody({ title: 'Alice Report 2' }), aliceHeaders);

      // Bob saves 3 reports
      await postReport(appHandle, validReportBody({ title: 'Bob Report 1' }), bobHeaders);
      await postReport(appHandle, validReportBody({ title: 'Bob Report 2' }), bobHeaders);
      await postReport(appHandle, validReportBody({ title: 'Bob Report 3' }), bobHeaders);

      // Alice's list must have exactly 2 reports, all hers
      const aliceRes = await getReports(appHandle, aliceHeaders);
      expect(aliceRes.status).toBe(200);
      const aliceBody = await aliceRes.json() as any;
      expect(aliceBody.success).toBe(true);
      expect(aliceBody.reports).toHaveLength(2);

      // None of bob's report titles should appear in alice's list
      const aliceTitles = aliceBody.reports.map((r: any) => r.title);
      expect(aliceTitles).not.toContain('Bob Report 1');
      expect(aliceTitles).not.toContain('Bob Report 2');
      expect(aliceTitles).not.toContain('Bob Report 3');
    });

    it('returns 200 with empty array when user has no reports', async () => {
      const userId = freshUserId();
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const res = await getReports(appHandle, headers);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(body.reports).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // 4. GET /api/reports/:id — ownership check
  // -------------------------------------------------------------------------

  describe('GET /api/reports/:id — cross-user access', () => {
    it('returns 404 when report belongs to a different user', async () => {
      const alice = freshUserId('alice');
      const bob = freshUserId('bob');
      await seedUser(dbHandle.db, { id: alice });
      await seedUser(dbHandle.db, { id: bob });

      const aliceHeaders = await authHeaders(alice);
      const saveRes = await postReport(appHandle, validReportBody(), aliceHeaders);
      const { id } = await saveRes.json() as any;

      // Bob tries to read alice's report
      const bobHeaders = await authHeaders(bob);
      const res = await getReportById(appHandle, id, bobHeaders);
      expect(res.status).toBe(404);
    });

    it('returns 400 for a non-numeric report ID', async () => {
      const userId = freshUserId();
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const res = await appHandle.app.fetch(
        new Request('http://test/api/reports/not-a-number', { method: 'GET', headers }),
        appHandle.env as any
      );
      expect(res.status).toBe(400);
    });

    it('returns 404 for a report ID that does not exist', async () => {
      const userId = freshUserId();
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const res = await getReportById(appHandle, 99999, headers);
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // 5. DELETE /api/reports/:id — ownership check
  // -------------------------------------------------------------------------

  describe('DELETE /api/reports/:id', () => {
    it('returns 404 when trying to delete another user\'s report', async () => {
      const alice = freshUserId('alice');
      const bob = freshUserId('bob');
      await seedUser(dbHandle.db, { id: alice });
      await seedUser(dbHandle.db, { id: bob });

      const aliceHeaders = await authHeaders(alice);
      const saveRes = await postReport(appHandle, validReportBody(), aliceHeaders);
      const { id } = await saveRes.json() as any;

      const bobHeaders = await authHeaders(bob);
      const res = await deleteReport(appHandle, id, bobHeaders);
      expect(res.status).toBe(404);

      // Alice's report should still exist
      const getRes = await getReportById(appHandle, id, aliceHeaders);
      expect(getRes.status).toBe(200);
    });

    it('deletes the report and returns 200 with success message', async () => {
      const userId = freshUserId();
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const saveRes = await postReport(appHandle, validReportBody(), headers);
      const { id } = await saveRes.json() as any;

      const res = await deleteReport(appHandle, id, headers);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);

      // Confirm it's gone
      const getRes = await getReportById(appHandle, id, headers);
      expect(getRes.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // 6. POST /api/reports validation — invalid payload → 400
  // -------------------------------------------------------------------------

  describe('POST /api/reports — validation', () => {
    it('returns 400 when reportType is invalid', async () => {
      const userId = freshUserId();
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const res = await postReport(
        appHandle,
        validReportBody({ reportType: 'not_a_valid_type' }),
        headers
      );
      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.success).toBe(false);
    });

    it('returns 400 when title is missing', async () => {
      const userId = freshUserId();
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const { title: _omit, ...bodyWithoutTitle } = validReportBody() as any;
      const res = await postReport(appHandle, bodyWithoutTitle, headers);
      expect(res.status).toBe(400);
    });

    it('returns 400 when reportData is not an array', async () => {
      const userId = freshUserId();
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const res = await postReport(
        appHandle,
        validReportBody({ reportData: 'not-an-array' }),
        headers
      );
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Rate limit on POST /api/reports — 10 per minute per user → 429
  // -------------------------------------------------------------------------

  describe('rate limit on POST /api/reports', () => {
    it('returns 429 after 10 requests in the same window', async () => {
      const userId = freshUserId('ratelimit');
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      // 10 requests should succeed (rate limit is 10)
      for (let i = 0; i < 10; i++) {
        const res = await postReport(
          appHandle,
          validReportBody({ title: `Report ${i}` }),
          headers
        );
        expect(res.status, `request ${i + 1} should not be rate-limited`).toBe(201);
      }

      // 11th request should be rate-limited
      const res = await postReport(
        appHandle,
        validReportBody({ title: 'Over limit' }),
        headers
      );
      expect(res.status).toBe(429);
    });

    it('rate limit is per-user — different users have independent quotas', async () => {
      const alice = freshUserId('rl-alice');
      const bob = freshUserId('rl-bob');
      await seedUser(dbHandle.db, { id: alice });
      await seedUser(dbHandle.db, { id: bob });

      const aliceHeaders = await authHeaders(alice);
      const bobHeaders = await authHeaders(bob);

      // Exhaust alice's quota
      for (let i = 0; i < 10; i++) {
        await postReport(appHandle, validReportBody({ title: `Alice ${i}` }), aliceHeaders);
      }
      const aliceBlocked = await postReport(
        appHandle,
        validReportBody({ title: 'Alice blocked' }),
        aliceHeaders
      );
      expect(aliceBlocked.status).toBe(429);

      // Bob should still be able to post
      const bobRes = await postReport(
        appHandle,
        validReportBody({ title: 'Bob unaffected' }),
        bobHeaders
      );
      expect(bobRes.status).toBe(201);
    });
  });

  // -------------------------------------------------------------------------
  // 8. PATCH /api/reports/:id — update title
  // -------------------------------------------------------------------------

  describe('PATCH /api/reports/:id', () => {
    it('updates the title successfully', async () => {
      const userId = freshUserId();
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const saveRes = await postReport(appHandle, validReportBody({ title: 'Old Title' }), headers);
      const { id } = await saveRes.json() as any;

      const patchRes = await appHandle.app.fetch(
        makeRequest('PATCH', `/api/reports/${id}`, { title: 'New Title' }, headers),
        appHandle.env as any
      );
      expect(patchRes.status).toBe(200);
      const body = await patchRes.json() as any;
      expect(body.success).toBe(true);
      expect(body.report.title).toBe('New Title');
    });

    it('returns 400 when trying to patch another user\'s report title', async () => {
      const alice = freshUserId('alice');
      const bob = freshUserId('bob');
      await seedUser(dbHandle.db, { id: alice });
      await seedUser(dbHandle.db, { id: bob });

      const aliceHeaders = await authHeaders(alice);
      const saveRes = await postReport(appHandle, validReportBody(), aliceHeaders);
      const { id } = await saveRes.json() as any;

      const bobHeaders = await authHeaders(bob);
      const patchRes = await appHandle.app.fetch(
        makeRequest('PATCH', `/api/reports/${id}`, { title: 'Stolen Title' }, bobHeaders),
        appHandle.env as any
      );
      // updateReportTitle throws "Report not found or permission denied" → 400
      expect(patchRes.status).toBe(400);
    });
  });
});
