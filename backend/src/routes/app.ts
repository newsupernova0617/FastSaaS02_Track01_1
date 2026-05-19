import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getDb, type Env } from '../db/index';
import { reports, transactions, users, userSubscriptions } from '../db/schema';
import type { Variables } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import { buildAppBootstrap, buildAppCalendar, buildAppHome, buildAppReport, buildAppSearch, buildAppStats, buildAppTimeline } from '../services/app-views';
import { createSession, deleteSession, generateSessionTitle, listSessions, renameSession } from '../services/sessions';
import { ReportService, updateReportTitle } from '../services/reports';
import { AIReportService } from '../services/ai-report';
import { getLLMConfig } from '../services/llm';
import { derivePlanFromSubscription } from '../services/google-play-billing';
import { processSessionMessage } from '../services/session-message-handler';
import { and, desc, eq, isNull, like } from 'drizzle-orm';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();
const appChatRateLimit = createRateLimiter(20, 60_000);
const appReportRateLimit = createRateLimiter(10, 60_000);

const reportQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
});

const appTransactionsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

const appTransactionCreateSchema = z.object({
  transactionType: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive().max(1_000_000_000),
  category: z.string().trim().min(1).max(50),
  memo: z.string().trim().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const appTransactionIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const statsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

const calendarQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const timelineQuerySchema = z.object({
  sessionId: z.coerce.number().int().positive().optional(),
});

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  firstMessage: z.string().trim().min(1).max(500).optional(),
});

const sessionParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const updateSessionSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

const appChatSchema = z.object({
  sessionId: z.number().int().positive().optional(),
  content: z.string().trim().min(1).max(4000),
  title: z.string().trim().min(1).max(100).optional(),
});

const reportsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const reportIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
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

const appReportUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200),
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

const profileResponseSchema = z.object({
  success: z.literal(true),
  profile: z.object({
    userId: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    provider: z.string().nullable(),
    plan: z.enum(['free', 'paid']),
    subscriptionStatus: z.string(),
    subscriptionExpiresAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
  }),
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

const appTransactionResponseSchema = z.object({
  success: z.literal(true),
  transaction: z.object({
    id: z.number(),
    type: z.enum(['income', 'expense']),
    amount: z.number(),
    category: z.string(),
    memo: z.string().nullable(),
    date: z.string(),
    createdAt: z.string(),
  }),
});

const appTransactionsResponseSchema = z.object({
  success: z.literal(true),
  month: z.string(),
  transactions: z.array(appTransactionResponseSchema.shape.transaction),
});

const appTransactionDeleteResponseSchema = z.object({
  success: z.literal(true),
  deletedTransactionId: z.number(),
});

router.get('/sessions', async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const sessions = await listSessions(db, userId, 20);

  return c.json({
    success: true as const,
    sessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })),
  });
});

router.post('/sessions', zValidator('json', createSessionSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const payload = c.req.valid('json');

  const title = payload.title ?? (payload.firstMessage ? generateSessionTitle(payload.firstMessage) : '새 대화');
  const session = await createSession(db, userId, title);

  return c.json({
    success: true as const,
    session: {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
    },
  }, 201);
});

router.patch('/sessions/:id', zValidator('param', sessionParamSchema), zValidator('json', updateSessionSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const { id } = c.req.valid('param');
  const { title } = c.req.valid('json');
  const session = await renameSession(db, id, userId, title);

  if (!session) {
    return c.json({
      success: false as const,
      error: 'Session not found',
    }, 404);
  }

  return c.json({
    success: true as const,
    session: {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
  });
});

router.delete('/sessions/:id', zValidator('param', sessionParamSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const { id } = c.req.valid('param');
  const success = await deleteSession(db, id, userId);

  if (!success) {
    return c.json({
      success: false as const,
      error: 'Session not found',
    }, 404);
  }

  return c.json({
    success: true as const,
    deletedSessionId: id,
  });
});

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

router.get('/bootstrap', async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  return c.json(await buildAppBootstrap(db, userId));
});

router.get('/home', async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  return c.json(await buildAppHome(db, userId));
});

router.get('/report', zValidator('query', reportQuerySchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const { month } = c.req.valid('query');
  return c.json(await buildAppReport(db, userId, month));
});

router.get('/search', zValidator('query', searchQuerySchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const { q } = c.req.valid('query');
  return c.json(await buildAppSearch(db, userId, q));
});

router.get('/transactions', zValidator('query', appTransactionsQuerySchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const { month } = c.req.valid('query');
  const targetMonth = month ?? new Date().toISOString().slice(0, 7);

  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), like(transactions.date, `${targetMonth}%`), isNull(transactions.deletedAt)))
    .orderBy(desc(transactions.date), desc(transactions.id));

  const response = appTransactionsResponseSchema.parse({
    success: true,
    month: targetMonth,
    transactions: rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amount,
      category: row.category,
      memo: row.memo ?? null,
      date: row.date,
      createdAt: row.createdAt ?? new Date().toISOString(),
    })),
  });

  return c.json(response);
});

router.post('/transactions', zValidator('json', appTransactionCreateSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const payload = c.req.valid('json');

  const created = await db
    .insert(transactions)
    .values({
      userId,
      type: payload.transactionType,
      amount: payload.amount,
      category: payload.category,
      memo: payload.memo ?? null,
      date: payload.date,
    })
    .returning()
    .get();

  const response = appTransactionResponseSchema.parse({
    success: true,
    transaction: {
      id: created.id,
      type: created.type,
      amount: created.amount,
      category: created.category,
      memo: created.memo ?? null,
      date: created.date,
      createdAt: created.createdAt ?? new Date().toISOString(),
    },
  });

  return c.json(response, 201);
});

router.delete('/transactions/:id', zValidator('param', appTransactionIdSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const { id } = c.req.valid('param');

  const updated = await db
    .update(transactions)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt)))
    .returning()
    .get();

  if (!updated) {
    return c.json({
      success: false as const,
      error: 'Transaction not found',
    }, 404);
  }

  const response = appTransactionDeleteResponseSchema.parse({
    success: true,
    deletedTransactionId: id,
  });

  return c.json(response);
});

router.get('/calendar', zValidator('query', calendarQuerySchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const { month, date } = c.req.valid('query');
  return c.json(await buildAppCalendar(db, userId, month, date));
});

router.get('/stats', zValidator('query', statsQuerySchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const { month } = c.req.valid('query');
  return c.json(await buildAppStats(db, userId, month));
});

router.get('/timeline', zValidator('query', timelineQuerySchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const { sessionId } = c.req.valid('query');
  return c.json(await buildAppTimeline(db, userId, sessionId));
});

router.get('/profile', async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [subscription] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .orderBy(desc(userSubscriptions.updatedAt))
    .limit(1);

  const resolved = derivePlanFromSubscription(
    subscription
      ? {
          status: subscription.status,
          expiresAt: subscription.expiresAt,
          productId: subscription.productId,
          platform: subscription.platform,
        }
      : null
  );

  const response = profileResponseSchema.parse({
    success: true,
    profile: {
      userId,
      email: user?.email ?? null,
      name: user?.name ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      provider: user?.provider ?? null,
      plan: resolved.plan,
      subscriptionStatus: resolved.status,
      subscriptionExpiresAt: resolved.expiresAt ?? null,
      updatedAt: subscription?.updatedAt ?? user?.createdAt ?? null,
    },
  });

  return c.json(response);
});

router.get('/reports', zValidator('query', reportsQuerySchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const { month, limit } = c.req.valid('query');
  const reportService = new ReportService(db);
  const reports = await reportService.getReports(userId, month, limit ?? 10);

  return c.json({
    success: true as const,
    reports: reports.map((report) => ({
      id: report.id,
      reportType: report.reportType,
      title: report.title,
      subtitle: report.subtitle ?? null,
      createdAt: report.createdAt,
    })),
  });
});

router.get('/reports/current', zValidator('query', appReportPeriodSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const payload = c.req.valid('query');
  const reportPayload = buildCurrentReportPayload(payload.period, payload.month, payload.weekStart, payload.weekEnd);
  const reportService = new ReportService(db);

  let report = await reportService.getLatestReportByType(userId, reportPayload.reportType);

  if (!report) {
    const aiReportService = new AIReportService(getLLMConfig(c.env), c.env.AI);
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
    const aiReportService = new AIReportService(getLLMConfig(c.env), c.env.AI);
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

  const aiReportService = new AIReportService(getLLMConfig(c.env), c.env.AI);
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

router.get('/reports/:id', zValidator('param', reportIdParamSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const { id } = c.req.valid('param');
  const reportService = new ReportService(db);
  const report = await reportService.getReportDetail(userId, id);

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

router.patch('/reports/:id', zValidator('param', reportIdParamSchema), zValidator('json', appReportUpdateSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const { id } = c.req.valid('param');
  const { title } = c.req.valid('json');

  const updated = await updateReportTitle(db, userId, id, title);
  return c.json({
    success: true as const,
    report: serializeReportDetail(updated),
  });
});

router.delete('/reports/:id', zValidator('param', reportIdParamSchema), async (c) => {
  const db = getDb(c.env);
  const userId = c.get('userId');
  const { id } = c.req.valid('param');
  const reportService = new ReportService(db);
  const deleted = await reportService.deleteReport(userId, id);

  if (!deleted) {
    return c.json({
      success: false as const,
      error: 'Report not found',
    }, 404);
  }

  return c.json({
    success: true as const,
    deletedReportId: id,
  });
});

export default router;
