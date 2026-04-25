import { eq, gte, lte, and, isNull } from 'drizzle-orm';
import type {
  ReportPayload,
  Report,
  ReportSummaryData,
  ReportBreakdownItem,
} from '../types/ai';
import { transactions } from '../db/schema';
import { callLLM, type LLMConfig } from './llm';

interface AggregatedTransactionData {
  totalIncome: number;
  totalExpense: number;
  byCategory: Record<string, { income: number; expense: number }>;
  transactionCount: number;
  dateRange: string;
  weekStart?: string;
  weekEnd?: string;
  month?: string;
}

export class AIReportService {
  private config: LLMConfig;
  private ai?: any;

  constructor(config: LLMConfig, ai?: any) {
    this.config = config;
    this.ai = ai;
  }

  /**
   * Main method: Generate a financial report
   * 2-stage process:
   * 1. Parse user intent + params to determine report type and filters
   * 2. Aggregate transaction data and call AI to generate report sections
   * @param db - Database instance
   * @param userId - User ID to generate report for
   * @param reportPayload - Parsed report request with type and params
   * @returns Structured Report object with title and sections
   */
  async generateReport(
    db: any,
    userId: string,
    reportPayload: ReportPayload
  ): Promise<Report> {
    // Stage 1: Determine report type and filters
    const { reportType, params } = reportPayload;

    // Stage 2: Aggregate data based on params
    const transactionData = await this.aggregateTransactionData(
      db,
      userId,
      reportType,
      params
    );
    const comparisonParams = this.getComparisonParams(reportType, params);
    const comparisonData = comparisonParams
      ? await this.aggregateTransactionData(db, userId, reportType, comparisonParams)
      : null;

    // Generate report sections using AI
    const reportSections = await this.generateReportSections(
      reportType,
      transactionData
    );
    const summary = this.buildSummary(reportType, params, transactionData, comparisonData);

    return {
      reportType,
      title: this.getReportTitle(reportType, params),
      subtitle: this.getReportSubtitle(reportType, params),
      sections: reportSections,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Aggregates transaction data for report generation
   * @param db - Database instance
   * @param userId - User ID
   * @param reportType - Type of report being generated
   * @param params - Optional filters (month, category)
   * @returns Aggregated transaction data as JSON string
   */
  private async aggregateTransactionData(
    db: any,
    userId: string,
    reportType: string,
    params?: Record<string, unknown>
  ): Promise<AggregatedTransactionData> {
    // Build query filters
    const filters = [eq(transactions.userId, userId), isNull(transactions.deletedAt)];

    if (params?.month) {
      const month = params.month as string;
      const [year, monthNum] = month.split('-');
      const startDate = `${year}-${monthNum}-01`;
      const endDate = new Date(parseInt(year), parseInt(monthNum), 1);
      endDate.setDate(endDate.getDate() - 1);
      const endDateStr = endDate.toISOString().split('T')[0];

      filters.push(gte(transactions.date, startDate));
      filters.push(lte(transactions.date, endDateStr));
    }

    if (params?.weekStart && params?.weekEnd) {
      filters.push(gte(transactions.date, params.weekStart as string));
      filters.push(lte(transactions.date, params.weekEnd as string));
    }

    if (params?.category) {
      filters.push(eq(transactions.category, params.category as string));
    }

    // Fetch transactions
    const txns = await db
      .select()
      .from(transactions)
      .where(and(...filters))
      .all();

    // Aggregate by type and category
    const aggregated = {
      totalIncome: 0,
      totalExpense: 0,
      byCategory: {} as Record<string, { income: number; expense: number }>,
      transactionCount: txns.length,
      dateRange: params?.month
        ? String(params.month)
        : params?.weekStart && params?.weekEnd
          ? `${params.weekStart} - ${params.weekEnd}`
          : 'all time',
      weekStart: params?.weekStart ? String(params.weekStart) : undefined,
      weekEnd: params?.weekEnd ? String(params.weekEnd) : undefined,
      month: params?.month ? String(params.month) : undefined,
    };

    txns.forEach((txn: any) => {
      if (txn.type === 'income') aggregated.totalIncome += txn.amount;
      else aggregated.totalExpense += txn.amount;

      if (!aggregated.byCategory[txn.category]) {
        aggregated.byCategory[txn.category] = { income: 0, expense: 0 };
      }
      if (txn.type === 'income') aggregated.byCategory[txn.category].income += txn.amount;
      else aggregated.byCategory[txn.category].expense += txn.amount;
    });

    return aggregated;
  }

  /**
   * Calls Groq AI to generate report sections
   * @param reportType - Type of report
   * @param transactionData - Aggregated transaction data as JSON
   * @returns Array of report sections with type, title, data
   */
  private async generateReportSections(
    reportType: string,
    transactionData: AggregatedTransactionData
  ) {
    const transactionDataText = JSON.stringify(transactionData);
    const prompt = `
You are a financial report generator. Generate a detailed ${reportType} report based on this transaction data:

${transactionDataText}

CRITICAL REQUIREMENTS:
1. Return ONLY and ALWAYS valid JSON in the "sections" object - NEVER explanations or reasoning
2. Do NOT wrap JSON in markdown code blocks or any text
3. Do NOT include any text outside the JSON object
4. Every response MUST be parseable by JSON.parse()

Structure (fill in all required fields):
{
  "sections": [
    {
      "type": "card|pie|bar|line|alert|suggestion",
      "title": "Section Title",
      "subtitle": "Optional subtitle",
      "metric": "₩123,456 or 12.3%",
      "trend": "up|down|stable",
      "data": { /* type-specific data */ }
    }
  ]
}

Detailed requirements per type:
- card: MUST include metric (string with ₩) and trend (up/down/stable)
- pie/bar/line: MUST include data with {"labels": [...], "values": [...]}
- alert: MUST include data with {"message": "alert text about anomaly"}
- suggestion: MUST include data with {"message": "actionable advice text"}

Generate at least 3 sections. Start with JSON directly, no preamble.
`;

    const responseText = await callLLM(
      [{ role: 'user', content: prompt }],
      this.config,
      this.ai
    );

    // Parse JSON from response
    const parsed = JSON.parse(responseText);
    return parsed.sections || [];
  }

  private buildSummary(
    reportType: string,
    params: Record<string, unknown> | undefined,
    current: AggregatedTransactionData,
    previous: AggregatedTransactionData | null,
  ): ReportSummaryData {
    const expenseBase = current.totalExpense > 0 ? current.totalExpense : current.totalIncome;
    const breakdown = this.buildBreakdown(current.byCategory, expenseBase);
    const deltaPercent = this.buildDeltaPercent(current, previous);
    const insight = this.buildInsight(reportType, current, deltaPercent, breakdown);

    return {
      periodLabel: this.getSummaryPeriodLabel(reportType, params),
      totalExpense: current.totalExpense,
      totalIncome: current.totalIncome,
      netAmount: current.totalIncome - current.totalExpense,
      deltaPercent,
      insight,
      breakdown,
    };
  }

  private buildBreakdown(
    byCategory: AggregatedTransactionData['byCategory'],
    baseAmount: number,
  ): ReportBreakdownItem[] {
    return Object.entries(byCategory)
      .map(([label, value]) => ({ label, amount: value.expense }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map((item) => ({
        label: item.label,
        amount: item.amount,
        ratio: baseAmount > 0 ? Math.round((item.amount / baseAmount) * 100) : 0,
      }));
  }

  private buildDeltaPercent(
    current: AggregatedTransactionData,
    previous: AggregatedTransactionData | null,
  ): number | undefined {
    const prevExpense = previous?.totalExpense ?? 0;
    if (!previous || prevExpense <= 0) return undefined;
    const delta = ((current.totalExpense - prevExpense) / prevExpense) * 100;
    return Number.isFinite(delta) ? Number(delta.toFixed(1)) : undefined;
  }

  private buildInsight(
    reportType: string,
    current: AggregatedTransactionData,
    deltaPercent: number | undefined,
    breakdown: ReportBreakdownItem[],
  ): string | undefined {
    if (breakdown.length === 0 && current.totalExpense === 0 && current.totalIncome === 0) {
      return '아직 분석할 거래가 충분하지 않습니다.';
    }

    const top = breakdown[0];
    const periodLabel = reportType === 'weekly_summary' ? '이번 주' : '이번 달';

    if (top && deltaPercent != null) {
      const direction = deltaPercent >= 0 ? '늘었습니다' : '줄었습니다';
      return `${periodLabel}은 ${top.label} 지출이 가장 컸고, 지난 기간보다 ${Math.abs(deltaPercent).toFixed(1)}% ${direction}.`;
    }

    if (top) {
      return `${periodLabel}은 ${top.label} 지출이 가장 큰 비중을 차지합니다.`;
    }

    return undefined;
  }

  private getSummaryPeriodLabel(
    reportType: string,
    params?: Record<string, unknown>,
  ): string {
    if (reportType === 'weekly_summary' && params?.weekStart && params?.weekEnd) {
      return `${params.weekStart} - ${params.weekEnd}`;
    }
    if (reportType === 'monthly_summary' && params?.month) {
      return String(params.month);
    }
    return 'all time';
  }

  private getComparisonParams(
    reportType: string,
    params?: Record<string, unknown>,
  ): Record<string, unknown> | null {
    if (reportType === 'weekly_summary' && params?.weekStart && params?.weekEnd) {
      const weekStart = new Date(String(params.weekStart));
      const prevStart = new Date(weekStart);
      prevStart.setDate(prevStart.getDate() - 7);
      const prevEnd = new Date(weekStart);
      prevEnd.setDate(prevEnd.getDate() - 1);
      return {
        weekStart: prevStart.toISOString().split('T')[0],
        weekEnd: prevEnd.toISOString().split('T')[0],
      };
    }

    if (reportType === 'monthly_summary' && params?.month) {
      const [year, month] = String(params.month).split('-').map((value) => parseInt(value, 10));
      if (Number.isFinite(year) && Number.isFinite(month)) {
        const prevMonth = new Date(year, month - 1, 1);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        return {
          month: `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`,
        };
      }
    }

    return null;
  }

  /**
   * Gets report title based on type and params
   */
  private getReportTitle(reportType: string, params?: Record<string, unknown>): string {
    const titles = {
      'weekly_summary': `Weekly Summary`,
      'monthly_summary': `Monthly Summary`,
      'category_detail': `Category Analysis`,
      'spending_pattern': `Spending Pattern Analysis`,
      'anomaly': `Anomaly Detection`,
      'suggestion': `Smart Recommendations`,
    };
    return titles[reportType as keyof typeof titles] || reportType;
  }

  /**
   * Gets report subtitle based on type and params
   */
  private getReportSubtitle(reportType: string, params?: Record<string, unknown>): string | undefined {
    if (params?.month) {
      return `for ${params.month}`;
    }
    if (params?.weekStart && params?.weekEnd) {
      return `for ${params.weekStart} to ${params.weekEnd}`;
    }
    return undefined;
  }
}

export function createAIReportService(config: LLMConfig): AIReportService {
  return new AIReportService(config);
}
