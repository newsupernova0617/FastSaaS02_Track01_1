const currency = new Intl.NumberFormat('ko-KR');

export function formatWon(value: number): string {
  return `${value < 0 ? '-' : ''}${currency.format(Math.abs(value))}`;
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthValue] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthValue - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

export function dayLabel(weekday: number): string {
  return ['일', '월', '화', '수', '목', '금', '토'][weekday] ?? '';
}

export function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}
