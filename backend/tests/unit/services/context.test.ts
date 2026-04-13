/**
 * Task 21: ContextService userId filtering — real DB
 *
 * The existing tests/services/context.test.ts exercises ContextService
 * entirely through mock DB chains and cannot verify that the WHERE clause
 * actually filters by userId at the SQLite level.
 *
 * These tests use the real in-memory DB (createTestDb) to prove:
 *   1. getContextForAction returns alice's transactions, not bob's
 *   2. getContextForAction returns alice's notes, not bob's
 *   3. The message limit parameter is respected for transactions
 *   4. Soft-deleted transactions are excluded from context
 *
 * The ContextService constructor requires a vectorizeService but only
 * uses it for embedding (not called in getContextForAction itself in the
 * current implementation), so we pass a no-op stub.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { seedUser, seedTransaction } from '../../helpers/fixtures';
import { ContextService } from '../../../src/services/context';
import { userNotes, transactions } from '../../../src/db/schema';
import { eq } from 'drizzle-orm';

// Minimal vectorizeService stub — embedText is not called in current implementation
const noopVectorize = { embedText: async () => [] };

describe('ContextService — Tier 2 real-DB userId filtering', () => {
  let handle: TestDbHandle;
  let svc: ContextService;

  beforeEach(async () => {
    handle = await createTestDb();
    svc = new ContextService(noopVectorize);

    await seedUser(handle.db, { id: 'alice' });
    await seedUser(handle.db, { id: 'bob' });
  });

  afterEach(() => handle.client.close());

  // ---------------------------------------------------------------------------
  // Transaction isolation
  // ---------------------------------------------------------------------------

  describe('transaction isolation', () => {
    it('returns alice\'s transactions and not bob\'s', async () => {
      await seedTransaction(handle.db, { userId: 'alice', amount: 10000, category: 'food', date: '2026-04-01' });
      await seedTransaction(handle.db, { userId: 'bob', amount: 999999, category: 'luxury', date: '2026-04-01' });

      const ctx = await svc.getContextForAction(handle.db, 'alice', 'read', 'test');

      expect(ctx.transactions.length).toBe(1);
      expect(ctx.transactions[0].metadata?.amount).toBe(10000);
      // Bob's luxury transaction must not appear
      const amounts = ctx.transactions.map((t) => t.metadata?.amount);
      expect(amounts).not.toContain(999999);
    });

    it('returns zero transactions for alice when only bob has transactions', async () => {
      await seedTransaction(handle.db, { userId: 'bob', amount: 50000, category: 'food', date: '2026-04-01' });

      const ctx = await svc.getContextForAction(handle.db, 'alice', 'read', 'test');

      expect(ctx.transactions.length).toBe(0);
    });

    it('excludes soft-deleted transactions from context', async () => {
      const active = await seedTransaction(handle.db, { userId: 'alice', amount: 5000, category: 'food', date: '2026-04-01' });
      const deleted = await seedTransaction(handle.db, { userId: 'alice', amount: 8000, category: 'transport', date: '2026-04-02' });

      // Soft-delete the second transaction
      await handle.db
        .update(transactions)
        .set({ deletedAt: '2026-04-02T12:00:00Z' })
        .where(eq(transactions.id, deleted.id));

      const ctx = await svc.getContextForAction(handle.db, 'alice', 'read', 'test');

      expect(ctx.transactions.length).toBe(1);
      expect(ctx.transactions[0].metadata?.amount).toBe(5000);
    });
  });

  // ---------------------------------------------------------------------------
  // Note isolation
  // ---------------------------------------------------------------------------

  describe('note isolation', () => {
    it('returns alice\'s notes and not bob\'s', async () => {
      // Insert notes directly for both users
      await handle.db.insert(userNotes).values({
        userId: 'alice',
        content: 'Alice personal note',
      });
      await handle.db.insert(userNotes).values({
        userId: 'bob',
        content: 'Bob secret note',
      });

      const ctx = await svc.getContextForAction(handle.db, 'alice', 'create', 'test');

      // Alice should see only her own note
      const noteContents = ctx.notes.map((n) => n.content);
      expect(noteContents).toContain('Alice personal note');
      expect(noteContents).not.toContain('Bob secret note');
    });

    it('returns zero notes for alice when only bob has notes', async () => {
      await handle.db.insert(userNotes).values({
        userId: 'bob',
        content: 'Bob only note',
      });

      const ctx = await svc.getContextForAction(handle.db, 'alice', 'create', 'test');

      expect(ctx.notes.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Limit parameter
  // ---------------------------------------------------------------------------

  describe('limit parameter is respected', () => {
    it('returns at most transactionItems transactions for the "delete" strategy (limit = 5)', async () => {
      // Seed 8 transactions for alice
      for (let i = 1; i <= 8; i++) {
        await seedTransaction(handle.db, {
          userId: 'alice',
          amount: i * 1000,
          category: 'food',
          date: `2026-04-${String(i).padStart(2, '0')}`,
        });
      }

      // 'delete' action strategy has transactionItems = 5
      const ctx = await svc.getContextForAction(handle.db, 'alice', 'delete', 'test');

      expect(ctx.transactions.length).toBeLessThanOrEqual(5);
    });

    it('returns at most transactionItems transactions for the "read" strategy (limit = 10)', async () => {
      // Seed 15 transactions for alice
      for (let i = 1; i <= 15; i++) {
        await seedTransaction(handle.db, {
          userId: 'alice',
          amount: i * 1000,
          category: 'food',
          date: '2026-04-01',
        });
      }

      // 'read' action strategy has transactionItems = 10
      const ctx = await svc.getContextForAction(handle.db, 'alice', 'read', 'test');

      expect(ctx.transactions.length).toBeLessThanOrEqual(10);
    });
  });

  // ---------------------------------------------------------------------------
  // Result shape
  // ---------------------------------------------------------------------------

  describe('result shape', () => {
    it('returns all four required fields: knowledge, transactions, notes, formatted', async () => {
      const ctx = await svc.getContextForAction(handle.db, 'alice', 'create', 'test');

      expect(Array.isArray(ctx.knowledge)).toBe(true);
      expect(Array.isArray(ctx.transactions)).toBe(true);
      expect(Array.isArray(ctx.notes)).toBe(true);
      expect(typeof ctx.formatted).toBe('string');
    });

    it('returns empty formatted string when all context arrays are empty', async () => {
      const ctx = await svc.getContextForAction(handle.db, 'alice', 'delete', 'test');

      expect(ctx.formatted).toBe('');
    });
  });
});
