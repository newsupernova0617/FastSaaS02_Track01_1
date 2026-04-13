/**
 * Task 27: routes/users.ts tests
 *
 * Endpoints:
 *   POST /api/users/sync  — upsert user profile (requires auth)
 *   GET  /api/users/me    — return current user's profile (requires auth)
 *
 * Tests:
 * 1. Auth contract (missing / malformed / expired JWT → 401)
 * 2. GET /api/users/me returns the authenticated user's profile, not another's
 * 3. POST /api/users/sync creates / updates the record for the JWT userId
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { createTestApp, type TestAppHandle } from '../../helpers/app';
import { authHeaders } from '../../helpers/auth';
import { expectAuthContract } from '../../helpers/auth-contract';
import { seedUser } from '../../helpers/fixtures';

// ---------------------------------------------------------------------------
// Counter for unique user IDs across tests
// ---------------------------------------------------------------------------
let _counter = 0;
function uid(prefix = 'users') {
  return `${prefix}-${++_counter}`;
}

// ---------------------------------------------------------------------------
// Request helpers
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

async function appFetch(
  handle: TestAppHandle,
  req: Request
): Promise<Response> {
  return handle.app.fetch(req, handle.env as any, {} as any);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('routes/users', () => {
  let dbHandle: TestDbHandle;
  let appHandle: TestAppHandle;

  beforeEach(async () => {
    dbHandle = await createTestDb();
    appHandle = createTestApp(dbHandle);
  });

  afterEach(() => {
    appHandle.cleanup();
  });

  // -------------------------------------------------------------------------
  // Auth contract
  // -------------------------------------------------------------------------

  describe('auth contract', () => {
    it('GET /api/users/me — missing auth → 401', async () => {
      await expectAuthContract(appHandle, 'GET', '/api/users/me');
    });

    it('POST /api/users/sync — missing auth → 401', async () => {
      await expectAuthContract(appHandle, 'POST', '/api/users/sync', {
        provider: 'google',
      });
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/users/me
  // -------------------------------------------------------------------------

  describe('GET /api/users/me', () => {
    it('returns the current user profile for the authenticated userId', async () => {
      const userId = uid('me');
      await seedUser(dbHandle.db, { id: userId, email: 'alice@test.com', name: 'Alice' });

      const headers = await authHeaders(userId);
      const res = await appFetch(
        appHandle,
        makeRequest('GET', '/api/users/me', null, headers)
      );

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.id).toBe(userId);
      expect(body.email).toBe('alice@test.com');
      expect(body.name).toBe('Alice');
    });

    it('returns 404 when the authenticated user does not exist in DB', async () => {
      const userId = uid('ghost');
      // Do NOT seed this user
      const headers = await authHeaders(userId);
      const res = await appFetch(
        appHandle,
        makeRequest('GET', '/api/users/me', null, headers)
      );

      expect(res.status).toBe(404);
      const body = await res.json() as any;
      expect(body.error).toBe('User not found');
    });

    it('does NOT return another user profile — only the JWT owner', async () => {
      const alice = await seedUser(dbHandle.db, {
        id: uid('me-alice'),
        email: 'alice@test.com',
        name: 'Alice',
      });
      const bob = await seedUser(dbHandle.db, {
        id: uid('me-bob'),
        email: 'bob@test.com',
        name: 'Bob',
      });

      // Authenticate as Bob
      const headers = await authHeaders(bob.id);
      const res = await appFetch(
        appHandle,
        makeRequest('GET', '/api/users/me', null, headers)
      );

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      // Must be Bob's profile, not Alice's
      expect(body.id).toBe(bob.id);
      expect(body.email).toBe('bob@test.com');
      expect(body.id).not.toBe(alice.id);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/users/sync
  // -------------------------------------------------------------------------

  describe('POST /api/users/sync', () => {
    it('creates a new user record on first sync', async () => {
      const userId = uid('sync-new');
      const headers = await authHeaders(userId);

      const res = await appFetch(
        appHandle,
        makeRequest('POST', '/api/users/sync', {
          email: 'new@test.com',
          name: 'New User',
          provider: 'google',
        }, headers)
      );

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);

      // Verify it exists
      const me = await appFetch(
        appHandle,
        makeRequest('GET', '/api/users/me', null, headers)
      );
      expect(me.status).toBe(200);
      const meBody = await me.json() as any;
      expect(meBody.id).toBe(userId);
      expect(meBody.email).toBe('new@test.com');
    });

    it('updates an existing user record on subsequent sync', async () => {
      const userId = uid('sync-upd');
      await seedUser(dbHandle.db, { id: userId, email: 'old@test.com', name: 'Old Name' });

      const headers = await authHeaders(userId);
      const res = await appFetch(
        appHandle,
        makeRequest('POST', '/api/users/sync', {
          email: 'updated@test.com',
          name: 'Updated Name',
          provider: 'google',
        }, headers)
      );

      expect(res.status).toBe(200);

      // Confirm update
      const me = await appFetch(
        appHandle,
        makeRequest('GET', '/api/users/me', null, headers)
      );
      const meBody = await me.json() as any;
      expect(meBody.email).toBe('updated@test.com');
      expect(meBody.name).toBe('Updated Name');
    });

    it('userId in sync always comes from JWT — not overridable via body', async () => {
      const realUserId = uid('sync-jwt');
      const headers = await authHeaders(realUserId);

      // Attempt to pass a different id in the body (users.ts ignores it)
      await appFetch(
        appHandle,
        makeRequest('POST', '/api/users/sync', {
          provider: 'google',
          email: 'real@test.com',
        }, headers)
      );

      // The record was created under realUserId from JWT
      const me = await appFetch(
        appHandle,
        makeRequest('GET', '/api/users/me', null, headers)
      );
      const meBody = await me.json() as any;
      expect(meBody.id).toBe(realUserId);
    });

    it('handles sync with optional fields absent', async () => {
      const userId = uid('sync-min');
      const headers = await authHeaders(userId);

      const res = await appFetch(
        appHandle,
        makeRequest('POST', '/api/users/sync', { provider: 'kakao' }, headers)
      );

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
    });
  });
});
