// NOTE: These tests run with mocked LLM because @cloudflare/vitest-pool-workers
// is incompatible with Vitest 4.x. The structural assertions here document the
// expected shape from real Workers AI calls.
//
// To run against real Workers AI:
//   (a) Downgrade vitest to ^2.x and switch to defineWorkersConfig, or
//   (b) Run `wrangler dev` and exercise endpoints via curl / an external runner.
//
// Gate: only collected when RUN_LLM_TESTS=1 (vitest.llm.config.ts include array).

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mockLlmResponse } from '../helpers/llm-mock';

const KNOWN_ACTION_TYPES = new Set([
  'create',
  'read',
  'update',
  'delete',
  'report',
  'clarify',
  'plain_text',
  'undo',
]);

const KNOWN_CATEGORIES = new Set([
  'food',
  'transport',
  'shopping',
  'entertainment',
  'utilities',
  'health',
  'work',
  'other',
]);

// Minimal stub for contextService — returns no additional context
const stubContextService = {
  getContextForParse: vi.fn().mockResolvedValue(null),
  getContextForAction: vi.fn().mockResolvedValue(null),
};

function makeAIService() {
  // Dynamic import so vi.spyOn in mockLlmResponse intercepts callLLM before
  // the module cache resolves. Re-import per test to avoid stale mocks.
  return import('../../src/services/ai').then(({ AIService }) => {
    return new AIService(
      { provider: 'workers-ai' as any, apiKey: '', modelName: '' },
      null // no real AI binding needed — callLLM is mocked
    );
  });
}

describe('LLM smoke: ai parse (mocked)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('create action has numeric amount and known action type', async () => {
    // Mock the single LLM call inside parseUserInput.
    mockLlmResponse(
      JSON.stringify({
        type: 'create',
        payload: {
          transactionType: 'expense',
          amount: 15000,
          category: 'food',
          memo: '점심',
          date: '2026-04-13',
        },
        confidence: 0.95,
      })
    );

    const ai = await makeAIService();
    const result = await ai.parseUserInput(
      '오늘 점심 만오천원',
      [],
      ['food', 'transport', 'other'],
      'user-001',
      stubContextService,
      null
    );

    expect(KNOWN_ACTION_TYPES.has(result.type)).toBe(true);
    if (result.type === 'create') {
      const payload = result.payload as any;
      // Structural assertion: amount must be a number (not a string)
      expect(typeof payload.amount).toBe('number');
      // transactionType must be one of the two valid values
      expect(['income', 'expense']).toContain(payload.transactionType);
    }
  });

  it('report query returns report or plain_text action type', async () => {
    mockLlmResponse(
      JSON.stringify({
        type: 'report',
        payload: { reportType: 'monthly_summary', params: { month: '2026-04' } },
        confidence: 0.9,
      })
    );

    const ai = await makeAIService();
    const result = await ai.parseUserInput(
      '이번 달 보고서 보여줘',
      [],
      [],
      'user-001',
      stubContextService,
      null
    );

    // LLM may legitimately return plain_text for ambiguous report queries
    expect(['report', 'plain_text']).toContain(result.type);
  });

  it('ambiguous input returns a known action type', async () => {
    mockLlmResponse(
      JSON.stringify({
        type: 'clarify',
        payload: {
          message: '얼마를 썼나요?',
          missingFields: ['amount'],
          partialData: { transactionType: 'expense' },
          confidence: 0.5,
        },
        confidence: 0.5,
      })
    );

    const ai = await makeAIService();
    const result = await ai.parseUserInput(
      '어제 그거',
      [],
      [],
      'user-001',
      stubContextService,
      null
    );

    expect(KNOWN_ACTION_TYPES.has(result.type)).toBe(true);
    // Structural: confidence field must be a number in [0, 1]
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('income transaction has transactionType income', async () => {
    mockLlmResponse(
      JSON.stringify({
        type: 'create',
        payload: {
          transactionType: 'income',
          amount: 3000000,
          category: 'work',
          memo: '월급',
          date: '2026-04-13',
        },
        confidence: 0.97,
      })
    );

    const ai = await makeAIService();
    const result = await ai.parseUserInput(
      '오늘 월급 삼백만원 받았어',
      [],
      ['work', 'food'],
      'user-001',
      stubContextService,
      null
    );

    if (result.type === 'create') {
      expect((result.payload as any).transactionType).toBe('income');
      expect((result.payload as any).amount).toBeGreaterThan(0);
    } else {
      // Any known type is acceptable — structural shape is still valid
      expect(KNOWN_ACTION_TYPES.has(result.type)).toBe(true);
    }
  });

  it('plain text greeting returns plain_text action type', async () => {
    mockLlmResponse(
      JSON.stringify({
        type: 'plain_text',
        payload: {},
        confidence: 0.95,
      })
    );

    const ai = await makeAIService();
    const result = await ai.parseUserInput(
      '안녕하세요!',
      [],
      [],
      'user-001',
      stubContextService,
      null
    );

    expect(result.type).toBe('plain_text');
    // Structural: payload must be an object
    expect(typeof result.payload).toBe('object');
  });
});
