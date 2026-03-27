const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

// Set by AuthContext on session change
let _token: string | null = null;
export const setAuthToken = (token: string | null) => { _token = token; };

function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  const headers: Record<string, string> = { ...extra };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  return headers;
}

export type Transaction = {
  id: number;
  user_id: string;
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
  total: number;
};

export const api = {
  getTransactions: (date?: string): Promise<Transaction[]> =>
    fetch(`${BASE}/api/transactions${date ? `?date=${date}` : ''}`, {
      headers: authHeaders(),
    }).then((r) => r.json()),

  addTransaction: (data: Omit<Transaction, 'id' | 'user_id' | 'created_at'>): Promise<{ id: number }> =>
    fetch(`${BASE}/api/transactions`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  deleteTransaction: (id: number): Promise<{ success: boolean }> =>
    fetch(`${BASE}/api/transactions/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then((r) => r.json()),

  getSummary: (month: string): Promise<SummaryRow[]> =>
    fetch(`${BASE}/api/transactions/summary?month=${month}`, {
      headers: authHeaders(),
    }).then((r) => r.json()),
};
