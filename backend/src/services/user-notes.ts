import { eq, and } from 'drizzle-orm';
import { userNotes } from '../db/schema';
import type { UserNote, NewUserNote } from '../db/schema';

export class UserNotesService {
  constructor(private vectorizeService: any) {}

  /**
   * Create a new user note and vectorize it
   */
  async createNote(db: any, userId: string, content: string): Promise<UserNote> {
    // Vectorize the note content
    const embedding = await this.vectorizeService.embedText(content);
    const embeddingId = embedding.length > 0 ? `note-${Date.now()}` : null;

    // Insert note
    const result = await db
      .insert(userNotes)
      .values({
        userId,
        content,
        embeddingId,
      })
      .returning();

    return result[0];
  }

  /**
   * Get all notes for a user
   */
  async listNotes(db: any, userId: string): Promise<UserNote[]> {
    return await db
      .select()
      .from(userNotes)
      .where(eq(userNotes.userId, userId))
      .orderBy((t: any) => [t.updatedAt])
      .all();
  }

  /**
   * Get a single note by ID (verify ownership)
   */
  async getNote(db: any, id: number, userId: string): Promise<UserNote | null> {
    const result = await db
      .select()
      .from(userNotes)
      .where(and(eq(userNotes.id, id), eq(userNotes.userId, userId)))
      .limit(1)
      .all();

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Update a note and re-vectorize
   */
  async updateNote(db: any, id: number, userId: string, content: string): Promise<UserNote> {
    // Verify ownership
    const existing = await this.getNote(db, id, userId);
    if (!existing) {
      throw new Error('Note not found or unauthorized');
    }

    // Re-vectorize
    const embedding = await this.vectorizeService.embedText(content);
    const embeddingId = embedding.length > 0 ? `note-${Date.now()}` : null;

    // Update
    const result = await db
      .update(userNotes)
      .set({
        content,
        embeddingId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userNotes.id, id))
      .returning();

    return result[0];
  }

  /**
   * Delete a note
   */
  async deleteNote(db: any, id: number, userId: string): Promise<void> {
    const existing = await this.getNote(db, id, userId);
    if (!existing) {
      throw new Error('Note not found or unauthorized');
    }

    await db
      .delete(userNotes)
      .where(and(eq(userNotes.id, id), eq(userNotes.userId, userId)))
      .run();
  }
}

export const userNotesService = (vectorizeService: any) =>
  new UserNotesService(vectorizeService);
