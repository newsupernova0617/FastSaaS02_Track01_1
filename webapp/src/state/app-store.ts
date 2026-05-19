import { createStore } from 'zustand/vanilla';

function getCurrentDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonthString(): string {
  return new Date().toISOString().slice(0, 7);
}

export type RouteName = 'home' | 'calendar' | 'record' | 'stats' | 'monthlyReport' | 'reports' | 'search' | 'settings' | 'help';

type AppState = {
  route: RouteName;
  calendarMonth: string;
  calendarDate: string;
  recordMonth: string;
  recordType: 'income' | 'expense';
  recordAmount: string;
  recordCategory: string;
  recordDate: string;
  recordMemo: string;
  recordSubmitting: boolean;
  recordError: string | null;
  statsMonth: string;
  monthlyReportMonth: string;
  searchDraft: string;
  submittedSearch: string;
  selectedReportId: number | null;
  composerDraft: string;
  activeSessionId: number | null;
  composerSending: boolean;
  composerError: string | null;
  sessionActionLoading: boolean;
  sessionActionError: string | null;
  reportActionLoading: boolean;
  reportActionError: string | null;
  editingSessionId: number | null;
  sessionTitleDraft: string;
  editingReportId: number | null;
  reportTitleDraft: string;
  setRoute: (route: RouteName) => void;
  setCalendarMonth: (value: string) => void;
  setCalendarDate: (value: string) => void;
  setCalendarSelection: (month: string, date: string) => void;
  setRecordMonth: (value: string) => void;
  setRecordType: (value: 'income' | 'expense') => void;
  setRecordAmount: (value: string) => void;
  setRecordCategory: (value: string) => void;
  setRecordDate: (value: string) => void;
  setRecordMemo: (value: string) => void;
  setRecordSubmitting: (value: boolean) => void;
  setRecordError: (value: string | null) => void;
  resetRecordForm: () => void;
  setStatsMonth: (value: string) => void;
  setMonthlyReportMonth: (value: string) => void;
  setSearchDraft: (value: string) => void;
  submitSearch: (value?: string) => void;
  setSelectedReportId: (value: number | null) => void;
  setComposerDraft: (value: string) => void;
  setActiveSessionId: (value: number | null) => void;
  setComposerSending: (value: boolean) => void;
  setComposerError: (value: string | null) => void;
  setSessionActionLoading: (value: boolean) => void;
  setSessionActionError: (value: string | null) => void;
  setReportActionLoading: (value: boolean) => void;
  setReportActionError: (value: string | null) => void;
  startEditingSession: (sessionId: number, title: string) => void;
  setSessionTitleDraft: (value: string) => void;
  stopEditingSession: () => void;
  startEditingReport: (reportId: number, title: string) => void;
  setReportTitleDraft: (value: string) => void;
  stopEditingReport: () => void;
};

export const appStore = createStore<AppState>((set, get) => ({
  route: 'home',
  calendarMonth: getCurrentMonthString(),
  calendarDate: getCurrentDateString(),
  recordMonth: getCurrentMonthString(),
  recordType: 'expense',
  recordAmount: '',
  recordCategory: '식비',
  recordDate: getCurrentDateString(),
  recordMemo: '',
  recordSubmitting: false,
  recordError: null,
  statsMonth: getCurrentMonthString(),
  monthlyReportMonth: getCurrentMonthString(),
  searchDraft: '지난주 식비 얼마였어?',
  submittedSearch: '지난주 식비 얼마였어?',
  selectedReportId: null,
  composerDraft: '오늘 점심 9800원 썼어',
  activeSessionId: null,
  composerSending: false,
  composerError: null,
  sessionActionLoading: false,
  sessionActionError: null,
  reportActionLoading: false,
  reportActionError: null,
  editingSessionId: null,
  sessionTitleDraft: '',
  editingReportId: null,
  reportTitleDraft: '',
  setRoute: (route) => set({ route }),
  setCalendarMonth: (calendarMonth) => set({ calendarMonth }),
  setCalendarDate: (calendarDate) => set({ calendarDate }),
  setCalendarSelection: (calendarMonth, calendarDate) => set({ calendarMonth, calendarDate }),
  setRecordMonth: (recordMonth) => set({ recordMonth }),
  setRecordType: (recordType) => set({ recordType }),
  setRecordAmount: (recordAmount) => set({ recordAmount }),
  setRecordCategory: (recordCategory) => set({ recordCategory }),
  setRecordDate: (recordDate) => set({ recordDate }),
  setRecordMemo: (recordMemo) => set({ recordMemo }),
  setRecordSubmitting: (recordSubmitting) => set({ recordSubmitting }),
  setRecordError: (recordError) => set({ recordError }),
  resetRecordForm: () => set({
    recordType: 'expense',
    recordAmount: '',
    recordCategory: '식비',
    recordDate: getCurrentDateString(),
    recordMemo: '',
    recordSubmitting: false,
    recordError: null,
  }),
  setStatsMonth: (statsMonth) => set({ statsMonth }),
  setMonthlyReportMonth: (monthlyReportMonth) => set({ monthlyReportMonth }),
  setSearchDraft: (searchDraft) => set({ searchDraft }),
  submitSearch: (value) => {
    const next = (value ?? get().searchDraft).trim();
    if (!next) return;
    set({ submittedSearch: next, searchDraft: next });
  },
  setSelectedReportId: (selectedReportId) => set({ selectedReportId }),
  setComposerDraft: (composerDraft) => set({ composerDraft }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setComposerSending: (composerSending) => set({ composerSending }),
  setComposerError: (composerError) => set({ composerError }),
  setSessionActionLoading: (sessionActionLoading) => set({ sessionActionLoading }),
  setSessionActionError: (sessionActionError) => set({ sessionActionError }),
  setReportActionLoading: (reportActionLoading) => set({ reportActionLoading }),
  setReportActionError: (reportActionError) => set({ reportActionError }),
  startEditingSession: (editingSessionId, title) => set({ editingSessionId, sessionTitleDraft: title }),
  setSessionTitleDraft: (sessionTitleDraft) => set({ sessionTitleDraft }),
  stopEditingSession: () => set({ editingSessionId: null, sessionTitleDraft: '' }),
  startEditingReport: (editingReportId, title) => set({ editingReportId, reportTitleDraft: title }),
  setReportTitleDraft: (reportTitleDraft) => set({ reportTitleDraft }),
  stopEditingReport: () => set({ editingReportId: null, reportTitleDraft: '' }),
}));
