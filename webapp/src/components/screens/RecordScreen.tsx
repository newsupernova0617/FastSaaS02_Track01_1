/** @jsxImportSource hono/jsx */
import type { QueryObserverResult } from '@tanstack/query-core';
import { appStore } from '../../state/app-store';
import type { AppTransactionsResponse } from '../../data/schemas';
import { formatWon } from '../../lib/format';
import { AppButton } from '../ui/AppButton';
import { LoadingCard } from '../ui/LoadingCard';
import { ErrorCard } from '../ui/ErrorCard';

export function RecordScreen(props: {
  result: QueryObserverResult<AppTransactionsResponse, Error>;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSubmit: () => void;
  onDeleteTransaction: (id: number) => void;
}) {
  if (props.result.isPending) return <LoadingCard label="기록 화면을 불러오는 중" />;
  if (props.result.isError || !props.result.data) return <ErrorCard message="기록 데이터를 불러오지 못했습니다." />;

  const state = appStore.getState();
  const transactions = props.result.data.transactions;
  const totalExpense = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);

  return (
    <div class="phone-panel">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-bold text-slate-500">{props.result.data.month}</div>
          <div class="mt-1 text-[10px] font-medium text-slate-400">거래 입력</div>
        </div>
        <div class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
          live
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between gap-3">
        <AppButton kind="ghost" class="px-3 py-2 text-lg leading-none" onClick={props.onPreviousMonth}>‹</AppButton>
        <div class="text-sm font-semibold text-slate-950">{props.result.data.month}</div>
        <AppButton kind="ghost" class="px-3 py-2 text-lg leading-none" onClick={props.onNextMonth}>›</AppButton>
      </div>

      <div class="mt-3 grid grid-cols-2 gap-2">
        <div class="rounded-2xl bg-white p-3 shadow-sm">
          <div class="text-[10px] font-semibold text-slate-500">수입</div>
          <div class="mt-1 text-sm font-black text-emerald-600">{formatWon(totalIncome)}</div>
        </div>
        <div class="rounded-2xl bg-white p-3 shadow-sm">
          <div class="text-[10px] font-semibold text-slate-500">지출</div>
          <div class="mt-1 text-sm font-black text-rose-600">{formatWon(totalExpense)}</div>
        </div>
      </div>

      <div class="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="text-sm font-semibold text-slate-950">거래 추가</div>
        <div class="mt-3 grid gap-2">
          <input
            class="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="금액"
            value={state.recordAmount}
            onInput={(event) => appStore.getState().setRecordAmount((event.currentTarget as HTMLInputElement).value)}
          />
          <input
            class="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
            placeholder="카테고리"
            value={state.recordCategory}
            onInput={(event) => appStore.getState().setRecordCategory((event.currentTarget as HTMLInputElement).value)}
          />
          <input
            class="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
            type="date"
            value={state.recordDate}
            onInput={(event) => appStore.getState().setRecordDate((event.currentTarget as HTMLInputElement).value)}
          />
          <textarea
            class="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
            rows={3}
            placeholder="메모"
            value={state.recordMemo}
            onInput={(event) => appStore.getState().setRecordMemo((event.currentTarget as HTMLTextAreaElement).value)}
          ></textarea>
        </div>

        <div class="mt-3 flex items-center gap-2">
          <AppButton kind="primary" class="flex-1" onClick={props.onSubmit}>
            {state.recordSubmitting ? '저장 중' : '저장'}
          </AppButton>
          <AppButton kind="ghost" onClick={() => appStore.getState().resetRecordForm()}>
            초기화
          </AppButton>
        </div>

        {state.recordError && <div class="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.recordError}</div>}
      </div>

      <div class="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-slate-950">최근 거래</div>
            <div class="text-[11px] text-slate-500">삭제는 app-facing `DELETE /api/app/transactions/:id` 사용</div>
          </div>
          <div class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{transactions.length}건</div>
        </div>

        <div class="mt-3 space-y-2">
          {transactions.length ? transactions.slice(0, 8).map((transaction) => (
            <div class="rounded-2xl bg-slate-50 px-3 py-2" key={transaction.id}>
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-slate-950">{transaction.category}</div>
                  <div class="text-[11px] text-slate-500">
                    {transaction.date} · {transaction.memo ?? '메모 없음'}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <div class={`text-sm font-bold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatWon(transaction.amount)}
                  </div>
                  <button
                    type="button"
                    class="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 shadow-sm"
                    onClick={() => props.onDeleteTransaction(transaction.id)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div class="rounded-2xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
              아직 이 달의 거래가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
