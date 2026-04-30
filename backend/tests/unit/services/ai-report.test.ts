/**
 * Task 22: AIReportService deterministic report generation — real DB
 *
 * These tests use a real in-memory DB (createTestDb + seedTransaction) for the
 * aggregation step. Report sections are generated in-process so chat requests
 * can stay at one LLM call total.
 *
 * Scenarios:
 *   1. generateReport returns a report with the expected shape
 *   2. The deterministic sections include DB-derived totals
 *   3. generateReport with no params and empty DB does not throw
 *   4. getReportTitle and getReportSubtitle produce correct strings (non-LLM)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { seedUser, seedTransaction } from '../../helpers/fixtures';
import { AIReportService } from '../../../src/services/ai-report';
import type { ReportPayload } from '../../../src/types/ai';
import * as llmModule from '../../../src/services/llm';

// LLM config — provider doesn't matter because callLLM is spied on
const TEST_LLM_CONFIG = {
  provider: 'gemini' as const,
  apiKey: 'test-key',
  modelName: 'gemini-pro',
};

describe('AIReportService — Tier 2 (real DB + deterministic sections)', () => {
  let handle: TestDbHandle;
  let svc: AIReportService;

  beforeEach(async () => {
    handle = await createTestDb();
    svc = new AIReportService(TEST_LLM_CONFIG);

    await seedUser(handle.db, { id: 'alice' });
    await seedUser(handle.db, { id: 'bob' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    handle.client.close();
  });

  // ---------------------------------------------------------------------------
  // Shape: generateReport returns the required fields
  // ---------------------------------------------------------------------------

  it('returns a report with reportType, title, sections, generatedAt fields', async () => {
    await seedTransaction(handle.db, { userId: 'alice', type: 'expense', amount: 5000, category: 'food', date: '2026-04-01' });

    const payload: ReportPayload = { reportType: 'monthly_summary', params: { month: '2026-04' } };

    const report = await svc.generateReport(handle.db, 'alice', payload);

    expect(report).toHaveProperty('reportType', 'monthly_summary');
    expect(report).toHaveProperty('title', '월간 요약');
    expect(report).toHaveProperty('sections');
    expect(report).toHaveProperty('generatedAt');
    expect(Array.isArray(report.sections)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Sections: deterministic DB-derived sections are present in the report
  // ---------------------------------------------------------------------------

  it('includes deterministic sections derived from transactions in report.sections', async () => {
    await seedTransaction(handle.db, { userId: 'alice', type: 'expense', amount: 25000, category: 'food', date: '2026-04-01' });
    await seedTransaction(handle.db, { userId: 'alice', type: 'expense', amount: 30000, category: 'transport', date: '2026-04-02' });

    const payload: ReportPayload = { reportType: 'monthly_summary' };

    const report = await svc.generateReport(handle.db, 'alice', payload);

    expect(report.sections.length).toBeGreaterThanOrEqual(3);

    const cardSection = report.sections.find((s) => s.title === '총 지출');
    expect(cardSection).toBeDefined();
    expect(cardSection!.metric).toBe('₩55,000');
    expect((cardSection!.data as any).transactionCount).toBe(2);

    const categorySection = report.sections.find((s) => s.title === '카테고리별 지출');
    expect(categorySection).toBeDefined();
    expect((categorySection!.data as any).labels).toEqual(['transport', 'food']);
    expect((categorySection!.data as any).values).toEqual([30000, 25000]);
  });

  // ---------------------------------------------------------------------------
  // Subtitle: present when month param is provided, absent otherwise
  // ---------------------------------------------------------------------------

  it('includes Korean month subtitle when month param is provided', async () => {
    const payload: ReportPayload = { reportType: 'category_detail', params: { month: '2026-04' } };

    const report = await svc.generateReport(handle.db, 'alice', payload);

    expect(report.subtitle).toBe('2026-04 기준');
  });

  it('has no subtitle when month param is not provided', async () => {
    const payload: ReportPayload = { reportType: 'monthly_summary' };

    const report = await svc.generateReport(handle.db, 'alice', payload);

    expect(report.subtitle).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Empty DB: no transactions → report is generated without throwing
  // ---------------------------------------------------------------------------

  it('generates a report without throwing when the user has no transactions', async () => {
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
      ['monthly_summary', '월간 요약'],
      ['category_detail', '카테고리 분석'],
      ['spending_pattern', '지출 패턴 분석'],
      ['anomaly', '이상 지출 탐지'],
      ['suggestion', '맞춤 제안'],
    ];

    for (const [reportType, expectedTitle] of expected) {
      const report = await svc.generateReport(handle.db, 'alice', { reportType });
      expect(report.title).toBe(expectedTitle);
    }
  });

  // ---------------------------------------------------------------------------
  // generatedAt: is a valid ISO 8601 timestamp
  // ---------------------------------------------------------------------------

  it('generatedAt is a valid ISO 8601 timestamp', async () => {
    const report = await svc.generateReport(handle.db, 'alice', { reportType: 'monthly_summary' });

    const parsed = new Date(report.generatedAt);
    expect(parsed.getTime()).not.toBeNaN();
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // ---------------------------------------------------------------------------
  // No LLM call is made during report section generation
  // ---------------------------------------------------------------------------

  it('does not call callLLM during generateReport', async () => {
    const spy = vi.spyOn(llmModule, 'callLLM');

    await svc.generateReport(handle.db, 'alice', { reportType: 'monthly_summary' });

    expect(spy).not.toHaveBeenCalled();
  });
});
