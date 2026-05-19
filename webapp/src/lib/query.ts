import { QueryClient } from '@tanstack/query-core';
import { fetchCalendarPreview, fetchHomePreview, fetchMonthlyReportPreview, fetchReportPreview, fetchSearchPreview, fetchStatsPreview, fetchTransactionsPreview, type SourcedData } from '../data/preview-api';
import type { AppTransactionsResponse, CalendarResponse, HomeResponse, ReportResponse, SearchResponse, StatsResponse, AppCurrentReportResponse } from '../data/schemas';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
    },
  },
});

export const homeQueryOptions = () => ({
  queryKey: ['preview', 'home'] as const,
  queryFn: fetchHomePreview as () => Promise<SourcedData<HomeResponse>>,
});

export const reportQueryOptions = (month: string) => ({
  queryKey: ['preview', 'report', month] as const,
  queryFn: () => fetchReportPreview(month) as Promise<SourcedData<ReportResponse>>,
});

export const searchQueryOptions = (query: string) => ({
  queryKey: ['preview', 'search', query] as const,
  queryFn: () => fetchSearchPreview(query) as Promise<SourcedData<SearchResponse>>,
});

export const calendarQueryOptions = (month: string, selectedDate: string) => ({
  queryKey: ['preview', 'calendar', month, selectedDate] as const,
  queryFn: () => fetchCalendarPreview(month, selectedDate) as Promise<SourcedData<CalendarResponse>>,
});

export const statsQueryOptions = (month: string) => ({
  queryKey: ['preview', 'stats', month] as const,
  queryFn: () => fetchStatsPreview(month) as Promise<SourcedData<StatsResponse>>,
});

export const recordQueryOptions = (month: string) => ({
  queryKey: ['preview', 'transactions', month] as const,
  queryFn: () => fetchTransactionsPreview(month) as Promise<SourcedData<AppTransactionsResponse>>,
});

export const monthlyReportQueryOptions = (month: string) => ({
  queryKey: ['preview', 'monthly-report', month] as const,
  queryFn: () => fetchMonthlyReportPreview(month) as Promise<SourcedData<AppCurrentReportResponse>>,
});
