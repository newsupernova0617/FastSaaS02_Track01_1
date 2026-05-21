import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { getDb, type Env } from '../db/index';
import { pushSubscriptions } from '../db/schema';
import type { Variables } from '../middleware/auth';
import { createSession, generateSessionTitle } from '../services/sessions';
import { processSessionMessage } from '../services/session-message-handler';
import { hashQuickEntryToken } from '../services/push';

const publicRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

const pushReplySchema = z.object({
  token: z.string().trim().min(1),
  reply: z.string().trim().min(1).max(4000),
});

publicRouter.post('/reply', zValidator('json', pushReplySchema), async (c) => {
  const db = getDb(c.env);
  const { token, reply } = c.req.valid('json');
  const tokenHash = await hashQuickEntryToken(token);

  const [subscription] = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.quickEntryTokenHash, tokenHash))
    .limit(1);

  if (!subscription) {
    return c.json({
      success: false as const,
      error: 'Invalid quick entry token',
    }, 404);
  }

  const sessionTitle = generateSessionTitle(reply);
  const session = await createSession(db, subscription.userId, sessionTitle);
  const result = await processSessionMessage({
    db,
    env: c.env,
    userId: subscription.userId,
    sessionId: session.id,
    content: reply,
  });

  return c.json({
    ...result.body,
    sessionId: session.id,
  }, result.status as 200 | 400 | 404 | 500 | 503);
});

export { publicRouter as pushPublicRouter };
