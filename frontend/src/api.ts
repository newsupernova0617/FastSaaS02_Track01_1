// API 서버의 기본 주소
// 환경변수가 없으면 개발 환경(localhost:8787)으로 기본 설정
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

// JWT 토큰을 전역 변수에 저장 (AuthContext에서 로그인/로그아웃 시 업데이트)
// 이렇게 하면 모든 API 요청에 자동으로 토큰을 붙일 수 있음
let _token: string | null = null;
export const setAuthToken = (token: string | null) => { _token = token; };

// API 요청 헤더에 JWT 토큰을 Authorization 필드로 추가
function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  const headers: Record<string, string> = { ...extra };
  // 로그인된 상태면 토큰을 'Bearer <token>' 형식으로 추가
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
