/**
 * Task 28: routes/user-notes.ts — real-DB + real-JWT auth tests
 *
 * Unlike tests/routes/user-notes.test.ts (which uses a mocked service),
 * these tests wire the full real app (real DB + real JWT middleware) so we
 * verify the auth contract and userId-from-JWT invariant end-to-end.
 *
 * The VectorizeService is mocked at the module level so no HTTP calls are made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { createTestApp, type TestAppHandle } from '../../helpers/app';
import { authHeaders } from '../../helpers/auth';
import { expectAuthContract } from '../../helpers/auth-contract';
import { seedUser } from '../../helpers/fixtures';

// ---------------------------------------------------------------------------
// Mock VectorizeService so no real HTTP calls happen
// VectorizeService must be mocked as a class (constructor) because index.ts
// does `new VectorizeService('', '')` at module load time.
// ---------------------------------------------------------------------------

vi.mock('../../../src/services/vectorize', () => {
  class VectorizeService {
    embedText = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    searchVectors = vi.fn().mockResolvedValue([]);
  }
  return {
    VectorizeService,
    vectorizeService: (_accountId: string, _token: string) => new VectorizeService(),
  };
});

// ---------------------------------------------------------------------------
// Counter for unique IDs
// ---------------------------------------------------------------------------
let _counter = 0;
function uid(prefix = 'notes') {
  return `${prefix}-${++_counter}`;
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

async function appFetch(handle: TestAppHandle, req: Request): Promise<Response> {
  return handle.app.fetch(req, handle.env as any, {} as any);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('routes/user-notes', () => {
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
    it('POST /api/notes — missing / malformed / expired JWT → 401', async () => {
      await expectAuthContract(appHandle, 'POST', '/api/notes', { content: 'test' });
    });

    it('GET /api/notes — missing / malformed / expired JWT → 401', async () => {
      await expectAuthContract(appHandle, 'GET', '/api/notes');
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/notes — creates note with userId from JWT
  // -------------------------------------------------------------------------

  describe('POST /api/notes', () => {
    it('creates a note with userId from JWT, not from body', async () => {
      const userId = uid('create');
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const res = await appFetch(
        appHandle,
        makeRequest('POST', '/api/notes', { content: 'My savings plan' }, headers)
      );

      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.content).toBe('My savings plan');
      expect(body.userId).toBe(userId);
      expect(body.id).toBeTypeOf('number');
    });

    it('returns 400 when content is missing', async () => {
      const userId = uid('create-empty');
      await seedUser(dbHandle.db, { id: userId });
      const headers = await authHeaders(userId);

      const res = await appFetch(
        appHandle,
        makeRequest('POST', '/api/notes', {}, headers)
      );

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toBe('Content is required');
    });

    it('userId from body is ignored — uses JWT userId', async () => {
      const realUserId = uid('create-jwt');
      await seedUser(dbHandle.db, { id: realUserId });
      const headers = await authHeaders(realUserId);

      // Pass a different userId in body — route ignores it
      const res = await appFetch(
        appHandle,
        makeRequest('POST', '/api/notes', { content: 'note', userId: 'attacker-id' }, headers)
      );

      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.userId).toBe(realUserId);
      expect(body.userId).not.toBe('attacker-id');
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/notes — list returns only current user's notes
  // -------------------------------------------------------------------------

  describe('GET /api/notes', () => {
    it('returns only the current user\'s notes', async () => {
      const alice = await seedUser(dbHandle.db, { id: uid('list-alice') });
      const bob = await seedUser(dbHandle.db, { id: uid('list-bob') });

      const aliceHeaders = await authHeaders(alice.id);
      const bobHeaders = await authHeaders(bob.id);

      // Alice creates 2 notes
      await appFetch(appHandle, makeRequest('POST', '/api/notes', { content: 'Alice note 1' }, aliceHeaders));
      await appFetch(appHandle, makeRequest('POST', '/api/notes', { content: 'Alice note 2' }, aliceHeaders));
      // Bob creates 1 note
      await appFetch(appHandle, makeRequest('POST', '/api/notes', { content: 'Bob note' }, bobHeaders));

      const res = await appFetch(appHandle, makeRequest('GET', '/api/notes', null, aliceHeaders));

      expect(res.status).toBe(200);
      const notes = await res.json() as any[];
      expect(notes).toHaveLength(2);
      expect(notes.every((n) => n.userId === alice.id)).toBe(true);
    });

    it('returns empty array when user has no notes', async () => {
      const user = await seedUser(dbHandle.db, { id: uid('list-empty') });
      const headers = await authHeaders(user.id);

      const res = await appFetch(appHandle, makeRequest('GET', '/api/notes', null, headers));

      expect(res.status).toBe(200);
      const notes = await res.json() as any[];
      expect(notes).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/notes/:id — another user's note → 404
  // -------------------------------------------------------------------------

  describe('GET /api/notes/:id', () => {
    it('returns 404 when requesting another user\'s note', async () => {
      const alice = await seedUser(dbHandle.db, { id: uid('get-alice') });
      const bob = await seedUser(dbHandle.db, { id: uid('get-bob') });

      const aliceHeaders = await authHeaders(alice.id);
      const bobHeaders = await authHeaders(bob.id);

      // Alice creates a note
      const createRes = await appFetch(
        appHandle,
        makeRequest('POST', '/api/notes', { content: 'Alice private' }, aliceHeaders)
      );
      const note = await createRes.json() as any;

      // Bob tries to read Alice's note
      const res = await appFetch(
        appHandle,
        makeRequest('GET', `/api/notes/${note.id}`, null, bobHeaders)
      );

      expect(res.status).toBe(404);
    });

    it('returns the note when the owner requests it', async () => {
      const user = await seedUser(dbHandle.db, { id: uid('get-own') });
      const headers = await authHeaders(user.id);

      const createRes = await appFetch(
        appHandle,
        makeRequest('POST', '/api/notes', { content: 'My own note' }, headers)
      );
      const note = await createRes.json() as any;

      const res = await appFetch(
        appHandle,
        makeRequest('GET', `/api/notes/${note.id}`, null, headers)
      );

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.content).toBe('My own note');
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/notes/:id — another user's note → 404
  // -------------------------------------------------------------------------

  describe('DELETE /api/notes/:id', () => {
    it('returns 404 when deleting another user\'s note', async () => {
      const alice = await seedUser(dbHandle.db, { id: uid('del-alice') });
      const bob = await seedUser(dbHandle.db, { id: uid('del-bob') });

      const aliceHeaders = await authHeaders(alice.id);
      const bobHeaders = await authHeaders(bob.id);

      const createRes = await appFetch(
        appHandle,
        makeRequest('POST', '/api/notes', { content: 'Alice note' }, aliceHeaders)
      );
      const note = await createRes.json() as any;

      // Bob tries to delete Alice's note
      const res = await appFetch(
        appHandle,
        makeRequest('DELETE', `/api/notes/${note.id}`, null, bobHeaders)
      );

      expect(res.status).toBe(404);
    });

    it('owner can delete their own note', async () => {
      const user = await seedUser(dbHandle.db, { id: uid('del-own') });
      const headers = await authHeaders(user.id);

      const createRes = await appFetch(
        appHandle,
        makeRequest('POST', '/api/notes', { content: 'To be deleted' }, headers)
      );
      const note = await createRes.json() as any;

      const res = await appFetch(
        appHandle,
        makeRequest('DELETE', `/api/notes/${note.id}`, null, headers)
      );

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
    });

    it('deleted note no longer appears in list', async () => {
      const user = await seedUser(dbHandle.db, { id: uid('del-list') });
      const headers = await authHeaders(user.id);

      const createRes = await appFetch(
        appHandle,
        makeRequest('POST', '/api/notes', { content: 'Will be deleted' }, headers)
      );
      const note = await createRes.json() as any;

      await appFetch(appHandle, makeRequest('DELETE', `/api/notes/${note.id}`, null, headers));

      const listRes = await appFetch(appHandle, makeRequest('GET', '/api/notes', null, headers));
      const notes = await listRes.json() as any[];
      expect(notes.find((n) => n.id === note.id)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/notes/:id — another user's note → 404
  // -------------------------------------------------------------------------

  describe('PATCH /api/notes/:id', () => {
    it('returns 404 when patching another user\'s note', async () => {
      const alice = await seedUser(dbHandle.db, { id: uid('patch-alice') });
      const bob = await seedUser(dbHandle.db, { id: uid('patch-bob') });

      const aliceHeaders = await authHeaders(alice.id);
      const bobHeaders = await authHeaders(bob.id);

      const createRes = await appFetch(
        appHandle,
        makeRequest('POST', '/api/notes', { content: 'Alice original' }, aliceHeaders)
      );
      const note = await createRes.json() as any;

      const res = await appFetch(
        appHandle,
        makeRequest('PATCH', `/api/notes/${note.id}`, { content: 'Bob tamper' }, bobHeaders)
      );

      expect(res.status).toBe(404);
    });

    it('owner can update their own note', async () => {
      const user = await seedUser(dbHandle.db, { id: uid('patch-own') });
      const headers = await authHeaders(user.id);

      const createRes = await appFetch(
        appHandle,
        makeRequest('POST', '/api/notes', { content: 'original content' }, headers)
      );
      const note = await createRes.json() as any;

      const res = await appFetch(
        appHandle,
        makeRequest('PATCH', `/api/notes/${note.id}`, { content: 'updated content' }, headers)
      );

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.content).toBe('updated content');
    });
  });
});
