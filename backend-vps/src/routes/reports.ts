// ============================================================
// [DB 조작 + 보안] 리포트 API 라우트
//
// AI가 생성한 월간 분석, 카테고리 상세, 소비 패턴 등의 리포트를
// 저장/조회/삭제하는 엔드포인트입니다.
//
// 보안 핵심 규칙:
//   - 모든 핸들러에서 userId = c.get('userId') (JWT에서 추출)
//   - ReportService의 모든 메서드에 userId를 전달 → 본인 리포트만 접근 가능
//   - 리포트 저장은 1분에 10번까지 제한 (rate limiting)
//   - Zod 스키마로 입력값 검증 → 잘못된 데이터가 DB에 들어가는 것을 방지
// ============================================================

import { Hono } from 'hono';
import { ZodError } from 'zod';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getDb, Env } from '../db/index';
import { reports } from '../db/schema';
import type { Variables } from '../middleware/auth';
import { ReportService } from '../services/reports';
import { AIReportService } from '../services/ai-report';
import { getLLMConfig } from '../services/llm';
import { createRateLimiter } from '../middleware/rateLimit';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// [보안] 리포트 저장 속도 제한: 사용자당 1분에 최대 10번
// 악의적인 사용자가 대량의 리포트를 생성하는 것을 방지
const reportWriteRateLimit = createRateLimiter(10, 60_000);

const GenerateReportSchema = z.object({
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

const CurrentReportSchema = z.object({
  period: z.enum(['weekly', 'monthly']),
});

function buildCurrentReportPayload(period: 'weekly' | 'monthly') {
  const now = new Date();
  if (period === 'weekly') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return {
      reportType: 'weekly_summary' as const,
      params: {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
      },
    };
  }

  return {
    reportType: 'monthly_summary' as const,
    params: {
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    },
  };
}

function formatReportDetail(report: {
  id: number;
  reportType: string;
  title: string;
  subtitle?: string | null;
  reportData: string;
  summaryData?: string | null;
  params: string;
  createdAt: string;
}) {
  return {
    id: report.id,
    reportType: report.reportType,
    title: report.title,
    subtitle: report.subtitle,
    reportData: JSON.parse(report.reportData),
    summary: report.summaryData ? JSON.parse(report.summaryData) : null,
    params: JSON.parse(report.params),
    createdAt: report.createdAt,
  };
}

// POST /api/reports/generate - 주간/월간 정기 리포트 생성
router.post('/generate', reportWriteRateLimit, async (c) => {
  try {
    const userId = c.get('userId');
    const payload = GenerateReportSchema.parse(await c.req.json());
    const reportPayload = payload.period === 'weekly'
      ? {
          reportType: 'weekly_summary' as const,
          params: {
            weekStart: payload.weekStart,
            weekEnd: payload.weekEnd,
          },
        }
      : {
          reportType: 'monthly_summary' as const,
          params: {
            month: payload.month,
          },
        };

    const db = getDb(c.env);
    const paramsKey = JSON.stringify(reportPayload.params || {});
    const existingReports = await db
      .select({
        id: reports.id,
        reportType: reports.reportType,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(and(
        eq(reports.userId, userId),
        eq(reports.reportType, reportPayload.reportType),
        eq(reports.params, paramsKey),
      ))
      .limit(1);

    const existingReport = existingReports[0];
    if (existingReport) {
      return c.json({
        success: true,
        id: existingReport.id,
        reportType: existingReport.reportType,
        createdAt: existingReport.createdAt,
        existing: true,
      }, 200);
    }

    const reportService = new AIReportService(getLLMConfig(c.env));
    const report = await reportService.generateReport(db, userId, reportPayload);
    const savedReport = await db.insert(reports).values({
      userId,
      reportType: report.reportType,
      title: report.title,
      subtitle: report.subtitle,
      reportData: JSON.stringify(report.sections),
      summaryData: JSON.stringify(report.summary),
      params: paramsKey,
    }).returning().get();

    return c.json({
      success: true,
      id: savedReport.id,
      reportType: savedReport.reportType,
      createdAt: savedReport.createdAt,
    }, 201);
  } catch (error) {
    console.error('[Reports API] Generate error:', error);
    if (error instanceof ZodError) {
      return c.json({ success: false, error: 'Invalid report generation data', details: error.flatten() }, 400);
    }
    return c.json({ success: false, error: 'Failed to generate report' }, 500);
  }
});

// GET /api/reports/current - 현재 기간 리포트 조회, 없으면 생성 후 반환
router.get('/current', async (c) => {
  try {
    const userId = c.get('userId');
    const query = CurrentReportSchema.parse({
      period: c.req.query('period'),
    });

    const currentPayload = buildCurrentReportPayload(query.period);
    const db = getDb(c.env);
    const reportService = new ReportService(db);

    let report = await reportService.getLatestReportByType(userId, currentPayload.reportType);

    if (!report) {
      const aiReportService = new AIReportService(getLLMConfig(c.env));
      const generated = await aiReportService.generateReport(db, userId, currentPayload);
      const savedReport = await db.insert(reports).values({
        userId,
        reportType: generated.reportType,
        title: generated.title,
        subtitle: generated.subtitle,
        reportData: JSON.stringify(generated.sections),
        summaryData: JSON.stringify(generated.summary),
        params: JSON.stringify(currentPayload.params),
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
    } else if (!report.summaryData) {
      const aiReportService = new AIReportService(getLLMConfig(c.env));
      const summary = await aiReportService.generateSummary(db, userId, currentPayload);
      await reportService.updateReportSummary(userId, report.id, summary as unknown as Record<string, unknown>);
      report = {
        ...report,
        summaryData: JSON.stringify(summary),
      };
    }

    if (!report) {
      throw new Error('Current report not available');
    }

    return c.json({
      success: true,
      report: formatReportDetail(report),
    });
  } catch (error) {
    console.error('[Reports API] Current error:', error);
    if (error instanceof ZodError) {
      return c.json({ success: false, error: 'Invalid current report query', details: error.flatten() }, 400);
    }
    return c.json({ success: false, error: 'Failed to fetch current report' }, 500);
  }
});

export default router;
