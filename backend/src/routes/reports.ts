import { Hono } from 'hono';
import { ZodError } from 'zod';
import { z } from 'zod';
import { getDb, Env } from '../db/index';
import type { Variables } from '../middleware/auth';
import { ReportService } from '../services/reports';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// Validation schema for save report
const SaveReportSchema = z.object({
  reportType: z.enum(['monthly_summary', 'category_detail', 'spending_pattern', 'anomaly', 'suggestion']),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(100).optional(),
  reportData: z.record(z.string(), z.unknown()),
  params: z.record(z.string(), z.unknown()),
});

type SaveReportPayload = z.infer<typeof SaveReportSchema>;

// POST /api/reports - Save a report
router.post('/', async (c) => {
  try {
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

// GET /api/reports - List reports
router.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const month = c.req.query('month');
    const limitStr = c.req.query('limit') || '50';
    const limit = Math.min(parseInt(limitStr), 100);

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

// GET /api/reports/:id - Get report detail
router.get('/:id', async (c) => {
  try {
    const userId = c.get('userId');
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

// DELETE /api/reports/:id - Delete report
router.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId');
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

export default router;
