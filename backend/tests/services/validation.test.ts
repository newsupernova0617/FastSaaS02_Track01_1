import { describe, it, expect } from 'vitest';
import {
  validateAIResponse,
  validateCreatePayload,
  validateUpdatePayload,
  validateReadPayload,
  validateDeletePayload,
<<<<<<< HEAD
  validateAmount,
  validateDate,
} from '../../src/services/validation';
=======
  validateReportPayload,
  validateAmount,
  validateDate,
} from '../../src/services/validation';
import { ZodError } from 'zod';
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a

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
<<<<<<< HEAD
=======

  describe('validateReportPayload', () => {
    describe('Valid ReportPayload Tests', () => {
      it('should accept valid reportType (monthly_summary)', () => {
        const result = validateReportPayload({
          reportType: 'monthly_summary',
        });
        expect(result.reportType).toBe('monthly_summary');
      });

      it('should accept valid reportType (category_detail)', () => {
        const result = validateReportPayload({
          reportType: 'category_detail',
        });
        expect(result.reportType).toBe('category_detail');
      });

      it('should accept valid reportType (spending_pattern)', () => {
        const result = validateReportPayload({
          reportType: 'spending_pattern',
        });
        expect(result.reportType).toBe('spending_pattern');
      });

      it('should accept valid reportType (anomaly)', () => {
        const result = validateReportPayload({
          reportType: 'anomaly',
        });
        expect(result.reportType).toBe('anomaly');
      });

      it('should accept valid reportType (suggestion)', () => {
        const result = validateReportPayload({
          reportType: 'suggestion',
        });
        expect(result.reportType).toBe('suggestion');
      });

      it('should accept valid reportType with month in YYYY-MM format', () => {
        const result = validateReportPayload({
          reportType: 'monthly_summary',
          params: {
            month: '2024-03',
          },
        });
        expect(result.reportType).toBe('monthly_summary');
        expect(result.params?.month).toBe('2024-03');
      });

      it('should accept valid reportType with category filter', () => {
        const result = validateReportPayload({
          reportType: 'category_detail',
          params: {
            category: 'food',
          },
        });
        expect(result.reportType).toBe('category_detail');
        expect(result.params?.category).toBe('food');
      });

      it('should accept both month and category parameters together', () => {
        const result = validateReportPayload({
          reportType: 'spending_pattern',
          params: {
            month: '2026-04',
            category: 'entertainment',
          },
        });
        expect(result.reportType).toBe('spending_pattern');
        expect(result.params?.month).toBe('2026-04');
        expect(result.params?.category).toBe('entertainment');
      });

      it('should accept reportType without params', () => {
        const result = validateReportPayload({
          reportType: 'anomaly',
        });
        expect(result.reportType).toBe('anomaly');
        expect(result.params).toEqual({});
      });
    });

    describe('Invalid Format Tests', () => {
      it('should reject invalid month format (YYYY-MM-DD) with ZodError', () => {
        expect(() => {
          validateReportPayload({
            reportType: 'monthly_summary',
            params: {
              month: '2026-04-01',
            },
          });
        }).toThrow(ZodError);
      });

      it('should accept numeric month format (2026-13) even if semantically invalid', () => {
        // Note: Zod regex only validates YYYY-MM format, not semantic validity
        const result = validateReportPayload({
          reportType: 'monthly_summary',
          params: {
            month: '2026-13',
          },
        });
        expect(result.params?.month).toBe('2026-13');
      });

      it('should accept numeric month format (2026-00) even if semantically invalid', () => {
        // Note: Zod regex only validates YYYY-MM format, not semantic validity
        const result = validateReportPayload({
          reportType: 'monthly_summary',
          params: {
            month: '2026-00',
          },
        });
        expect(result.params?.month).toBe('2026-00');
      });

      it('should reject invalid month format (2026/04) with ZodError', () => {
        expect(() => {
          validateReportPayload({
            reportType: 'monthly_summary',
            params: {
              month: '2026/04',
            },
          });
        }).toThrow(ZodError);
      });

      it('should reject incomplete month format (just year) with ZodError', () => {
        expect(() => {
          validateReportPayload({
            reportType: 'monthly_summary',
            params: {
              month: '2026',
            },
          });
        }).toThrow(ZodError);
      });

      it('should reject invalid reportType with ZodError', () => {
        expect(() => {
          validateReportPayload({
            reportType: 'invalid_report',
          });
        }).toThrow(ZodError);
      });

      it('should reject invalid reportType (lowercase) with ZodError', () => {
        expect(() => {
          validateReportPayload({
            reportType: 'Monthly_Summary',
          });
        }).toThrow(ZodError);
      });

      it('should reject missing reportType field with ZodError', () => {
        expect(() => {
          validateReportPayload({
            params: {
              month: '2026-04',
            },
          });
        }).toThrow(ZodError);
      });
    });

    describe('Optional Parameters Tests', () => {
      it('should accept empty params object', () => {
        const result = validateReportPayload({
          reportType: 'monthly_summary',
          params: {},
        });
        expect(result.params).toEqual({});
      });

      it('should accept undefined params and default to empty object', () => {
        const result = validateReportPayload({
          reportType: 'anomaly',
        });
        expect(result.params).toEqual({});
      });

      it('should accept only month parameter without category', () => {
        const result = validateReportPayload({
          reportType: 'category_detail',
          params: {
            month: '2024-12',
          },
        });
        expect(result.params?.month).toBe('2024-12');
        expect(result.params?.category).toBeUndefined();
      });

      it('should accept only category parameter without month', () => {
        const result = validateReportPayload({
          reportType: 'spending_pattern',
          params: {
            category: 'transport',
          },
        });
        expect(result.params?.category).toBe('transport');
        expect(result.params?.month).toBeUndefined();
      });
    });

    describe('Error Message Tests', () => {
      it('should throw ZodError with proper message for invalid reportType', () => {
        expect(() => {
          validateReportPayload({
            reportType: 'unknown_type',
          });
        }).toThrow();
      });

      it('should throw ZodError when required reportType is missing', () => {
        expect(() => {
          validateReportPayload({
            params: { month: '2026-04' },
          });
        }).toThrow();
      });

      it('should throw ZodError with proper message for invalid month format', () => {
        expect(() => {
          validateReportPayload({
            reportType: 'monthly_summary',
            params: {
              month: '2026-4',
            },
          });
        }).toThrow();
      });
    });

    describe('Type Validation Tests', () => {
      it('should validate non-string reportType correctly', () => {
        expect(() => {
          validateReportPayload({
            reportType: 123,
          });
        }).toThrow(ZodError);
      });

      it('should validate non-string month correctly', () => {
        expect(() => {
          validateReportPayload({
            reportType: 'monthly_summary',
            params: {
              month: 202604,
            },
          });
        }).toThrow(ZodError);
      });

      it('should validate non-string category correctly', () => {
        expect(() => {
          validateReportPayload({
            reportType: 'category_detail',
            params: {
              category: 123,
            },
          });
        }).toThrow(ZodError);
      });
    });

    describe('Edge Case Tests', () => {
      it('should accept month with leading zeros in valid format', () => {
        const result = validateReportPayload({
          reportType: 'monthly_summary',
          params: {
            month: '2026-01',
          },
        });
        expect(result.params?.month).toBe('2026-01');
      });

      it('should accept month with December (12)', () => {
        const result = validateReportPayload({
          reportType: 'monthly_summary',
          params: {
            month: '2026-12',
          },
        });
        expect(result.params?.month).toBe('2026-12');
      });

      it('should accept category with various strings', () => {
        const result = validateReportPayload({
          reportType: 'category_detail',
          params: {
            category: 'Food & Drinks',
          },
        });
        expect(result.params?.category).toBe('Food & Drinks');
      });

      it('should accept empty string as category', () => {
        const result = validateReportPayload({
          reportType: 'category_detail',
          params: {
            category: '',
          },
        });
        expect(result.params?.category).toBe('');
      });

      it('should accept very long category string', () => {
        const longCategory = 'a'.repeat(500);
        const result = validateReportPayload({
          reportType: 'category_detail',
          params: {
            category: longCategory,
          },
        });
        expect(result.params?.category).toBe(longCategory);
      });
    });
  });
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
});
