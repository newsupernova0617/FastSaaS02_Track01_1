import { QueryClient } from '@tanstack/query-core';
import { fetchAppCalendar, fetchAppHome, fetchAppMonthlyReport, fetchAppReport, fetchAppSearch, fetchAppStats, fetchAppTransactions } from '../data/app-api';
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
  queryKey: ['app', 'home'] as const,
  queryFn: fetchAppHome as () => Promise<HomeResponse>,
});

export const reportQueryOptions = (month: string) => ({
  queryKey: ['app', 'report', month] as const,
  queryFn: () => fetchAppReport(month) as Promise<ReportResponse>,
});

export const searchQueryOptions = (query: string) => ({
  queryKey: ['app', 'search', query] as const,
  queryFn: () => fetchAppSearch(query) as Promise<SearchResponse>,
});

export const calendarQueryOptions = (month: string, selectedDate: string) => ({
  queryKey: ['app', 'calendar', month, selectedDate] as const,
  queryFn: () => fetchAppCalendar(month, selectedDate) as Promise<CalendarResponse>,
});

export const statsQueryOptions = (month: string) => ({
  queryKey: ['app', 'stats', month] as const,
  queryFn: () => fetchAppStats(month) as Promise<StatsResponse>,
});

export const recordQueryOptions = (month: string) => ({
  queryKey: ['app', 'transactions', month] as const,
  queryFn: () => fetchAppTransactions(month) as Promise<AppTransactionsResponse>,
});

export const monthlyReportQueryOptions = (month: string) => ({
  queryKey: ['app', 'monthly-report', month] as const,
  queryFn: () => fetchAppMonthlyReport(month) as Promise<AppCurrentReportResponse>,
});
