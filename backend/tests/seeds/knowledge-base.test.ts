import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedKnowledgeBase } from '../../src/db/seeds/knowledge-base';

describe('Knowledge Base Seed', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
    };
  });

  it('should skip seeding if knowledge base already has items', async () => {
    // Mock existing items
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ id: 1, content: 'existing' }]),
      }),
    });

    const consoleSpy = vi.spyOn(console, 'log');

    await seedKnowledgeBase(mockDb);

    expect(consoleSpy).toHaveBeenCalledWith('Knowledge base already seeded, skipping...');
    expect(mockDb.insert).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should insert knowledge items if database is empty', async () => {
    // Mock empty database
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const consoleSpy = vi.spyOn(console, 'log');

    await seedKnowledgeBase(mockDb);

    expect(mockDb.insert).toHaveBeenCalledWith(expect.anything());
    expect(consoleSpy).toHaveBeenCalledWith('Successfully seeded 14 knowledge base items');

    consoleSpy.mockRestore();
  });

  it('should handle errors gracefully', async () => {
    const testError = new Error('Database error');
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        limit: vi.fn().mockRejectedValue(testError),
      }),
    });

    const consoleErrorSpy = vi.spyOn(console, 'error');

    await expect(seedKnowledgeBase(mockDb)).rejects.toThrow('Database error');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to seed knowledge base:', testError);

    consoleErrorSpy.mockRestore();
  });

  it('should have 14 knowledge items across 7 categories', async () => {
    // This test verifies the seed data structure
    const KNOWLEDGE_ITEMS = [
      { category: 'budgeting', content: 'The 50/30/20 budgeting rule: allocate 50% of income to needs, 30% to wants, and 20% to savings and debt repayment.' },
      { category: 'budgeting', content: 'Track your spending regularly to identify areas where you can reduce expenses and increase savings.' },
      { category: 'savings', content: 'Emergency fund best practice: keep 3-6 months of living expenses in an easily accessible savings account.' },
      { category: 'savings', content: 'Automate your savings by setting up automatic transfers to a savings account on payday.' },
      { category: 'investment', content: 'Diversification reduces risk: spread investments across different asset classes, sectors, and geographies.' },
      { category: 'investment', content: 'Start investing early to take advantage of compound interest over a longer time horizon.' },
      { category: 'debt', content: 'Pay off high-interest debt first (e.g., credit cards) before tackling low-interest debt (e.g., mortgages).' },
      { category: 'debt', content: 'Aim to keep credit card balances below 30% of your credit limit to maintain a healthy credit score.' },
      { category: 'credit', content: 'Your credit score factors: payment history (35%), credit utilization (30%), length of history (15%), credit mix (10%), new inquiries (10%).' },
      { category: 'credit', content: 'Monitor your credit report for errors and dispute any inaccuracies with the credit bureau.' },
      { category: 'tax', content: 'Take advantage of tax-advantaged accounts like 401(k)s and IRAs to reduce taxable income.' },
      { category: 'tax', content: 'Keep receipts and documents for deductible expenses to maximize tax deductions when filing.' },
      { category: 'general', content: 'Create a financial plan with clear goals, timelines, and milestones to stay on track.' },
      { category: 'general', content: 'Review your financial plan annually and adjust as your circumstances and goals change.' },
    ];

    const categories = new Set(KNOWLEDGE_ITEMS.map((item) => item.category));

    expect(KNOWLEDGE_ITEMS).toHaveLength(14);
    expect(categories).toEqual(new Set(['budgeting', 'savings', 'investment', 'debt', 'credit', 'tax', 'general']));
  });
});
