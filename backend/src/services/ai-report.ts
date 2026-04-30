import { eq, gte, lte, and, isNull } from 'drizzle-orm';
import type {
  ReportPayload,
  Report,
  ReportSection,
  ReportSummaryData,
  ReportBreakdownItem,
} from '../types/ai';
import { transactions } from '../db/schema';
import type { LLMConfig } from './llm';

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
  constructor(_config: LLMConfig, _ai?: any) {}

  /**
   * Main method: Generate a financial report
   * 2-stage process after the chat parser has selected the report intent:
   * 1. Aggregate transaction data based on the parsed report filters
   * 2. Generate deterministic report sections from the aggregate
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

    // Generate report sections from aggregated data without another LLM call.
    const reportSections = this.generateReportSections(
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

  async generateSummary(
    db: any,
    userId: string,
    reportPayload: ReportPayload
  ): Promise<ReportSummaryData> {
    const { reportType, params } = reportPayload;
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

    return this.buildSummary(reportType, params, transactionData, comparisonData);
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
          : '전체 기간',
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

  private generateReportSections(
    reportType: string,
    transactionData: AggregatedTransactionData
  ): ReportSection[] {
    const data = transactionData;

    const expenseByCategory = Object.entries(data.byCategory)
      .map(([category, totals]) => ({ category, amount: totals.expense }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const labels = expenseByCategory.map((item) => item.category);
    const values = expenseByCategory.map((item) => item.amount);
    const net = data.totalIncome - data.totalExpense;
    const topCategory = expenseByCategory[0];

    const sections: ReportSection[] = [
      {
        type: 'card',
        title: '총 지출',
        subtitle: `${data.dateRange} 기준`,
        metric: this.formatAmount(data.totalExpense),
        trend: 'stable',
        data: { value: data.totalExpense, transactionCount: data.transactionCount },
      },
      {
        type: 'pie',
        title: '카테고리별 지출',
        data: {
          labels: labels.length > 0 ? labels : ['데이터 없음'],
          values: values.length > 0 ? values : [0],
        },
      },
      {
        type: 'bar',
        title: '수입/지출 비교',
        data: { labels: ['수입', '지출'], values: [data.totalIncome, data.totalExpense] },
      },
      {
        type: 'line',
        title: '순현금흐름',
        data: { labels: [String(data.dateRange)], values: [net] },
      },
      {
        type: 'alert',
        title: '상태 점검',
        data: { message: this.buildAlert(data.totalIncome, data.totalExpense, data.transactionCount) },
      },
    ];

    sections.push({
      type: 'suggestion',
      title: this.getSuggestionTitle(reportType),
      data: {
        message: this.buildSuggestion(data.totalIncome, data.totalExpense, topCategory?.category),
      },
    });

    return sections;
  }

  private formatAmount(amount: number): string {
    return `₩${amount.toLocaleString('ko-KR')}`;
  }

  private getSuggestionTitle(reportType: string): string {
    if (reportType === 'anomaly') return '확인할 항목';
    if (reportType === 'suggestion') return '추천 액션';
    return '다음에 해볼 일';
  }

  private buildSuggestion(totalIncome: number, totalExpense: number, topCategory?: string): string {
    if (totalExpense === 0) {
      return '아직 지출 데이터가 적습니다. 거래를 더 기록하면 더 의미 있는 분석을 볼 수 있습니다.';
    }
    if (totalIncome > 0 && totalExpense > totalIncome) {
      return '지출이 수입을 초과했습니다. 고정비와 반복 지출을 먼저 점검해 보세요.';
    }
    if (topCategory) {
      return `${topCategory} 지출 비중이 가장 큽니다. 이번 주에는 이 카테고리 예산을 먼저 확인해 보세요.`;
    }
    return '최근 거래를 꾸준히 기록하면 소비 패턴을 더 정확하게 추적할 수 있습니다.';
  }

  private buildAlert(totalIncome: number, totalExpense: number, transactionCount: number): string {
    if (transactionCount === 0) {
      return '선택한 조건에 해당하는 거래가 없습니다.';
    }
    if (totalIncome > 0 && totalExpense > totalIncome) {
      return '지출이 수입보다 큽니다.';
    }
    return '특이한 위험 신호는 없습니다.';
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
      return `${params.weekStart} ~ ${params.weekEnd} 기준`;
    }
    if (reportType === 'monthly_summary' && params?.month) {
      return `${params.month} 기준`;
    }
    return '전체 기간';
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
      'weekly_summary': `주간 요약`,
      'monthly_summary': `월간 요약`,
      'category_detail': `카테고리 분석`,
      'spending_pattern': `지출 패턴 분석`,
      'anomaly': `이상 지출 탐지`,
      'suggestion': `맞춤 제안`,
    };
    return titles[reportType as keyof typeof titles] || reportType;
  }

  /**
   * Gets report subtitle based on type and params
   */
  private getReportSubtitle(reportType: string, params?: Record<string, unknown>): string | undefined {
    if (params?.month) {
      return `${params.month} 기준`;
    }
    if (params?.weekStart && params?.weekEnd) {
      return `${params.weekStart} ~ ${params.weekEnd} 기준`;
    }
    return undefined;
  }
}

export function createAIReportService(config: LLMConfig): AIReportService {
  return new AIReportService(config);
}
