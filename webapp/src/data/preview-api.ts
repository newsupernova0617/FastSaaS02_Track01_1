import {
  appChatResponseSchema,
  appProfileResponseSchema,
  appCurrentReportResponseSchema,
  appGenerateReportResponseSchema,
  appUpdateReportResponseSchema,
  appDeleteReportResponseSchema,
  appPushPublicKeyResponseSchema,
  appPushSubscribeResponseSchema,
  appPushSubscriptionsResponseSchema,
  appPushTestResponseSchema,
  appPushUnsubscribeResponseSchema,
  calendarResponseSchema,
  appReportsResponseSchema,
  appTransactionsResponseSchema,
  appTransactionCreateResponseSchema,
  appTransactionDeleteResponseSchema,
  statsResponseSchema,
  bootstrapResponseSchema,
  createSessionResponseSchema,
  deleteSessionResponseSchema,
  homeResponseSchema,
  reportResponseSchema,
  searchResponseSchema,
  sessionsResponseSchema,
  timelineResponseSchema,
  updateSessionResponseSchema,
  type AppChatResponse,
  type AppProfileResponse,
  type AppCurrentReportResponse,
  type AppGenerateReportResponse,
  type AppUpdateReportResponse,
  type AppDeleteReportResponse,
  type AppPushPublicKeyResponse,
  type AppPushSubscribeResponse,
  type AppPushSubscriptionsResponse,
  type AppPushTestResponse,
  type AppPushUnsubscribeResponse,
  type CalendarResponse,
  type AppReportsResponse,
  type AppTransactionsResponse,
  type AppTransactionCreateResponse,
  type AppTransactionDeleteResponse,
  type BootstrapResponse,
  type CreateSessionResponse,
  type DeleteSessionResponse,
  type HomeResponse,
  type ReportResponse,
  type SearchResponse,
  type StatsResponse,
  type SessionsResponse,
  type TimelineResponse,
  type UpdateSessionResponse,
} from './schemas';
import { getMockCalendarResponse, getMockCurrentReportResponse, getMockHomeResponse, getMockReportResponse, getMockSearchResponse, getMockStatsResponse, getMockTransactionsResponse } from './mock-data';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787';

export type DataSource = 'live' | 'preview';
export type SourcedData<T> = {
  source: DataSource;
  data: T;
};

async function parseJson<T>(response: Response, schema: { parse: (data: unknown) => T }): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return schema.parse(await response.json());
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const directToken = localStorage.getItem('access_token');
  if (directToken) return directToken;

  const supabaseToken = localStorage.getItem('supabase.auth.token');
  if (!supabaseToken) return null;

  try {
    const parsed = JSON.parse(supabaseToken);
    if (typeof parsed?.access_token === 'string') return parsed.access_token;
    if (typeof parsed?.currentSession?.access_token === 'string') return parsed.currentSession.access_token;
  } catch {
    if (supabaseToken.split('.').length === 3) return supabaseToken;
  }

  return null;
}

export function getStoredAccessToken(): string | null {
  return getAccessToken();
}

async function fetchWithOptionalAuth(path: string): Promise<Response | null> {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return response;
}

export async function fetchAppBootstrap(): Promise<BootstrapResponse | null> {
  const appResponse = await fetchWithOptionalAuth('/api/app/bootstrap');
  if (!appResponse) return null;
  return parseJson(appResponse, bootstrapResponseSchema);
}

export async function fetchAppSessions(): Promise<SessionsResponse | null> {
  const appResponse = await fetchWithOptionalAuth('/api/app/sessions');
  if (!appResponse) return null;
  return parseJson(appResponse, sessionsResponseSchema);
}

export async function fetchAppTimeline(sessionId?: number | null): Promise<TimelineResponse | null> {
  const query = sessionId ? `?sessionId=${sessionId}` : '';
  const appResponse = await fetchWithOptionalAuth(`/api/app/timeline${query}`);
  if (!appResponse) return null;
  return parseJson(appResponse, timelineResponseSchema);
}

export async function fetchAppReports(month?: string, limit = 10): Promise<AppReportsResponse | null> {
  const query = new URLSearchParams();
  if (month) query.set('month', month);
  query.set('limit', String(limit));
  const appResponse = await fetchWithOptionalAuth(`/api/app/reports?${query.toString()}`);
  if (!appResponse) return null;
  return parseJson(appResponse, appReportsResponseSchema);
}

export async function fetchAppReportDetail(reportId: number): Promise<AppCurrentReportResponse | null> {
  const appResponse = await fetchWithOptionalAuth(`/api/app/reports/${reportId}`);
  if (!appResponse) return null;
  return parseJson(appResponse, appCurrentReportResponseSchema);
}

export async function fetchAppProfile(): Promise<AppProfileResponse | null> {
  const appResponse = await fetchWithOptionalAuth('/api/app/profile');
  if (!appResponse) return null;
  return parseJson(appResponse, appProfileResponseSchema);
}

export async function fetchAppPushPublicKey(): Promise<AppPushPublicKeyResponse | null> {
  const appResponse = await fetchWithOptionalAuth('/api/app/push/public-key');
  if (!appResponse) return null;
  return parseJson(appResponse, appPushPublicKeyResponseSchema);
}

export async function fetchAppPushSubscriptions(): Promise<AppPushSubscriptionsResponse | null> {
  const appResponse = await fetchWithOptionalAuth('/api/app/push/subscriptions');
  if (!appResponse) return null;
  return parseJson(appResponse, appPushSubscriptionsResponseSchema);
}

export async function registerAppPushSubscription(input: {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}): Promise<AppPushSubscribeResponse | null> {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}/api/app/push/subscribe`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return parseJson(response, appPushSubscribeResponseSchema);
}

export async function unregisterAppPushSubscription(input: { endpoint: string }): Promise<AppPushUnsubscribeResponse | null> {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}/api/app/push/subscribe`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return parseJson(response, appPushUnsubscribeResponseSchema);
}

export async function sendAppQuickEntryTest(): Promise<AppPushTestResponse | null> {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}/api/app/push/test`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return parseJson(response, appPushTestResponseSchema);
}

export async function createAppSession(input: { title?: string; firstMessage?: string }): Promise<CreateSessionResponse | null> {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}/api/app/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return parseJson(response, createSessionResponseSchema);
}

export async function deleteAppSession(sessionId: number): Promise<DeleteSessionResponse | null> {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}/api/app/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return parseJson(response, deleteSessionResponseSchema);
}

export async function updateAppSession(sessionId: number, input: { title: string }): Promise<UpdateSessionResponse | null> {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}/api/app/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return parseJson(response, updateSessionResponseSchema);
}

export async function sendAppChat(input: { sessionId?: number | null; content: string; title?: string }): Promise<AppChatResponse | null> {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}/api/app/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return parseJson(response, appChatResponseSchema);
}

export async function fetchHomePreview(): Promise<SourcedData<HomeResponse>> {
  const appResponse = await fetchWithOptionalAuth('/api/app/home');
  if (appResponse) {
    return {
      source: 'live',
      data: await parseJson(appResponse, homeResponseSchema),
    };
  }

  return {
    source: 'preview',
    data: homeResponseSchema.parse(getMockHomeResponse()),
  };
}

export async function fetchReportPreview(month?: string): Promise<SourcedData<ReportResponse>> {
  const appResponse = await fetchWithOptionalAuth(`/api/app/report${month ? `?month=${month}` : ''}`);
  if (appResponse) {
    return {
      source: 'live',
      data: await parseJson(appResponse, reportResponseSchema),
    };
  }

  return {
    source: 'preview',
    data: reportResponseSchema.parse(getMockReportResponse(month)),
  };
}

export async function fetchSearchPreview(query: string): Promise<SourcedData<SearchResponse>> {
  const appResponse = await fetchWithOptionalAuth(`/api/app/search?q=${encodeURIComponent(query)}`);
  if (appResponse) {
    return {
      source: 'live',
      data: await parseJson(appResponse, searchResponseSchema),
    };
  }

  return {
    source: 'preview',
    data: searchResponseSchema.parse(getMockSearchResponse(query)),
  };
}

export async function fetchCalendarPreview(month?: string, selectedDate?: string): Promise<SourcedData<CalendarResponse>> {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (selectedDate) params.set('date', selectedDate);

  const appResponse = await fetchWithOptionalAuth(`/api/app/calendar${params.toString() ? `?${params.toString()}` : ''}`);
  if (appResponse) {
    return {
      source: 'live',
      data: await parseJson(appResponse, calendarResponseSchema),
    };
  }

  return {
    source: 'preview',
    data: calendarResponseSchema.parse(getMockCalendarResponse(month, selectedDate)),
  };
}

export async function fetchAppTransactions(month?: string): Promise<AppTransactionsResponse | null> {
  const query = new URLSearchParams();
  if (month) query.set('month', month);
  const appResponse = await fetchWithOptionalAuth(`/api/app/transactions${query.toString() ? `?${query.toString()}` : ''}`);
  if (!appResponse) return null;
  return parseJson(appResponse, appTransactionsResponseSchema);
}

export async function fetchTransactionsPreview(month?: string): Promise<SourcedData<AppTransactionsResponse>> {
  const live = await fetchAppTransactions(month);
  if (live) {
    return {
      source: 'live',
      data: live,
    };
  }

  return {
    source: 'preview',
    data: appTransactionsResponseSchema.parse(getMockTransactionsResponse(month)),
  };
}

export async function fetchAppCurrentReport(input: { period: 'weekly' | 'monthly'; month?: string; weekStart?: string; weekEnd?: string }): Promise<AppCurrentReportResponse | null> {
  const query = new URLSearchParams();
  query.set('period', input.period);
  if (input.month) query.set('month', input.month);
  if (input.weekStart) query.set('weekStart', input.weekStart);
  if (input.weekEnd) query.set('weekEnd', input.weekEnd);

  const appResponse = await fetchWithOptionalAuth(`/api/app/reports/current?${query.toString()}`);
  if (!appResponse) return null;
  return parseJson(appResponse, appCurrentReportResponseSchema);
}

export async function fetchMonthlyReportPreview(month?: string): Promise<SourcedData<AppCurrentReportResponse>> {
  const appResponse = await fetchAppCurrentReport({ period: 'monthly', month });
  if (appResponse) {
    return {
      source: 'live',
      data: appResponse,
    };
  }

  return {
    source: 'preview',
    data: appCurrentReportResponseSchema.parse(getMockCurrentReportResponse('monthly', month)),
  };
}

export async function generateAppReport(input: { period: 'weekly' | 'monthly'; month?: string; weekStart?: string; weekEnd?: string }): Promise<AppGenerateReportResponse | null> {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}/api/app/reports/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return parseJson(response, appGenerateReportResponseSchema);
}

export async function updateAppReport(reportId: number, input: { title: string }): Promise<AppUpdateReportResponse | null> {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}/api/app/reports/${reportId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return parseJson(response, appUpdateReportResponseSchema);
}

export async function deleteAppReport(reportId: number): Promise<AppDeleteReportResponse | null> {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}/api/app/reports/${reportId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return parseJson(response, appDeleteReportResponseSchema);
}

export async function createAppTransaction(input: {
  transactionType: 'income' | 'expense';
  amount: number;
  category: string;
  memo?: string;
  date: string;
}): Promise<AppTransactionCreateResponse | null> {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}/api/app/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return parseJson(response, appTransactionCreateResponseSchema);
}

export async function deleteAppTransaction(id: number): Promise<AppTransactionDeleteResponse | null> {
  const token = getAccessToken();
  if (!token) return null;

  const response = await fetch(`${apiBaseUrl}/api/app/transactions/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return parseJson(response, appTransactionDeleteResponseSchema);
}

export async function fetchStatsPreview(month?: string): Promise<SourcedData<StatsResponse>> {
  const params = new URLSearchParams();
  if (month) params.set('month', month);

  const appResponse = await fetchWithOptionalAuth(`/api/app/stats${params.toString() ? `?${params.toString()}` : ''}`);
  if (appResponse) {
    return {
      source: 'live',
      data: await parseJson(appResponse, statsResponseSchema),
    };
  }

  return {
    source: 'preview',
    data: statsResponseSchema.parse(getMockStatsResponse(month)),
  };
}
