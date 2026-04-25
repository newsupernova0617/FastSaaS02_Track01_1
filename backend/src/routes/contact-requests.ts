import { Hono } from 'hono';
import { z, ZodError } from 'zod';
import { and, desc, eq } from 'drizzle-orm';

import { getDb, type Env } from '../db/index';
import { contactRequests, users } from '../db/schema';
import type { Variables } from '../middleware/auth';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

const ContactTypeSchema = z.enum(['bug', 'feature', 'account', 'billing', 'other']);
const ContactStatusSchema = z.enum(['new', 'in_progress', 'resolved']);

const CreateContactRequestSchema = z.object({
  type: ContactTypeSchema,
  title: z.string().min(1).max(160),
  details: z.string().min(1).max(5000),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

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

router.get('/admin', async (c) => {
  if (!isAdminPasswordValid(c)) {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  try {
    const db = getDb(c.env);
    const status = c.req.query('status');
    const type = c.req.query('type');

    const conditions = [];
    if (status) conditions.push(eq(contactRequests.status, status as 'new' | 'in_progress' | 'resolved'));
    if (type) conditions.push(eq(contactRequests.type, type as 'bug' | 'feature' | 'account' | 'billing' | 'other'));

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
    console.error('[Contact Requests] Admin list error:', error);
    return c.json({ success: false, error: 'Failed to fetch admin contact requests' }, 500);
  }
});

router.patch('/admin/:id', async (c) => {
  if (!isAdminPasswordValid(c)) {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

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
    console.error('[Contact Requests] Admin update error:', error);
    return c.json({ success: false, error: 'Failed to update contact request' }, 500);
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
