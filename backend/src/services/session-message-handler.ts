import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { chatMessages, reports, transactions, type TransactionSnapshot } from '../db/schema';
import { createAIService } from './ai';
import { loadUserAiContext } from './ai-context';
import { AIReportService } from './ai-report';
import { clarificationService } from './clarifications';
import { contextService as getContextService } from './context';
import { getLLMConfig } from './llm';
import * as messages from './messages';
import { buildSearchSummary } from './search-summary';
import { getSession } from './sessions';
import {
  validateAmount,
  validateCategory,
  validateCreatePayload,
  validateDate,
  validateDeletePayload,
  validateReadPayload,
  validateReportPayload,
  validateUndoPayload,
  validateUpdatePayload,
} from './validation';
import { vectorizeService as getVectorizeService } from './vectorize';
import { getDbClient, type Env } from '../db/index';
import type { TransactionAction } from '../types/ai';

type ProcessSessionMessageParams = {
  db: any;
  env: Env;
  userId: string;
  sessionId: number;
  content: string;
};

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
    category: '어떤 카테고리인가요? (식비, 교통, 쇼핑, 의료, 문화여가, 월세, 월급, 부업, 용돈, 기타)',
    transactionType: '지출인가요, 수입인가요?',
    date: '어느 날짜인가요?',
  };

  if (missingFields.length === 1) {
    return questions[missingFields[0]] || `${missingFields[0]}를(을) 알려주세요.`;
  }

  return `다음 정보를 알려주세요: ${missingFields.map((f) => questions[f] || f).join(', ')}`;
}

function serializeMessage(message: any) {
  return {
    id: message.id,
    sessionId: message.sessionId,
    userId: message.userId,
    role: message.role,
    content: message.content,
    metadata: message.metadata ? JSON.parse(message.metadata) : null,
    createdAt: message.createdAt,
  };
}

export async function processSessionMessage({
  db,
  env,
  userId,
  sessionId,
  content,
}: ProcessSessionMessageParams): Promise<{ status: number; body: Record<string, unknown> }> {
  try {
    if (isNaN(sessionId)) {
      return {
        status: 400,
        body: { success: false, error: 'Invalid session ID' },
      };
    }

    if (!content || typeof content !== 'string') {
      return {
        status: 400,
        body: { success: false, error: 'Content is required' },
      };
    }

    const session = await getSession(db, sessionId, userId);
    if (!session) {
      return {
        status: 404,
        body: { success: false, error: 'Session not found' },
      };
    }

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

    const aiService = createAIService(getLLMConfig(env));
    const vectorizeService = getVectorizeService(env, getDbClient(env));
    const contextService = getContextService(vectorizeService);
    const { recentTransactions, userCategories } = await loadUserAiContext(db, userId);
    const activeClarification = await clarificationService.getClarification(db, userId, sessionId);
    let action: TransactionAction | null = null;

    if (activeClarification) {
      const { mergedData, stillMissingFields } = await clarificationService.mergeClarificationResponse(
        content,
        activeClarification
      );

      if (stillMissingFields.length > 0) {
        const nextQuestion = generateClarificationQuestion(mergedData, stillMissingFields);
        const updatedState = {
          ...activeClarification,
          missingFields: stillMissingFields,
          partialData: mergedData,
        };
        await clarificationService.deleteClarification(db, userId, sessionId);
        const newClarId = await clarificationService.saveClarification(db, userId, sessionId, updatedState);

        const aiMessage = await db
          .insert(chatMessages)
          .values({
            userId,
            sessionId,
            role: 'assistant',
            content: nextQuestion,
            metadata: JSON.stringify({ actionType: 'clarify', clarificationId: newClarId }),
          })
          .returning()
          .get();

        return {
          status: 200,
          body: {
            success: true,
            messages: [serializeMessage(userMessage), serializeMessage(aiMessage)],
            type: 'clarify',
          },
        };
      }

      await clarificationService.deleteClarification(db, userId, sessionId);

      if (mergedData.transactionType && mergedData.amount && mergedData.category) {
        action = {
          type: 'create',
          payload: {
            transactionType: mergedData.transactionType,
            amount: mergedData.amount,
            category: mergedData.category,
            memo: mergedData.memo,
            date: mergedData.date || new Date().toISOString().slice(0, 10),
          },
          confidence: 0.95,
        };
      }
    }

    if (!action) {
      action = await aiService.parseUserInput(
        content,
        recentTransactions,
        userCategories,
        userId,
        contextService,
        db
      );
    }

    if (action.type === 'plain_text') {
      const aiResponse = `I appreciate the question! I'm primarily designed to help with expense management.
Feel free to ask me about:
• Adding expenses (e.g., "지출 5000원 커피로 추가")
• Viewing spending (e.g., "지난달 식비")
• Generating reports (e.g., "이번달 분석해줘")

How can I help with your finances?`;

      const aiMessage = await db
        .insert(chatMessages)
        .values({
          userId,
          sessionId,
          role: 'assistant',
          content: aiResponse,
          metadata: JSON.stringify({ actionType: 'plain_text' }),
        })
        .returning()
        .get();

      return {
        status: 200,
        body: {
          success: true,
          messages: [serializeMessage(userMessage), serializeMessage(aiMessage)],
          type: 'plain_text',
        },
      };
    }

    let aiMessage: any = null;

    try {
      switch (action.type) {
        case 'create': {
          const payload = validateCreatePayload(action.payload);
          const items = payload.items || [{
            transactionType: payload.transactionType!,
            amount: payload.amount!,
            category: payload.category!,
            memo: payload.memo,
            date: payload.date!,
          }];

          for (const item of items) {
            validateAmount(item.amount);
            validateDate(item.date);
            validateCategory(item.category, userCategories);
          }

          const results = await db
            .insert(transactions)
            .values(items.map((item) => ({
              userId,
              type: item.transactionType,
              amount: item.amount,
              category: item.category,
              memo: item.memo || null,
              date: item.date,
            })))
            .returning();

          const message = items.length === 1
            ? messages.generateCreateMessage(results[0])
            : messages.generateCreateMultipleMessage(results);

          const metadata = buildMetadata('create', {
            action: {
              count: results.length,
              ids: results.map((t: any) => t.id),
              totalAmount: results.reduce((sum: number, t: any) => sum + t.amount, 0),
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
          const updates = payload.updates || [{
            id: payload.id!,
            transactionType: payload.transactionType,
            amount: payload.amount,
            category: payload.category,
            memo: payload.memo,
            date: payload.date,
          }];

          const updateIds = updates.map((u) => u.id);
          const existing = await db
            .select()
            .from(transactions)
            .where(and(
              inArray(transactions.id, updateIds),
              eq(transactions.userId, userId)
            ));

          if (existing.length !== updateIds.length) {
            return {
              status: 404,
              body: { success: false, error: 'Some transactions not found or unauthorized' },
            };
          }

          const previousStateMap = new Map(
            existing.map((tx: any) => [tx.id, JSON.stringify({
              type: tx.type,
              amount: tx.amount,
              category: tx.category,
              memo: tx.memo,
              date: tx.date,
            })])
          );

          const results: any[] = [];
          for (const update of updates) {
            if (update.amount) validateAmount(update.amount);
            if (update.date) validateDate(update.date);
            if (update.category) validateCategory(update.category, userCategories);

            const updateValues: any = {
              previousState: previousStateMap.get(update.id) ?? null,
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

          const message = updates.length === 1
            ? messages.generateUpdateMessage(results[0])
            : messages.generateUpdateMultipleMessage(results);

          const metadata = buildMetadata('update', {
            action: {
              count: results.length,
              ids: results.map((t) => t.id),
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

          if (payload.category) {
            conditions.push(eq(transactions.category, payload.category));
          }
          if (payload.type) {
            conditions.push(eq(transactions.type, payload.type));
          }
          conditions.push(isNull(transactions.deletedAt));

          const results = await db
            .select()
            .from(transactions)
            .where(and(...conditions))
            .orderBy(desc(transactions.date));

          const totalAmount = results.reduce((sum: number, t: any) => sum + t.amount, 0);
          const message = messages.generateReadMessage(results, totalAmount, payload);
          const summary = buildSearchSummary(results, totalAmount, payload);
          const metadata = buildMetadata('read', {
            action: {
              month,
              category: payload.category || null,
              type: payload.type || null,
              count: results.length,
            },
            summary,
            transactions: results,
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

          const existing = await db
            .select()
            .from(transactions)
            .where(and(
              inArray(transactions.id, ids),
              eq(transactions.userId, userId),
              isNull(transactions.deletedAt)
            ));

          if (!existing.length) {
            return {
              status: 404,
              body: { success: false, error: 'No transactions found' },
            };
          }

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
              ids: existing.map((t: any) => t.id),
              count: existing.length,
              totalAmount: existing.reduce((sum: number, t: any) => sum + t.amount, 0),
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
          const reportPayload = validateReportPayload(action.payload);
          const reportService = new AIReportService(getLLMConfig(env));
          const report = await reportService.generateReport(db, userId, reportPayload);
          const savedReport = await db.insert(reports).values({
            userId,
            reportType: report.reportType,
            title: report.title,
            subtitle: report.subtitle,
            reportData: JSON.stringify(report.sections),
            summaryData: JSON.stringify(report.summary),
            params: JSON.stringify(reportPayload.params || {}),
          }).returning().get();

          const { content: reportContent, metadata: reportMetadata } = messages.generateReportMessage(report);
          const responseMetadata = {
            ...reportMetadata,
            report: {
              ...report,
              id: savedReport.id,
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
          const payload = action.payload as any;
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
          const recentMessages = await db
            .select()
            .from(chatMessages)
            .where(and(
              eq(chatMessages.sessionId, sessionId),
              eq(chatMessages.role, 'assistant'),
            ))
            .orderBy(desc(chatMessages.createdAt))
            .limit(20);

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
              userId,
              sessionId,
              role: 'assistant',
              content: msg,
              metadata: JSON.stringify(metadata),
            }).returning().get();
            break;
          }

          if (payload.targetActionType === 'create') {
            const toDelete = await db
              .select()
              .from(transactions)
              .where(and(
                inArray(transactions.id, ids),
                eq(transactions.userId, userId),
                isNull(transactions.deletedAt)
              ));

            const totalAmount = toDelete.reduce((sum: number, t: any) => sum + t.amount, 0);

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
              userId,
              sessionId,
              role: 'assistant',
              content: msg,
              metadata: JSON.stringify(metadata),
            }).returning().get();
            break;
          }

          if (payload.targetActionType === 'update') {
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
              if (!tx.previousState) continue;
              const snap: TransactionSnapshot = JSON.parse(tx.previousState);
              const result = await db
                .update(transactions)
                .set({
                  type: snap.type,
                  amount: snap.amount,
                  category: snap.category,
                  memo: snap.memo,
                  date: snap.date,
                  previousState: null,
                })
                .where(eq(transactions.id, tx.id))
                .returning();
              restoredResults.push(result[0]);
            }

            if (!restoredResults.length) {
              aiMessage = await db.insert(chatMessages).values({
                userId,
                sessionId,
                role: 'assistant',
                content: '되돌릴 수 있는 이전 상태가 없습니다 (이미 복원되었거나 처음 입력된 거래입니다)',
                metadata: JSON.stringify({ actionType: 'plain_text' }),
              }).returning().get();
              break;
            }

            const msg = messages.generateUndoUpdateMessage(restoredResults);
            const metadata = buildMetadata('undo', {
              action: { targetActionType: 'update', ids, count: restoredResults.length },
            });

            aiMessage = await db.insert(chatMessages).values({
              userId,
              sessionId,
              role: 'assistant',
              content: msg,
              metadata: JSON.stringify(metadata),
            }).returning().get();
            break;
          }

          break;
        }

        default:
          return {
            status: 400,
            body: { success: false, error: 'Unknown action type' },
          };
      }
    } catch (error) {
      if (error instanceof Error && (error.name === 'ZodError' || /^Text input|^Transaction ID|^Amount must|^Amount exceeds|^Invalid date|^Date cannot|^Category cannot/.test(error.message))) {
        console.error('[Session action] Validation error:', error.message);
        return {
          status: 400,
          body: { success: false, error: 'Invalid request data' },
        };
      }

      if (error instanceof Error && /timeout|network|fetch|LLM|model/i.test(error.message)) {
        console.error('[Session action] LLM/network error:', error.message);
        return {
          status: 503,
          body: { success: false, error: 'AI service temporarily unavailable, please try again' },
        };
      }

      console.error('[Session action] DB/internal error:', error);
      return {
        status: 500,
        body: { success: false, error: 'An unexpected error occurred' },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        messages: [
          serializeMessage(userMessage),
          ...(aiMessage ? [serializeMessage(aiMessage)] : []),
        ],
        type: action.type,
      },
    };
  } catch (error) {
    if (error instanceof Error && /timeout|network|fetch|LLM|model/i.test(error.message)) {
      console.error('[Session message] LLM/network error:', error.message);
      return {
        status: 503,
        body: { success: false, error: 'AI service temporarily unavailable, please try again' },
      };
    }

    if (error instanceof Error && /SQLITE|database|constraint|foreign key/i.test(error.message)) {
      console.error('[Session message] DB error:', error.message);
      return {
        status: 500,
        body: { success: false, error: 'An unexpected error occurred' },
      };
    }

    console.error('[Session message] Unhandled error:', error);
    return {
      status: 500,
      body: { success: false, error: 'Failed to send message' },
    };
  }
}
