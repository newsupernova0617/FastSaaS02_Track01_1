import type { Session } from '@supabase/supabase-js';
import type { QueryObserverResult } from '@tanstack/query-core';
import type {
  AppCurrentReportResponse,
  AppProfileResponse,
  AppReportsResponse,
  AppTransactionsResponse,
  BootstrapResponse,
  CalendarResponse,
  HomeResponse,
  ReportResponse,
  SearchResponse,
  StatsResponse,
  TimelineResponse,
} from './data/schemas';
import type { RouteName } from './state/app-store';

export type AppViewProps = {
  homeResult: QueryObserverResult<HomeResponse, Error>;
  calendarResult: QueryObserverResult<CalendarResponse, Error>;
  recordResult: QueryObserverResult<AppTransactionsResponse, Error>;
  statsResult: QueryObserverResult<StatsResponse, Error>;
  monthlyReportResult: QueryObserverResult<AppCurrentReportResponse, Error>;
  reportResult: QueryObserverResult<ReportResponse, Error>;
  searchResult: QueryObserverResult<SearchResponse, Error>;
  selectedReport: AppCurrentReportResponse | null;
  selectedReportLoading: boolean;
  selectedReportError: string | null;
  session: Session | null;
  authInitialized: boolean;
  authLoading: boolean;
  sessionCount: number;
  bootstrap: BootstrapResponse | null;
  timeline: TimelineResponse | null;
  reports: AppReportsResponse | null;
  profile: AppProfileResponse | null;
  onNavigate: (route: RouteName) => void;
  onPreviousCalendarMonth: () => void;
  onNextCalendarMonth: () => void;
  onSelectCalendarDate: (date: string) => void;
  onPreviousRecordMonth: () => void;
  onNextRecordMonth: () => void;
  onSubmitRecord: () => void;
  onDeleteTransaction: (id: number) => void;
  onPreviousStatsMonth: () => void;
  onNextStatsMonth: () => void;
  onPreviousMonthlyReportMonth: () => void;
  onNextMonthlyReportMonth: () => void;
  onGenerateMonthlyReport: () => void;
  onGenerateWeeklyReport: () => void;
  onSelectReport: (reportId: number) => void;
  onDeleteReport: (reportId: number) => void;
  onRenameReport: (reportId: number) => void;
  onRequestNotificationPermission: () => Promise<void>;
  quickEntrySubscribed: boolean;
  quickEntrySupported: boolean;
  quickEntryLoading: boolean;
  quickEntryError: string | null;
  onEnableQuickEntry: () => void;
  onDisableQuickEntry: () => void;
  onSendQuickEntryTest: () => void;
  onSelectSession: (sessionId: number) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: number) => void;
  onRenameSession: (sessionId: number) => void;
  onSubmitSearch: () => void;
  onSubmitComposer: () => void;
  onSignIn: (email: string, password: string) => void;
  onSignUp: (email: string, password: string) => void;
  onSignOut: () => void;
};

export type AppShellProps = AppViewProps & {
  route: RouteName;
  pageTitle: string;
  page: unknown;
};
