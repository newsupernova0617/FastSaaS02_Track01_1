# AI Budget Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement backend API for AI-powered transaction management, allowing users to create/read/update/delete budget transactions via natural language chat.

**Architecture:** Backend-mediated AI where the server coordinates Gemma API calls, validates responses, executes database operations, and returns typed results. All transaction operations remain scoped to authenticated user via existing auth middleware.

**Tech Stack:** Hono on Cloudflare Workers (server), Drizzle ORM (database), Turso (SQLite-compatible), Google Gemma model (via Google AI Studio), Zod (validation), Cloudflare Pages (frontend)

**Deployment:** Backend runs on Cloudflare Workers with access to Turso database. Frontend runs on Cloudflare Pages. Both use environment variables for API keys and secrets.

---

## Task 1: Update Database Schema

**Files:**
- Modify: `backend/src/db/schema.ts`

**Context:** Add soft-delete support by adding `deletedAt` field to track deleted transactions.

- [ ] **Step 1: Open schema file and add `deletedAt` field**

Edit `backend/src/db/schema.ts`. Add this field to the transactions table:

```typescript
export const transactions = sqliteTable('transactions', {
    id:        integer('id').primaryKey({ autoIncrement: true }),
    userId:    text('user_id').notNull().references(() => users.id),
    type:      text('type', { enum: ['income', 'expense'] }).notNull(),
    amount:    integer('amount').notNull(),
    category:  text('category').notNull(),
    memo:      text('memo'),
    date:      text('date').notNull(),
    deletedAt: text('deleted_at'),  // NEW FIELD - null = active, timestamp = deleted
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});
```

- [ ] **Step 2: Commit schema change**

```bash
git add backend/src/db/schema.ts
git commit -m "feat: add deletedAt field to transactions for soft delete support"
```

---

## Task 2: Create Type Definitions for AI Actions

**Files:**
- Create: `backend/src/types/ai.ts`

**Context:** Define TypeScript types for AI action schemas to ensure type safety throughout the system.

- [ ] **Step 1: Create AI types file**

Create `backend/src/types/ai.ts`:

```typescript
// AI Action types
export type ActionType = 'create' | 'update' | 'read' | 'delete';

export interface TransactionAction {
  type: ActionType;
  payload: CreatePayload | UpdatePayload | ReadPayload | DeletePayload;
  confidence: number;
}

export interface CreatePayload {
  transactionType: 'income' | 'expense';
  amount: number;
  category: string;
  memo?: string;
  date: string;  // YYYY-MM-DD
}

export interface UpdatePayload {
  id: number;
  transactionType?: 'income' | 'expense';
  amount?: number;
  category?: string;
  memo?: string;
  date?: string;
}

export interface ReadPayload {
  month?: string;  // YYYY-MM
  category?: string;
  type?: 'income' | 'expense';
}

export interface DeletePayload {
  id: number;
  reason?: string;
}

// Response types
export interface AIActionResponse {
  success: boolean;
  type?: ActionType;
  result?: any;
  message?: string;
  error?: string;
}
```

- [ ] **Step 2: Commit type definitions**

```bash
git add backend/src/types/ai.ts
git commit -m "feat: add AI action type definitions"
```

---

## Task 3: Create Validation Schemas with Zod

**Files:**
- Create: `backend/src/services/validation.ts`

**Context:** Define Zod schemas for parsing and validating AI model API responses and enforce semantic rules.

- [ ] **Step 1: Create validation service file**

Create `backend/src/services/validation.ts`:

```typescript
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
  amount: z.number().positive().max(1000000000),  // Reasonable upper bound
  category: z.string().min(1).max(50),
  memo: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // YYYY-MM-DD
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
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),  // YYYY-MM
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
```

- [ ] **Step 2: Commit validation schemas**

```bash
git add backend/src/services/validation.ts
git commit -m "feat: add Zod validation schemas for AI actions"
```

---

## Task 4: Create Message Generation Service

**Files:**
- Create: `backend/src/services/messages.ts`

**Context:** Generate user-friendly Korean messages for each action type.

- [ ] **Step 1: Create message generation service**

Create `backend/src/services/messages.ts`:

```typescript
import type { Transaction } from '../db/schema';
import type { ReadPayload } from '../types/ai';

export function formatAmount(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

export function formatType(type: 'income' | 'expense'): string {
  return type === 'income' ? '수입' : '지출';
}

export function generateCreateMessage(tx: Transaction): string {
  return `${formatType(tx.type)} ${formatAmount(tx.amount)} ${tx.memo || tx.category}로 ${tx.date}에 저장되었습니다`;
}

export function generateUpdateMessage(tx: Transaction): string {
  return `거래가 수정되었습니다. ${formatType(tx.type)} ${formatAmount(tx.amount)} ${tx.memo || tx.category} (${tx.date})`;
}

export function generateDeleteMessage(tx: Transaction): string {
  return `${formatType(tx.type)} ${formatAmount(tx.amount)} ${tx.memo || tx.category} (${tx.date}) 삭제되었습니다. 최근 삭제된 항목에서 되돌릴 수 있습니다`;
}

export function generateUndoMessage(tx: Transaction): string {
  return `${formatType(tx.type)} ${formatAmount(tx.amount)} ${tx.memo || tx.category} (${tx.date}) 복원되었습니다`;
}

export function generateReadMessage(
  transactions: Transaction[],
  totalAmount: number,
  filters: ReadPayload
): string {
  const count = transactions.length;
  const month = filters.month || new Date().toISOString().slice(0, 7);
  const category = filters.category ? ` ${filters.category}` : '';

  return `${month}월${category} 거래 ${count}건 조회됨 (총 ${formatAmount(totalAmount)})`;
}

export function generateErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error occurred. Please try again.';
}
```

- [ ] **Step 2: Commit message service**

```bash
git add backend/src/services/messages.ts
git commit -m "feat: add Korean message generation service"
```

---

## Task 5: Create AI Model Service

**Files:**
- Create: `backend/src/services/ai.ts`

**Context:** Handle Google AI (Gemma model) API communication and action coordination.

- [ ] **Step 1: Create AI service file**

Create `backend/src/services/ai.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TransactionAction } from '../types/ai';
import type { Transaction } from '../db/schema';
import { validateAIResponse } from './validation';

const SYSTEM_PROMPT = `You are a budget transaction assistant. Users write in natural language (Korean),
and you extract/modify financial transactions.

Always respond with valid JSON matching this schema:
{
  "type": "create" | "update" | "read" | "delete",
  "payload": { ... },
  "confidence": 0.0 - 1.0
}

Rules:
- For currency, assume Korean Won (원)
- If date is not specified, use today's date (YYYY-MM-DD format)
- For UPDATE/DELETE, match transaction details to user's recent transactions if ID is ambiguous
- Be strict about amounts—don't guess or round
- Common categories: food, transport, work, shopping, entertainment, utilities, medicine, other
- For CREATE: infer type (income/expense) from context (spent → expense, earned/received → income)
- For READ: support filters like month (YYYY-MM), category, type (income/expense)

Only return valid JSON. No explanations.`;

export class AIService {
  private client: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: 'models/gemma-2-9b-it' });
  }

  async parseUserInput(
    userText: string,
    recentTransactions: Transaction[],
    userCategories: string[]
  ): Promise<TransactionAction> {
    // Build context message
    const recentTxsFormatted = recentTransactions
      .map(
        (t) =>
          `- ${t.date}: ${t.type === 'income' ? '수입' : '지출'} ₩${t.amount} (${t.category}) - ${t.memo || 'no memo'}`
      )
      .join('\n');

    const contextMessage = `User said: "${userText}"

Recent transactions (for context):
${recentTxsFormatted || '(none)'}

User's categories: ${userCategories.join(', ') || '(none)'}`;

    try {
      const result = await this.model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: contextMessage },
      ]);

      const responseText = result.response.text();

      // Try to parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return validateAIResponse(parsed);
    } catch (error) {
      console.error('AI model API error:', error);
      throw new Error('Failed to process request. Please try again.');
    }
  }
}

export function createAIService(apiKey: string): AIService {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY (Google AI Studio) environment variable is not set');
  }
  return new AIService(apiKey);
}
```

- [ ] **Step 2: Install Google Generative AI package**

```bash
cd backend
npm install @google/generative-ai
```

- [ ] **Step 3: Commit AI service**

```bash
git add backend/src/services/ai.ts backend/package.json
git commit -m "feat: add AI model service integration (Google Gemma)"
```

---

## Task 6: Create AI Action Route Handler

**Files:**
- Create: `backend/src/routes/ai.ts`

**Context:** Main endpoint that coordinates AI parsing, validation, and database operations.

- [ ] **Step 1: Create AI route file**

Create `backend/src/routes/ai.ts`:

```typescript
import { Hono } from 'hono';
import { getDb, Env } from '../db/index';
import { transactions } from '../db/schema';
import type { Variables } from '../middleware/auth';
import { AIService } from '../services/ai';
import {
  validateAIResponse,
  validateCreatePayload,
  validateUpdatePayload,
  validateReadPayload,
  validateDeletePayload,
  validateAmount,
  validateDate,
  validateCategory,
} from '../services/validation';
import * as messages from '../services/messages';
import { and, eq, isNull, desc } from 'drizzle-orm';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// Initialize AI service
let aiService: AIService;

// POST /api/ai/action
router.post('/action', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const { text } = await c.req.json();

    if (!text || typeof text !== 'string') {
      return c.json(
        { success: false, error: 'Text input is required' },
        400
      );
    }

    // Initialize AI service once
    if (!aiService) {
      aiService = new AIService(c.env.GEMINI_API_KEY);
    }

    // Fetch user context
    const recentTransactions = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.date))
      .limit(10);

    const categoryRows = await db
      .select({ category: transactions.category })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .distinct();

    const userCategories = categoryRows.map((r) => r.category);

    // Parse user input with AI
    const action = await aiService.parseUserInput(text, recentTransactions, userCategories);

    // Execute action based on type
    switch (action.type) {
      case 'create': {
        const payload = validateCreatePayload(action.payload);
        validateAmount(payload.amount);
        validateDate(payload.date);
        validateCategory(payload.category, userCategories);

        const result = await db
          .insert(transactions)
          .values({
            userId,
            type: payload.transactionType,
            amount: payload.amount,
            category: payload.category,
            memo: payload.memo || null,
            date: payload.date,
          })
          .returning();

        const tx = result[0];
        return c.json({
          success: true,
          type: 'create',
          result: tx,
          message: messages.generateCreateMessage(tx),
        });
      }

      case 'update': {
        const payload = validateUpdatePayload(action.payload);
        if (!payload.id) {
          throw new Error('Transaction ID is required for update');
        }

        // Verify ownership
        const existing = await db
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, payload.id), eq(transactions.userId, userId)));

        if (!existing.length) {
          return c.json(
            { success: false, error: 'Transaction not found' },
            404
          );
        }

        // Validate new values if provided
        if (payload.amount) validateAmount(payload.amount);
        if (payload.date) validateDate(payload.date);
        if (payload.category) validateCategory(payload.category, userCategories);

        const updateValues: any = {};
        if (payload.transactionType) updateValues.type = payload.transactionType;
        if (payload.amount) updateValues.amount = payload.amount;
        if (payload.category) updateValues.category = payload.category;
        if (payload.memo !== undefined) updateValues.memo = payload.memo || null;
        if (payload.date) updateValues.date = payload.date;

        const result = await db
          .update(transactions)
          .set(updateValues)
          .where(eq(transactions.id, payload.id))
          .returning();

        const tx = result[0];
        return c.json({
          success: true,
          type: 'update',
          result: tx,
          message: messages.generateUpdateMessage(tx),
        });
      }

      case 'read': {
        const payload = validateReadPayload(action.payload);
        const month = payload.month || new Date().toISOString().slice(0, 7);

        let query = db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              isNull(transactions.deletedAt)
            )
          );

        // Add date filter
        query = query.where((t) =>
          sql`${t.date} LIKE ${month}%`
        );

        // Add category filter if provided
        if (payload.category) {
          query = query.where(eq(transactions.category, payload.category));
        }

        // Add type filter if provided
        if (payload.type) {
          query = query.where(eq(transactions.type, payload.type));
        }

        const results = await query.orderBy(desc(transactions.date));

        const totalAmount = results.reduce((sum, t) => sum + t.amount, 0);

        return c.json({
          success: true,
          type: 'read',
          result: results,
          message: messages.generateReadMessage(results, totalAmount, payload),
        });
      }

      case 'delete': {
        const payload = validateDeletePayload(action.payload);
        if (!payload.id) {
          throw new Error('Transaction ID is required for delete');
        }

        // Verify ownership
        const existing = await db
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, payload.id), eq(transactions.userId, userId)));

        if (!existing.length) {
          return c.json(
            { success: false, error: 'Transaction not found' },
            404
          );
        }

        const tx = existing[0];

        // Soft delete
        await db
          .update(transactions)
          .set({ deletedAt: new Date().toISOString() })
          .where(eq(transactions.id, payload.id));

        return c.json({
          success: true,
          type: 'delete',
          result: { id: tx.id },
          message: messages.generateDeleteMessage(tx),
        });
      }

      default:
        return c.json(
          { success: false, error: 'Unknown action type' },
          400
        );
    }
  } catch (error) {
    console.error('AI action error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process request';
    return c.json(
      { success: false, error: message },
      400
    );
  }
});

export default router;
```

Note: Need to import `sql` from drizzle-orm. Add at the top:

```typescript
import { and, eq, isNull, desc, sql } from 'drizzle-orm';
```

- [ ] **Step 2: Commit AI route**

```bash
git add backend/src/routes/ai.ts
git commit -m "feat: add POST /api/ai/action endpoint"
```

---

## Task 7: Add Undo Endpoint to Transactions Route

**Files:**
- Modify: `backend/src/routes/transactions.ts`

**Context:** Add POST /api/transactions/:id/undo endpoint to restore soft-deleted transactions.

- [ ] **Step 1: Update transactions route with undo endpoint**

In `backend/src/routes/transactions.ts`, update the GET `/` route to exclude deleted transactions, then add the undo endpoint:

```typescript
// Update GET route to exclude deleted transactions
router.get('/', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const date = c.req.query('date');

    const rows = date
        ? await db.select().from(transactions).where(
            and(
              eq(transactions.userId, userId),
              like(transactions.date, `${date}%`),
              isNull(transactions.deletedAt)  // NEW: Exclude deleted
            )
          )
        : await db.select().from(transactions).where(
            and(
              eq(transactions.userId, userId),
              isNull(transactions.deletedAt)  // NEW: Exclude deleted
            )
          );
    return c.json(rows);
});

// Add import at top
import { isNull } from 'drizzle-orm';

// Add new endpoint
router.post('/:id/undo', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const id = Number(c.req.param('id'));

    const result = await db
        .update(transactions)
        .set({ deletedAt: null })
        .where(
            and(
                eq(transactions.id, id),
                eq(transactions.userId, userId)
            )
        )
        .returning();

    if (!result.length) {
        return c.json({ success: false, error: 'Transaction not found' }, 404);
    }

    const tx = result[0];
    const typeLabel = tx.type === 'income' ? '수입' : '지출';
    const message = `${typeLabel} ₩${tx.amount.toLocaleString('ko-KR')} ${tx.memo || tx.category} (${tx.date}) 복원되었습니다`;

    return c.json({
        success: true,
        message,
        result: tx,
    });
});
```

Also update the DELETE endpoint to soft delete:

```typescript
router.delete('/:id', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const id = Number(c.req.param('id'));

    const result = await db
        .update(transactions)
        .set({ deletedAt: new Date().toISOString() })
        .where(
            and(eq(transactions.id, id), eq(transactions.userId, userId))
        )
        .returning();

    if (!result.length) {
        return c.json({ success: false, error: 'Transaction not found' }, 404);
    }

    return c.json({ success: true });
});
```

Also update GET /summary to exclude deleted:

```typescript
router.get('/summary', async (c) => {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const month = c.req.query('month') ?? new Date().toISOString().slice(0, 7);

    const rows = await db
        .select({
            type: transactions.type,
            category: transactions.category,
            total: sql<number>`SUM(${transactions.amount})`.as('total'),
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            like(transactions.date, `${month}%`),
            isNull(transactions.deletedAt)  // NEW: Exclude deleted
          )
        )
        .groupBy(transactions.type, transactions.category);
    return c.json(rows);
});
```

- [ ] **Step 2: Commit transaction updates**

```bash
git add backend/src/routes/transactions.ts
git commit -m "feat: add soft delete support and undo endpoint to transactions"
```

---

## Task 8: Register AI Route in Main App

**Files:**
- Modify: `backend/src/index.ts`

**Context:** Wire up the new AI route.

- [ ] **Step 1: Import and register AI route**

Open `backend/src/index.ts` and add the AI router. Find where routes are registered and add:

```typescript
import aiRouter from './routes/ai';

// Then in the app setup, add:
app.route('/api/ai', aiRouter);
```

- [ ] **Step 2: Commit route registration**

```bash
git add backend/src/index.ts
git commit -m "feat: register AI action route"
```

---

## Task 9: Add Environment Variables

**Files:**
- Modify: `.env.example`

**Context:** Document required Google AI Studio API key for the AI model.

- [ ] **Step 1: Update environment configuration**

Update `.env.example` with:

```
GEMINI_API_KEY=your-google-ai-studio-api-key-here
```

Also update `backend/wrangler.toml` to include the environment variable in the Cloudflare Workers config (for local dev and secrets management):

```toml
[env.development]
vars = { GEMINI_API_KEY = "your-dev-key-here" }
```

For production, set the secret in Cloudflare dashboard:
```bash
wrangler secret put GEMINI_API_KEY
```

Note: Get your API key from https://aistudio.google.com/app/apikey for Google AI Studio (Gemma model access)

- [ ] **Step 2: Commit environment configuration**

```bash
git add .env.example backend/wrangler.toml
git commit -m "docs: add GEMINI_API_KEY to environment variables and wrangler config"
```

Note: Ensure `backend/wrangler.toml` already has the Turso database binding configured (should be done by existing setup). The `Env` type in `backend/src/db/index.ts` should include both database and GEMINI_API_KEY bindings.

---

## Task 10: Test Validation Schemas

**Files:**
- Create: `backend/tests/services/validation.test.ts`

**Context:** Unit tests for Zod schemas and semantic validation.

- [ ] **Step 1: Write validation schema tests**

Create `backend/tests/services/validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  validateAIResponse,
  validateCreatePayload,
  validateUpdatePayload,
  validateReadPayload,
  validateDeletePayload,
  validateAmount,
  validateDate,
} from '../../src/services/validation';

describe('Validation Schemas', () => {
  describe('validateAIResponse', () => {
    it('should parse valid AI model response', () => {
      const response = {
        type: 'create',
        payload: { transactionType: 'expense', amount: 5500, category: 'food', date: '2026-03-30' },
        confidence: 0.95,
      };
      const result = validateAIResponse(response);
      expect(result.type).toBe('create');
      expect(result.confidence).toBe(0.95);
    });

    it('should reject invalid type', () => {
      expect(() => {
        validateAIResponse({
          type: 'invalid',
          payload: {},
          confidence: 0.95,
        });
      }).toThrow();
    });

    it('should reject confidence outside 0-1 range', () => {
      expect(() => {
        validateAIResponse({
          type: 'create',
          payload: {},
          confidence: 1.5,
        });
      }).toThrow();
    });
  });

  describe('validateCreatePayload', () => {
    it('should parse valid create payload', () => {
      const payload = {
        transactionType: 'expense',
        amount: 5500,
        category: 'food',
        memo: 'Starbucks',
        date: '2026-03-30',
      };
      const result = validateCreatePayload(payload);
      expect(result.amount).toBe(5500);
      expect(result.category).toBe('food');
    });

    it('should reject negative amount', () => {
      expect(() => {
        validateCreatePayload({
          transactionType: 'expense',
          amount: -1000,
          category: 'food',
          date: '2026-03-30',
        });
      }).toThrow();
    });

    it('should reject invalid date format', () => {
      expect(() => {
        validateCreatePayload({
          transactionType: 'expense',
          amount: 5500,
          category: 'food',
          date: '2026/03/30',
        });
      }).toThrow();
    });
  });

  describe('validateAmount', () => {
    it('should accept positive amounts', () => {
      expect(() => validateAmount(5500)).not.toThrow();
      expect(() => validateAmount(0.01)).not.toThrow();
    });

    it('should reject zero and negative amounts', () => {
      expect(() => validateAmount(0)).toThrow();
      expect(() => validateAmount(-1000)).toThrow();
    });

    it('should reject amounts exceeding limit', () => {
      expect(() => validateAmount(20000000)).toThrow();
    });
  });

  describe('validateDate', () => {
    it('should accept valid dates', () => {
      expect(() => validateDate('2026-03-30')).not.toThrow();
      expect(() => validateDate('2026-03-31')).not.toThrow();
    });

    it('should reject invalid dates', () => {
      expect(() => validateDate('2026-13-01')).toThrow();
      expect(() => validateDate('invalid')).toThrow();
    });

    it('should reject dates too far in future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);
      const dateString = futureDate.toISOString().split('T')[0];
      expect(() => validateDate(dateString)).toThrow();
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd backend && npm test -- tests/services/validation.test.ts
```

Expected output: All tests pass ✓

- [ ] **Step 3: Commit validation tests**

```bash
git add backend/tests/services/validation.test.ts
git commit -m "test: add validation schema unit tests"
```

---

## Task 11: Test Message Generation

**Files:**
- Create: `backend/tests/services/messages.test.ts`

**Context:** Unit tests for message generation.

- [ ] **Step 1: Write message generation tests**

Create `backend/tests/services/messages.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import * as messages from '../../src/services/messages';
import type { Transaction } from '../../src/db/schema';

describe('Message Generation', () => {
  const mockTx: Transaction = {
    id: 1,
    userId: 'user-123',
    type: 'expense',
    amount: 5500,
    category: 'food',
    memo: 'Starbucks iced americano',
    date: '2026-03-30',
    deletedAt: null,
    createdAt: '2026-03-30T10:00:00',
  };

  describe('generateCreateMessage', () => {
    it('should generate formatted create message', () => {
      const msg = messages.generateCreateMessage(mockTx);
      expect(msg).toContain('지출');
      expect(msg).toContain('5,500');
      expect(msg).toContain('Starbucks');
      expect(msg).toContain('2026-03-30');
    });

    it('should use category if memo is missing', () => {
      const tx = { ...mockTx, memo: null };
      const msg = messages.generateCreateMessage(tx);
      expect(msg).toContain('food');
    });
  });

  describe('generateUpdateMessage', () => {
    it('should generate formatted update message', () => {
      const msg = messages.generateUpdateMessage(mockTx);
      expect(msg).toContain('수정');
      expect(msg).toContain('지출');
      expect(msg).toContain('5,500');
    });
  });

  describe('generateDeleteMessage', () => {
    it('should generate delete message with undo hint', () => {
      const msg = messages.generateDeleteMessage(mockTx);
      expect(msg).toContain('삭제');
      expect(msg).toContain('되돌릴');
    });
  });

  describe('generateUndoMessage', () => {
    it('should generate undo/restore message', () => {
      const msg = messages.generateUndoMessage(mockTx);
      expect(msg).toContain('복원');
    });
  });

  describe('generateReadMessage', () => {
    it('should generate summary with count and total', () => {
      const txs = [mockTx];
      const msg = messages.generateReadMessage(txs, 5500, { month: '2026-03' });
      expect(msg).toContain('2026-03월');
      expect(msg).toContain('1건');
      expect(msg).toContain('5,500');
    });

    it('should include category filter if provided', () => {
      const txs = [mockTx];
      const msg = messages.generateReadMessage(txs, 5500, { month: '2026-03', category: 'food' });
      expect(msg).toContain('food');
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd backend && npm test -- tests/services/messages.test.ts
```

Expected output: All tests pass ✓

- [ ] **Step 3: Commit message tests**

```bash
git add backend/tests/services/messages.test.ts
git commit -m "test: add message generation unit tests"
```

---

## Task 12: Integration Test for AI Action Endpoint

**Files:**
- Create: `backend/tests/routes/ai.test.ts`

**Context:** Integration tests for the complete AI action flow.

- [ ] **Step 1: Write AI endpoint integration tests**

Create `backend/tests/routes/ai.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Hono } from 'hono';
import { getDb, Env } from '../../src/db/index';
import { transactions, users } from '../../src/db/schema';
import aiRouter from '../../src/routes/ai';
import { eq } from 'drizzle-orm';

// Mock AI model API
vi.mock('../../src/services/ai', () => ({
  AIService: class {
    async parseUserInput() {
      return {
        type: 'create',
        payload: {
          transactionType: 'expense',
          amount: 5500,
          category: 'food',
          memo: 'Starbucks',
          date: '2026-03-30',
        },
        confidence: 0.95,
      };
    }
  },
  createAIService: () => new (require('../../src/services/ai').AIService)(),
}));

describe('AI Action Endpoint', () => {
  let db: any;
  let testUserId = 'test-user-123';

  beforeAll(async () => {
    // Setup test database
    // This would connect to a test SQLite instance
    // For now, we'll use the mock
  });

  it('should handle create action', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      // Mock auth middleware
      c.set('userId', testUserId);
      return next();
    });

    app.route('/api/ai', aiRouter);

    const response = await app.request(new Request('http://localhost/api/ai/action', {
      method: 'POST',
      body: JSON.stringify({
        text: '어제 스타벅스에서 아이스아메리카노 마시느라 5500원 썼어',
      }),
      headers: { 'Content-Type': 'application/json' },
    }));

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.type).toBe('create');
    expect(data.message).toContain('5,500');
  });

  it('should return error for missing text', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      c.set('userId', testUserId);
      return next();
    });

    app.route('/api/ai', aiRouter);

    const response = await app.request(new Request('http://localhost/api/ai/action', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    }));

    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('required');
  });
});
```

Note: Full integration testing with a real database connection would be more complex. This shows the pattern.

- [ ] **Step 2: Commit AI tests**

```bash
git add backend/tests/routes/ai.test.ts
git commit -m "test: add AI action endpoint integration tests"
```

---

## Task 13: Test Undo Endpoint

**Files:**
- Modify: `backend/tests/routes/transactions.test.ts` (or create new)

**Context:** Test the undo functionality.

- [ ] **Step 1: Add undo tests to transactions tests**

In `backend/tests/routes/transactions.test.ts`, add:

```typescript
describe('POST /api/transactions/:id/undo', () => {
  it('should restore a soft-deleted transaction', async () => {
    // Setup: Create and delete a transaction
    const tx = await db.insert(transactions).values({
      userId: 'test-user',
      type: 'expense',
      amount: 5500,
      category: 'food',
      date: '2026-03-30',
      deletedAt: new Date().toISOString(),
    }).returning();

    // Undo delete
    const response = await app.request(
      new Request(`http://localhost/api/transactions/${tx[0].id}/undo`, {
        method: 'POST',
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('복원');
    expect(data.result.deletedAt).toBeNull();
  });

  it('should return 404 for non-existent transaction', async () => {
    const response = await app.request(
      new Request('http://localhost/api/transactions/99999/undo', {
        method: 'POST',
      })
    );

    expect(response.status).toBe(404);
  });

  it('should prevent undo of other user\'s transactions', async () => {
    // Create transaction for user A
    const tx = await db.insert(transactions).values({
      userId: 'user-a',
      type: 'expense',
      amount: 5500,
      category: 'food',
      deletedAt: new Date().toISOString(),
      date: '2026-03-30',
    }).returning();

    // Try to undo as user B
    c.set('userId', 'user-b');
    const response = await app.request(
      new Request(`http://localhost/api/transactions/${tx[0].id}/undo`, {
        method: 'POST',
      })
    );

    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run transaction tests**

```bash
cd backend && npm test -- tests/routes/transactions.test.ts
```

Expected output: All tests pass ✓

- [ ] **Step 3: Commit undo tests**

```bash
git add backend/tests/routes/transactions.test.ts
git commit -m "test: add undo endpoint tests"
```

---

## Task 14: Verify All Tests Pass

**Context:** Run full test suite to ensure everything works together.

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && npm test
```

Expected output: All tests pass ✓

- [ ] **Step 2: Run type checking**

```bash
cd backend && npm run type-check
```

Expected output: No type errors

- [ ] **Step 3: Commit and verify no regressions**

```bash
git status
# Should show clean working tree or only expected new files
```

---

## Summary

✅ Database schema updated with soft delete
✅ Type definitions for AI actions
✅ Validation schemas (Zod + semantic)
✅ Message generation service
✅ AI model (Google Gemma) integration
✅ POST /api/ai/action endpoint
✅ POST /api/transactions/:id/undo endpoint
✅ All transaction queries filter deleted transactions
✅ Environment variables documented
✅ Comprehensive test coverage

**Total commits expected: ~15 small, focused commits**

