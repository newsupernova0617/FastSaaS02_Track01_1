// ============================================================
// [DB 조작 + 인증 + 보안] 세션 API 라우트 (핵심 엔드포인트)
//
// 이 파일은 프로젝트에서 가장 복잡하고 보안이 중요한 라우트입니다.
// 채팅 세션 CRUD + AI 메시지 처리를 모두 담당합니다.
//
// 보안 핵심 규칙:
//   1. 모든 핸들러에서 userId = c.get('userId') (JWT에서 추출)
//   2. 세션 접근 전 반드시 getSession(db, sessionId, userId)로 소유권 검증
//      → null 반환 시 404 (세션 없음 또는 권한 없음)
//   3. DB에 데이터 저장 시 userId를 서버에서 강제 설정
//   4. AI 요청은 1분에 20번까지 제한 (sessionMessageRateLimit)
//
// 엔드포인트 목록:
//   POST   /api/sessions              — 새 세션 생성
//   GET    /api/sessions              — 세션 목록 조회
//   GET    /api/sessions/:id          — 세션 상세 조회
//   PATCH  /api/sessions/:id          — 세션 이름 변경
//   DELETE /api/sessions/:id          — 세션 삭제 (메시지 포함)
//   GET    /api/sessions/:id/messages — 세션 메시지 조회
//   POST   /api/sessions/:id/messages — 메시지 전송 + AI 처리 (핵심)
// ============================================================

import { Hono } from 'hono';
import { getDb, Env } from '../db/index';
import type { Variables } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import { chatMessages } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  createSession,
  listSessions,
  getSession,
  renameSession,
  deleteSession,
  generateSessionTitle,
} from '../services/sessions';
import { processSessionMessage } from '../services/session-message-handler';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// [보안] AI 메시지 전송 속도 제한: 사용자당 1분에 최대 20번
// AI 호출은 비용이 높으므로 남용 방지
const sessionMessageRateLimit = createRateLimiter(20, 60_000);

// POST /api/sessions - 새 채팅 세션 생성
// userId는 JWT에서 추출되어 서버에서 강제 설정됨
router.post('/', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');  // [보안] JWT에서 추출
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
    const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);

    const sessions = await listSessions(db, userId, limit);

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

// GET /api/sessions/:sessionId/messages - 세션의 메시지 조회
// [보안 흐름]
//   1단계: getSession()으로 세션 소유권 검증 (userId + sessionId 이중 체크)
//   2단계: 소유권 확인 후 sessionId로 메시지 조회
//   ⚠️ 2단계에서 userId 조건이 없지만, 1단계에서 이미 검증되었으므로 안전
router.get('/:sessionId/messages', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');  // [보안] JWT에서 추출
    const sessionId = parseInt(c.req.param('sessionId'), 10);

    if (isNaN(sessionId)) {
      return c.json(
        { success: false, error: 'Invalid session ID' },
        400
      );
    }

    // [보안] 세션 소유권 검증 — userId와 sessionId가 모두 일치하는지 확인
    // 이 검증이 없으면 다른 사용자의 대화 내용을 볼 수 있는 보안 취약점 발생
    const session = await getSession(db, sessionId, userId);
    if (!session) {
      return c.json(
        { success: false, error: 'Session not found' },
        404
      );
    }

    // 소유권이 확인된 세션의 메시지만 조회
    // (위에서 세션 소유권을 검증했으므로 sessionId만으로 안전하게 조회 가능)
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt)
      .all();

    return c.json(
      {
        success: true,
        messages: messages.map((m: any) => ({
          id: m.id,
          sessionId: m.sessionId,
          userId: m.userId,
          role: m.role,
          content: m.content,
          metadata: m.metadata ? JSON.parse(m.metadata) : null,
          createdAt: m.createdAt,
        })),
      },
      200
    );
  } catch (error) {
    console.error('Error getting session messages:', error);
    return c.json(
      { success: false, error: 'Failed to get session messages' },
      500
    );
  }
});

// POST /api/sessions/:sessionId/messages — 메시지 전송 + AI 처리 (이 파일의 핵심)
//
// [전체 흐름]
//   1. 속도 제한 확인 (sessionMessageRateLimit)
//   2. 세션 소유권 검증 (getSession)
//   3. 사용자 메시지 DB 저장
//   4. AI가 사용자 입력을 분석 → 액션 타입 결정 (create/read/update/delete/report/clarify/undo)
//   5. 액션 실행 (거래 생성, 조회, 삭제, 리포트 생성 등)
//   6. AI 응답 메시지 DB 저장
//   7. 사용자 메시지 + AI 메시지 함께 반환
//
// [보안 체크포인트]
//   - userId: JWT에서 추출 (L323)
//   - 세션 소유권: getSession()으로 검증 (L342)
//   - 거래 조작: 모든 DB 쿼리에 eq(transactions.userId, userId) 포함
//   - 속도 제한: sessionMessageRateLimit 미들웨어
router.post('/:sessionId/messages', sessionMessageRateLimit, async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const sessionId = parseInt(c.req.param('sessionId'), 10);
  const { content } = await c.req.json();
  const result = await processSessionMessage({
    db,
    env: c.env,
    userId,
    sessionId,
    content,
  });

  return c.json(result.body, result.status as 200 | 400 | 404 | 500 | 503);
});

export default router;
