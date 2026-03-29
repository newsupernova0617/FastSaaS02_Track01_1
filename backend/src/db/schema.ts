// backend/src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// OAuth 로그인한 사용자 정보
export const users = sqliteTable('users', {
    id:        text('id').primaryKey(),      // Supabase에서 할당한 고유 사용자 ID
    email:     text('email'),                 // 이메일 (선택사항)
    name:      text('name'),                  // 사용자 이름 (선택사항)
    avatarUrl: text('avatar_url'),            // 프로필 이미지 URL
    provider:  text('provider').notNull(),    // 'google' 또는 'kakao' 같은 OAuth 제공자
    createdAt: text('created_at').default(sql`(datetime('now'))`), // 생성 시간 (자동)
});

// 지출/수입 거래 기록
export const transactions = sqliteTable('transactions', {
    id:        integer('id').primaryKey({ autoIncrement: true }), // 자동 증가 ID
    userId:    text('user_id').notNull().references(() => users.id), // 어느 사용자의 거래인지
    type:      text('type', { enum: ['income', 'expense'] }).notNull(), // 수입 또는 지출
    amount:    integer('amount').notNull(),   // 금액 (원)
    category:  text('category').notNull(),    // 식비, 교통, 월급 등 카테고리
    memo:      text('memo'),                  // 추가 설명 (선택사항)
    date:      text('date').notNull(),        // YYYY-MM-DD 형식의 거래 날짜
    createdAt: text('created_at').default(sql`(datetime('now'))`), // 기록 생성 시간 (자동)
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type User = typeof users.$inferSelect;
