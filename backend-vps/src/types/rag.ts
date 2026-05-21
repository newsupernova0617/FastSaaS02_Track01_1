import type { ActionType } from './ai';

// Cloudflare Vectorize API response
export interface VectorResult {
  id: string;
  score: number;
  values: number[];
  metadata?: Record<string, unknown>;
}

// Vector search request
export interface VectorSearchRequest {
  embedding: number[];
  table: string;
  limit: number;
  userId?: string; // For user-specific filtering
}

// Individual context item
export interface ContextItem {
  type: 'knowledge' | 'transaction' | 'note';
  content: string;
  source?: string; // Reference for debugging
  metadata?: Record<string, unknown>;
}

// Formatted context message for LLM
export interface FormattedContext {
  knowledge: ContextItem[];
  transactions: ContextItem[];
  notes: ContextItem[];
  formatted: string; // Pre-formatted context message
}

// Context data with source items
export interface ContextData extends FormattedContext {
  // Already includes formatted string
}

// Retrieval strategy per action type
export interface RetrievalStrategy {
  action: ActionType;
  knowledgeItems: number;
  transactionItems: number;
  noteItems: number;
  totalItems: number;
}

// Vectorize API response for embedding
export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    input_tokens: number;
  };
}
