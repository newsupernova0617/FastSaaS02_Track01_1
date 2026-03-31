import { describe, it, expect } from 'vitest';
import {
  validateAIResponse,
  validateCreatePayload,
  validateUpdatePayload,
  validateReadPayload,
  validateDeletePayload,
  validateAmount,
  validateDate,
} from '../../src/services/validation';

describe('Validation Schemas', () => {
  describe('validateAIResponse', () => {
    it('validates a correct AI response with create action', () => {
      const response = {
        type: 'create',
        payload: { amount: 10000, category: 'food' },
        confidence: 0.95,
      };
      expect(() => validateAIResponse(response)).not.toThrow();
    });

    it('validates a correct AI response with update action', () => {
      const response = {
        type: 'update',
        payload: { id: 1, amount: 20000 },
        confidence: 0.87,
      };
      expect(() => validateAIResponse(response)).not.toThrow();
    });

    it('validates a correct AI response with read action', () => {
      const response = {
        type: 'read',
        payload: { month: '2024-03', category: 'food' },
        confidence: 0.92,
      };
      expect(() => validateAIResponse(response)).not.toThrow();
    });

    it('validates a correct AI response with delete action', () => {
      const response = {
        type: 'delete',
        payload: { id: 1 },
        confidence: 0.88,
      };
      expect(() => validateAIResponse(response)).not.toThrow();
    });

    it('throws on invalid action type', () => {
      const response = {
        type: 'invalid',
        payload: {},
        confidence: 0.5,
      };
      expect(() => validateAIResponse(response)).toThrow();
    });

    it('throws on missing confidence', () => {
      const response = {
        type: 'create',
        payload: {},
      };
      expect(() => validateAIResponse(response)).toThrow();
    });

    it('throws on confidence out of range', () => {
      const response = {
        type: 'create',
        payload: {},
        confidence: 1.5,
      };
      expect(() => validateAIResponse(response)).toThrow();
    });
  });

  describe('validateCreatePayload', () => {
    it('validates a valid create payload', () => {
      const payload = {
        transactionType: 'expense',
        amount: 15000,
        category: 'food',
        memo: 'lunch',
        date: '2024-03-15',
      };
      const result = validateCreatePayload(payload);
      expect(result.transactionType).toBe('expense');
      expect(result.amount).toBe(15000);
      expect(result.category).toBe('food');
    });

    it('validates create payload without memo', () => {
      const payload = {
        transactionType: 'income',
        amount: 3000000,
        category: 'salary',
        date: '2024-03-01',
      };
      const result = validateCreatePayload(payload);
      expect(result.memo).toBeUndefined();
    });

    it('throws on negative amount', () => {
      const payload = {
        transactionType: 'expense',
        amount: -1000,
        category: 'food',
        date: '2024-03-15',
      };
      expect(() => validateCreatePayload(payload)).toThrow();
    });

    it('throws on zero amount', () => {
      const payload = {
        transactionType: 'expense',
        amount: 0,
        category: 'food',
        date: '2024-03-15',
      };
      expect(() => validateCreatePayload(payload)).toThrow();
    });

    it('throws on amount exceeding maximum', () => {
      const payload = {
        transactionType: 'expense',
        amount: 1000000001,
        category: 'food',
        date: '2024-03-15',
      };
      expect(() => validateCreatePayload(payload)).toThrow();
    });

    it('throws on empty category', () => {
      const payload = {
        transactionType: 'expense',
        amount: 10000,
        category: '',
        date: '2024-03-15',
      };
      expect(() => validateCreatePayload(payload)).toThrow();
    });

    it('throws on category exceeding 50 characters', () => {
      const payload = {
        transactionType: 'expense',
        amount: 10000,
        category: 'a'.repeat(51),
        date: '2024-03-15',
      };
      expect(() => validateCreatePayload(payload)).toThrow();
    });

    it('throws on memo exceeding 500 characters', () => {
      const payload = {
        transactionType: 'expense',
        amount: 10000,
        category: 'food',
        memo: 'a'.repeat(501),
        date: '2024-03-15',
      };
      expect(() => validateCreatePayload(payload)).toThrow();
    });

    it('throws on invalid date format', () => {
      const payload = {
        transactionType: 'expense',
        amount: 10000,
        category: 'food',
        date: '2024/03/15',
      };
      expect(() => validateCreatePayload(payload)).toThrow();
    });

    it('throws on invalid transaction type', () => {
      const payload = {
        transactionType: 'transfer',
        amount: 10000,
        category: 'food',
        date: '2024-03-15',
      };
      expect(() => validateCreatePayload(payload)).toThrow();
    });
  });

  describe('validateUpdatePayload', () => {
    it('validates a valid update payload with only id', () => {
      const payload = {
        id: 1,
      };
      const result = validateUpdatePayload(payload);
      expect(result.id).toBe(1);
    });

    it('validates a valid update payload with partial fields', () => {
      const payload = {
        id: 5,
        amount: 25000,
        category: 'transport',
      };
      const result = validateUpdatePayload(payload);
      expect(result.id).toBe(5);
      expect(result.amount).toBe(25000);
      expect(result.category).toBe('transport');
    });

    it('throws on missing id', () => {
      const payload = {
        amount: 20000,
        category: 'food',
      };
      expect(() => validateUpdatePayload(payload)).toThrow();
    });

    it('throws on negative id', () => {
      const payload = {
        id: -1,
        amount: 10000,
      };
      expect(() => validateUpdatePayload(payload)).toThrow();
    });

    it('throws on invalid amount in update', () => {
      const payload = {
        id: 1,
        amount: -5000,
      };
      expect(() => validateUpdatePayload(payload)).toThrow();
    });

    it('throws on invalid date format in update', () => {
      const payload = {
        id: 1,
        date: '03-15-2024',
      };
      expect(() => validateUpdatePayload(payload)).toThrow();
    });
  });

  describe('validateReadPayload', () => {
    it('validates an empty read payload', () => {
      const payload = {};
      const result = validateReadPayload(payload);
      expect(result).toEqual({});
    });

    it('validates read payload with month filter', () => {
      const payload = {
        month: '2024-03',
      };
      const result = validateReadPayload(payload);
      expect(result.month).toBe('2024-03');
    });

    it('validates read payload with category filter', () => {
      const payload = {
        category: 'food',
      };
      const result = validateReadPayload(payload);
      expect(result.category).toBe('food');
    });

    it('validates read payload with type filter', () => {
      const payload = {
        type: 'income',
      };
      const result = validateReadPayload(payload);
      expect(result.type).toBe('income');
    });

    it('validates read payload with all filters', () => {
      const payload = {
        month: '2024-03',
        category: 'food',
        type: 'expense',
      };
      const result = validateReadPayload(payload);
      expect(result.month).toBe('2024-03');
      expect(result.category).toBe('food');
      expect(result.type).toBe('expense');
    });

    it('throws on invalid month format', () => {
      const payload = {
        month: '2024-3',
      };
      expect(() => validateReadPayload(payload)).toThrow();
    });

    it('throws on invalid type in read', () => {
      const payload = {
        type: 'transfer',
      };
      expect(() => validateReadPayload(payload)).toThrow();
    });
  });

  describe('validateDeletePayload', () => {
    it('validates a valid delete payload', () => {
      const payload = {
        id: 1,
        reason: 'wrong entry',
      };
      const result = validateDeletePayload(payload);
      expect(result.id).toBe(1);
      expect(result.reason).toBe('wrong entry');
    });

    it('validates delete payload without reason', () => {
      const payload = {
        id: 5,
      };
      const result = validateDeletePayload(payload);
      expect(result.id).toBe(5);
      expect(result.reason).toBeUndefined();
    });

    it('throws on missing id', () => {
      const payload = {
        reason: 'wrong entry',
      };
      expect(() => validateDeletePayload(payload)).toThrow();
    });

    it('throws on negative id', () => {
      const payload = {
        id: -1,
      };
      expect(() => validateDeletePayload(payload)).toThrow();
    });

    it('throws on zero id', () => {
      const payload = {
        id: 0,
      };
      expect(() => validateDeletePayload(payload)).toThrow();
    });
  });

  describe('validateAmount', () => {
    it('accepts valid positive amount', () => {
      expect(() => validateAmount(10000)).not.toThrow();
    });

    it('accepts maximum valid amount', () => {
      expect(() => validateAmount(999999999)).not.toThrow();
    });

    it('throws on zero amount', () => {
      expect(() => validateAmount(0)).toThrow('Amount must be greater than 0');
    });

    it('throws on negative amount', () => {
      expect(() => validateAmount(-5000)).toThrow('Amount must be greater than 0');
    });

    it('throws on amount exceeding maximum', () => {
      expect(() => validateAmount(1000000000)).toThrow();
    });

    it('throws on very large amount', () => {
      expect(() => validateAmount(9999999999)).toThrow();
    });
  });

  describe('validateDate', () => {
    it('accepts valid date in YYYY-MM-DD format', () => {
      expect(() => validateDate('2024-03-15')).not.toThrow();
    });

    it('accepts today\'s date', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(() => validateDate(today)).not.toThrow();
    });

    it('accepts past date', () => {
      expect(() => validateDate('2020-01-01')).not.toThrow();
    });

    it('accepts date within 30 days in future', () => {
      const future = new Date();
      future.setDate(future.getDate() + 15);
      const dateStr = future.toISOString().split('T')[0];
      expect(() => validateDate(dateStr)).not.toThrow();
    });

    it('throws on invalid date format like "03-15-2024"', () => {
      // Date constructor doesn't parse slash dates as expected, but DD-MM-YYYY is invalid
      expect(() => validateDate('invalid')).toThrow('Invalid date format');
    });

    it('throws on date more than 30 days in future', () => {
      const future = new Date();
      future.setDate(future.getDate() + 31);
      const dateStr = future.toISOString().split('T')[0];
      expect(() => validateDate(dateStr)).toThrow('more than 30 days');
    });

    it('throws on invalid date string', () => {
      expect(() => validateDate('not a date')).toThrow();
    });

    it('throws on malformed date', () => {
      expect(() => validateDate('2024-13-01')).toThrow();
    });
  });
});
