/**
 * Tests for ClarificationService.
 *
 * Key security invariant verified here:
 *   getClarification(db, userId, chatSessionId) must filter by BOTH userId AND
 *   chatSessionId.  A clarification belonging to bob must never be visible when
 *   queried as alice — even if they share the same chatSessionId.
 *
 * Concurrency contract (documented from source):
 *   Only one clarification is stored per (userId, chatSessionId) pair at a time.
 *   The service itself does NOT use database-level locking; callers are expected
 *   to call deleteClarification before saveClarification when updating state.
 *   If two concurrent writes race, the last writer wins (SQLite serialises writes
 *   anyway in the in-memory test DB, so the contract is effectively deterministic
 *   in tests).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { seedUser, seedSession } from '../../helpers/fixtures';
import {
  ClarificationService,
  type ClarificationState,
} from '../../../src/services/clarifications';

const svc = new ClarificationService();

function makeState(overrides: Partial<ClarificationState> = {}): ClarificationState {
  return {
    missingFields: ['amount'],
    partialData: { transactionType: 'expense', category: 'food' },
    messageId: 'msg-001',
    ...overrides,
  };
}

describe('ClarificationService', () => {
  let handle: TestDbHandle;
  let aliceSessionId: number;
  let bobSessionId: number;

  beforeEach(async () => {
    handle = await createTestDb();
    await seedUser(handle.db, { id: 'alice' });
    await seedUser(handle.db, { id: 'bob' });
    const aliceSess = await seedSession(handle.db, { userId: 'alice' });
    const bobSess = await seedSession(handle.db, { userId: 'bob' });
    aliceSessionId = aliceSess.id;
    bobSessionId = bobSess.id;
  });

  afterEach(() => handle.client.close());

  // ---------------------------------------------------------------------------
  // saveClarification
  // ---------------------------------------------------------------------------

  describe('saveClarification', () => {
    it('stores the state and returns a non-empty UUID string', async () => {
      const id = await svc.saveClarification(
        handle.db,
        'alice',
        aliceSessionId,
        makeState()
      );

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('writes with the userId argument passed to it', async () => {
      await svc.saveClarification(handle.db, 'alice', aliceSessionId, makeState());

      // Retrievable as alice
      const found = await svc.getClarification(handle.db, 'alice', aliceSessionId);
      expect(found).not.toBeNull();
      expect(found?.missingFields).toEqual(['amount']);
    });

    it('stores serialised state that round-trips correctly', async () => {
      const state = makeState({
        missingFields: ['amount', 'category'],
        partialData: { transactionType: 'income', memo: 'bonus' },
        messageId: 'msg-xyz',
      });
      await svc.saveClarification(handle.db, 'alice', aliceSessionId, state);

      const restored = await svc.getClarification(handle.db, 'alice', aliceSessionId);
      expect(restored).toEqual(state);
    });
  });

  // ---------------------------------------------------------------------------
  // getClarification — cross-user isolation (security invariant)
  // ---------------------------------------------------------------------------

  describe('getClarification', () => {
    it('returns null for alice when only bob has an active clarification', async () => {
      await svc.saveClarification(handle.db, 'bob', bobSessionId, makeState());

      const result = await svc.getClarification(handle.db, 'alice', aliceSessionId);
      expect(result).toBeNull();
    });

    it('does not leak bob\'s clarification when alice queries the same session type', async () => {
      // Both alice and bob each have their own sessions.
      // Even if we query bob's session ID as alice, we must get null because
      // the WHERE clause includes userId = alice.
      await svc.saveClarification(handle.db, 'bob', bobSessionId, makeState());

      const result = await svc.getClarification(handle.db, 'alice', bobSessionId);
      expect(result).toBeNull();
    });

    it('returns null when no clarification exists for user+session', async () => {
      const result = await svc.getClarification(handle.db, 'alice', aliceSessionId);
      expect(result).toBeNull();
    });

    it('returns the state for the correct owner', async () => {
      const state = makeState({ missingFields: ['category'] });
      await svc.saveClarification(handle.db, 'alice', aliceSessionId, state);

      const result = await svc.getClarification(handle.db, 'alice', aliceSessionId);
      expect(result?.missingFields).toEqual(['category']);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteClarification
  // ---------------------------------------------------------------------------

  describe('deleteClarification', () => {
    it('removes the clarification so subsequent getClarification returns null', async () => {
      await svc.saveClarification(handle.db, 'alice', aliceSessionId, makeState());
      await svc.deleteClarification(handle.db, 'alice', aliceSessionId);

      const result = await svc.getClarification(handle.db, 'alice', aliceSessionId);
      expect(result).toBeNull();
    });

    it('does not delete bob\'s clarification when alice\'s is deleted', async () => {
      await svc.saveClarification(handle.db, 'alice', aliceSessionId, makeState());
      await svc.saveClarification(handle.db, 'bob', bobSessionId, makeState());

      await svc.deleteClarification(handle.db, 'alice', aliceSessionId);

      const bobResult = await svc.getClarification(handle.db, 'bob', bobSessionId);
      expect(bobResult).not.toBeNull();
    });

    it('is idempotent — deleting a non-existent clarification does not throw', async () => {
      await expect(
        svc.deleteClarification(handle.db, 'alice', aliceSessionId)
      ).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // mergeClarificationResponse — does not touch DB, but is the merge logic safe?
  // ---------------------------------------------------------------------------

  describe('mergeClarificationResponse', () => {
    it('fills in amount from a numeric string', async () => {
      const state = makeState({ missingFields: ['amount'], partialData: { transactionType: 'expense', category: 'food' } });
      const { mergedData, stillMissingFields } = await svc.mergeClarificationResponse('5000', state);

      expect(mergedData.amount).toBe(5000);
      expect(stillMissingFields).not.toContain('amount');
    });

    it('fills in category when a known category keyword appears', async () => {
      const state = makeState({ missingFields: ['category'], partialData: { transactionType: 'expense', amount: 1000 } });
      const { mergedData, stillMissingFields } = await svc.mergeClarificationResponse('food', state);

      expect(mergedData.category).toBe('food');
      expect(stillMissingFields).not.toContain('category');
    });

    it('returns stillMissingFields for values it could not extract', async () => {
      const state = makeState({ missingFields: ['amount'], partialData: {} });
      const { stillMissingFields } = await svc.mergeClarificationResponse('no number here', state);

      expect(stillMissingFields).toContain('amount');
    });

    it('does not modify partialData for fields not listed in missingFields', async () => {
      const state = makeState({
        missingFields: ['amount'],
        partialData: { transactionType: 'expense', category: 'food' },
      });
      const { mergedData } = await svc.mergeClarificationResponse('food transport 3000', state);

      // category was NOT in missingFields, so it should stay as-is (food)
      expect(mergedData.category).toBe('food');
      expect(mergedData.amount).toBe(3000);
    });

    it('cross-user merge: mergeClarificationResponse is stateless — state is always passed in', async () => {
      // Demonstrate the concurrency contract: merge is pure (no DB read)
      // so cross-user leakage is impossible at this layer.
      const aliceState = makeState({ partialData: { transactionType: 'income' }, missingFields: ['amount'] });
      const bobState = makeState({ partialData: { transactionType: 'expense' }, missingFields: ['amount'] });

      const { mergedData: aliceMerged } = await svc.mergeClarificationResponse('1000', aliceState);
      const { mergedData: bobMerged } = await svc.mergeClarificationResponse('2000', bobState);

      expect(aliceMerged.transactionType).toBe('income');
      expect(aliceMerged.amount).toBe(1000);
      expect(bobMerged.transactionType).toBe('expense');
      expect(bobMerged.amount).toBe(2000);
    });
  });

  // ---------------------------------------------------------------------------
  // cleanupExpired
  // ---------------------------------------------------------------------------

  describe('cleanupExpired', () => {
    it('removes clarifications older than 5 minutes', async () => {
      // Insert a clarification with a manually back-dated createdAt
      const { clarificationSessions } = await import('../../../src/db/schema');
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
      await handle.db.insert(clarificationSessions).values({
        id: 'stale-id',
        userId: 'alice',
        chatSessionId: aliceSessionId,
        state: JSON.stringify(makeState()),
        createdAt: sixMinutesAgo,
      });

      await svc.cleanupExpired(handle.db);

      const result = await svc.getClarification(handle.db, 'alice', aliceSessionId);
      expect(result).toBeNull();
    });

    it('keeps clarifications created within the last 5 minutes', async () => {
      await svc.saveClarification(handle.db, 'alice', aliceSessionId, makeState());

      await svc.cleanupExpired(handle.db);

      const result = await svc.getClarification(handle.db, 'alice', aliceSessionId);
      expect(result).not.toBeNull();
    });
  });
});
