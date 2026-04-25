// ============================================================
// [DB 조작 + 인가] 세션 관리 서비스
//
// 채팅 세션의 CRUD를 담당합니다.
// 모든 함수에서 userId를 필수로 받아 "본인의 세션만" 접근 가능하도록 합니다.
//
// 보안 핵심 규칙:
//   - getSession(): sessionId AND userId 둘 다 일치해야 반환
//   - deleteSession(): 소유권 먼저 확인 → 메시지 삭제 → 세션 삭제
//   - 다른 사용자의 세션을 조회/수정/삭제할 수 없음
// ============================================================

import { and, eq, desc } from 'drizzle-orm';
import { sessions as sessionsTable, chatMessages } from '../db/schema';

/**
 * 새 채팅 세션을 생성합니다.
 * userId는 서버에서 설정되므로 다른 사용자의 세션을 만들 수 없습니다.
 *
 * @param db - Database instance
 * @param userId - User ID (JWT에서 추출된 값)
 * @param title - Session title (auto-generated from first message or user-provided)
 * @returns Created session object with id, title, createdAt
 */
export async function createSession(
  db: any,
  userId: string,
  title: string
): Promise<{ id: number; userId: string; title: string; createdAt: string }> {
  // Note: User will create the sessions table via migration
  // This function assumes the table exists
  const result = await db
    .insert(sessionsTable)
    .values({
      userId,
      title,
    })
    .returning()
    .get();

  return result;
}

/**
 * List all sessions for a user, ordered by most recent first
 * @param db - Database instance
 * @param userId - User ID
 * @returns Array of sessions with metadata
 */
export async function listSessions(
  db: any,
  userId: string,
  limit = 50
): Promise<
  Array<{
    id: number;
    userId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }>
> {
  const sessionList = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, userId))
    .orderBy(desc(sessionsTable.updatedAt))
    .limit(limit)
    .all();

  return sessionList;
}

/**
 * Get a single session by ID with authorization check
 * @param db - Database instance
 * @param sessionId - Session ID
 * @param userId - User ID (for ownership validation)
 * @returns Session object or null if not found/unauthorized
 */
export async function getSession(
  db: any,
  sessionId: number,
  userId: string
): Promise<{
  id: number;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
} | null> {
  const session = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.id, sessionId),
        eq(sessionsTable.userId, userId)
      )
    )
    .get();

  return session || null;
}

/**
 * Rename a session
 * @param db - Database instance
 * @param sessionId - Session ID
 * @param userId - User ID (for ownership validation)
 * @param newTitle - New session title
 * @returns Updated session object or null if not found/unauthorized
 */
export async function renameSession(
  db: any,
  sessionId: number,
  userId: string,
  newTitle: string
): Promise<{
  id: number;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
} | null> {
  const result = await db
    .update(sessionsTable)
    .set({
      title: newTitle,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(sessionsTable.id, sessionId),
        eq(sessionsTable.userId, userId)
      )
    )
    .returning()
    .get();

  return result || null;
}

/**
 * Delete a session and all its messages (hard delete)
 * @param db - Database instance
 * @param sessionId - Session ID
 * @param userId - User ID (for ownership validation)
 * @returns Boolean indicating success
 */
export async function deleteSession(
  db: any,
  sessionId: number,
  userId: string
): Promise<boolean> {
  try {
    // First verify ownership
    const session = await getSession(db, sessionId, userId);
    if (!session) {
      return false;
    }

    // Delete all messages in this session first (cascade)
    await db
      .delete(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .run();

    // Delete the session
    await db
      .delete(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .run();

    return true;
  } catch (error) {
    console.error('[deleteSession] Error:', error);
    throw error;
  }
}

/**
 * Generate a simple session title from user's first message
 * Truncates to 50 characters
 * @param message - First user message
 * @returns Truncated title
 */
export function generateSessionTitle(message: string): string {
  const truncated = message.length > 50 ? message.substring(0, 50) + '...' : message;
  return truncated;
}
