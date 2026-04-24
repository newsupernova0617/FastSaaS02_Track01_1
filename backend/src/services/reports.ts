import { sql } from 'drizzle-orm';
import { reports } from '../db/schema';
import type { Report, NewReport } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

export interface SaveReportInput {
  reportType: string;
  title: string;
  subtitle?: string;
  reportData: Record<string, unknown>[];
  params: Record<string, unknown>;
}

export interface ReportSummary {
  id: number;
  reportType: string;
  title: string;
  subtitle?: string;
  createdAt: string;
}

export class ReportService {
  constructor(private db: any) {}

  async saveReport(userId: string, input: SaveReportInput): Promise<Report> {
    const result = await this.db
      .insert(reports)
      .values({
        userId,
        reportType: input.reportType,
        title: input.title,
        subtitle: input.subtitle || null,
        reportData: JSON.stringify(input.reportData),
        params: JSON.stringify(input.params),
      })
      .returning();

    return result[0];
  }

  async getReports(userId: string, month?: string, limit: number = 50): Promise<ReportSummary[]> {
    let query = this.db
      .select({
        id: reports.id,
        reportType: reports.reportType,
        title: reports.title,
        subtitle: reports.subtitle,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(eq(reports.userId, userId))
      .orderBy(desc(reports.createdAt))
      .limit(limit);

    if (month) {
      // Filter by month (YYYY-MM format)
      query = query.where(
        and(
          eq(reports.userId, userId),
          sql`${reports.createdAt} LIKE ${`${month}%`}`
        )
      );
    }

    return query;
  }

  async getReportDetail(userId: string, reportId: number): Promise<Report | null> {
    const result = await this.db
      .select()
      .from(reports)
      .where(and(
        eq(reports.id, reportId),
        eq(reports.userId, userId)
      ));

    return result[0] || null;
  }

  async deleteReport(userId: string, reportId: number): Promise<boolean> {
    const result = await this.db
      .delete(reports)
      .where(and(
        eq(reports.id, reportId),
        eq(reports.userId, userId)
      ));

    return result.rowsAffected > 0;
  }
}

export async function updateReportTitle(
  db: any,
  userId: string,
  reportId: number,
  newTitle: string,
): Promise<Report> {
  // Validate title
  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle || trimmedTitle.length === 0) {
    throw new Error('Report title cannot be empty');
  }
  if (trimmedTitle.length > 100) {
    throw new Error('Report title must be 100 characters or less');
  }

  // Update report (userId filter ensures data isolation)
  const updated = await db
    .update(reports)
    .set({ title: trimmedTitle, updatedAt: new Date().toISOString() })
    .where(and(eq(reports.id, reportId), eq(reports.userId, userId)))
    .returning();

  if (updated.length === 0) {
    throw new Error('Report not found or permission denied');
  }

  return updated[0];
}
