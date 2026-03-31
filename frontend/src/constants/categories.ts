// 지출 카테고리 목록
export const EXPENSE_CATEGORIES = ['식비', '교통', '쇼핑', '의료', '문화/여가', '월세', '기타'] as const;
// 수입 카테고리 목록
export const INCOME_CATEGORIES = ['월급', '부업', '용돈', '기타'] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
export type IncomeCategory = typeof INCOME_CATEGORIES[number];
