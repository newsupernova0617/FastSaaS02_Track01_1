/** @jsxImportSource hono/jsx */
import { QueryObserver, type QueryObserverResult } from '@tanstack/query-core';
import { render } from 'hono/jsx/dom';
import Navigo from 'navigo';
import { App } from './app';
import { calendarQueryOptions, homeQueryOptions, monthlyReportQueryOptions, queryClient, recordQueryOptions, reportQueryOptions, searchQueryOptions, statsQueryOptions } from './lib/query';
import { appStore, type RouteName } from './state/app-store';
import { authStore } from './state/auth-store';
import type { AppCurrentReportResponse, AppProfileResponse, AppReportsResponse, AppTransactionsResponse, BootstrapResponse, CalendarResponse, HomeResponse, ReportResponse, SearchResponse, StatsResponse, TimelineResponse } from './data/schemas';
import { getCurrentSession, onAuthStateChange, signInWithPassword, signOut, signUpWithPassword } from './lib/supabase-auth';
import { createAppSession, createAppTransaction, deleteAppReport, deleteAppSession, deleteAppTransaction, fetchAppBootstrap, fetchAppProfile, fetchAppPushPublicKey, fetchAppReportDetail, fetchAppReports, fetchAppTimeline, generateAppReport, registerAppPushSubscription, sendAppChat, sendAppQuickEntryTest, type SourcedData, unregisterAppPushSubscription, updateAppReport, updateAppSession } from './data/preview-api';
import { clearQuickEntryRegistration, getQuickEntryRegistration, setQuickEntryRegistration, type QuickEntryRegistration } from './lib/quick-entry-store';
import { pageEntries } from './lib/page-registry';
import './styles.css';

const rootElement = document.getElementById('app');

if (!rootElement) {
  throw new Error('App root not found');
}

const root = rootElement;

const router = new Navigo('/');

const homeObserver = new QueryObserver<SourcedData<HomeResponse>, Error>(queryClient, homeQueryOptions());
const calendarObserver = new QueryObserver<SourcedData<CalendarResponse>, Error>(
  queryClient,
  calendarQueryOptions(appStore.getState().calendarMonth, appStore.getState().calendarDate)
);
const recordObserver = new QueryObserver<SourcedData<AppTransactionsResponse>, Error>(
  queryClient,
  recordQueryOptions(appStore.getState().recordMonth)
);
const statsObserver = new QueryObserver<SourcedData<StatsResponse>, Error>(
  queryClient,
  statsQueryOptions(appStore.getState().statsMonth)
);
const monthlyReportObserver = new QueryObserver<SourcedData<AppCurrentReportResponse>, Error>(
  queryClient,
  monthlyReportQueryOptions(appStore.getState().monthlyReportMonth)
);
const reportObserver = new QueryObserver<SourcedData<ReportResponse>, Error>(queryClient, reportQueryOptions('2026-04'));
const searchObserver = new QueryObserver<SourcedData<SearchResponse>, Error>(
  queryClient,
  searchQueryOptions(appStore.getState().submittedSearch)
);

let homeResult: QueryObserverResult<SourcedData<HomeResponse>, Error> = homeObserver.getCurrentResult();
let calendarResult: QueryObserverResult<SourcedData<CalendarResponse>, Error> = calendarObserver.getCurrentResult();
let recordResult: QueryObserverResult<SourcedData<AppTransactionsResponse>, Error> = recordObserver.getCurrentResult();
let statsResult: QueryObserverResult<SourcedData<StatsResponse>, Error> = statsObserver.getCurrentResult();
let monthlyReportResult: QueryObserverResult<SourcedData<AppCurrentReportResponse>, Error> = monthlyReportObserver.getCurrentResult();
let reportResult: QueryObserverResult<SourcedData<ReportResponse>, Error> = reportObserver.getCurrentResult();
let searchResult: QueryObserverResult<SourcedData<SearchResponse>, Error> = searchObserver.getCurrentResult();
let sessionCount = 0;
let bootstrapData: BootstrapResponse | null = null;
let timelineData: TimelineResponse | null = null;
let reportsData: AppReportsResponse | null = null;
let profileData: AppProfileResponse | null = null;
let selectedReportData: SourcedData<AppCurrentReportResponse> | null = null;
let selectedReportLoading = false;
let selectedReportError: string | null = null;
let selectedReportRequestSeq = 0;
let quickEntryRegistration: QuickEntryRegistration | null = null;
let quickEntryLoading = false;
let quickEntryError: string | null = null;

async function clearQuickEntrySessionState() {
  quickEntryRegistration = null;
  await clearQuickEntryRegistration().catch(() => undefined);
}

function renderApp() {
  const sessionUserId = authStore.getState().session?.user.id ?? null;
  const quickEntrySubscribed = Boolean(quickEntryRegistration && sessionUserId && quickEntryRegistration.userId === sessionUserId);

  root.replaceChildren();
  render(
    <App
      homeResult={homeResult}
      calendarResult={calendarResult}
      recordResult={recordResult}
      statsResult={statsResult}
      monthlyReportResult={monthlyReportResult}
      reportResult={reportResult}
      searchResult={searchResult}
      selectedReport={selectedReportData}
      selectedReportLoading={selectedReportLoading}
      selectedReportError={selectedReportError}
      session={authStore.getState().session}
      authInitialized={authStore.getState().initialized}
      authLoading={authStore.getState().loading}
      sessionCount={sessionCount}
      bootstrap={bootstrapData}
      timeline={timelineData}
      reports={reportsData}
      profile={profileData}
      onNavigate={navigateTo}
      onPreviousCalendarMonth={handlePreviousCalendarMonth}
      onNextCalendarMonth={handleNextCalendarMonth}
      onSelectCalendarDate={handleSelectCalendarDate}
      onPreviousRecordMonth={handlePreviousRecordMonth}
      onNextRecordMonth={handleNextRecordMonth}
      onSubmitRecord={handleSubmitRecord}
      onDeleteTransaction={handleDeleteTransaction}
      onPreviousStatsMonth={handlePreviousStatsMonth}
      onNextStatsMonth={handleNextStatsMonth}
      onPreviousMonthlyReportMonth={handlePreviousMonthlyReportMonth}
      onNextMonthlyReportMonth={handleNextMonthlyReportMonth}
      onGenerateMonthlyReport={handleGenerateMonthlyReport}
      onGenerateWeeklyReport={handleGenerateWeeklyReport}
      onSelectReport={handleSelectReport}
      onDeleteReport={handleDeleteReport}
      onRenameReport={handleRenameReport}
      onRequestNotificationPermission={handleRequestNotificationPermission}
      quickEntrySubscribed={quickEntrySubscribed}
      quickEntrySupported={isQuickEntrySupported()}
      quickEntryLoading={quickEntryLoading}
      quickEntryError={quickEntryError}
      onEnableQuickEntry={handleEnableQuickEntry}
      onDisableQuickEntry={handleDisableQuickEntry}
      onSendQuickEntryTest={handleSendQuickEntryTest}
      onSelectSession={handleSelectSession}
      onCreateSession={handleCreateSession}
      onDeleteSession={handleDeleteSession}
      onRenameSession={handleRenameSession}
      onSubmitSearch={() => appStore.getState().submitSearch()}
      onSubmitComposer={handleComposerSubmit}
      onSignIn={handleSignIn}
      onSignUp={handleSignUp}
      onSignOut={handleSignOut}
    />,
    root
  );
}

const pathByRoute = new Map(pageEntries.map((page) => [page.route, page.path] as const));

function routeToPath(route: RouteName): string {
  return pathByRoute.get(route) ?? '/';
}

function navigateTo(route: RouteName) {
  router.navigate(routeToPath(route));
}

function handlePreviousCalendarMonth() {
  const state = appStore.getState();
  const nextDate = shiftSelectedDate(state.calendarMonth, state.calendarDate, -1);
  appStore.getState().setCalendarSelection(nextDate.slice(0, 7), nextDate);
}

function handleNextCalendarMonth() {
  const state = appStore.getState();
  const nextDate = shiftSelectedDate(state.calendarMonth, state.calendarDate, 1);
  appStore.getState().setCalendarSelection(nextDate.slice(0, 7), nextDate);
}

function handleSelectCalendarDate(date: string) {
  appStore.getState().setCalendarSelection(date.slice(0, 7), date);
}

function handlePreviousRecordMonth() {
  appStore.getState().setRecordMonth(shiftMonth(appStore.getState().recordMonth, -1));
}

function handleNextRecordMonth() {
  appStore.getState().setRecordMonth(shiftMonth(appStore.getState().recordMonth, 1));
}

async function handleSubmitRecord() {
  const state = appStore.getState();
  const amount = Number(state.recordAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    appStore.getState().setRecordError('금액을 올바르게 입력하세요.');
    return;
  }
  if (!state.recordCategory.trim()) {
    appStore.getState().setRecordError('카테고리를 입력하세요.');
    return;
  }
  if (!authStore.getState().session) {
    appStore.getState().setRecordError('기록은 로그인 후 사용할 수 있습니다.');
    return;
  }

  appStore.getState().setRecordError(null);
  appStore.getState().setRecordSubmitting(true);
  try {
    const created = await createAppTransaction({
      transactionType: state.recordType,
      amount,
      category: state.recordCategory.trim(),
      memo: state.recordMemo.trim() || undefined,
      date: state.recordDate,
    });
    if (!created) {
      throw new Error('거래를 저장하지 못했습니다.');
    }
    appStore.getState().resetRecordForm();
    await refreshAllQueries();
  } catch (error) {
    appStore.getState().setRecordError(error instanceof Error ? error.message : '거래 저장에 실패했습니다.');
  } finally {
    appStore.getState().setRecordSubmitting(false);
  }
}

async function handleDeleteTransaction(id: number) {
  if (!authStore.getState().session) {
    appStore.getState().setSessionActionError('기록 삭제는 로그인 후 사용할 수 있습니다.');
    return;
  }

  appStore.getState().setSessionActionError(null);
  appStore.getState().setSessionActionLoading(true);
  try {
    const deleted = await deleteAppTransaction(id);
    if (!deleted) {
      throw new Error('거래를 삭제하지 못했습니다.');
    }
    await refreshAllQueries();
  } catch (error) {
    appStore.getState().setSessionActionError(error instanceof Error ? error.message : '거래 삭제에 실패했습니다.');
  } finally {
    appStore.getState().setSessionActionLoading(false);
  }
}

function handlePreviousStatsMonth() {
  appStore.getState().setStatsMonth(shiftMonth(appStore.getState().statsMonth, -1));
}

function handleNextStatsMonth() {
  appStore.getState().setStatsMonth(shiftMonth(appStore.getState().statsMonth, 1));
}

function handlePreviousMonthlyReportMonth() {
  appStore.getState().setMonthlyReportMonth(shiftMonth(appStore.getState().monthlyReportMonth, -1));
}

function handleNextMonthlyReportMonth() {
  appStore.getState().setMonthlyReportMonth(shiftMonth(appStore.getState().monthlyReportMonth, 1));
}

async function handleGenerateMonthlyReport() {
  const month = appStore.getState().monthlyReportMonth;
  if (!authStore.getState().session) {
    appStore.getState().setSessionActionError('리포트 생성은 로그인 후 사용할 수 있습니다.');
    return;
  }

  appStore.getState().setSessionActionLoading(true);
  appStore.getState().setSessionActionError(null);

  try {
    const generated = await generateAppReport({ period: 'monthly', month });
    if (!generated) {
      throw new Error('리포트를 생성하지 못했습니다.');
    }
    monthlyReportObserver.setOptions(monthlyReportQueryOptions(month));
    await refreshAllQueries();
  } catch (error) {
    appStore.getState().setSessionActionError(error instanceof Error ? error.message : '리포트 생성에 실패했습니다.');
  } finally {
    appStore.getState().setSessionActionLoading(false);
  }
}

async function handleGenerateWeeklyReport() {
  if (!authStore.getState().session) {
    appStore.getState().setSessionActionError('리포트 생성은 로그인 후 사용할 수 있습니다.');
    return;
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  appStore.getState().setSessionActionLoading(true);
  appStore.getState().setSessionActionError(null);

  try {
    const generated = await generateAppReport({
      period: 'weekly',
      weekStart: `${weekStart.getFullYear()}-${pad2(weekStart.getMonth() + 1)}-${pad2(weekStart.getDate())}`,
      weekEnd: `${weekEnd.getFullYear()}-${pad2(weekEnd.getMonth() + 1)}-${pad2(weekEnd.getDate())}`,
    });
    if (!generated) {
      throw new Error('리포트를 생성하지 못했습니다.');
    }
    await refreshAllQueries();
  } catch (error) {
    appStore.getState().setSessionActionError(error instanceof Error ? error.message : '리포트 생성에 실패했습니다.');
  } finally {
    appStore.getState().setSessionActionLoading(false);
  }
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthValue] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthValue - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

function daysInMonth(month: string): number {
  const [year, monthValue] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthValue, 0)).getUTCDate();
}

function shiftSelectedDate(month: string, selectedDate: string | null, delta: number): string {
  const nextMonth = shiftMonth(month, delta);
  const selectedDay = selectedDate ? Number(selectedDate.slice(8, 10)) : 1;
  const nextDay = Math.min(Math.max(selectedDay, 1), daysInMonth(nextMonth));
  return `${nextMonth}-${pad2(nextDay)}`;
}

function isQuickEntrySupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && 'indexedDB' in window;
}

function base64UrlToUint8Array(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function readQuickEntryDraftFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const draft = url.searchParams.get('quickEntry');
  if (!draft) return null;
  url.searchParams.delete('quickEntry');
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  return draft;
}

async function refreshQuickEntryRegistration() {
  const sessionUserId = authStore.getState().session?.user.id ?? null;
  const storedRegistration = await getQuickEntryRegistration().catch(() => null);

  if (!sessionUserId) {
    if (storedRegistration) {
      await clearQuickEntrySessionState();
    } else {
      quickEntryRegistration = null;
    }
    renderApp();
    return;
  }

  if (storedRegistration && storedRegistration.userId !== sessionUserId) {
    await clearQuickEntrySessionState();
    renderApp();
    return;
  }

  quickEntryRegistration = storedRegistration;
  renderApp();
}

async function cleanupQuickEntryConnection() {
  try {
    if (isQuickEntrySupported()) {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await unregisterAppPushSubscription({ endpoint: existing.endpoint }).catch(() => null);
        await existing.unsubscribe().catch(() => undefined);
      }
    }
  } finally {
    await clearQuickEntrySessionState();
  }
}

async function handleEnableQuickEntry() {
  if (!authStore.getState().session) {
    quickEntryError = 'quick entry는 로그인 후 사용할 수 있습니다.';
    renderApp();
    return;
  }

  if (!isQuickEntrySupported()) {
    quickEntryError = '이 브라우저에서는 quick entry를 지원하지 않습니다.';
    renderApp();
    return;
  }

  quickEntryLoading = true;
  quickEntryError = null;
  renderApp();

  try {
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

    if (permission !== 'granted') {
      throw new Error('알림 권한이 필요합니다.');
    }

    const publicKeyResponse = await fetchAppPushPublicKey();
    if (!publicKeyResponse?.publicKey) {
      throw new Error('푸시 공개키를 불러오지 못했습니다.');
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await unregisterAppPushSubscription({ endpoint: existing.endpoint }).catch(() => null);
      await existing.unsubscribe().catch(() => undefined);
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(publicKeyResponse.publicKey) as unknown as ArrayBuffer,
    });

    const subscriptionJson = subscription.toJSON();
    if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
      throw new Error('푸시 구독 정보를 만들지 못했습니다.');
    }

    const registered = await registerAppPushSubscription({
      endpoint: subscriptionJson.endpoint,
      expirationTime: subscriptionJson.expirationTime ?? null,
      keys: {
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth,
      },
    });

    if (!registered) {
      throw new Error('푸시 구독 등록에 실패했습니다.');
    }

    await setQuickEntryRegistration({
      userId: registered.userId,
      subscriptionId: registered.subscriptionId,
      quickEntryToken: registered.quickEntryToken,
      updatedAt: new Date().toISOString(),
    });
    quickEntryRegistration = await getQuickEntryRegistration();
  } catch (error) {
    quickEntryError = error instanceof Error ? error.message : 'quick entry 연결에 실패했습니다.';
  } finally {
    quickEntryLoading = false;
    await refreshQuickEntryRegistration();
  }
}

async function handleDisableQuickEntry() {
  quickEntryLoading = true;
  quickEntryError = null;
  renderApp();

  try {
    await cleanupQuickEntryConnection();
  } catch (error) {
    quickEntryError = error instanceof Error ? error.message : 'quick entry 해제에 실패했습니다.';
  } finally {
    quickEntryLoading = false;
    renderApp();
  }
}

async function handleSendQuickEntryTest() {
  if (!quickEntryRegistration) {
    quickEntryError = '먼저 quick entry를 연결하세요.';
    renderApp();
    return;
  }

  quickEntryLoading = true;
  quickEntryError = null;
  renderApp();

  try {
    const response = await sendAppQuickEntryTest();
    if (!response || !response.success) {
      throw new Error('테스트 알림 발송에 실패했습니다.');
    }
  } catch (error) {
    quickEntryError = error instanceof Error ? error.message : '테스트 알림 발송에 실패했습니다.';
  } finally {
    quickEntryLoading = false;
    renderApp();
  }
}

async function loadSelectedReport(reportId: number | null) {
  const requestSeq = ++selectedReportRequestSeq;

  if (!authStore.getState().session || !reportId) {
    if (requestSeq !== selectedReportRequestSeq) {
      return;
    }
    selectedReportData = null;
    selectedReportLoading = false;
    selectedReportError = null;
    appStore.getState().setSelectedReportId(null);
    renderApp();
    return;
  }

  selectedReportLoading = true;
  selectedReportError = null;
  renderApp();

  try {
    const detail = await fetchAppReportDetail(reportId);
    if (requestSeq !== selectedReportRequestSeq) {
      return;
    }
    if (!detail) {
      throw new Error('리포트 상세를 불러오지 못했습니다.');
    }

    selectedReportData = {
      source: 'live',
      data: detail,
    };
    appStore.getState().setSelectedReportId(reportId);
  } catch (error) {
    if (requestSeq !== selectedReportRequestSeq) {
      return;
    }
    selectedReportData = null;
    selectedReportError = error instanceof Error ? error.message : '리포트 상세를 불러오지 못했습니다.';
  } finally {
    if (requestSeq !== selectedReportRequestSeq) {
      return;
    }
    selectedReportLoading = false;
    renderApp();
  }
}

homeObserver.subscribe((next) => {
  homeResult = next;
  renderApp();
});

calendarObserver.subscribe((next) => {
  calendarResult = next;
  renderApp();
});

recordObserver.subscribe((next) => {
  recordResult = next;
  renderApp();
});

statsObserver.subscribe((next) => {
  statsResult = next;
  renderApp();
});

monthlyReportObserver.subscribe((next) => {
  monthlyReportResult = next;
  renderApp();
});

reportObserver.subscribe((next) => {
  reportResult = next;
  renderApp();
});

searchObserver.subscribe((next) => {
  searchResult = next;
  renderApp();
});

appStore.subscribe((state, previous) => {
  if (state.submittedSearch !== previous.submittedSearch) {
    searchObserver.setOptions(searchQueryOptions(state.submittedSearch));
  }

  if (state.calendarMonth !== previous.calendarMonth || state.calendarDate !== previous.calendarDate) {
    calendarObserver.setOptions(calendarQueryOptions(state.calendarMonth, state.calendarDate));
  }

  if (state.recordMonth !== previous.recordMonth) {
    recordObserver.setOptions(recordQueryOptions(state.recordMonth));
  }

  if (state.statsMonth !== previous.statsMonth) {
    statsObserver.setOptions(statsQueryOptions(state.statsMonth));
  }

  if (state.monthlyReportMonth !== previous.monthlyReportMonth) {
    monthlyReportObserver.setOptions(monthlyReportQueryOptions(state.monthlyReportMonth));
  }

  renderApp();
});

authStore.subscribe(() => {
  renderApp();
});

async function refreshAllQueries() {
  const bootstrap = await fetchAppBootstrap().catch(() => null);
  bootstrapData = bootstrap;
  sessionCount = bootstrap?.sessions.length ?? 0;
  const currentActiveSessionId = authStore.getState().session ? appStore.getState().activeSessionId : null;
  const nextSessionId = bootstrap
    ? currentActiveSessionId ?? bootstrap.activeSession?.id ?? null
    : null;
  appStore.getState().setActiveSessionId(nextSessionId);
  timelineData = nextSessionId ? await fetchAppTimeline(nextSessionId).catch(() => null) : null;
  reportsData = await fetchAppReports('2026-04', 6).catch(() => null);
  profileData = await fetchAppProfile().catch(() => null);
  const currentSelectedReportId = authStore.getState().session ? appStore.getState().selectedReportId : null;
  const nextSelectedReportId =
    currentSelectedReportId && reportsData?.reports.some((report) => report.id === currentSelectedReportId)
      ? currentSelectedReportId
      : reportsData?.reports[0]?.id ?? null;
  await loadSelectedReport(nextSelectedReportId);
  await Promise.all([
    homeObserver.refetch(),
    calendarObserver.refetch(),
    recordObserver.refetch(),
    statsObserver.refetch(),
    monthlyReportObserver.refetch(),
    reportObserver.refetch(),
    searchObserver.refetch(),
  ]);
  await refreshQuickEntryRegistration();
}

async function handleSelectSession(sessionId: number) {
  appStore.getState().setSessionActionError(null);
  appStore.getState().setActiveSessionId(sessionId);
  timelineData = await fetchAppTimeline(sessionId).catch(() => null);
  renderApp();
}

async function handleSelectReport(reportId: number) {
  appStore.getState().stopEditingReport();
  await loadSelectedReport(reportId);
}

async function handleDeleteReport(reportId: number) {
  if (!authStore.getState().session) {
    appStore.getState().setReportActionError('리포트 삭제는 로그인 후 사용할 수 있습니다.');
    return;
  }

  appStore.getState().setReportActionLoading(true);
  appStore.getState().setReportActionError(null);

  try {
    const deleted = await deleteAppReport(reportId);
    if (!deleted) {
      throw new Error('리포트를 삭제하지 못했습니다.');
    }

    if (appStore.getState().selectedReportId === reportId) {
      appStore.getState().setSelectedReportId(null);
      selectedReportData = null;
      selectedReportError = null;
    }

    if (appStore.getState().editingReportId === reportId) {
      appStore.getState().stopEditingReport();
    }

    await refreshAllQueries();
  } catch (error) {
    appStore.getState().setReportActionError(error instanceof Error ? error.message : '리포트 삭제에 실패했습니다.');
  } finally {
    appStore.getState().setReportActionLoading(false);
  }
}

async function handleRenameReport(reportId: number) {
  const nextTitle = appStore.getState().reportTitleDraft.trim();
  if (!nextTitle) {
    appStore.getState().stopEditingReport();
    return;
  }

  if (!authStore.getState().session) {
    appStore.getState().setReportActionError('리포트 이름 변경은 로그인 후 사용할 수 있습니다.');
    return;
  }

  appStore.getState().setReportActionLoading(true);
  appStore.getState().setReportActionError(null);

  try {
    const updated = await updateAppReport(reportId, { title: nextTitle });
    if (!updated) {
      throw new Error('리포트 이름 변경에 실패했습니다.');
    }

    if (appStore.getState().selectedReportId === reportId) {
      selectedReportData = {
        source: 'live',
        data: updated,
      };
    }

    appStore.getState().stopEditingReport();
    await refreshAllQueries();
  } catch (error) {
    appStore.getState().setReportActionError(error instanceof Error ? error.message : '리포트 이름 변경에 실패했습니다.');
  } finally {
    appStore.getState().setReportActionLoading(false);
  }
}

async function handleCreateSession() {
  if (!authStore.getState().session) {
    appStore.getState().setSessionActionError('새 대화 생성은 로그인 후 사용할 수 있습니다.');
    return;
  }

  appStore.getState().setSessionActionLoading(true);
  appStore.getState().setSessionActionError(null);

  try {
    const created = await createAppSession({ title: '새 대화' });
    const sessionId = created?.session.id ?? null;

    if (!sessionId) {
      throw new Error('세션을 만들지 못했습니다.');
    }

    appStore.getState().setActiveSessionId(sessionId);
    timelineData = {
      success: true,
      sessionId,
      items: [],
    };
    await refreshAllQueries();
  } catch (error) {
    appStore.getState().setSessionActionError(error instanceof Error ? error.message : '새 대화 생성에 실패했습니다.');
  } finally {
    appStore.getState().setSessionActionLoading(false);
  }
}

async function handleDeleteSession(sessionId: number) {
  if (!authStore.getState().session) {
    appStore.getState().setSessionActionError('세션 삭제는 로그인 후 사용할 수 있습니다.');
    return;
  }

  appStore.getState().setSessionActionLoading(true);
  appStore.getState().setSessionActionError(null);

  try {
    const deleted = await deleteAppSession(sessionId);
    if (!deleted) {
      throw new Error('세션 삭제에 실패했습니다.');
    }

    if (appStore.getState().activeSessionId === sessionId) {
      appStore.getState().setActiveSessionId(null);
      timelineData = null;
    }

    await refreshAllQueries();
  } catch (error) {
    appStore.getState().setSessionActionError(error instanceof Error ? error.message : '세션 삭제에 실패했습니다.');
  } finally {
    appStore.getState().setSessionActionLoading(false);
  }
}

async function handleRenameSession(sessionId: number) {
  const nextTitle = appStore.getState().sessionTitleDraft.trim();
  if (!nextTitle) {
    appStore.getState().stopEditingSession();
    return;
  }

  if (!authStore.getState().session) {
    appStore.getState().setSessionActionError('세션 이름 변경은 로그인 후 사용할 수 있습니다.');
    return;
  }

  appStore.getState().setSessionActionLoading(true);
  appStore.getState().setSessionActionError(null);

  try {
    const updated = await updateAppSession(sessionId, { title: nextTitle });
    if (!updated) {
      throw new Error('세션 이름 변경에 실패했습니다.');
    }

    appStore.getState().stopEditingSession();
    await refreshAllQueries();
  } catch (error) {
    appStore.getState().setSessionActionError(error instanceof Error ? error.message : '세션 이름 변경에 실패했습니다.');
  } finally {
    appStore.getState().setSessionActionLoading(false);
  }
}

async function handleComposerSubmit() {
  const state = appStore.getState();
  const content = state.composerDraft.trim();
  if (!content) return;

  if (!authStore.getState().session) {
    appStore.getState().setComposerError('실제 입력 전송은 로그인 후 사용할 수 있습니다.');
    return;
  }

  appStore.getState().setComposerSending(true);
  appStore.getState().setComposerError(null);

  try {
    const response = await sendAppChat({
      sessionId: appStore.getState().activeSessionId,
      content,
    });
    if (!response) {
      throw new Error('메시지 전송에 실패했습니다.');
    }
    if (!response.success) {
      throw new Error(response.error || '메시지 전송에 실패했습니다.');
    }
    if (response.sessionId) {
      appStore.getState().setActiveSessionId(response.sessionId);
    }

    appStore.getState().setComposerDraft('');
    await refreshAllQueries();
  } catch (error) {
    const message = error instanceof Error ? error.message : '메시지 전송 중 오류가 발생했습니다.';
    appStore.getState().setComposerError(message);
  } finally {
    appStore.getState().setComposerSending(false);
  }
}

async function handleSignIn(email: string, password: string) {
  const auth = authStore.getState();
  authStore.getState().setLoading(true);
  authStore.getState().setError(null);
  authStore.getState().setNotice(null);
  try {
    const session = await signInWithPassword(email.trim(), password);
    authStore.getState().setSession(session);
    await refreshAllQueries();
  } catch (error) {
    authStore.getState().setError(error instanceof Error ? error.message : '로그인에 실패했습니다.');
  } finally {
    authStore.getState().setLoading(false);
    authStore.getState().setInitialized(true);
  }
}

async function handleSignUp(email: string, password: string) {
  authStore.getState().setLoading(true);
  authStore.getState().setError(null);
  authStore.getState().setNotice(null);
  try {
    const session = await signUpWithPassword(email.trim(), password);
    if (session) {
      authStore.getState().setSession(session);
      await refreshAllQueries();
      return;
    }

    authStore.getState().setNotice('가입이 완료되었습니다. 이메일 확인이 필요할 수 있습니다.');
    authStore.getState().setMode('sign-in');
  } catch (error) {
    authStore.getState().setError(error instanceof Error ? error.message : '회원가입에 실패했습니다.');
  } finally {
    authStore.getState().setLoading(false);
    authStore.getState().setInitialized(true);
  }
}

async function handleRequestNotificationPermission() {
  if (typeof Notification === 'undefined') {
    return;
  }

  await Notification.requestPermission();
  renderApp();
}

async function handleSignOut() {
  authStore.getState().setLoading(true);
  authStore.getState().setError(null);
  try {
    await cleanupQuickEntryConnection();
    await signOut();
    authStore.getState().setSession(null);
    await refreshAllQueries();
  } catch (error) {
    authStore.getState().setError(error instanceof Error ? error.message : '로그아웃에 실패했습니다.');
  } finally {
    authStore.getState().setLoading(false);
    authStore.getState().setInitialized(true);
  }
}

for (const page of pageEntries) {
  router.on(page.path, () => appStore.getState().setRoute(page.route));
}
router.resolve();

homeObserver.refetch();
calendarObserver.refetch();
recordObserver.refetch();
statsObserver.refetch();
monthlyReportObserver.refetch();
reportObserver.refetch();
searchObserver.refetch();

const initialQuickEntryDraft = readQuickEntryDraftFromUrl();
if (initialQuickEntryDraft) {
  appStore.getState().setComposerDraft(initialQuickEntryDraft);
}

getCurrentSession()
  .then((session) => {
    authStore.getState().setSession(session);
    authStore.getState().setInitialized(true);
    return refreshAllQueries();
  })
  .catch((error) => {
    authStore.getState().setError(error instanceof Error ? error.message : '세션 복원에 실패했습니다.');
    authStore.getState().setInitialized(true);
  });

onAuthStateChange((session) => {
  authStore.getState().setSession(session);
  authStore.getState().setInitialized(true);
  void refreshAllQueries();
});

renderApp();
