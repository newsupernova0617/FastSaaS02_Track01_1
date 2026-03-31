import { z } from 'zod';
import type { TransactionAction, CreatePayload, UpdatePayload, ReadPayload, DeletePayload } from '../types/ai';

// Schema for AI model response
export const AIResponseSchema = z.object({
  type: z.enum(['create', 'update', 'read', 'delete']),
  payload: z.record(z.any()),
  confidence: z.number().min(0).max(1),
});

// Action schemas
const CreatePayloadSchema = z.object({
  transactionType: z.enum(['income', 'expense']),
  amount: z.number().positive().max(1000000000),
  category: z.string().min(1).max(50),
  memo: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const UpdatePayloadSchema = z.object({
  id: z.number().positive(),
  transactionType: z.enum(['income', 'expense']).optional(),
  amount: z.number().positive().max(1000000000).optional(),
  category: z.string().min(1).max(50).optional(),
  memo: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const ReadPayloadSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  category: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
});

const DeletePayloadSchema = z.object({
  id: z.number().positive(),
  reason: z.string().optional(),
});

// Validate AI model response format
export function validateAIResponse(data: unknown): TransactionAction {
  return AIResponseSchema.parse(data);
}

// Validate action payloads
export function validateCreatePayload(payload: unknown): CreatePayload {
  return CreatePayloadSchema.parse(payload);
}

export function validateUpdatePayload(payload: unknown): UpdatePayload {
  return UpdatePayloadSchema.parse(payload);
}

export function validateReadPayload(payload: unknown): ReadPayload {
  return ReadPayloadSchema.parse(payload);
}

export function validateDeletePayload(payload: unknown): DeletePayload {
  return DeletePayloadSchema.parse(payload);
}

// Semantic validation functions
export function validateAmount(amount: number): void {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  if (amount >= 1000000000) {
    throw new Error('Amount exceeds maximum limit (₩1,000,000,000)');
  }
}

export function validateDate(dateString: string): void {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }
  // Don't allow future dates beyond reasonable limit (30 days)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 30);
  if (date > tomorrow) {
    throw new Error('Date cannot be more than 30 days in the future');
  }
}

export function validateCategory(category: string, userCategories: string[]): void {
  if (!category || category.trim() === '') {
    throw new Error('Category cannot be empty');
  }
  // Warn if category is not in user's history, but allow it
  const validCategories = [
    'food', 'transport', 'work', 'shopping', 'entertainment',
    'utilities', 'medicine', 'other', ...userCategories
  ];
  if (!validCategories.includes(category.toLowerCase())) {
    // Don't throw, just log — allow new categories
    console.warn(`Uncommon category: ${category}`);
  }
}
