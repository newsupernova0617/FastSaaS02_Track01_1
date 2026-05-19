import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, type Env } from '../db/index';
import { pushSubscriptions } from '../db/schema';
import type { Variables } from '../middleware/auth';
import { createSession, generateSessionTitle } from '../services/sessions';
import { processSessionMessage } from '../services/session-message-handler';
import {
  generateQuickEntryToken,
  getWebPushConfig,
  hashQuickEntryToken,
  sendWebPush,
  subscriptionEndpointKey,
  subscriptionFromJson,
} from '../services/push';

const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>();
const publicRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

const pushReplySchema = z.object({
  token: z.string().trim().min(1),
  reply: z.string().trim().min(1).max(4000),
});

authRouter.get('/public-key', async (c) => {
  const config = getWebPushConfig(c.env);
  return c.json({
    success: true as const,
    publicKey: config.publicKey,
  });
});

authRouter.get('/subscriptions', async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .orderBy(desc(pushSubscriptions.updatedAt))
    .all();

  return c.json({
    success: true as const,
    subscriptions: subscriptions.map((subscription) => ({
      id: subscription.id,
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime ? Number(subscription.expirationTime) : null,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    })),
  });
});

authRouter.post('/subscribe', zValidator('json', pushSubscriptionSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const payload = c.req.valid('json');
  const config = getWebPushConfig(c.env);
  const subscription = subscriptionFromJson(payload);
  const token = generateQuickEntryToken();
  const tokenHash = await hashQuickEntryToken(token);
  const subscriptionId = crypto.randomUUID();

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, subscriptionEndpointKey(subscription.endpoint)));

  await db.insert(pushSubscriptions).values({
    id: subscriptionId,
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    expirationTime: subscription.expirationTime ? String(subscription.expirationTime) : null,
    quickEntryTokenHash: tokenHash,
  });

  return c.json({
    success: true as const,
    subscriptionId,
    userId,
    quickEntryToken: token,
    publicKey: config.publicKey,
  });
});

authRouter.delete('/subscribe', zValidator('json', pushUnsubscribeSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const payload = c.req.valid('json');

  const removed = await db
    .delete(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.userId, userId),
      eq(pushSubscriptions.endpoint, payload.endpoint),
    ))
    .returning()
    .all();

  return c.json({
    success: true as const,
    removed: removed.length,
  });
});

authRouter.post('/test', async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const config = getWebPushConfig(c.env);

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .orderBy(desc(pushSubscriptions.updatedAt))
    .all();

  if (!subscriptions.length) {
    return c.json({
      success: false as const,
      error: 'No push subscriptions found',
    }, 404);
  }

  let delivered = 0;
  let expired = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    const result = await sendWebPush(
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        expirationTime: subscription.expirationTime ? Number(subscription.expirationTime) : null,
      },
      config
    );

    if (result.ok) {
      delivered += 1;
      continue;
    }

    if (result.status === 404 || result.status === 410) {
      expired += 1;
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
      continue;
    }

    failed += 1;
  }

  return c.json({
    success: true as const,
    delivered,
    expired,
    failed,
  });
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

export { authRouter as pushAuthRouter, publicRouter as pushPublicRouter };
