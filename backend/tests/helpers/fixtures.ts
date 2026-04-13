import { users, sessions, transactions } from '../../src/db/schema';
import type { createDb } from '../../src/db/index';

type Db = ReturnType<typeof createDb>;

export async function seedUser(
  db: Db,
  overrides: { id?: string; email?: string; name?: string; provider?: string } = {}
) {
  const row = {
    id: overrides.id ?? `user-${Math.random().toString(36).slice(2, 10)}`,
    email: overrides.email ?? null,
    name: overrides.name ?? null,
    avatarUrl: null as string | null,
    provider: overrides.provider ?? 'test',
  };
  await db.insert(users).values(row);
  return row;
}

export async function seedSession(
  db: Db,
  overrides: { userId: string; title?: string }
) {
  const inserted = await db
    .insert(sessions)
    .values({
      userId: overrides.userId,
      title: overrides.title ?? 'Test Session',
    })
    .returning();
  return inserted[0];
}

export async function seedTransaction(
  db: Db,
  overrides: {
    userId: string;
    type?: 'income' | 'expense';
    amount?: number;
    category?: string;
    memo?: string | null;
    date?: string;
  }
) {
  const inserted = await db
    .insert(transactions)
    .values({
      userId: overrides.userId,
      type: overrides.type ?? 'expense',
      amount: overrides.amount ?? 10000,
      category: overrides.category ?? 'food',
      memo: overrides.memo ?? null,
      date: overrides.date ?? '2026-04-13',
    })
    .returning();
  return inserted[0];
}
