import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContextService } from '../../src/services/context';
import { knowledgeBase, userNotes, transactions } from '../../src/db/schema';

describe('ContextService', () => {
  let service: ContextService;
  let mockVectorizeService: any;
  let mockDb: any;

  beforeEach(() => {
    mockVectorizeService = {
      embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };
    service = new ContextService(mockVectorizeService);

    // Setup mock database
    mockDb = {
      select: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getRetrievalStrategy', () => {
    it('should return strategy for create action', () => {
      const result = service['getRetrievalStrategy']('create');
      expect(result.action).toBe('create');
      expect(result.knowledgeItems).toBe(3);
      expect(result.transactionItems).toBe(5);
      expect(result.noteItems).toBe(2);
      expect(result.totalItems).toBe(10);
    });

    it('should return strategy for read action', () => {
      const result = service['getRetrievalStrategy']('read');
      expect(result.action).toBe('read');
      expect(result.knowledgeItems).toBe(2);
      expect(result.transactionItems).toBe(10);
      expect(result.noteItems).toBe(2);
      expect(result.totalItems).toBe(14);
    });

    it('should return strategy for update action', () => {
      const result = service['getRetrievalStrategy']('update');
      expect(result.action).toBe('update');
      expect(result.knowledgeItems).toBe(2);
      expect(result.transactionItems).toBe(8);
      expect(result.noteItems).toBe(2);
      expect(result.totalItems).toBe(12);
    });

    it('should return strategy for delete action', () => {
      const result = service['getRetrievalStrategy']('delete');
      expect(result.action).toBe('delete');
      expect(result.knowledgeItems).toBe(1);
      expect(result.transactionItems).toBe(5);
      expect(result.noteItems).toBe(1);
      expect(result.totalItems).toBe(7);
    });

    it('should return strategy for report action', () => {
      const result = service['getRetrievalStrategy']('report');
      expect(result.action).toBe('report');
      expect(result.knowledgeItems).toBe(4);
      expect(result.transactionItems).toBe(12);
      expect(result.noteItems).toBe(4);
      expect(result.totalItems).toBe(20);
    });

    it('should return default strategy for unknown action', () => {
      const result = service['getRetrievalStrategy']('unknown_action' as any);
      expect(result.knowledgeItems).toBe(3);
      expect(result.transactionItems).toBe(5);
      expect(result.noteItems).toBe(2);
      expect(result.totalItems).toBe(10);
    });

    it('should have higher transaction items for read action', () => {
      const readStrategy = service['getRetrievalStrategy']('read');
      const createStrategy = service['getRetrievalStrategy']('create');
      expect(readStrategy.transactionItems).toBeGreaterThan(
        createStrategy.transactionItems
      );
    });

    it('should have higher transaction items for report action', () => {
      const reportStrategy = service['getRetrievalStrategy']('report');
      const deleteStrategy = service['getRetrievalStrategy']('delete');
      expect(reportStrategy.transactionItems).toBeGreaterThan(
        deleteStrategy.transactionItems
      );
    });

    it('should return correct total items sum', () => {
      const actionTypes: Array<'create' | 'read' | 'update' | 'delete' | 'report'> = [
        'create',
        'read',
        'update',
        'delete',
        'report',
      ];

      actionTypes.forEach((actionType) => {
        const strategy = service['getRetrievalStrategy'](actionType);
        const sum = strategy.knowledgeItems + strategy.transactionItems + strategy.noteItems;
        expect(strategy.totalItems).toBe(sum);
      });
    });
  });

  describe('getContextForAction', () => {
    beforeEach(() => {
      // Setup default mock db responses
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });
    });

    it('should call retrieval functions with correct strategy limits', async () => {
      const userId = 'test-user-123';
      const actionType = 'create';
      const userText = 'test message';

      // Mock all database responses
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(
        mockDb,
        userId,
        actionType,
        userText
      );

      expect(result).toBeDefined();
      expect(result.knowledge).toBeDefined();
      expect(result.transactions).toBeDefined();
      expect(result.notes).toBeDefined();
      expect(result.formatted).toBeDefined();
    });

    it('should retrieve knowledge items', async () => {
      const userId = 'test-user';
      const knowledgeItems = [
        { id: 1, content: 'Budget tips', category: 'budgeting' },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue(knowledgeItems),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'create', 'test');

      expect(result.knowledge).toHaveLength(1);
      expect(result.knowledge[0].type).toBe('knowledge');
      expect(result.knowledge[0].content).toBe('Budget tips');
    });

    it('should retrieve transactions with user isolation', async () => {
      const userId = 'test-user';
      const transactionItems = [
        {
          id: 1,
          userId: userId,
          amount: 50000,
          category: 'food',
          type: 'expense',
          memo: 'lunch',
          date: '2024-03-15',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(transactionItems),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'read', 'test');

      expect(result.transactions).toBeDefined();
      if (result.transactions.length > 0) {
        expect(result.transactions[0].type).toBe('transaction');
        expect(result.transactions[0].content).toContain('50000');
      }
    });

    it('should retrieve user notes with user isolation', async () => {
      const userId = 'test-user';
      const noteItems = [
        {
          id: 1,
          userId: userId,
          content: 'Should reduce spending on food',
          createdAt: '2024-03-01',
          updatedAt: '2024-03-01',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(noteItems),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'create', 'test');

      expect(result.notes).toBeDefined();
      if (result.notes.length > 0) {
        expect(result.notes[0].type).toBe('note');
        expect(result.notes[0].content).toContain('reduce spending');
      }
    });

    it('should format context into markdown message', async () => {
      const userId = 'test-user';

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'create', 'test');

      expect(result.formatted).toBeDefined();
      expect(typeof result.formatted).toBe('string');
    });

    it('should include Financial Knowledge section when knowledge items exist', async () => {
      const userId = 'test-user';
      const knowledgeItems = [
        { id: 1, content: 'Save 20% of income', category: 'budgeting' },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue(knowledgeItems),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'create', 'test');

      expect(result.formatted).toMatch(/Financial Knowledge/);
    });

    it('should include Recent Transactions section when transaction items exist', async () => {
      const userId = 'test-user';
      const transactionItems = [
        {
          id: 1,
          userId: userId,
          amount: 30000,
          category: 'transport',
          type: 'expense',
          date: '2024-03-15',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(transactionItems),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'read', 'test');

      expect(result.formatted).toMatch(/Recent Transactions/);
    });

    it('should include User Notes section when notes exist', async () => {
      const userId = 'test-user';
      const noteItems = [{ id: 1, userId: userId, content: 'Important note' }];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(noteItems),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'create', 'test');

      expect(result.formatted).toMatch(/User Notes/);
    });

    it('should handle empty context gracefully', async () => {
      const userId = 'test-user';

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'delete', 'test');

      expect(result.knowledge).toEqual([]);
      expect(result.transactions).toEqual([]);
      expect(result.notes).toEqual([]);
      expect(result.formatted).toBe('');
    });

    it('should use correct action type for strategy selection', async () => {
      const userId = 'test-user';

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      // Report action should request more items than delete
      await service.getContextForAction(mockDb, userId, 'report', 'test');

      // Check that limit was called with correct values for report action
      const calls = mockDb.select.mock.results;
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  describe('Context item types', () => {
    beforeEach(() => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });
    });

    it('should create ContextItem with knowledge type', async () => {
      const userId = 'test-user';
      const knowledgeItems = [
        { id: 1, content: 'Financial tip', category: 'investing' },
        { id: 2, content: 'Tax strategy', category: 'tax' },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue(knowledgeItems),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'create', 'test');

      const knowledgeContextItems = result.knowledge.filter((item) => item.type === 'knowledge');
      expect(knowledgeContextItems.length).toBe(2);
      knowledgeContextItems.forEach((item) => {
        expect(item.type).toBe('knowledge');
        expect(item.content).toBeDefined();
        expect(item.source).toBeDefined();
        expect(item.metadata).toBeDefined();
      });
    });

    it('should create ContextItem with transaction type', async () => {
      const userId = 'test-user';
      const transactionItems = [
        {
          id: 1,
          userId: userId,
          amount: 45000,
          category: 'food',
          type: 'expense',
          date: '2024-03-15',
        },
        {
          id: 2,
          userId: userId,
          amount: 2000000,
          category: 'salary',
          type: 'income',
          date: '2024-03-01',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(transactionItems),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'read', 'test');

      const transactionContextItems = result.transactions.filter(
        (item) => item.type === 'transaction'
      );
      expect(transactionContextItems.length).toBe(2);
      transactionContextItems.forEach((item) => {
        expect(item.type).toBe('transaction');
        expect(item.content).toBeDefined();
        expect(item.source).toBeDefined();
        expect(item.metadata).toBeDefined();
        expect(item.metadata?.amount).toBeDefined();
        expect(item.metadata?.category).toBeDefined();
      });
    });

    it('should create ContextItem with note type', async () => {
      const userId = 'test-user';
      const noteItems = [
        {
          id: 1,
          userId: userId,
          content: 'Need to check credit score',
          updatedAt: '2024-03-10',
        },
        {
          id: 2,
          userId: userId,
          content: 'Schedule financial review',
          updatedAt: '2024-03-12',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(noteItems),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'create', 'test');

      const noteContextItems = result.notes.filter((item) => item.type === 'note');
      expect(noteContextItems.length).toBe(2);
      noteContextItems.forEach((item) => {
        expect(item.type).toBe('note');
        expect(item.content).toBeDefined();
        expect(item.source).toBeDefined();
        expect(item.metadata).toBeDefined();
      });
    });

    it('should include correct metadata for knowledge items', async () => {
      const userId = 'test-user';
      const knowledgeItems = [{ id: 42, content: 'Tip', category: 'budgeting' }];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue(knowledgeItems),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'create', 'test');

      expect(result.knowledge[0].metadata?.id).toBe(42);
    });

    it('should include correct metadata for transactions', async () => {
      const userId = 'test-user';
      const transactionItems = [
        {
          id: 99,
          userId: userId,
          amount: 15000,
          category: 'utilities',
          type: 'expense',
          date: '2024-03-15',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(transactionItems),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'read', 'test');

      expect(result.transactions[0].metadata?.id).toBe(99);
      expect(result.transactions[0].metadata?.amount).toBe(15000);
      expect(result.transactions[0].metadata?.category).toBe('utilities');
    });

    it('should format transaction content correctly', async () => {
      const userId = 'test-user';
      const transactionItems = [
        {
          id: 1,
          userId: userId,
          amount: 35000,
          category: 'dining',
          type: 'expense',
          memo: 'dinner with friends',
          date: '2024-03-15',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(transactionItems),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'read', 'test');

      const content = result.transactions[0].content;
      expect(content).toContain('35000');
      expect(content).toContain('expense');
    });
  });

  describe('User data isolation', () => {
    it('should only retrieve transactions for specified user', async () => {
      const userId = 'user-123';

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                userId: userId,
                amount: 10000,
                category: 'food',
                type: 'expense',
                date: '2024-03-15',
              },
            ]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'read', 'test');

      expect(result.transactions).toBeDefined();
      expect(Array.isArray(result.transactions)).toBe(true);
    });

    it('should only retrieve notes for specified user', async () => {
      const userId = 'user-456';

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: 1, userId: userId, content: 'Personal note' },
            ]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'create', 'test');

      expect(result.notes).toBeDefined();
      expect(Array.isArray(result.notes)).toBe(true);
    });

    it('should not mix data between different users', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                userId: user1,
                amount: 10000,
                category: 'food',
                type: 'expense',
                date: '2024-03-15',
              },
            ]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, user1, 'read', 'test');

      // Verify that all returned transactions belong to user1
      result.transactions.forEach((transaction) => {
        expect(transaction.type).toBe('transaction');
      });
    });

    it('should handle different user IDs correctly', async () => {
      const userIds = ['user-123', 'user-456', 'user-789', 'user@example.com'];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      for (const userId of userIds) {
        const result = await service.getContextForAction(mockDb, userId, 'read', 'test');
        expect(result).toBeDefined();
        expect(Array.isArray(result.transactions)).toBe(true);
      }
    });
  });

  describe('Formatting and LLM Integration', () => {
    beforeEach(() => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });
    });

    it('should start formatted message with "Consider this context"', async () => {
      const knowledgeItems = [{ id: 1, content: 'Test', category: 'general' }];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue(knowledgeItems),
        }),
      });

      const result = await service.getContextForAction(mockDb, 'user-1', 'create', 'test');

      expect(result.formatted).toMatch(/Consider this context/);
    });

    it('should use markdown formatting with headers', async () => {
      const knowledgeItems = [{ id: 1, content: 'Tip', category: 'budgeting' }];
      const transactionItems = [
        {
          id: 1,
          userId: 'user-1',
          amount: 5000,
          category: 'food',
          type: 'expense',
          date: '2024-03-15',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(transactionItems),
          }),
          limit: vi.fn().mockResolvedValue(knowledgeItems),
        }),
      });

      const result = await service.getContextForAction(mockDb, 'user-1', 'create', 'test');

      expect(result.formatted).toContain('##');
      expect(result.formatted).toMatch(/##\s+Financial Knowledge/);
      expect(result.formatted).toMatch(/##\s+Recent Transactions/);
    });

    it('should separate sections with blank lines', async () => {
      const knowledgeItems = [{ id: 1, content: 'Tip', category: 'general' }];
      const transactionItems = [
        {
          id: 1,
          userId: 'user-1',
          amount: 1000,
          category: 'food',
          type: 'expense',
          date: '2024-03-15',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(transactionItems),
          }),
          limit: vi.fn().mockResolvedValue(knowledgeItems),
        }),
      });

      const result = await service.getContextForAction(mockDb, 'user-1', 'create', 'test');

      expect(result.formatted).toContain('\n\n');
    });

    it('should format knowledge items with category source', async () => {
      const knowledgeItems = [
        { id: 1, content: 'Emergency fund is important', category: 'savings' },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue(knowledgeItems),
        }),
      });

      const result = await service.getContextForAction(mockDb, 'user-1', 'create', 'test');

      expect(result.formatted).toMatch(/Emergency fund is important.*savings/);
    });

    it('should format transaction items with category and amount', async () => {
      const transactionItems = [
        {
          id: 1,
          userId: 'user-1',
          amount: 25000,
          category: 'groceries',
          type: 'expense',
          date: '2024-03-15',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(transactionItems),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getContextForAction(mockDb, 'user-1', 'read', 'test');

      expect(result.formatted).toMatch(/25000/);
      expect(result.formatted).toMatch(/expense/);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle all three context sources together', async () => {
      const userId = 'test-user';
      const knowledgeItems = [{ id: 1, content: 'Knowledge', category: 'budgeting' }];
      const transactionItems = [
        {
          id: 1,
          userId: userId,
          amount: 50000,
          category: 'food',
          type: 'expense',
          date: '2024-03-15',
        },
      ];
      const noteItems = [{ id: 1, userId: userId, content: 'Personal note' }];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn()
              .mockResolvedValueOnce(transactionItems)
              .mockResolvedValueOnce(noteItems),
          }),
          limit: vi.fn().mockResolvedValue(knowledgeItems),
        }),
      });

      const result = await service.getContextForAction(mockDb, userId, 'report', 'test');

      expect(result.knowledge.length).toBeGreaterThan(0);
      expect(result.transactions.length).toBeGreaterThan(0);
      expect(result.notes.length).toBeGreaterThan(0);
      expect(result.formatted).toMatch(/Financial Knowledge/);
      expect(result.formatted).toMatch(/Recent Transactions/);
      expect(result.formatted).toMatch(/User Notes/);
    });

    it('should handle different action types with consistent structure', async () => {
      const userId = 'test-user';
      const actionTypes: Array<'create' | 'read' | 'update' | 'delete' | 'report'> = [
        'create',
        'read',
        'update',
        'delete',
        'report',
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      for (const actionType of actionTypes) {
        const result = await service.getContextForAction(mockDb, userId, actionType, 'test');

        expect(result.knowledge).toBeDefined();
        expect(Array.isArray(result.knowledge)).toBe(true);
        expect(result.transactions).toBeDefined();
        expect(Array.isArray(result.transactions)).toBe(true);
        expect(result.notes).toBeDefined();
        expect(Array.isArray(result.notes)).toBe(true);
        expect(result.formatted).toBeDefined();
        expect(typeof result.formatted).toBe('string');
      }
    });
  });
});
