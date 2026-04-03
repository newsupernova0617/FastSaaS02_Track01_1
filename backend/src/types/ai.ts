/** AI action types corresponding to CRUD operations and report generation */
export type ActionType = 'create' | 'update' | 'read' | 'delete' | 'report';

/** Parsed action from AI model with confidence score */
export interface TransactionAction {
  type: ActionType;
  payload: CreatePayload | UpdatePayload | ReadPayload | DeletePayload | ReportPayload;
  /** Confidence score 0.0-1.0 (higher = more confident) */
  confidence: number;
}

/** Payload for creating a new transaction */
export interface CreatePayload {
  transactionType: 'income' | 'expense';
  amount: number;
  category: string;
  memo?: string;
  date: string;  // YYYY-MM-DD
}

/** Payload for updating an existing transaction */
export interface UpdatePayload {
  id: number;
  transactionType?: 'income' | 'expense';
  amount?: number;
  category?: string;
  memo?: string;
  date?: string;  // YYYY-MM-DD
}

/** Payload for querying transactions with optional filters */
export interface ReadPayload {
  month?: string;  // YYYY-MM
  category?: string;
  type?: 'income' | 'expense';
}

/** Payload for deleting a transaction */
export interface DeletePayload {
  id: number;
  reason?: string;
}

/** Payload for generating a financial report */
export interface ReportPayload {
  reportType: 'monthly_summary' | 'category_detail' | 'spending_pattern' | 'anomaly' | 'suggestion';
  params?: {
    month?: string;  // YYYY-MM
    category?: string;
  };
}

/** Standard response from AI action endpoint */
export interface AIActionResponse {
  success: boolean;
  type?: ActionType;
  /** Action result (type depends on action) */
  result?: any;
  message?: string;
  error?: string;
}
