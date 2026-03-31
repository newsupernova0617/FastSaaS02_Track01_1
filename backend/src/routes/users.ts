// backend/src/routes/users.ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb, Env } from '../db/index';
import { users } from '../db/schema';
import type { Variables } from '../middleware/auth';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /api/users/sync
// OAuth 로그인 후 사용자 정보를 DB에 동기화
// 호출: frontend의 AuthCallback 페이지에서 OAuth 로그인 직후
router.post('/sync', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');  // JWT에서 추출한 사용자 ID
    const body = await c.req.json<{
        email?: string;
        name?: string;
        avatar_url?: string;
        provider: string;
    }>();

    // upsert: 사용자가 처음 로그인하면 insert, 이미 존재하면 update
    await db
        .insert(users)
        .values({
            id: userId,
            email: body.email ?? null,
            name: body.name ?? null,
            avatarUrl: body.avatar_url ?? null,
            provider: body.provider,
        })
        // 동일한 id로 이미 사용자가 존재하면 업데이트
        .onConflictDoUpdate({
            target: users.id,
            set: {
                email: body.email ?? null,
                name: body.name ?? null,
                avatarUrl: body.avatar_url ?? null,
                // provider는 변경하지 않음 (처음 로그인한 방식 유지)
            },
        });
    return c.json({ success: true });
});

// GET /api/users/me
// 현재 로그인한 사용자의 정보 조회
router.get('/me', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');  // JWT에서 추출한 사용자 ID

    // 사용자 ID로 DB에서 사용자 정보 조회
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json(user);
});

export default router;
