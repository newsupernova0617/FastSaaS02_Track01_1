/** @jsxImportSource hono/jsx */
import type { QueryObserverResult } from '@tanstack/query-core';
import type { AppReportsResponse, StatsResponse } from '../../data/schemas';
import { formatWon } from '../../lib/format';
import { AppButton } from '../ui/AppButton';
import { LoadingCard } from '../ui/LoadingCard';
import { ErrorCard } from '../ui/ErrorCard';

export function StatsScreen(props: {
  result: QueryObserverResult<StatsResponse, Error>;
  reports: AppReportsResponse | null;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}) {
  if (props.result.isPending) return <LoadingCard label="통계 화면을 불러오는 중" />;
  if (props.result.isError || !props.result.data) return <ErrorCard message="통계 데이터를 불러오지 못했습니다." />;

  const stats = props.result.data;
  const expenseMax = Math.max(...stats.expenseCategories.map((item) => item.total), 1);
  const incomeMax = Math.max(...stats.incomeCategories.map((item) => item.total), 1);

  function categoryRow(item: StatsResponse['expenseCategories'][number], max: number) {
    return (
      <div class="rounded-2xl bg-slate-50 px-3 py-2" key={`${item.type}-${item.category}`}>
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span>{item.emoji}</span>
              <div class="truncate text-sm font-semibold text-slate-950">{item.category}</div>
            </div>
            <div class="mt-0.5 text-[11px] text-slate-500">{item.count}건</div>
          </div>
          <div class="text-sm font-bold text-slate-950">{formatWon(item.total)}</div>
        </div>
        <div class="mt-2 h-1.5 rounded-full bg-slate-200">
          <div class="h-1.5 rounded-full bg-primary" style={`width:${Math.max(8, Math.round((item.total / max) * 100))}%`}></div>
        </div>
      </div>
    );
  }

  return (
    <div class="phone-panel">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-bold text-slate-500">{stats.monthLabel}</div>
          <div class="mt-1 text-[10px] font-medium text-slate-400">월별 수입/지출 통계</div>
        </div>
        <div class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
          live
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between gap-3">
        <AppButton kind="ghost" class="px-3 py-2 text-lg leading-none" onClick={props.onPreviousMonth}>‹</AppButton>
        <div class="text-sm font-semibold text-slate-950">{stats.monthLabel}</div>
        <AppButton kind="ghost" class="px-3 py-2 text-lg leading-none" onClick={props.onNextMonth}>›</AppButton>
      </div>

      <div class="mt-3 grid grid-cols-3 gap-2">
        <div class="rounded-2xl bg-white p-3 shadow-sm">
          <div class="text-[10px] font-semibold text-slate-500">지출</div>
          <div class="mt-1 text-sm font-black text-rose-600">{formatWon(stats.summary.expense)}</div>
        </div>
        <div class="rounded-2xl bg-white p-3 shadow-sm">
          <div class="text-[10px] font-semibold text-slate-500">수입</div>
          <div class="mt-1 text-sm font-black text-emerald-600">{formatWon(stats.summary.income)}</div>
        </div>
        <div class="rounded-2xl bg-white p-3 shadow-sm">
          <div class="text-[10px] font-semibold text-slate-500">순액</div>
          <div class="mt-1 text-sm font-black text-slate-950">{formatWon(stats.summary.net)}</div>
        </div>
      </div>

      <div class="mt-4 rounded-[24px] bg-gradient-to-br from-primary to-accent p-4 text-white shadow-xl shadow-primary/20">
        <div class="text-[11px] opacity-80">총 거래 {stats.summary.transactionCount}건</div>
        <div class="mt-1 text-xl font-black">이번 달 흐름</div>
        <div class="mt-1 text-[11px] opacity-80">
          지출은 {formatWon(stats.summary.expenseDelta)}원, 수입은 {formatWon(stats.summary.incomeDelta)}원 변동
        </div>
      </div>

      <div class="mt-4 grid gap-4">
        <div class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-sm font-semibold text-slate-950">지출 카테고리</div>
              <div class="text-[11px] text-slate-500">상위 6개</div>
            </div>
            <div class="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">{stats.expenseCategories.length}개</div>
          </div>
          <div class="mt-3 space-y-2">
            {stats.expenseCategories.length ? stats.expenseCategories.map((item) => categoryRow(item, expenseMax)) : <div class="text-sm text-slate-500">지출 내역이 없습니다.</div>}
          </div>
        </div>

        <div class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-sm font-semibold text-slate-950">수입 카테고리</div>
              <div class="text-[11px] text-slate-500">상위 6개</div>
            </div>
            <div class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">{stats.incomeCategories.length}개</div>
          </div>
          <div class="mt-3 space-y-2">
            {stats.incomeCategories.length ? stats.incomeCategories.map((item) => categoryRow(item, incomeMax)) : <div class="text-sm text-slate-500">수입 내역이 없습니다.</div>}
          </div>
        </div>
      </div>

      <div class="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-slate-950">최근 리포트</div>
            <div class="text-[11px] text-slate-500">저장된 분석 결과</div>
          </div>
          <div class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">live</div>
        </div>
        {props.reports?.reports?.length ? (
          <div class="mt-3 space-y-2">
            {props.reports.reports.slice(0, 3).map((report) => (
              <div class="rounded-2xl bg-slate-50 px-3 py-2" key={report.id}>
                <div class="text-sm font-semibold text-slate-950">{report.title}</div>
                <div class="mt-0.5 text-[11px] text-slate-500">
                  {report.subtitle ?? report.reportType} · #{report.id}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div class="mt-3 text-sm text-slate-500">불러온 리포트가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
