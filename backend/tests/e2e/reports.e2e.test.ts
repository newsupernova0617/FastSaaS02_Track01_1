import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, type TestDbHandle } from '../helpers/db';
import { createTestApp, type TestAppHandle } from '../helpers/app';
import { authHeaders } from '../helpers/auth';
import { seedUser, seedTransaction } from '../helpers/fixtures';
import { reports } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedReport(
  dbHandle: TestDbHandle,
  userId: string,
  overrides: Partial<{
    reportType: 'monthly_summary' | 'category_detail' | 'spending_pattern' | 'anomaly' | 'suggestion';
    title: string;
  }> = {}
) {
  const inserted = await dbHandle.db
    .insert(reports)
    .values({
      userId,
      reportType: overrides.reportType ?? 'monthly_summary',
      title: overrides.title ?? 'Test Report',
      subtitle: null,
      reportData: JSON.stringify([{ key: 'value' }]),
      params: JSON.stringify({ month: '2026-04' }),
    })
    .returning();
  return inserted[0];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Reports — isolation and edge cases', () => {
  let dbHandle: TestDbHandle;
  let appHandle: TestAppHandle;

  beforeEach(async () => {
    dbHandle = await createTestDb();
    await seedUser(dbHandle.db, { id: 'alice' });
    await seedUser(dbHandle.db, { id: 'bob' });
    appHandle = createTestApp(dbHandle);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    appHandle.cleanup();
    dbHandle.client.close();
  });

  // -----------------------------------------------------------------------
  // 1. Data isolation: alice's report list does not include bob's reports
  // -----------------------------------------------------------------------

  it("alice's report list does not include bob's reports", async () => {
    // Seed 3 transactions for alice and 5 for bob (as context for the test scenario)
    for (let i = 0; i < 3; i++) {
      await seedTransaction(dbHandle.db, { userId: 'alice', amount: 10000 + i });
    }
    for (let i = 0; i < 5; i++) {
      await seedTransaction(dbHandle.db, { userId: 'bob', amount: 20000 + i });
    }

    // Save reports for both users directly via DB to avoid LLM dependency
    await seedReport(dbHandle, 'alice', { title: 'Alice Report 1' });
    await seedReport(dbHandle, 'alice', { title: 'Alice Report 2' });
    await seedReport(dbHandle, 'bob', { title: 'Bob Report 1' });
    await seedReport(dbHandle, 'bob', { title: 'Bob Report 2' });
    await seedReport(dbHandle, 'bob', { title: 'Bob Report 3' });

    const aliceHeaders = await authHeaders('alice');
    const res = await appHandle.app.fetch(
      new Request('http://test/api/reports', { headers: aliceHeaders }),
      appHandle.env as any
    );
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body.success).toBe(true);

    const reportList: any[] = body.reports;
    // Alice should see exactly her 2 reports
    expect(reportList).toHaveLength(2);
    for (const r of reportList) {
      expect(r.title).toMatch(/^Alice/);
    }
    // None of bob's report titles should appear
    const titles = reportList.map((r) => r.title);
    expect(titles).not.toContain('Bob Report 1');
    expect(titles).not.toContain('Bob Report 2');
    expect(titles).not.toContain('Bob Report 3');
  });

  // -----------------------------------------------------------------------
  // 2. Empty state: GET /api/reports with no data → 200 with empty array
  // -----------------------------------------------------------------------

  it('reports endpoint with no saved reports → 200 with empty array', async () => {
    const aliceHeaders = await authHeaders('alice');
    const res = await appHandle.app.fetch(
      new Request('http://test/api/reports', { headers: aliceHeaders }),
      appHandle.env as any
    );
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.reports)).toBe(true);
    expect(body.reports).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // 3. month filter with invalid value → 500 (known Drizzle chaining bug)
  //
  //    The ReportService.getReports method chains a second .where() call on
  //    Invalid month filters should not produce malformed SQL.
  // -----------------------------------------------------------------------

  it('month query param with invalid value → 200 with empty list', async () => {
    const aliceHeaders = await authHeaders('alice');
    const res = await appHandle.app.fetch(
      new Request('http://test/api/reports?month=not-a-month', { headers: aliceHeaders }),
      appHandle.env as any
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.reports).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // 4. GET /api/reports/:id isolation: alice cannot read bob's report
  //    The route filters by (id AND userId) → 404 when user doesn't own it.
  // -----------------------------------------------------------------------

  it("alice cannot GET bob's report by id → 404", async () => {
    const bobReport = await seedReport(dbHandle, 'bob', { title: 'Bob Private' });

    const aliceHeaders = await authHeaders('alice');
    const res = await appHandle.app.fetch(
      new Request(`http://test/api/reports/${bobReport.id}`, { headers: aliceHeaders }),
      appHandle.env as any
    );
    // Route returns 404 when the (id, userId) pair is not found — resource is hidden
    expect(res.status).toBe(404);
  });
});
