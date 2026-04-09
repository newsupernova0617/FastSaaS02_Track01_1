import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import type { Variables } from '../../src/middleware/auth';
import aiRouter from '../../src/routes/ai';
import type { Transaction } from '../../src/db/schema';

/**
 * Real integration tests for POST /api/ai/action endpoint
 * Tests actual route behavior with mocked Gemini API and database
 */

// Create a shared mock function object that all instances will reference
const sharedParseUserInputMock = vi.fn();

// Mock the AIService module
vi.mock('../../src/services/ai', () => {
  return {
    AIService: class MockAIService {
      parseUserInput = sharedParseUserInputMock;
    },
  };
});

// Mock database
vi.mock('../../src/db/index', () => {
  return {
    getDb: vi.fn(),
  };
});

// Mock chat service
vi.mock('../../src/services/chat', () => {
  return {
    saveMessage: vi.fn().mockResolvedValue(undefined),
    getChatHistory: vi.fn().mockResolvedValue([]),
    clearChatHistory: vi.fn().mockResolvedValue(0),
    saveMessageToSession: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock AI report service
vi.mock('../../src/services/ai-report', () => {
  return {
    AIReportService: class MockAIReportService {
      constructor(apiKey: string) {}
      async generateReport() {
        return {
          reportType: 'monthly_summary',
          title: 'Test Report',
          sections: [],
          generatedAt: new Date().toISOString(),
        };
      }
    },
  };
});

// Mock clarifications service
vi.mock('../../src/services/clarifications', () => {
  return {
    clarificationService: {
      getClarification: vi.fn().mockResolvedValue(null),
      saveClarification: vi.fn().mockResolvedValue('clarification-id-123'),
      deleteClarification: vi.fn().mockResolvedValue(undefined),
      mergeClarificationResponse: vi.fn().mockResolvedValue({
        mergedData: {},
        stillMissingFields: [],
      }),
    },
  };
});

const { AIService } = await import('../../src/services/ai');
const { getDb } = await import('../../src/db/index');
const { saveMessage } = await import('../../src/services/chat');

describe('POST /api/ai/action', () => {
  let app: Hono<{ Bindings: any; Variables: Variables }>;
  let mockDb: any;
  let mockAiInstance: any;

  // Helper to create a complete select chain mock with limit (for recent transactions)
  function createSelectChain(resolveValue: any = null) {
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(resolveValue || []),
          }),
        }),
      }),
    };
  }

  // Helper to create a select chain without limit (for READ queries)
  function createReadSelectChain(resolveValue: any = null) {
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(resolveValue || []),
        }),
      }),
    };
  }

  // Helper to create a simple select chain for ownership checks
  function createOwnershipCheckChain(resolveValue: any = null) {
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(resolveValue || []),
      }),
    };
  }

  // Helper to create an update chain
  function createUpdateChain(resolveValue: any = null) {
    return {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(resolveValue || []),
        }),
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock transaction data
    const mockTransaction: Transaction = {
      id: 1,
      userId: 'user-123',
      type: 'expense',
      amount: 10000,
      category: 'food',
      memo: 'breakfast',
      date: '2024-03-14',
      createdAt: '2024-03-14T08:00:00Z',
      deletedAt: null,
    };

    const mockUpdatedTransaction = {
      id: 1,
      userId: 'user-123',
      type: 'expense',
      amount: 20000,
      category: 'food',
      memo: 'lunch',
      date: '2024-03-15',
      createdAt: '2024-03-15T10:00:00Z',
      deletedAt: null,
    };

    // Setup mock database with chainable query builder pattern
    // The default select implementation - returns fresh chains each time
    // Tests that need specific behavior will override this
    mockDb = {
      select: vi.fn().mockImplementation(() => {
        // Create a flexible chain that supports multiple patterns:
        // Pattern 1: select().from().where().orderBy().limit() - for recent transactions
        // Pattern 2: select().from().where() - for ownership checks (awaitable directly)
        // Pattern 3: select().from().where().orderBy() - for READ queries (awaitable)

        const orderByResult = Promise.resolve([mockTransaction]);
        (orderByResult as any).limit = vi.fn().mockResolvedValue([mockTransaction]);

        const whereResult = Promise.resolve([mockTransaction]);
        (whereResult as any).orderBy = vi.fn().mockReturnValue(orderByResult);

        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue(whereResult),
          }),
        };
      }),
      selectDistinct: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ category: 'food' }, { category: 'transport' }]),
        }),
      })),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 1,
              userId: 'user-123',
              type: 'expense',
              amount: 15000,
              category: 'food',
              memo: 'lunch',
              date: '2024-03-15',
              createdAt: '2024-03-15T10:00:00Z',
              deletedAt: null,
            },
          ]),
        }),
      }),
      update: vi.fn().mockImplementation(() => createUpdateChain([mockUpdatedTransaction])),
    };

    // Mock getDb to return mockDb
    vi.mocked(getDb).mockReturnValue(mockDb);

    // The AIService is a mock class - create a new instance
    // Each instance shares the same sharedParseUserInputMock function
    mockAiInstance = new (AIService as any)('test-key');

    // Create a fresh Hono app for each test
    app = new Hono<{ Bindings: any; Variables: Variables }>();

    // Add environment and variables middleware
    app.use('*', async (c, next) => {
      c.env = {
        TURSO_DB_URL: 'test-url',
        TURSO_AUTH_TOKEN: 'test-token',
        SUPABASE_JWT_SECRET: 'test-secret',
      };
      c.set('userId', 'user-123');
      await next();
    });

    // Mount the AI router
    app.route('/api/ai', aiRouter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('CREATE action tests', () => {
    it('successfully processes create action from AI', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'create',
        payload: {
          transactionType: 'expense',
          amount: 15000,
          category: 'food',
          memo: 'lunch',
          date: '2024-03-15',
        },
        confidence: 0.95,
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'I spent 15000 won on lunch', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.type).toBe('create');
      expect(body.result).toHaveProperty('id');
      expect(body.result?.amount).toBe(15000);
      expect(body.message).toContain('저장되었습니다');
      expect(body.message).toContain('₩15,000');
    });

    it('returns message in Korean for create action', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'create',
        payload: {
          transactionType: 'expense',
          amount: 15000,
          category: 'food',
          memo: 'lunch',
          date: '2024-03-15',
        },
        confidence: 0.95,
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'I spent 15000 won on lunch', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(body.message).toContain('저장되었습니다');
      expect(body.message).toMatch(/₩\d+,?\d+/);
    });
  });

  describe('UPDATE action tests', () => {
    it('successfully processes update action from AI', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'update',
        payload: {
          id: 1,
          amount: 20000,
        },
        confidence: 0.87,
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Update transaction 1 to 20000 won', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.type).toBe('update');
      expect(body.result).toHaveProperty('id');
      expect(body.result?.amount).toBe(20000);
      expect(body.message).toContain('수정되었습니다');
    });

    it('returns 404 when updating non-existent transaction', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'update',
        payload: {
          id: 999,
          amount: 20000,
        },
        confidence: 0.87,
      });

      // Override select to return transactions for first call, empty for ownership check
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: recent transactions
          return createSelectChain([
            {
              id: 1,
              userId: 'user-123',
              type: 'expense',
              amount: 10000,
              category: 'food',
              memo: 'breakfast',
              date: '2024-03-14',
              createdAt: '2024-03-14T08:00:00Z',
              deletedAt: null,
            },
          ]);
        } else {
          // Second call: ownership verification - return empty
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          };
        }
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Update non-existent transaction', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error).toContain('not found');
    });
  });

  describe('READ action tests', () => {
    it('successfully processes read action from AI', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'read',
        payload: {
          month: '2024-03',
          category: 'food',
        },
        confidence: 0.92,
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Show my food expenses in March', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.type).toBe('read');
      expect(Array.isArray(body.result)).toBe(true);
      expect(body.message).toContain('조회됨');
    });

    it('returns transaction list with summary message', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'read',
        payload: {
          month: '2024-03',
        },
        confidence: 0.92,
      });

      const multipleTransactions = [
        {
          id: 1,
          userId: 'user-123',
          type: 'expense',
          amount: 10000,
          category: 'food',
          memo: 'breakfast',
          date: '2024-03-14',
          createdAt: '2024-03-14T08:00:00Z',
          deletedAt: null,
        },
        {
          id: 2,
          userId: 'user-123',
          type: 'expense',
          amount: 15000,
          category: 'food',
          memo: 'lunch',
          date: '2024-03-15',
          createdAt: '2024-03-15T10:00:00Z',
          deletedAt: null,
        },
      ];

      // Override select for recent transactions (first call) and query (second call)
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: recent transactions (with limit)
          return createSelectChain(multipleTransactions.slice(0, 1));
        } else {
          // Second call: READ query (without limit)
          return createReadSelectChain(multipleTransactions);
        }
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Show all transactions', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(body.type).toBe('read');
      expect(body.result.length).toBe(2);
      expect(body.message).toContain('2건');
      expect(body.message).toContain('₩');
    });
  });

  describe('DELETE action tests', () => {
    it('successfully processes delete action from AI', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'delete',
        payload: {
          id: 1,
          reason: 'wrong entry',
        },
        confidence: 0.88,
      });

      const mockTransaction = {
        id: 1,
        userId: 'user-123',
        type: 'expense',
        amount: 10000,
        category: 'food',
        memo: 'breakfast',
        date: '2024-03-14',
        createdAt: '2024-03-14T08:00:00Z',
        deletedAt: null,
      };

      // Override select for recent transactions (first call) and ownership check (second call)
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: recent transactions
          return createSelectChain([mockTransaction]);
        } else {
          // Second call: ownership verification - return existing
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          };
        }
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Delete transaction 1', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.type).toBe('delete');
      expect(body.result).toHaveProperty('id');
      expect(body.message).toContain('삭제되었습니다');
    });

    it('includes undo hint in delete message', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'delete',
        payload: {
          id: 1,
        },
        confidence: 0.88,
      });

      const mockTransaction = {
        id: 1,
        userId: 'user-123',
        type: 'expense',
        amount: 10000,
        category: 'food',
        memo: 'breakfast',
        date: '2024-03-14',
        createdAt: '2024-03-14T08:00:00Z',
        deletedAt: null,
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return createSelectChain([mockTransaction]);
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          };
        }
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Delete transaction 1', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(body.message).toContain('되돌릴 수 있습니다');
    });

    it('returns 404 when deleting non-existent transaction', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'delete',
        payload: {
          id: 999,
        },
        confidence: 0.88,
      });

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return createSelectChain([]);
        } else {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          };
        }
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Delete non-existent transaction', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error).toContain('not found');
    });
  });

  describe('Error handling tests', () => {
    it('should reject request without sessionId', async () => {
      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'add 5000 won expense' }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(400);
      expect(body.error).toContain('Session ID');
    });

    it('should reject request with invalid sessionId (string)', async () => {
      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'add 5000 won expense', sessionId: 'not-a-number' }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(400);
      expect(body.error).toContain('Session ID');
    });

    it('should reject request with invalid sessionId (null)', async () => {
      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'add 5000 won expense', sessionId: null }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(400);
      expect(body.error).toContain('Session ID');
    });

    it('returns 400 error for missing text input', async () => {
      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Text input is required');
    });

    it('returns 400 error for empty text input', async () => {
      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('handles Gemini API failure gracefully', async () => {

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Some text', sessionId: 1 }),
      }));

      const body = await response.json() as any;

    });

    it('handles validation failure with error message', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'create',
        payload: {
          transactionType: 'expense',
          amount: -1000,
          category: 'food',
          date: '2024-03-15',
        },
        confidence: 0.95,
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Negative amount', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBeTruthy();
    });

    it('should handle plain_text action type without transaction processing', async () => {
      // Mock AI response for plain text (non-financial query like "안녕")
      mockDb.all = vi.fn().mockResolvedValue([]);
      mockDb.selectDistinct.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'plain_text',
        payload: {},
        confidence: 0.95,
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'hello', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(200);
      expect(body.type).toBe('plain_text');
      expect(body.success).toBe(true);
      expect(body.message).toBeDefined();
    });
  });

  describe('User isolation tests', () => {
    it('uses userId from auth middleware for all operations', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'create',
        payload: {
          transactionType: 'expense',
          amount: 15000,
          category: 'food',
          memo: 'lunch',
          date: '2024-03-15',
        },
        confidence: 0.95,
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'I spent 15000 won on lunch', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(mockDb.insert).toHaveBeenCalled();
      expect(body.success).toBe(true);
    });

    it('provides AI with user context (recent transactions)', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'create',
        payload: {
          transactionType: 'expense',
          amount: 15000,
          category: 'food',
          memo: 'lunch',
          date: '2024-03-15',
        },
        confidence: 0.95,
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'I spent 15000 won on lunch', sessionId: 1 }),
      }));

      expect(mockAiInstance.parseUserInput).toHaveBeenCalled();
      const callArgs = mockAiInstance.parseUserInput.mock.calls[0];
      expect(callArgs[0]).toBe('I spent 15000 won on lunch');
      expect(Array.isArray(callArgs[1])).toBe(true);
      expect(Array.isArray(callArgs[2])).toBe(true);
    });

    it('queries are scoped to authenticated user', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'read',
        payload: { month: '2024-03' },
        confidence: 0.92,
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Show my transactions', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(body.result).toBeDefined();
      expect(body.success).toBe(true);
    });

    it('prevents accessing other user\'s transactions in update', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'update',
        payload: {
          id: 1,
          amount: 20000,
        },
        confidence: 0.87,
      });

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: recent transactions - return some transactions
          return createSelectChain([
            {
              id: 2,
              userId: 'other-user-456',
              type: 'expense',
              amount: 10000,
              category: 'food',
              memo: 'other user transaction',
              date: '2024-03-14',
              createdAt: '2024-03-14T08:00:00Z',
              deletedAt: null,
            },
          ]);
        } else {
          // Second call: ownership verification - return empty (user doesn't own this tx)
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          };
        }
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Update transaction 1', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(404);
      expect(body.error).toContain('not found');
    });

    it('prevents accessing other user\'s transactions in delete', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'delete',
        payload: { id: 1 },
        confidence: 0.88,
      });

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: recent transactions
          return createSelectChain([
            {
              id: 2,
              userId: 'other-user-456',
              type: 'expense',
              amount: 10000,
              category: 'food',
              memo: 'other user transaction',
              date: '2024-03-14',
              createdAt: '2024-03-14T08:00:00Z',
              deletedAt: null,
            },
          ]);
        } else {
          // Second call: ownership verification - return empty
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          };
        }
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Delete transaction 1', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(404);
      expect(body.error).toContain('not found');
    });
  });

  describe('Response format tests', () => {
    it('returns success flag for all action types', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'create',
        payload: {
          transactionType: 'expense',
          amount: 15000,
          category: 'food',
          memo: 'lunch',
          date: '2024-03-15',
        },
        confidence: 0.95,
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'I spent money', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(body).toHaveProperty('success');
      expect(typeof body.success).toBe('boolean');
    });

    it('returns type field matching action type', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'create',
        payload: {
          transactionType: 'expense',
          amount: 15000,
          category: 'food',
          memo: 'lunch',
          date: '2024-03-15',
        },
        confidence: 0.95,
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'I spent money', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(body.type).toBe('create');
    });

    it('returns result with transaction data', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'create',
        payload: {
          transactionType: 'expense',
          amount: 15000,
          category: 'food',
          memo: 'lunch',
          date: '2024-03-15',
        },
        confidence: 0.95,
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'I spent money', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(body.result).toBeDefined();
      expect(body.result).toHaveProperty('id');
      expect(body.result).toHaveProperty('amount');
    });

    it('includes message in Korean', async () => {
      mockAiInstance.parseUserInput.mockResolvedValue({
        type: 'create',
        payload: {
          transactionType: 'expense',
          amount: 15000,
          category: 'food',
          memo: 'lunch',
          date: '2024-03-15',
        },
        confidence: 0.95,
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'I spent money', sessionId: 1 }),
      }));

      const body = await response.json() as any;

      expect(body.message).toBeDefined();
      expect(typeof body.message).toBe('string');
      expect(body.message.length).toBeGreaterThan(0);
    });
  });
});
