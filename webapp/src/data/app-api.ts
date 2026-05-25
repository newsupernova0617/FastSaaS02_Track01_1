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
import { authStore } from '../state/auth-store';
import { z } from 'zod';
import type { Session } from '@supabase/supabase-js';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const syncUserResponseSchema = z.object({
  success: z.literal(true),
});

if (!apiBaseUrl) {
  throw new Error('Missing API env: set VITE_API_BASE_URL in webapp/.env');
}

async function parseJson<T>(response: Response, schema: { parse: (data: unknown) => T }): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return schema.parse(await response.json());
}

function getAccessToken(): string {
  if (typeof window === 'undefined') {
    throw new Error('Access token is unavailable outside the browser.');
  }

  const sessionToken = authStore.getState().session?.access_token;
  if (sessionToken) return sessionToken;

  const directToken = localStorage.getItem('access_token');
  if (directToken) return directToken;

  const supabaseToken = localStorage.getItem('supabase.auth.token');
  if (!supabaseToken) {
    throw new Error('Missing auth token. Sign in again.');
  }

  try {
    const parsed = JSON.parse(supabaseToken);
    if (typeof parsed?.access_token === 'string') return parsed.access_token;
    if (typeof parsed?.currentSession?.access_token === 'string') return parsed.currentSession.access_token;
  } catch {
    if (supabaseToken.split('.').length === 3) return supabaseToken;
  }

  throw new Error('Missing auth token. Sign in again.');
}

export function getStoredAccessToken(): string | null {
  try {
    return getAccessToken();
  } catch {
    return null;
  }
}

export async function syncAppUser(session: Session | null): Promise<void> {
  if (!session) return;

  const metadata = session.user.user_metadata ?? {};
  const provider = session.user.app_metadata?.provider ?? 'supabase';
  await apiSend('/api/users/sync', syncUserResponseSchema, {
    method: 'POST',
    body: JSON.stringify({
      email: session.user.email ?? undefined,
      name: (metadata.name ?? metadata.full_name) || undefined,
      avatar_url: (metadata.avatar_url ?? metadata.picture) || undefined,
      provider,
    }),
  });
}

async function apiRequest<T>(
  path: string,
  schema: { parse: (data: unknown) => T },
  init: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    throw new Error('Unauthorized. Please sign in again.');
  }

  if (response.status === 403) {
    throw new Error('Forbidden.');
  }

  return parseJson(response, schema);
}

async function apiGet<T>(path: string, schema: { parse: (data: unknown) => T }): Promise<T> {
  return apiRequest(path, schema);
}

async function apiSend<T>(
  path: string,
  schema: { parse: (data: unknown) => T },
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return apiRequest(path, schema, {
    ...init,
    headers,
  });
}

export async function fetchAppBootstrap(): Promise<BootstrapResponse> {
  return apiGet('/api/app/bootstrap', bootstrapResponseSchema);
}

export async function fetchAppSessions(): Promise<SessionsResponse> {
  return apiGet('/api/app/sessions', sessionsResponseSchema);
}

export async function fetchAppTimeline(sessionId?: number | null): Promise<TimelineResponse> {
  const query = sessionId ? `?sessionId=${sessionId}` : '';
  return apiGet(`/api/app/timeline${query}`, timelineResponseSchema);
}

export async function fetchAppReports(month?: string, limit = 10): Promise<AppReportsResponse> {
  const query = new URLSearchParams();
  if (month) query.set('month', month);
  query.set('limit', String(limit));
  return apiGet(`/api/app/reports?${query.toString()}`, appReportsResponseSchema);
}

export async function fetchAppReportDetail(reportId: number): Promise<AppCurrentReportResponse> {
  return apiGet(`/api/app/reports/${reportId}`, appCurrentReportResponseSchema);
}

export async function fetchAppProfile(): Promise<AppProfileResponse> {
  return apiGet('/api/app/profile', appProfileResponseSchema);
}

export async function fetchAppPushPublicKey(): Promise<AppPushPublicKeyResponse> {
  return apiGet('/api/app/push/public-key', appPushPublicKeyResponseSchema);
}

export async function fetchAppPushSubscriptions(): Promise<AppPushSubscriptionsResponse> {
  return apiGet('/api/app/push/subscriptions', appPushSubscriptionsResponseSchema);
}

export async function registerAppPushSubscription(input: {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}): Promise<AppPushSubscribeResponse> {
  return apiSend('/api/app/push/subscribe', appPushSubscribeResponseSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function unregisterAppPushSubscription(input: { endpoint: string }): Promise<AppPushUnsubscribeResponse> {
  return apiSend('/api/app/push/subscribe', appPushUnsubscribeResponseSchema, {
    method: 'DELETE',
    body: JSON.stringify(input),
  });
}

export async function sendAppQuickEntryTest(): Promise<AppPushTestResponse> {
  return apiSend('/api/app/push/test', appPushTestResponseSchema, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function createAppSession(input: { title?: string; firstMessage?: string }): Promise<CreateSessionResponse> {
  return apiSend('/api/app/sessions', createSessionResponseSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteAppSession(sessionId: number): Promise<DeleteSessionResponse> {
  return apiSend(`/api/app/sessions/${sessionId}`, deleteSessionResponseSchema, {
    method: 'DELETE',
  });
}

export async function updateAppSession(sessionId: number, input: { title: string }): Promise<UpdateSessionResponse> {
  return apiSend(`/api/app/sessions/${sessionId}`, updateSessionResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function sendAppChat(input: { sessionId?: number | null; content: string; title?: string }): Promise<AppChatResponse> {
  return apiSend('/api/app/chat', appChatResponseSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchAppHome(): Promise<HomeResponse> {
  return apiGet('/api/app/home', homeResponseSchema);
}

export async function fetchAppReport(month?: string): Promise<ReportResponse> {
  return apiGet(`/api/app/report${month ? `?month=${month}` : ''}`, reportResponseSchema);
}

export async function fetchAppSearch(query: string): Promise<SearchResponse> {
  return apiGet(`/api/app/search?q=${encodeURIComponent(query)}`, searchResponseSchema);
}

export async function fetchAppCalendar(month?: string, selectedDate?: string): Promise<CalendarResponse> {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (selectedDate) params.set('date', selectedDate);
  return apiGet(`/api/app/calendar${params.toString() ? `?${params.toString()}` : ''}`, calendarResponseSchema);
}

export async function fetchAppTransactions(month?: string): Promise<AppTransactionsResponse> {
  const query = new URLSearchParams();
  if (month) query.set('month', month);
  return apiGet(`/api/app/transactions${query.toString() ? `?${query.toString()}` : ''}`, appTransactionsResponseSchema);
}

export async function fetchAppCurrentReport(input: {
  period: 'weekly' | 'monthly';
  month?: string;
  weekStart?: string;
  weekEnd?: string;
}): Promise<AppCurrentReportResponse> {
  const query = new URLSearchParams();
  query.set('period', input.period);
  if (input.month) query.set('month', input.month);
  if (input.weekStart) query.set('weekStart', input.weekStart);
  if (input.weekEnd) query.set('weekEnd', input.weekEnd);
  return apiGet(`/api/app/reports/current?${query.toString()}`, appCurrentReportResponseSchema);
}

export async function fetchAppMonthlyReport(month?: string): Promise<AppCurrentReportResponse> {
  return fetchAppCurrentReport({ period: 'monthly', month });
}

export async function generateAppReport(input: {
  period: 'weekly' | 'monthly';
  month?: string;
  weekStart?: string;
  weekEnd?: string;
}): Promise<AppGenerateReportResponse> {
  return apiSend('/api/app/reports/generate', appGenerateReportResponseSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAppReport(reportId: number, input: { title: string }): Promise<AppUpdateReportResponse> {
  return apiSend(`/api/app/reports/${reportId}`, appUpdateReportResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteAppReport(reportId: number): Promise<AppDeleteReportResponse> {
  return apiSend(`/api/app/reports/${reportId}`, appDeleteReportResponseSchema, {
    method: 'DELETE',
  });
}

export async function createAppTransaction(input: {
  transactionType: 'income' | 'expense';
  amount: number;
  category: string;
  memo?: string;
  date: string;
}): Promise<AppTransactionCreateResponse> {
  return apiSend('/api/app/transactions', appTransactionCreateResponseSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteAppTransaction(id: number): Promise<AppTransactionDeleteResponse> {
  return apiSend(`/api/app/transactions/${id}`, appTransactionDeleteResponseSchema, {
    method: 'DELETE',
  });
}

export async function fetchAppStats(month?: string): Promise<StatsResponse> {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  return apiGet(`/api/app/stats${params.toString() ? `?${params.toString()}` : ''}`, statsResponseSchema);
}
