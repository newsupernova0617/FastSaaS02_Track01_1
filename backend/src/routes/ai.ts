// ============================================================
// [DB 조작 + 인증 + 보안] 레거시 AI API 라우트
//
// ⚠️ 이 파일은 이전 버전의 AI 엔드포인트입니다.
// 새로운 코드는 sessions.ts의 POST /:sessionId/messages를 사용합니다.
// 하위 호환성을 위해 유지되고 있습니다.
//
// 보안 핵심 규칙:
//   1. userId = c.get('userId') — JWT에서 추출
//   2. 세션 소유권 검증: getSession(db, sessionId, userId) → null이면 403
//   3. 모든 DB 쿼리에 eq(transactions.userId, userId) 포함
//   4. AI 요청 속도 제한: 1분에 20번
// ============================================================

import { Hono } from 'hono';
import { ZodError } from 'zod';
import { getDb, Env } from '../db/index';
import { transactions, chatMessages, reports } from '../db/schema';
import type { Variables } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import type { Transaction } from '../db/schema';
import { AIService } from '../services/ai';
import { getLLMConfig } from '../services/llm';
import { ContextService } from '../services/context';
import {
  validateCreatePayload,
  validateUpdatePayload,
  validateReadPayload,
  validateDeletePayload,
  validateReportPayload,
  validateAmount,
  validateDate,
  validateCategory,
} from '../services/validation';
import * as messages from '../services/messages';
import { saveMessage, getChatHistory, clearChatHistory, saveMessageToSession } from '../services/chat';
import { AIReportService } from '../services/ai-report';
import { getSession } from '../services/sessions';
import type { ActionType } from '../types/ai';
import { and, eq, isNull, desc, inArray, sql } from 'drizzle-orm';
import { clarificationService } from '../services/clarifications';

const PLAIN_TEXT_FALLBACK = `Hey! 👋 I'm here to help with your expense management.

Try asking me things like:
• "지출 5000원 커피로 추가" (Add expenses)
• "지난달 식비" (View spending)
• "이번달 분석해줘" (Generate report)

What would you like to do?`;

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// [보안] AI 요청 속도 제한: 사용자당 1분에 최대 20번
// AI 호출은 외부 LLM API를 사용하므로 비용이 높음 → 남용 방지 필수
const aiActionRateLimit = createRateLimiter(20, 60_000);

function isAIServiceError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AIServiceError';
}

function isClientError(error: unknown): boolean {
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return [
    /^Text input is required$/,
    /^Transaction ID is required/,
    /^Amount must /,
    /^Amount exceeds /,
    /^Invalid date format/,
    /^Date cannot /,
    /^Category cannot /,
  ].some((pattern) => pattern.test(error.message));
}

function buildMetadata(
  actionType: ActionType,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    actionType,
    ...extra,
  };
}

/**
 * Generate clarification question based on missing fields
 */
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

// POST /api/ai/action — AI에게 텍스트를 보내고 액션을 실행
// [보안 흐름]
//   1. 속도 제한 (aiActionRateLimit)
//   2. userId를 JWT에서 추출 (body에서 읽지 않음!)
//   3. sessionId의 소유권 검증 (getSession)
//   4. AI 분석 → 거래 CRUD 또는 리포트 생성
router.post('/action', aiActionRateLimit, async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');  // [보안] JWT에서 추출 — 절대 body에서 읽지 않음
    const { text, sessionId } = await c.req.json();

    if (!text || typeof text !== 'string') {
      return c.json(
        { success: false, error: 'Text input is required' },
        400
      );
    }

    if (!sessionId || typeof sessionId !== 'number') {
      return c.json(
        { success: false, error: 'Session ID is required' },
        400
      );
    }

    // [보안] 세션 소유권 검증 — 이 세션이 현재 사용자의 것인지 확인
    // 검증 없이 메시지를 저장하면 다른 사용자의 세션에 데이터를 쓸 수 있는 취약점 발생
    const session = await getSession(db, sessionId, userId);
    if (!session) {
      return c.json(
        { success: false, error: 'Session not found or access denied' },
        403  // 소유권 없음 → 접근 거부
      );
    }

    // Save user message to session
    await saveMessageToSession(db, userId, sessionId, 'user', text);

    const aiService = new AIService(getLLMConfig(c.env), c.env.AI);

    // Initialize context service for RAG enhancement
    const contextService = new ContextService(c.env.VECTORIZE);

    // Fetch user context
    const recentTransactions = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.date))
      .limit(10);

    const categoryRows = await db
      .selectDistinct({ category: transactions.category })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)));

    const userCategories = categoryRows.map((r: { category: string }) => r.category);

    // Check for active clarification and merge response if exists
    let processedUserText = text;
    const activeClarification = await clarificationService.getClarification(db, userId, sessionId);

    if (activeClarification) {
      // User is replying to a clarification question
      const { mergedData, stillMissingFields } = await clarificationService.mergeClarificationResponse(
        text,
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
        }).returning();

        return c.json({
          success: true,
          message: aiMessage[0],
          type: 'clarify',
          content: nextQuestion,
          metadata: { actionType: 'clarify', clarificationId: newClarId },
        });
      }

      // All fields provided, clear clarification and continue with normal processing
      await clarificationService.deleteClarification(db, userId, sessionId);
    }

    // Parse user input with AI and context enrichment
    const action = await aiService.parseUserInput(
      text,
      recentTransactions,
      userCategories,
      userId,
      contextService,
      db
    );

    // Check if AI detected a plain text query (non-financial)
    if (action.type === 'plain_text') {
      const messageToSave = PLAIN_TEXT_FALLBACK;
      await saveMessageToSession(db, userId, sessionId, 'assistant', messageToSave, { actionType: 'plain_text' });
      return c.json(
        {
          success: true,
          type: 'plain_text',
          message: messageToSave,
        },
        200
      );
    }

    // Execute action based on type
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
        await saveMessageToSession(db, userId, sessionId, 'assistant', message, metadata);

        return c.json({
          success: true,
          type: 'create',
          result: items.length === 1 ? results[0] : results,
          message,
          content: message,
          metadata,
        });
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

        // Validate and apply all updates
        const results: Transaction[] = [];
        for (const update of updates) {
          // Validate new values if provided
          if (update.amount) validateAmount(update.amount);
          if (update.date) validateDate(update.date);
          if (update.category) validateCategory(update.category, userCategories);

          const updateValues: any = {};
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
        await saveMessageToSession(db, userId, sessionId, 'assistant', message, metadata);

        return c.json({
          success: true,
          type: 'update',
          result: updates.length === 1 ? results[0] : results,
          message,
          content: message,
          metadata,
        });
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
        await saveMessageToSession(db, userId, sessionId, 'assistant', message, metadata);

        return c.json({
          success: true,
          type: 'read',
          result: results,
          message,
          content: message,
          metadata,
        });
      }

      case 'delete': {
        const payload = validateDeletePayload(action.payload);
        const ids = payload.items || (payload.id ? [payload.id] : []);

        if (!ids.length) {
          throw new Error('Transaction ID(s) required for delete');
        }

        // Verify ownership for all transactions
        const existing = await db
          .select()
          .from(transactions)
          .where(and(
            inArray(transactions.id, ids),
            eq(transactions.userId, userId)
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
        await saveMessageToSession(db, userId, sessionId, 'assistant', message, metadata);

        return c.json({
          success: true,
          type: 'delete',
          result: { ids: existing.map(t => t.id), count: existing.length },
          message,
          content: message,
          metadata,
        });
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
        const { content, metadata } = messages.generateReportMessage(report);
        const responseMetadata = {
          ...metadata,
          report: {
            ...report,
            id: savedReport.id, // Include report ID for navigation
            params: reportPayload.params || {},
          },
        };

        // Save assistant message to database
        await saveMessageToSession(db, userId, sessionId, 'assistant', content, responseMetadata);

        return c.json({
          success: true,
          type: 'report',
          message: content,
          content,
          metadata: responseMetadata,
        });
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

        // Add AI's clarification message to chat
        const aiMessage = await db.insert(chatMessages).values({
          userId,
          sessionId,
          role: 'assistant',
          content: payload.message,
          metadata: JSON.stringify({
            actionType: 'clarify',
            clarificationId: clarId,
            missingFields: payload.missingFields,
          }),
        }).returning();

        return c.json({
          success: true,
          type: 'clarify',
          message: payload.message,
          content: payload.message,
          metadata: {
            actionType: 'clarify',
            clarificationId: clarId,
            missingFields: payload.missingFields,
          },
        });
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

    if (isClientError(error)) {
      console.error(`[AI action] Validation error (${errorName}):`, errorMsg);
      return c.json({ success: false, error: 'Invalid request data' }, 400);
    }

    if (isAIServiceError(error) || (error instanceof Error && /timeout|network|fetch|LLM|model/i.test(error.message))) {
      console.error(`[AI action] LLM/network error (${errorName}):`, errorMsg);
      return c.json({ success: false, error: 'AI service temporarily unavailable, please try again' }, 503);
    }

    // Database or unknown errors
    console.error(`[AI action] Internal error (${errorName}):`, errorMsg);
    return c.json({ success: false, error: 'An unexpected error occurred' }, 500);
  }
});

// Get chat history with pagination
router.get('/chat/history', async (c) => {
  const userId = c.get('userId');
  const db = getDb(c.env);

  // Parse query parameters
  const limitStr = c.req.query('limit') || '50';
  const limit = Math.min(Math.max(parseInt(limitStr) || 50, 1), 200);
  const beforeStr = c.req.query('before');
  const parsedBefore = beforeStr ? parseInt(beforeStr) : NaN;
  const beforeId = !isNaN(parsedBefore) ? parsedBefore : undefined;

  try {
    const history = await getChatHistory(db, userId, limit, beforeId);
    return c.json({ success: true, messages: history });
  } catch (err) {
    console.error('[Chat History] Error:', err);
    return c.json({ success: false, error: 'Failed to fetch chat history' }, 500);
  }
});

// Clear chat history
router.delete('/chat/history', async (c) => {
  const userId = c.get('userId');
  const db = getDb(c.env);

  try {
    const deletedCount = await clearChatHistory(db, userId);
    return c.json({ success: true, deletedCount });
  } catch (err) {
    console.error('[Clear Chat History] Error:', err);
    return c.json({ success: false, error: 'Failed to clear chat history' }, 500);
  }
});

export default router;
