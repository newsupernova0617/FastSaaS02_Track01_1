import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const transactions = sqliteTable('transactions', {
    id: integer('id').primaryKey({ autoIncrement: true }), // PK, 자동 증가
    type: text('type', { enum: ['income', 'expense'] }).notNull(), // 수입 | 지출
    amount: integer('amount').notNull(), // 금액 (원 단위)
    category: text('category').notNull(), // 고정 카테고리
    memo: text('memo'), // 메모 (선택)
    date: text('date').notNull(), // YYYY-MM-DD
    createdAt: text('created_at').default(sql`(datetime('now'))`), // 생성일시 자동
});

export type Transaction = typeof transactions.$inferSelect; // SELECT 결과 타입
export type NewTransaction = typeof transactions.$inferInsert; // INSERT 입력 타입
