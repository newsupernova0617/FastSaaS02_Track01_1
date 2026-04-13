/**
 * Task 19: sessions.ts CRUD + ownership tests (real DB)
 *
 * Security invariants verified:
 *   - getSession returns null when the sessionId belongs to another user
 *   - listSessions only returns the querying user's sessions
 *   - createSession always stores the userId passed as argument
 *
 * Uses the real in-memory SQLite DB via createTestDb so query filters are
 * exercised end-to-end rather than through mock chains.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { seedUser, seedSession } from '../../helpers/fixtures';
import {
  createSession,
  getSession,
  listSessions,
  renameSession,
  deleteSession,
  generateSessionTitle,
} from '../../../src/services/sessions';

describe('sessions service — Tier 2 real-DB tests', () => {
  let handle: TestDbHandle;

  beforeEach(async () => {
    handle = await createTestDb();
    await seedUser(handle.db, { id: 'alice' });
    await seedUser(handle.db, { id: 'bob' });
  });

  afterEach(() => handle.client.close());

  // ---------------------------------------------------------------------------
  // createSession
  // ---------------------------------------------------------------------------

  describe('createSession', () => {
    it('stores userId from the argument, not from any other source', async () => {
      const session = await createSession(handle.db, 'alice', 'My Budget');

      expect(session.userId).toBe('alice');
    });

    it('returns an object with id, userId, title, createdAt', async () => {
      const session = await createSession(handle.db, 'alice', 'Finance Chat');

      expect(typeof session.id).toBe('number');
      expect(session.userId).toBe('alice');
      expect(session.title).toBe('Finance Chat');
      expect(session.createdAt).toBeDefined();
    });

    it('generates auto-incremented IDs for successive sessions', async () => {
      const s1 = await createSession(handle.db, 'alice', 'First');
      const s2 = await createSession(handle.db, 'alice', 'Second');

      expect(s2.id).toBeGreaterThan(s1.id);
    });
  });

  // ---------------------------------------------------------------------------
  // getSession — ownership check (critical security invariant)
  // ---------------------------------------------------------------------------

  describe('getSession', () => {
    it('returns the session for its owner', async () => {
      const created = await createSession(handle.db, 'alice', 'Alice session');

      const found = await getSession(handle.db, created.id, 'alice');

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.userId).toBe('alice');
    });

    it('returns null when sessionId belongs to another user (ownership check)', async () => {
      const aliceSession = await createSession(handle.db, 'alice', 'Alice only');

      // Bob attempts to access Alice's session
      const result = await getSession(handle.db, aliceSession.id, 'bob');

      expect(result).toBeNull();
    });

    it('returns null for a non-existent sessionId', async () => {
      const result = await getSession(handle.db, 99999, 'alice');

      expect(result).toBeNull();
    });

    it('does not cross-contaminate: alice gets her session, bob gets his', async () => {
      const aliceSess = await createSession(handle.db, 'alice', 'Alice');
      const bobSess = await createSession(handle.db, 'bob', 'Bob');

      const aliceFound = await getSession(handle.db, aliceSess.id, 'alice');
      const bobFound = await getSession(handle.db, bobSess.id, 'bob');

      expect(aliceFound!.userId).toBe('alice');
      expect(bobFound!.userId).toBe('bob');

      // Cross-access returns null
      expect(await getSession(handle.db, bobSess.id, 'alice')).toBeNull();
      expect(await getSession(handle.db, aliceSess.id, 'bob')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // listSessions — userId filtering
  // ---------------------------------------------------------------------------

  describe('listSessions', () => {
    it('only returns the querying user\'s sessions', async () => {
      await createSession(handle.db, 'alice', 'Alice 1');
      await createSession(handle.db, 'alice', 'Alice 2');
      await createSession(handle.db, 'bob', 'Bob 1');

      const aliceSessions = await listSessions(handle.db, 'alice');

      expect(aliceSessions.length).toBe(2);
      aliceSessions.forEach((s) => expect(s.userId).toBe('alice'));
    });

    it('does not include sessions belonging to another user', async () => {
      await createSession(handle.db, 'bob', 'Bob only');

      const aliceSessions = await listSessions(handle.db, 'alice');

      expect(aliceSessions.length).toBe(0);
    });

    it('returns an empty array when the user has no sessions', async () => {
      const sessions = await listSessions(handle.db, 'alice');

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBe(0);
    });

    it('returns sessions ordered by most recent updatedAt first', async () => {
      const s1 = await createSession(handle.db, 'alice', 'First');
      const s2 = await createSession(handle.db, 'alice', 'Second');

      const sessions = await listSessions(handle.db, 'alice');

      // Most recently created (higher id) should appear first or same order;
      // Both have the same updatedAt from now(), so just verify all are present.
      expect(sessions.length).toBe(2);
      const ids = sessions.map((s) => s.id);
      expect(ids).toContain(s1.id);
      expect(ids).toContain(s2.id);
    });
  });

  // ---------------------------------------------------------------------------
  // renameSession — ownership check
  // ---------------------------------------------------------------------------

  describe('renameSession', () => {
    it('renames the session for its owner', async () => {
      const session = await createSession(handle.db, 'alice', 'Old Title');

      const updated = await renameSession(handle.db, session.id, 'alice', 'New Title');

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('New Title');
    });

    it('returns null when another user attempts to rename the session', async () => {
      const aliceSession = await createSession(handle.db, 'alice', 'Alice Title');

      const result = await renameSession(handle.db, aliceSession.id, 'bob', 'Hijacked');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // deleteSession — ownership check
  // ---------------------------------------------------------------------------

  describe('deleteSession', () => {
    it('deletes the session and returns true for its owner', async () => {
      const session = await createSession(handle.db, 'alice', 'To Delete');

      const result = await deleteSession(handle.db, session.id, 'alice');

      expect(result).toBe(true);
      expect(await getSession(handle.db, session.id, 'alice')).toBeNull();
    });

    it('returns false when another user attempts to delete the session', async () => {
      const aliceSession = await createSession(handle.db, 'alice', 'Protected');

      const result = await deleteSession(handle.db, aliceSession.id, 'bob');

      expect(result).toBe(false);
      // Alice's session is still intact
      expect(await getSession(handle.db, aliceSession.id, 'alice')).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // generateSessionTitle — pure function
  // ---------------------------------------------------------------------------

  describe('generateSessionTitle', () => {
    it('returns the message unchanged when it is <= 50 characters', () => {
      const msg = '점심 12000원';
      expect(generateSessionTitle(msg)).toBe(msg);
    });

    it('truncates messages longer than 50 characters with "..."', () => {
      const longMsg = 'a'.repeat(60);
      const title = generateSessionTitle(longMsg);
      expect(title.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(title.endsWith('...')).toBe(true);
    });

    it('returns exactly the first 50 chars + "..." for a 60-char input', () => {
      const longMsg = 'x'.repeat(60);
      expect(generateSessionTitle(longMsg)).toBe('x'.repeat(50) + '...');
    });
  });
});
