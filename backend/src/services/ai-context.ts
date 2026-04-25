import { and, desc, eq, isNull } from 'drizzle-orm';
import { transactions } from '../db/schema';
import type { Transaction } from '../db/schema';

export interface UserAiContext {
  recentTransactions: Transaction[];
  userCategories: string[];
}

export async function loadUserAiContext(
  db: any,
  userId: string,
  limit = 10
): Promise<UserAiContext> {
  const [recentTransactions, categoryRows] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.date))
      .limit(limit),
    db
      .selectDistinct({ category: transactions.category })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt))),
  ]);

  return {
    recentTransactions,
    userCategories: categoryRows.map((row: { category: string }) => row.category),
  };
}
