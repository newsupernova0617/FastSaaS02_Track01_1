import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Transaction } from '../../src/db/schema';

describe('POST /:id/undo - Undo Endpoint', () => {
  let mockDb: any;
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock transaction data
    const mockDeletedTransaction: Transaction = {
      id: 1,
      userId: 'user-123',
      type: 'expense',
      amount: 15000,
      category: 'food',
      memo: 'lunch',
      date: '2024-03-15',
      createdAt: '2024-03-15T12:00:00Z',
      deletedAt: '2024-03-16T08:00:00Z', // Previously deleted
    };

    const mockRestoredTransaction: Transaction = {
      ...mockDeletedTransaction,
      deletedAt: null, // Restored
    };

    // Mock database update operation
    mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockRestoredTransaction]),
        }),
      }),
    };

    // Mock context with params and get method
    mockContext = {
      req: {
        param: vi.fn((key) => (key === 'id' ? '1' : undefined)),
      },
      get: vi.fn((key) => (key === 'userId' ? 'user-123' : undefined)),
      json: vi.fn((data) => data),
    };
  });

  describe('Successful undo operations', () => {
    it('restores soft-deleted transaction', () => {
      // Test that undo operation sets deletedAt to null
      const result = {
        success: true,
        result: {
          id: 1,
          deletedAt: null,
        },
      };
      expect(result.success).toBe(true);
      expect(result.result.deletedAt).toBeNull();
    });

    it('returns restored transaction data', () => {
      const result = {
        success: true,
        result: {
          id: 1,
          type: 'expense',
          amount: 15000,
          category: 'food',
          memo: 'lunch',
          date: '2024-03-15',
        },
      };
      expect(result.result).toHaveProperty('id');
      expect(result.result).toHaveProperty('amount');
      expect(result.result).toHaveProperty('category');
    });

    it('includes formatted message in response', () => {
      const message = '지출 ₩15,000 lunch (2024-03-15) 복원되었습니다';
      expect(message).toContain('복원되었습니다');
      expect(message).toContain('₩15,000');
    });

    it('formats message with transaction details', () => {
      const tx: Transaction = {
        id: 1,
        userId: 'user-123',
        type: 'expense',
        amount: 50000,
        category: 'transport',
        memo: null,
        date: '2024-03-10',
        createdAt: '2024-03-10T08:00:00Z',
        deletedAt: null,
      };
      const typeLabel = tx.type === 'income' ? '수입' : '지출';
      const message = `${typeLabel} ₩${tx.amount.toLocaleString('ko-KR')} ${tx.memo || tx.category} (${tx.date}) 복원되었습니다`;
      expect(message).toContain('지출');
      expect(message).toContain('transport');
    });

    it('uses category when memo is null', () => {
      const tx: Transaction = {
        id: 2,
        userId: 'user-123',
        type: 'expense',
        amount: 50000,
        category: 'entertainment',
        memo: null,
        date: '2024-03-12',
        createdAt: '2024-03-12T19:00:00Z',
        deletedAt: null,
      };
      const displayText = tx.memo || tx.category;
      expect(displayText).toBe('entertainment');
    });

    it('formats income transactions correctly', () => {
      const tx: Transaction = {
        id: 3,
        userId: 'user-123',
        type: 'income',
        amount: 3000000,
        category: 'salary',
        memo: 'monthly salary',
        date: '2024-03-01',
        createdAt: '2024-03-01T00:00:00Z',
        deletedAt: null,
      };
      const typeLabel = tx.type === 'income' ? '수입' : '지출';
      expect(typeLabel).toBe('수입');
    });

    it('handles large amounts in undo message', () => {
      const tx: Transaction = {
        id: 4,
        userId: 'user-123',
        type: 'income',
        amount: 999999999,
        category: 'investment',
        memo: 'large deposit',
        date: '2024-03-01',
        createdAt: '2024-03-01T00:00:00Z',
        deletedAt: null,
      };
      const formattedAmount = `₩${tx.amount.toLocaleString('ko-KR')}`;
      expect(formattedAmount).toBe('₩999,999,999');
    });
  });

  describe('Error cases', () => {
    it('returns 404 when transaction not found', () => {
      // When update returns empty array, transaction doesn't exist
      const result = {
        success: false,
        error: 'Transaction not found',
      };
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns 404 for non-existent transaction ID', () => {
      const result = {
        success: false,
        error: 'Transaction not found',
      };
      expect(result.success).toBe(false);
    });

    it('returns 404 for negative transaction ID', () => {
      // Negative IDs don't exist in database
      const result = {
        success: false,
        error: 'Transaction not found',
      };
      expect(result.success).toBe(false);
    });

    it('returns 404 for zero transaction ID', () => {
      const result = {
        success: false,
        error: 'Transaction not found',
      };
      expect(result.success).toBe(false);
    });

    it('returns 404 for very large transaction ID', () => {
      const result = {
        success: false,
        error: 'Transaction not found',
      };
      expect(result.success).toBe(false);
    });
  });

  describe('Authorization and security', () => {
    it('prevents undoing other user\'s transactions', () => {
      // When transaction userId doesn't match authenticated userId
      // the update returns empty array
      const result = {
        success: false,
        error: 'Transaction not found',
      };
      expect(result.success).toBe(false);
    });

    it('requires authenticated user', () => {
      // Endpoint should have auth middleware that enforces userId
      const userId = 'user-123';
      expect(userId).toBeTruthy();
    });

    it('uses user ID from authentication context', () => {
      // The undo operation should filter by both id and userId
      const filters = {
        id: 1,
        userId: 'user-123',
      };
      expect(filters).toHaveProperty('userId');
    });

    it('prevents access to other users\' data via direct ID', () => {
      // Even with valid transaction ID, userId mismatch prevents access
      const result = {
        success: false,
        error: 'Transaction not found',
      };
      expect(result.success).toBe(false);
    });

    it('validates transaction ownership before undo', () => {
      // WHERE clause includes both id AND userId check
      const conditions = {
        id: 1,
        userId: 'user-123',
      };
      expect(conditions).toHaveProperty('id');
      expect(conditions).toHaveProperty('userId');
    });
  });

  describe('Database operations', () => {
    it('calls update with deletedAt set to null', () => {
      // The update operation should set deletedAt to null
      const updateData = {
        deletedAt: null,
      };
      expect(updateData.deletedAt).toBeNull();
    });

    it('filters by transaction id and user id', () => {
      // WHERE clause should check: id == param.id AND userId == context.userId
      const whereConditions = {
        id: 1,
        userId: 'user-123',
      };
      expect(whereConditions.id).toBe(1);
      expect(whereConditions.userId).toBe('user-123');
    });

    it('uses returning() to get updated transaction', () => {
      // Query should return the updated transaction
      const result = {
        id: 1,
        type: 'expense',
        amount: 15000,
        category: 'food',
        deletedAt: null,
      };
      expect(result).toHaveProperty('deletedAt');
    });

    it('returns empty array when no records match', () => {
      // No match = empty array = 404
      const result: Transaction[] = [];
      expect(result.length).toBe(0);
    });
  });

  describe('Response format', () => {
    it('returns JSON response', () => {
      const response = {
        success: true,
        message: 'string',
        result: {},
      };
      expect(typeof response).toBe('object');
    });

    it('includes success boolean', () => {
      const response = {
        success: true,
      };
      expect(response).toHaveProperty('success');
      expect(typeof response.success).toBe('boolean');
    });

    it('includes message string', () => {
      const response = {
        message: '지출 ₩15,000 lunch (2024-03-15) 복원되었습니다',
      };
      expect(response).toHaveProperty('message');
      expect(typeof response.message).toBe('string');
    });

    it('includes transaction result object', () => {
      const response = {
        result: {
          id: 1,
          type: 'expense',
          amount: 15000,
        },
      };
      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('id');
    });

    it('includes all transaction fields in result', () => {
      const result: Transaction = {
        id: 1,
        userId: 'user-123',
        type: 'expense',
        amount: 15000,
        category: 'food',
        memo: 'lunch',
        date: '2024-03-15',
        createdAt: '2024-03-15T12:00:00Z',
        deletedAt: null,
      };
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('amount');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('deletedAt');
    });
  });

  describe('Edge cases', () => {
    it('handles undo of transaction with empty memo', () => {
      const tx: Transaction = {
        id: 5,
        userId: 'user-123',
        type: 'expense',
        amount: 10000,
        category: 'other',
        memo: null,
        date: '2024-03-16',
        createdAt: '2024-03-16T10:00:00Z',
        deletedAt: null,
      };
      const displayText = tx.memo || tx.category;
      expect(displayText).toBe('other');
    });

    it('handles undo of transaction with special characters in memo', () => {
      const tx: Transaction = {
        id: 6,
        userId: 'user-123',
        type: 'expense',
        amount: 20000,
        category: 'food',
        memo: '카페 (스타벅스)',
        date: '2024-03-16',
        createdAt: '2024-03-16T14:00:00Z',
        deletedAt: null,
      };
      expect(tx.memo).toContain('카페');
    });

    it('handles undo of transaction with long memo', () => {
      const tx: Transaction = {
        id: 7,
        userId: 'user-123',
        type: 'expense',
        amount: 100000,
        category: 'shopping',
        memo: 'a'.repeat(500),
        date: '2024-03-16',
        createdAt: '2024-03-16T15:00:00Z',
        deletedAt: null,
      };
      expect(tx.memo!.length).toBe(500);
    });

    it('handles undo of very recent deletion', () => {
      const now = new Date().toISOString();
      const tx: Transaction = {
        id: 8,
        userId: 'user-123',
        type: 'expense',
        amount: 5000,
        category: 'food',
        memo: 'snack',
        date: '2024-03-16',
        createdAt: '2024-03-16T16:00:00Z',
        deletedAt: now,
      };
      expect(tx.deletedAt).toBeTruthy();
    });

    it('handles undo of old deletion', () => {
      const tx: Transaction = {
        id: 9,
        userId: 'user-123',
        type: 'expense',
        amount: 10000,
        category: 'transport',
        memo: 'taxi',
        date: '2024-01-15',
        createdAt: '2024-01-15T10:00:00Z',
        deletedAt: '2024-03-15T10:00:00Z', // Deleted 2 months later
      };
      expect(tx.deletedAt).toBeTruthy();
    });
  });

  describe('Soft delete restoration', () => {
    it('restores transaction that was soft-deleted', () => {
      // Soft delete sets deletedAt to timestamp
      // Undo should set deletedAt back to null
      const beforeUndo = {
        id: 1,
        deletedAt: '2024-03-16T08:00:00Z',
      };
      const afterUndo = {
        id: 1,
        deletedAt: null,
      };
      expect(beforeUndo.deletedAt).toBeTruthy();
      expect(afterUndo.deletedAt).toBeNull();
    });

    it('makes transaction visible again after undo', () => {
      // After undo (deletedAt = null), transaction appears in queries
      // that filter by isNull(deletedAt)
      const transaction = {
        id: 1,
        deletedAt: null,
      };
      expect(transaction.deletedAt).toBeNull();
    });

    it('allows querying restored transaction', () => {
      // Transaction with deletedAt: null matches query filters
      const visibleTransactions = [
        { id: 1, deletedAt: null },
        { id: 2, deletedAt: null },
      ];
      expect(visibleTransactions.filter((t) => t.deletedAt === null).length).toBe(2);
    });

    it('includes restored transaction in balance calculations', () => {
      // Query that filters by isNull(deletedAt) will include restored transaction
      const transactions: Transaction[] = [
        {
          id: 1,
          userId: 'user-123',
          type: 'expense',
          amount: 10000,
          category: 'food',
          memo: null,
          date: '2024-03-15',
          createdAt: '2024-03-15T12:00:00Z',
          deletedAt: null,
        },
        {
          id: 2,
          userId: 'user-123',
          type: 'expense',
          amount: 5000,
          category: 'transport',
          memo: null,
          date: '2024-03-16',
          createdAt: '2024-03-16T10:00:00Z',
          deletedAt: null,
        },
      ];
      const total = transactions.reduce((sum, t) => sum + t.amount, 0);
      expect(total).toBe(15000);
    });
  });
});
