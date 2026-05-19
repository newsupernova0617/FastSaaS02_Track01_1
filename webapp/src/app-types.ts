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
import type { SourcedData } from './data/preview-api';
import type { RouteName } from './state/app-store';

export type AppViewProps = {
  homeResult: QueryObserverResult<SourcedData<HomeResponse>, Error>;
  calendarResult: QueryObserverResult<SourcedData<CalendarResponse>, Error>;
  recordResult: QueryObserverResult<SourcedData<AppTransactionsResponse>, Error>;
  statsResult: QueryObserverResult<SourcedData<StatsResponse>, Error>;
  monthlyReportResult: QueryObserverResult<SourcedData<AppCurrentReportResponse>, Error>;
  reportResult: QueryObserverResult<SourcedData<ReportResponse>, Error>;
  searchResult: QueryObserverResult<SourcedData<SearchResponse>, Error>;
  selectedReport: SourcedData<AppCurrentReportResponse> | null;
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
  onSignIn: () => void;
  onSignOut: () => void;
};

export type AppShellProps = AppViewProps & {
  route: RouteName;
  pageTitle: string;
  page: unknown;
};
