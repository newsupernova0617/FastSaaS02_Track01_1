// NOTE: These tests run with a mocked LLM. The structural assertions here
// document the expected shape from the clarification flow in real usage.
//
// To run against a live provider, set a real API key and unmock callLLM.
//
// Gate: only collected when RUN_LLM_TESTS=1 (vitest.llm.config.ts include array).

import { describe, it, expect, afterEach, vi } from 'vitest';
import { ClarificationService, type ClarificationState } from '../../src/services/clarifications';

// ClarificationService.mergeClarificationResponse is pure (no LLM calls),
// so these tests exercise real logic — no mocking required.

describe('LLM smoke: clarification merge (structural)', () => {
  afterEach(() => vi.restoreAllMocks());

  const service = new ClarificationService();

  it('merges a numeric amount from user response', async () => {
    const state: ClarificationState = {
      missingFields: ['amount'],
      partialData: { transactionType: 'expense', category: 'food', memo: '커피' },
      messageId: 'msg-001',
    };

    const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
      '5000원',
      state
    );

    // Structural: merged amount must be a positive number
    expect(typeof mergedData.amount).toBe('number');
    expect(mergedData.amount).toBeGreaterThan(0);
    // Amount resolved — should not be in still-missing list
    expect(stillMissingFields).not.toContain('amount');
  });

  it('merges a known category from user response', async () => {
    const state: ClarificationState = {
      missingFields: ['category'],
      partialData: { transactionType: 'expense', amount: 12000 },
      messageId: 'msg-002',
    };

    const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
      'food',
      state
    );

    expect(typeof mergedData.category).toBe('string');
    expect(mergedData.category!.length).toBeGreaterThan(0);
    expect(stillMissingFields).not.toContain('category');
  });

  it('reports still-missing when user response resolves nothing', async () => {
    const state: ClarificationState = {
      missingFields: ['amount'],
      partialData: { transactionType: 'expense', category: 'transport' },
      messageId: 'msg-003',
    };

    const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
      '응 그래', // no number — amount unresolvable
      state
    );

    // amount remains unresolved
    expect(stillMissingFields).toContain('amount');
    // Original partial data must be preserved untouched
    expect(mergedData.transactionType).toBe('expense');
    expect(mergedData.category).toBe('transport');
  });

  it('merges transactionType from Korean expense keyword', async () => {
    const state: ClarificationState = {
      missingFields: ['transactionType'],
      partialData: { amount: 8000, category: 'food' },
      messageId: 'msg-004',
    };

    const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
      '지출이야', // 지출 = expense
      state
    );

    expect(mergedData.transactionType).toBe('expense');
    expect(stillMissingFields).not.toContain('transactionType');
  });

  it('merges transactionType from Korean income keyword', async () => {
    const state: ClarificationState = {
      missingFields: ['transactionType'],
      partialData: { amount: 500000, category: 'work' },
      messageId: 'msg-005',
    };

    const { mergedData, stillMissingFields } = await service.mergeClarificationResponse(
      '수입이에요', // 수입 = income
      state
    );

    expect(mergedData.transactionType).toBe('income');
    expect(stillMissingFields).not.toContain('transactionType');
  });

  it('returns mergedData as an object with correct shape', async () => {
    const state: ClarificationState = {
      missingFields: ['amount', 'category'],
      partialData: { transactionType: 'expense' },
      messageId: 'msg-006',
    };

    const result = await service.mergeClarificationResponse('food 3000원', state);

    // Structural: return value always has the two expected keys
    expect(result).toHaveProperty('mergedData');
    expect(result).toHaveProperty('stillMissingFields');
    expect(Array.isArray(result.stillMissingFields)).toBe(true);
    expect(typeof result.mergedData).toBe('object');
  });
});
