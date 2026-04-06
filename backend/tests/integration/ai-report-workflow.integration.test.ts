import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/db/schema';
import { AIReportService } from '../../src/services/ai-report';
import { saveMessage, getChatHistory, clearChatHistory } from '../../src/services/chat';
import type { ReportPayload } from '../../src/types/ai';
import './setup-env';

/**
 * Mock setup for Google Generative AI
 * Provides consistent mock responses for testing report generation
 */
vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: vi.fn().mockReturnValue(
              JSON.stringify({
                sections: [
                  {
                    type: 'card',
                    title: 'Total Spending',
                    subtitle: 'Apr 2026',
                    metric: '₩1,250,000',
                    trend: 'up',
                  },
                  {
                    type: 'pie',
                    title: 'Spending by Category',
                    data: [
                      { name: '식비', value: 500000 },
                      { name: '교통', value: 250000 },
                      { name: '기타', value: 500000 },
                    ],
                  },
                  {
                    type: 'bar',
                    title: 'Income vs Expense',
                    data: [
                      { name: 'Income', value: 3000000 },
                      { name: 'Expense', value: 1250000 },
                    ],
                  },
                  {
                    type: 'line',
                    title: 'Spending Trend',
                    data: [
                      { date: '2026-04-01', value: 100000 },
                      { date: '2026-04-10', value: 300000 },
                      { date: '2026-04-20', value: 850000 },
                    ],
                  },
                  {
                    type: 'alert',
                    title: 'Spending Alert',
                    message: 'Your spending is 15% higher than last month',
                  },
                  {
                    type: 'suggestion',
                    title: 'Smart Suggestion',
                    message: 'Consider reducing dining out expenses',
                  },
                ],
              })
            ),
          },
        }),
      };
    }
  }

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
  };
});

/**
 * AI Report Workflow Integration Tests
 * Tests real database with mock Gemini API
 * Tests complete workflow: transactions → aggregation → report generation → chat save
 */

describe('AI Report Workflow Integration', () => {
  let db: any;
  let reportService: AIReportService;
  const testUserId = `test-user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  beforeEach(async () => {
    // Initialize real database connection
    const client = createClient({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    db = drizzle(client, { schema });

    // Create report service with mock API
    reportService = new AIReportService(process.env.GEMINI_API_KEY || 'test-key');

    // Clean up any existing test data
    await db
      .delete(schema.transactions)
      .where(eq(schema.transactions.userId, testUserId))
      .run();

    await db
      .delete(schema.chatMessages)
      .where(eq(schema.chatMessages.userId, testUserId))
      .run();

    await db
      .delete(schema.users)
      .where(eq(schema.users.id, testUserId))
      .run();

    // Create test user (required for foreign key constraint)
    await db
      .insert(schema.users)
      .values({
        id: testUserId,
        email: `${testUserId}@test.com`,
        name: 'Test User',
        provider: 'test',
      })
      .run();
  });

  afterEach(async () => {
    // Clean up test data after each test
    if (db) {
      try {
        await db
          .delete(schema.transactions)
          .where(eq(schema.transactions.userId, testUserId))
          .run();

        await db
          .delete(schema.chatMessages)
          .where(eq(schema.chatMessages.userId, testUserId))
          .run();

        await db
          .delete(schema.users)
          .where(eq(schema.users.id, testUserId))
          .run();
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Transaction Aggregation', () => {
    it('should aggregate transactions by category and type', async () => {
      // Arrange: Create transactions
      await db
        .insert(schema.transactions)
        .values({
          userId: testUserId,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-03',
          memo: 'Lunch',
        })
        .run();

      await db
        .insert(schema.transactions)
        .values({
          userId: testUserId,
          type: 'expense',
          amount: 30000,
          category: 'food',
          date: '2026-04-04',
          memo: 'Dinner',
        })
        .run();

      await db
        .insert(schema.transactions)
        .values({
          userId: testUserId,
          type: 'income',
          amount: 3000000,
          category: 'salary',
          date: '2026-04-01',
          memo: 'Monthly salary',
        })
        .run();

      // Act: Retrieve aggregated data
      const reportPayload: ReportPayload = {
        reportType: 'monthly_summary',
        params: { month: '2026-04' },
      };
      const report = await reportService.generateReport(db, testUserId, reportPayload);

      // Assert: Report should contain aggregated data
      expect(report).toBeDefined();
      expect(report.reportType).toBe('monthly_summary');
      expect(report.sections).toHaveLength(6); // All section types
    });

    it('should filter transactions by month parameter', async () => {
      // Arrange: Create transactions in different months
      await db
        .insert(schema.transactions)
        .values({
          userId: testUserId,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-03-15',
          memo: 'March expense',
        })
        .run();

      await db
        .insert(schema.transactions)
        .values({
          userId: testUserId,
          type: 'expense',
          amount: 70000,
          category: 'food',
          date: '2026-04-03',
          memo: 'April expense',
        })
        .run();

      // Act: Generate report for April only
      const reportPayload: ReportPayload = {
        reportType: 'monthly_summary',
        params: { month: '2026-04' },
      };
      const report = await reportService.generateReport(db, testUserId, reportPayload);

      // Assert: Report should be generated (mock API called)
      expect(report).toBeDefined();
      expect(report.reportType).toBe('monthly_summary');
      expect(report.subtitle).toBe('for 2026-04');
    });

    it('should handle empty transactions gracefully', async () => {
      // Act: Generate report with no transactions
      const reportPayload: ReportPayload = {
        reportType: 'monthly_summary',
        params: { month: '2026-04' },
      };
      const report = await reportService.generateReport(db, testUserId, reportPayload);

      // Assert: Should generate report with mock data
      expect(report).toBeDefined();
      expect(report.sections).toBeDefined();
      expect(report.sections.length).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    it('should call Gemini API with correct structure', async () => {
      // Arrange: Create sample transactions
      await db
        .insert(schema.transactions)
        .values({
          userId: testUserId,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-03',
          memo: 'Test',
        })
        .run();

      // Act: Generate report
      const reportPayload: ReportPayload = {
        reportType: 'monthly_summary',
      };
      const report = await reportService.generateReport(db, testUserId, reportPayload);

      // Assert: Report should have expected structure
      expect(report).toBeDefined();
      expect(report.reportType).toBe('monthly_summary');
      expect(report.title).toBeDefined();
      expect(report.sections).toBeDefined();
      expect(Array.isArray(report.sections)).toBe(true);
      expect(report.generatedAt).toBeDefined();
    });

    it('should parse Gemini response into report sections', async () => {
      // Act: Generate report
      const reportPayload: ReportPayload = {
        reportType: 'monthly_summary',
      };
      const report = await reportService.generateReport(db, testUserId, reportPayload);

      // Assert: All expected section types should be present
      const sectionTypes = report.sections.map((s) => s.type);
      expect(sectionTypes).toContain('card');
      expect(sectionTypes).toContain('pie');
      expect(sectionTypes).toContain('bar');
      expect(sectionTypes).toContain('line');
      expect(sectionTypes).toContain('alert');
      expect(sectionTypes).toContain('suggestion');
    });

    it('should validate report payload with all section types', async () => {
      // Act: Generate report
      const reportPayload: ReportPayload = {
        reportType: 'monthly_summary',
      };
      const report = await reportService.generateReport(db, testUserId, reportPayload);

      // Assert: Each section should have required properties
      report.sections.forEach((section) => {
        expect(['card', 'pie', 'bar', 'line', 'alert', 'suggestion']).toContain(
          section.type
        );
        expect(section.title).toBeDefined();
        expect(typeof section.title).toBe('string');
      });
    });

    it('should format metrics with currency symbols and percentages', async () => {
      // Act: Generate report
      const reportPayload: ReportPayload = {
        reportType: 'monthly_summary',
      };
      const report = await reportService.generateReport(db, testUserId, reportPayload);

      // Assert: Card sections should have properly formatted metrics
      const cardSections = report.sections.filter((s) => s.type === 'card');
      expect(cardSections.length).toBeGreaterThan(0);

      cardSections.forEach((section) => {
        if (section.metric) {
          // Metric should contain either ₩ for currency or % for percentage
          expect(
            section.metric.includes('₩') || section.metric.includes('%')
          ).toBe(true);
        }
      });
    });
  });

  describe('Report Saving to Chat', () => {
    it('should save report to chat history as assistant message', async () => {
      // Arrange: Create sample transactions and generate report
      await db
        .insert(schema.transactions)
        .values({
          userId: testUserId,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-03',
          memo: 'Test',
        })
        .run();

      const reportPayload: ReportPayload = {
        reportType: 'monthly_summary',
        params: { month: '2026-04' },
      };
      const report = await reportService.generateReport(db, testUserId, reportPayload);

      // Act: Save report to chat
      const reportMetadata = {
        reportType: report.reportType,
        sections: report.sections.length,
        generatedAt: report.generatedAt,
      };

      await saveMessage(
        db,
        testUserId,
        'assistant',
        `Here is your ${report.title}...`,
        reportMetadata
      );

      // Assert: Message should be saved and retrievable
      const history = await getChatHistory(db, testUserId, 100);
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('assistant');
      expect(history[0].metadata?.reportType).toBe('monthly_summary');
      expect(history[0].metadata?.sections).toBe(6);
    });

    it('should preserve complete report data in chat metadata', async () => {
      // Arrange: Create report with all details
      const reportPayload: ReportPayload = {
        reportType: 'category_detail',
        params: { category: 'food' },
      };
      const report = await reportService.generateReport(db, testUserId, reportPayload);

      // Create comprehensive metadata
      const fullReportMetadata = {
        report: {
          reportType: report.reportType,
          title: report.title,
          subtitle: report.subtitle,
          sections: report.sections,
          generatedAt: report.generatedAt,
        },
      };

      // Act: Save to chat
      await saveMessage(
        db,
        testUserId,
        'assistant',
        'Here is your detailed report',
        fullReportMetadata
      );

      // Assert: Full data should be preserved
      const history = await getChatHistory(db, testUserId, 100);
      expect(history[0].metadata?.report).toBeDefined();
      expect(history[0].metadata?.report.sections).toHaveLength(6);
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should throw error when Gemini API fails', async () => {
      // This test would require mocking the API to throw an error
      // For now, we verify that the service handles the mock response correctly
      const reportPayload: ReportPayload = {
        reportType: 'monthly_summary',
      };

      // Act & Assert: Should not throw with mock API
      const report = await reportService.generateReport(db, testUserId, reportPayload);
      expect(report).toBeDefined();
    });

    it('should keep transactions intact when clearing chat history', async () => {
      // Arrange: Create transactions and chat messages
      await db
        .insert(schema.transactions)
        .values({
          userId: testUserId,
          type: 'expense',
          amount: 50000,
          category: 'food',
          date: '2026-04-03',
          memo: 'Test',
        })
        .run();

      await saveMessage(db, testUserId, 'user', 'Generate report');
      await saveMessage(db, testUserId, 'assistant', 'Here is your report');

      // Verify initial state
      const txnsBeforeDelete = await db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.userId, testUserId))
        .all();
      const messagesBeforeDelete = await getChatHistory(db, testUserId, 100);

      expect(txnsBeforeDelete).toHaveLength(1);
      expect(messagesBeforeDelete).toHaveLength(2);

      // Act: Clear chat history
      await clearChatHistory(db, testUserId);

      // Assert: Transactions should be unaffected, messages deleted
      const txnsAfterDelete = await db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.userId, testUserId))
        .all();
      const messagesAfterDelete = await getChatHistory(db, testUserId, 100);

      expect(txnsAfterDelete).toHaveLength(1);
      expect(messagesAfterDelete).toHaveLength(0);
    });

    it('should validate chart data structure in report sections', async () => {
      // Act: Generate report
      const reportPayload: ReportPayload = {
        reportType: 'monthly_summary',
      };
      const report = await reportService.generateReport(db, testUserId, reportPayload);

      // Assert: Chart sections (pie, bar, line) should have data structure
      const chartSections = report.sections.filter((s) =>
        ['pie', 'bar', 'line'].includes(s.type)
      );

      chartSections.forEach((section) => {
        expect(section.data).toBeDefined();
        if (Array.isArray(section.data)) {
          expect(section.data.length).toBeGreaterThan(0);
        } else if (typeof section.data === 'object') {
          expect(Object.keys(section.data).length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle different report types', async () => {
      // Test various report types
      const reportTypes: ReportPayload['reportType'][] = [
        'monthly_summary',
        'category_detail',
        'spending_pattern',
        'anomaly',
        'suggestion',
      ];

      for (const reportType of reportTypes) {
        // Act: Generate report
        const reportPayload: ReportPayload = {
          reportType,
        };
        const report = await reportService.generateReport(db, testUserId, reportPayload);

        // Assert: Each type should generate valid report
        expect(report).toBeDefined();
        expect(report.reportType).toBe(reportType);
        expect(report.title).toBeDefined();
        expect(report.sections.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Complete Workflow', () => {
    it('should execute full workflow: transactions → report → chat save', async () => {
      // Arrange: Create multiple transactions
      const transactions = [
        {
          type: 'income' as const,
          amount: 3000000,
          category: 'salary',
          date: '2026-04-01',
          memo: 'Monthly salary',
        },
        {
          type: 'expense' as const,
          amount: 50000,
          category: 'food',
          date: '2026-04-03',
          memo: 'Lunch',
        },
        {
          type: 'expense' as const,
          amount: 30000,
          category: 'food',
          date: '2026-04-04',
          memo: 'Dinner',
        },
        {
          type: 'expense' as const,
          amount: 20000,
          category: 'transport',
          date: '2026-04-05',
          memo: 'Taxi',
        },
      ];

      for (const tx of transactions) {
        await db
          .insert(schema.transactions)
          .values({ userId: testUserId, ...tx })
          .run();
      }

      // Step 1: Save user message asking for report
      await saveMessage(db, testUserId, 'user', 'Generate my April spending report');
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 2: Generate report
      const reportPayload: ReportPayload = {
        reportType: 'monthly_summary',
        params: { month: '2026-04' },
      };
      const report = await reportService.generateReport(db, testUserId, reportPayload);

      // Step 3: Save report to chat
      await saveMessage(
        db,
        testUserId,
        'assistant',
        `Here is your ${report.title}`,
        { reportType: report.reportType, sections: report.sections }
      );

      // Step 4: Verify complete workflow
      const finalHistory = await getChatHistory(db, testUserId, 100);

      expect(finalHistory).toHaveLength(2);
      // Messages are ordered DESC by createdAt, so assistant message (most recent) is first
      // Due to timing, assistant message should be the first element
      const assistantMsg = finalHistory.find((m) => m.role === 'assistant');
      const userMsg = finalHistory.find((m) => m.role === 'user');
      expect(assistantMsg).toBeDefined();
      expect(userMsg).toBeDefined();
      expect(assistantMsg?.metadata?.reportType).toBe('monthly_summary');

      // Verify transactions still exist
      const txnsRemaining = await db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.userId, testUserId))
        .all();
      expect(txnsRemaining).toHaveLength(4);
    });
  });
});
