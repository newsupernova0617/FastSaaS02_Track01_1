const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

export type Transaction = {
    id: number;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    memo: string | null;
    date: string; // YYYY-MM-DD
    created_at: string;
};

export type SummaryRow = {
    type: 'income' | 'expense';
    category: string;
    total: number; // 카테고리 합계
};

export const api = {
    // 거래 목록 조회 (date 전달 시 해당 월만)
    getTransactions: (date?: string): Promise<Transaction[]> =>
        fetch(`${BASE}/api/transactions${date ? `?date=${date}` : ''}`).then((r) => r.json()),

    // 새 거래 추가
    addTransaction: (data: Omit<Transaction, 'id' | 'created_at'>): Promise<{ id: number }> =>
        fetch(`${BASE}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then((r) => r.json()),

    // 거래 삭제
    deleteTransaction: (id: number): Promise<{ success: boolean }> =>
        fetch(`${BASE}/api/transactions/${id}`, { method: 'DELETE' }).then((r) => r.json()),

    // 월별 카테고리 통계
    getSummary: (month: string): Promise<SummaryRow[]> =>
        fetch(`${BASE}/api/transactions/summary?month=${month}`).then((r) => r.json()),
};
