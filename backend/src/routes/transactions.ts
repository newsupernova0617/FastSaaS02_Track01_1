// backend/src/routes/transactions.ts
import { Hono } from 'hono';
import { and, eq, like, sql } from 'drizzle-orm';
import { getDb, Env } from '../db/index';
import { transactions } from '../db/schema';
import type { Variables } from '../middleware/auth';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// 전체 or 월 필터 조회 (?date=YYYY-MM) — 본인 데이터만
router.get('/', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const date = c.req.query('date');
    const rows = date
        ? await db.select().from(transactions).where(
            and(eq(transactions.userId, userId), like(transactions.date, `${date}%`))
          )
        : await db.select().from(transactions).where(eq(transactions.userId, userId));
    return c.json(rows);
});

// 새 기록 저장 — userId 자동 주입
router.post('/', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const body = await c.req.json();
    const result = await db
        .insert(transactions)
        .values({
            userId,
            type: body.type,
            amount: body.amount,
            category: body.category,
            memo: body.memo ?? null,
            date: body.date,
        })
        .returning({ id: transactions.id });
    return c.json({ id: result[0].id }, 201);
});

// id로 단건 삭제 — 본인 것만 삭제 가능
router.delete('/:id', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const id = Number(c.req.param('id'));
    await db.delete(transactions).where(
        and(eq(transactions.id, id), eq(transactions.userId, userId))
    );
    return c.json({ success: true });
});

// 월별 카테고리 합계 — 본인 데이터만
router.get('/summary', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const month = c.req.query('month') ?? new Date().toISOString().slice(0, 7);
    const rows = await db
        .select({
            type: transactions.type,
            category: transactions.category,
            total: sql<number>`SUM(${transactions.amount})`.as('total'),
        })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), like(transactions.date, `${month}%`)))
        .groupBy(transactions.type, transactions.category);
    return c.json(rows);
});

export default router;
