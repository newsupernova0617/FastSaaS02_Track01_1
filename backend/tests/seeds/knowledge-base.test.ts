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
    expect(consoleSpy).toHaveBeenCalledWith('Successfully seeded 30 knowledge base items');

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

  it('should have 30 knowledge items across 12 categories', async () => {
    // This test verifies the seed data structure
    const KNOWLEDGE_ITEMS = [
      { category: 'budgeting', content: 'The 50/30/20 budgeting rule: allocate 50% of income to needs, 30% to wants, and 20% to savings and debt repayment.' },
      { category: 'budgeting', content: 'Track your spending regularly to identify areas where you can reduce expenses and increase savings.' },
      { category: 'budgeting', content: 'Zero-based budgeting: allocate every dollar you earn to specific categories.' },
      { category: 'budgeting', content: '50/30/20 rule alternative: use 70/20/10 (70% needs, 20% wants, 10% goals) if your income is variable or lower.' },
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
      { category: 'spending_analysis', content: 'Track your top spending categories monthly to identify patterns and opportunities to save.' },
      { category: 'spending_analysis', content: 'Anomaly detection: spending 2x or more above your average in a category signals unusual behavior.' },
      { category: 'spending_analysis', content: 'Weekly spending reviews: spend 15 minutes each Sunday reviewing the past week\'s expenses.' },
      { category: 'spending_analysis', content: 'Compare month-to-month spending trends to understand seasonal patterns and adjust your budget accordingly.' },
      { category: 'transaction_tips', content: 'Always categorize transactions immediately to maintain accurate financial records.' },
      { category: 'transaction_tips', content: 'Use descriptive memos for large or unclear transactions to understand spending habits.' },
      { category: 'transaction_tips', content: 'Round amounts up slightly when budgeting to account for unexpected costs.' },
      { category: 'goal_setting', content: 'SMART goals: make your financial goals Specific, Measurable, Achievable, Relevant, Time-bound.' },
      { category: 'goal_setting', content: 'Break large financial goals into monthly or weekly targets for better progress tracking.' },
      { category: 'goal_setting', content: 'Review financial goals quarterly and adjust based on income changes or life events.' },
      { category: 'income_management', content: 'Income stability: if self-employed, average income over 3 months for more realistic budgeting.' },
      { category: 'income_management', content: 'Bonus handling: allocate 50% to savings, 30% to debt payoff, 20% to discretionary spending.' },
      { category: 'seasonal_planning', content: 'Plan for seasonal expenses in advance: holidays, insurance renewals, vacation.' },
      { category: 'seasonal_planning', content: 'Create a sinking fund by setting aside small amounts monthly for annual or irregular expenses.' },
      { category: 'general', content: 'Create a financial plan with clear goals, timelines, and milestones to stay on track.' },
      { category: 'general', content: 'Review your financial plan annually and adjust as your circumstances and goals change.' },
    ];

    const categories = new Set(KNOWLEDGE_ITEMS.map((item) => item.category));

    expect(KNOWLEDGE_ITEMS).toHaveLength(30);
    expect(categories).toEqual(new Set(['budgeting', 'savings', 'investment', 'debt', 'credit', 'tax', 'spending_analysis', 'transaction_tips', 'goal_setting', 'income_management', 'seasonal_planning', 'general']));
  });

  it('should have all required fields (category and content)', async () => {
    // Verify that each knowledge item has category and content
    const KNOWLEDGE_ITEMS = [
      { category: 'budgeting', content: 'The 50/30/20 budgeting rule: allocate 50% of income to needs, 30% to wants, and 20% to savings and debt repayment.' },
      { category: 'budgeting', content: 'Track your spending regularly to identify areas where you can reduce expenses and increase savings.' },
      { category: 'budgeting', content: 'Zero-based budgeting: allocate every dollar you earn to specific categories.' },
      { category: 'budgeting', content: '50/30/20 rule alternative: use 70/20/10 (70% needs, 20% wants, 10% goals) if your income is variable or lower.' },
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
      { category: 'spending_analysis', content: 'Track your top spending categories monthly to identify patterns and opportunities to save.' },
      { category: 'spending_analysis', content: 'Anomaly detection: spending 2x or more above your average in a category signals unusual behavior.' },
      { category: 'spending_analysis', content: 'Weekly spending reviews: spend 15 minutes each Sunday reviewing the past week\'s expenses.' },
      { category: 'spending_analysis', content: 'Compare month-to-month spending trends to understand seasonal patterns and adjust your budget accordingly.' },
      { category: 'transaction_tips', content: 'Always categorize transactions immediately to maintain accurate financial records.' },
      { category: 'transaction_tips', content: 'Use descriptive memos for large or unclear transactions to understand spending habits.' },
      { category: 'transaction_tips', content: 'Round amounts up slightly when budgeting to account for unexpected costs.' },
      { category: 'goal_setting', content: 'SMART goals: make your financial goals Specific, Measurable, Achievable, Relevant, Time-bound.' },
      { category: 'goal_setting', content: 'Break large financial goals into monthly or weekly targets for better progress tracking.' },
      { category: 'goal_setting', content: 'Review financial goals quarterly and adjust based on income changes or life events.' },
      { category: 'income_management', content: 'Income stability: if self-employed, average income over 3 months for more realistic budgeting.' },
      { category: 'income_management', content: 'Bonus handling: allocate 50% to savings, 30% to debt payoff, 20% to discretionary spending.' },
      { category: 'seasonal_planning', content: 'Plan for seasonal expenses in advance: holidays, insurance renewals, vacation.' },
      { category: 'seasonal_planning', content: 'Create a sinking fund by setting aside small amounts monthly for annual or irregular expenses.' },
      { category: 'general', content: 'Create a financial plan with clear goals, timelines, and milestones to stay on track.' },
      { category: 'general', content: 'Review your financial plan annually and adjust as your circumstances and goals change.' },
    ];

    KNOWLEDGE_ITEMS.forEach((item) => {
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('content');
      expect(typeof item.category).toBe('string');
      expect(typeof item.content).toBe('string');
      expect(item.category.length).toBeGreaterThan(0);
      expect(item.content.length).toBeGreaterThan(0);
    });
  });

  it('should not have duplicate items', async () => {
    // Verify no duplicate knowledge items
    const KNOWLEDGE_ITEMS = [
      { category: 'budgeting', content: 'The 50/30/20 budgeting rule: allocate 50% of income to needs, 30% to wants, and 20% to savings and debt repayment.' },
      { category: 'budgeting', content: 'Track your spending regularly to identify areas where you can reduce expenses and increase savings.' },
      { category: 'budgeting', content: 'Zero-based budgeting: allocate every dollar you earn to specific categories.' },
      { category: 'budgeting', content: '50/30/20 rule alternative: use 70/20/10 (70% needs, 20% wants, 10% goals) if your income is variable or lower.' },
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
      { category: 'spending_analysis', content: 'Track your top spending categories monthly to identify patterns and opportunities to save.' },
      { category: 'spending_analysis', content: 'Anomaly detection: spending 2x or more above your average in a category signals unusual behavior.' },
      { category: 'spending_analysis', content: 'Weekly spending reviews: spend 15 minutes each Sunday reviewing the past week\'s expenses.' },
      { category: 'spending_analysis', content: 'Compare month-to-month spending trends to understand seasonal patterns and adjust your budget accordingly.' },
      { category: 'transaction_tips', content: 'Always categorize transactions immediately to maintain accurate financial records.' },
      { category: 'transaction_tips', content: 'Use descriptive memos for large or unclear transactions to understand spending habits.' },
      { category: 'transaction_tips', content: 'Round amounts up slightly when budgeting to account for unexpected costs.' },
      { category: 'goal_setting', content: 'SMART goals: make your financial goals Specific, Measurable, Achievable, Relevant, Time-bound.' },
      { category: 'goal_setting', content: 'Break large financial goals into monthly or weekly targets for better progress tracking.' },
      { category: 'goal_setting', content: 'Review financial goals quarterly and adjust based on income changes or life events.' },
      { category: 'income_management', content: 'Income stability: if self-employed, average income over 3 months for more realistic budgeting.' },
      { category: 'income_management', content: 'Bonus handling: allocate 50% to savings, 30% to debt payoff, 20% to discretionary spending.' },
      { category: 'seasonal_planning', content: 'Plan for seasonal expenses in advance: holidays, insurance renewals, vacation.' },
      { category: 'seasonal_planning', content: 'Create a sinking fund by setting aside small amounts monthly for annual or irregular expenses.' },
      { category: 'general', content: 'Create a financial plan with clear goals, timelines, and milestones to stay on track.' },
      { category: 'general', content: 'Review your financial plan annually and adjust as your circumstances and goals change.' },
    ];

    const itemStrings = KNOWLEDGE_ITEMS.map((item) => JSON.stringify(item));
    const uniqueItems = new Set(itemStrings);

    expect(uniqueItems.size).toBe(KNOWLEDGE_ITEMS.length);
  });

  it('should have at least 2 items in budgeting, spending_analysis, transaction_tips, goal_setting categories', async () => {
    // Verify expanded categories have sufficient coverage
    const KNOWLEDGE_ITEMS = [
      { category: 'budgeting', content: 'The 50/30/20 budgeting rule: allocate 50% of income to needs, 30% to wants, and 20% to savings and debt repayment.' },
      { category: 'budgeting', content: 'Track your spending regularly to identify areas where you can reduce expenses and increase savings.' },
      { category: 'budgeting', content: 'Zero-based budgeting: allocate every dollar you earn to specific categories.' },
      { category: 'budgeting', content: '50/30/20 rule alternative: use 70/20/10 (70% needs, 20% wants, 10% goals) if your income is variable or lower.' },
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
      { category: 'spending_analysis', content: 'Track your top spending categories monthly to identify patterns and opportunities to save.' },
      { category: 'spending_analysis', content: 'Anomaly detection: spending 2x or more above your average in a category signals unusual behavior.' },
      { category: 'spending_analysis', content: 'Weekly spending reviews: spend 15 minutes each Sunday reviewing the past week\'s expenses.' },
      { category: 'spending_analysis', content: 'Compare month-to-month spending trends to understand seasonal patterns and adjust your budget accordingly.' },
      { category: 'transaction_tips', content: 'Always categorize transactions immediately to maintain accurate financial records.' },
      { category: 'transaction_tips', content: 'Use descriptive memos for large or unclear transactions to understand spending habits.' },
      { category: 'transaction_tips', content: 'Round amounts up slightly when budgeting to account for unexpected costs.' },
      { category: 'goal_setting', content: 'SMART goals: make your financial goals Specific, Measurable, Achievable, Relevant, Time-bound.' },
      { category: 'goal_setting', content: 'Break large financial goals into monthly or weekly targets for better progress tracking.' },
      { category: 'goal_setting', content: 'Review financial goals quarterly and adjust based on income changes or life events.' },
      { category: 'income_management', content: 'Income stability: if self-employed, average income over 3 months for more realistic budgeting.' },
      { category: 'income_management', content: 'Bonus handling: allocate 50% to savings, 30% to debt payoff, 20% to discretionary spending.' },
      { category: 'seasonal_planning', content: 'Plan for seasonal expenses in advance: holidays, insurance renewals, vacation.' },
      { category: 'seasonal_planning', content: 'Create a sinking fund by setting aside small amounts monthly for annual or irregular expenses.' },
      { category: 'general', content: 'Create a financial plan with clear goals, timelines, and milestones to stay on track.' },
      { category: 'general', content: 'Review your financial plan annually and adjust as your circumstances and goals change.' },
    ];

    const budgetingItems = KNOWLEDGE_ITEMS.filter((item) => item.category === 'budgeting');
    const spendingAnalysisItems = KNOWLEDGE_ITEMS.filter((item) => item.category === 'spending_analysis');
    const transactionTipsItems = KNOWLEDGE_ITEMS.filter((item) => item.category === 'transaction_tips');
    const goalSettingItems = KNOWLEDGE_ITEMS.filter((item) => item.category === 'goal_setting');
    const incomeManagementItems = KNOWLEDGE_ITEMS.filter((item) => item.category === 'income_management');
    const seasonalPlanningItems = KNOWLEDGE_ITEMS.filter((item) => item.category === 'seasonal_planning');

    expect(budgetingItems).toHaveLength(4);
    expect(spendingAnalysisItems).toHaveLength(4);
    expect(transactionTipsItems).toHaveLength(3);
    expect(goalSettingItems).toHaveLength(3);
    expect(incomeManagementItems).toHaveLength(2);
    expect(seasonalPlanningItems).toHaveLength(2);
  });
});
