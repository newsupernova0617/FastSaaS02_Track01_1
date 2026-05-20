/** @jsxImportSource hono/jsx */
import type { QueryObserverResult } from '@tanstack/query-core';
import type { AppCurrentReportResponse, AppReportsResponse } from '../../data/schemas';
import { formatTimestamp, formatWon } from '../../lib/format';
import { AppButton } from '../ui/AppButton';
import { LoadingCard } from '../ui/LoadingCard';
import { ErrorCard } from '../ui/ErrorCard';

export function MonthlyReportScreen(props: {
  result: QueryObserverResult<AppCurrentReportResponse, Error>;
  reports: AppReportsResponse | null;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onGenerateMonthlyReport: () => void;
  onGenerateWeeklyReport: () => void;
}) {
  if (props.result.isPending) return <LoadingCard label="월간 리포트를 불러오는 중" />;
  if (props.result.isError || !props.result.data) return <ErrorCard message="월간 리포트를 불러오지 못했습니다." />;

  const report = props.result.data.report;
  const summary = report.summary ?? null;

  return (
    <div class="phone-panel">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-bold text-slate-500">{report.reportType}</div>
          <div class="mt-1 text-[10px] font-medium text-slate-400">월간/주간 리포트 생성</div>
        </div>
        <div class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
          live
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between gap-3">
        <AppButton kind="ghost" class="px-3 py-2 text-lg leading-none" onClick={props.onPreviousMonth}>‹</AppButton>
        <div class="text-sm font-semibold text-slate-950">{report.title}</div>
        <AppButton kind="ghost" class="px-3 py-2 text-lg leading-none" onClick={props.onNextMonth}>›</AppButton>
      </div>

      <div class="mt-3 rounded-[24px] bg-gradient-to-br from-primary to-accent p-5 text-white shadow-xl shadow-primary/20">
        <div class="text-[11px] opacity-80">{report.subtitle ?? '리포트 요약'}</div>
        {summary && (
          <div class="mt-2 text-3xl font-black">
            {formatWon(Number((summary as Record<string, unknown>).total ?? 0))}
            <span class="ml-1 text-base font-semibold">원</span>
          </div>
        )}
        <div class="mt-1 text-[11px] opacity-80">
          생성일 {formatTimestamp(report.createdAt)}
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2">
        <AppButton kind="primary" onClick={props.onGenerateMonthlyReport}>
          월간 생성
        </AppButton>
        <AppButton kind="secondary" onClick={props.onGenerateWeeklyReport}>
          주간 생성
        </AppButton>
      </div>

      <div class="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-slate-950">리포트 본문</div>
            <div class="text-[11px] text-slate-500">app-facing `GET /api/app/reports/current`</div>
          </div>
          <div class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{report.reportData.length}섹션</div>
        </div>

        <div class="mt-3 space-y-2">
          {report.reportData.map((section, index) => (
            <div class="rounded-2xl bg-slate-50 px-3 py-2" key={index}>
              <div class="text-sm font-semibold text-slate-950">{String((section as Record<string, unknown>).title ?? '섹션')}</div>
              <div class="mt-0.5 text-[11px] text-slate-500">
                {String((section as Record<string, unknown>).type ?? 'card')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div class="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-slate-950">저장된 리포트</div>
            <div class="text-[11px] text-slate-500">저장된 리포트 목록</div>
          </div>
          <div class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{props.reports?.reports?.length ?? 0}개</div>
        </div>
        <div class="mt-3 space-y-2">
          {props.reports?.reports?.length ? props.reports.reports.slice(0, 4).map((item) => (
            <div class="rounded-2xl bg-slate-50 px-3 py-2" key={item.id}>
              <div class="text-sm font-semibold text-slate-950">{item.title}</div>
              <div class="text-[11px] text-slate-500">{item.subtitle ?? item.reportType} · #{item.id}</div>
            </div>
          )) : (
            <div class="rounded-2xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
              저장된 리포트가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
