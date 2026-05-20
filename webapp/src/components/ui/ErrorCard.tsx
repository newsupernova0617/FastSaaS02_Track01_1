/** @jsxImportSource hono/jsx */
export function ErrorCard(props: { message: string }) {
  return (
    <div class="surface-panel">
      <div class="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{props.message}</div>
    </div>
  );
}
