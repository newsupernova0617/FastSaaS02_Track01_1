import { Hono } from 'hono';
import { ZodError } from 'zod';
import { getDb, Env } from '../db/index';
import { transactions } from '../db/schema';
import type { Variables } from '../middleware/auth';
import { AIService } from '../services/ai';
<<<<<<< HEAD
import { getLLMConfig } from '../services/llm';
=======
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
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
import { saveMessage, getChatHistory, clearChatHistory } from '../services/chat';
import { AIReportService } from '../services/ai-report';
import type { ActionType } from '../types/ai';
import { and, eq, isNull, desc, sql } from 'drizzle-orm';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

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

async function saveAssistantReply(
  db: any,
  userId: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await saveMessage(db, userId, 'assistant', message, metadata);
}

// POST /api/ai/action
router.post('/action', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');
<<<<<<< HEAD
    const { text } = await c.req.json();
=======

    let requestBody: any;
    try {
      requestBody = await c.req.json();
      console.log('[AI Route] Request body:', requestBody);
    } catch (parseError) {
      console.error('[AI Route] JSON parse error:', parseError);
      return c.json(
        { success: false, error: 'Invalid JSON request' },
        400
      );
    }

    const { text } = requestBody;
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a

    if (!text || typeof text !== 'string') {
      return c.json(
        { success: false, error: 'Text input is required' },
        400
      );
    }

    // Save user message to chat history
    await saveMessage(db, userId, 'user', text);

<<<<<<< HEAD
    const aiService = new AIService(getLLMConfig(c.env), c.env.AI);
=======
    // Debug: Check environment variables
    console.log('[AI Route] Environment check:', {
      hasGROQ_API_KEY: !!c.env.GROQ_API_KEY,
      GROQ_API_KEY_length: c.env.GROQ_API_KEY?.length || 0,
      GROQ_API_KEY_prefix: c.env.GROQ_API_KEY ? c.env.GROQ_API_KEY.substring(0, 10) : 'UNDEFINED',
      GROQ_API_KEY_suffix: c.env.GROQ_API_KEY ? c.env.GROQ_API_KEY.substring(c.env.GROQ_API_KEY.length - 10) : 'UNDEFINED',
      GROQ_MODEL_NAME: c.env.GROQ_MODEL_NAME,
      hasGROQ_MODEL_NAME: !!c.env.GROQ_MODEL_NAME,
    });

    if (!c.env.GROQ_API_KEY) {
      console.error('[AI Route] GROQ_API_KEY is not set!');
      return c.json(
        { success: false, error: 'AI service is not configured' },
        500
      );
    }

    const aiService = new AIService(c.env.GROQ_API_KEY, c.env.GROQ_MODEL_NAME);
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a

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

    // Parse user input with AI
    const action = await aiService.parseUserInput(text, recentTransactions, userCategories);

    // Execute action based on type
    switch (action.type) {
      case 'create': {
        const payload = validateCreatePayload(action.payload);
        validateAmount(payload.amount);
        validateDate(payload.date);
        validateCategory(payload.category, userCategories);

        const result = await db
          .insert(transactions)
          .values({
            userId,
            type: payload.transactionType,
            amount: payload.amount,
            category: payload.category,
            memo: payload.memo || null,
            date: payload.date,
          })
          .returning();

        const tx = result[0];
        const message = messages.generateCreateMessage(tx);
        const metadata = buildMetadata('create', {
          action: {
            id: tx.id,
            date: tx.date,
            category: tx.category,
            amount: tx.amount,
            type: tx.type,
          },
        });
        await saveAssistantReply(db, userId, message, metadata);

        return c.json({
          success: true,
          type: 'create',
          result: tx,
          message,
          content: message,
          metadata,
        });
      }

      case 'update': {
        const payload = validateUpdatePayload(action.payload);
        if (!payload.id) {
          throw new Error('Transaction ID is required for update');
        }

        // Verify ownership
        const existing = await db
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, payload.id), eq(transactions.userId, userId)));

        if (!existing.length) {
          return c.json(
            { success: false, error: 'Transaction not found' },
            404
          );
        }

        // Validate new values if provided
        if (payload.amount) validateAmount(payload.amount);
        if (payload.date) validateDate(payload.date);
        if (payload.category) validateCategory(payload.category, userCategories);

        const updateValues: any = {};
        if (payload.transactionType) updateValues.type = payload.transactionType;
        if (payload.amount) updateValues.amount = payload.amount;
        if (payload.category) updateValues.category = payload.category;
        if (payload.memo !== undefined) updateValues.memo = payload.memo || null;
        if (payload.date) updateValues.date = payload.date;

        const result = await db
          .update(transactions)
          .set(updateValues)
          .where(eq(transactions.id, payload.id))
          .returning();

        const tx = result[0];
        const message = messages.generateUpdateMessage(tx);
        const metadata = buildMetadata('update', {
          action: {
            id: tx.id,
            date: tx.date,
            category: tx.category,
            amount: tx.amount,
            type: tx.type,
          },
        });
        await saveAssistantReply(db, userId, message, metadata);

        return c.json({
          success: true,
          type: 'update',
          result: tx,
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
          sql`${transactions.date} LIKE ${month}%`
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
        await saveAssistantReply(db, userId, message, metadata);

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
        if (!payload.id) {
          throw new Error('Transaction ID is required for delete');
        }

        // Verify ownership
        const existing = await db
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, payload.id), eq(transactions.userId, userId)));

        if (!existing.length) {
          return c.json(
            { success: false, error: 'Transaction not found' },
            404
          );
        }

        const tx = existing[0];

        // Soft delete
        await db
          .update(transactions)
          .set({ deletedAt: new Date().toISOString() })
          .where(eq(transactions.id, payload.id));

        const message = messages.generateDeleteMessage(tx);
        const metadata = buildMetadata('delete', {
          action: {
            id: tx.id,
            date: tx.date,
            category: tx.category,
            amount: tx.amount,
            type: tx.type,
          },
        });
        await saveAssistantReply(db, userId, message, metadata);

        return c.json({
          success: true,
          type: 'delete',
          result: { id: tx.id },
          message,
          content: message,
          metadata,
        });
      }

      case 'report': {
        // Validate report payload
        const reportPayload = validateReportPayload(action.payload);

        // Initialize report service
<<<<<<< HEAD
        const reportService = new AIReportService(getLLMConfig(c.env), c.env.AI);
=======
        const reportService = new AIReportService(c.env.GROQ_API_KEY, c.env.GROQ_MODEL_NAME);
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a

        // Generate report
        const report = await reportService.generateReport(db, userId, reportPayload);

        // Format as chat message
        const { content, metadata } = messages.generateReportMessage(report);
        const responseMetadata = {
          ...metadata,
          report: {
            ...report,
            params: reportPayload.params || {},
          },
        };

        // Save assistant message to database
        await saveAssistantReply(db, userId, content, responseMetadata);

        return c.json({
          success: true,
          type: 'report',
          message: content,
          content,
          metadata: responseMetadata,
        });
      }

      default:
        return c.json(
          { success: false, error: 'Unknown action type' },
          400
        );
    }
  } catch (error) {
<<<<<<< HEAD
=======
    // Check if it's a ZodError
    if (error instanceof ZodError) {
      console.error('[AI Route] ZodError detected:', error.errors);
      return c.json(
        { success: false, error: 'Validation error', details: error.errors },
        400
      );
    }

>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
    console.error('AI action error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process request';
    const status = isAIServiceError(error) ? 502 : isClientError(error) ? 400 : 500;
    return c.json(
      { success: false, error: message },
      status
    );
  }
});

// Get chat history with pagination
router.get('/chat/history', async (c) => {
  const userId = c.get('userId');
  const db = getDb(c.env);

  // Parse query parameters
  const limitStr = c.req.query('limit') || '50';
  const limit = parseInt(limitStr);
  const beforeStr = c.req.query('before');
  const beforeId = beforeStr ? parseInt(beforeStr) : undefined;

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

<<<<<<< HEAD
export default router;
=======
export default router;
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
