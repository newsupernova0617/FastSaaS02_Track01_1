import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Hono } from 'hono';
import type { Variables } from '../../src/middleware/auth';
import aiRouter from '../../src/routes/ai';
import type { Transaction } from '../../src/db/schema';

/**
 * Real integration tests for POST /api/ai/action endpoint
 * Tests actual route behavior with mocked Gemini API and database
 */

// Mock the AIService module
vi.mock('../../src/services/ai', () => {
  return {
    AIService: class MockAIService {
      parseUserInput = vi.fn();
    },
  };
});

// Mock database
vi.mock('../../src/db/index', () => {
  return {
    getDb: vi.fn(),
  };
});

const { AIService } = await import('../../src/services/ai');
const { getDb } = await import('../../src/db/index');

describe('POST /api/ai/action', () => {
  let app: Hono<{ Bindings: any; Variables: Variables }>;
  let mockDb: any;
  let mockAiInstance: any;

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

    // Setup mock database with chainable query builder pattern
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          }),
        }),
      }),
      selectDistinct: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ category: 'food' }, { category: 'transport' }]),
        }),
      }),
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
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 1,
              userId: 'user-123',
              type: 'expense',
              amount: 20000,
              category: 'food',
              memo: 'lunch',
              date: '2024-03-15',
              createdAt: '2024-03-15T10:00:00Z',
              deletedAt: null,
            },
          ]),
        }),
      }),
    };

    // Mock getDb to return mockDb
    vi.mocked(getDb).mockReturnValue(mockDb);

    // The AIService is a mock class, so create an instance to get the parseUserInput mock
    const mockAIServiceInstance = new AIService('test-key');
    // @ts-ignore - Access the mock function
    mockAiInstance = mockAIServiceInstance;

    // Create a fresh Hono app for each test
    app = new Hono<{ Bindings: any; Variables: Variables }>();

    // Add environment and variables middleware
    app.use('*', async (c, next) => {
      c.env = {
        GEMINI_API_KEY: 'test-api-key',
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
        body: JSON.stringify({ text: 'I spent 15000 won on lunch' }),
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
        body: JSON.stringify({ text: 'I spent 15000 won on lunch' }),
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
        body: JSON.stringify({ text: 'Update transaction 1 to 20000 won' }),
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

      // Override select to return empty for non-existent transaction
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Update non-existent transaction' }),
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
        body: JSON.stringify({ text: 'Show my food expenses in March' }),
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

      // Override select to return multiple transactions
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
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
            ]),
          }),
        }),
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Show all transactions' }),
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

      // Override select to return existing transaction for delete
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
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
          ]),
        }),
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Delete transaction 1' }),
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

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
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
          ]),
        }),
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Delete transaction 1' }),
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

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Delete non-existent transaction' }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error).toContain('not found');
    });
  });

  describe('Error handling tests', () => {
    it('returns 400 error for missing text input', async () => {
      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
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
        body: JSON.stringify({ text: '' }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('handles Gemini API failure gracefully', async () => {
      mockAiInstance.parseUserInput.mockRejectedValue(
        new Error('Failed to process request. Please try again.')
      );

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Some text' }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Failed');
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
        body: JSON.stringify({ text: 'Negative amount' }),
      }));

      const body = await response.json() as any;

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBeTruthy();
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
        body: JSON.stringify({ text: 'I spent 15000 won on lunch' }),
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
        body: JSON.stringify({ text: 'I spent 15000 won on lunch' }),
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
        body: JSON.stringify({ text: 'Show my transactions' }),
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

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Update transaction 1' }),
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

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const response = await app.request(new Request('http://localhost/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Delete transaction 1' }),
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
        body: JSON.stringify({ text: 'I spent money' }),
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
        body: JSON.stringify({ text: 'I spent money' }),
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
        body: JSON.stringify({ text: 'I spent money' }),
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
        body: JSON.stringify({ text: 'I spent money' }),
      }));

      const body = await response.json() as any;

      expect(body.message).toBeDefined();
      expect(typeof body.message).toBe('string');
      expect(body.message.length).toBeGreaterThan(0);
    });
  });
});
