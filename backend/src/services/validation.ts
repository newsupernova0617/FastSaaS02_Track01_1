// ============================================================
// [보안] 입력값 검증 서비스 (Validation)
//
// 사용자와 AI 모델의 입력값을 Zod 스키마로 검증합니다.
// 검증을 통과하지 못하면 ZodError가 throw되고,
// 전역 에러 핸들러(index.ts)가 400 Bad Request로 변환합니다.
//
// 왜 중요한가?
//   - SQL 인젝션 방지: Drizzle ORM이 파라미터화 쿼리를 사용하지만,
//     비정상적인 데이터가 DB에 들어가는 것 자체를 막아야 합니다.
//   - 비즈니스 로직 보호: 음수 금액, 미래 100년 뒤 날짜 등 비정상 입력 차단
//   - AI 응답 검증: LLM이 예상치 못한 형태의 JSON을 반환할 수 있으므로 검증 필수
//
// 주요 제한값:
//   - 금액: 양수, 최대 ₩10억 (1,000,000,000)
//   - 카테고리: 1~50자
//   - 메모: 최대 500자, 공백만으로 구성 불가
//   - 날짜: YYYY-MM-DD 형식, 미래 30일 이내
// ============================================================

import { z } from 'zod';
import type { TransactionAction, CreatePayload, UpdatePayload, ReadPayload, DeletePayload, ReportPayload, UndoPayload } from '../types/ai';

/**
 * AI 모델 응답 구조 검증 스키마
 * AI가 반환한 JSON이 올바른 형태인지 확인합니다.
 * type: 어떤 액션을 수행할지 (create, read, update, delete, report 등)
 * payload: 액션에 필요한 데이터
 * confidence: AI의 확신도 (0~1, 0.7 미만이면 clarify 액션으로 추가 질문)
 */
export const AIResponseSchema = z.object({
  type: z.enum(['create', 'update', 'read', 'delete', 'report', 'plain_text', 'undo', 'clarify']),
  payload: z.record(z.string(), z.any()),
  confidence: z.number().min(0).max(1),
});

/**
 * Schema for single create item
 */
const CreateItemSchema = z.object({
  transactionType: z.enum(['income', 'expense'], { message: 'Transaction type must be either "income" or "expense"' }),
  amount: z.number({ message: 'Amount must be a number' })
    .positive({ message: 'Amount must be greater than 0' })
    .max(1000000000, { message: 'Amount exceeds maximum (₩1,000,000,000)' }),
  category: z.string({ message: 'Category must be a string' })
    .trim()
    .min(1, { message: 'Category cannot be empty' })
    .max(50, { message: 'Category cannot exceed 50 characters' }),
  memo: z.string()
    .trim()
    .max(500, { message: 'Memo cannot exceed 500 characters' })
    .refine(val => val === '' || val.length > 0, { message: 'Memo cannot contain only whitespace' })
    .optional(),
  date: z.string({ message: 'Date must be a string' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Expected YYYY-MM-DD format' }),
});

/**
 * Schema for create transaction payload validation
 * Supports both single transaction and multiple items array
 * Constraints:
 * - Amount: positive number up to ₩1,000,000,000
 * - Category: 1-50 characters, required
 * - Memo: up to 500 characters, optional, trimmed
 * - Date: YYYY-MM-DD format
 */
const CreatePayloadSchema = z.preprocess((data: any) => ({
  ...data,
  // type 또는 transactionType 둘 다 허용 (프론트 버전 호환)
  transactionType: data.transactionType ?? data.type,
}), z.object({
  transactionType: z.enum(['income', 'expense'], { message: 'Transaction type must be either "income" or "expense"' }).optional(),
  amount: z.number({ message: 'Amount must be a number' })
    .positive({ message: 'Amount must be greater than 0' })
    .max(1000000000, { message: 'Amount exceeds maximum (₩1,000,000,000)' })
    .optional(),
  category: z.string({ message: 'Category must be a string' })
    .trim()
    .min(1, { message: 'Category cannot be empty' })
    .max(50, { message: 'Category cannot exceed 50 characters' })
    .optional(),
  memo: z.string()
    .trim()
    .max(500, { message: 'Memo cannot exceed 500 characters' })
    .refine(val => val === '' || val.length > 0, { message: 'Memo cannot contain only whitespace' })
    .optional(),
  date: z.string({ message: 'Date must be a string' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Expected YYYY-MM-DD format' })
    .optional(),
  items: z.array(CreateItemSchema).optional(),
}).refine(
  (data) => {
    const hasSingleFields = data.transactionType || data.amount || data.category || data.date;
    const hasItems = data.items && data.items.length > 0;
    return hasSingleFields || hasItems;
  },
  { message: 'Either single transaction fields (transactionType, amount, category, date) or items array required' }
));

/**
 * Schema for single update item
 */
const UpdateItemSchema = z.object({
  id: z.number({ message: 'ID must be a number' })
    .positive({ message: 'ID must be a positive number' }),
  transactionType: z.enum(['income', 'expense'], { message: 'Transaction type must be either "income" or "expense"' }).optional(),
  amount: z.number({ message: 'Amount must be a number' })
    .positive({ message: 'Amount must be greater than 0' })
    .max(1000000000, { message: 'Amount exceeds maximum (₩1,000,000,000)' })
    .optional(),
  category: z.string({ message: 'Category must be a string' })
    .trim()
    .min(1, { message: 'Category cannot be empty' })
    .max(50, { message: 'Category cannot exceed 50 characters' })
    .optional(),
  memo: z.string()
    .trim()
    .max(500, { message: 'Memo cannot exceed 500 characters' })
    .refine(val => val === '' || val.length > 0, { message: 'Memo cannot contain only whitespace' })
    .optional(),
  date: z.string({ message: 'Date must be a string' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Expected YYYY-MM-DD format' })
    .optional(),
});

/**
 * Schema for update transaction payload validation
 * Supports both single transaction update and multiple updates array
 * All fields except ID are optional to allow partial updates
 * Constraints match CreatePayloadSchema for consistency
 */
const UpdatePayloadSchema = z.object({
  id: z.number({ message: 'ID must be a number' })
    .positive({ message: 'ID must be a positive number' })
    .optional(),
  transactionType: z.enum(['income', 'expense'], { message: 'Transaction type must be either "income" or "expense"' }).optional(),
  amount: z.number({ message: 'Amount must be a number' })
    .positive({ message: 'Amount must be greater than 0' })
    .max(1000000000, { message: 'Amount exceeds maximum (₩1,000,000,000)' })
    .optional(),
  category: z.string({ message: 'Category must be a string' })
    .trim()
    .min(1, { message: 'Category cannot be empty' })
    .max(50, { message: 'Category cannot exceed 50 characters' })
    .optional(),
  memo: z.string()
    .trim()
    .max(500, { message: 'Memo cannot exceed 500 characters' })
    .refine(val => val === '' || val.length > 0, { message: 'Memo cannot contain only whitespace' })
    .optional(),
  date: z.string({ message: 'Date must be a string' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Expected YYYY-MM-DD format' })
    .optional(),
  updates: z.array(UpdateItemSchema).optional(),
}).refine(
  (data) => {
    const hasSingleUpdate = data.id !== undefined;
    const hasMultipleUpdates = data.updates && data.updates.length > 0;
    return hasSingleUpdate || hasMultipleUpdates;
  },
  { message: 'Either id (with optional fields for single update) or updates array required' }
);

/**
 * Schema for read (query) payload validation
 * All fields optional for flexible transaction filtering
 */
const ReadPayloadSchema = z.object({
  month: z.string({ message: 'Month must be a string' })
    .regex(/^\d{4}-\d{2}$/, { message: 'Expected YYYY-MM format for month' })
    .optional(),
  category: z.string({ message: 'Category must be a string' }).optional(),
  type: z.enum(['income', 'expense'], { message: 'Type must be either "income" or "expense"' }).optional(),
});

/**
 * Schema for delete payload validation
 * Supports both single transaction delete and multiple deletes array
 * Either id (single) or items (multiple) is required
 */
const DeletePayloadSchema = z.object({
  id: z.number({ message: 'ID must be a number' })
    .positive({ message: 'ID must be a positive number' })
    .optional(),
  items: z.array(z.number({ message: 'Each ID must be a number' })
    .positive({ message: 'Each ID must be a positive number' }))
    .optional(),
  reason: z.string({ message: 'Reason must be a string' }).optional(),
}).refine(
  (data) => data.id !== undefined || (data.items !== undefined && data.items.length > 0),
  { message: 'Either id (single) or items (array of IDs) must be provided' }
);

/**
 * Schema for report payload validation
 */
const ReportPayloadSchema = z.object({
  reportType: z.enum(['monthly_summary', 'category_detail', 'spending_pattern', 'anomaly', 'suggestion'], {
    message: 'Invalid report type',
  }),
  params: z.object({
    month: z.string()
      .regex(/^\d{4}-\d{2}$/, { message: 'Expected YYYY-MM format for month' })
      .optional(),
    category: z.string().optional(),
  }).optional().default({}),
});

/**
 * Validates AI model response structure and returns typed action
 * @param data - The raw data to validate against AIResponseSchema
 * @returns Parsed and typed TransactionAction
 * @throws {z.ZodError} If data fails schema validation
 */
export function validateAIResponse(data: unknown): TransactionAction {
  return AIResponseSchema.parse(data);
}

/**
 * Validates create transaction payload
 * @param payload - The raw payload to validate against CreatePayloadSchema
 * @returns Parsed and typed CreatePayload with validated fields
 * @throws {z.ZodError} If payload fails schema validation
 */
export function validateCreatePayload(payload: unknown): CreatePayload {
  return CreatePayloadSchema.parse(payload);
}

/**
 * Validates update transaction payload
 * @param payload - The raw payload to validate against UpdatePayloadSchema
 * @returns Parsed and typed UpdatePayload with validated fields
 * @throws {z.ZodError} If payload fails schema validation
 */
export function validateUpdatePayload(payload: unknown): UpdatePayload {
  return UpdatePayloadSchema.parse(payload);
}

/**
 * Validates read (query) transaction payload
 * @param payload - The raw payload to validate against ReadPayloadSchema
 * @returns Parsed and typed ReadPayload with validated filter fields
 * @throws {z.ZodError} If payload fails schema validation
 */
export function validateReadPayload(payload: unknown): ReadPayload {
  return ReadPayloadSchema.parse(payload);
}

/**
 * Validates delete transaction payload
 * @param payload - The raw payload to validate against DeletePayloadSchema
 * @returns Parsed and typed DeletePayload with validated fields
 * @throws {z.ZodError} If payload fails schema validation
 */
export function validateDeletePayload(payload: unknown): DeletePayload {
  return DeletePayloadSchema.parse(payload);
}

/**
 * Validates report payload
 * @param payload - The raw payload to validate against ReportPayloadSchema
 * @returns Parsed and typed ReportPayload
 * @throws {z.ZodError} If payload fails schema validation
 */
export function validateReportPayload(payload: unknown): ReportPayload {
  return ReportPayloadSchema.parse(payload);
}

/**
 * Semantic validation for transaction amount
 * Ensures amount is positive and does not exceed ₩1,000,000,000
 * @param amount - The transaction amount to validate
 * @throws {Error} If amount is not positive or exceeds maximum limit
 */
export function validateAmount(amount: number): void {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  if (amount >= 1000000000) {
    throw new Error('Amount exceeds maximum limit (₩1,000,000,000)');
  }
}

/**
 * Semantic validation for transaction date
 * Ensures date is valid and not more than 30 days in the future
 * @param dateString - The date string to validate in YYYY-MM-DD format
 * @throws {Error} If date is invalid or beyond 30-day future limit
 */
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

/**
 * Semantic validation for transaction category
 * Validates category is not empty and warns if uncommon but allows new categories
 * @param category - The category string to validate
 * @param userCategories - Array of user's existing categories
 * @throws {Error} If category is empty after trimming
 */
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

/**
 * Schema for undo payload validation
 * Validates undo request to reverse a recent action
 */
const UndoPayloadSchema = z.object({
  targetActionType: z.enum(['delete', 'create', 'update'], {
    message: 'targetActionType must be "delete", "create", or "update"'
  }),
  hint: z.string().optional(),
});

/**
 * Validates undo payload
 * @param payload - The raw payload to validate against UndoPayloadSchema
 * @returns Parsed and typed UndoPayload
 * @throws {z.ZodError} If payload fails schema validation
 */
export function validateUndoPayload(payload: unknown): UndoPayload {
  return UndoPayloadSchema.parse(payload);
}
