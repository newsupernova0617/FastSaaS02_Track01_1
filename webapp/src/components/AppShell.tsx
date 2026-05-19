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

  return (
    <div class="min-h-screen bg-base-200 text-base-content">
      <div class="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-5 py-6 lg:flex-row lg:px-8 lg:py-10">
        <section class="flex-1">
          <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
            <span class="h-2 w-2 rounded-full bg-secondary"></span>
            {props.session ? 'PWA App' : 'PWA Preview'}
          </div>
          <h1 class="mt-4 text-4xl font-black text-slate-950 sm:text-5xl">
            말로 하는
            <br />
            가장 쉬운 가계부
          </h1>
          <p class="mt-4 max-w-xl text-lg text-slate-600">
            {props.session
              ? '웹앱 전용 API를 우선 사용하는 설치형 PWA 셸입니다. 세션과 채팅 흐름은 app-facing API 위에서 동작합니다.'
              : '랜딩의 mock UI를 그대로 웹앱으로 옮긴 미리보기입니다. 홈, 리포트, 검색 화면을 설치형 PWA 셸 안에서 바로 확인할 수 있습니다.'}
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <AppButton onClick={() => props.onNavigate('home')}>홈</AppButton>
            <AppButton kind="secondary" onClick={() => props.onNavigate('calendar')}>달력</AppButton>
            <AppButton kind="secondary" onClick={() => props.onNavigate('record')}>기록</AppButton>
            <AppButton kind="secondary" onClick={() => props.onNavigate('stats')}>통계</AppButton>
            <AppButton kind="secondary" onClick={() => props.onNavigate('monthlyReport')}>월간 리포트</AppButton>
            <AppButton kind="secondary" onClick={() => props.onNavigate('reports')}>리포트</AppButton>
            <AppButton kind="ghost" onClick={() => props.onNavigate('search')}>AI 검색</AppButton>
            <AppButton kind="ghost" onClick={() => props.onNavigate('settings')}>설정</AppButton>
            <AppButton kind="ghost" onClick={() => props.onNavigate('help')}>도움말</AppButton>
          </div>

          <div class="mt-8 grid gap-4 sm:grid-cols-3">
            <div class="info-card">
              <div class="info-card-title">PWA</div>
              <p class="info-card-copy">설치형 앱 셸과 자동 업데이트 서비스 워커를 Vite PWA로 구성했습니다.</p>
            </div>
            <div class="info-card">
              <div class="info-card-title">Type Safe API</div>
              <p class="info-card-copy">`hono/client`와 Zod 응답 검증으로 preview API를 바로 연결합니다.</p>
            </div>
            <div class="info-card">
              <div class="info-card-title">Light Runtime</div>
              <p class="info-card-copy">Navigo, Query Core, Zustand Vanilla만으로 가볍게 상태와 화면을 조합합니다.</p>
            </div>
          </div>

          <div class="mt-8 rounded-[20px] border border-slate-200 bg-white/88 p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-bold text-slate-950">앱 인증</p>
                <p class="mt-1 text-sm text-slate-600">
                  Flutter와 같은 Supabase 세션을 사용합니다. 로그인되면 webapp이 preview 대신 <code>/api/app/*</code>를 우선 사용합니다.
                </p>
                <p class="mt-1 text-xs text-slate-500">연결된 세션 수: {props.sessionCount}</p>
              </div>
              <div class={`rounded-full px-3 py-1 text-xs font-bold ${props.session ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {props.session ? 'connected' : props.authInitialized ? 'guest' : 'loading'}
              </div>
            </div>

            {props.session ? (
              <div class="mt-4">
                <div class="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <div class="min-w-0">
                    <div class="truncate text-sm font-semibold text-slate-950">
                      {props.profile?.profile.name ?? props.profile?.profile.email ?? props.session.user.email ?? props.session.user.id}
                    </div>
                    <div class="text-xs text-slate-500">
                      {props.profile?.profile.plan === 'paid' ? '프리미엄 플랜' : '무료 플랜'}
                      {' · '}
                      {props.profile?.profile.subscriptionStatus ?? 'unknown'}
                    </div>
                  </div>
                  <AppButton kind="ghost" onClick={() => props.onSignOut()}>로그아웃</AppButton>
                </div>

                {props.profile && (
                  <div class="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm font-semibold text-slate-950">프로필</div>
                      <div class="text-[11px] font-medium text-slate-500">{props.profile.profile.provider ?? 'unknown'}</div>
                    </div>
                    <div class="mt-2 text-xs text-slate-500">{props.profile.profile.email ?? '이메일 정보 없음'}</div>
                    <div class="mt-2 text-xs text-slate-500">구독 만료: {props.profile.profile.subscriptionExpiresAt ?? '없음'}</div>
                  </div>
                )}

                <div class="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm font-semibold text-slate-950">최근 세션</div>
                    <div class="flex items-center gap-2">
                      <div class="text-xs font-medium text-slate-500">
                        {props.bootstrap?.activeSession ? `활성 #${props.bootstrap.activeSession.id}` : '활성 세션 없음'}
                      </div>
                      <AppButton kind="ghost" class="px-3 py-1 text-xs" onClick={() => props.onCreateSession()}>새 대화</AppButton>
                    </div>
                  </div>
                  {recentSessions.length > 0 ? (
                    <div class="mt-3 space-y-2">
                      {recentSessions.slice(0, 4).map((session) => (
                        <div
                          class={`flex items-center gap-2 rounded-xl px-2 py-2 text-sm ${session.id === activeSessionId ? 'bg-primary/8 text-primary' : 'bg-slate-50 text-slate-700'}`}
                          key={session.id}
                        >
                          <button
                            type="button"
                            class="min-w-0 flex-1 rounded-lg px-2 py-1 text-left"
                            onClick={() => props.onSelectSession(session.id)}
                          >
                            {state.editingSessionId === session.id ? (
                              <div
                                onClick={(event) => event.stopPropagation()}
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
                              >
                                <input
                                  class="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-900 outline-none"
                                  value={state.sessionTitleDraft}
                                  onInput={(event) => appStore.getState().setSessionTitleDraft((event.currentTarget as HTMLInputElement).value)}
                                  onBlur={() => props.onRenameSession(session.id)}
                                  autofocus
                                />
                              </div>
                            ) : (
                              <>
                                <div class="truncate font-medium">{session.title}</div>
                                <div class="mt-0.5 text-[11px] opacity-70">#{session.id}</div>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            class="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm transition hover:text-slate-900 disabled:opacity-50"
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
                            class="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm transition hover:text-red-600 disabled:opacity-50"
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
                </div>
              </div>
            ) : (
              <form
                class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  props.onSignIn();
                }}
              >
                <input
                  class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                  placeholder="이메일"
                  value={auth.email}
                  onInput={(event) => authStore.getState().setEmail((event.currentTarget as HTMLInputElement).value)}
                />
                <input
                  type="password"
                  class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                  placeholder="비밀번호"
                  value={auth.password}
                  onInput={(event) => authStore.getState().setPassword((event.currentTarget as HTMLInputElement).value)}
                />
                <AppButton type="submit" class="px-5" onClick={undefined}>
                  {props.authLoading ? '로그인 중' : '로그인'}
                </AppButton>
              </form>
            )}

            {auth.error && <div class="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{auth.error}</div>}
          </div>
        </section>

        <section class="w-full max-w-[420px] shrink-0">
          <div class="phone-shell">
            <div class="phone-notch"></div>
            <div class="phone-content">
              <div class="mb-4 flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-slate-500">쉬운AI가계부</p>
                  <p class="text-sm font-bold text-slate-950">{props.pageTitle}</p>
                </div>
                <div class="flex items-center gap-2">
                  <div class="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                    {props.session ? 'live api' : 'preview'}
                  </div>
                  <button
                    type="button"
                    class="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm"
                    onClick={() => props.onNavigate('settings')}
                    aria-label="설정 열기"
                  >
                    설정
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm"
                    onClick={() => props.onNavigate('help')}
                    aria-label="도움말 열기"
                  >
                    도움말
                  </button>
                </div>
              </div>
              {props.page}
            </div>

            <nav class="grid grid-cols-8 gap-2 border-t border-slate-200 bg-white/96 p-3">
              <button class={`nav-pill ${props.route === 'home' ? 'nav-pill-active' : ''}`} type="button" onClick={() => props.onNavigate('home')}>
                <span class="nav-icon">💬</span>
                홈
              </button>
              <button class={`nav-pill ${props.route === 'calendar' ? 'nav-pill-active' : ''}`} type="button" onClick={() => props.onNavigate('calendar')}>
                <span class="nav-icon">📅</span>
                달력
              </button>
              <button class={`nav-pill ${props.route === 'record' ? 'nav-pill-active' : ''}`} type="button" onClick={() => props.onNavigate('record')}>
                <span class="nav-icon">➕</span>
                기록
              </button>
              <button class={`nav-pill ${props.route === 'stats' ? 'nav-pill-active' : ''}`} type="button" onClick={() => props.onNavigate('stats')}>
                <span class="nav-icon">📈</span>
                통계
              </button>
              <button class={`nav-pill ${props.route === 'monthlyReport' ? 'nav-pill-active' : ''}`} type="button" onClick={() => props.onNavigate('monthlyReport')}>
                <span class="nav-icon">🗂️</span>
                월간
              </button>
              <button class={`nav-pill ${props.route === 'reports' ? 'nav-pill-active' : ''}`} type="button" onClick={() => props.onNavigate('reports')}>
                <span class="nav-icon">📊</span>
                리포트
              </button>
              <button class={`nav-pill ${props.route === 'search' ? 'nav-pill-active' : ''}`} type="button" onClick={() => props.onNavigate('search')}>
                <span class="nav-icon">🔎</span>
                검색
              </button>
              <button class={`nav-pill ${props.route === 'settings' ? 'nav-pill-active' : ''}`} type="button" onClick={() => props.onNavigate('settings')}>
                <span class="nav-icon">⚙️</span>
                설정
              </button>
            </nav>
          </div>
        </section>
      </div>
    </div>
  );
}
