/**
 * Task 22: AIReportService non-LLM parts — real DB + mocked callLLM
 *
 * The existing tests/services/ai-report.test.ts instantiates the service with
 * provider: 'workers-ai' and no `ai` binding.  callLLM with workers-ai and no
 * binding throws immediately, which means those tests rely on the mock DB
 * returning data before callLLM is reached — but the sections assertions
 * (sections.length > 0, sectionTypes includes 'card' and 'pie') cannot pass
 * without a real or mocked LLM response.
 *
 * These tests use:
 *   - Real in-memory DB (createTestDb + seedTransaction) for the aggregation step
 *   - mockLlmResponse from helpers for the sections generation step
 *
 * Scenarios:
 *   1. generateReport returns a report with the expected shape
 *   2. The narrative/sections text from the mocked LLM is included in the report
 *   3. generateReport with no params and empty DB does not throw
 *   4. getReportTitle and getReportSubtitle produce correct strings (non-LLM)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { seedUser, seedTransaction } from '../../helpers/fixtures';
import { mockLlmResponse, restoreLlmMock } from '../../helpers/llm-mock';
import { AIReportService } from '../../../src/services/ai-report';
import type { ReportPayload } from '../../../src/types/ai';

// Deterministic sections payload returned by the mocked LLM
const MOCK_SECTIONS = [
  {
    type: 'card',
    title: 'Total Expense',
    metric: '₩55,000',
    trend: 'up',
    data: {},
  },
  {
    type: 'pie',
    title: 'By Category',
    data: { labels: ['food', 'transport'], values: [25000, 30000] },
  },
  {
    type: 'suggestion',
    title: 'Save More',
    data: { message: '식비를 줄이세요.' },
  },
];

const MOCK_LLM_RESPONSE = JSON.stringify({ sections: MOCK_SECTIONS });

// LLM config — provider doesn't matter because callLLM is spied on
const TEST_LLM_CONFIG = {
  provider: 'gemini' as const,
  apiKey: 'test-key',
  modelName: 'gemini-pro',
};

describe('AIReportService — Tier 2 (real DB + mocked LLM)', () => {
  let handle: TestDbHandle;
  let svc: AIReportService;

  beforeEach(async () => {
    handle = await createTestDb();
    svc = new AIReportService(TEST_LLM_CONFIG);

    await seedUser(handle.db, { id: 'alice' });
    await seedUser(handle.db, { id: 'bob' });
  });

  afterEach(() => {
    restoreLlmMock();
    handle.client.close();
  });

  // ---------------------------------------------------------------------------
  // Shape: generateReport returns the required fields
  // ---------------------------------------------------------------------------

  it('returns a report with reportType, title, sections, generatedAt fields', async () => {
    mockLlmResponse(MOCK_LLM_RESPONSE);

    await seedTransaction(handle.db, { userId: 'alice', type: 'expense', amount: 5000, category: 'food', date: '2026-04-01' });

    const payload: ReportPayload = { reportType: 'monthly_summary', params: { month: '2026-04' } };

    const report = await svc.generateReport(handle.db, 'alice', payload);

    expect(report).toHaveProperty('reportType', 'monthly_summary');
    expect(report).toHaveProperty('title', 'Monthly Summary');
    expect(report).toHaveProperty('sections');
    expect(report).toHaveProperty('generatedAt');
    expect(Array.isArray(report.sections)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Narrative: sections from the mocked LLM are present in the report
  // ---------------------------------------------------------------------------

  it('includes the narrative sections returned by the mocked LLM in report.sections', async () => {
    mockLlmResponse(MOCK_LLM_RESPONSE);

    const payload: ReportPayload = { reportType: 'monthly_summary' };

    const report = await svc.generateReport(handle.db, 'alice', payload);

    expect(report.sections.length).toBe(MOCK_SECTIONS.length);

    const cardSection = report.sections.find((s) => s.type === 'card');
    expect(cardSection).toBeDefined();
    expect(cardSection!.title).toBe('Total Expense');
    expect(cardSection!.metric).toBe('₩55,000');

    const suggestionSection = report.sections.find((s) => s.type === 'suggestion');
    expect(suggestionSection).toBeDefined();
    expect((suggestionSection!.data as any).message).toBe('식비를 줄이세요.');
  });

  // ---------------------------------------------------------------------------
  // Subtitle: present when month param is provided, absent otherwise
  // ---------------------------------------------------------------------------

  it('includes subtitle "for YYYY-MM" when month param is provided', async () => {
    mockLlmResponse(MOCK_LLM_RESPONSE);

    const payload: ReportPayload = { reportType: 'category_detail', params: { month: '2026-04' } };

    const report = await svc.generateReport(handle.db, 'alice', payload);

    expect(report.subtitle).toBe('for 2026-04');
  });

  it('has no subtitle when month param is not provided', async () => {
    mockLlmResponse(MOCK_LLM_RESPONSE);

    const payload: ReportPayload = { reportType: 'monthly_summary' };

    const report = await svc.generateReport(handle.db, 'alice', payload);

    expect(report.subtitle).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Empty DB: no transactions → report is generated without throwing
  // ---------------------------------------------------------------------------

  it('generates a report without throwing when the user has no transactions', async () => {
    mockLlmResponse(MOCK_LLM_RESPONSE);

    const payload: ReportPayload = { reportType: 'monthly_summary' };

    const report = await svc.generateReport(handle.db, 'alice', payload);

    expect(report.sections.length).toBeGreaterThan(0);
    expect(report.reportType).toBe('monthly_summary');
  });

  // ---------------------------------------------------------------------------
  // Report titles: getReportTitle is purely deterministic (no LLM)
  // ---------------------------------------------------------------------------

  it('maps all known report types to their correct titles', async () => {
    const expected: Array<[ReportPayload['reportType'], string]> = [
      ['monthly_summary', 'Monthly Summary'],
      ['category_detail', 'Category Analysis'],
      ['spending_pattern', 'Spending Pattern Analysis'],
      ['anomaly', 'Anomaly Detection'],
      ['suggestion', 'Smart Recommendations'],
    ];

    for (const [reportType, expectedTitle] of expected) {
      mockLlmResponse(MOCK_LLM_RESPONSE);

      const report = await svc.generateReport(handle.db, 'alice', { reportType });
      expect(report.title).toBe(expectedTitle);

      restoreLlmMock();
    }
  });

  // ---------------------------------------------------------------------------
  // generatedAt: is a valid ISO 8601 timestamp
  // ---------------------------------------------------------------------------

  it('generatedAt is a valid ISO 8601 timestamp', async () => {
    mockLlmResponse(MOCK_LLM_RESPONSE);

    const report = await svc.generateReport(handle.db, 'alice', { reportType: 'monthly_summary' });

    const parsed = new Date(report.generatedAt);
    expect(parsed.getTime()).not.toBeNaN();
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // ---------------------------------------------------------------------------
  // LLM is called exactly once per generateReport invocation
  // (aggregation happens in-process; only one LLM call for sections)
  // ---------------------------------------------------------------------------

  it('calls callLLM exactly once per generateReport invocation', async () => {
    const spy = mockLlmResponse(MOCK_LLM_RESPONSE);

    await svc.generateReport(handle.db, 'alice', { reportType: 'monthly_summary' });

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
