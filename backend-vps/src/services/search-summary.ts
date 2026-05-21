import type { Transaction } from '../db/schema';

type ReadSummaryFilters = {
  month?: string;
  category?: string;
  type?: string;
};

export function buildSearchSummary(
  transactions: Transaction[],
  totalAmount: number,
  filters: ReadSummaryFilters,
) {
  const count = transactions.length;
  const days = count > 0
    ? new Set(transactions.map((tx) => tx.date)).size
    : 0;
  const dailyAverage = days > 0 ? Math.round(totalAmount / days) : 0;
  const breakdownMap = new Map<string, number>();

  for (const tx of transactions) {
    const label = tx.memo?.trim() || tx.category || '미분류';
    breakdownMap.set(label, (breakdownMap.get(label) ?? 0) + tx.amount);
  }

  const breakdown = [...breakdownMap.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const periodLabel = filters.month ?? '조회 기간';
  const categoryLabel = filters.category ?? '전체';
  const top = breakdown[0];
  const insight = top
    ? `${categoryLabel} 중 ${top.label} 항목이 가장 큽니다.`
    : '조건에 맞는 거래가 아직 없습니다.';

  return {
    periodLabel,
    categoryLabel,
    totalAmount,
    count,
    dailyAverage,
    breakdown,
    insight,
  };
}
