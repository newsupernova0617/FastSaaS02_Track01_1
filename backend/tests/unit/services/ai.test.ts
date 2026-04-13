/**
 * Task 18: parseUserInput correctness tests
 *
 * The existing tests/services/ai.test.ts tests valid JSON and API error paths
 * using hand-rolled spies. These tests add the missing scenarios:
 *   - Malformed JSON on second LLM call → service throws (does not silently return plain_text)
 *   - LLM returns confidence < 0.7 with clarify type → returned as-is after validation
 *   - LLM returns valid create JSON → returned with type 'create'
 *   - LLM returns unknown action type → validateAIResponse throws → service re-throws
 *
 * parseUserInput makes TWO callLLM calls:
 *   1. First call: determine action type (JSON with "type" field)
 *   2. Second call: final parse with context (JSON processed by validateAIResponse)
 *
 * mockLlmResponse from helpers replaces ALL callLLM calls in a test with one value.
 * To return different values per call, we spy directly here.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AIService } from '../../../src/services/ai';
import * as llmModule from '../../../src/services/llm';

// Minimal mock contextService — getContextForAction returns empty formatted string
// so the second LLM call has no extra context injected.
function makeContextService() {
  return {
    getContextForAction: vi.fn().mockResolvedValue({
      knowledge: [],
      transactions: [],
      notes: [],
      formatted: '',
    }),
  };
}

// Minimal mock DB (context service queries DB, but we always return empty)
const mockDb = {};

// LLMConfig using 'gemini' provider so callLLM routes to callGemini and we can spy on it.
const testConfig = {
  provider: 'gemini' as const,
  apiKey: 'test-key',
  modelName: 'gemini-pro',
};

describe('AIService.parseUserInput — Tier 2 coverage', () => {
  let service: AIService;
  let contextService: ReturnType<typeof makeContextService>;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new AIService(testConfig);
    contextService = makeContextService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Valid create JSON → type 'create'
  // -------------------------------------------------------------------------
  it('returns type "create" when LLM returns valid create JSON', async () => {
    const createJson = JSON.stringify({
      type: 'create',
      payload: {
        transactionType: 'expense',
        amount: 12000,
        category: 'food',
        date: '2026-04-13',
      },
      confidence: 0.95,
    });

    // Both LLM calls return valid create JSON
    vi.spyOn(llmModule, 'callLLM').mockResolvedValue(createJson);

    const result = await service.parseUserInput(
      '점심 12000원 썼어',
      [],
      ['food', 'transport'],
      'user-alice',
      contextService,
      mockDb
    );

    expect(result.type).toBe('create');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  // -------------------------------------------------------------------------
  // Scenario 2: LLM returns clarify JSON with confidence < 0.7
  //   First call returns 'clarify' (action determination)
  //   Second call returns the same clarify payload (final parse)
  // -------------------------------------------------------------------------
  it('returns type "clarify" when LLM returns confidence < 0.7', async () => {
    const clarifyJson = JSON.stringify({
      type: 'clarify',
      payload: {
        message: '얼마를 썼나요?',
        missingFields: ['amount'],
        partialData: { transactionType: 'expense', category: 'food' },
        confidence: 0.5,
      },
      confidence: 0.5,
    });

    vi.spyOn(llmModule, 'callLLM').mockResolvedValue(clarifyJson);

    const result = await service.parseUserInput(
      '커피 마셨어',
      [],
      [],
      'user-alice',
      contextService,
      mockDb
    );

    expect(result.type).toBe('clarify');
    expect(result.confidence).toBeLessThan(0.7);
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Malformed JSON on both calls → service throws
  //   The source does not have a plain_text fallback; it re-throws as
  //   "Failed to process request."
  // -------------------------------------------------------------------------
  it('throws "Failed to process request" when LLM returns malformed JSON', async () => {
    vi.spyOn(llmModule, 'callLLM').mockResolvedValue('THIS IS NOT JSON AT ALL');

    await expect(
      service.parseUserInput('테스트', [], [], 'user-alice', contextService, mockDb)
    ).rejects.toThrow('Failed to process request');
  });

  // -------------------------------------------------------------------------
  // Scenario 4: First call succeeds; second call returns malformed JSON → throws
  // -------------------------------------------------------------------------
  it('throws "Failed to process request" when only the second LLM call is malformed', async () => {
    const firstCallJson = JSON.stringify({
      type: 'create',
      payload: {},
      confidence: 0.9,
    });

    const spy = vi.spyOn(llmModule, 'callLLM');
    spy.mockResolvedValueOnce(firstCallJson);   // first call (action determination)
    spy.mockResolvedValueOnce('NOT VALID JSON'); // second call (final parse with context)

    await expect(
      service.parseUserInput('점심', [], [], 'user-alice', contextService, mockDb)
    ).rejects.toThrow('Failed to process request');
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Unknown / invalid action type in second call → validateAIResponse
  //   throws because 'unknown_action' is not a valid action type, and the catch
  //   block re-throws as "Failed to process request".
  // -------------------------------------------------------------------------
  it('throws "Failed to process request" when second LLM call returns unknown action type', async () => {
    const unknownTypeJson = JSON.stringify({
      type: 'unknown_action',
      payload: {},
      confidence: 0.8,
    });

    vi.spyOn(llmModule, 'callLLM').mockResolvedValue(unknownTypeJson);

    await expect(
      service.parseUserInput('테스트', [], [], 'user-alice', contextService, mockDb)
    ).rejects.toThrow('Failed to process request');
  });

  // -------------------------------------------------------------------------
  // Scenario 6: LLM returns read JSON → type 'read'
  // -------------------------------------------------------------------------
  it('returns type "read" when LLM returns valid read JSON', async () => {
    const readJson = JSON.stringify({
      type: 'read',
      payload: { month: '2026-04' },
      confidence: 0.9,
    });

    vi.spyOn(llmModule, 'callLLM').mockResolvedValue(readJson);

    const result = await service.parseUserInput(
      '4월 내역 보여줘',
      [],
      [],
      'user-alice',
      contextService,
      mockDb
    );

    expect(result.type).toBe('read');
  });

  // -------------------------------------------------------------------------
  // Scenario 7: contextService.getContextForAction is called with the userId arg
  // -------------------------------------------------------------------------
  it('passes userId from argument to contextService.getContextForAction', async () => {
    const plainTextJson = JSON.stringify({
      type: 'plain_text',
      payload: {},
      confidence: 0.95,
    });

    vi.spyOn(llmModule, 'callLLM').mockResolvedValue(plainTextJson);

    await service.parseUserInput(
      '안녕',
      [],
      [],
      'user-bob',
      contextService,
      mockDb
    );

    expect(contextService.getContextForAction).toHaveBeenCalledWith(
      mockDb,
      'user-bob',
      expect.any(String),
      expect.any(String)
    );
  });
});
