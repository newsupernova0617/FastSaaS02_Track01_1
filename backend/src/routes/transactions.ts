// backend/src/routes/transactions.ts
import { Hono } from 'hono';
import { and, eq, like, sql, isNull } from 'drizzle-orm';
import { getDb, Env } from '../db/index';
import { transactions } from '../db/schema';
import type { Variables } from '../middleware/auth';
import type { Transaction } from '../db/schema';
import { validateCreatePayload } from '../services/validation';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/transactions
// 본인의 거래 기록 조회 (선택: 월별 필터)
// 쿼리: ?date=YYYY-MM (예: ?date=2024-03)
router.get('/', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');  // 미들웨어에서 검증된 사용자 ID
    const date = c.req.query('date'); // 월별 필터 (YYYY-MM 형식)

    // date 파라미터가 있으면 해당 월의 거래만, 없으면 전체 조회
    const rows = date
        ? await db.select().from(transactions).where(
            // 사용자 ID와 날짜가 모두 일치하는 거래 조회
            // like(transactions.date, '2024-03%')로 YYYY-MM으로 시작하는 모든 날짜 매칭
            and(eq(transactions.userId, userId), like(transactions.date, `${date}%`), isNull(transactions.deletedAt))
          )
        : await db.select().from(transactions).where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)));
    return c.json(rows);
});

// POST /api/transactions
// 새로운 거래 기록 저장
router.post('/', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');  // 미들웨어에서 검증된 사용자 ID (자동 주입)
    const body = await c.req.json();

    // Validate input against schema before processing
    const validated = validateCreatePayload(body);

    // 클라이언트가 보낸 데이터로 거래 생성
    // userId는 서버에서 강제로 설정해서 다른 사용자 데이터를 건들 수 없게 방지 (보안)
    const result = await db
        .insert(transactions)
        .values({
            userId,  // 요청자 자신으로 고정
            type: validated.transactionType,      // 'income' 또는 'expense'
            amount: validated.amount,  // 금액
            category: validated.category,
            memo: validated.memo ?? null,  // 메모 없으면 null로 저장
            date: validated.date,      // YYYY-MM-DD
        })
        .returning({ id: transactions.id });  // 저장된 ID 반환

    return c.json({ id: result[0].id }, 201);  // 201 Created 상태 코드
});

// DELETE /api/transactions/:id
// 거래 기록 삭제 (본인의 기록만 가능, soft delete)
router.delete('/:id', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const id = Number(c.req.param('id'));

    // 삭제 조건:
    // 1. ID가 일치하고
    // 2. 그 거래의 userId가 현재 사용자와 일치해야만 삭제 가능 (자신의 거래만 삭제)
    const result = await db
        .update(transactions)
        .set({ deletedAt: new Date().toISOString() })
        .where(
            and(eq(transactions.id, id), eq(transactions.userId, userId))
        )
        .returning();

    if (!result.length) {
        return c.json({ success: false, error: 'Transaction not found' }, 404);
    }

    return c.json({ success: true });
});

// GET /api/transactions/summary
// 월별 카테고리 합계 조회 (통계용)
// 쿼리: ?month=YYYY-MM (기본값: 현재 월)
router.get('/summary', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');
    // month 파라미터 없으면 현재 년월 사용 (예: 2024-03)
    const month = c.req.query('month') ?? new Date().toISOString().slice(0, 7);

    // 지정된 월의 거래를 수입/지출과 카테고리별로 묶어서 합계 계산
    // 예: { type: 'expense', category: '식비', total: 150000 }
    const rows = await db
        .select({
            type: transactions.type,
            category: transactions.category,
            // SUM()으로 같은 카테고리의 금액들을 모두 더함
            total: sql<number>`SUM(${transactions.amount})`.as('total'),
        })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), like(transactions.date, `${month}%`), isNull(transactions.deletedAt)))
        // type과 category 조합별로 그룹화 (같은 카테고리들의 합계를 한 행으로)
        .groupBy(transactions.type, transactions.category);
    return c.json(rows);
});

// POST /api/transactions/:id/undo
// 삭제된 거래 복원 (soft delete 되돌리기)
router.post('/:id/undo', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const id = Number(c.req.param('id'));

    const result = await db
        .update(transactions)
        .set({ deletedAt: null })
        .where(
            and(
                eq(transactions.id, id),
                eq(transactions.userId, userId)
            )
        )
        .returning();

    if (!result.length) {
        return c.json({ success: false, error: 'Transaction not found' }, 404);
    }

    const tx = result[0];
    const typeLabel = tx.type === 'income' ? '수입' : '지출';
    const message = `${typeLabel} ₩${tx.amount.toLocaleString('ko-KR')} ${tx.memo || tx.category} (${tx.date}) 복원되었습니다`;

    return c.json({
        success: true,
        message,
        result: tx,
    });
});

export default router;
