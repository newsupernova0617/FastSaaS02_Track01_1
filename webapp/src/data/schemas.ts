import { z } from 'zod';

export const homeResponseSchema = z.object({
  success: z.literal(true),
  screen: z.object({
    sessionId: z.number().nullable().optional(),
    dateLabel: z.string(),
    userMessage: z.string(),
    assistantMessage: z.string(),
    card: z.object({
      emoji: z.string(),
      category: z.string(),
      sublabel: z.string(),
      amount: z.number(),
      currency: z.string(),
    }),
    followUpMessage: z.string(),
    inputPlaceholder: z.string(),
    messages: z.array(
      z.object({
        id: z.number(),
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional(),
        createdAt: z.string(),
      })
    ).optional().default([]),
  }),
});

export const reportResponseSchema = z.object({
  success: z.literal(true),
  month: z.string(),
  summary: z.object({
    total: z.number(),
    delta: z.number(),
    direction: z.enum(['up', 'down']),
    label: z.string(),
  }),
  dailySpending: z.array(
    z.object({
      day: z.string(),
      amount: z.number(),
    })
  ),
  categories: z.array(
    z.object({
      emoji: z.string(),
      name: z.string(),
      total: z.number(),
    })
  ),
});

export const searchResponseSchema = z.object({
  success: z.literal(true),
  query: z.string(),
  period: z.string(),
  total: z.number(),
  averagePerDay: z.number(),
  highlights: z.array(
    z.object({
      label: z.string(),
      amount: z.number(),
    })
  ),
  insight: z.string(),
});

export const statsCategorySchema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string(),
  total: z.number(),
  count: z.number(),
  emoji: z.string(),
});

export const statsDailySchema = z.object({
  day: z.string(),
  income: z.number(),
  expense: z.number(),
});

export const statsResponseSchema = z.object({
  success: z.literal(true),
  month: z.string(),
  monthLabel: z.string(),
  summary: z.object({
    expense: z.number(),
    income: z.number(),
    net: z.number(),
    transactionCount: z.number(),
    expenseDelta: z.number(),
    incomeDelta: z.number(),
  }),
  dailyTotals: z.array(statsDailySchema),
  expenseCategories: z.array(statsCategorySchema),
  incomeCategories: z.array(statsCategorySchema),
  recentReports: z.array(
    z.object({
      id: z.number(),
      reportType: z.string(),
      title: z.string(),
      subtitle: z.string().nullable(),
      createdAt: z.string(),
    })
  ),
});

export const calendarTransactionSchema = z.object({
  id: z.number(),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  category: z.string(),
  memo: z.string().nullable().optional(),
  date: z.string(),
  createdAt: z.string(),
});

export const calendarDaySchema = z.object({
  date: z.string(),
  day: z.number(),
  weekday: z.number(),
  isToday: z.boolean(),
  isSelected: z.boolean(),
  income: z.number(),
  expense: z.number(),
  transactionCount: z.number(),
  hasIncome: z.boolean(),
  hasExpense: z.boolean(),
});

export const calendarResponseSchema = z.object({
  success: z.literal(true),
  month: z.string(),
  selectedDate: z.string(),
  monthLabel: z.string(),
  summary: z.object({
    income: z.number(),
    expense: z.number(),
    net: z.number(),
    transactionCount: z.number(),
  }),
  days: z.array(calendarDaySchema),
  selectedDay: z.object({
    date: z.string(),
    income: z.number(),
    expense: z.number(),
    net: z.number(),
    transactions: z.array(calendarTransactionSchema),
  }),
});

export const appTransactionSchema = calendarTransactionSchema;

export const appTransactionsResponseSchema = z.object({
  success: z.literal(true),
  month: z.string(),
  transactions: z.array(appTransactionSchema),
});

export const appTransactionCreateResponseSchema = z.object({
  success: z.literal(true),
  transaction: appTransactionSchema,
});

export const appTransactionDeleteResponseSchema = z.object({
  success: z.literal(true),
  deletedTransactionId: z.number(),
});

export const appSessionSchema = z.object({
  id: z.number(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const bootstrapResponseSchema = z.object({
  success: z.literal(true),
  sessions: z.array(appSessionSchema),
  activeSession: appSessionSchema.nullable(),
  messages: z.array(
    z.object({
      id: z.number(),
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      metadata: z.record(z.string(), z.unknown()).nullable().optional(),
      createdAt: z.string(),
    })
  ),
});

export const sessionsResponseSchema = z.object({
  success: z.literal(true),
  sessions: z.array(appSessionSchema),
});

export const timelineItemSchema = z.object({
  id: z.number(),
  kind: z.enum(['user_message', 'assistant_message']),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string(),
});

export const timelineResponseSchema = z.object({
  success: z.literal(true),
  sessionId: z.number().nullable(),
  items: z.array(timelineItemSchema),
});

export const createSessionResponseSchema = z.object({
  success: z.literal(true),
  session: z.object({
    id: z.number(),
    title: z.string(),
    createdAt: z.string(),
  }),
});

export const deleteSessionResponseSchema = z.object({
  success: z.literal(true),
  deletedSessionId: z.number(),
});

export const updateSessionResponseSchema = z.object({
  success: z.literal(true),
  session: appSessionSchema,
});

export const appChatResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.number().optional(),
  type: z.string().optional(),
  error: z.string().optional(),
  messages: z.array(
    z.object({
      id: z.number(),
      sessionId: z.number(),
      userId: z.string(),
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      metadata: z.record(z.string(), z.unknown()).nullable().optional(),
      createdAt: z.string(),
    })
  ).optional(),
});

export const appReportSummarySchema = z.object({
  id: z.number(),
  reportType: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const appReportsResponseSchema = z.object({
  success: z.literal(true),
  reports: z.array(appReportSummarySchema),
});

export const appReportDetailSchema = z.object({
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

export const appCurrentReportResponseSchema = z.object({
  success: z.literal(true),
  report: appReportDetailSchema,
});

export const appGenerateReportResponseSchema = z.object({
  success: z.literal(true),
  report: appReportDetailSchema,
});

export const appUpdateReportResponseSchema = z.object({
  success: z.literal(true),
  report: appReportDetailSchema,
});

export const appDeleteReportResponseSchema = z.object({
  success: z.literal(true),
  deletedReportId: z.number(),
});

export const appProfileResponseSchema = z.object({
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

export const appPushSubscriptionSchema = z.object({
  id: z.string(),
  endpoint: z.string(),
  expirationTime: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const appPushSubscriptionsResponseSchema = z.object({
  success: z.literal(true),
  subscriptions: z.array(appPushSubscriptionSchema),
});

export const appPushPublicKeyResponseSchema = z.object({
  success: z.literal(true),
  publicKey: z.string(),
});

export const appPushSubscribeResponseSchema = z.object({
  success: z.literal(true),
  subscriptionId: z.string(),
  userId: z.string(),
  quickEntryToken: z.string(),
  publicKey: z.string(),
});

export const appPushUnsubscribeResponseSchema = z.object({
  success: z.literal(true),
  removed: z.number(),
});

export const appPushTestResponseSchema = z.object({
  success: z.literal(true),
  delivered: z.number(),
  expired: z.number(),
  failed: z.number(),
});

export type HomeResponse = z.infer<typeof homeResponseSchema>;
export type ReportResponse = z.infer<typeof reportResponseSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type StatsResponse = z.infer<typeof statsResponseSchema>;
export type CalendarResponse = z.infer<typeof calendarResponseSchema>;
export type AppTransaction = z.infer<typeof appTransactionSchema>;
export type AppTransactionsResponse = z.infer<typeof appTransactionsResponseSchema>;
export type AppTransactionCreateResponse = z.infer<typeof appTransactionCreateResponseSchema>;
export type AppTransactionDeleteResponse = z.infer<typeof appTransactionDeleteResponseSchema>;
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
export type SessionsResponse = z.infer<typeof sessionsResponseSchema>;
export type TimelineResponse = z.infer<typeof timelineResponseSchema>;
export type CreateSessionResponse = z.infer<typeof createSessionResponseSchema>;
export type DeleteSessionResponse = z.infer<typeof deleteSessionResponseSchema>;
export type UpdateSessionResponse = z.infer<typeof updateSessionResponseSchema>;
export type AppChatResponse = z.infer<typeof appChatResponseSchema>;
export type AppReportSummary = z.infer<typeof appReportSummarySchema>;
export type AppReportsResponse = z.infer<typeof appReportsResponseSchema>;
export type AppReportDetail = z.infer<typeof appReportDetailSchema>;
export type AppCurrentReportResponse = z.infer<typeof appCurrentReportResponseSchema>;
export type AppGenerateReportResponse = z.infer<typeof appGenerateReportResponseSchema>;
export type AppUpdateReportResponse = z.infer<typeof appUpdateReportResponseSchema>;
export type AppDeleteReportResponse = z.infer<typeof appDeleteReportResponseSchema>;
export type AppProfileResponse = z.infer<typeof appProfileResponseSchema>;
export type AppPushSubscription = z.infer<typeof appPushSubscriptionSchema>;
export type AppPushSubscriptionsResponse = z.infer<typeof appPushSubscriptionsResponseSchema>;
export type AppPushPublicKeyResponse = z.infer<typeof appPushPublicKeyResponseSchema>;
export type AppPushSubscribeResponse = z.infer<typeof appPushSubscribeResponseSchema>;
export type AppPushUnsubscribeResponse = z.infer<typeof appPushUnsubscribeResponseSchema>;
export type AppPushTestResponse = z.infer<typeof appPushTestResponseSchema>;
