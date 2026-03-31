import type { Transaction } from '../db/schema';
import type { ReadPayload } from '../types/ai';

export function formatAmount(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

export function formatType(type: 'income' | 'expense'): string {
  return type === 'income' ? '수입' : '지출';
}

export function generateCreateMessage(tx: Transaction): string {
  return `${formatType(tx.type)} ${formatAmount(tx.amount)} ${tx.memo || tx.category}로 ${tx.date}에 저장되었습니다`;
}

export function generateUpdateMessage(tx: Transaction): string {
  return `거래가 수정되었습니다. ${formatType(tx.type)} ${formatAmount(tx.amount)} ${tx.memo || tx.category} (${tx.date})`;
}

export function generateDeleteMessage(tx: Transaction): string {
  return `${formatType(tx.type)} ${formatAmount(tx.amount)} ${tx.memo || tx.category} (${tx.date}) 삭제되었습니다. 최근 삭제된 항목에서 되돌릴 수 있습니다`;
}

export function generateUndoMessage(tx: Transaction): string {
  return `${formatType(tx.type)} ${formatAmount(tx.amount)} ${tx.memo || tx.category} (${tx.date}) 복원되었습니다`;
}

export function generateReadMessage(
  transactions: Transaction[],
  totalAmount: number,
  filters: ReadPayload
): string {
  const count = transactions.length;
  const month = filters.month || new Date().toISOString().slice(0, 7);
  const category = filters.category ? ` ${filters.category}` : '';

  return `${month}월${category} 거래 ${count}건 조회됨 (총 ${formatAmount(totalAmount)})`;
}

export function generateErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error occurred. Please try again.';
}
