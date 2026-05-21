import { Hono } from 'hono';
import { getDb, Env } from '../db/index';
import type { Variables } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import { processSessionMessage } from '../services/session-message-handler';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();
const sessionMessageRateLimit = createRateLimiter(20, 60_000);

router.post('/:sessionId/messages', sessionMessageRateLimit, async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const sessionId = parseInt(c.req.param('sessionId'), 10);
  const { content } = await c.req.json();

  const result = await processSessionMessage({
    db,
    env: c.env,
    userId,
    sessionId,
    content,
  });

  return c.json(result.body, result.status as 200 | 400 | 404 | 500 | 503);
});

export default router;
