/** @jsxImportSource hono/jsx */
import type { QueryObserverResult } from '@tanstack/query-core';
import type { HomeResponse, BootstrapResponse, TimelineResponse } from '../../data/schemas';
import { appStore } from '../../state/app-store';
import { buildHomeViewModel } from '../../lib/home-view';
import { formatWon } from '../../lib/format';
import { AppButton } from '../ui/AppButton';
import { LoadingCard } from '../ui/LoadingCard';
import { ErrorCard } from '../ui/ErrorCard';

export function HomeScreen(props: {
  result: QueryObserverResult<HomeResponse, Error>;
  bootstrap: BootstrapResponse | null;
  timeline: TimelineResponse | null;
  isAuthenticated: boolean;
  onSubmitComposer: () => void;
}) {
  if (props.result.isPending) return <LoadingCard label="홈 화면을 불러오는 중" />;
  if (props.result.isError || !props.result.data) return <ErrorCard message="홈 데이터를 불러오지 못했습니다." />;

  const state = appStore.getState();
  const homeView = buildHomeViewModel(props.result.data, props.bootstrap, props.timeline, props.isAuthenticated);

  return (
    <div class="phone-panel">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-[11px] font-bold text-slate-500">{homeView.dateLabel}</div>
          {homeView.sessionId && (
            <div class="mt-1 text-[10px] font-medium text-slate-400">세션 #{homeView.sessionId}</div>
          )}
        </div>
        <div class="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-900 shadow-sm">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          LIVE
        </div>
      </div>

      <div class="mt-4 space-y-3">
        {homeView.visibleMessages.map((message) => (
          <div class={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`} key={message.id}>
            <div
              class={`max-w-[78%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
                message.role === 'user'
                  ? 'rounded-br-lg bg-primary font-medium text-white'
                  : 'rounded-bl-lg bg-white text-slate-900'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        <div class="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-lg">
                {homeView.card.emoji}
              </div>
              <div>
                <div class="text-sm font-semibold text-slate-950">{homeView.card.category}</div>
                <div class="text-[11px] text-slate-500">{homeView.card.sublabel}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold text-slate-950">{formatWon(homeView.card.amount)}</div>
              <div class="text-[10px] text-slate-500">{homeView.card.currency}</div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1 px-2">
          <div class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"></div>
          <div class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style="animation-delay:150ms"></div>
          <div class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style="animation-delay:300ms"></div>
        </div>
      </div>

      <form
        class="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmitComposer();
        }}
      >
        <div class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-200/40">
          <input
            class="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
            value={state.composerDraft}
            placeholder={homeView.inputPlaceholder}
            onInput={(event) => appStore.getState().setComposerDraft((event.currentTarget as HTMLInputElement).value)}
          />
          <button class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-md disabled:opacity-50" type="submit" disabled={state.composerSending}>
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        {state.composerError && <div class="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.composerError}</div>}
        {state.activeSessionId && <div class="mt-2 px-2 text-[11px] font-medium text-slate-500">연결 세션 #{state.activeSessionId}</div>}
      </form>
    </div>
  );
}
