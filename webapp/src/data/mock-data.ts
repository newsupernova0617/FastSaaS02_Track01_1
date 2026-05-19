import type { AppCurrentReportResponse, AppTransactionsResponse, CalendarResponse, HomeResponse, ReportResponse, SearchResponse, StatsResponse } from './schemas';

const reportDailySpending = [
  { day: '04/11', amount: 38000 },
  { day: '04/12', amount: 59200 },
  { day: '04/13', amount: 84700 },
  { day: '04/14', amount: 71300 },
  { day: '04/15', amount: 45200 },
  { day: '04/16', amount: 61100 },
  { day: '04/17', amount: 40100 },
];

const reportCategories = [
  { emoji: '🍱', name: '식비', total: 342000 },
  { emoji: '🚇', name: '교통', total: 128400 },
  { emoji: '☕', name: '카페', total: 47300 },
];

const mockStatsExpenseCategories: StatsResponse['expenseCategories'] = [
  { type: 'expense', category: '식비', total: 342000, count: 42, emoji: '🍱' },
  { type: 'expense', category: '교통', total: 128400, count: 18, emoji: '🚇' },
  { type: 'expense', category: '카페', total: 47300, count: 16, emoji: '☕' },
];

const mockStatsIncomeCategories: StatsResponse['incomeCategories'] = [
  { type: 'income', category: '월급', total: 2800000, count: 1, emoji: '💰' },
  { type: 'income', category: '용돈', total: 120000, count: 2, emoji: '🧾' },
];

type MockCalendarTransactionTemplate = Omit<CalendarResponse['selectedDay']['transactions'][number], 'date' | 'createdAt'> & {
  day: number;
  createdAtHour: number;
};

const mockCalendarTransactions: MockCalendarTransactionTemplate[] = [
  { id: 101, day: 17, type: 'expense', amount: 12000, category: '식비', memo: '점심', createdAtHour: 3 },
  { id: 102, day: 17, type: 'expense', amount: 4500, category: '카페', memo: '아이스라떼', createdAtHour: 6 },
  { id: 103, day: 25, type: 'income', amount: 2400000, category: '월급', memo: '급여', createdAtHour: 1 },
  { id: 104, day: 15, type: 'expense', amount: 18000, category: '교통', memo: '택시', createdAtHour: 12 },
  { id: 105, day: 16, type: 'expense', amount: 27600, category: '식비', memo: '저녁 회식', createdAtHour: 10 },
  { id: 106, day: 14, type: 'expense', amount: 8900, category: '식비', memo: '아침', createdAtHour: 0 },
  { id: 107, day: 12, type: 'expense', amount: 19500, category: '문화', memo: '영화', createdAtHour: 8 },
  { id: 108, day: 18, type: 'expense', amount: 16200, category: '쇼핑', memo: '생필품', createdAtHour: 4 },
];

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function monthLabel(month: string): string {
  const [year, value] = month.split('-');
  return `${year}년 ${value}월`;
}

function buildMonthDays(month: string) {
  const [year, monthValue] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthValue, 0)).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
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

function buildMonthTransactions(currentMonth: string) {
  const [year, monthValue] = currentMonth.split('-').map(Number);
  const days = buildMonthDays(currentMonth);
  const monthDayCount = days.length;

  return mockCalendarTransactions
    .filter((transaction) => transaction.day <= monthDayCount)
    .map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      memo: transaction.memo,
      date: `${currentMonth}-${pad2(transaction.day)}`,
      createdAt: `${year}-${pad2(monthValue)}-${pad2(transaction.day)}T${pad2(transaction.createdAtHour)}:20:00Z`,
    }));
}

function buildCalendarResponse(month?: string, selectedDate?: string): CalendarResponse {
  const currentMonth = month ?? '2026-04';
  const today = '2026-04-17';
  const days = buildMonthDays(currentMonth);
  const defaultDay = days.some((day) => day.day === 17) ? 17 : 1;
  const resolvedSelectedDate = selectedDate ?? (currentMonth === today.slice(0, 7) ? today : `${currentMonth}-${pad2(defaultDay)}`);
  const dailyTotals = new Map<string, { income: number; expense: number; transactionCount: number }>();
  const monthTransactions = buildMonthTransactions(currentMonth);

  for (const transaction of monthTransactions) {
    const current = dailyTotals.get(transaction.date) ?? { income: 0, expense: 0, transactionCount: 0 };
    current.transactionCount += 1;
    if (transaction.type === 'income') {
      current.income += transaction.amount;
    } else {
      current.expense += transaction.amount;
    }
    dailyTotals.set(transaction.date, current);
  }

  const selectedTransactions = monthTransactions.filter((transaction) => transaction.date === resolvedSelectedDate);
  const selectedTotals = dailyTotals.get(resolvedSelectedDate) ?? { income: 0, expense: 0, transactionCount: 0 };
  const summary = monthTransactions.reduce(
    (acc, transaction) => {
      acc.transactionCount += 1;
      if (transaction.type === 'income') acc.income += transaction.amount;
      if (transaction.type === 'expense') acc.expense += transaction.amount;
      return acc;
    },
    { income: 0, expense: 0, transactionCount: 0 }
  );

  return {
    success: true,
    month: currentMonth,
    selectedDate: resolvedSelectedDate,
    monthLabel: monthLabel(currentMonth),
    summary: {
      income: summary.income,
      expense: summary.expense,
      net: summary.income - summary.expense,
      transactionCount: summary.transactionCount,
    },
    days: days.map((day) => {
      const totals = dailyTotals.get(day.date) ?? { income: 0, expense: 0, transactionCount: 0 };
      return {
        ...day,
        isToday: day.date === today,
        isSelected: day.date === resolvedSelectedDate,
        income: totals.income,
        expense: totals.expense,
        transactionCount: totals.transactionCount,
        hasIncome: totals.income > 0,
        hasExpense: totals.expense > 0,
      };
    }),
    selectedDay: {
      date: resolvedSelectedDate,
      income: selectedTotals.income,
      expense: selectedTotals.expense,
      net: selectedTotals.income - selectedTotals.expense,
      transactions: selectedTransactions,
    },
  };
}

function buildTransactionsResponse(month?: string): AppTransactionsResponse {
  const currentMonth = month ?? '2026-04';
  const transactions = buildMonthTransactions(currentMonth);
  return {
    success: true,
    month: currentMonth,
    transactions,
  };
}

function buildCurrentReportResponse(period?: 'weekly' | 'monthly', month?: string): AppCurrentReportResponse {
  const currentMonth = month ?? '2026-04';
  const reportType = period === 'weekly' ? 'weekly_summary' : 'monthly_summary';
  return {
    success: true,
    report: {
      id: period === 'weekly' ? 701 : 702,
      reportType,
      title: period === 'weekly' ? '이번 주 요약' : `${currentMonth} 월간 요약`,
      subtitle: period === 'weekly' ? '주간 지출이 빠르게 늘었어요' : '월별 소비 패턴을 정리했어요',
      reportData: [
        {
          type: 'card',
          title: period === 'weekly' ? '주간 개요' : '월간 개요',
          body: period === 'weekly' ? '최근 7일 소비가 집중된 항목을 확인했습니다.' : '이번 달의 소비 흐름과 카테고리 분포를 확인했습니다.',
        },
        {
          type: 'bar',
          title: '카테고리 분포',
          data: [
            { label: '식비', value: 42 },
            { label: '교통', value: 19 },
            { label: '카페', value: 11 },
          ],
        },
      ],
      summary: {
        headline: period === 'weekly' ? '이번 주 지출' : '이번 달 지출',
        total: period === 'weekly' ? 186400 : 847300,
        delta: period === 'weekly' ? 12400 : 34200,
        direction: 'up',
      },
      params: period === 'weekly'
        ? { weekStart: '2026-04-13', weekEnd: '2026-04-19' }
        : { month: currentMonth },
      createdAt: '2026-04-30T01:00:00Z',
      updatedAt: '2026-04-30T01:00:00Z',
    },
  };
}

export function getMockHomeResponse(): HomeResponse {
  return {
    success: true,
    screen: {
      dateLabel: '4월 17일',
      userMessage: '어제 점심 12000원 썼어',
      assistantMessage: '기록했어요 ✓',
      card: {
        emoji: '🍱',
        category: '식비',
        sublabel: '2026.04.17 · 점심',
        amount: -12000,
        currency: '원',
      },
      followUpMessage: '저녁에 택시 15000원도',
      inputPlaceholder: '오늘 지출을 입력해보세요',
      messages: [],
    },
  };
}

export function getMockReportResponse(month?: string): ReportResponse {
  return {
    success: true,
    month: month ?? '2026-04',
    summary: {
      total: 847300,
      delta: 12400,
      direction: 'up',
      label: '이번 달 지출',
    },
    dailySpending: reportDailySpending,
    categories: reportCategories,
  };
}

export function getMockSearchResponse(query: string): SearchResponse {
  return {
    success: true,
    query,
    period: '4/8 - 4/14',
    total: 82400,
    averagePerDay: 11770,
    highlights: [
      { label: '🍱 점심', amount: 48000 },
      { label: '🍚 저녁', amount: 24400 },
      { label: '🥖 간식', amount: 10000 },
    ],
    insight: '지난주보다 18% 많아요. 점심값이 늘었어요.',
  };
}

export function getMockCalendarResponse(month?: string, selectedDate?: string): CalendarResponse {
  return buildCalendarResponse(month, selectedDate);
}

export function getMockTransactionsResponse(month?: string): AppTransactionsResponse {
  return buildTransactionsResponse(month);
}

export function getMockCurrentReportResponse(period?: 'weekly' | 'monthly', month?: string): AppCurrentReportResponse {
  return buildCurrentReportResponse(period, month);
}

export function getMockStatsResponse(month?: string): StatsResponse {
  return {
    success: true,
    month: month ?? '2026-04',
    monthLabel: '2026년 04월',
    summary: {
      expense: 847300,
      income: 2920000,
      net: 2072700,
      transactionCount: 79,
      expenseDelta: 12400,
      incomeDelta: 0,
    },
    dailyTotals: [
      { day: '04/11', income: 0, expense: 38000 },
      { day: '04/12', income: 0, expense: 59200 },
      { day: '04/13', income: 0, expense: 84700 },
      { day: '04/14', income: 0, expense: 71300 },
      { day: '04/15', income: 0, expense: 45200 },
      { day: '04/16', income: 0, expense: 61100 },
      { day: '04/17', income: 2400000, expense: 40100 },
    ],
    expenseCategories: mockStatsExpenseCategories,
    incomeCategories: mockStatsIncomeCategories,
    recentReports: [
      { id: 401, reportType: 'monthly_summary', title: '4월 월간 요약', subtitle: '지출이 조금 늘었어요', createdAt: '2026-04-30T01:00:00Z' },
      { id: 402, reportType: 'category_detail', title: '식비 상세', subtitle: '아침/점심/저녁 비중', createdAt: '2026-04-28T01:00:00Z' },
    ],
  };
}
