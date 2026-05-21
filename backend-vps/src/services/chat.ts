// ============================================================
// [DB 조작] 채팅 메시지 서비스
//
// 사용자-AI 간 대화 메시지의 저장/조회/삭제를 담당합니다.
//
// 보안 핵심 규칙:
//   - getChatHistory(): userId로 필터링 → 본인 메시지만 반환
//   - getChatHistoryBySession(): userId가 필수 파라미터(3번째 인자)
//     → userId 없이 호출하면 컴파일 에러 (의도적 설계)
//   - clearChatHistory(): userId로 필터링 → 본인 메시지만 삭제
//
// ⚠️ 주의:
//   - deleteSessionMessages(): sessionId로만 삭제합니다.
//     호출자(deleteSession)가 소유권을 먼저 검증해야 합니다.
//   - saveMessage/saveMessageToSession: userId를 파라미터로 받지만,
//     호출자가 c.get('userId')로 전달해야 합니다 (body에서 읽지 않도록).
// ============================================================

import { eq, desc, lt, and } from 'drizzle-orm';
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
 * Saves a message to a specific session
 * Session-aware variant of saveMessage
 * @param db - Database instance
 * @param userId - User ID
 * @param sessionId - Session ID
 * @param role - 'user' or 'assistant'
 * @param content - Message content
 * @param metadata - Optional metadata (for reports, etc.)
 */
export async function saveMessageToSession(
  db: any,
  userId: string,
  sessionId: number,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db
    .insert(chatMessages)
    .values({
      userId,
      sessionId,
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

/**
 * Get chat history for a specific session
 * Ordered by creation time (ascending for chat display)
 * @param db - Database instance
 * @param sessionId - Session ID
 * @param limit - Maximum number of messages (default 50)
 * @returns Array of messages ordered by oldest first
 */
export async function getChatHistoryBySession(
  db: any,
  sessionId: number,
  userId: string,
  limit: number = 50
): Promise<Array<{ id: number; role: 'user' | 'assistant'; content: string; metadata?: Record<string, unknown>; createdAt: string }>> {
  const messages = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.userId, userId)))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit)
    .all();

  // Reverse to show oldest first (normal chat display order)
  return messages
    .reverse()
    .map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined,
      createdAt: msg.createdAt,
    }));
}

/**
 * Delete all messages in a session
 * Called when a session is deleted (hard delete cascade)
 * @param db - Database instance
 * @param sessionId - Session ID
 * @returns Number of messages deleted
 */
export async function deleteSessionMessages(
  db: any,
  sessionId: number
): Promise<number> {
  const result = await db
    .delete(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .run();

  return result.rowsAffected || 0;
}
