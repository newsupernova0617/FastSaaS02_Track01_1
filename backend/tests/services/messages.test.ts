import { describe, it, expect } from 'vitest';
import {
  formatAmount,
  formatType,
  generateCreateMessage,
  generateUpdateMessage,
  generateDeleteMessage,
  generateUndoMessage,
  generateReadMessage,
  generateErrorMessage,
} from '../../src/services/messages';
import type { Transaction } from '../../src/db/schema';

describe('Message Generation', () => {
  const mockTransaction: Transaction = {
    id: 1,
    userId: 'user-123',
    type: 'expense',
    amount: 15000,
    category: 'food',
    memo: 'lunch at cafe',
    date: '2024-03-15',
    createdAt: '2024-03-15T12:00:00Z',
    deletedAt: null,
  };

  const mockTransactionIncome: Transaction = {
    id: 2,
    userId: 'user-123',
    type: 'income',
    amount: 3000000,
    category: 'salary',
    memo: 'monthly salary',
    date: '2024-03-01',
    createdAt: '2024-03-01T00:00:00Z',
    deletedAt: null,
  };

  const mockTransactionNoMemo: Transaction = {
    id: 3,
    userId: 'user-123',
    type: 'expense',
    amount: 50000,
    category: 'transport',
    memo: null,
    date: '2024-03-10',
    createdAt: '2024-03-10T08:00:00Z',
    deletedAt: null,
  };

  describe('formatAmount', () => {
    it('formats amount in Korean Won with thousands separator', () => {
      const result = formatAmount(15000);
      expect(result).toBe('₩15,000');
    });

    it('formats large amounts correctly', () => {
      const result = formatAmount(3000000);
      expect(result).toBe('₩3,000,000');
    });

    it('formats small amounts correctly', () => {
      const result = formatAmount(100);
      expect(result).toBe('₩100');
    });

    it('formats amount of 0', () => {
      const result = formatAmount(0);
      expect(result).toBe('₩0');
    });
  });

  describe('formatType', () => {
    it('formats income type in Korean', () => {
      const result = formatType('income');
      expect(result).toBe('수입');
    });

    it('formats expense type in Korean', () => {
      const result = formatType('expense');
      expect(result).toBe('지출');
    });
  });

  describe('generateCreateMessage', () => {
    it('generates create message with memo', () => {
      const result = generateCreateMessage(mockTransaction);
      expect(result).toContain('지출');
      expect(result).toContain('₩15,000');
      expect(result).toContain('lunch at cafe');
      expect(result).toContain('2024-03-15');
      expect(result).toContain('저장되었습니다');
    });

    it('generates create message without memo (uses category)', () => {
      const result = generateCreateMessage(mockTransactionNoMemo);
      expect(result).toContain('지출');
      expect(result).toContain('₩50,000');
      expect(result).toContain('transport');
      expect(result).toContain('2024-03-10');
    });

    it('generates create message for income', () => {
      const result = generateCreateMessage(mockTransactionIncome);
      expect(result).toContain('수입');
      expect(result).toContain('₩3,000,000');
      expect(result).toContain('monthly salary');
    });
  });

  describe('generateUpdateMessage', () => {
    it('generates update message correctly', () => {
      const result = generateUpdateMessage(mockTransaction);
      expect(result).toContain('거래가 수정되었습니다');
      expect(result).toContain('지출');
      expect(result).toContain('₩15,000');
      expect(result).toContain('lunch at cafe');
    });

    it('generates update message for income', () => {
      const result = generateUpdateMessage(mockTransactionIncome);
      expect(result).toContain('거래가 수정되었습니다');
      expect(result).toContain('수입');
      expect(result).toContain('₩3,000,000');
    });

    it('generates update message without memo', () => {
      const result = generateUpdateMessage(mockTransactionNoMemo);
      expect(result).toContain('거래가 수정되었습니다');
      expect(result).toContain('transport');
    });
  });

  describe('generateDeleteMessage', () => {
    it('generates delete message correctly', () => {
      const result = generateDeleteMessage(mockTransaction);
      expect(result).toContain('지출');
      expect(result).toContain('₩15,000');
      expect(result).toContain('lunch at cafe');
      expect(result).toContain('2024-03-15');
      expect(result).toContain('삭제되었습니다');
      expect(result).toContain('되돌릴 수 있습니다');
    });

    it('generates delete message for income', () => {
      const result = generateDeleteMessage(mockTransactionIncome);
      expect(result).toContain('수입');
      expect(result).toContain('₩3,000,000');
      expect(result).toContain('삭제되었습니다');
    });

    it('generates delete message without memo', () => {
      const result = generateDeleteMessage(mockTransactionNoMemo);
      expect(result).toContain('transport');
      expect(result).toContain('삭제되었습니다');
    });
  });

  describe('generateUndoMessage', () => {
    it('generates undo message correctly', () => {
      const result = generateUndoMessage(mockTransaction);
      expect(result).toContain('지출');
      expect(result).toContain('₩15,000');
      expect(result).toContain('lunch at cafe');
      expect(result).toContain('2024-03-15');
      expect(result).toContain('복원되었습니다');
    });

    it('generates undo message for income', () => {
      const result = generateUndoMessage(mockTransactionIncome);
      expect(result).toContain('수입');
      expect(result).toContain('₩3,000,000');
      expect(result).toContain('복원되었습니다');
    });

    it('generates undo message without memo', () => {
      const result = generateUndoMessage(mockTransactionNoMemo);
      expect(result).toContain('transport');
      expect(result).toContain('복원되었습니다');
    });
  });

  describe('generateReadMessage', () => {
    it('generates read message for single transaction', () => {
      const result = generateReadMessage([mockTransaction], 15000, { month: '2024-03' });
      expect(result).toContain('2024-03');
      expect(result).toContain('1건');
      expect(result).toContain('₩15,000');
    });

    it('generates read message for multiple transactions', () => {
      const transactions = [mockTransaction, mockTransactionNoMemo];
      const result = generateReadMessage(transactions, 65000, { month: '2024-03' });
      expect(result).toContain('2건');
      expect(result).toContain('₩65,000');
    });

    it('generates read message with category filter', () => {
      const result = generateReadMessage([mockTransaction], 15000, { month: '2024-03', category: 'food' });
      expect(result).toContain('2024-03');
      expect(result).toContain('food');
      expect(result).toContain('1건');
    });

    it('generates read message for income transactions', () => {
      const result = generateReadMessage([mockTransactionIncome], 3000000, { month: '2024-03', type: 'income' });
      expect(result).toContain('2024-03');
      expect(result).toContain('1건');
      expect(result).toContain('₩3,000,000');
    });

    it('generates read message with no transactions', () => {
      const result = generateReadMessage([], 0, { month: '2024-02' });
      expect(result).toContain('2024-02');
      expect(result).toContain('0건');
    });

    it('uses current month when month not specified', () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const result = generateReadMessage([mockTransaction], 15000, {});
      expect(result).toContain(currentMonth);
    });
  });

  describe('generateErrorMessage', () => {
    it('returns error message for Error instance', () => {
      const error = new Error('Transaction not found');
      const result = generateErrorMessage(error);
      expect(result).toBe('Transaction not found');
    });

    it('returns custom message for specific error', () => {
      const error = new Error('Invalid amount format');
      const result = generateErrorMessage(error);
      expect(result).toBe('Invalid amount format');
    });

    it('returns generic message for non-Error object', () => {
      const result = generateErrorMessage('some string');
      expect(result).toBe('Unknown error occurred. Please try again.');
    });

    it('returns generic message for null/undefined', () => {
      const result = generateErrorMessage(null);
      expect(result).toBe('Unknown error occurred. Please try again.');
    });

    it('returns generic message for plain object', () => {
      const result = generateErrorMessage({ code: 'ERR_UNKNOWN' });
      expect(result).toBe('Unknown error occurred. Please try again.');
    });
  });
});
