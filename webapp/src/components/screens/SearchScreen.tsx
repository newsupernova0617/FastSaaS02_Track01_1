/** @jsxImportSource hono/jsx */
import type { QueryObserverResult } from '@tanstack/query-core';
import { appStore } from '../../state/app-store';
import type { SearchResponse } from '../../data/schemas';
import { AppButton } from '../ui/AppButton';
import { LoadingCard } from '../ui/LoadingCard';
import { ErrorCard } from '../ui/ErrorCard';

const currency = new Intl.NumberFormat('ko-KR');

export function SearchScreen(props: { result: QueryObserverResult<SearchResponse, Error>; onSubmitSearch: () => void }) {
  const state = appStore.getState();

  return (
    <div class="phone-panel">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmitSearch();
        }}
        class="flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-sm"
      >
        <svg class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.34-4.34"></path>
        </svg>
        <input
          class="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
          value={state.searchDraft}
          placeholder="지난주 식비 얼마였어?"
          onInput={(event) => appStore.getState().setSearchDraft((event.currentTarget as HTMLInputElement).value)}
        />
        <AppButton type="submit" class="px-4 py-2 text-sm">질문</AppButton>
      </form>

      {props.result.isPending && <LoadingCard label="검색 결과를 불러오는 중" />}
      {props.result.isError && <ErrorCard message="검색 결과를 불러오지 못했습니다." />}

      {props.result.data && (
        <div class="mt-4">
          <div class="rounded-[28px] bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div class="text-[11px] font-semibold text-slate-500">{props.result.data.period}</div>
              <div class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                live
              </div>
            </div>
            <div class="mt-1 text-3xl font-black text-slate-950">
              {currency.format(props.result.data.total)}
              <span class="ml-1 text-base font-semibold">원</span>
            </div>
            <div class="mt-2 text-sm text-slate-600">
              하루 평균 <span class="font-bold text-slate-950">{currency.format(props.result.data.averagePerDay)}원</span>
            </div>

            <div class="mt-4 h-px bg-slate-200"></div>

            <div class="mt-4 space-y-2">
              {props.result.data.highlights.map((highlight) => (
                <div class="flex items-center justify-between text-sm" key={highlight.label}>
                  <span class="text-slate-600">{highlight.label}</span>
                  <span class="font-bold text-slate-950">{currency.format(highlight.amount)}원</span>
                </div>
              ))}
            </div>
          </div>

          <div class="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-600">
            <span class="mr-2">💡</span>
            {props.result.data.insight}
          </div>
        </div>
      )}
    </div>
  );
}
