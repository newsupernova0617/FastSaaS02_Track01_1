/** @jsxImportSource hono/jsx */
import type { QueryObserverResult } from '@tanstack/query-core';
import type { CalendarResponse } from '../../data/schemas';
import type { SourcedData } from '../../data/preview-api';
import { formatWon, dayLabel } from '../../lib/format';
import { AppButton } from '../ui/AppButton';
import { LoadingCard } from '../ui/LoadingCard';
import { ErrorCard } from '../ui/ErrorCard';

export function CalendarScreen(props: {
  result: QueryObserverResult<SourcedData<CalendarResponse>, Error>;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: string) => void;
}) {
  if (props.result.isPending) return <LoadingCard label="달력 화면을 불러오는 중" />;
  if (props.result.isError || !props.result.data) return <ErrorCard message="달력 데이터를 불러오지 못했습니다." />;

  const calendar = props.result.data.data;
  const { summary, days, selectedDay, monthLabel } = calendar;
  const firstDayOffset = days[0]?.weekday ?? 0;
  const gridCells: Array<(typeof days)[number] | null> = [
    ...Array.from({ length: firstDayOffset }, () => null),
    ...days,
  ];

  return (
    <div class="phone-panel">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-bold text-slate-500">{monthLabel}</div>
          <div class="mt-1 text-[10px] font-medium text-slate-400">선택일 {selectedDay.date}</div>
        </div>
        <div class={`rounded-full px-2 py-1 text-[10px] font-semibold ${props.result.data.source === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {props.result.data.source}
        </div>
      </div>

      <div class="mt-3 grid grid-cols-3 gap-2">
        <div class="rounded-2xl bg-white p-3 shadow-sm">
          <div class="text-[10px] font-semibold text-slate-500">수입</div>
          <div class="mt-1 text-sm font-black text-emerald-600">{formatWon(summary.income)}</div>
        </div>
        <div class="rounded-2xl bg-white p-3 shadow-sm">
          <div class="text-[10px] font-semibold text-slate-500">지출</div>
          <div class="mt-1 text-sm font-black text-rose-600">{formatWon(summary.expense)}</div>
        </div>
        <div class="rounded-2xl bg-white p-3 shadow-sm">
          <div class="text-[10px] font-semibold text-slate-500">순액</div>
          <div class="mt-1 text-sm font-black text-slate-950">{formatWon(summary.net)}</div>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between gap-3">
        <AppButton kind="ghost" class="px-3 py-2 text-lg leading-none" onClick={props.onPreviousMonth}>‹</AppButton>
        <div class="text-sm font-semibold text-slate-950">{monthLabel}</div>
        <AppButton kind="ghost" class="px-3 py-2 text-lg leading-none" onClick={props.onNextMonth}>›</AppButton>
      </div>

      <div class="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
        {['일', '월', '화', '수', '목', '금', '토'].map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div class="mt-2 grid grid-cols-7 gap-1">
        {gridCells.map((day, index) => {
          if (!day) {
            return <div class="aspect-square rounded-2xl" key={`pad-${index}`}></div>;
          }

          const isSelected = day.isSelected;
          const isToday = day.isToday;
          const amountLabel = day.expense > 0 ? `-${formatWon(day.expense)}` : day.income > 0 ? `+${formatWon(day.income)}` : '';

          return (
            <button
              type="button"
              class={`aspect-square rounded-2xl border p-2 text-left transition ${
                isSelected
                  ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20'
                  : isToday
                    ? 'border-primary/40 bg-primary/5 text-slate-950'
                    : 'border-slate-200 bg-white text-slate-950 hover:border-primary/30'
              }`}
              onClick={() => props.onSelectDate(day.date)}
              key={day.date}
            >
              <div class="flex items-start justify-between">
                <div class={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-950'}`}>{day.day}</div>
                <div class={`text-[9px] font-semibold ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>{dayLabel(day.weekday)}</div>
              </div>
              <div class="mt-2 space-y-1">
                {day.hasExpense && <div class={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-rose-500'}`}></div>}
                {day.hasIncome && <div class={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-emerald-500'}`}></div>}
              </div>
              <div class={`mt-2 truncate text-[10px] font-semibold ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                {amountLabel || `${day.transactionCount}건`}
              </div>
            </button>
          );
        })}
      </div>

      <div class="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-slate-950">{selectedDay.date}</div>
            <div class="text-[11px] text-slate-500">선택된 날짜의 거래</div>
          </div>
          <div class="text-right text-xs text-slate-500">
            <div>수입 {formatWon(selectedDay.income)}</div>
            <div>지출 {formatWon(selectedDay.expense)}</div>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <div class="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            수입 {formatWon(selectedDay.income)}
          </div>
          <div class="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            지출 {formatWon(selectedDay.expense)}
          </div>
        </div>

        <div class="mt-3 h-px bg-slate-200"></div>

        {selectedDay.transactions.length > 0 ? (
          <div class="mt-3 space-y-2">
            {selectedDay.transactions.map((transaction) => (
              <div class="rounded-2xl bg-slate-50 px-3 py-2" key={transaction.id}>
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="truncate text-sm font-semibold text-slate-950">{transaction.category}</div>
                    <div class="text-[11px] text-slate-500">{transaction.memo ?? transaction.date}</div>
                  </div>
                  <div class={`text-sm font-bold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatWon(transaction.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div class="mt-3 rounded-2xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
            이 날의 거래가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
