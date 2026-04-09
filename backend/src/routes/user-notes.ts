import { Hono } from 'hono';
import { getDb, Env } from '../db/index';
import type { Context as HonoContext } from 'hono';
import type { Variables } from '../middleware/auth';
import type { UserNote } from '../db/schema';

export const createUserNotesRoutes = (userNotesService: any) => {
  const router = new Hono<{ Bindings: Env; Variables: Variables }>();

  /**
   * POST /api/notes - Create a new note
   */
  router.post('/', async (c: HonoContext) => {
    try {
      const userId = c.get('userId');
      const db = getDb(c.env);
      const { content } = await c.req.json();

      if (!content) {
        return c.json({ error: 'Content is required' }, 400);
      }

      const note = await userNotesService.createNote(db, userId, content);
      return c.json(note, 201);
    } catch (error) {
      console.error('Error creating note:', error);
      return c.json({ error: 'Failed to create note' }, 500);
    }
  });

  /**
   * GET /api/notes - List all notes for user
   */
  router.get('/', async (c: HonoContext) => {
    try {
      const userId = c.get('userId');
      const db = getDb(c.env);
      const notes = await userNotesService.listNotes(db, userId);
      return c.json(notes);
    } catch (error) {
      console.error('Error listing notes:', error);
      return c.json({ error: 'Failed to list notes' }, 500);
    }
  });

  /**
   * GET /api/notes/:id - Get a single note
   */
  router.get('/:id', async (c: HonoContext) => {
    try {
      const userId = c.get('userId');
      const db = getDb(c.env);
      const idParam = c.req.param('id');
      if (!idParam) {
        return c.json({ error: 'Note ID is required' }, 400);
      }
      const id = parseInt(idParam);

      const note = await userNotesService.getNote(db, id, userId);
      if (!note) {
        return c.json({ error: 'Note not found' }, 404);
      }

      return c.json(note);
    } catch (error) {
      console.error('Error getting note:', error);
      return c.json({ error: 'Failed to get note' }, 500);
    }
  });

  /**
   * PATCH /api/notes/:id - Update a note
   */
  router.patch('/:id', async (c: HonoContext) => {
    try {
      const userId = c.get('userId');
      const db = getDb(c.env);
      const idParam = c.req.param('id');
      if (!idParam) {
        return c.json({ error: 'Note ID is required' }, 400);
      }
      const id = parseInt(idParam);
      const { content } = await c.req.json();

      if (!content) {
        return c.json({ error: 'Content is required' }, 400);
      }

      const note = await userNotesService.updateNote(db, id, userId, content);
      return c.json(note);
    } catch (error: any) {
      if (error.message === 'Note not found or unauthorized') {
        return c.json({ error: 'Note not found' }, 404);
      }
      console.error('Error updating note:', error);
      return c.json({ error: 'Failed to update note' }, 500);
    }
  });

  /**
   * DELETE /api/notes/:id - Delete a note
   */
  router.delete('/:id', async (c: HonoContext) => {
    try {
      const userId = c.get('userId');
      const db = getDb(c.env);
      const idParam = c.req.param('id');
      if (!idParam) {
        return c.json({ error: 'Note ID is required' }, 400);
      }
      const id = parseInt(idParam);

      await userNotesService.deleteNote(db, id, userId);
      return c.json({ success: true });
    } catch (error: any) {
      if (error.message === 'Note not found or unauthorized') {
        return c.json({ error: 'Note not found' }, 404);
      }
      console.error('Error deleting note:', error);
      return c.json({ error: 'Failed to delete note' }, 500);
    }
  });

  return router;
};

export const userNotesRoutes = createUserNotesRoutes;
