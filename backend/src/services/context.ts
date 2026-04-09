import { knowledgeBase, userNotes, transactions } from '../db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import type { ActionType } from '../types/ai';
import type { ContextData, ContextItem, RetrievalStrategy } from '../types/rag';

export class ContextService {
  constructor(private vectorizeService: any) {}

  /**
   * Main entry point: Get context for an AI action
   */
  async getContextForAction(
    db: any,
    userId: string,
    actionType: ActionType,
    userText: string
  ): Promise<ContextData> {
    // Determine retrieval strategy
    const strategy = this.getRetrievalStrategy(actionType);

    // Retrieve context from each source
    const [knowledge, transactions_context, notes] = await Promise.all([
      this.retrieveKnowledge(db, strategy.knowledgeItems),
      this.retrieveTransactions(db, userId, userText, strategy.transactionItems),
      this.retrieveNotes(db, userId, strategy.noteItems),
    ]);

    // Format for LLM injection
    const formatted = this.formatContextMessage(knowledge, transactions_context, notes);

    return {
      knowledge,
      transactions: transactions_context,
      notes,
      formatted,
    };
  }

  /**
   * Determine retrieval strategy based on action type
   */
  private getRetrievalStrategy(actionType: ActionType): RetrievalStrategy {
    // Different action types benefit from different context distributions
    const strategies: Record<ActionType, RetrievalStrategy> = {
      create: {
        action: 'create',
        knowledgeItems: 3,
        transactionItems: 5,
        noteItems: 2,
        totalItems: 10,
      },
      read: {
        action: 'read',
        knowledgeItems: 2,
        transactionItems: 10,
        noteItems: 2,
        totalItems: 14,
      },
      update: {
        action: 'update',
        knowledgeItems: 2,
        transactionItems: 8,
        noteItems: 2,
        totalItems: 12,
      },
      delete: {
        action: 'delete',
        knowledgeItems: 1,
        transactionItems: 5,
        noteItems: 1,
        totalItems: 7,
      },
      report: {
        action: 'report',
        knowledgeItems: 4,
        transactionItems: 12,
        noteItems: 4,
        totalItems: 20,
      },
      clarify: {
        action: 'clarify',
        knowledgeItems: 1,
        transactionItems: 3,
        noteItems: 1,
        totalItems: 5,
      },
      plain_text: {
        action: 'plain_text',
        knowledgeItems: 2,
        transactionItems: 0,
        noteItems: 0,
        totalItems: 2,
      },
      undo: {
        action: 'undo',
        knowledgeItems: 0,
        transactionItems: 0,
        noteItems: 0,
        totalItems: 0,
      },
    };

    return strategies[actionType] || {
      action: actionType,
      knowledgeItems: 3,
      transactionItems: 5,
      noteItems: 2,
      totalItems: 10,
    };
  }

  /**
   * Retrieve knowledge base items
   */
  private async retrieveKnowledge(db: any, limit: number): Promise<ContextItem[]> {
    const items = await db
      .select()
      .from(knowledgeBase)
      .limit(limit);

    return items.map((item: any) => ({
      type: 'knowledge' as const,
      content: item.content,
      source: item.category || 'general',
      metadata: { id: item.id },
    }));
  }

  /**
   * Retrieve recent transactions for context
   */
  private async retrieveTransactions(
    db: any,
    userId: string,
    userText: string,
    limit: number
  ): Promise<ContextItem[]> {
    const items = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .limit(limit);

    return items.map((item: any) => ({
      type: 'transaction' as const,
      content: `${item.memo || item.category} - $${item.amount} (${item.type})`,
      source: `${item.date}`,
      metadata: {
        id: item.id,
        amount: item.amount,
        category: item.category,
      },
    }));
  }

  /**
   * Retrieve user notes for context
   */
  private async retrieveNotes(db: any, userId: string, limit: number): Promise<ContextItem[]> {
    const items = await db
      .select()
      .from(userNotes)
      .where(eq(userNotes.userId, userId))
      .limit(limit);

    return items.map((item: any) => ({
      type: 'note' as const,
      content: item.content,
      source: `note-${item.id}`,
      metadata: { id: item.id, updatedAt: item.updatedAt },
    }));
  }

  /**
   * Format collected context into LLM-friendly message
   */
  private formatContextMessage(
    knowledge: ContextItem[],
    transactions: ContextItem[],
    notes: ContextItem[]
  ): string {
    const sections: string[] = [];

    if (knowledge.length > 0) {
      sections.push(
        '## Financial Knowledge:\n' +
          knowledge.map((item) => `- ${item.content} (${item.source})`).join('\n')
      );
    }

    if (transactions.length > 0) {
      sections.push(
        '## Recent Transactions:\n' +
          transactions.map((item) => `- ${item.content}`).join('\n')
      );
    }

    if (notes.length > 0) {
      sections.push(
        '## User Notes:\n' + notes.map((item) => `- ${item.content}`).join('\n')
      );
    }

    return sections.length > 0
      ? 'Consider this context:\n\n' + sections.join('\n\n')
      : '';
  }
}

export const contextService = (vectorizeService: any) =>
  new ContextService(vectorizeService);
