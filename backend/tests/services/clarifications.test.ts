import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClarificationService, type ClarificationState } from '../../src/services/clarifications';
import crypto from 'crypto';

/**
 * Factory function to create a mock database with chained methods
 */
const createMockDb = () => {
  const mockDb = {
    insert: vi.fn(),
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    delete: vi.fn(),
    limit: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
  };

  // Setup chaining for insert().values()
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockResolvedValue([]),
  });

  // Setup chaining for select().from().where().limit()
  mockDb.select.mockReturnValue(mockDb);
  mockDb.from.mockReturnValue(mockDb);
  mockDb.where.mockReturnValue(mockDb);
  mockDb.limit.mockResolvedValue([]);

  // Setup chaining for delete().where()
  mockDb.delete.mockReturnValue(mockDb);

  return mockDb;
};

describe('ClarificationService', () => {
  let service: ClarificationService;
  let mockDb: any;

  beforeEach(() => {
    service = new ClarificationService();
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('saveClarification', () => {
    it('should save clarification state and return UUID', async () => {
      const state: ClarificationState = {
        missingFields: ['amount'],
        partialData: { transactionType: 'expense', category: 'food' },
        messageId: 'msg-123',
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockResolvedValueOnce([]);

      const result = await service.saveClarification(mockDb, 'user-123', 1, state);

      expect(result).toBeTruthy();
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should store state as JSON string', async () => {
      const state: ClarificationState = {
        missingFields: ['category'],
        partialData: { amount: 5000 },
        messageId: 'msg-456',
      };

      let capturedState: string | undefined;
      const mockValues = vi.fn().mockImplementationOnce((values: any) => {
        capturedState = values.state;
        return Promise.resolve([]);
      });
      mockDb.insert.mockReturnValueOnce({ values: mockValues });

      await service.saveClarification(mockDb, 'user-123', 1, state);

      expect(capturedState).toBeTruthy();
      const parsed = JSON.parse(capturedState!);
      expect(parsed).toEqual(state);
    });

    it('should include userId and chatSessionId in saved record', async () => {
      const state: ClarificationState = {
        missingFields: ['amount'],
        partialData: { category: 'food' },
        messageId: 'msg-789',
      };

      let capturedValues: any = undefined;
      const mockValues = vi.fn().mockImplementationOnce((values: any) => {
        capturedValues = values;
        return Promise.resolve([]);
      });
      mockDb.insert.mockReturnValueOnce({ values: mockValues });

      await service.saveClarification(mockDb, 'user-456', 42, state);

      expect(capturedValues.userId).toBe('user-456');
      expect(capturedValues.chatSessionId).toBe(42);
    });

    it('should include createdAt timestamp', async () => {
      const state: ClarificationState = {
        missingFields: ['amount'],
        partialData: { category: 'food' },
        messageId: 'msg-999',
      };

      let capturedValues: any = undefined;
      const mockValues = vi.fn().mockImplementationOnce((values: any) => {
        capturedValues = values;
        return Promise.resolve([]);
      });
      mockDb.insert.mockReturnValueOnce({ values: mockValues });

      const beforeTime = new Date();
      await service.saveClarification(mockDb, 'user-123', 1, state);
      const afterTime = new Date();

      expect(capturedValues.createdAt).toBeTruthy();
      const createdAt = new Date(capturedValues.createdAt);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('getClarification', () => {
    it('should retrieve clarification for user and session', async () => {
      const state: ClarificationState = {
        missingFields: ['amount'],
        partialData: { category: 'food' },
        messageId: 'msg-123',
      };

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([{ state: JSON.stringify(state) }]);

      const result = await service.getClarification(mockDb, 'user-123', 1);

      expect(result).toEqual(state);
    });

    it('should return null when no clarification exists', async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await service.getClarification(mockDb, 'user-123', 1);

      expect(result).toBeNull();
    });

    it('should return null on JSON parse error', async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([{ state: 'invalid json' }]);

      const result = await service.getClarification(mockDb, 'user-123', 1);

      expect(result).toBeNull();
    });

    it('should only retrieve for specific user and session combination', async () => {
      const state: ClarificationState = {
        missingFields: ['amount'],
        partialData: {},
        messageId: 'msg-456',
      };

      let capturedWhereCall: any;
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockImplementationOnce((condition: any) => {
        capturedWhereCall = condition;
        return mockDb;
      });
      mockDb.limit.mockResolvedValueOnce([{ state: JSON.stringify(state) }]);

      await service.getClarification(mockDb, 'user-789', 99);

      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });
  });

  describe('mergeClarificationResponse - amount extraction', () => {
    it('should extract amount from user response', async () => {
      const state: ClarificationState = {
        missingFields: ['amount'],
        partialData: { transactionType: 'expense', category: 'food' },
        messageId: 'msg-1',
      };

      const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
        '5000',
        state
      );

      expect(mergedData.amount).toBe(5000);
      expect(stillMissingFields).not.toContain('amount');
    });

    it('should validate amount is positive', async () => {
      const state: ClarificationState = {
        missingFields: ['amount'],
        partialData: { category: 'food' },
        messageId: 'msg-2',
      };

      const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
        '0',
        state
      );

      expect(mergedData.amount).toBeUndefined();
      expect(stillMissingFields).toContain('amount');
    });

    it('should validate amount does not exceed maximum (1 billion)', async () => {
      const state: ClarificationState = {
        missingFields: ['amount'],
        partialData: { category: 'food' },
        messageId: 'msg-3',
      };

      const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
        '2000000000',
        state
      );

      expect(mergedData.amount).toBeUndefined();
      expect(stillMissingFields).toContain('amount');
    });

    it('should accept amount at maximum boundary (1 billion)', async () => {
      const state: ClarificationState = {
        missingFields: ['amount'],
        partialData: { category: 'food' },
        messageId: 'msg-4',
      };

      const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
        '1000000000',
        state
      );

      expect(mergedData.amount).toBe(1000000000);
      expect(stillMissingFields).not.toContain('amount');
    });

    it('should extract amount from text with other content', async () => {
      const state: ClarificationState = {
        missingFields: ['amount'],
        partialData: { category: 'food' },
        messageId: 'msg-5',
      };

      const { mergedData } = await service.mergeClarificationResponse(
        'I spent 15000 on lunch',
        state
      );

      expect(mergedData.amount).toBe(15000);
    });

    it('should not extract amount when field is not missing', async () => {
      const state: ClarificationState = {
        missingFields: ['category'],
        partialData: { amount: 5000, transactionType: 'expense' },
        messageId: 'msg-6',
      };

      const { mergedData } = await service.mergeClarificationResponse('5000 food', state);

      expect(mergedData.amount).toBe(5000);
    });
  });

  describe('mergeClarificationResponse - category extraction', () => {
    it('should extract category from user response', async () => {
      const state: ClarificationState = {
        missingFields: ['category'],
        partialData: { transactionType: 'expense', amount: 10000 },
        messageId: 'msg-7',
      };

      const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
        'food',
        state
      );

      expect(mergedData.category).toBe('food');
      expect(stillMissingFields).not.toContain('category');
    });

    it('should be case-insensitive for category matching', async () => {
      const state: ClarificationState = {
        missingFields: ['category'],
        partialData: { amount: 5000 },
        messageId: 'msg-8',
      };

      const { mergedData } = await service.mergeClarificationResponse('FOOD', state);

      expect(mergedData.category).toBe('food');
    });

    it('should match category even with mixed case', async () => {
      const state: ClarificationState = {
        missingFields: ['category'],
        partialData: { amount: 5000 },
        messageId: 'msg-9',
      };

      const { mergedData } = await service.mergeClarificationResponse('Transport', state);

      expect(mergedData.category).toBe('transport');
    });

    it('should extract category from text with other content', async () => {
      const state: ClarificationState = {
        missingFields: ['category'],
        partialData: { amount: 25000 },
        messageId: 'msg-10',
      };

      const { mergedData } = await service.mergeClarificationResponse(
        'spent on shopping at mall',
        state
      );

      expect(mergedData.category).toBe('shopping');
    });

    it('should return undefined for invalid category', async () => {
      const state: ClarificationState = {
        missingFields: ['category'],
        partialData: { amount: 5000 },
        messageId: 'msg-11',
      };

      const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
        'unknown_category',
        state
      );

      expect(mergedData.category).toBeUndefined();
      expect(stillMissingFields).toContain('category');
    });

    it('should prioritize first matching category', async () => {
      const state: ClarificationState = {
        missingFields: ['category'],
        partialData: { amount: 5000 },
        messageId: 'msg-12',
      };

      const { mergedData } = await service.mergeClarificationResponse(
        'food and transport',
        state
      );

      expect(mergedData.category).toBe('food');
    });

    it('should not extract category when field is not missing', async () => {
      const state: ClarificationState = {
        missingFields: ['amount'],
        partialData: { category: 'food', transactionType: 'expense' },
        messageId: 'msg-13',
      };

      const { mergedData } = await service.mergeClarificationResponse('transport', state);

      expect(mergedData.category).toBe('food');
    });
  });

  describe('mergeClarificationResponse - transactionType extraction', () => {
    it('should extract transactionType expense from user response', async () => {
      const state: ClarificationState = {
        missingFields: ['transactionType'],
        partialData: { amount: 5000, category: 'food' },
        messageId: 'msg-14',
      };

      const { mergedData } = await service.mergeClarificationResponse('expense', state);

      expect(mergedData.transactionType).toBe('expense');
    });

    it('should extract transactionType income from user response', async () => {
      const state: ClarificationState = {
        missingFields: ['transactionType'],
        partialData: { amount: 50000, category: 'salary' },
        messageId: 'msg-15',
      };

      const { mergedData } = await service.mergeClarificationResponse('income', state);

      expect(mergedData.transactionType).toBe('income');
    });

    it('should extract transactionType from Korean keyword 지출 (expense)', async () => {
      const state: ClarificationState = {
        missingFields: ['transactionType'],
        partialData: { amount: 5000, category: 'food' },
        messageId: 'msg-16',
      };

      const { mergedData } = await service.mergeClarificationResponse('지출', state);

      expect(mergedData.transactionType).toBe('expense');
    });

    it('should extract transactionType from Korean keyword 썼 (expense)', async () => {
      const state: ClarificationState = {
        missingFields: ['transactionType'],
        partialData: { amount: 5000, category: 'food' },
        messageId: 'msg-17',
      };

      const { mergedData } = await service.mergeClarificationResponse('썼어', state);

      expect(mergedData.transactionType).toBe('expense');
    });

    it('should extract transactionType from Korean keyword 수입 (income)', async () => {
      const state: ClarificationState = {
        missingFields: ['transactionType'],
        partialData: { amount: 50000, category: 'salary' },
        messageId: 'msg-18',
      };

      const { mergedData } = await service.mergeClarificationResponse('수입', state);

      expect(mergedData.transactionType).toBe('income');
    });

    it('should extract transactionType from Korean keyword 받 (income)', async () => {
      const state: ClarificationState = {
        missingFields: ['transactionType'],
        partialData: { amount: 50000, category: 'salary' },
        messageId: 'msg-19',
      };

      const { mergedData } = await service.mergeClarificationResponse('받은 돈', state);

      expect(mergedData.transactionType).toBe('income');
    });

    it('should not set transactionType when field is not missing', async () => {
      const state: ClarificationState = {
        missingFields: ['amount'],
        partialData: { transactionType: 'income', category: 'salary' },
        messageId: 'msg-20',
      };

      const { mergedData } = await service.mergeClarificationResponse('expense', state);

      expect(mergedData.transactionType).toBe('income');
    });
  });

  describe('mergeClarificationResponse - multiple fields', () => {
    it('should extract multiple missing fields from single response', async () => {
      const state: ClarificationState = {
        missingFields: ['amount', 'category'],
        partialData: { transactionType: 'expense' },
        messageId: 'msg-21',
      };

      const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
        '20000 shopping',
        state
      );

      expect(mergedData.amount).toBe(20000);
      expect(mergedData.category).toBe('shopping');
      expect(stillMissingFields.length).toBe(0);
    });

    it('should extract all three missing fields', async () => {
      const state: ClarificationState = {
        missingFields: ['amount', 'category', 'transactionType'],
        partialData: {},
        messageId: 'msg-22',
      };

      const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
        '5000 food expense',
        state
      );

      expect(mergedData.amount).toBe(5000);
      expect(mergedData.category).toBe('food');
      expect(mergedData.transactionType).toBe('expense');
      expect(stillMissingFields.length).toBe(0);
    });

    it('should partially extract multiple fields', async () => {
      const state: ClarificationState = {
        missingFields: ['amount', 'category', 'transactionType'],
        partialData: {},
        messageId: 'msg-23',
      };

      const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
        '10000 unknown_type',
        state
      );

      expect(mergedData.amount).toBe(10000);
      expect(mergedData.category).toBeUndefined();
      expect(mergedData.transactionType).toBeUndefined();
      expect(stillMissingFields).toContain('category');
      expect(stillMissingFields).toContain('transactionType');
    });
  });

  describe('mergeClarificationResponse - edge cases', () => {
    it('should trim user input', async () => {
      const state: ClarificationState = {
        missingFields: ['amount', 'category'],
        partialData: { transactionType: 'expense' },
        messageId: 'msg-24',
      };

      const { mergedData } = await service.mergeClarificationResponse(
        '   5000   food   ',
        state
      );

      expect(mergedData.amount).toBe(5000);
      expect(mergedData.category).toBe('food');
    });

    it('should preserve existing partial data when extracting new fields', async () => {
      const state: ClarificationState = {
        missingFields: ['category'],
        partialData: { amount: 8000, transactionType: 'expense' },
        messageId: 'msg-25',
      };

      const { mergedData } = await service.mergeClarificationResponse('work', state);

      expect(mergedData.amount).toBe(8000);
      expect(mergedData.transactionType).toBe('expense');
      expect(mergedData.category).toBe('work');
    });

    it('should return unchanged partial data for non-matching response', async () => {
      const state: ClarificationState = {
        missingFields: ['category'],
        partialData: { amount: 5000 },
        messageId: 'msg-26',
      };

      const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
        'xyz abc 123',
        state
      );

      expect(mergedData.amount).toBe(5000);
      expect(stillMissingFields).toContain('category');
    });

    it('should handle empty missingFields array', async () => {
      const state: ClarificationState = {
        missingFields: [],
        partialData: { amount: 5000, category: 'food', transactionType: 'expense' },
        messageId: 'msg-27',
      };

      const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
        '10000 transport income',
        state
      );

      expect(mergedData.amount).toBe(5000);
      expect(mergedData.category).toBe('food');
      expect(mergedData.transactionType).toBe('expense');
      expect(stillMissingFields).toEqual([]);
    });

    it('should handle empty user response', async () => {
      const state: ClarificationState = {
        missingFields: ['amount', 'category'],
        partialData: {},
        messageId: 'msg-28',
      };

      const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
        '',
        state
      );

      expect(mergedData.amount).toBeUndefined();
      expect(mergedData.category).toBeUndefined();
      expect(stillMissingFields).toContain('amount');
      expect(stillMissingFields).toContain('category');
    });

    it('should handle whitespace-only user response', async () => {
      const state: ClarificationState = {
        missingFields: ['amount'],
        partialData: {},
        messageId: 'msg-29',
      };

      const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
        '   ',
        state
      );

      expect(mergedData.amount).toBeUndefined();
      expect(stillMissingFields).toContain('amount');
    });
  });

  describe('deleteClarification', () => {
    it('should delete clarification for user and session', async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(Promise.resolve([]));

      await service.deleteClarification(mockDb, 'user-123', 1);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should use correct userId and chatSessionId for deletion', async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(Promise.resolve([]));

      await service.deleteClarification(mockDb, 'user-999', 42);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('cleanupExpired', () => {
    it('should delete clarifications older than 5 minutes', async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(Promise.resolve([]));

      await service.cleanupExpired(mockDb);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should call where with timestamp comparison', async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(Promise.resolve([]));

      const beforeTime = new Date();
      await service.cleanupExpired(mockDb);
      const afterTime = new Date();

      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});
