// backend/src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
    id:        text('id').primaryKey(),
    email:     text('email'),
    name:      text('name'),
    avatarUrl: text('avatar_url'),
    provider:  text('provider').notNull(),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const transactions = sqliteTable('transactions', {
    id:        integer('id').primaryKey({ autoIncrement: true }),
    userId:    text('user_id').notNull().references(() => users.id),
    type:      text('type', { enum: ['income', 'expense'] }).notNull(),
    amount:    integer('amount').notNull(),
    category:  text('category').notNull(),
    memo:      text('memo'),
    date:      text('date').notNull(),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type User = typeof users.$inferSelect;
