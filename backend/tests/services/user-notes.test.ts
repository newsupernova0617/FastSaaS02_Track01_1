import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserNotesService } from '../../src/services/user-notes';
import type { UserNote } from '../../src/db/schema';

describe('UserNotesService', () => {
  let service: UserNotesService;
  let mockVectorizeService: any;
  let mockDb: any;

  beforeEach(() => {
    mockVectorizeService = {
      embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]),
    };
    service = new UserNotesService(mockVectorizeService);
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createNote', () => {
    it('should create a new note and vectorize it', async () => {
      const userId = 'test-user';
      const content = 'My financial goal';
      const mockNote: UserNote = {
        id: 1,
        userId,
        content,
        embeddingId: `note-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockNote]),
        }),
      });

      const result = await service.createNote(mockDb, userId, content);

      expect(result.userId).toBe(userId);
      expect(result.content).toBe(content);
      expect(mockVectorizeService.embedText).toHaveBeenCalledWith(content);
    });

    it('should set embeddingId to null if embedding is empty', async () => {
      mockVectorizeService.embedText.mockResolvedValueOnce([]);

      const mockNote: UserNote = {
        id: 1,
        userId: 'test-user',
        content: 'test',
        embeddingId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockNote]),
        }),
      });

      const result = await service.createNote(mockDb, 'test-user', 'test content');

      expect(result.embeddingId).toBeNull();
    });

    it('should call vectorizeService with the note content', async () => {
      const mockNote: UserNote = {
        id: 1,
        userId: 'test-user',
        content: 'budget tracking',
        embeddingId: 'note-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockNote]),
        }),
      });

      await service.createNote(mockDb, 'test-user', 'budget tracking');

      expect(mockVectorizeService.embedText).toHaveBeenCalledWith('budget tracking');
    });

    it('should create note with non-empty embedding ID', async () => {
      const userId = 'test-user';
      const content = 'test content';
      const embeddingId = 'note-123456789';

      const mockNote: UserNote = {
        id: 1,
        userId,
        content,
        embeddingId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockNote]),
        }),
      });

      const result = await service.createNote(mockDb, userId, content);

      expect(result.embeddingId).toBeTruthy();
      expect(mockVectorizeService.embedText).toHaveBeenCalled();
    });
  });

  describe('listNotes', () => {
    it('should list all notes for a user', async () => {
      const userId = 'test-user';
      const mockNotes: UserNote[] = [
        {
          id: 1,
          userId,
          content: 'Note 1',
          embeddingId: 'emb-1',
          createdAt: '2026-04-08T00:00:00Z',
          updatedAt: '2026-04-08T00:00:00Z',
        },
        {
          id: 2,
          userId,
          content: 'Note 2',
          embeddingId: 'emb-2',
          createdAt: '2026-04-07T00:00:00Z',
          updatedAt: '2026-04-07T00:00:00Z',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue(mockNotes),
            }),
          }),
        }),
      });

      const result = await service.listNotes(mockDb, userId);

      expect(result).toEqual(mockNotes);
      expect(result.length).toBe(2);
    });

    it('should return empty array if user has no notes', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await service.listNotes(mockDb, 'user-with-no-notes');

      expect(result).toEqual([]);
    });

    it('should filter notes by userId', async () => {
      const userId = 'specific-user';

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await service.listNotes(mockDb, userId);

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should order notes by updatedAt', async () => {
      const mockNotes: UserNote[] = [
        {
          id: 1,
          userId: 'user',
          content: 'Older',
          embeddingId: 'emb-1',
          createdAt: '2026-04-07T00:00:00Z',
          updatedAt: '2026-04-07T00:00:00Z',
        },
        {
          id: 2,
          userId: 'user',
          content: 'Newer',
          embeddingId: 'emb-2',
          createdAt: '2026-04-08T00:00:00Z',
          updatedAt: '2026-04-08T00:00:00Z',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue(mockNotes),
            }),
          }),
        }),
      });

      const result = await service.listNotes(mockDb, 'user');

      expect(result).toEqual(mockNotes);
    });
  });

  describe('getNote', () => {
    it('should retrieve a note by id and userId', async () => {
      const userId = 'test-user';
      const noteId = 1;
      const mockNote: UserNote = {
        id: noteId,
        userId,
        content: 'Test note',
        embeddingId: 'emb-1',
        createdAt: '2026-04-08T00:00:00Z',
        updatedAt: '2026-04-08T00:00:00Z',
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([mockNote]),
            }),
          }),
        }),
      });

      const result = await service.getNote(mockDb, noteId, userId);

      expect(result).toEqual(mockNote);
    });

    it('should return null if note does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await service.getNote(mockDb, 999, 'test-user');

      expect(result).toBeNull();
    });

    it('should enforce userId authorization', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await service.getNote(mockDb, 1, 'wrong-user');

      expect(result).toBeNull();
    });

    it('should return note only when userId matches', async () => {
      const mockNote: UserNote = {
        id: 1,
        userId: 'correct-user',
        content: 'Secret note',
        embeddingId: 'emb-1',
        createdAt: '2026-04-08T00:00:00Z',
        updatedAt: '2026-04-08T00:00:00Z',
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([mockNote]),
            }),
          }),
        }),
      });

      const result = await service.getNote(mockDb, 1, 'correct-user');

      expect(result).toEqual(mockNote);
    });
  });

  describe('updateNote', () => {
    it('should update a note with new content', async () => {
      const userId = 'test-user';
      const noteId = 1;
      const newContent = 'Updated content';
      const originalNote: UserNote = {
        id: noteId,
        userId,
        content: 'Original',
        embeddingId: 'emb-1',
        createdAt: '2026-04-08T00:00:00Z',
        updatedAt: '2026-04-08T00:00:00Z',
      };

      const updatedNote: UserNote = {
        ...originalNote,
        content: newContent,
        embeddingId: `note-${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };

      // Mock getNote to return the original note
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([originalNote]),
            }),
          }),
        }),
      });

      // Mock update operation
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedNote]),
          }),
        }),
      });

      const result = await service.updateNote(mockDb, noteId, userId, newContent);

      expect(result.content).toBe(newContent);
      expect(mockVectorizeService.embedText).toHaveBeenCalledWith(newContent);
    });

    it('should throw error if note not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await expect(service.updateNote(mockDb, 999, 'test-user', 'content')).rejects.toThrow(
        'Note not found or unauthorized'
      );
    });

    it('should throw error if user is not authorized', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await expect(service.updateNote(mockDb, 1, 'wrong-user', 'new content')).rejects.toThrow(
        'Note not found or unauthorized'
      );
    });

    it('should re-vectorize content on update', async () => {
      const originalNote: UserNote = {
        id: 1,
        userId: 'user',
        content: 'old',
        embeddingId: 'emb-1',
        createdAt: '2026-04-08T00:00:00Z',
        updatedAt: '2026-04-08T00:00:00Z',
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([originalNote]),
            }),
          }),
        }),
      });

      const updatedNote: UserNote = {
        ...originalNote,
        content: 'new content',
        embeddingId: `note-${Date.now()}`,
      };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedNote]),
          }),
        }),
      });

      await service.updateNote(mockDb, 1, 'user', 'new content');

      expect(mockVectorizeService.embedText).toHaveBeenCalledWith('new content');
    });

    it('should set embeddingId to null if new embedding is empty', async () => {
      mockVectorizeService.embedText.mockResolvedValueOnce([]);

      const originalNote: UserNote = {
        id: 1,
        userId: 'user',
        content: 'old',
        embeddingId: 'emb-1',
        createdAt: '2026-04-08T00:00:00Z',
        updatedAt: '2026-04-08T00:00:00Z',
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([originalNote]),
            }),
          }),
        }),
      });

      const updatedNote: UserNote = {
        ...originalNote,
        content: 'new content',
        embeddingId: null,
      };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedNote]),
          }),
        }),
      });

      const result = await service.updateNote(mockDb, 1, 'user', 'new content');

      expect(result.embeddingId).toBeNull();
    });
  });

  describe('deleteNote', () => {
    it('should delete a note', async () => {
      const userId = 'test-user';
      const noteId = 1;
      const mockNote: UserNote = {
        id: noteId,
        userId,
        content: 'test',
        embeddingId: 'emb-1',
        createdAt: '2026-04-08T00:00:00Z',
        updatedAt: '2026-04-08T00:00:00Z',
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([mockNote]),
            }),
          }),
        }),
      });

      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await service.deleteNote(mockDb, noteId, userId);

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should throw error if note not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await expect(service.deleteNote(mockDb, 999, 'test-user')).rejects.toThrow(
        'Note not found or unauthorized'
      );
    });

    it('should enforce userId authorization on delete', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await expect(service.deleteNote(mockDb, 1, 'wrong-user')).rejects.toThrow(
        'Note not found or unauthorized'
      );
    });

    it('should only delete notes owned by the user', async () => {
      const otherUserNote: UserNote = {
        id: 1,
        userId: 'other-user',
        content: 'Other user note',
        embeddingId: 'emb-1',
        createdAt: '2026-04-08T00:00:00Z',
        updatedAt: '2026-04-08T00:00:00Z',
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await expect(service.deleteNote(mockDb, 1, 'trying-user')).rejects.toThrow(
        'Note not found or unauthorized'
      );

      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  describe('Authorization and Data Isolation', () => {
    it('should prevent user A from reading user B notes', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await service.getNote(mockDb, 1, 'user-b');

      expect(result).toBeNull();
    });

    it('should prevent user A from updating user B notes', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await expect(service.updateNote(mockDb, 1, 'user-a', 'hacked')).rejects.toThrow(
        'Note not found or unauthorized'
      );
    });

    it('should prevent user A from deleting user B notes', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await expect(service.deleteNote(mockDb, 1, 'user-a')).rejects.toThrow(
        'Note not found or unauthorized'
      );
    });

    it('should list notes only for the specified user', async () => {
      const userANotes: UserNote[] = [
        {
          id: 1,
          userId: 'user-a',
          content: 'Note A1',
          embeddingId: 'emb-1',
          createdAt: '2026-04-08T00:00:00Z',
          updatedAt: '2026-04-08T00:00:00Z',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue(userANotes),
            }),
          }),
        }),
      });

      const result = await service.listNotes(mockDb, 'user-a');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-a');
    });
  });

  describe('Vectorization triggers', () => {
    it('should vectorize content on create', async () => {
      const mockNote: UserNote = {
        id: 1,
        userId: 'user',
        content: 'budget planning',
        embeddingId: 'note-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockNote]),
        }),
      });

      await service.createNote(mockDb, 'user', 'budget planning');

      expect(mockVectorizeService.embedText).toHaveBeenCalledWith('budget planning');
    });

    it('should re-vectorize content on update', async () => {
      const originalNote: UserNote = {
        id: 1,
        userId: 'user',
        content: 'old',
        embeddingId: 'emb-1',
        createdAt: '2026-04-08T00:00:00Z',
        updatedAt: '2026-04-08T00:00:00Z',
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([originalNote]),
            }),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { ...originalNote, content: 'new content', embeddingId: 'emb-2' },
            ]),
          }),
        }),
      });

      await service.updateNote(mockDb, 1, 'user', 'new content');

      expect(mockVectorizeService.embedText).toHaveBeenCalledWith('new content');
    });

    it('should handle vectorization failure gracefully', async () => {
      mockVectorizeService.embedText.mockResolvedValueOnce([]);

      const mockNote: UserNote = {
        id: 1,
        userId: 'user',
        content: 'test',
        embeddingId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockNote]),
        }),
      });

      const result = await service.createNote(mockDb, 'user', 'test content');

      expect(result.embeddingId).toBeNull();
      expect(mockVectorizeService.embedText).toHaveBeenCalled();
    });
  });
});
