/**
 * Task 20: reports service math tests (real DB)
 *
 * Two services are tested here:
 *
 * 1. ReportService (src/services/reports.ts)
 *    - saveReport / getReportDetail / deleteReport with userId isolation
 *    - updateReportTitle validation
 *
 * 2. AIReportService aggregation math (src/services/ai-report.ts)
 *    The aggregateTransactionData private method runs against a real DB.
 *    We test it indirectly via generateReport with a mocked callLLM, then
 *    inspect the JSON passed to the LLM to verify:
 *      - Category sums match hand-calculated fixtures
 *      - Date range filtering excludes out-of-range transactions
 *      - Soft-deleted transactions (deletedAt != null) are excluded
 *      - Empty input → zeroed totals, no error
 *
 * The LLM mock returns a minimal valid sections JSON so generateReport
 * completes without a real network call.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, type TestDbHandle } from '../../helpers/db';
import { seedUser, seedTransaction } from '../../helpers/fixtures';
import { ReportService, updateReportTitle } from '../../../src/services/reports';
import { AIReportService } from '../../../src/services/ai-report';
import * as llmModule from '../../../src/services/llm';
import { transactions } from '../../../src/db/schema';
import { eq } from 'drizzle-orm';
import type { ReportPayload } from '../../../src/types/ai';

// Minimal sections JSON for the LLM mock
const MOCK_SECTIONS_JSON = JSON.stringify({
  sections: [
    { type: 'card', title: 'Total Expense', metric: '₩0', trend: 'stable', data: {} },
  ],
});

// LLM config for AIReportService — provider doesn't matter because callLLM is spied on
const TEST_LLM_CONFIG = {
  provider: 'gemini' as const,
  apiKey: 'test-key',
  modelName: 'gemini-pro',
};

describe('reports service — Tier 2 real-DB tests', () => {
  let handle: TestDbHandle;

  beforeEach(async () => {
    handle = await createTestDb();
    await seedUser(handle.db, { id: 'alice' });
    await seedUser(handle.db, { id: 'bob' });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    handle.client.close();
  });

  // ---------------------------------------------------------------------------
  // ReportService CRUD
  // ---------------------------------------------------------------------------

  describe('ReportService', () => {
    let svc: ReportService;

    beforeEach(() => {
      svc = new ReportService(handle.db);
    });

    it('saveReport stores a report and returns it with an id', async () => {
      const report = await svc.saveReport('alice', {
        reportType: 'monthly_summary',
        title: 'April Summary',
        reportData: [{ total: 50000 }],
        params: { month: '2026-04' },
      });

      expect(typeof report.id).toBe('number');
      expect(report.userId).toBe('alice');
      expect(report.reportType).toBe('monthly_summary');
      expect(report.title).toBe('April Summary');
    });

    it('getReportDetail returns the report for its owner', async () => {
      const saved = await svc.saveReport('alice', {
        reportType: 'monthly_summary',
        title: 'Alice Report',
        reportData: [],
        params: {},
      });

      const detail = await svc.getReportDetail('alice', saved.id);

      expect(detail).not.toBeNull();
      expect(detail!.id).toBe(saved.id);
    });

    it('getReportDetail returns null when another user queries the report', async () => {
      const saved = await svc.saveReport('alice', {
        reportType: 'monthly_summary',
        title: 'Alice Report',
        reportData: [],
        params: {},
      });

      const result = await svc.getReportDetail('bob', saved.id);

      expect(result).toBeNull();
    });

    it('deleteReport removes the report for its owner', async () => {
      const saved = await svc.saveReport('alice', {
        reportType: 'monthly_summary',
        title: 'To Delete',
        reportData: [],
        params: {},
      });

      // Note: deleteReport returns rows affected count check
      await svc.deleteReport('alice', saved.id);

      const detail = await svc.getReportDetail('alice', saved.id);
      expect(detail).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // updateReportTitle validation
  // ---------------------------------------------------------------------------

  describe('updateReportTitle', () => {
    it('throws when title is empty', async () => {
      const svc = new ReportService(handle.db);
      const saved = await svc.saveReport('alice', {
        reportType: 'monthly_summary',
        title: 'Original',
        reportData: [],
        params: {},
      });

      await expect(
        updateReportTitle(handle.db, 'alice', saved.id, '  ')
      ).rejects.toThrow('cannot be empty');
    });

    it('throws when title exceeds 100 characters', async () => {
      const svc = new ReportService(handle.db);
      const saved = await svc.saveReport('alice', {
        reportType: 'monthly_summary',
        title: 'Original',
        reportData: [],
        params: {},
      });

      await expect(
        updateReportTitle(handle.db, 'alice', saved.id, 'x'.repeat(101))
      ).rejects.toThrow('100 characters');
    });
  });

  // ---------------------------------------------------------------------------
  // AIReportService aggregation math (real DB + mocked LLM)
  //
  // The key insight: AIReportService.generateReport calls aggregateTransactionData
  // (which queries the real DB) and then passes the JSON to generateReportSections
  // (which calls callLLM). We capture what the LLM received and parse the
  // transactionData from the prompt to verify correctness.
  // ---------------------------------------------------------------------------

  describe('AIReportService aggregation math', () => {
    let aiReportSvc: AIReportService;
    let capturedPromptData: string;

    beforeEach(() => {
      aiReportSvc = new AIReportService(TEST_LLM_CONFIG);

      // Spy on callLLM: capture the raw transactionData JSON from the prompt and
      // return valid sections so generateReport completes.
      //
      // The prompt structure in generateReportSections is:
      //   "...based on this transaction data:\n\n<transactionData>\n\nCRITICAL..."
      // We extract just the transactionData JSON block by splitting on the known
      // surrounding text so we get exactly the JSON object passed as transactionData.
      vi.spyOn(llmModule, 'callLLM').mockImplementation(async (messages) => {
        const userMsg = messages.find((m) => m.role === 'user');
        if (userMsg) {
          // Extract the JSON block between the intro and the CRITICAL section
          const content = userMsg.content;
          const startMarker = 'based on this transaction data:\n\n';
          const endMarker = '\n\nCRITICAL REQUIREMENTS';
          const startIdx = content.indexOf(startMarker);
          const endIdx = content.indexOf(endMarker);
          if (startIdx !== -1 && endIdx !== -1) {
            capturedPromptData = content.slice(startIdx + startMarker.length, endIdx).trim();
          } else {
            capturedPromptData = userMsg.content;
          }
        }
        return MOCK_SECTIONS_JSON;
      });
    });

    it('sums by category match hand-calculated fixtures', async () => {
      // Seed 3 expense transactions: food×2, transport×1
      await seedTransaction(handle.db, { userId: 'alice', type: 'expense', amount: 15000, category: 'food', date: '2026-04-01' });
      await seedTransaction(handle.db, { userId: 'alice', type: 'expense', amount: 10000, category: 'food', date: '2026-04-05' });
      await seedTransaction(handle.db, { userId: 'alice', type: 'expense', amount: 30000, category: 'transport', date: '2026-04-10' });

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
        params: { month: '2026-04' },
      };

      await aiReportSvc.generateReport(handle.db, 'alice', payload);

      // capturedPromptData is now exactly the transactionData JSON string
      expect(capturedPromptData).toBeTruthy();
      const aggregated = JSON.parse(capturedPromptData);

      // Hand-calculated:
      //   food expense: 15000 + 10000 = 25000
      //   transport expense: 30000
      //   total expense: 55000, total income: 0
      expect(aggregated.totalExpense).toBe(55000);
      expect(aggregated.totalIncome).toBe(0);
      expect(aggregated.byCategory.food.expense).toBe(25000);
      expect(aggregated.byCategory.transport.expense).toBe(30000);
      expect(aggregated.transactionCount).toBe(3);
    });

    it('excludes transactions outside the date range', async () => {
      // March transaction (outside April range)
      await seedTransaction(handle.db, { userId: 'alice', type: 'expense', amount: 50000, category: 'food', date: '2026-03-31' });
      // April transaction (inside range)
      await seedTransaction(handle.db, { userId: 'alice', type: 'expense', amount: 20000, category: 'food', date: '2026-04-15' });
      // May transaction (outside April range)
      await seedTransaction(handle.db, { userId: 'alice', type: 'expense', amount: 80000, category: 'food', date: '2026-05-01' });

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
        params: { month: '2026-04' },
      };

      await aiReportSvc.generateReport(handle.db, 'alice', payload);

      const aggregated = JSON.parse(capturedPromptData);

      // Only the April transaction should be counted
      expect(aggregated.totalExpense).toBe(20000);
      expect(aggregated.transactionCount).toBe(1);
    });

    it('excludes soft-deleted transactions (deletedAt != null)', async () => {
      // Seed one active and one soft-deleted transaction
      const active = await seedTransaction(handle.db, {
        userId: 'alice',
        type: 'expense',
        amount: 10000,
        category: 'food',
        date: '2026-04-01',
      });
      await seedTransaction(handle.db, {
        userId: 'alice',
        type: 'expense',
        amount: 99999,
        category: 'food',
        date: '2026-04-02',
      });

      // Soft-delete the second transaction directly in the DB
      await handle.db
        .update(transactions)
        .set({ deletedAt: '2026-04-02T10:00:00Z' })
        .where(eq(transactions.userId, 'alice'));

      // Mark only the first one as NOT deleted
      await handle.db
        .update(transactions)
        .set({ deletedAt: null })
        .where(eq(transactions.id, active.id));

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
        params: { month: '2026-04' },
      };

      await aiReportSvc.generateReport(handle.db, 'alice', payload);

      const aggregated = JSON.parse(capturedPromptData);

      // Only the active (non-deleted) transaction should be counted
      expect(aggregated.totalExpense).toBe(10000);
      expect(aggregated.transactionCount).toBe(1);
    });

    it('returns zeroed totals on empty input without throwing', async () => {
      // No transactions seeded for alice
      const payload: ReportPayload = {
        reportType: 'monthly_summary',
        params: { month: '2026-04' },
      };

      const report = await aiReportSvc.generateReport(handle.db, 'alice', payload);

      // Must return valid report structure
      expect(report).toHaveProperty('reportType');
      expect(report).toHaveProperty('sections');

      const aggregated = JSON.parse(capturedPromptData);

      expect(aggregated.totalExpense).toBe(0);
      expect(aggregated.totalIncome).toBe(0);
      expect(aggregated.transactionCount).toBe(0);
    });

    it('does not include other users\' transactions in the aggregation', async () => {
      await seedTransaction(handle.db, { userId: 'alice', type: 'expense', amount: 5000, category: 'food', date: '2026-04-01' });
      await seedTransaction(handle.db, { userId: 'bob', type: 'expense', amount: 999000, category: 'shopping', date: '2026-04-01' });

      const payload: ReportPayload = { reportType: 'monthly_summary' };

      await aiReportSvc.generateReport(handle.db, 'alice', payload);

      const aggregated = JSON.parse(capturedPromptData);

      // Bob's 999000 must not appear
      expect(aggregated.totalExpense).toBe(5000);
      expect(aggregated.byCategory.shopping).toBeUndefined();
    });
  });
});
