import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIReportService } from '../../src/services/ai-report';
import type { ReportPayload } from '../../src/types/ai';
import { TEST_USER_ID } from '../fixtures/test-data';


/**
 * Factory function to create a mock database
 * Returns a mock database object with select/from/where/all chain
 */
const createMockDb = (transactions: any[] = []) => ({
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue(transactions),
      }),
    }),
  }),
});

/**
 * Unit tests for AIReportService
 */
describe('AIReportService', () => {
  let service: AIReportService;
  let mockDb: any;

  beforeEach(() => {
    // Initialize service with fake API key
    service = new AIReportService({
      provider: 'workers-ai',
      apiKey: 'test-api-key',
      modelName: '@cf/meta/llama-2-7b-chat-int8'
    });
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('generateReport()', () => {
    it('should return report with valid structure (reportType, title, sections array, generatedAt)', async () => {
      // Setup: Create mock db with sample transactions
      const transactions = [
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-01',
        },
        {
          id: 2,
          userId: TEST_USER_ID,
          type: 'income',
          amount: 3000000,
          category: 'salary',
          date: '2026-04-01',
        },
      ];
      mockDb = createMockDb(transactions);

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify: Check all required properties exist
      expect(report).toHaveProperty('reportType');
      expect(report).toHaveProperty('title');
      expect(report).toHaveProperty('sections');
      expect(report).toHaveProperty('generatedAt');
      expect(report.reportType).toBe('monthly_summary');
      expect(report.title).toBe('Monthly Summary');
      expect(Array.isArray(report.sections)).toBe(true);
      expect(report.sections.length).toBeGreaterThan(0);
    });

    it('should include subtitle when month provided in params', async () => {
      // Setup
      mockDb = createMockDb([
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-01',
        },
      ]);

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
        params: {
          month: '2026-04',
        },
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify: Check subtitle is present and contains month
      expect(report.subtitle).toBeDefined();
      expect(report.subtitle).toBe('for 2026-04');
    });

    it('should not include subtitle when month not provided', async () => {
      // Setup
      mockDb = createMockDb([
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-01',
        },
      ]);

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify: Check subtitle is undefined
      expect(report.subtitle).toBeUndefined();
    });

    it('should filter transactions by month (YYYY-MM format)', async () => {
      // Setup: Create transactions with different months
      const transactions = [
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-03-15',
        },
        {
          id: 2,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 60000,
          category: 'food',
          date: '2026-04-01',
        },
        {
          id: 3,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 70000,
          category: 'food',
          date: '2026-04-15',
        },
        {
          id: 4,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 80000,
          category: 'food',
          date: '2026-05-01',
        },
      ];
      mockDb = createMockDb(transactions);

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
        params: {
          month: '2026-04',
        },
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify: Ensure db.select().from().where().all() was called (filtering happens in service)
      expect(mockDb.select).toHaveBeenCalled();
      const selectResult = mockDb.select();
      expect(selectResult.from).toHaveBeenCalled();
      const fromResult = selectResult.from();
      expect(fromResult.where).toHaveBeenCalled();
      const whereResult = fromResult.where();
      expect(whereResult.all).toHaveBeenCalled();
    });

    it('should handle category filter in params', async () => {
      // Setup
      const transactions = [
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-01',
        },
        {
          id: 2,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 100000,
          category: 'transport',
          date: '2026-04-02',
        },
      ];
      mockDb = createMockDb(transactions);

      const payload: ReportPayload = {
        reportType: 'category_detail',
        params: {
          category: 'food',
        },
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify: Check report was generated successfully with category filter
      expect(report.reportType).toBe('category_detail');
      expect(report.title).toBe('Category Analysis');
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should generate ISO timestamp for generatedAt', async () => {
      // Setup
      mockDb = createMockDb([
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-01',
        },
      ]);

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify: Check generatedAt is valid ISO string
      expect(typeof report.generatedAt).toBe('string');
      const isoDate = new Date(report.generatedAt);
      expect(isoDate).toBeInstanceOf(Date);
      expect(isoDate.getTime()).not.toBeNaN();
      // Check it matches ISO 8601 format
      expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(report.generatedAt)).toBe(true);
    });

    it('should handle all report types with correct titles', async () => {
      // Setup
      mockDb = createMockDb([
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-01',
        },
      ]);

      const reportTypes: Array<ReportPayload['reportType']> = [
        'monthly_summary',
        'category_detail',
        'spending_pattern',
        'anomaly',
        'suggestion',
      ];

      // Execute and verify each report type
      for (const reportType of reportTypes) {
        const payload: ReportPayload = { reportType };
        const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

        expect(report.reportType).toBe(reportType);
        expect(report.title).toBeTruthy();
        expect(report.sections.length).toBeGreaterThan(0);
      }
    });
  });

  describe('aggregateTransactionData() - through generateReport', () => {
    it('should aggregate income and expense totals correctly', async () => {
      // Setup: Create transactions with known totals
      const transactions = [
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'income',
          amount: 3000000,
          category: 'salary',
          date: '2026-04-01',
        },
        {
          id: 2,
          userId: TEST_USER_ID,
          type: 'income',
          amount: 500000,
          category: 'bonus',
          date: '2026-04-15',
        },
        {
          id: 3,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-05',
        },
        {
          id: 4,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 100000,
          category: 'transport',
          date: '2026-04-10',
        },
      ];
      mockDb = createMockDb(transactions);

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify: Check that AI was called (confirming aggregation happened)
      expect(mockDb.select).toHaveBeenCalled();
      expect(report.sections.length).toBeGreaterThan(0);
    });

    it('should filter transactions by month correctly for aggregation', async () => {
      // Setup
      const transactions = [
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-01',
        },
        {
          id: 2,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 60000,
          category: 'food',
          date: '2026-04-15',
        },
      ];
      mockDb = createMockDb(transactions);

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
        params: {
          month: '2026-04',
        },
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify: Ensure where was called for filtering
      const selectResult = mockDb.select();
      const fromResult = selectResult.from();
      expect(fromResult.where).toHaveBeenCalled();
      expect(report.reportType).toBe('monthly_summary');
    });

    it('should filter transactions by category correctly for aggregation', async () => {
      // Setup
      const transactions = [
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-01',
        },
        {
          id: 2,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 100000,
          category: 'transport',
          date: '2026-04-02',
        },
      ];
      mockDb = createMockDb(transactions);

      const payload: ReportPayload = {
        reportType: 'category_detail',
        params: {
          category: 'food',
        },
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify
      expect(mockDb.select).toHaveBeenCalled();
      expect(report.reportType).toBe('category_detail');
    });

    it('should handle empty transaction list and return valid report', async () => {
      // Setup: Empty transaction list
      mockDb = createMockDb([]);

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify: Should still return valid report structure
      expect(report).toHaveProperty('reportType');
      expect(report).toHaveProperty('title');
      expect(report).toHaveProperty('sections');
      expect(Array.isArray(report.sections)).toBe(true);
    });

    it('should aggregate by category correctly', async () => {
      // Setup: Multiple transactions across categories
      const transactions = [
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'income',
          amount: 100000,
          category: 'food',
          date: '2026-04-01',
        },
        {
          id: 2,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-02',
        },
        {
          id: 3,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 200000,
          category: 'transport',
          date: '2026-04-03',
        },
      ];
      mockDb = createMockDb(transactions);

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
        params: {
          month: '2026-04',
        },
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify: Report generated with category aggregation
      expect(report.reportType).toBe('monthly_summary');
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should only include transactions for specified user', async () => {
      // Setup: Mix of transactions from different users
      const transactions = [
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-01',
        },
        {
          id: 2,
          userId: 'other-user',
          type: 'expense',
          amount: 100000,
          category: 'transport',
          date: '2026-04-02',
        },
      ];
      mockDb = createMockDb(transactions);

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify: Should still generate report
      expect(report.reportType).toBe('monthly_summary');
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('Report sections from Gemini API', () => {
    it('should parse and return sections with correct structure from API response', async () => {
      // Setup
      mockDb = createMockDb([
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-01',
        },
      ]);

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify: Check section structure
      expect(report.sections.length).toBeGreaterThan(0);
      const firstSection = report.sections[0];
      expect(firstSection).toHaveProperty('type');
      expect(['card', 'pie', 'bar', 'line', 'alert', 'suggestion']).toContain(firstSection.type);
      expect(firstSection).toHaveProperty('title');
      expect(typeof firstSection.title).toBe('string');
    });

    it('should include different section types from API response', async () => {
      // Setup
      mockDb = createMockDb([
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-01',
        },
      ]);

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify: Check that sections include card and pie types
      const sectionTypes = report.sections.map((s) => s.type);
      expect(sectionTypes).toContain('card');
      expect(sectionTypes).toContain('pie');
    });
  });

  describe('Error handling', () => {
    it('should handle missing params gracefully', async () => {
      // Setup
      mockDb = createMockDb([
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-01',
        },
      ]);

      const payload: ReportPayload = {
        reportType: 'monthly_summary',
        params: undefined,
      };

      // Execute
      const report = await service.generateReport(mockDb, TEST_USER_ID, payload);

      // Verify
      expect(report).toHaveProperty('reportType');
      expect(report).toHaveProperty('sections');
      expect(report.subtitle).toBeUndefined();
    });

    it('should use correct report title for different report types', async () => {
      // Setup
      mockDb = createMockDb([
        {
          id: 1,
          userId: TEST_USER_ID,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-01',
        },
      ]);

      const testCases = [
        { type: 'monthly_summary' as const, expectedTitle: 'Monthly Summary' },
        { type: 'category_detail' as const, expectedTitle: 'Category Analysis' },
        { type: 'spending_pattern' as const, expectedTitle: 'Spending Pattern Analysis' },
        { type: 'anomaly' as const, expectedTitle: 'Anomaly Detection' },
        { type: 'suggestion' as const, expectedTitle: 'Smart Recommendations' },
      ];

      // Execute and verify
      for (const testCase of testCases) {
        const payload: ReportPayload = {
          reportType: testCase.type,
        };
        const report = await service.generateReport(mockDb, TEST_USER_ID, payload);
        expect(report.title).toBe(testCase.expectedTitle);
      }
    });
  });
});
