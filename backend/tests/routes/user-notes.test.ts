import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Variables } from '../../src/middleware/auth';
import type { Env } from '../../src/db/index';

// Mock getDb at the top level
vi.mock('../../src/db/index', () => ({
  getDb: vi.fn(),
}));

import { createUserNotesRoutes } from '../../src/routes/user-notes';
import { getDb } from '../../src/db/index';

describe('User Notes Routes', () => {
  let app: Hono<{ Bindings: Env; Variables: Variables }>;
  let mockUserNotesService: any;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserNotesService = {
      createNote: vi.fn(),
      listNotes: vi.fn(),
      getNote: vi.fn(),
      updateNote: vi.fn(),
      deleteNote: vi.fn(),
    };

    mockDb = {};

    // Setup getDb mock
    (getDb as any).mockReturnValue(mockDb);

    const router = createUserNotesRoutes(mockUserNotesService);
    app = new Hono<{ Bindings: Env; Variables: Variables }>();

    // Add auth middleware mock - simulates JWT context with userId
    app.use('*', (c, next) => {
      c.set('userId', 'test-user');
      c.env = { D1: mockDb } as any;
      return next();
    });

    app.route('/api/notes', router);
  });

  describe('POST /api/notes - Create Note', () => {
    it('should create a note with valid content', async () => {
      const mockNote = {
        id: 1,
        userId: 'test-user',
        content: 'My financial goal',
        embeddingId: 'emb-1',
        createdAt: '2026-04-08T00:00:00Z',
        updatedAt: '2026-04-08T00:00:00Z',
      };

      mockUserNotesService.createNote.mockResolvedValueOnce(mockNote);

      const res = await app.request('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ content: 'My financial goal' }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(201);
      const data = await res.json() as any;
      expect(data.id).toBe(1);
      expect(data.content).toBe('My financial goal');
    });

    it('should return 400 if content is missing', async () => {
      const res = await app.request('/api/notes', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.error).toBe('Content is required');
    });

    it('should call createNote with db, userId and content', async () => {
      mockUserNotesService.createNote.mockResolvedValueOnce({
        id: 1,
        userId: 'test-user',
        content: 'test',
      });

      await app.request('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ content: 'test content' }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(mockUserNotesService.createNote).toHaveBeenCalledWith(
        mockDb,
        'test-user',
        'test content'
      );
    });

    it('should return 500 on service error', async () => {
      mockUserNotesService.createNote.mockRejectedValueOnce(new Error('DB error'));

      const res = await app.request('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ content: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(500);
      const data = await res.json() as any;
      expect(data.error).toBe('Failed to create note');
    });

    it('should preserve note metadata in response', async () => {
      const mockNote = {
        id: 2,
        userId: 'test-user',
        content: 'Important goal',
        embeddingId: 'emb-2',
        createdAt: '2026-04-08T10:00:00Z',
        updatedAt: '2026-04-08T10:00:00Z',
      };

      mockUserNotesService.createNote.mockResolvedValueOnce(mockNote);

      const res = await app.request('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ content: 'Important goal' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json() as any;
      expect(data.embeddingId).toBe('emb-2');
      expect(data.createdAt).toBe('2026-04-08T10:00:00Z');
    });
  });

  describe('GET /api/notes - List Notes', () => {
    it('should list all notes for user', async () => {
      const mockNotes = [
        { id: 1, userId: 'test-user', content: 'Note 1' },
        { id: 2, userId: 'test-user', content: 'Note 2' },
      ];

      mockUserNotesService.listNotes.mockResolvedValueOnce(mockNotes);

      const res = await app.request('/api/notes', { method: 'GET' });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it('should call listNotes with db and userId', async () => {
      mockUserNotesService.listNotes.mockResolvedValueOnce([]);

      await app.request('/api/notes', { method: 'GET' });

      expect(mockUserNotesService.listNotes).toHaveBeenCalledWith(mockDb, 'test-user');
    });

    it('should return empty array if no notes', async () => {
      mockUserNotesService.listNotes.mockResolvedValueOnce([]);

      const res = await app.request('/api/notes', { method: 'GET' });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data).toEqual([]);
    });

    it('should return 500 on service error', async () => {
      mockUserNotesService.listNotes.mockRejectedValueOnce(new Error('DB error'));

      const res = await app.request('/api/notes', { method: 'GET' });

      expect(res.status).toBe(500);
      const data = await res.json() as any;
      expect(data.error).toBe('Failed to list notes');
    });

    it('should return correct note count when multiple notes exist', async () => {
      const mockNotes = [
        { id: 1, userId: 'test-user', content: 'Note 1' },
        { id: 2, userId: 'test-user', content: 'Note 2' },
        { id: 3, userId: 'test-user', content: 'Note 3' },
      ];

      mockUserNotesService.listNotes.mockResolvedValueOnce(mockNotes);

      const res = await app.request('/api/notes', { method: 'GET' });

      const data = await res.json() as any;
      expect(data.length).toBe(3);
    });
  });

  describe('GET /api/notes/:id - Get Single Note', () => {
    it('should get a single note by id', async () => {
      const mockNote = {
        id: 1,
        userId: 'test-user',
        content: 'My note',
        embeddingId: 'emb-1',
      };

      mockUserNotesService.getNote.mockResolvedValueOnce(mockNote);

      const res = await app.request('/api/notes/1', { method: 'GET' });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.id).toBe(1);
      expect(data.content).toBe('My note');
    });

    it('should return 404 if note not found', async () => {
      mockUserNotesService.getNote.mockResolvedValueOnce(null);

      const res = await app.request('/api/notes/999', { method: 'GET' });

      expect(res.status).toBe(404);
      const data = await res.json() as any;
      expect(data.error).toBe('Note not found');
    });

    it('should call getNote with db, id and userId', async () => {
      mockUserNotesService.getNote.mockResolvedValueOnce({ id: 5 });

      await app.request('/api/notes/5', { method: 'GET' });

      expect(mockUserNotesService.getNote).toHaveBeenCalledWith(mockDb, 5, 'test-user');
    });

    it('should return 500 on service error', async () => {
      mockUserNotesService.getNote.mockRejectedValueOnce(new Error('DB error'));

      const res = await app.request('/api/notes/1', { method: 'GET' });

      expect(res.status).toBe(500);
      const data = await res.json() as any;
      expect(data.error).toBe('Failed to get note');
    });

    it('should parse note id as integer', async () => {
      mockUserNotesService.getNote.mockResolvedValueOnce({ id: 42 });

      await app.request('/api/notes/42', { method: 'GET' });

      expect(mockUserNotesService.getNote).toHaveBeenCalledWith(mockDb, 42, 'test-user');
    });
  });

  describe('PATCH /api/notes/:id - Update Note', () => {
    it('should update a note', async () => {
      const updatedNote = {
        id: 1,
        userId: 'test-user',
        content: 'Updated content',
        embeddingId: 'emb-2',
      };

      mockUserNotesService.updateNote.mockResolvedValueOnce(updatedNote);

      const res = await app.request('/api/notes/1', {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Updated content' }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.content).toBe('Updated content');
    });

    it('should return 400 if content is missing', async () => {
      const res = await app.request('/api/notes/1', {
        method: 'PATCH',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.error).toBe('Content is required');
    });

    it('should return 404 if note not found', async () => {
      mockUserNotesService.updateNote.mockRejectedValueOnce(
        new Error('Note not found or unauthorized')
      );

      const res = await app.request('/api/notes/999', {
        method: 'PATCH',
        body: JSON.stringify({ content: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(404);
      const data = await res.json() as any;
      expect(data.error).toBe('Note not found');
    });

    it('should call updateNote with db, id, userId, and content', async () => {
      mockUserNotesService.updateNote.mockResolvedValueOnce({ id: 1 });

      await app.request('/api/notes/1', {
        method: 'PATCH',
        body: JSON.stringify({ content: 'new content' }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(mockUserNotesService.updateNote).toHaveBeenCalledWith(
        mockDb,
        1,
        'test-user',
        'new content'
      );
    });

    it('should return 500 on service error', async () => {
      mockUserNotesService.updateNote.mockRejectedValueOnce(new Error('DB error'));

      const res = await app.request('/api/notes/1', {
        method: 'PATCH',
        body: JSON.stringify({ content: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(500);
      const data = await res.json() as any;
      expect(data.error).toBe('Failed to update note');
    });

    it('should parse note id as integer', async () => {
      mockUserNotesService.updateNote.mockResolvedValueOnce({ id: 7 });

      await app.request('/api/notes/7', {
        method: 'PATCH',
        body: JSON.stringify({ content: 'updated' }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(mockUserNotesService.updateNote).toHaveBeenCalledWith(
        mockDb,
        7,
        'test-user',
        'updated'
      );
    });
  });

  describe('DELETE /api/notes/:id - Delete Note', () => {
    it('should delete a note', async () => {
      mockUserNotesService.deleteNote.mockResolvedValueOnce(undefined);

      const res = await app.request('/api/notes/1', { method: 'DELETE' });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
    });

    it('should return 404 if note not found', async () => {
      mockUserNotesService.deleteNote.mockRejectedValueOnce(
        new Error('Note not found or unauthorized')
      );

      const res = await app.request('/api/notes/999', { method: 'DELETE' });

      expect(res.status).toBe(404);
      const data = await res.json() as any;
      expect(data.error).toBe('Note not found');
    });

    it('should call deleteNote with db, id and userId', async () => {
      mockUserNotesService.deleteNote.mockResolvedValueOnce(undefined);

      await app.request('/api/notes/5', { method: 'DELETE' });

      expect(mockUserNotesService.deleteNote).toHaveBeenCalledWith(mockDb, 5, 'test-user');
    });

    it('should return 500 on service error', async () => {
      mockUserNotesService.deleteNote.mockRejectedValueOnce(new Error('DB error'));

      const res = await app.request('/api/notes/1', { method: 'DELETE' });

      expect(res.status).toBe(500);
      const data = await res.json() as any;
      expect(data.error).toBe('Failed to delete note');
    });

    it('should parse note id as integer', async () => {
      mockUserNotesService.deleteNote.mockResolvedValueOnce(undefined);

      await app.request('/api/notes/15', { method: 'DELETE' });

      expect(mockUserNotesService.deleteNote).toHaveBeenCalledWith(mockDb, 15, 'test-user');
    });
  });

  describe('Authorization & User Data Isolation', () => {
    it('should extract userId from context and pass to service', async () => {
      mockUserNotesService.createNote.mockResolvedValueOnce({ id: 1 });

      await app.request('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ content: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      // Verify userId was passed
      const calls = mockUserNotesService.createNote.mock.calls;
      expect(calls[0][1]).toBe('test-user');
    });

    it('should pass userId to listNotes for data isolation', async () => {
      mockUserNotesService.listNotes.mockResolvedValueOnce([]);

      await app.request('/api/notes', { method: 'GET' });

      expect(mockUserNotesService.listNotes).toHaveBeenCalledWith(mockDb, 'test-user');
    });

    it('should pass userId to getNote for authorization check', async () => {
      mockUserNotesService.getNote.mockResolvedValueOnce({ id: 1 });

      await app.request('/api/notes/1', { method: 'GET' });

      const calls = mockUserNotesService.getNote.mock.calls;
      expect(calls[0][2]).toBe('test-user');
    });

    it('should pass userId to updateNote for authorization', async () => {
      mockUserNotesService.updateNote.mockResolvedValueOnce({ id: 1 });

      await app.request('/api/notes/1', {
        method: 'PATCH',
        body: JSON.stringify({ content: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const calls = mockUserNotesService.updateNote.mock.calls;
      expect(calls[0][2]).toBe('test-user');
    });

    it('should pass userId to deleteNote for authorization', async () => {
      mockUserNotesService.deleteNote.mockResolvedValueOnce(undefined);

      await app.request('/api/notes/1', { method: 'DELETE' });

      const calls = mockUserNotesService.deleteNote.mock.calls;
      expect(calls[0][2]).toBe('test-user');
    });

    it('should prevent unauthorized access by verifying userId in service calls', async () => {
      const differentUserId = 'different-user';

      // Create a new app with different user
      const appWithDifferentUser = new Hono<{ Bindings: Env; Variables: Variables }>();
      appWithDifferentUser.use('*', (c, next) => {
        c.set('userId', differentUserId);
        c.env = { D1: mockDb } as any;
        return next();
      });
      const router = createUserNotesRoutes(mockUserNotesService);
      appWithDifferentUser.route('/api/notes', router);

      mockUserNotesService.listNotes.mockResolvedValueOnce([]);

      await appWithDifferentUser.request('/api/notes', { method: 'GET' });

      expect(mockUserNotesService.listNotes).toHaveBeenCalledWith(mockDb, differentUserId);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing request body gracefully', async () => {
      const res = await app.request('/api/notes', {
        method: 'POST',
        body: '',
        headers: { 'Content-Type': 'application/json' },
      });

      expect([400, 500]).toContain(res.status);
    });

    it('should handle invalid note id format', async () => {
      mockUserNotesService.getNote.mockResolvedValueOnce(null);

      const res = await app.request('/api/notes/invalid', { method: 'GET' });

      // NaN will be passed to service, service should handle or return null
      expect([404, 500]).toContain(res.status);
    });

    it('should include error details in error responses', async () => {
      mockUserNotesService.createNote.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const res = await app.request('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ content: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json() as any;
      expect(data.error).toBeDefined();
      expect(typeof data.error).toBe('string');
    });
  });

  describe('Response Structure', () => {
    it('should return note with id in create response', async () => {
      const mockNote = {
        id: 100,
        userId: 'test-user',
        content: 'test',
      };

      mockUserNotesService.createNote.mockResolvedValueOnce(mockNote);

      const res = await app.request('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ content: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json() as any;
      expect(data).toHaveProperty('id');
    });

    it('should return array in list response', async () => {
      mockUserNotesService.listNotes.mockResolvedValueOnce([
        { id: 1, content: 'Note 1' },
      ]);

      const res = await app.request('/api/notes', { method: 'GET' });

      const data = await res.json() as any;
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return success flag in delete response', async () => {
      mockUserNotesService.deleteNote.mockResolvedValueOnce(undefined);

      const res = await app.request('/api/notes/1', { method: 'DELETE' });

      const data = await res.json() as any;
      expect(data.success).toBe(true);
    });
  });
});
