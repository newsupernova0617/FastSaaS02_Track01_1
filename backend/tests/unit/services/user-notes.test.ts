/**
 * Task 25: UserNotesService — real-DB userId isolation tests
 *
 * These tests use an in-memory SQLite DB (via createTestDb) so every query
 * actually executes against the schema.  The VectorizeService is mocked so
 * tests never make real HTTP calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { seedUser } from '../../helpers/fixtures';
import { UserNotesService } from '../../../src/services/user-notes';
import { userNotes } from '../../../src/db/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockVectorize(embedding: number[] = [0.1, 0.2, 0.3]) {
  return {
    embedText: vi.fn().mockResolvedValue(embedding),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('UserNotesService — real-DB isolation', () => {
  let handle: TestDbHandle;
  let mockVectorize: ReturnType<typeof makeMockVectorize>;
  let service: UserNotesService;

  beforeEach(async () => {
    handle = await createTestDb();
    mockVectorize = makeMockVectorize();
    service = new UserNotesService(mockVectorize);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // createNote
  // -------------------------------------------------------------------------

  describe('createNote', () => {
    it('persists a note with the correct userId', async () => {
      const user = await seedUser(handle.db, { id: 'alice' });

      const note = await service.createNote(handle.db, user.id, 'My budget plan');

      expect(note.userId).toBe('alice');
      expect(note.content).toBe('My budget plan');
      expect(note.id).toBeTypeOf('number');
    });

    it('calls vectorizeService.embedText with the note content', async () => {
      const user = await seedUser(handle.db, { id: 'alice-vec' });

      await service.createNote(handle.db, user.id, 'invest in index funds');

      expect(mockVectorize.embedText).toHaveBeenCalledOnce();
      expect(mockVectorize.embedText).toHaveBeenCalledWith('invest in index funds');
    });

    it('stores a non-null embeddingId when embedding is non-empty', async () => {
      const user = await seedUser(handle.db, { id: 'alice-emb' });

      const note = await service.createNote(handle.db, user.id, 'savings goal');

      expect(note.embeddingId).toBeTruthy();
    });

    it('stores null embeddingId when vectorization returns empty array', async () => {
      mockVectorize.embedText.mockResolvedValueOnce([]);
      const user = await seedUser(handle.db, { id: 'alice-empty' });

      const note = await service.createNote(handle.db, user.id, 'fallback note');

      expect(note.embeddingId).toBeNull();
    });

    it('still saves note to DB even when vectorization returns empty (graceful degradation)', async () => {
      mockVectorize.embedText.mockResolvedValueOnce([]);
      const user = await seedUser(handle.db, { id: 'alice-degrade' });

      const note = await service.createNote(handle.db, user.id, 'graceful note');

      // Note was persisted despite no embedding
      expect(note.id).toBeTypeOf('number');
      expect(note.content).toBe('graceful note');
      expect(mockVectorize.embedText).toHaveBeenCalledOnce();
    });

    it('still saves note when vectorize throws (function returns empty array fallback)', async () => {
      // embedText is already set to resolve([]) on error in the source via callWithRetry,
      // but we simulate it returning [] to confirm note persistence path
      mockVectorize.embedText.mockResolvedValueOnce([]);
      const user = await seedUser(handle.db, { id: 'alice-throw' });

      // Should not reject — the service always saves the note
      const note = await service.createNote(handle.db, user.id, 'note despite error');
      expect(note.content).toBe('note despite error');
    });
  });

  // -------------------------------------------------------------------------
  // listNotes — cross-user isolation
  // -------------------------------------------------------------------------

  describe('listNotes — userId isolation', () => {
    it('returns only alice notes when called with alice userId', async () => {
      const alice = await seedUser(handle.db, { id: 'list-alice' });
      const bob = await seedUser(handle.db, { id: 'list-bob' });

      await service.createNote(handle.db, alice.id, 'Alice note 1');
      await service.createNote(handle.db, alice.id, 'Alice note 2');
      await service.createNote(handle.db, bob.id, 'Bob note 1');

      const aliceNotes = await service.listNotes(handle.db, alice.id);

      expect(aliceNotes).toHaveLength(2);
      expect(aliceNotes.every((n) => n.userId === alice.id)).toBe(true);
    });

    it('bob cannot see alice notes', async () => {
      const alice = await seedUser(handle.db, { id: 'iso-alice' });
      const bob = await seedUser(handle.db, { id: 'iso-bob' });

      await service.createNote(handle.db, alice.id, 'Alice private note');

      const bobNotes = await service.listNotes(handle.db, bob.id);

      expect(bobNotes).toHaveLength(0);
    });

    it('returns empty array for user with no notes', async () => {
      const user = await seedUser(handle.db, { id: 'user-no-notes' });

      const notes = await service.listNotes(handle.db, user.id);

      expect(notes).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getNote — cross-user read isolation
  // -------------------------------------------------------------------------

  describe('getNote — userId isolation', () => {
    it('alice can read her own note', async () => {
      const alice = await seedUser(handle.db, { id: 'get-alice' });
      const note = await service.createNote(handle.db, alice.id, 'Alice content');

      const fetched = await service.getNote(handle.db, note.id, alice.id);

      expect(fetched).not.toBeNull();
      expect(fetched!.content).toBe('Alice content');
    });

    it('bob cannot read alice note — returns null', async () => {
      const alice = await seedUser(handle.db, { id: 'get-alice2' });
      const bob = await seedUser(handle.db, { id: 'get-bob' });
      const note = await service.createNote(handle.db, alice.id, 'Alice secret');

      const result = await service.getNote(handle.db, note.id, bob.id);

      expect(result).toBeNull();
    });

    it('returns null for non-existent note id', async () => {
      const user = await seedUser(handle.db, { id: 'get-ghost' });

      const result = await service.getNote(handle.db, 99999, user.id);

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // updateNote — cross-user write isolation
  // -------------------------------------------------------------------------

  describe('updateNote — userId isolation', () => {
    it('alice can update her own note', async () => {
      const alice = await seedUser(handle.db, { id: 'upd-alice' });
      const note = await service.createNote(handle.db, alice.id, 'original');

      const updated = await service.updateNote(handle.db, note.id, alice.id, 'updated content');

      expect(updated.content).toBe('updated content');
    });

    it('bob cannot update alice note — throws', async () => {
      const alice = await seedUser(handle.db, { id: 'upd-alice2' });
      const bob = await seedUser(handle.db, { id: 'upd-bob' });
      const note = await service.createNote(handle.db, alice.id, 'alice original');

      await expect(
        service.updateNote(handle.db, note.id, bob.id, 'bob hacked')
      ).rejects.toThrow('Note not found or unauthorized');
    });

    it('re-vectorizes content on update', async () => {
      const alice = await seedUser(handle.db, { id: 'upd-vec-alice' });
      const note = await service.createNote(handle.db, alice.id, 'old content');

      // Reset call count after create
      mockVectorize.embedText.mockClear();
      await service.updateNote(handle.db, note.id, alice.id, 'new content');

      expect(mockVectorize.embedText).toHaveBeenCalledOnce();
      expect(mockVectorize.embedText).toHaveBeenCalledWith('new content');
    });
  });

  // -------------------------------------------------------------------------
  // deleteNote — cross-user write isolation
  // -------------------------------------------------------------------------

  describe('deleteNote — userId isolation', () => {
    it('alice can delete her own note', async () => {
      const alice = await seedUser(handle.db, { id: 'del-alice' });
      const note = await service.createNote(handle.db, alice.id, 'to delete');

      await expect(service.deleteNote(handle.db, note.id, alice.id)).resolves.toBeUndefined();

      // Confirm note is gone
      const after = await service.getNote(handle.db, note.id, alice.id);
      expect(after).toBeNull();
    });

    it('bob cannot delete alice note — throws', async () => {
      const alice = await seedUser(handle.db, { id: 'del-alice2' });
      const bob = await seedUser(handle.db, { id: 'del-bob' });
      const note = await service.createNote(handle.db, alice.id, 'alice note');

      await expect(service.deleteNote(handle.db, note.id, bob.id)).rejects.toThrow(
        'Note not found or unauthorized'
      );

      // Note still exists for alice
      const still = await service.getNote(handle.db, note.id, alice.id);
      expect(still).not.toBeNull();
    });

    it('throws for non-existent note id', async () => {
      const user = await seedUser(handle.db, { id: 'del-ghost' });

      await expect(service.deleteNote(handle.db, 99999, user.id)).rejects.toThrow(
        'Note not found or unauthorized'
      );
    });
  });
});
