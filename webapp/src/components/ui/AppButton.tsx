/** @jsxImportSource hono/jsx */
export function AppButton(props: {
  kind?: 'primary' | 'secondary' | 'ghost';
  type?: 'button' | 'submit';
  onClick?: (event: MouseEvent) => void;
  disabled?: boolean;
  class?: string;
  children: unknown;
}) {
  const kindClass =
    props.kind === 'secondary'
      ? 'app-btn app-btn-secondary'
      : props.kind === 'ghost'
        ? 'app-btn app-btn-ghost'
        : 'app-btn app-btn-primary';

  return (
    <button type={props.type ?? 'button'} onClick={props.onClick} disabled={props.disabled} class={`${kindClass} ${props.class ?? ''}`.trim()}>
      {props.children}
    </button>
  );
}
