import { eq, gte, lte, and } from 'drizzle-orm';
import type { ReportPayload, Report } from '../types/ai';
import { transactions } from '../db/schema';
<<<<<<< HEAD
import { callLLM, type LLMConfig } from './llm';

export class AIReportService {
  private config: LLMConfig;
  private ai?: any;

  constructor(config: LLMConfig, ai?: any) {
    this.config = config;
    this.ai = ai;
=======

export class AIReportService {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'llama-3.1-8b-instant') {
    this.apiKey = apiKey;
    this.modelName = modelName;
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
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

    // Generate report sections using AI
    const reportSections = await this.generateReportSections(
      reportType,
      transactionData
    );

    return {
      reportType,
      title: this.getReportTitle(reportType, params),
      subtitle: this.getReportSubtitle(reportType, params),
      sections: reportSections,
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
  ): Promise<string> {
    // Build query filters
    const filters = [eq(transactions.userId, userId)];

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
      dateRange: params?.month || 'all time',
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

    return JSON.stringify(aggregated);
  }

  /**
   * Calls Groq AI to generate report sections
   * @param reportType - Type of report
   * @param transactionData - Aggregated transaction data as JSON
   * @returns Array of report sections with type, title, data
   */
  private async generateReportSections(
    reportType: string,
    transactionData: string
  ) {
    const prompt = `
You are a financial report generator. Generate a detailed ${reportType} report based on this transaction data:

${transactionData}

Return ONLY valid JSON (no markdown, no code blocks) with this structure:
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

For card sections, include: metric, trend (up/down/stable)
For pie/bar/line sections, include: data with labels and values
For alert sections, include: message about spending anomaly
For suggestion sections, include: message with actionable advice
`;

<<<<<<< HEAD
    const responseText = await callLLM(
      [{ role: 'user', content: prompt }],
      this.config,
      this.ai
    );

    // Parse JSON from response
    const parsed = JSON.parse(responseText);
    return parsed.sections || [];
=======
    // 디버깅용 로그
    const apiKeyMasked = this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'NOT_SET';
    console.log('[Groq Report API] Request params:', {
      apiKey: apiKeyMasked,
      model: this.modelName,
      reportType,
      transactionDataLength: transactionData.length,
    });

    const requestBody = {
      model: this.modelName,
      messages: [{ role: 'user', content: prompt }],
    };

    console.log('[Groq Report API] Request body model:', requestBody.model);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[Groq Report API] Response status:', response.status);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('[Groq Report API] Error details:', {
          status: response.status,
          statusText: response.statusText,
          error: err,
        });
        throw new Error(`Groq API error: ${response.status} ${JSON.stringify(err)}`);
      }

      const data = await response.json() as { choices: { message: { content: string } }[] };
      const responseText = data.choices[0]?.message?.content;
      if (!responseText) throw new Error('No response from AI');

      console.log('[Groq Report API] Successfully parsed response');
      // Parse JSON from response
      const parsed = JSON.parse(responseText);
      return parsed.sections || [];
    } catch (error) {
      console.error('[Groq Report API] Caught error:', error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      } : error);
      throw error;
    }
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
  }

  /**
   * Gets report title based on type and params
   */
  private getReportTitle(reportType: string, params?: Record<string, unknown>): string {
    const titles = {
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
    return undefined;
  }
}

<<<<<<< HEAD
export function createAIReportService(config: LLMConfig): AIReportService {
  return new AIReportService(config);
}
=======
export function createAIReportService(apiKey: string): AIReportService {
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  return new AIReportService(apiKey);
}
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
