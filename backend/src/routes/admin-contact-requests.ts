import { Hono } from 'hono';
import { z, ZodError } from 'zod';
import { and, desc, eq } from 'drizzle-orm';

import { getDb, type Env } from '../db/index';
import { contactRequests, users } from '../db/schema';

const router = new Hono<{ Bindings: Env }>();

const ContactTypeSchema = z.enum(['bug', 'feature', 'account', 'billing', 'other']);
const ContactStatusSchema = z.enum(['new', 'in_progress', 'resolved']);

const UpdateContactRequestSchema = z.object({
  status: ContactStatusSchema.optional(),
  adminNote: z.string().max(2000).optional(),
});

function isAdminPasswordValid(c: { env: Env; req: { header: (name: string) => string | undefined } }) {
  const configuredPassword = c.env.ADMIN_DASHBOARD_PASSWORD;
  if (!configuredPassword) return false;
  const providedPassword = c.req.header('x-admin-password');
  return Boolean(providedPassword && providedPassword === configuredPassword);
}

function safeParseMetadata(metadata: string | null) {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
}

router.use('*', async (c, next) => {
  if (!isAdminPasswordValid(c)) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  await next();
});

router.get('/contact-requests', async (c) => {
  try {
    const db = getDb(c.env);
    const status = c.req.query('status');
    const type = c.req.query('type');

    const conditions = [];
    if (status) conditions.push(eq(contactRequests.status, status as z.infer<typeof ContactStatusSchema>));
    if (type) conditions.push(eq(contactRequests.type, type as z.infer<typeof ContactTypeSchema>));

    const rows = await db
      .select({
        id: contactRequests.id,
        userId: contactRequests.userId,
        type: contactRequests.type,
        title: contactRequests.title,
        details: contactRequests.details,
        status: contactRequests.status,
        metadata: contactRequests.metadata,
        adminNote: contactRequests.adminNote,
        createdAt: contactRequests.createdAt,
        updatedAt: contactRequests.updatedAt,
        userEmail: users.email,
        userName: users.name,
      })
      .from(contactRequests)
      .leftJoin(users, eq(contactRequests.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(contactRequests.createdAt));

    return c.json({
      success: true,
      requests: rows.map((row) => ({
        ...row,
        metadata: safeParseMetadata(row.metadata),
      })),
    });
  } catch (error) {
    console.error('[Admin Contact Requests] List error:', error);
    return c.json({ success: false, error: 'Failed to fetch admin contact requests' }, 500);
  }
});

router.patch('/contact-requests/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    if (Number.isNaN(id)) {
      return c.json({ success: false, error: 'Invalid contact request ID' }, 400);
    }

    const payload = UpdateContactRequestSchema.parse(await c.req.json());
    const db = getDb(c.env);

    const updated = await db
      .update(contactRequests)
      .set({
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.adminNote !== undefined ? { adminNote: payload.adminNote } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(contactRequests.id, id))
      .returning({
        id: contactRequests.id,
        status: contactRequests.status,
        adminNote: contactRequests.adminNote,
        updatedAt: contactRequests.updatedAt,
      })
      .get();

    if (!updated) {
      return c.json({ success: false, error: 'Contact request not found' }, 404);
    }

    return c.json({ success: true, request: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json(
        { success: false, error: 'Invalid contact request update', details: error.flatten() },
        400,
      );
    }
    console.error('[Admin Contact Requests] Update error:', error);
    return c.json({ success: false, error: 'Failed to update contact request' }, 500);
  }
});

export default router;
