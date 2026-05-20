/** @jsxImportSource hono/jsx */
export function LoadingCard(props: { label: string }) {
  return (
    <div class="surface-panel animate-pulse">
      <div class="h-4 w-28 rounded-full bg-slate-200"></div>
      <div class="mt-4 space-y-3">
        <div class="h-14 rounded-3xl bg-slate-200"></div>
        <div class="h-14 rounded-3xl bg-slate-100"></div>
        <div class="h-24 rounded-3xl bg-slate-100"></div>
      </div>
      <p class="mt-5 text-xs font-semibold text-slate-400">{props.label}</p>
    </div>
  );
}
