import { users, sessions, transactions, userSubscriptions } from '../../src/db/schema';
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

export async function seedUserSubscription(
  db: Db,
  overrides: {
    userId: string;
    productId?: string;
    purchaseToken?: string;
    status?: 'active' | 'expired' | 'canceled' | 'pending' | 'revoked' | 'unknown';
    plan?: 'free' | 'paid';
    platform?: 'android';
    expiresAt?: string | null;
    autoRenewing?: boolean;
  }
) {
  const inserted = await db
    .insert(userSubscriptions)
    .values({
      id: `sub-${Math.random().toString(36).slice(2, 10)}`,
      userId: overrides.userId,
      platform: overrides.platform ?? 'android',
      productId: overrides.productId ?? 'easy_ai_budget_premium_monthly',
      purchaseToken: overrides.purchaseToken ?? `token-${Math.random().toString(36).slice(2, 12)}`,
      status: overrides.status ?? 'active',
      plan: overrides.plan ?? 'paid',
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 86400000).toISOString(),
      autoRenewing: overrides.autoRenewing ?? true,
      rawProviderData: '{}',
      lastVerifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning();
  return inserted[0];
}
