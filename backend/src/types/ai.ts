/** AI action types corresponding to CRUD operations and report generation */
export type ActionType = 'create' | 'update' | 'read' | 'delete' | 'report' | 'clarify' | 'plain_text' | 'undo';

/** Payload for plain text responses (non-financial queries) */
export interface PlainTextPayload {
  // Empty - no structured data needed for plain text
}

/** Payload for clarifying ambiguous user input */
export interface ClarifyPayload {
  message: string;
  missingFields: string[];
  partialData: {
    transactionType?: 'income' | 'expense';
    amount?: number;
    category?: string;
    memo?: string;
    date?: string;
  };
}

/** Payload for undoing a recent action */
export interface UndoPayload {
  targetActionType: 'delete' | 'create' | 'update';
  hint?: string;  // Optional detail for better error messages
}

/** Parsed action from AI model with confidence score */
export interface TransactionAction {
  type: ActionType;
  payload: CreatePayload | UpdatePayload | ReadPayload | DeletePayload | ReportPayload | ClarifyPayload | PlainTextPayload | UndoPayload;
  /** Confidence score 0.0-1.0 (higher = more confident) */
  confidence: number;
}

/** Single transaction for creating */
export interface CreateItem {
  transactionType: 'income' | 'expense';
  amount: number;
  category: string;
  memo?: string;
  date: string;  // YYYY-MM-DD
}

/** Payload for creating transaction(s) - supports single or multiple */
export interface CreatePayload {
  // Single transaction fields
  transactionType?: 'income' | 'expense';
  amount?: number;
  category?: string;
  memo?: string;
  date?: string;  // YYYY-MM-DD
  // Multiple transactions
  items?: CreateItem[];
}

/** Single transaction update */
export interface UpdateItem {
  id: number;
  transactionType?: 'income' | 'expense';
  amount?: number;
  category?: string;
  memo?: string;
  date?: string;  // YYYY-MM-DD
}

/** Payload for updating transaction(s) - supports single or multiple */
export interface UpdatePayload {
  // Single update fields
  id?: number;
  transactionType?: 'income' | 'expense';
  amount?: number;
  category?: string;
  memo?: string;
  date?: string;  // YYYY-MM-DD
  // Multiple updates
  updates?: UpdateItem[];
}

/** Payload for querying transactions with optional filters */
export interface ReadPayload {
  month?: string;  // YYYY-MM
  category?: string;
  type?: 'income' | 'expense';
}

/** Single item for deletion */
export interface DeleteItem {
  id: number;
}

/** Payload for deleting transaction(s) - supports single or multiple */
export interface DeletePayload {
  // Single delete
  id?: number;
  // Multiple deletes
  items?: number[];
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

/** Section in a financial report */
export interface ReportSection {
  type: 'card' | 'pie' | 'bar' | 'line' | 'alert' | 'suggestion';
  title: string;
  subtitle?: string;
  metric?: string;
  trend?: 'up' | 'down' | 'stable';
  data?: Record<string, any>;
}

/** Generated financial report */
export interface Report {
  reportType: ReportPayload['reportType'];
  title: string;
  subtitle?: string;
  sections: ReportSection[];
  generatedAt: string;
}
