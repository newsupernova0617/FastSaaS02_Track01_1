import { Hono } from 'hono';
import { eq, like, sql } from 'drizzle-orm';
import { getDb, Env } from '../db/index';
import { transactions } from '../db/schema';

const router = new Hono<{ Bindings: Env }>();

// 전체 or 월 필터 조회 (?date=YYYY-MM)
router.get('/', async (c) => {
    const db = getDb(c.env);
    const date = c.req.query('date');
    const rows = date
        ? await db.select().from(transactions).where(like(transactions.date, `${date}%`))
        : await db.select().from(transactions);
    return c.json(rows);
});

// 새 기록 저장, 삽입된 id 반환
router.post('/', async (c) => {
    const db = getDb(c.env);
    const body = await c.req.json();
    const result = await db
        .insert(transactions)
        .values({
            type: body.type,
            amount: body.amount,
            category: body.category,
            memo: body.memo ?? null,
            date: body.date,
        })
        .returning({ id: transactions.id }); // 삽입된 id만 반환
    return c.json({ id: result[0].id }, 201);
});

// id로 단건 삭제
router.delete('/:id', async (c) => {
    const db = getDb(c.env);
    const id = Number(c.req.param('id'));
    await db.delete(transactions).where(eq(transactions.id, id));
    return c.json({ success: true });
});

// 월별 카테고리 합계 (?month=YYYY-MM)
router.get('/summary', async (c) => {
    const db = getDb(c.env);
    const month = c.req.query('month') ?? new Date().toISOString().slice(0, 7);
    const rows = await db
        .select({
            type: transactions.type,
            category: transactions.category,
            total: sql<number>`SUM(${transactions.amount})`.as('total'), // 집계
        })
        .from(transactions)
        .where(like(transactions.date, `${month}%`))
        .groupBy(transactions.type, transactions.category);
    return c.json(rows);
});

export default router;
