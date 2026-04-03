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

/**
 * Chat message type matching backend schema
 */
export interface ChatMessage {
  id: number;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>; // JSON data for reports, actions
  createdAt: string;
}

/**
 * Chat message metadata for storing action results and chart data
 */
export interface ChatMessageMetadata {
  actionType?: 'create' | 'update' | 'read' | 'delete' | 'report';
  report?: Record<string, unknown>; // Full report object if actionType is 'report'
  action?: Record<string, unknown>; // Action details for CRUD operations
}

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

/**
 * Send a message to AI and get response
 * @param text - User message text
 * @returns Assistant response with content and metadata
 */
export async function sendAIMessage(text: string): Promise<{ success: boolean; content: string; metadata?: Record<string, unknown> }> {
  const response = await fetch(`${BASE}/api/ai/action`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ text }),
  });

  if (!response.ok) throw new Error('Failed to send AI message');
  return response.json();
}

/**
 * Retrieve chat history with pagination
 * @param limit - Max messages to retrieve (default: 50)
 * @param before - Cursor message ID (returns messages before this ID)
 * @returns Array of chat messages
 */
export async function getChatHistory(limit?: number, before?: number): Promise<ChatMessage[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', String(limit));
  if (before) params.append('before', String(before));

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${BASE}/api/ai/chat/history${query}`, {
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error('Failed to fetch chat history');
  const data = await response.json();
  return data.messages || [];
}

/**
 * Clear all chat history for the current user
 * @returns Number of messages deleted
 */
export async function clearChatHistory(): Promise<number> {
  const response = await fetch(`${BASE}/api/ai/chat/history`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error('Failed to clear chat history');
  const data = await response.json();
  return data.deletedCount || 0;
}
