/** @jsxImportSource hono/jsx */
import type { Session } from '@supabase/supabase-js';
import type { AppProfileResponse } from '../../data/schemas';
import { AppButton } from '../ui/AppButton';

export function SettingsScreen(props: {
  profile: AppProfileResponse | null;
  session: Session | null;
  onSignOut: () => void;
  onRequestNotificationPermission: () => void;
  quickEntrySubscribed: boolean;
  quickEntrySupported: boolean;
  quickEntryLoading: boolean;
  quickEntryError: string | null;
  onEnableQuickEntry: () => void;
  onDisableQuickEntry: () => void;
  onSendQuickEntryTest: () => void;
}) {
  const permission =
    typeof Notification === 'undefined'
      ? 'unsupported'
      : Notification.permission;
  const profile = props.profile?.profile ?? null;
  const title = profile?.name ?? profile?.email ?? props.session?.user.email ?? '게스트';
  const email = profile?.email ?? props.session?.user.email ?? '이메일 정보 없음';
  const provider = profile?.provider ?? 'unknown';
  const planLabel = profile?.plan === 'paid' ? '프리미엄 플랜' : '무료 플랜';
  const subscriptionStatus = profile?.subscriptionStatus ?? 'unknown';
  const subscriptionExpiresAt = profile?.subscriptionExpiresAt ?? '없음';

  return (
    <div class="phone-panel space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-bold text-slate-500">설정</div>
          <div class="mt-1 text-[10px] font-medium text-slate-400">계정 / 알림 / 지원</div>
        </div>
        <div class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
          {props.session ? 'live' : 'guest'}
        </div>
      </div>

      <div class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold text-slate-950">{title}</div>
            <div class="mt-0.5 text-[11px] text-slate-500">{email}</div>
          </div>
          <AppButton kind="ghost" onClick={props.onSignOut} disabled={!props.session}>
            로그아웃
          </AppButton>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <div class="rounded-2xl bg-slate-50 px-3 py-2">
            <div class="text-[10px] font-semibold text-slate-500">provider</div>
            <div class="mt-1 text-sm font-semibold text-slate-950">{provider}</div>
          </div>
          <div class="rounded-2xl bg-slate-50 px-3 py-2">
            <div class="text-[10px] font-semibold text-slate-500">plan</div>
            <div class="mt-1 text-sm font-semibold text-slate-950">{planLabel}</div>
          </div>
        </div>

        <div class="mt-2 grid grid-cols-2 gap-2">
          <div class="rounded-2xl bg-slate-50 px-3 py-2">
            <div class="text-[10px] font-semibold text-slate-500">status</div>
            <div class="mt-1 text-sm font-semibold text-slate-950">{subscriptionStatus}</div>
          </div>
          <div class="rounded-2xl bg-slate-50 px-3 py-2">
            <div class="text-[10px] font-semibold text-slate-500">expires</div>
            <div class="mt-1 text-sm font-semibold text-slate-950">{subscriptionExpiresAt}</div>
          </div>
        </div>
      </div>

      <div class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-slate-950">알림</div>
            <div class="text-[11px] text-slate-500">quick entry 주경로 준비</div>
          </div>
          <div class="flex items-center gap-2">
            <div class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
              {permission}
            </div>
            <div class={`rounded-full px-2 py-1 text-[10px] font-semibold ${props.quickEntrySubscribed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {props.quickEntrySubscribed ? 'push ready' : 'push off'}
            </div>
          </div>
        </div>
        <div class="mt-3 text-sm text-slate-600">
          Android Chrome에서 inline reply를 주경로로 쓰기 전에, 먼저 브라우저 알림 권한과 푸시 구독을 확인합니다.
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <AppButton kind="secondary" onClick={props.onRequestNotificationPermission} disabled={permission === 'granted' || permission === 'unsupported'}>
            {permission === 'granted' ? '권한 허용됨' : permission === 'unsupported' ? '미지원 브라우저' : '권한 요청'}
          </AppButton>
          <AppButton kind="primary" onClick={props.onEnableQuickEntry} disabled={props.quickEntryLoading || !props.quickEntrySupported || permission !== 'granted' || !props.session}>
            {props.quickEntryLoading ? '연결 중' : 'quick entry 연결'}
          </AppButton>
          <AppButton kind="secondary" onClick={props.onSendQuickEntryTest} disabled={props.quickEntryLoading || !props.quickEntrySubscribed}>
            테스트 알림
          </AppButton>
          <AppButton kind="ghost" onClick={props.onDisableQuickEntry} disabled={props.quickEntryLoading || !props.quickEntrySubscribed}>
            해제
          </AppButton>
        </div>
        <div class="mt-3 text-[11px] text-slate-500">
          지원 브라우저: Android Chrome 우선
        </div>
        {props.quickEntryError && <div class="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{props.quickEntryError}</div>}
      </div>

      <div class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="text-sm font-semibold text-slate-950">지원</div>
        <div class="mt-2 space-y-2 text-sm text-slate-600">
          <div>문의: support@example.com</div>
          <div>문서: webapp implementation priority</div>
          <div>약관/정책: 필요 시 별도 route로 분리</div>
        </div>
      </div>
    </div>
  );
}
