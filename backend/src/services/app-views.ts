import { and, desc, eq, gte, isNull, like, lte, sql } from 'drizzle-orm';
import { chatMessages, reports, transactions, type ChatMessage, type Transaction } from '../db/schema';
import { buildSearchSummary } from './search-summary';
import { getChatHistoryBySession } from './chat';
import { listSessions } from './sessions';

type DbLike = any;

function formatMonthLabel(month: string): string {
  const [year, value] = month.split('-');
  return `${year}년 ${value}월`;
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function getCurrentDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthLabel(month: string): string {
  const [year, value] = month.split('-');
  return `${year}년 ${value}월`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function daysInMonth(month: string): number {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year, value, 0)).getUTCDate();
}

function buildDateStrings(month: string) {
  return Array.from({ length: daysInMonth(month) }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${pad2(day)}`;
    const utcDate = new Date(`${date}T00:00:00Z`);
    return {
      date,
      day,
      weekday: utcDate.getUTCDay(),
    };
  });
}

function startOfLastSevenDays(): string {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().slice(0, 10);
}

function detectCategory(query: string): string | undefined {
  const categories = ['식비', '교통', '카페', '쇼핑', '주거', '월세', '의료', '문화', '여가', '교육'];
  return categories.find((category) => query.includes(category));
}

function inferSearchFilters(query: string) {
  const monthMatch = query.match(/(\d{4}-\d{2})/);
  const category = detectCategory(query);

  if (query.includes('지난주')) {
    return {
      periodLabel: '지난 7일',
      startDate: startOfLastSevenDays(),
      endDate: new Date().toISOString().slice(0, 10),
      category,
    };
  }

  if (monthMatch) {
    return {
      periodLabel: formatMonthLabel(monthMatch[1]),
      month: monthMatch[1],
      category,
    };
  }

  const month = getCurrentMonth();
  return {
    periodLabel: formatMonthLabel(month),
    month,
    category,
  };
}

export async function buildAppHome(db: DbLike, userId: string) {
  const sessions = await listSessions(db, userId, 1);
  const activeSession = sessions[0] ?? null;
  const latestMessages = activeSession
    ? await getChatHistoryBySession(db, activeSession.id, userId, 10)
    : await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(6);
  const latestTransaction = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(1);

  const orderedMessages = [...latestMessages].reverse();
  const latestUserMessage =
    [...orderedMessages].reverse().find((message: ChatMessage) => message.role === 'user')?.content ??
    '오늘 점심 12000원 썼어';
  const latestAssistantMessage =
    [...orderedMessages].reverse().find((message: ChatMessage) => message.role === 'assistant')?.content ??
    '기록했어요 ✓';

  const card = latestTransaction[0];

  return {
    success: true as const,
    screen: {
      sessionId: activeSession?.id ?? null,
      dateLabel: card?.date ?? new Date().toISOString().slice(5, 10).replace('-', '월 ') + '일',
      userMessage: latestUserMessage,
      assistantMessage: latestAssistantMessage,
      card: card
        ? {
            emoji: card.type === 'income' ? '💰' : card.category === '식비' ? '🍱' : card.category === '교통' ? '🚇' : '🧾',
            category: card.category,
            sublabel: `${card.date}${card.memo ? ` · ${card.memo}` : ''}`,
            amount: card.type === 'income' ? card.amount : -card.amount,
            currency: '원',
          }
        : {
            emoji: '🍱',
            category: '식비',
            sublabel: '최근 기록이 아직 없어요',
            amount: 0,
            currency: '원',
          },
      followUpMessage:
        orderedMessages
          .filter((message: ChatMessage) => message.role === 'user')
          .slice(-2, -1)[0]?.content ?? '이번주 커피값 얼마 썼지?',
      inputPlaceholder: '오늘 지출을 입력해보세요',
      messages: orderedMessages.map((message: ChatMessage & { metadata?: Record<string, unknown> }) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        metadata: (message as { metadata?: Record<string, unknown> }).metadata ?? null,
        createdAt: message.createdAt,
      })),
    },
  };
}

export async function buildAppReport(db: DbLike, userId: string, month?: string) {
  const targetMonth = month ?? getCurrentMonth();

  const [summaryRows, dailyRows, latestMonthlyReport] = await Promise.all([
    db
      .select({
        type: transactions.type,
        total: sql<number>`SUM(${transactions.amount})`.as('total'),
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), like(transactions.date, `${targetMonth}%`), isNull(transactions.deletedAt)))
      .groupBy(transactions.type),
    db
      .select({
        day: transactions.date,
        amount: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END)`.as('amount'),
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), like(transactions.date, `${targetMonth}%`), isNull(transactions.deletedAt)))
      .groupBy(transactions.date)
      .orderBy(transactions.date),
    db
      .select({
        title: reports.title,
        subtitle: reports.subtitle,
        summaryData: reports.summaryData,
      })
      .from(reports)
      .where(and(eq(reports.userId, userId), eq(reports.reportType, 'monthly_summary')))
      .orderBy(desc(reports.createdAt))
      .limit(1),
  ]);

  const expenseTotal = summaryRows.find((row: { type: string; total: number }) => row.type === 'expense')?.total ?? 0;
  const previousMonthDate = new Date(`${targetMonth}-01T00:00:00`);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonth = previousMonthDate.toISOString().slice(0, 7);

  const [categoryRows, previousMonthRows] = await Promise.all([
    db
      .select({
        category: transactions.category,
        total: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END)`.as('total'),
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), like(transactions.date, `${targetMonth}%`), isNull(transactions.deletedAt)))
      .groupBy(transactions.category),
    db
      .select({
        total: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END)`.as('total'),
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), like(transactions.date, `${previousMonth}%`), isNull(transactions.deletedAt))),
  ]);

  const previousTotal = previousMonthRows[0]?.total ?? 0;
  const delta = expenseTotal - previousTotal;
  const summaryData = latestMonthlyReport[0]?.summaryData ? JSON.parse(latestMonthlyReport[0].summaryData) : null;

  return {
    success: true as const,
    month: targetMonth,
    summary: {
      total: expenseTotal,
      delta: Math.abs(delta),
      direction: delta >= 0 ? 'up' as const : 'down' as const,
      label: summaryData?.headline ?? '이번 달 지출',
    },
    dailySpending: dailyRows.map((row: { day: string; amount: number }) => ({
      day: row.day.slice(5),
      amount: row.amount ?? 0,
    })),
    categories: categoryRows
      .filter((row: { total: number }) => (row.total ?? 0) > 0)
      .sort((a: { total: number }, b: { total: number }) => (b.total ?? 0) - (a.total ?? 0))
      .slice(0, 5)
      .map((row: { category: string; total: number }) => ({
        emoji: row.category === '식비' ? '🍱' : row.category === '교통' ? '🚇' : row.category === '카페' ? '☕' : '🧾',
        name: row.category,
        total: row.total ?? 0,
      })),
  };
}

export async function buildAppSearch(db: DbLike, userId: string, query: string) {
  const inferred = inferSearchFilters(query);
  const conditions = [eq(transactions.userId, userId), isNull(transactions.deletedAt)];

  if (inferred.month) {
    conditions.push(like(transactions.date, `${inferred.month}%`) as never);
  }
  if (inferred.startDate) {
    conditions.push(gte(transactions.date, inferred.startDate) as never);
  }
  if (inferred.endDate) {
    conditions.push(lte(transactions.date, inferred.endDate) as never);
  }
  if (inferred.category) {
    conditions.push(eq(transactions.category, inferred.category) as never);
  }

  const resultRows: Transaction[] = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(100);

  const expenses = resultRows.filter((row) => row.type === 'expense');
  const totalAmount = expenses.reduce((sum, row) => sum + row.amount, 0);
  const summary = buildSearchSummary(expenses, totalAmount, {
    month: inferred.month ?? inferred.periodLabel,
    category: inferred.category,
    type: 'expense',
  });

  return {
    success: true as const,
    query,
    period: summary.periodLabel,
    total: summary.totalAmount,
    averagePerDay: summary.dailyAverage,
    highlights: summary.breakdown.map((item) => ({
      label: item.label,
      amount: item.amount,
    })),
    insight: summary.insight,
  };
}

export async function buildAppCalendar(db: DbLike, userId: string, month?: string, date?: string) {
  const today = getCurrentDate();
  const targetMonth = month ?? date?.slice(0, 7) ?? getCurrentMonth();
  const selectedDate = date ?? (targetMonth === today.slice(0, 7) ? today : `${targetMonth}-01`);

  const monthlyTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        like(transactions.date, `${targetMonth}%`),
        isNull(transactions.deletedAt)
      )
    )
    .orderBy(desc(transactions.date), desc(transactions.id));

  const totalsByDate = new Map<string, { income: number; expense: number; count: number }>();
  for (const transaction of monthlyTransactions as Array<{ date: string; type: string; amount: number }>) {
    const current = totalsByDate.get(transaction.date) ?? { income: 0, expense: 0, count: 0 };
    current.count += 1;
    if (transaction.type === 'income') {
      current.income += transaction.amount;
    } else {
      current.expense += transaction.amount;
    }
    totalsByDate.set(transaction.date, current);
  }

  const selectedTotals = totalsByDate.get(selectedDate) ?? { income: 0, expense: 0, count: 0 };
  const days = buildDateStrings(targetMonth).map((day) => {
    const totals = totalsByDate.get(day.date) ?? { income: 0, expense: 0, count: 0 };
    return {
      ...day,
      isToday: day.date === today,
      isSelected: day.date === selectedDate,
      income: totals.income,
      expense: totals.expense,
      transactionCount: totals.count,
      hasIncome: totals.income > 0,
      hasExpense: totals.expense > 0,
    };
  });

  const summary = Array.from(totalsByDate.values()).reduce(
    (acc, totals) => {
      acc.income += totals.income;
      acc.expense += totals.expense;
      acc.transactionCount += totals.count;
      return acc;
    },
    { income: 0, expense: 0, transactionCount: 0 }
  );

  return {
    success: true as const,
    month: targetMonth,
    selectedDate,
    monthLabel: monthLabel(targetMonth),
    summary: {
      income: summary.income,
      expense: summary.expense,
      net: summary.income - summary.expense,
      transactionCount: summary.transactionCount,
    },
    days,
    selectedDay: {
      date: selectedDate,
      income: selectedTotals.income,
      expense: selectedTotals.expense,
      net: selectedTotals.income - selectedTotals.expense,
      transactions: (monthlyTransactions as Array<{
        id: number;
        type: 'income' | 'expense';
        amount: number;
        category: string;
        memo: string | null;
        date: string;
        createdAt?: string | null;
      }>).filter((transaction) => transaction.date === selectedDate).map((transaction) => ({
        ...transaction,
        createdAt: transaction.createdAt ?? new Date().toISOString(),
      })),
    },
  };
}

function buildCategoryBreakdown(
  rows: Array<{ category: string; total: number; count: number }>,
  type: 'income' | 'expense'
) {
  return rows
    .filter((row) => (row.total ?? 0) > 0)
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    .slice(0, 6)
    .map((row) => ({
      type,
      category: row.category,
      total: row.total ?? 0,
      count: row.count ?? 0,
      emoji:
        row.category === '식비'
          ? '🍱'
          : row.category === '교통'
            ? '🚇'
            : row.category === '카페'
              ? '☕'
              : row.category === '월급'
                ? '💰'
                : '🧾',
    }));
}

export async function buildAppStats(db: DbLike, userId: string, month?: string) {
  const targetMonth = month ?? getCurrentMonth();
  const previousMonthDate = new Date(`${targetMonth}-01T00:00:00`);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonth = previousMonthDate.toISOString().slice(0, 7);

  const [summaryRows, categoryRows, dailyRows, previousMonthRows, latestReports] = await Promise.all([
    db
      .select({
        type: transactions.type,
        total: sql<number>`SUM(${transactions.amount})`.as('total'),
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), like(transactions.date, `${targetMonth}%`), isNull(transactions.deletedAt)))
      .groupBy(transactions.type),
    db
      .select({
        type: transactions.type,
        category: transactions.category,
        total: sql<number>`SUM(${transactions.amount})`.as('total'),
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), like(transactions.date, `${targetMonth}%`), isNull(transactions.deletedAt)))
      .groupBy(transactions.type, transactions.category),
    db
      .select({
        day: transactions.date,
        income: sql<number>`SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END)`.as('income'),
        expense: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END)`.as('expense'),
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), like(transactions.date, `${targetMonth}%`), isNull(transactions.deletedAt)))
      .groupBy(transactions.date)
      .orderBy(transactions.date),
    db
      .select({
        type: transactions.type,
        total: sql<number>`SUM(${transactions.amount})`.as('total'),
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), like(transactions.date, `${previousMonth}%`), isNull(transactions.deletedAt)))
      .groupBy(transactions.type),
    db
      .select({
        id: reports.id,
        reportType: reports.reportType,
        title: reports.title,
        subtitle: reports.subtitle,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(and(eq(reports.userId, userId)))
      .orderBy(desc(reports.createdAt))
      .limit(5),
  ]);

  const summaryMap = new Map<string, { total: number; count: number }>(
    summaryRows.map((row: { type: string; total: number; count: number }) => [row.type, { total: row.total ?? 0, count: row.count ?? 0 }])
  );
  const expenseRow = summaryMap.get('expense') ?? { total: 0, count: 0 };
  const incomeRow = summaryMap.get('income') ?? { total: 0, count: 0 };
  const previousMap = new Map<string, { total: number }>(
    previousMonthRows.map((row: { type: string; total: number }) => [row.type, { total: row.total ?? 0 }])
  );

  const previousExpense = previousMap.get('expense')?.total ?? 0;
  const previousIncome = previousMap.get('income')?.total ?? 0;

  const expenseCategories = buildCategoryBreakdown(
    categoryRows.filter((row: { type: string }) => row.type === 'expense') as Array<{ category: string; total: number; count: number }>,
    'expense'
  );
  const incomeCategories = buildCategoryBreakdown(
    categoryRows.filter((row: { type: string }) => row.type === 'income') as Array<{ category: string; total: number; count: number }>,
    'income'
  );

  return {
    success: true as const,
    month: targetMonth,
    monthLabel: monthLabel(targetMonth),
    summary: {
      expense: expenseRow.total ?? 0,
      income: incomeRow.total ?? 0,
      net: (incomeRow.total ?? 0) - (expenseRow.total ?? 0),
      transactionCount: (expenseRow.count ?? 0) + (incomeRow.count ?? 0),
      expenseDelta: Math.abs((expenseRow.total ?? 0) - previousExpense),
      incomeDelta: Math.abs((incomeRow.total ?? 0) - previousIncome),
    },
    dailyTotals: dailyRows.map((row: { day: string; income: number; expense: number }) => ({
      day: row.day.slice(5),
      income: row.income ?? 0,
      expense: row.expense ?? 0,
    })),
    expenseCategories,
    incomeCategories,
    recentReports: latestReports.map((report: { id: number; reportType: string; title: string; subtitle: string | null; createdAt: string | null }) => ({
      id: report.id,
      reportType: report.reportType,
      title: report.title,
      subtitle: report.subtitle ?? null,
      createdAt: report.createdAt,
    })),
  };
}

export async function buildAppBootstrap(db: DbLike, userId: string) {
  const sessions = await listSessions(db, userId, 10);
  const latestSession = sessions[0] ?? null;
  const latestMessages = latestSession ? await getChatHistoryBySession(db, latestSession.id, userId, 20) : [];

  return {
    success: true as const,
    sessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })),
    activeSession: latestSession
      ? {
          id: latestSession.id,
          title: latestSession.title,
          createdAt: latestSession.createdAt,
          updatedAt: latestSession.updatedAt,
        }
      : null,
    messages: latestMessages,
  };
}

export async function buildAppTimeline(db: DbLike, userId: string, sessionId?: number) {
  const sessions = await listSessions(db, userId, 1);
  const resolvedSessionId = sessionId ?? sessions[0]?.id ?? null;

  if (!resolvedSessionId) {
    return {
      success: true as const,
      sessionId: null,
      items: [] as Array<Record<string, unknown>>,
    };
  }

  const messages = await getChatHistoryBySession(db, resolvedSessionId, userId, 50);

  return {
    success: true as const,
    sessionId: resolvedSessionId,
    items: messages.map((message) => ({
      id: message.id,
      kind: message.role === 'user' ? 'user_message' : 'assistant_message',
      role: message.role,
      content: message.content,
      metadata: message.metadata ?? null,
      createdAt: message.createdAt,
    })),
  };
}
