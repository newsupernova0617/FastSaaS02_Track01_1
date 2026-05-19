/** @jsxImportSource hono/jsx */
import type { QueryObserverResult } from '@tanstack/query-core';
import { appStore } from '../../state/app-store';
import type { AppCurrentReportResponse, AppReportsResponse, ReportResponse } from '../../data/schemas';
import type { SourcedData } from '../../data/preview-api';
import { formatTimestamp, formatWon } from '../../lib/format';
import { AppButton } from '../ui/AppButton';
import { LoadingCard } from '../ui/LoadingCard';
import { ErrorCard } from '../ui/ErrorCard';

export function ReportScreen(props: {
  result: QueryObserverResult<SourcedData<ReportResponse>, Error>;
  reports: AppReportsResponse | null;
  selectedReport: SourcedData<AppCurrentReportResponse> | null;
  selectedReportLoading: boolean;
  selectedReportError: string | null;
  onSelectReport: (reportId: number) => void;
  onDeleteReport: (reportId: number) => void;
  onRenameReport: (reportId: number) => void;
}) {
  if (props.result.isPending) return <LoadingCard label="리포트 화면을 불러오는 중" />;
  if (props.result.isError || !props.result.data) return <ErrorCard message="리포트 데이터를 불러오지 못했습니다." />;

  const state = appStore.getState();
  const { summary, dailySpending, categories, month } = props.result.data.data;
  const maxAmount = Math.max(...dailySpending.map((entry) => entry.amount));
  const report = props.selectedReport?.data.report ?? null;
  const selectedReportId = state.selectedReportId;
  const reportRows = props.reports?.reports ?? [];

  function renderReportValue(value: unknown): string {
    if (value === null || value === undefined) return '없음';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `${value.length}개 항목`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function renderDetailReportRows() {
    if (props.selectedReportLoading) {
      return <LoadingCard label="리포트 상세를 불러오는 중" />;
    }

    if (props.selectedReportError) {
      return <ErrorCard message={props.selectedReportError} />;
    }

    if (!report) {
      return (
        <div class="rounded-2xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
          목록에서 리포트를 선택하세요.
        </div>
      );
    }

    const summaryEntries = report.summary ? Object.entries(report.summary).slice(0, 4) : [];
    const paramEntries = report.params ? Object.entries(report.params).slice(0, 4) : [];

    return (
      <div class="space-y-3">
        <div class="rounded-[24px] bg-gradient-to-br from-primary to-accent p-4 text-white shadow-xl shadow-primary/20">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-[11px] font-semibold opacity-80">{report.reportType}</div>
              {state.editingReportId === report.id ? (
                <div class="mt-2">
                  <input
                    class="w-full rounded-2xl border border-white/30 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-950 outline-none"
                    value={state.reportTitleDraft}
                    onInput={(event) => appStore.getState().setReportTitleDraft((event.currentTarget as HTMLInputElement).value)}
                    onBlur={() => props.onRenameReport(report.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        props.onRenameReport(report.id);
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        appStore.getState().stopEditingReport();
                      }
                    }}
                    autofocus
                  />
                  <div class="mt-2 flex items-center gap-2">
                    <AppButton kind="secondary" class="px-3 py-2 text-xs" onClick={() => props.onRenameReport(report.id)}>
                      저장
                    </AppButton>
                    <AppButton kind="ghost" class="px-3 py-2 text-xs text-white" onClick={() => appStore.getState().stopEditingReport()}>
                      취소
                    </AppButton>
                  </div>
                </div>
              ) : (
                <div class="mt-1 text-2xl font-black">{report.title}</div>
              )}
              <div class="mt-1 text-[11px] opacity-80">{report.subtitle ?? '리포트 상세'}</div>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-2 text-right">
              <div class="rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold">{report.id}</div>
              <div class="rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold">{props.selectedReport?.source ?? 'live'}</div>
              {state.editingReportId !== report.id && (
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-50"
                    onClick={() => appStore.getState().startEditingReport(report.id, report.title)}
                    disabled={props.selectedReportLoading || state.reportActionLoading}
                    aria-label={`리포트 ${report.id} 이름 변경`}
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-50"
                    onClick={() => props.onDeleteReport(report.id)}
                    disabled={props.selectedReportLoading || state.reportActionLoading}
                    aria-label={`리포트 ${report.id} 삭제`}
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
              )}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-2xl bg-white p-3 shadow-sm">
            <div class="text-[10px] font-semibold text-slate-500">생성일</div>
            <div class="mt-1 text-sm font-semibold text-slate-950">{formatTimestamp(report.createdAt)}</div>
          </div>
          <div class="rounded-2xl bg-white p-3 shadow-sm">
            <div class="text-[10px] font-semibold text-slate-500">수정일</div>
            <div class="mt-1 text-sm font-semibold text-slate-950">{report.updatedAt ? formatTimestamp(report.updatedAt) : '없음'}</div>
          </div>
        </div>

        <div class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-sm font-semibold text-slate-950">요약</div>
              <div class="text-[11px] text-slate-500">summary / params</div>
            </div>
            <div class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{report.reportData.length}섹션</div>
          </div>

          <div class="mt-3 grid gap-2">
            {summaryEntries.length ? summaryEntries.map(([key, value]) => (
              <div class="rounded-2xl bg-slate-50 px-3 py-2" key={key}>
                <div class="text-[10px] font-semibold text-slate-500">{key}</div>
                <div class="mt-1 text-sm font-semibold text-slate-950">{renderReportValue(value)}</div>
              </div>
            )) : (
              <div class="rounded-2xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                요약 데이터가 없습니다.
              </div>
            )}
          </div>

          <div class="mt-4 grid gap-2">
            {paramEntries.length ? paramEntries.map(([key, value]) => (
              <div class="rounded-2xl bg-slate-50 px-3 py-2" key={key}>
                <div class="text-[10px] font-semibold text-slate-500">{key}</div>
                <div class="mt-1 text-sm font-medium text-slate-700">{renderReportValue(value)}</div>
              </div>
            )) : (
              <div class="rounded-2xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                파라미터가 없습니다.
              </div>
            )}
          </div>
        </div>

        <div class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-sm font-semibold text-slate-950">리포트 본문</div>
              <div class="text-[11px] text-slate-500">app-facing `GET /api/app/reports/:id`</div>
            </div>
            <div class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{report.reportData.length}섹션</div>
          </div>

          <div class="mt-3 space-y-2">
            {report.reportData.map((section, index) => {
              const rawSection = section as Record<string, unknown>;
              const title = typeof rawSection.title === 'string' ? rawSection.title : `섹션 ${index + 1}`;
              const type = typeof rawSection.type === 'string' ? rawSection.type : 'card';
              const detail = rawSection.description ?? rawSection.content ?? rawSection.text ?? null;

              return (
                <div class="rounded-2xl bg-slate-50 px-3 py-2" key={`${title}-${index}`}>
                  <div class="text-sm font-semibold text-slate-950">{title}</div>
                  <div class="mt-0.5 text-[11px] text-slate-500">{type}</div>
                  {detail && <div class="mt-1 text-xs text-slate-600">{renderReportValue(detail)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="phone-panel">
      <div class="flex items-center justify-between gap-3">
        <div class="text-[11px] font-bold text-slate-500">{month.replace('-', '년 ')}월 리포트</div>
        <div class={`rounded-full px-2 py-1 text-[10px] font-semibold ${props.result.data.source === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {props.result.data.source}
        </div>
      </div>

      <div class="mt-3 rounded-[28px] bg-gradient-to-br from-primary to-accent p-5 text-white shadow-xl shadow-primary/20">
        <div class="text-[11px] opacity-80">{summary.label}</div>
        <div class="mt-1 text-3xl font-black">
          {formatWon(summary.total)}
          <span class="ml-1 text-base font-semibold">원</span>
        </div>
        <div class="mt-1 text-[11px] opacity-80">
          지난달보다 {formatWon(summary.delta)}원 {summary.direction === 'up' ? '증가' : '감소'}
        </div>
      </div>

      <div class="mt-5">
        <div class="flex h-28 items-end gap-2">
          {dailySpending.map((entry) => (
            <div class="flex min-w-0 flex-1 flex-col items-center gap-2" key={entry.day}>
              <div
                class="w-full rounded-t-xl bg-primary/70 transition-[height] duration-300"
                style={`height:${Math.max(24, Math.round((entry.amount / maxAmount) * 100))}%`}
              ></div>
              <span class="text-[10px] font-medium text-slate-500">{entry.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div class="mt-5 space-y-2">
        {categories.map((entry) => (
          <div class="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm" key={entry.name}>
            <div class="flex items-center gap-3">
              <span class="text-lg">{entry.emoji}</span>
              <span class="text-sm font-semibold text-slate-900">{entry.name}</span>
            </div>
            <span class="text-sm font-bold text-slate-950">{formatWon(entry.total)}</span>
          </div>
        ))}
      </div>

      <div class="mt-5 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-slate-950">저장된 리포트</div>
            <div class="text-[11px] text-slate-500">목록에서 선택해 상세를 수정하거나 삭제합니다.</div>
          </div>
          <div class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">live</div>
        </div>

        {props.reports?.reports?.length ? (
          <div class="mt-3 space-y-2">
            {reportRows.map((item) => {
              const isSelected = selectedReportId === item.id;

              return (
                <div
                  class={`flex items-center gap-2 rounded-2xl px-2 py-2 ${isSelected ? 'bg-primary/8 ring-1 ring-primary/20' : 'bg-slate-50'}`}
                  key={item.id}
                >
                  <button
                    type="button"
                    class="min-w-0 flex-1 rounded-xl px-2 py-1 text-left"
                    onClick={() => props.onSelectReport(item.id)}
                  >
                    <div class="truncate text-sm font-semibold text-slate-950">{item.title}</div>
                    <div class="mt-0.5 text-[11px] text-slate-500">
                      {item.subtitle ?? item.reportType} · #{item.id}
                    </div>
                  </button>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-slate-900 disabled:opacity-50"
                    onClick={() => {
                      props.onSelectReport(item.id);
                      appStore.getState().startEditingReport(item.id, item.title);
                    }}
                    disabled={props.selectedReportLoading || state.reportActionLoading}
                    aria-label={`리포트 ${item.id} 편집`}
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-red-600 disabled:opacity-50"
                    onClick={() => props.onDeleteReport(item.id)}
                    disabled={props.selectedReportLoading || state.reportActionLoading}
                    aria-label={`리포트 ${item.id} 삭제`}
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
              );
            })}
          </div>
        ) : (
          <div class="mt-3 text-sm text-slate-500">불러온 리포트가 없습니다.</div>
        )}
      </div>

      <div class="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-slate-950">선택한 리포트 상세</div>
            <div class="text-[11px] text-slate-500">app-facing `GET /api/app/reports/:id`</div>
          </div>
          <div class={`rounded-full px-2 py-1 text-[10px] font-semibold ${props.selectedReport?.source === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {props.selectedReport?.source ?? 'idle'}
          </div>
        </div>

        <div class="mt-3">
          {renderDetailReportRows()}
        </div>
      </div>
    </div>
  );
}
