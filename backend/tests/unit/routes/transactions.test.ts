import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { createTestApp, type TestAppHandle } from '../../helpers/app';
import { authHeaders } from '../../helpers/auth';
import { expectAuthContract } from '../../helpers/auth-contract';
import { seedUser, seedTransaction } from '../../helpers/fixtures';
import { transactions } from '../../../src/db/schema';
import { eq } from 'drizzle-orm';

describe('POST /api/transactions/:id/undo', () => {
  let dbHandle: TestDbHandle;
  let appHandle: TestAppHandle;

  beforeEach(async () => {
    dbHandle = await createTestDb();
    await seedUser(dbHandle.db, { id: 'alice' });
    await seedUser(dbHandle.db, { id: 'bob' });
    appHandle = createTestApp(dbHandle);
  });

  afterEach(() => {
    appHandle.cleanup();
    dbHandle.client.close();
  });

  it('enforces universal auth contract', async () => {
    const t = await seedTransaction(dbHandle.db, { userId: 'alice' });
    await expectAuthContract(appHandle, 'POST', `/api/transactions/${t.id}/undo`);
  });

  it('restores a soft-deleted transaction owned by the caller', async () => {
    const t = await seedTransaction(dbHandle.db, { userId: 'alice' });
    // Soft-delete it first
    await dbHandle.db
      .update(transactions)
      .set({ deletedAt: '2026-04-12T00:00:00Z' })
      .where(eq(transactions.id, t.id));

    const headers = await authHeaders('alice');
    const res = await appHandle.app.fetch(
      new Request(`http://test/api/transactions/${t.id}/undo`, { method: 'POST', headers }),
      appHandle.env as any,
      {} as any
    );
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.result).toBeDefined();

    const [restored] = await dbHandle.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, t.id));
    expect(restored.deletedAt).toBeNull();
  });

  it('returns success, message, and result on successful undo', async () => {
    const t = await seedTransaction(dbHandle.db, {
      userId: 'alice',
      type: 'expense',
      amount: 15000,
      category: 'food',
      memo: 'lunch',
      date: '2026-04-10',
    });
    await dbHandle.db
      .update(transactions)
      .set({ deletedAt: '2026-04-12T00:00:00Z' })
      .where(eq(transactions.id, t.id));

    const headers = await authHeaders('alice');
    const res = await appHandle.app.fetch(
      new Request(`http://test/api/transactions/${t.id}/undo`, { method: 'POST', headers }),
      appHandle.env as any,
      {} as any
    );
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.message).toContain('복원되었습니다');
    expect(body.message).toContain('₩15,000');
    expect(body.result.id).toBe(t.id);
    expect(body.result.deletedAt).toBeNull();
  });

  it('returns 404 when transaction does not exist', async () => {
    const headers = await authHeaders('alice');
    const res = await appHandle.app.fetch(
      new Request(`http://test/api/transactions/99999/undo`, { method: 'POST', headers }),
      appHandle.env as any,
      {} as any
    );
    expect(res.status).toBe(404);

    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('not found');
  });

  it('returns 404 when the transaction belongs to a different user (ownership isolation)', async () => {
    // Seed a transaction owned by bob, soft-delete it
    const t = await seedTransaction(dbHandle.db, { userId: 'bob' });
    await dbHandle.db
      .update(transactions)
      .set({ deletedAt: '2026-04-12T00:00:00Z' })
      .where(eq(transactions.id, t.id));

    // Alice tries to undo bob's transaction
    const headers = await authHeaders('alice');
    const res = await appHandle.app.fetch(
      new Request(`http://test/api/transactions/${t.id}/undo`, { method: 'POST', headers }),
      appHandle.env as any,
      {} as any
    );
    expect(res.status).toBe(404);

    const body = await res.json() as any;
    expect(body.success).toBe(false);

    // Verify bob's transaction was not touched
    const [row] = await dbHandle.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, t.id));
    expect(row.deletedAt).not.toBeNull();
  });

  it('can undo a transaction that was never deleted (deletedAt already null)', async () => {
    // The route does UPDATE ... SET deletedAt=null regardless — if row exists and userId matches,
    // it will return success even if deletedAt was already null.
    const t = await seedTransaction(dbHandle.db, { userId: 'alice' });

    const headers = await authHeaders('alice');
    const res = await appHandle.app.fetch(
      new Request(`http://test/api/transactions/${t.id}/undo`, { method: 'POST', headers }),
      appHandle.env as any,
      {} as any
    );
    // Still 200 because the row matched by id+userId
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('formats income transaction message correctly', async () => {
    const t = await seedTransaction(dbHandle.db, {
      userId: 'alice',
      type: 'income',
      amount: 3000000,
      category: 'salary',
      memo: 'monthly salary',
      date: '2026-04-01',
    });
    await dbHandle.db
      .update(transactions)
      .set({ deletedAt: '2026-04-12T00:00:00Z' })
      .where(eq(transactions.id, t.id));

    const headers = await authHeaders('alice');
    const res = await appHandle.app.fetch(
      new Request(`http://test/api/transactions/${t.id}/undo`, { method: 'POST', headers }),
      appHandle.env as any,
      {} as any
    );
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body.message).toContain('수입');
    expect(body.message).toContain('₩3,000,000');
    expect(body.message).toContain('monthly salary');
    expect(body.message).toContain('복원되었습니다');
  });

  it('uses category in message when memo is null', async () => {
    const t = await seedTransaction(dbHandle.db, {
      userId: 'alice',
      type: 'expense',
      amount: 50000,
      category: 'transport',
      memo: null,
      date: '2026-04-05',
    });
    await dbHandle.db
      .update(transactions)
      .set({ deletedAt: '2026-04-12T00:00:00Z' })
      .where(eq(transactions.id, t.id));

    const headers = await authHeaders('alice');
    const res = await appHandle.app.fetch(
      new Request(`http://test/api/transactions/${t.id}/undo`, { method: 'POST', headers }),
      appHandle.env as any,
      {} as any
    );
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body.message).toContain('transport');
  });
});
