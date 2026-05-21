import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Context } from 'hono';
import { getDbClient, type Env } from '../db/index';
import type { Variables } from '../middleware/auth';
import { vectorizeService } from '../services/vectorize';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

const InternalProxySchema = z.object({
  text: z.string().trim().min(1).max(10000),
});

const RagSearchSchema = z.object({
  embedding: z.array(z.number()),
  table: z.enum(['knowledge_base', 'user_notes']),
  limit: z.number().int().positive().max(50),
  userId: z.string().optional(),
});

function requireInternalProxyToken(c: Context<{ Bindings: Env; Variables: Variables }>) {
  const expectedToken = c.env.AI_PROXY_SECRET;
  if (!expectedToken) {
    return c.json({ success: false, error: 'RAG proxy secret is not configured' }, 503);
  }

  const token = c.req.header('X-Internal-Proxy-Token');
  if (!token || token !== expectedToken) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  return null;
}

router.post('/embed', zValidator('json', InternalProxySchema), async (c) => {
  const unauthorized = requireInternalProxyToken(c);
  if (unauthorized) return unauthorized;

  const { text } = c.req.valid('json');
  const ragService = vectorizeService(c.env, getDbClient(c.env));
  const embedding = await ragService.embedText(text);

  return c.json({
    success: true as const,
    embedding,
  });
});

router.post('/search', zValidator('json', RagSearchSchema), async (c) => {
  const unauthorized = requireInternalProxyToken(c);
  if (unauthorized) return unauthorized;

  const payload = c.req.valid('json');
  const ragService = vectorizeService(c.env, getDbClient(c.env));
  const items = await ragService.searchVectors(
    payload.embedding,
    payload.table,
    payload.limit,
    payload.userId,
  );

  return c.json({
    success: true as const,
    items,
  });
});

export default router;
