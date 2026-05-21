import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getDb, type Env } from '../db/index';
import type { Variables } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import { reports } from '../db/schema';
import { createSession, generateSessionTitle } from '../services/sessions';
import { ReportService } from '../services/reports';
import { AIReportService } from '../services/ai-report';
import { getLLMConfig } from '../services/llm';
import { processSessionMessage } from '../services/session-message-handler';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();
const appChatRateLimit = createRateLimiter(20, 60_000);
const appReportRateLimit = createRateLimiter(10, 60_000);

const appChatSchema = z.object({
  sessionId: z.number().int().positive().optional(),
  content: z.string().trim().min(1).max(4000),
  title: z.string().trim().min(1).max(100).optional(),
});

const appReportPeriodSchema = z.object({
  period: z.enum(['weekly', 'monthly']),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine((data) => {
  if (data.period === 'monthly') return Boolean(data.month);
  return Boolean(data.weekStart && data.weekEnd);
}, {
  message: 'monthly requires month; weekly requires weekStart and weekEnd',
});

const appReportDetailSchema = z.object({
  id: z.number(),
  reportType: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  reportData: z.array(z.record(z.string(), z.unknown())),
  summary: z.record(z.string(), z.unknown()).nullable(),
  params: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

function buildCurrentReportPayload(period: 'weekly' | 'monthly', month?: string, weekStart?: string, weekEnd?: string) {
  if (period === 'weekly') {
    return {
      reportType: 'weekly_summary' as const,
      params: {
        weekStart,
        weekEnd,
      },
    };
  }

  return {
    reportType: 'monthly_summary' as const,
    params: {
      month,
    },
  };
}

function serializeReportDetail(report: {
  id: number;
  reportType: string;
  title: string;
  subtitle?: string | null;
  reportData: string;
  summaryData?: string | null;
  params: string;
  createdAt: string | Date | null;
  updatedAt?: string | Date | null;
}) {
  const createdAt = report.createdAt ? new Date(report.createdAt).toISOString() : new Date().toISOString();
  const updatedAt = report.updatedAt ? new Date(report.updatedAt).toISOString() : null;

  return appReportDetailSchema.parse({
    id: report.id,
    reportType: report.reportType,
    title: report.title,
    subtitle: report.subtitle ?? null,
    reportData: JSON.parse(report.reportData),
    summary: report.summaryData ? JSON.parse(report.summaryData) : null,
    params: JSON.parse(report.params),
    createdAt,
    updatedAt,
  });
}

router.post('/chat', appChatRateLimit, zValidator('json', appChatSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const payload = c.req.valid('json');

  let sessionId = payload.sessionId ?? null;
  if (!sessionId) {
    const title = payload.title ?? generateSessionTitle(payload.content);
    const session = await createSession(db, userId, title);
    sessionId = session.id;
  }

  const result = await processSessionMessage({
    db,
    env: c.env,
    userId,
    sessionId,
    content: payload.content,
  });

  return c.json({
    ...result.body,
    sessionId,
  }, result.status as 200 | 400 | 404 | 500 | 503);
});

router.get('/reports/current', zValidator('query', appReportPeriodSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const payload = c.req.valid('query');
  const reportPayload = buildCurrentReportPayload(payload.period, payload.month, payload.weekStart, payload.weekEnd);
  const reportService = new ReportService(db);

  let report = await reportService.getLatestReportByType(userId, reportPayload.reportType);

  if (!report) {
    const aiReportService = new AIReportService(getLLMConfig(c.env));
    const generated = await aiReportService.generateReport(db, userId, reportPayload);
    const savedReport = await db.insert(reports).values({
      userId,
      reportType: generated.reportType,
      title: generated.title,
      subtitle: generated.subtitle,
      reportData: JSON.stringify(generated.sections),
      summaryData: JSON.stringify(generated.summary),
      params: JSON.stringify(reportPayload.params),
    }).returning().get();

    report = {
      id: savedReport.id,
      reportType: savedReport.reportType,
      title: savedReport.title,
      subtitle: savedReport.subtitle ?? undefined,
      reportData: savedReport.reportData,
      summaryData: savedReport.summaryData,
      params: savedReport.params,
      createdAt: savedReport.createdAt ?? new Date().toISOString(),
      updatedAt: savedReport.updatedAt ?? savedReport.createdAt ?? new Date().toISOString(),
    };
  }

  if (report && !report.summaryData) {
    const aiReportService = new AIReportService(getLLMConfig(c.env));
    const summary = await aiReportService.generateSummary(db, userId, reportPayload);
    await reportService.updateReportSummary(userId, report.id, summary as unknown as Record<string, unknown>);
    report = {
      ...report,
      summaryData: JSON.stringify(summary),
    };
  }

  if (!report) {
    return c.json({
      success: false as const,
      error: 'Report not found',
    }, 404);
  }

  return c.json({
    success: true as const,
    report: serializeReportDetail(report),
  });
});

router.post('/reports/generate', appReportRateLimit, zValidator('json', appReportPeriodSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const payload = c.req.valid('json');
  const reportPayload = buildCurrentReportPayload(payload.period, payload.month, payload.weekStart, payload.weekEnd);

  const aiReportService = new AIReportService(getLLMConfig(c.env));
  const generated = await aiReportService.generateReport(db, userId, reportPayload);
  const savedReport = await db.insert(reports).values({
    userId,
    reportType: generated.reportType,
    title: generated.title,
    subtitle: generated.subtitle,
    reportData: JSON.stringify(generated.sections),
    summaryData: JSON.stringify(generated.summary),
    params: JSON.stringify(reportPayload.params),
  }).returning().get();

  const report = {
    id: savedReport.id,
    reportType: savedReport.reportType,
    title: savedReport.title,
    subtitle: savedReport.subtitle ?? undefined,
    reportData: savedReport.reportData,
    summaryData: savedReport.summaryData,
    params: savedReport.params,
    createdAt: savedReport.createdAt ?? new Date().toISOString(),
    updatedAt: savedReport.updatedAt ?? savedReport.createdAt ?? new Date().toISOString(),
  };

  return c.json({
    success: true as const,
    report: serializeReportDetail(report),
  }, 201);
});

export default router;
