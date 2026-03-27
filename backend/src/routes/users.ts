// backend/src/routes/users.ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb, Env } from '../db/index';
import { users } from '../db/schema';
import type { Variables } from '../middleware/auth';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// Called by AuthCallback after OAuth — upserts user into Turso
router.post('/sync', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const body = await c.req.json<{
        email?: string;
        name?: string;
        avatar_url?: string;
        provider: string;
    }>();
    await db
        .insert(users)
        .values({
            id: userId,
            email: body.email ?? null,
            name: body.name ?? null,
            avatarUrl: body.avatar_url ?? null,
            provider: body.provider,
        })
        .onConflictDoUpdate({
            target: users.id,
            set: {
                email: body.email ?? null,
                name: body.name ?? null,
                avatarUrl: body.avatar_url ?? null,
            },
        });
    return c.json({ success: true });
});

router.get('/me', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json(user);
});

export default router;
