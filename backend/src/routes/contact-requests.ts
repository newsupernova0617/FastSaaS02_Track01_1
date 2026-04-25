import { Hono } from 'hono';
import { z, ZodError } from 'zod';
import { desc, eq } from 'drizzle-orm';

import { getDb, type Env } from '../db/index';
import { contactRequests } from '../db/schema';
import type { Variables } from '../middleware/auth';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

const ContactTypeSchema = z.enum(['bug', 'feature', 'account', 'billing', 'other']);

const CreateContactRequestSchema = z.object({
  type: ContactTypeSchema,
  title: z.string().min(1).max(160),
  details: z.string().min(1).max(5000),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

router.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const payload = CreateContactRequestSchema.parse(await c.req.json());
    const db = getDb(c.env);

    const created = await db
      .insert(contactRequests)
      .values({
        userId,
        type: payload.type,
        title: payload.title,
        details: payload.details,
        metadata: JSON.stringify(payload.metadata),
      })
      .returning({
        id: contactRequests.id,
        status: contactRequests.status,
        createdAt: contactRequests.createdAt,
      })
      .get();

    return c.json({ success: true, request: created }, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json(
        { success: false, error: 'Invalid contact request', details: error.flatten() },
        400,
      );
    }
    console.error('[Contact Requests] Create error:', error);
    return c.json({ success: false, error: 'Failed to create contact request' }, 500);
  }
});

router.get('/me', async (c) => {
  try {
    const userId = c.get('userId');
    const db = getDb(c.env);

    const items = await db
      .select({
        id: contactRequests.id,
        type: contactRequests.type,
        title: contactRequests.title,
        details: contactRequests.details,
        status: contactRequests.status,
        metadata: contactRequests.metadata,
        adminNote: contactRequests.adminNote,
        createdAt: contactRequests.createdAt,
        updatedAt: contactRequests.updatedAt,
      })
      .from(contactRequests)
      .where(eq(contactRequests.userId, userId))
      .orderBy(desc(contactRequests.createdAt));

    return c.json({
      success: true,
      requests: items.map((item) => ({
        ...item,
        metadata: safeParseMetadata(item.metadata),
      })),
    });
  } catch (error) {
    console.error('[Contact Requests] List mine error:', error);
    return c.json({ success: false, error: 'Failed to fetch contact requests' }, 500);
  }
});

function safeParseMetadata(metadata: string | null) {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default router;
