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
import { chatMessages, transactions, reports, type TransactionSnapshot } from '../db/schema';
import { eq, desc, isNull, and, inArray, sql } from 'drizzle-orm';
import { AIService } from '../services/ai';
import { getLLMConfig, callLLM } from '../services/llm';
import { ContextService } from '../services/context';
import { VectorizeService } from '../services/vectorize';
import {
  validateCreatePayload,
  validateUpdatePayload,
  validateReadPayload,
  validateDeletePayload,
  validateReportPayload,
  validateUndoPayload,
  validateAmount,
  validateDate,
  validateCategory,
} from '../services/validation';
import * as messages from '../services/messages';
import { AIReportService } from '../services/ai-report';
import { clarificationService } from '../services/clarifications';
import {
  createSession,
  listSessions,
  getSession,
  renameSession,
  deleteSession,
  generateSessionTitle,
} from '../services/sessions';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// [보안] AI 메시지 전송 속도 제한: 사용자당 1분에 최대 20번
// AI 호출은 비용이 높으므로 남용 방지
const sessionMessageRateLimit = createRateLimiter(20, 60_000);

function buildMetadata(
  actionType: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    actionType,
    ...extra,
  };
}

function generateClarificationQuestion(
  partialData: Record<string, unknown>,
  missingFields: string[]
): string {
  const questions: Record<string, string> = {
    amount: '얼마를 썼나요?',
    category: '어떤 카테고리인가요? (음식, 교통, 쇼핑, 엔터테인먼트, 유틸리티, 의료, 일, 기타)',
    transactionType: '지출인가요, 수입인가요?',
    date: '어느 날짜인가요?',
  };

  if (missingFields.length === 1) {
    return questions[missingFields[0]] || `${missingFields[0]}를(을) 알려주세요.`;
  }

  return `다음 정보를 알려주세요: ${missingFields.map(f => questions[f] || f).join(', ')}`;
}

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
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');  // [보안] JWT에서 추출 — 절대 body에서 읽지 않음
    const sessionId = parseInt(c.req.param('sessionId'), 10);
    const { content } = await c.req.json();

    if (isNaN(sessionId)) {
      return c.json(
        { success: false, error: 'Invalid session ID' },
        400
      );
    }

    if (!content || typeof content !== 'string') {
      return c.json(
        { success: false, error: 'Content is required' },
        400
      );
    }

    // [보안] 세션 소유권 검증 — 이 세션이 현재 사용자의 것인지 확인
    // 실패 시 404 반환 (403 대신 404를 반환해서 세션 존재 여부를 노출하지 않음)
    const session = await getSession(db, sessionId, userId);
    if (!session) {
      return c.json(
        { success: false, error: 'Session not found' },
        404
      );
    }

    // 사용자 메시지를 DB에 저장
    // userId는 서버에서 강제 설정 → 다른 사용자로 위장 불가
    const userMessage = await db
      .insert(chatMessages)
      .values({
        userId,   // [보안] 서버에서 설정된 userId
        sessionId,
        role: 'user',
        content,
      })
      .returning()
      .get();

    // Initialize AI service and context service
    const aiService = new AIService(getLLMConfig(c.env), c.env.AI);
    const vectorizeService = new VectorizeService(
      c.env.CLOUDFLARE_ACCOUNT_ID || '',
      c.env.CLOUDFLARE_API_TOKEN || ''
    );
    const contextService = new ContextService(vectorizeService);

    // Fetch user context
    const transactions_ = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.date))
      .limit(10);

    const categoryRows = await db
      .selectDistinct({ category: transactions.category })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)));

    const userCategories = categoryRows.map((r: any) => r.category);

    // Check for active clarification and merge response if exists
    const activeClarification = await clarificationService.getClarification(db, userId, sessionId);

    if (activeClarification) {
      // User is replying to a clarification question
      const { mergedData, stillMissingFields } = await clarificationService.mergeClarificationResponse(
        content,
        activeClarification
      );

      // If some fields still missing, ask for another clarification
      if (stillMissingFields.length > 0) {
        const nextQuestion = generateClarificationQuestion(mergedData, stillMissingFields);

        // Save updated clarification state
        const updatedState = {
          ...activeClarification,
          missingFields: stillMissingFields,
          partialData: mergedData,
        };
        await clarificationService.deleteClarification(db, userId, sessionId);
        const newClarId = await clarificationService.saveClarification(db, userId, sessionId, updatedState);

        // Add AI clarification message to chat
        const aiMessage = await db.insert(chatMessages).values({
          userId,
          sessionId,
          role: 'assistant',
          content: nextQuestion,
          metadata: JSON.stringify({ actionType: 'clarify', clarificationId: newClarId }),
        }).returning().get();

        return c.json({
          success: true,
          messages: [
            {
              id: userMessage.id,
              sessionId: userMessage.sessionId,
              userId: userMessage.userId,
              role: userMessage.role,
              content: userMessage.content,
              metadata: userMessage.metadata ? JSON.parse(userMessage.metadata) : null,
              createdAt: userMessage.createdAt,
            },
            {
              id: aiMessage.id,
              sessionId: aiMessage.sessionId,
              userId: aiMessage.userId,
              role: aiMessage.role,
              content: aiMessage.content,
              metadata: aiMessage.metadata ? JSON.parse(aiMessage.metadata) : null,
              createdAt: aiMessage.createdAt,
            },
          ],
          type: 'clarify',
        });
      }

      // All fields provided, clear clarification and continue with normal processing
      await clarificationService.deleteClarification(db, userId, sessionId);
    }

    // Parse user input with AI and context enrichment
    const action = await aiService.parseUserInput(
      content,
      transactions_,
      userCategories,
      userId,
      contextService,
      db
    );

    // Check if AI detected a plain text query (non-financial)
    if (action.type === 'plain_text') {
      // Call LLM for natural conversation
      const systemPrompt = `You are a helpful assistant for a personal finance app.
The user is asking a non-financial question. Please respond naturally and helpfully.
After answering, you can gently mention that you're available to help with expense management if needed.`;

      const llmMessages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content },
      ];

      let aiResponse: string;

      try {
        // Use the LLM directly for plain text conversation
        aiResponse = await callLLM(llmMessages, getLLMConfig(c.env), c.env.AI);
      } catch (error) {
        console.error('Error calling LLM for plain text:', error);
        aiResponse = `I appreciate the question! I'm primarily designed to help with expense management.
Feel free to ask me about:
• Adding expenses (e.g., "지출 5000원 커피로 추가")
• Viewing spending (e.g., "지난달 식비")
• Generating reports (e.g., "이번달 분석해줘")

How can I help with your finances?`;
      }

      const aiMessage = await db.insert(chatMessages).values({
        userId,
        sessionId,
        role: 'assistant',
        content: aiResponse,
        metadata: JSON.stringify({ actionType: 'plain_text' }),
      }).returning().get();

      return c.json({
        success: true,
        messages: [
          {
            id: userMessage.id,
            sessionId: userMessage.sessionId,
            userId: userMessage.userId,
            role: userMessage.role,
            content: userMessage.content,
            metadata: userMessage.metadata ? JSON.parse(userMessage.metadata) : null,
            createdAt: userMessage.createdAt,
          },
          {
            id: aiMessage.id,
            sessionId: aiMessage.sessionId,
            userId: aiMessage.userId,
            role: aiMessage.role,
            content: aiMessage.content,
            metadata: aiMessage.metadata ? JSON.parse(aiMessage.metadata) : null,
            createdAt: aiMessage.createdAt,
          },
        ],
        type: 'plain_text',
      });
    }

    // Execute action based on type - reusing logic from /ai/action
    let aiMessage: any = null;

    try {
      switch (action.type) {
        case 'create': {
          const payload = validateCreatePayload(action.payload);

          // Determine if single or multiple create
          const items = payload.items || [{
            transactionType: payload.transactionType!,
            amount: payload.amount!,
            category: payload.category!,
            memo: payload.memo,
            date: payload.date!,
          }];

          // Validate all items
          for (const item of items) {
            validateAmount(item.amount);
            validateDate(item.date);
            validateCategory(item.category, userCategories);
          }

          // Create all transactions
          const results = await db
            .insert(transactions)
            .values(items.map(item => ({
              userId,
              type: item.transactionType,
              amount: item.amount,
              category: item.category,
              memo: item.memo || null,
              date: item.date,
            })))
            .returning();

          // Generate message
          const message = items.length === 1
            ? messages.generateCreateMessage(results[0])
            : messages.generateCreateMultipleMessage(results);

          const metadata = buildMetadata('create', {
            action: {
              count: results.length,
              ids: results.map(t => t.id),
              totalAmount: results.reduce((sum, t) => sum + t.amount, 0),
            },
          });

          aiMessage = await db.insert(chatMessages).values({
            userId,
            sessionId,
            role: 'assistant',
            content: message,
            metadata: JSON.stringify(metadata),
          }).returning().get();

          break;
        }

        case 'update': {
          const payload = validateUpdatePayload(action.payload);

          // Determine if single or multiple updates
          const updates = payload.updates || [{
            id: payload.id!,
            transactionType: payload.transactionType,
            amount: payload.amount,
            category: payload.category,
            memo: payload.memo,
            date: payload.date,
          }];

          // Verify ownership for all updates
          const updateIds = updates.map(u => u.id);
          const existing = await db
            .select()
            .from(transactions)
            .where(and(
              inArray(transactions.id, updateIds),
              eq(transactions.userId, userId)
            ));

          if (existing.length !== updateIds.length) {
            return c.json(
              { success: false, error: 'Some transactions not found or unauthorized' },
              404
            );
          }

          // Build previousState map from existing rows (for undo support)
          const previousStateMap = new Map(
            existing.map(tx => [tx.id, JSON.stringify({
              type: tx.type,
              amount: tx.amount,
              category: tx.category,
              memo: tx.memo,
              date: tx.date,
            })])
          );

          // Validate and apply all updates
          const results: any[] = [];
          for (const update of updates) {
            // Validate new values if provided
            if (update.amount) validateAmount(update.amount);
            if (update.date) validateDate(update.date);
            if (update.category) validateCategory(update.category, userCategories);

            const updateValues: any = {
              previousState: previousStateMap.get(update.id) ?? null,  // Store pre-update snapshot
            };
            if (update.transactionType) updateValues.type = update.transactionType;
            if (update.amount) updateValues.amount = update.amount;
            if (update.category) updateValues.category = update.category;
            if (update.memo !== undefined) updateValues.memo = update.memo || null;
            if (update.date) updateValues.date = update.date;

            const result = await db
              .update(transactions)
              .set(updateValues)
              .where(eq(transactions.id, update.id))
              .returning();

            results.push(result[0]);
          }

          // Generate message
          const message = updates.length === 1
            ? messages.generateUpdateMessage(results[0])
            : messages.generateUpdateMultipleMessage(results);

          const metadata = buildMetadata('update', {
            action: {
              count: results.length,
              ids: results.map(t => t.id),
              totalAmount: results.reduce((sum, t) => sum + t.amount, 0),
            },
          });

          aiMessage = await db.insert(chatMessages).values({
            userId,
            sessionId,
            role: 'assistant',
            content: message,
            metadata: JSON.stringify(metadata),
          }).returning().get();

          break;
        }

        case 'read': {
          const payload = validateReadPayload(action.payload);
          const month = payload.month || new Date().toISOString().slice(0, 7);

          const conditions: any[] = [
            eq(transactions.userId, userId),
            isNull(transactions.deletedAt),
            sql`${transactions.date} LIKE ${month + '%'}`
          ];

          // Add category filter if provided
          if (payload.category) {
            conditions.push(eq(transactions.category, payload.category));
          }

          // Add type filter if provided
          if (payload.type) {
            conditions.push(eq(transactions.type, payload.type));
          }

          // Filter out soft-deleted transactions
          conditions.push(isNull(transactions.deletedAt));

          const results = await db
            .select()
            .from(transactions)
            .where(and(...conditions))
            .orderBy(desc(transactions.date));

          const totalAmount = results.reduce((sum, t) => sum + t.amount, 0);
          const message = messages.generateReadMessage(results, totalAmount, payload);
          const metadata = buildMetadata('read', {
            action: {
              month,
              category: payload.category || null,
              type: payload.type || null,
              count: results.length,
            },
          });

          aiMessage = await db.insert(chatMessages).values({
            userId,
            sessionId,
            role: 'assistant',
            content: message,
            metadata: JSON.stringify(metadata),
          }).returning().get();

          break;
        }

        case 'delete': {
          const payload = validateDeletePayload(action.payload);
          const ids = payload.items || (payload.id ? [payload.id] : []);

          if (!ids.length) {
            throw new Error('Transaction ID(s) required for delete');
          }

          // Verify ownership for all transactions (excluding soft-deleted ones)
          const existing = await db
            .select()
            .from(transactions)
            .where(and(
              inArray(transactions.id, ids),
              eq(transactions.userId, userId),
              isNull(transactions.deletedAt)
            ));

          if (!existing.length) {
            return c.json(
              { success: false, error: 'No transactions found' },
              404
            );
          }

          // Soft delete all matching transactions
          await db
            .update(transactions)
            .set({ deletedAt: new Date().toISOString() })
            .where(and(
              inArray(transactions.id, ids),
              eq(transactions.userId, userId)
            ));

          const message = existing.length === 1
            ? messages.generateDeleteMessage(existing[0])
            : messages.generateDeleteMultipleMessage(existing);

          const metadata = buildMetadata('delete', {
            action: {
              ids: existing.map(t => t.id),
              count: existing.length,
              totalAmount: existing.reduce((sum, t) => sum + t.amount, 0),
            },
          });

          aiMessage = await db.insert(chatMessages).values({
            userId,
            sessionId,
            role: 'assistant',
            content: message,
            metadata: JSON.stringify(metadata),
          }).returning().get();

          break;
        }

        case 'report': {
          // Validate report payload
          const reportPayload = validateReportPayload(action.payload);

          // Initialize report service
          const reportService = new AIReportService(getLLMConfig(c.env), c.env.AI);

          // Generate report
          const report = await reportService.generateReport(db, userId, reportPayload);

          // Save report to database
          const savedReport = await db.insert(reports).values({
            userId,
            reportType: report.reportType,
            title: report.title,
            subtitle: report.subtitle,
            reportData: JSON.stringify(report.sections),
            params: JSON.stringify(reportPayload.params || {}),
          }).returning().get();

          // Format as chat message
          const { content: reportContent, metadata: reportMetadata } = messages.generateReportMessage(report);
          const responseMetadata = {
            ...reportMetadata,
            report: {
              ...report,
              id: savedReport.id, // Include report ID for navigation
              params: reportPayload.params || {},
            },
          };

          aiMessage = await db.insert(chatMessages).values({
            userId,
            sessionId,
            role: 'assistant',
            content: reportContent,
            metadata: JSON.stringify(responseMetadata),
          }).returning().get();

          break;
        }

        case 'clarify': {
          // Type guard for clarify payload
          const payload = action.payload as any;

          // Save clarification state
          const clarId = await clarificationService.saveClarification(db, userId, sessionId, {
            missingFields: payload.missingFields,
            partialData: payload.partialData,
            messageId: '',
          });

          aiMessage = await db.insert(chatMessages).values({
            userId,
            sessionId,
            role: 'assistant',
            content: payload.message,
            metadata: JSON.stringify({
              actionType: 'clarify',
              clarificationId: clarId,
              missingFields: payload.missingFields,
            }),
          }).returning().get();

          break;
        }

        case 'undo': {
          const payload = validateUndoPayload(action.payload);

          // Find the most recent assistant message with matching actionType in this session
          const recentMessages = await db
            .select()
            .from(chatMessages)
            .where(and(
              eq(chatMessages.sessionId, sessionId),
              eq(chatMessages.role, 'assistant'),
            ))
            .orderBy(desc(chatMessages.createdAt))
            .limit(20);

          // Find the most recent message with targetActionType
          let targetMessage: any = null;
          for (const msg of recentMessages) {
            if (!msg.metadata) continue;
            const meta = JSON.parse(msg.metadata);
            if (meta.actionType === payload.targetActionType) {
              targetMessage = msg;
              break;
            }
          }

          if (!targetMessage) {
            // No matching prior action found
            const notFoundMsg = payload.targetActionType === 'delete'
              ? '최근에 삭제된 거래를 찾을 수 없습니다'
              : payload.targetActionType === 'create'
              ? '최근에 추가된 거래를 찾을 수 없습니다'
              : '최근에 수정된 거래를 찾을 수 없습니다';

            aiMessage = await db.insert(chatMessages).values({
              userId,
              sessionId,
              role: 'assistant',
              content: notFoundMsg,
              metadata: JSON.stringify({ actionType: 'plain_text' }),
            }).returning().get();
            break;
          }

          const targetMeta = JSON.parse(targetMessage.metadata);
          const ids: number[] = targetMeta.action?.ids ?? [];

          if (!ids.length) {
            throw new Error('Could not determine which transactions to undo');
          }

          // UNDO DELETE: Restore soft-deleted rows
          if (payload.targetActionType === 'delete') {
            const restored = await db
              .update(transactions)
              .set({ deletedAt: null })
              .where(and(
                inArray(transactions.id, ids),
                eq(transactions.userId, userId)
              ))
              .returning();

            const msg = restored.length === 1
              ? messages.generateUndoMessage(restored[0])
              : messages.generateUndoDeleteMultipleMessage(restored);

            const metadata = buildMetadata('undo', {
              action: { targetActionType: 'delete', ids, count: restored.length },
            });

            aiMessage = await db.insert(chatMessages).values({
              userId, sessionId, role: 'assistant',
              content: msg,
              metadata: JSON.stringify(metadata),
            }).returning().get();
            break;
          }

          // UNDO CREATE: Hard delete rows
          if (payload.targetActionType === 'create') {
            // Fetch before deleting to build message
            const toDelete = await db
              .select()
              .from(transactions)
              .where(and(
                inArray(transactions.id, ids),
                eq(transactions.userId, userId),
                isNull(transactions.deletedAt)  // Only delete non-deleted transactions
              ));

            const totalAmount = toDelete.reduce((sum, t) => sum + t.amount, 0);

            if (toDelete.length > 0) {
              await db
                .delete(transactions)
                .where(and(
                  inArray(transactions.id, ids),
                  eq(transactions.userId, userId)
                ));
            }

            const msg = messages.generateUndoCreateMessage(toDelete.length, totalAmount);
            const metadata = buildMetadata('undo', {
              action: { targetActionType: 'create', ids, count: toDelete.length },
            });

            aiMessage = await db.insert(chatMessages).values({
              userId, sessionId, role: 'assistant',
              content: msg,
              metadata: JSON.stringify(metadata),
            }).returning().get();
            break;
          }

          // UNDO UPDATE: Restore previousState
          if (payload.targetActionType === 'update') {
            // Fetch transactions with their previousState
            const toRestore = await db
              .select()
              .from(transactions)
              .where(and(
                inArray(transactions.id, ids),
                eq(transactions.userId, userId),
                isNull(transactions.deletedAt)
              ));

            if (!toRestore.length) {
              throw new Error('Transactions to restore not found');
            }

            const restoredResults: any[] = [];
            for (const tx of toRestore) {
              if (!tx.previousState) {
                // No snapshot means this tx was never updated — skip
                continue;
              }
              const snap: TransactionSnapshot = JSON.parse(tx.previousState);
              const result = await db
                .update(transactions)
                .set({
                  type: snap.type,
                  amount: snap.amount,
                  category: snap.category,
                  memo: snap.memo,
                  date: snap.date,
                  previousState: null,  // Clear after restoring (prevent undo-of-undo)
                })
                .where(eq(transactions.id, tx.id))
                .returning();
              restoredResults.push(result[0]);
            }

            if (!restoredResults.length) {
              const noSnapMsg = '되돌릴 수 있는 이전 상태가 없습니다 (이미 복원되었거나 처음 입력된 거래입니다)';
              aiMessage = await db.insert(chatMessages).values({
                userId, sessionId, role: 'assistant',
                content: noSnapMsg,
                metadata: JSON.stringify({ actionType: 'plain_text' }),
              }).returning().get();
              break;
            }

            const msg = messages.generateUndoUpdateMessage(restoredResults);
            const metadata = buildMetadata('undo', {
              action: { targetActionType: 'update', ids, count: restoredResults.length },
            });

            aiMessage = await db.insert(chatMessages).values({
              userId, sessionId, role: 'assistant',
              content: msg,
              metadata: JSON.stringify(metadata),
            }).returning().get();
            break;
          }

          break;  // unreachable but satisfies TypeScript
        }

        default:
          return c.json(
            { success: false, error: 'Unknown action type' },
            400
          );
      }
    } catch (error) {
      const errorName = error instanceof Error ? error.name : typeof error;
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (error instanceof Error && (error.name === 'ZodError' || /^Text input|^Transaction ID|^Amount must|^Amount exceeds|^Invalid date|^Date cannot|^Category cannot/.test(error.message))) {
        console.error(`[Session action] Validation error (${errorName}):`, errorMsg);
        return c.json({ success: false, error: 'Invalid request data' }, 400);
      }

      if (error instanceof Error && /timeout|network|fetch|LLM|model/i.test(error.message)) {
        console.error(`[Session action] LLM/network error (${errorName}):`, errorMsg);
        return c.json({ success: false, error: 'AI service temporarily unavailable, please try again' }, 503);
      }

      console.error(`[Session action] DB/internal error (${errorName}):`, errorMsg);
      return c.json({ success: false, error: 'An unexpected error occurred' }, 500);
    }

    // Return both user and AI messages
    return c.json(
      {
        success: true,
        messages: [
          {
            id: userMessage.id,
            sessionId: userMessage.sessionId,
            userId: userMessage.userId,
            role: userMessage.role,
            content: userMessage.content,
            metadata: userMessage.metadata ? JSON.parse(userMessage.metadata) : null,
            createdAt: userMessage.createdAt,
          },
          ...(aiMessage ? [{
            id: aiMessage.id,
            sessionId: aiMessage.sessionId,
            userId: aiMessage.userId,
            role: aiMessage.role,
            content: aiMessage.content,
            metadata: aiMessage.metadata ? JSON.parse(aiMessage.metadata) : null,
            createdAt: aiMessage.createdAt,
          }] : []),
        ],
        type: action.type,
      },
      200
    );
  } catch (error) {
    const errorName = error instanceof Error ? error.name : typeof error;
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (error instanceof Error && /timeout|network|fetch|LLM|model/i.test(error.message)) {
      console.error(`[Session message] LLM/network error (${errorName}):`, errorMsg);
      return c.json({ success: false, error: 'AI service temporarily unavailable, please try again' }, 503);
    }

    if (error instanceof Error && /SQLITE|database|constraint|foreign key/i.test(error.message)) {
      console.error(`[Session message] DB error (${errorName}):`, errorMsg);
      return c.json({ success: false, error: 'An unexpected error occurred' }, 500);
    }

    console.error(`[Session message] Unhandled error (${errorName}):`, errorMsg);
    return c.json({ success: false, error: 'Failed to send message' }, 500);
  }
});

export default router;
