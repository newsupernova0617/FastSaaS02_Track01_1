import { Hono } from 'hono';
import { getDb, Env } from '../db/index';
import type { Variables } from '../middleware/auth';
import { chatMessages, transactions } from '../db/schema';
import { eq, desc, isNull, and, inArray, sql } from 'drizzle-orm';
import { AIService } from '../services/ai';
import { getLLMConfig, callLLM } from '../services/llm';
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

// POST /api/sessions - Create new session
router.post('/', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');
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

// GET /api/sessions/:sessionId/messages - Get messages for a session
router.get('/:sessionId/messages', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const sessionId = parseInt(c.req.param('sessionId'), 10);

    if (isNaN(sessionId)) {
      return c.json(
        { success: false, error: 'Invalid session ID' },
        400
      );
    }

    // Verify session ownership
    const session = await getSession(db, sessionId, userId);
    if (!session) {
      return c.json(
        { success: false, error: 'Session not found' },
        404
      );
    }

    // Get messages for this session from chatMessages table
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

// POST /api/sessions/:sessionId/messages - Send message in session with full AI processing
router.post('/:sessionId/messages', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');
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

    // Verify session ownership
    const session = await getSession(db, sessionId, userId);
    if (!session) {
      return c.json(
        { success: false, error: 'Session not found' },
        404
      );
    }

    // Save user message to session
    const userMessage = await db
      .insert(chatMessages)
      .values({
        userId,
        sessionId,
        role: 'user',
        content,
      })
      .returning()
      .get();

    // Initialize AI service and context service
    const aiService = new AIService(getLLMConfig(c.env), c.env.AI);
    const contextService = new ContextService(c.env.VECTORIZE);

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

          // Validate and apply all updates
          const results: any[] = [];
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

          // Format as chat message
          const { content: reportContent, metadata: reportMetadata } = messages.generateReportMessage(report);
          const responseMetadata = {
            ...reportMetadata,
            report: {
              ...report,
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

        default:
          return c.json(
            { success: false, error: 'Unknown action type' },
            400
          );
      }
    } catch (error) {
      console.error('AI action execution error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process request';
      const status = 400;
      return c.json(
        { success: false, error: errorMessage },
        status
      );
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
    console.error('Error sending session message:', error);
    return c.json(
      { success: false, error: 'Failed to send message' },
      500
    );
  }
});

export default router;
