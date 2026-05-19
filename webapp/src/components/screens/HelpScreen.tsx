/** @jsxImportSource hono/jsx */
import { AppButton } from '../ui/AppButton';

export function HelpScreen(props: { onGoSettings: () => void }) {
  return (
    <div class="phone-panel space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-bold text-slate-500">도움말</div>
          <div class="mt-1 text-[10px] font-medium text-slate-400">FAQ / 문의 / AI hub 판단</div>
        </div>
        <div class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
          support
        </div>
      </div>

      <div class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="text-sm font-semibold text-slate-950">자주 묻는 질문</div>
        <div class="mt-3 space-y-2">
          <div class="rounded-2xl bg-slate-50 px-3 py-2">
            <div class="text-sm font-semibold text-slate-950">webapp은 Flutter를 완전히 대체했나?</div>
            <div class="mt-1 text-sm text-slate-600">핵심 기능은 많이 흡수했지만, Android 네이티브 전용 기능은 PWA 대체안을 따로 두는 방식으로 정리 중입니다.</div>
          </div>
          <div class="rounded-2xl bg-slate-50 px-3 py-2">
            <div class="text-sm font-semibold text-slate-950">AI hub가 왜 별도 화면이 아니지?</div>
            <div class="mt-1 text-sm text-slate-600">홈, 검색, 월간 리포트가 이미 AI 흐름을 나눠 갖고 있어서 중복 화면은 우선 만들지 않았습니다.</div>
          </div>
          <div class="rounded-2xl bg-slate-50 px-3 py-2">
            <div class="text-sm font-semibold text-slate-950">알림 quick entry는 어디서 확인하나?</div>
            <div class="mt-1 text-sm text-slate-600">설정 화면에서 알림 권한 상태를 먼저 확인하고, 이후 Android Chrome inline reply 주경로를 붙입니다.</div>
          </div>
        </div>
      </div>

      <div class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="text-sm font-semibold text-slate-950">문의</div>
        <div class="mt-2 text-sm text-slate-600">support@example.com</div>
        <div class="mt-3 flex flex-wrap gap-2">
          <AppButton kind="secondary" onClick={() => { window.location.href = 'mailto:support@example.com'; }}>
            메일 보내기
          </AppButton>
          <AppButton kind="ghost" onClick={props.onGoSettings}>
            설정으로
          </AppButton>
        </div>
      </div>
    </div>
  );
}
