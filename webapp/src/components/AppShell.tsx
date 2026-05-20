/** @jsxImportSource hono/jsx */
import type { AppShellProps } from '../app-types';
import { AppButton } from './ui/AppButton';
import { appStore } from '../state/app-store';
import { authStore } from '../state/auth-store';

export function AppShell(props: AppShellProps) {
  const state = appStore.getState();
  const auth = authStore.getState();
  const recentSessions = props.bootstrap?.sessions ?? [];
  const activeSessionId = props.timeline?.sessionId ?? props.bootstrap?.activeSession?.id ?? null;
  const navItems = [
    { route: 'home', label: '홈', emoji: '💬', hint: '대화 입력' },
    { route: 'calendar', label: '달력', emoji: '📅', hint: '일별 내역' },
    { route: 'record', label: '기록', emoji: '➕', hint: '수기 입력' },
    { route: 'stats', label: '통계', emoji: '📈', hint: '월별 요약' },
    { route: 'monthlyReport', label: '월간', emoji: '🗂️', hint: '리포트 생성' },
    { route: 'reports', label: '리포트', emoji: '📊', hint: '상세 리포트' },
    { route: 'search', label: '검색', emoji: '🔎', hint: 'AI 검색' },
    { route: 'settings', label: '설정', emoji: '⚙️', hint: '계정/알림' },
    { route: 'help', label: '도움말', emoji: '❓', hint: '문의/FAQ' },
  ] as const;
  const currentUserLabel = props.profile?.profile.name ?? props.profile?.profile.email ?? props.session?.user.email ?? props.session?.user.id ?? '게스트';
  const currentPlanLabel = props.profile?.profile.plan === 'paid' ? '프리미엄' : '무료';
  const quickEntryStatus = props.quickEntrySubscribed ? '연결됨' : props.quickEntrySupported ? '미연결' : '미지원';

  if (!props.authInitialized) {
    return (
      <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
        <div class="surface-panel w-full max-w-md space-y-4">
          <div class="app-panel-label">Loading</div>
          <div class="app-panel-title">계정 상태를 확인하는 중</div>
          <div class="app-panel-copy">Supabase 세션을 복원하고 있습니다.</div>
          <div class="mt-4 space-y-2">
            <div class="h-10 rounded-xl bg-slate-200"></div>
            <div class="h-10 rounded-xl bg-slate-100"></div>
            <div class="h-10 rounded-xl bg-slate-100"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!props.session) {
    return (
      <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
        <section class="surface-panel w-full max-w-md space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="app-panel-label">Easy AI budget</div>
              <div class="mt-2 app-panel-title">{auth.mode === 'sign-up' ? '회원가입' : '로그인'}</div>
            </div>
            <div class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">APP</div>
          </div>

          <form
            class="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget as HTMLFormElement;
              const formData = new FormData(form);
              const email = String(formData.get('email') ?? '').trim();
              const password = String(formData.get('password') ?? '');
              if (auth.mode === 'sign-up') {
                props.onSignUp(email, password);
              } else {
                props.onSignIn(email, password);
              }
            }}
          >
            <div class="grid grid-cols-2 gap-2">
              <AppButton
                kind={auth.mode === 'sign-up' ? 'ghost' : 'primary'}
                type="button"
                class="w-full px-4"
                onClick={() => {
                  authStore.getState().setError(null);
                  authStore.getState().setNotice(null);
                  authStore.getState().setMode('sign-in');
                }}
              >
                로그인
              </AppButton>
              <AppButton
                kind={auth.mode === 'sign-up' ? 'primary' : 'ghost'}
                type="button"
                class="w-full px-4"
                onClick={() => {
                  authStore.getState().setError(null);
                  authStore.getState().setNotice(null);
                  authStore.getState().setMode('sign-up');
                }}
              >
                회원가입
              </AppButton>
            </div>
            <input
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-primary"
              placeholder="이메일"
              name="email"
              autoComplete="email"
              defaultValue=""
            />
            <input
              type="password"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-primary"
              placeholder="비밀번호"
              name="password"
              autoComplete="current-password"
              defaultValue=""
            />
            <AppButton type="submit" class="w-full px-4" onClick={undefined}>
              {props.authLoading ? (auth.mode === 'sign-up' ? '가입 중' : '로그인 중') : auth.mode === 'sign-up' ? '회원가입' : '로그인'}
            </AppButton>
          </form>

          <div class="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {auth.mode === 'sign-up' ? '새 계정을 만들고 바로 시작합니다.' : '기존 계정으로 로그인합니다.'}
          </div>

          {auth.notice && <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{auth.notice}</div>}
          {auth.error && <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{auth.error}</div>}
        </section>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-slate-100 text-slate-900">
      <header class="border-b border-slate-200 bg-white/92 backdrop-blur">
        <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-black text-white shadow-sm">A</div>
            <div>
              <div class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Easy AI budget</div>
              <div class="text-lg font-bold text-slate-950">{props.pageTitle}</div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${props.session ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {props.session ? 'LIVE' : 'PREVIEW'}
            </span>
            <span class="text-sm text-slate-500">세션 {props.sessionCount}</span>
            {props.session && (
              <AppButton kind="ghost" class="px-4 py-2 text-sm" onClick={() => props.onSignOut()}>
                로그아웃
              </AppButton>
            )}
          </div>
        </div>
      </header>

      <div class="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside class="order-2 space-y-4 lg:order-1 lg:sticky lg:top-6 lg:self-start">
          <section class="surface-panel">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Navigation</div>
            <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {navItems.map((item) => (
                <button
                  key={item.route}
                  type="button"
                  class={`app-nav-item ${props.route === item.route ? 'app-nav-item-active' : ''}`}
                  onClick={() => props.onNavigate(item.route)}
                >
                  <span class="flex min-w-0 items-center gap-3">
                    <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-base shadow-sm">{item.emoji}</span>
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-semibold">{item.label}</span>
                      <span class="block text-[11px] font-medium text-slate-500">{item.hint}</span>
                    </span>
                  </span>
                  <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{props.route === item.route ? 'open' : 'view'}</span>
                </button>
              ))}
            </div>
          </section>

          {props.session ? (
            <section class="surface-panel space-y-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Account</div>
                  <div class="mt-2 truncate text-sm font-semibold text-slate-950">{currentUserLabel}</div>
                  <div class="mt-1 text-xs text-slate-500">
                    {currentPlanLabel}
                    {' · '}
                    {props.profile?.profile.subscriptionStatus ?? 'unknown'}
                  </div>
                </div>
                <div class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">connected</div>
              </div>

              {props.profile && (
                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-semibold text-slate-500">Provider</span>
                    <span class="font-medium text-slate-700">{props.profile.profile.provider ?? 'unknown'}</span>
                  </div>
                  <div class="mt-2 flex items-center justify-between gap-3">
                    <span class="font-semibold text-slate-500">Email</span>
                    <span class="truncate font-medium text-slate-700">{props.profile.profile.email ?? '없음'}</span>
                  </div>
                  <div class="mt-2 flex items-center justify-between gap-3">
                    <span class="font-semibold text-slate-500">Expires</span>
                    <span class="font-medium text-slate-700">{props.profile.profile.subscriptionExpiresAt ?? '없음'}</span>
                  </div>
                </div>
              )}

              <div class="grid gap-2 text-xs text-slate-600">
                <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span class="font-semibold text-slate-500">Quick entry</span>
                  <span class="font-medium text-slate-700">{quickEntryStatus}</span>
                </div>
                <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span class="font-semibold text-slate-500">Active session</span>
                  <span class="font-medium text-slate-700">{props.bootstrap?.activeSession ? `#${props.bootstrap.activeSession.id}` : '없음'}</span>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <AppButton kind="ghost" class="px-3 py-2 text-sm" onClick={() => props.onRequestNotificationPermission()}>
                  알림 권한
                </AppButton>
                <AppButton kind={props.quickEntrySubscribed ? 'secondary' : 'ghost'} class="px-3 py-2 text-sm" onClick={() => (props.quickEntrySubscribed ? props.onDisableQuickEntry() : props.onEnableQuickEntry())}>
                  {props.quickEntrySubscribed ? 'quick entry 끄기' : 'quick entry 켜기'}
                </AppButton>
                <AppButton kind="ghost" class="px-3 py-2 text-sm" onClick={() => props.onSendQuickEntryTest()} disabled={!props.quickEntrySubscribed}>
                  테스트
                </AppButton>
              </div>

              {props.quickEntryError && <div class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{props.quickEntryError}</div>}
            </section>
          ) : (
            <section class="surface-panel space-y-4">
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sign in</div>
                <div class="mt-2 text-sm font-semibold text-slate-950">Supabase 로그인</div>
                <p class="mt-1 text-sm text-slate-500">로그인하면 live API를 사용하고 세션, 기록, 리포트를 계정 기준으로 동기화합니다.</p>
              </div>

              <form
                class="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget as HTMLFormElement;
                  const formData = new FormData(form);
                  const email = String(formData.get('email') ?? '').trim();
                  const password = String(formData.get('password') ?? '');
                  props.onSignIn(email, password);
                }}
              >
                <input
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-primary"
                  placeholder="이메일"
                  name="email"
                  autoComplete="email"
                  defaultValue=""
                />
                <input
                  type="password"
                  class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-primary"
                  placeholder="비밀번호"
                  name="password"
                  autoComplete="current-password"
                  defaultValue=""
                />
                <AppButton type="submit" class="w-full px-4" onClick={undefined}>
                  {props.authLoading ? '로그인 중' : '로그인'}
                </AppButton>
              </form>

              {auth.error && <div class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{auth.error}</div>}
            </section>
          )}

          {props.session && (
            <section class="surface-panel">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sessions</div>
                  <div class="mt-1 text-sm font-semibold text-slate-950">최근 세션</div>
                </div>
                <AppButton kind="ghost" class="px-3 py-2 text-sm" onClick={() => props.onCreateSession()}>
                  새 대화
                </AppButton>
              </div>

              {recentSessions.length > 0 ? (
                <div class="mt-3 space-y-2">
                  {recentSessions.slice(0, 5).map((session) => (
                    <div
                      class={`rounded-2xl border px-3 py-3 transition ${
                        session.id === activeSessionId ? 'border-primary/30 bg-primary/5' : 'border-slate-200 bg-slate-50'
                      }`}
                      key={session.id}
                    >
                      <div class="flex items-start gap-2">
                        <button
                          type="button"
                          class="min-w-0 flex-1 text-left"
                          onClick={() => props.onSelectSession(session.id)}
                        >
                          {state.editingSessionId === session.id ? (
                            <div onClick={(event) => event.stopPropagation()}>
                              <input
                                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-primary"
                                value={state.sessionTitleDraft}
                                onInput={(event) => appStore.getState().setSessionTitleDraft((event.currentTarget as HTMLInputElement).value)}
                                onBlur={() => props.onRenameSession(session.id)}
                                autofocus
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    props.onRenameSession(session.id);
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    appStore.getState().stopEditingSession();
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <>
                              <div class="truncate text-sm font-semibold text-slate-950">{session.title}</div>
                              <div class="mt-1 text-[11px] text-slate-500">#{session.id}</div>
                            </>
                          )}
                        </button>

                        <div class="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            class="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
                            onClick={() => appStore.getState().startEditingSession(session.id, session.title)}
                            disabled={state.sessionActionLoading}
                            aria-label={`세션 ${session.id} 이름 변경`}
                          >
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M12 20h9"></path>
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                            </svg>
                          </button>
                          <button
                            type="button"
                            class="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-red-600 disabled:opacity-50"
                            onClick={() => props.onDeleteSession(session.id)}
                            disabled={state.sessionActionLoading}
                            aria-label={`세션 ${session.id} 삭제`}
                          >
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M3 6h18"></path>
                              <path d="M8 6V4h8v2"></path>
                              <path d="M19 6l-1 14H6L5 6"></path>
                              <path d="M10 11v6"></path>
                              <path d="M14 11v6"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div class="mt-3 text-sm text-slate-500">아직 불러온 세션이 없습니다.</div>
              )}

              {state.sessionActionError && (
                <div class="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.sessionActionError}
                </div>
              )}
            </section>
          )}
        </aside>

        <main class="order-1 min-w-0 space-y-6 lg:order-2">
          {props.page}
        </main>
      </div>
    </div>
  );
}
