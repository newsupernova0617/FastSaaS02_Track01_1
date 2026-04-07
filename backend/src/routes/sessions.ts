import { Hono } from 'hono';
import { getDb, Env } from '../db/index';
import type { Variables } from '../middleware/auth';
import {
  createSession,
  listSessions,
  getSession,
  renameSession,
  deleteSession,
  generateSessionTitle,
} from '../services/sessions';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /api/sessions - Create new session
router.post('/', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const { title } = await c.req.json();

    // Title is required
    if (!title || typeof title !== 'string') {
      return c.json(
        { success: false, error: 'Title is required' },
        400
      );
    }

    const session = await createSession(db, userId, title);

    return c.json(
      {
        success: true,
        session: {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
        },
      },
      201
    );
  } catch (error) {
    console.error('Error creating session:', error);
    return c.json(
      { success: false, error: 'Failed to create session' },
      500
    );
  }
});

// GET /api/sessions - List all sessions for user
router.get('/', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');

    const sessions = await listSessions(db, userId);

    return c.json(
      {
        success: true,
        sessions: sessions.map((s) => ({
          id: s.id,
          title: s.title,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
      },
      200
    );
  } catch (error) {
    console.error('Error listing sessions:', error);
    return c.json(
      { success: false, error: 'Failed to list sessions' },
      500
    );
  }
});

// GET /api/sessions/:id - Get single session
router.get('/:id', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const sessionId = parseInt(c.req.param('id'), 10);

    if (isNaN(sessionId)) {
      return c.json(
        { success: false, error: 'Invalid session ID' },
        400
      );
    }

    const session = await getSession(db, sessionId, userId);

    if (!session) {
      return c.json(
        { success: false, error: 'Session not found' },
        404
      );
    }

    return c.json(
      {
        success: true,
        session: {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
      },
      200
    );
  } catch (error) {
    console.error('Error getting session:', error);
    return c.json(
      { success: false, error: 'Failed to get session' },
      500
    );
  }
});

// PATCH /api/sessions/:id - Rename session
router.patch('/:id', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const sessionId = parseInt(c.req.param('id'), 10);
    const { title } = await c.req.json();

    if (isNaN(sessionId)) {
      return c.json(
        { success: false, error: 'Invalid session ID' },
        400
      );
    }

    if (!title || typeof title !== 'string') {
      return c.json(
        { success: false, error: 'Title is required' },
        400
      );
    }

    const session = await renameSession(db, sessionId, userId, title);

    if (!session) {
      return c.json(
        { success: false, error: 'Session not found' },
        404
      );
    }

    return c.json(
      {
        success: true,
        session: {
          id: session.id,
          title: session.title,
          updatedAt: session.updatedAt,
        },
      },
      200
    );
  } catch (error) {
    console.error('Error renaming session:', error);
    return c.json(
      { success: false, error: 'Failed to rename session' },
      500
    );
  }
});

// DELETE /api/sessions/:id - Delete session (hard delete with cascade)
router.delete('/:id', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const sessionId = parseInt(c.req.param('id'), 10);

    if (isNaN(sessionId)) {
      return c.json(
        { success: false, error: 'Invalid session ID' },
        400
      );
    }

    const success = await deleteSession(db, sessionId, userId);

    if (!success) {
      return c.json(
        { success: false, error: 'Session not found' },
        404
      );
    }

    return c.json(
      { success: true, message: 'Session deleted' },
      200
    );
  } catch (error) {
    console.error('Error deleting session:', error);
    return c.json(
      { success: false, error: 'Failed to delete session' },
      500
    );
  }
});

export default router;
