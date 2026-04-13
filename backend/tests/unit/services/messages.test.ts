/**
 * Real-DB migration of tests/services/messages.test.ts
 *
 * The messages service functions are pure (no DB access), so this file
 * re-runs the same assertions as the original but is co-located under
 * tests/unit/ alongside the DB-backed service tests, making it the
 * canonical location going forward.
 *
 * No vi.fn() mock chains are needed here — the functions are imported
 * directly and exercised with concrete Transaction values.
 */
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
} from '../../../src/services/messages';
import type { Transaction } from '../../../src/db/schema';

const expenseTx: Transaction = {
  id: 1,
  userId: 'alice',
  type: 'expense',
  amount: 15000,
  category: 'food',
  memo: 'lunch at cafe',
  date: '2024-03-15',
  createdAt: '2024-03-15T12:00:00Z',
  deletedAt: null,
  previousState: null,
};

const incomeTx: Transaction = {
  id: 2,
  userId: 'alice',
  type: 'income',
  amount: 3000000,
  category: 'salary',
  memo: 'monthly salary',
  date: '2024-03-01',
  createdAt: '2024-03-01T00:00:00Z',
  deletedAt: null,
  previousState: null,
};

const noMemoTx: Transaction = {
  id: 3,
  userId: 'alice',
  type: 'expense',
  amount: 50000,
  category: 'transport',
  memo: null,
  date: '2024-03-10',
  createdAt: '2024-03-10T08:00:00Z',
  deletedAt: null,
  previousState: null,
};

describe('formatAmount', () => {
  it('formats with thousands separator and ₩ prefix', () => {
    expect(formatAmount(15000)).toBe('₩15,000');
  });

  it('formats large amounts', () => {
    expect(formatAmount(3000000)).toBe('₩3,000,000');
  });

  it('formats small amounts', () => {
    expect(formatAmount(100)).toBe('₩100');
  });

  it('formats zero', () => {
    expect(formatAmount(0)).toBe('₩0');
  });
});

describe('formatType', () => {
  it('returns 수입 for income', () => {
    expect(formatType('income')).toBe('수입');
  });

  it('returns 지출 for expense', () => {
    expect(formatType('expense')).toBe('지출');
  });
});

describe('generateCreateMessage', () => {
  it('includes type, amount, memo, date, and 저장되었습니다', () => {
    const msg = generateCreateMessage(expenseTx);
    expect(msg).toContain('지출');
    expect(msg).toContain('₩15,000');
    expect(msg).toContain('lunch at cafe');
    expect(msg).toContain('2024-03-15');
    expect(msg).toContain('저장되었습니다');
  });

  it('falls back to category when memo is null', () => {
    const msg = generateCreateMessage(noMemoTx);
    expect(msg).toContain('transport');
    expect(msg).toContain('₩50,000');
  });

  it('handles income transactions', () => {
    const msg = generateCreateMessage(incomeTx);
    expect(msg).toContain('수입');
    expect(msg).toContain('₩3,000,000');
    expect(msg).toContain('monthly salary');
  });
});

describe('generateUpdateMessage', () => {
  it('includes 거래가 수정되었습니다, type, amount, memo', () => {
    const msg = generateUpdateMessage(expenseTx);
    expect(msg).toContain('거래가 수정되었습니다');
    expect(msg).toContain('지출');
    expect(msg).toContain('₩15,000');
    expect(msg).toContain('lunch at cafe');
  });

  it('handles income', () => {
    const msg = generateUpdateMessage(incomeTx);
    expect(msg).toContain('거래가 수정되었습니다');
    expect(msg).toContain('수입');
    expect(msg).toContain('₩3,000,000');
  });

  it('falls back to category when memo is null', () => {
    const msg = generateUpdateMessage(noMemoTx);
    expect(msg).toContain('거래가 수정되었습니다');
    expect(msg).toContain('transport');
  });
});

describe('generateDeleteMessage', () => {
  it('includes 삭제되었습니다 and 되돌릴 수 있습니다', () => {
    const msg = generateDeleteMessage(expenseTx);
    expect(msg).toContain('지출');
    expect(msg).toContain('₩15,000');
    expect(msg).toContain('lunch at cafe');
    expect(msg).toContain('2024-03-15');
    expect(msg).toContain('삭제되었습니다');
    expect(msg).toContain('되돌릴 수 있습니다');
  });

  it('handles income', () => {
    const msg = generateDeleteMessage(incomeTx);
    expect(msg).toContain('수입');
    expect(msg).toContain('₩3,000,000');
    expect(msg).toContain('삭제되었습니다');
  });

  it('falls back to category when memo is null', () => {
    const msg = generateDeleteMessage(noMemoTx);
    expect(msg).toContain('transport');
    expect(msg).toContain('삭제되었습니다');
  });
});

describe('generateUndoMessage', () => {
  it('includes 복원되었습니다, type, amount, memo, date', () => {
    const msg = generateUndoMessage(expenseTx);
    expect(msg).toContain('지출');
    expect(msg).toContain('₩15,000');
    expect(msg).toContain('lunch at cafe');
    expect(msg).toContain('2024-03-15');
    expect(msg).toContain('복원되었습니다');
  });

  it('handles income', () => {
    const msg = generateUndoMessage(incomeTx);
    expect(msg).toContain('수입');
    expect(msg).toContain('₩3,000,000');
    expect(msg).toContain('복원되었습니다');
  });

  it('falls back to category when memo is null', () => {
    const msg = generateUndoMessage(noMemoTx);
    expect(msg).toContain('transport');
    expect(msg).toContain('복원되었습니다');
  });
});

describe('generateReadMessage', () => {
  it('includes month, count, and total for a single transaction', () => {
    const msg = generateReadMessage([expenseTx], 15000, { month: '2024-03' });
    expect(msg).toContain('2024-03');
    expect(msg).toContain('1건');
    expect(msg).toContain('₩15,000');
  });

  it('includes correct count for multiple transactions', () => {
    const msg = generateReadMessage([expenseTx, noMemoTx], 65000, { month: '2024-03' });
    expect(msg).toContain('2건');
    expect(msg).toContain('₩65,000');
  });

  it('includes category filter when provided', () => {
    const msg = generateReadMessage([expenseTx], 15000, { month: '2024-03', category: 'food' });
    expect(msg).toContain('food');
    expect(msg).toContain('1건');
  });

  it('handles empty transaction list', () => {
    const msg = generateReadMessage([], 0, { month: '2024-02' });
    expect(msg).toContain('2024-02');
    expect(msg).toContain('0건');
  });

  it('defaults to current month when month not provided', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const msg = generateReadMessage([expenseTx], 15000, {});
    expect(msg).toContain(currentMonth);
  });
});

describe('generateErrorMessage', () => {
  it('returns the Error message for an Error instance', () => {
    expect(generateErrorMessage(new Error('Transaction not found'))).toBe('Transaction not found');
  });

  it('returns the message text verbatim', () => {
    expect(generateErrorMessage(new Error('Invalid amount format'))).toBe('Invalid amount format');
  });

  it('returns generic message for a plain string', () => {
    expect(generateErrorMessage('some string')).toBe('Unknown error occurred. Please try again.');
  });

  it('returns generic message for null', () => {
    expect(generateErrorMessage(null)).toBe('Unknown error occurred. Please try again.');
  });

  it('returns generic message for a plain object', () => {
    expect(generateErrorMessage({ code: 'ERR_UNKNOWN' })).toBe('Unknown error occurred. Please try again.');
  });
});
