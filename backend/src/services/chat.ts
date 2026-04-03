import { eq, desc, lt } from 'drizzle-orm';
import { chatMessages } from '../db/schema';

/**
 * Saves a user or assistant message to chat history
 * @param db - Database instance
 * @param userId - User ID
 * @param role - 'user' or 'assistant'
 * @param content - Message content
 * @param metadata - Optional metadata (for assistant messages with report data, etc.)
 */
export async function saveMessage(
  db: any,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db
    .insert(chatMessages)
    .values({
      userId,
      role,
      content,
      metadata: metadata ? JSON.stringify(metadata) : null,
    })
    .run();
}

/**
 * Retrieves chat history for a user with optional pagination
 * @param db - Database instance
 * @param userId - User ID
 * @param limit - Maximum number of messages to return (default 50)
 * @param beforeId - Optional message ID to paginate from (returns messages before this ID)
 * @returns Array of chat messages ordered by most recent first
 */
export async function getChatHistory(
  db: any,
  userId: string,
  limit: number = 50,
  beforeId?: number
): Promise<Array<{ id: number; role: 'user' | 'assistant'; content: string; metadata?: Record<string, unknown>; createdAt: string }>> {
  let query = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId));

  // If beforeId is provided, only get messages before that ID
  if (beforeId) {
    query = query.where(lt(chatMessages.id, beforeId));
  }

  const messages = await query
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit)
    .all();

  // Parse metadata JSON strings back to objects
  return messages.map((msg: any) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined,
    createdAt: msg.createdAt,
  }));
}

/**
 * Clears all chat history for a user
 * @param db - Database instance
 * @param userId - User ID
 * @returns Number of messages deleted
 */
export async function clearChatHistory(
  db: any,
  userId: string
): Promise<number> {
  // For SQLite compatibility, we need to delete then get the affected count
  const result = await db
    .delete(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .run();

  // Return the number of rows deleted if available, otherwise 0
  return result.rowsAffected || 0;
}
