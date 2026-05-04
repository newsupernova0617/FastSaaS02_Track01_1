import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { z, ZodError } from 'zod';

import { getDb, type Env } from '../db/index';
import { userSubscriptions } from '../db/schema';
import type { Variables } from '../middleware/auth';
import * as googlePlayBilling from '../services/google-play-billing';

const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>();
const publicRouter = new Hono<{ Bindings: Env }>();

const VerifyPurchaseSchema = z.object({
  productId: z.string().min(1).max(200),
  purchaseToken: z.string().min(1),
});

authRouter.get('/plan', async (c) => {
  try {
    const userId = c.get('userId');
    const db = getDb(c.env);

    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .orderBy(desc(userSubscriptions.updatedAt))
      .limit(1);

    const resolved = googlePlayBilling.derivePlanFromSubscription(
      subscription
        ? {
            status: subscription.status,
            expiresAt: subscription.expiresAt,
            productId: subscription.productId,
            platform: subscription.platform,
          }
        : null,
    );

    return c.json({ success: true, ...resolved });
  } catch (error) {
    console.error('[Billing] Get plan error:', error);
    return c.json({ success: false, error: 'Failed to fetch billing plan' }, 500);
  }
});

authRouter.post('/google-play/verify', async (c) => {
  try {
    const userId = c.get('userId');
    const payload = VerifyPurchaseSchema.parse(await c.req.json());
    const db = getDb(c.env);

    const verified = await googlePlayBilling.verifyGooglePlaySubscription(c.env, payload);
    const recordId = crypto.randomUUID();

    await db
      .insert(userSubscriptions)
      .values({
        id: recordId,
        userId,
        platform: verified.platform,
        productId: verified.productId,
        purchaseToken: verified.purchaseToken,
        status: verified.status,
        plan: verified.plan,
        expiresAt: verified.expiresAt,
        autoRenewing: verified.autoRenewing,
        rawProviderData: verified.rawProviderData,
        lastVerifiedAt: verified.lastVerifiedAt,
        updatedAt: verified.lastVerifiedAt,
      })
      .onConflictDoUpdate({
        target: userSubscriptions.purchaseToken,
        set: {
          userId,
          platform: verified.platform,
          productId: verified.productId,
          status: verified.status,
          plan: verified.plan,
          expiresAt: verified.expiresAt,
          autoRenewing: verified.autoRenewing,
          rawProviderData: verified.rawProviderData,
          lastVerifiedAt: verified.lastVerifiedAt,
          updatedAt: verified.lastVerifiedAt,
        },
      });

    const resolved = googlePlayBilling.derivePlanFromSubscription(verified);
    return c.json({ success: true, ...resolved });
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json(
        { success: false, error: 'Invalid billing verification payload', details: error.flatten() },
        400,
      );
    }

    console.error('[Billing] Verify Google Play purchase error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Verification failed' }, 502);
  }
});

publicRouter.post('/google-play/rtdn', async (c) => {
  try {
    const result = await googlePlayBilling.handleGooglePlayRtdn(c.env, c.req.raw);
    console.log('[Billing] Received Google Play RTDN payload', result.reason ?? '');
    return c.json({ success: result.accepted }, 202);
  } catch (error) {
    console.error('[Billing] RTDN handling error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to process RTDN' }, 401);
  }
});

export { authRouter as billingRoutes, publicRouter as billingPublicRoutes };
