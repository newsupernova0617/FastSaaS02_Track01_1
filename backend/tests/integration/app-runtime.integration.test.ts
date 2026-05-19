import { and, eq, isNull } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatMessages, reports, transactions } from '../../src/db/schema';
import { createTestApp, type TestAppHandle } from '../helpers/app';
import { createTestDb, type TestDbHandle } from '../helpers/db';
import { authHeaders } from '../helpers/auth';
import { mockLlmResponse } from '../helpers/llm-mock';
import { seedSession, seedUser, seedUserSubscription } from '../helpers/fixtures';

async function insertTransaction(
  db: TestDbHandle['db'],
  values: {
    userId: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    memo?: string | null;
    date: string;
    createdAt?: string;
  }
) {
  return db
    .insert(transactions)
    .values({
      userId: values.userId,
      type: values.type,
      amount: values.amount,
      category: values.category,
      memo: values.memo ?? null,
      date: values.date,
      createdAt: values.createdAt,
    })
    .returning()
    .get();
}

async function insertReport(
  db: TestDbHandle['db'],
  values: {
    userId: string;
    reportType: 'weekly_summary' | 'monthly_summary' | 'category_detail' | 'spending_pattern' | 'anomaly' | 'suggestion';
    title: string;
    subtitle?: string | null;
    reportData: unknown[];
    summaryData?: Record<string, unknown> | null;
    params: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
  }
) {
  return db
    .insert(reports)
    .values({
      userId: values.userId,
      reportType: values.reportType,
      title: values.title,
      subtitle: values.subtitle ?? null,
      reportData: JSON.stringify(values.reportData),
      summaryData: values.summaryData ? JSON.stringify(values.summaryData) : null,
      params: JSON.stringify(values.params),
      createdAt: values.createdAt,
      updatedAt: values.updatedAt,
    })
    .returning()
    .get();
}

async function insertChatMessage(
  db: TestDbHandle['db'],
  values: {
    userId: string;
    sessionId: number;
    role: 'user' | 'assistant';
    content: string;
    metadata?: Record<string, unknown> | null;
    createdAt?: string;
  }
) {
  return db
    .insert(chatMessages)
    .values({
      userId: values.userId,
      sessionId: values.sessionId,
      role: values.role,
      content: values.content,
      metadata: values.metadata ? JSON.stringify(values.metadata) : null,
      createdAt: values.createdAt,
    })
    .returning()
    .get();
}

async function requestJson(
  appHandle: TestAppHandle,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: unknown
) {
  const response = await appHandle.app.fetch(
    new Request(`http://test${path}`, {
      method,
      headers: {
        ...headers,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
    appHandle.env as any
  );

  return {
    response,
    body: await response.json() as any,
  };
}

describe('App-facing runtime validation', () => {
  let dbHandle: TestDbHandle;
  let appHandle: TestAppHandle;

  beforeEach(async () => {
    dbHandle = await createTestDb();

    await seedUser(dbHandle.db, {
      id: 'alice',
      email: 'alice@example.com',
      name: 'Alice',
      provider: 'google',
    });
    await seedUser(dbHandle.db, {
      id: 'bob',
      email: 'bob@example.com',
      name: 'Bob',
      provider: 'google',
    });

    await seedUserSubscription(dbHandle.db, {
      userId: 'alice',
      status: 'active',
      plan: 'paid',
      expiresAt: '2026-06-19T00:00:00.000Z',
    });

    const session = await seedSession(dbHandle.db, { userId: 'alice', title: '점심 기록' });

    await insertChatMessage(dbHandle.db, {
      userId: 'alice',
      sessionId: session.id,
      role: 'user',
      content: '오늘 커피 4500원',
      createdAt: '2026-04-28T10:00:00Z',
    });
    await insertChatMessage(dbHandle.db, {
      userId: 'alice',
      sessionId: session.id,
      role: 'assistant',
      content: '기록했어요 ✓',
      metadata: { actionType: 'create', action: { count: 1, ids: [99], totalAmount: 4500 } },
      createdAt: '2026-04-28T10:00:02Z',
    });

    await insertTransaction(dbHandle.db, {
      userId: 'alice',
      type: 'expense',
      amount: 5000,
      category: '식비',
      memo: '커피',
      date: '2026-03-28',
      createdAt: '2026-03-28T09:00:00Z',
    });
    await insertTransaction(dbHandle.db, {
      userId: 'alice',
      type: 'income',
      amount: 3500000,
      category: '월급',
      memo: null,
      date: '2026-04-02',
      createdAt: '2026-04-02T09:00:00Z',
    });
    await insertTransaction(dbHandle.db, {
      userId: 'alice',
      type: 'expense',
      amount: 12500,
      category: '식비',
      memo: '커피',
      date: '2026-04-23',
      createdAt: '2026-04-23T09:00:00Z',
    });
    await insertTransaction(dbHandle.db, {
      userId: 'alice',
      type: 'expense',
      amount: 26000,
      category: '식비',
      memo: '외식',
      date: '2026-04-28',
      createdAt: '2026-04-28T09:00:00Z',
    });
    await insertTransaction(dbHandle.db, {
      userId: 'alice',
      type: 'income',
      amount: 50000,
      category: '부업',
      memo: '강의료',
      date: '2026-04-28',
      createdAt: '2026-04-28T09:05:00Z',
    });
    await insertTransaction(dbHandle.db, {
      userId: 'alice',
      type: 'expense',
      amount: 8800,
      category: '카페',
      memo: '라떼',
      date: '2026-04-30',
      createdAt: '2026-04-30T09:00:00Z',
    });

    await insertTransaction(dbHandle.db, {
      userId: 'bob',
      type: 'expense',
      amount: 99000,
      category: '쇼핑',
      memo: 'bob only',
      date: '2026-04-28',
      createdAt: '2026-04-28T08:00:00Z',
    });

    await insertReport(dbHandle.db, {
      userId: 'alice',
      reportType: 'monthly_summary',
      title: '월간 요약',
      subtitle: '2026-04 기준',
      reportData: [{ type: 'card', title: '총 지출' }],
      summaryData: {
        headline: '이번 달 소비 요약',
        totalExpense: 47300,
      },
      params: { month: '2026-04' },
      createdAt: '2026-04-28T11:10:00Z',
      updatedAt: '2026-04-28T11:10:00Z',
    });

    await insertReport(dbHandle.db, {
      userId: 'alice',
      reportType: 'weekly_summary',
      title: '주간 요약',
      subtitle: '2026-04-21 ~ 2026-04-27 기준',
      reportData: [{ type: 'card', title: '총 지출' }],
      summaryData: {
        headline: '주간 소비 요약',
        totalExpense: 38500,
      },
      params: { weekStart: '2026-04-21', weekEnd: '2026-04-27' },
      createdAt: '2026-04-28T10:40:00Z',
      updatedAt: '2026-04-28T10:40:00Z',
    });

    await insertReport(dbHandle.db, {
      userId: 'bob',
      reportType: 'monthly_summary',
      title: 'Bob Private',
      subtitle: '2026-04 기준',
      reportData: [{ type: 'card', title: 'Bob report' }],
      summaryData: {
        headline: 'Bob only',
        totalExpense: 99000,
      },
      params: { month: '2026-04' },
      createdAt: '2026-04-28T12:00:00Z',
      updatedAt: '2026-04-28T12:00:00Z',
    });

    appHandle = createTestApp(dbHandle);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    appHandle.cleanup();
    return dbHandle.client.close();
  });

  it('keeps read flows live and scoped to the signed-in user', async () => {
    const headers = await authHeaders('alice');

    const bootstrap = await requestJson(appHandle, 'GET', '/api/app/bootstrap', headers);
    expect(bootstrap.response.status).toBe(200);
    expect(bootstrap.body.success).toBe(true);
    expect(bootstrap.body.sessions).toHaveLength(1);
    expect(bootstrap.body.activeSession.title).toBe('점심 기록');
    expect(bootstrap.body.messages).toHaveLength(2);

    const home = await requestJson(appHandle, 'GET', '/api/app/home', headers);
    expect(home.response.status).toBe(200);
    expect(home.body.success).toBe(true);
    expect(home.body.screen.sessionId).toBeGreaterThan(0);
    expect(home.body.screen.card.category).toBe('카페');
    expect(home.body.screen.card.amount).toBe(-8800);
    expect(home.body.screen.messages).toHaveLength(2);

    const calendar = await requestJson(appHandle, 'GET', '/api/app/calendar?month=2026-04&date=2026-04-28', headers);
    expect(calendar.response.status).toBe(200);
    expect(calendar.body.success).toBe(true);
    expect(calendar.body.month).toBe('2026-04');
    expect(calendar.body.summary.income).toBe(3550000);
    expect(calendar.body.summary.expense).toBe(47300);
    expect(calendar.body.selectedDay.transactions).toHaveLength(2);

    const stats = await requestJson(appHandle, 'GET', '/api/app/stats?month=2026-04', headers);
    expect(stats.response.status).toBe(200);
    expect(stats.body.success).toBe(true);
    expect(stats.body.summary.income).toBe(3550000);
    expect(stats.body.summary.expense).toBe(47300);
    expect(stats.body.expenseCategories[0].category).toBe('식비');
    expect(stats.body.recentReports).toHaveLength(2);

    const report = await requestJson(appHandle, 'GET', '/api/app/report?month=2026-04', headers);
    expect(report.response.status).toBe(200);
    expect(report.body.success).toBe(true);
    expect(report.body.month).toBe('2026-04');
    expect(report.body.summary.total).toBe(47300);
    expect(report.body.categories[0].name).toBe('식비');

    const currentReport = await requestJson(appHandle, 'GET', '/api/app/reports/current?period=monthly&month=2026-04', headers);
    expect(currentReport.response.status).toBe(200);
    expect(currentReport.body.success).toBe(true);
    expect(currentReport.body.report.title).toBe('월간 요약');

    const reportsList = await requestJson(appHandle, 'GET', '/api/app/reports?month=2026-04&limit=10', headers);
    expect(reportsList.response.status).toBe(200);
    expect(reportsList.body.success).toBe(true);
    expect(reportsList.body.reports).toHaveLength(2);
    expect(reportsList.body.reports.map((item: any) => item.title)).not.toContain('Bob Private');

    const reportDetail = await requestJson(appHandle, 'GET', `/api/app/reports/${currentReport.body.report.id}`, headers);
    expect(reportDetail.response.status).toBe(200);
    expect(reportDetail.body.report.id).toBe(currentReport.body.report.id);

    const search = await requestJson(appHandle, 'GET', '/api/app/search?q=%EC%8B%9D%EB%B9%84%202026-04', headers);
    expect(search.response.status).toBe(200);
    expect(search.body.success).toBe(true);
    expect(search.body.total).toBe(38500);

    const profile = await requestJson(appHandle, 'GET', '/api/app/profile', headers);
    expect(profile.response.status).toBe(200);
    expect(profile.body.success).toBe(true);
    expect(profile.body.profile.plan).toBe('paid');
    expect(profile.body.profile.subscriptionStatus).toBe('active');

    const sessionsList = await requestJson(appHandle, 'GET', '/api/app/sessions', headers);
    expect(sessionsList.response.status).toBe(200);
    expect(sessionsList.body.success).toBe(true);
    expect(sessionsList.body.sessions).toHaveLength(1);

    const timeline = await requestJson(appHandle, 'GET', `/api/app/timeline?sessionId=${bootstrap.body.activeSession.id}`, headers);
    expect(timeline.response.status).toBe(200);
    expect(timeline.body.success).toBe(true);
    expect(timeline.body.sessionId).toBe(bootstrap.body.activeSession.id);
    expect(timeline.body.items).toHaveLength(2);
    expect(timeline.body.items[0].role).toBe('user');
    expect(timeline.body.items[1].role).toBe('assistant');
  });

  it('keeps app-facing write flows live for sessions, chat, and transactions', async () => {
    const headers = await authHeaders('alice');

    const createdSession = await requestJson(appHandle, 'POST', '/api/app/sessions', headers, {
      title: '빠른 입력',
    });
    expect(createdSession.response.status).toBe(201);
    expect(createdSession.body.success).toBe(true);

    const updatedSession = await requestJson(appHandle, 'PATCH', `/api/app/sessions/${createdSession.body.session.id}`, headers, {
      title: '빠른 입력 수정',
    });
    expect(updatedSession.response.status).toBe(200);
    expect(updatedSession.body.session.title).toBe('빠른 입력 수정');

    mockLlmResponse({
      type: 'create',
      payload: {
        transactionType: 'expense',
        amount: 4500,
        category: '식비',
        memo: '커피',
        date: '2026-04-30',
      },
      confidence: 0.95,
    });

    const chat = await requestJson(appHandle, 'POST', '/api/app/chat', headers, {
      sessionId: createdSession.body.session.id,
      content: '오늘 커피 4500원',
    });
    expect(chat.response.status).toBe(200);
    expect(chat.body.success).toBe(true);
    expect(chat.body.sessionId).toBe(createdSession.body.session.id);
    expect(chat.body.messages).toHaveLength(2);

    const createdTxRows = await dbHandle.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, 'alice'), eq(transactions.amount, 4500), isNull(transactions.deletedAt)));
    expect(createdTxRows).toHaveLength(1);

    const txCreate = await requestJson(appHandle, 'POST', '/api/app/transactions', headers, {
      transactionType: 'expense',
      amount: 3200,
      category: '식비',
      memo: '간식',
      date: '2026-04-30',
    });
    expect(txCreate.response.status).toBe(201);
    expect(txCreate.body.success).toBe(true);

    const txList = await requestJson(appHandle, 'GET', '/api/app/transactions?month=2026-04', headers);
    expect(txList.response.status).toBe(200);
    expect(txList.body.transactions.some((tx: any) => tx.amount === 3200)).toBe(true);

    const txDelete = await requestJson(appHandle, 'DELETE', `/api/app/transactions/${txCreate.body.transaction.id}`, headers);
    expect(txDelete.response.status).toBe(200);
    expect(txDelete.body.deletedTransactionId).toBe(txCreate.body.transaction.id);

    const txAfterDelete = await requestJson(appHandle, 'GET', '/api/app/transactions?month=2026-04', headers);
    expect(txAfterDelete.response.status).toBe(200);
    expect(txAfterDelete.body.transactions.some((tx: any) => tx.id === txCreate.body.transaction.id)).toBe(false);

    const deletedSession = await requestJson(appHandle, 'DELETE', `/api/app/sessions/${createdSession.body.session.id}`, headers);
    expect(deletedSession.response.status).toBe(200);
    expect(deletedSession.body.deletedSessionId).toBe(createdSession.body.session.id);

    const sessionsAfterDelete = await requestJson(appHandle, 'GET', '/api/app/sessions', headers);
    expect(sessionsAfterDelete.response.status).toBe(200);
    expect(sessionsAfterDelete.body.sessions.some((session: any) => session.id === createdSession.body.session.id)).toBe(false);
  });
});
