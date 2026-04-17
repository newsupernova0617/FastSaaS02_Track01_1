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
import { getDb, Env } from '../db/index';
import type { Variables } from '../middleware/auth';
import { ReportService, updateReportTitle } from '../services/reports';
import { createRateLimiter } from '../middleware/rateLimit';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// [보안] 리포트 저장 속도 제한: 사용자당 1분에 최대 10번
// 악의적인 사용자가 대량의 리포트를 생성하는 것을 방지
const reportWriteRateLimit = createRateLimiter(10, 60_000);

// Validation schema for save report
const SaveReportSchema = z.object({
  reportType: z.enum(['monthly_summary', 'category_detail', 'spending_pattern', 'anomaly', 'suggestion']),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(100).optional(),
  reportData: z.array(z.record(z.string(), z.unknown())),
  params: z.record(z.string(), z.unknown()),
});

type SaveReportPayload = z.infer<typeof SaveReportSchema>;

// POST /api/reports - 리포트 저장
// reportWriteRateLimit 미들웨어가 먼저 실행 → 속도 제한 통과 후 핸들러 진입
router.post('/', reportWriteRateLimit, async (c) => {
  try {
    // [보안] userId는 반드시 JWT 미들웨어에서 추출 (절대 body에서 읽지 않음)
    const userId = c.get('userId');
    const body = await c.req.json();

    const payload = SaveReportSchema.parse(body);

    const db = getDb(c.env);
    const reportService = new ReportService(db);

    const report = await reportService.saveReport(userId, payload);

    return c.json({
      success: true,
      id: report.id,
      createdAt: report.createdAt,
    }, 201);
  } catch (error) {
    console.error('[Reports API] Save error:', error);

    if (error instanceof ZodError) {
      return c.json(
        { success: false, error: 'Invalid report data', details: error.flatten() },
        400
      );
    }

    return c.json(
      { success: false, error: 'Failed to save report' },
      500
    );
  }
});

// GET /api/reports - 사용자의 리포트 목록 조회
// userId로 필터링되어 본인의 리포트만 반환됨
router.get('/', async (c) => {
  try {
    const userId = c.get('userId');  // [보안] JWT에서 추출
    const month = c.req.query('month');
    const limitStr = c.req.query('limit') || '50';
    const limit = Math.min(Math.max(parseInt(limitStr) || 50, 1), 100);

    const db = getDb(c.env);
    const reportService = new ReportService(db);

    const reportsList = await reportService.getReports(userId, month, limit);

    return c.json({
      success: true,
      reports: reportsList,
    });
  } catch (error) {
    console.error('[Reports API] List error:', error);
    return c.json(
      { success: false, error: 'Failed to fetch reports' },
      500
    );
  }
});

// GET /api/reports/:id - 리포트 상세 조회
// ReportService.getReportDetail(userId, reportId)로 소유권 검증
router.get('/:id', async (c) => {
  try {
    const userId = c.get('userId');  // [보안] JWT에서 추출
    const reportId = parseInt(c.req.param('id'));

    if (isNaN(reportId)) {
      return c.json(
        { success: false, error: 'Invalid report ID' },
        400
      );
    }

    const db = getDb(c.env);
    const reportService = new ReportService(db);

    const report = await reportService.getReportDetail(userId, reportId);

    if (!report) {
      return c.json(
        { success: false, error: 'Report not found' },
        404
      );
    }

    return c.json({
      success: true,
      report: {
        id: report.id,
        reportType: report.reportType,
        title: report.title,
        subtitle: report.subtitle,
        reportData: JSON.parse(report.reportData),
        params: JSON.parse(report.params),
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    console.error('[Reports API] Detail error:', error);
    return c.json(
      { success: false, error: 'Failed to fetch report' },
      500
    );
  }
});

// DELETE /api/reports/:id - 리포트 삭제
// ReportService.deleteReport(userId, reportId)로 소유권 검증 → 본인 리포트만 삭제 가능
router.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId');  // [보안] JWT에서 추출
    const reportId = parseInt(c.req.param('id'));

    if (isNaN(reportId)) {
      return c.json(
        { success: false, error: 'Invalid report ID' },
        400
      );
    }

    const db = getDb(c.env);
    const reportService = new ReportService(db);

    const deleted = await reportService.deleteReport(userId, reportId);

    if (!deleted) {
      return c.json(
        { success: false, error: 'Report not found' },
        404
      );
    }

    return c.json({
      success: true,
      message: 'Report deleted',
    });
  } catch (error) {
    console.error('[Reports API] Delete error:', error);
    return c.json(
      { success: false, error: 'Failed to delete report' },
      500
    );
  }
});

// PATCH /api/reports/:id - 리포트 제목 수정
// updateReportTitle(db, userId, reportId, title)로 소유권 검증
router.patch('/:id', async (c) => {
  const userId = c.get('userId');  // [보안] JWT에서 추출
  const reportId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json();
  const { title } = body;

  if (isNaN(reportId)) {
    return c.json({ error: 'Invalid report ID' }, 400);
  }

  if (!title || typeof title !== 'string') {
    return c.json({ error: 'Title is required and must be a string' }, 400);
  }

  try {
    const db = getDb(c.env);
    const updated = await updateReportTitle(db, userId, reportId, title);
    return c.json({ success: true, report: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

export default router;
