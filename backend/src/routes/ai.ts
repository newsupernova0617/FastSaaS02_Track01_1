import { Hono } from 'hono';
import { getDb, Env } from '../db/index';
import { transactions } from '../db/schema';
import type { Variables } from '../middleware/auth';
import { AIService } from '../services/ai';
import {
  validateAIResponse,
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
import { and, eq, isNull, desc, sql } from 'drizzle-orm';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// Initialize AI service
let aiService: AIService;

// POST /api/ai/action
router.post('/action', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const { text } = await c.req.json();

    if (!text || typeof text !== 'string') {
      return c.json(
        { success: false, error: 'Text input is required' },
        400
      );
    }

    // Save user message to chat history
    await saveMessage(db, userId, 'user', text);

    // Initialize AI service once
    if (!aiService) {
      aiService = new AIService(c.env.GEMINI_API_KEY);
    }

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
        return c.json({
          success: true,
          type: 'create',
          result: tx,
          message: messages.generateCreateMessage(tx),
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
        return c.json({
          success: true,
          type: 'update',
          result: tx,
          message: messages.generateUpdateMessage(tx),
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

        return c.json({
          success: true,
          type: 'read',
          result: results,
          message: messages.generateReadMessage(results, totalAmount, payload),
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

        return c.json({
          success: true,
          type: 'delete',
          result: { id: tx.id },
          message: messages.generateDeleteMessage(tx),
        });
      }

      case 'report': {
        // Validate report payload
        const reportPayload = validateReportPayload(action.payload);

        // Initialize report service
        const reportService = new AIReportService(c.env.GEMINI_API_KEY);

        // Generate report
        const report = await reportService.generateReport(db, userId, reportPayload);

        // Format as chat message
        const { content, metadata } = messages.generateReportMessage(report);

        // Save assistant message to database
        await saveMessage(db, userId, 'assistant', content, metadata);

        return c.json({
          success: true,
          action: 'report',
          content,
          metadata,
        });
      }

      default:
        return c.json(
          { success: false, error: 'Unknown action type' },
          400
        );
    }
  } catch (error) {
    console.error('AI action error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process request';
    return c.json(
      { success: false, error: message },
      400
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

export default router;
