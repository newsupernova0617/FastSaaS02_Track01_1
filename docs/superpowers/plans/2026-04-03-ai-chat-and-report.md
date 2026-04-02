# AI 채팅 프론트엔드 + 인라인 리포트 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 AI 백엔드에 ChatGPT 스타일 채팅 프론트엔드를 연결하고, 채팅 안에서 인라인 리포트(차트 포함)를 제공한다.

**Architecture:** 기존 `POST /api/ai/action` 엔드포인트를 확장하여 REPORT 타입을 추가하고, 채팅 히스토리를 DB에 영구 저장한다. 프론트엔드에 AI 탭(채팅 페이지)을 추가하고, metadata 기반으로 네비게이션 버튼/차트를 인라인 렌더링한다.

**Tech Stack:** Hono, Drizzle ORM, Turso(SQLite), Google Generative AI, Zod, React 19, React Router, Tailwind CSS, Recharts, Lucide React

---

## File Map

### Backend — New Files
- `backend/src/db/schema.ts` — Modify: add `chatMessages` table
- `backend/src/types/ai.ts` — Modify: add `ReportPayload`, `ReportAction` types, extend `ActionType`
- `backend/src/services/validation.ts` — Modify: extend `AIResponseSchema`, add `validateReportPayload`
- `backend/src/services/chat.ts` — Create: chat history CRUD service
- `backend/src/services/ai-report.ts` — Create: report analysis service (2nd AI call)
- `backend/src/services/messages.ts` — Modify: add `generateReportMessage`
- `backend/src/services/ai.ts` — Modify: update system prompt to support REPORT type
- `backend/src/routes/ai.ts` — Modify: add REPORT case, chat history endpoints, save messages

### Frontend — New Files
- `frontend/src/pages/AIPage.tsx` — Create: main chat page container
- `frontend/src/components/ai/ChatInput.tsx` — Create: message input + send button
- `frontend/src/components/ai/ChatBubble.tsx` — Create: individual message bubble
- `frontend/src/components/ai/ChatMessageList.tsx` — Create: scrollable message list
- `frontend/src/components/ai/ActionButton.tsx` — Create: navigation button
- `frontend/src/components/ai/ReportCard.tsx` — Create: summary cards for reports
- `frontend/src/components/ai/ReportChart.tsx` — Create: inline Recharts rendering

### Frontend — Modified Files
- `frontend/src/api.ts` — Modify: add `sendAIMessage`, `getChatHistory`, `clearChatHistory`
- `frontend/src/components/BottomNav.tsx` — Modify: add AI tab
- `frontend/src/App.tsx` — Modify: add `/ai` route
- `frontend/src/pages/CalendarPage.tsx` — Modify: read `?date=` query param
- `frontend/src/pages/StatsPage.tsx` — Modify: read `?month=` query param

---

## Task 1: DB Schema — Add `chatMessages` table

**Files:**
- Modify: `backend/src/db/schema.ts`

- [ ] **Step 1: Add chatMessages table to schema**

In `backend/src/db/schema.ts`, add after the `transactions` table definition:

```typescript
// AI 채팅 메시지 히스토리
export const chatMessages = sqliteTable('chat_messages', {
    id:        integer('id').primaryKey({ autoIncrement: true }),
    userId:    text('user_id').notNull().references(() => users.id),
    role:      text('role', { enum: ['user', 'assistant'] }).notNull(),
    content:   text('content').notNull(),
    metadata:  text('metadata'),  // JSON string, nullable
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
```

- [ ] **Step 2: Generate migration**

Run:
```bash
cd backend && npx drizzle-kit generate
```

Expected: A new SQL file in `backend/drizzle/` with `CREATE TABLE chat_messages`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/db/schema.ts backend/drizzle/
git commit -m "feat: add chat_messages table schema and migration"
```

---

## Task 2: Backend Types — Extend AI types for REPORT

**Files:**
- Modify: `backend/src/types/ai.ts`

- [ ] **Step 1: Add REPORT types**

Replace the full content of `backend/src/types/ai.ts` with:

```typescript
/** AI action types corresponding to CRUD operations + report */
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

/** Payload for generating a report */
export interface ReportPayload {
  reportType: 'monthly_summary' | 'category_detail' | 'spending_pattern' | 'anomaly' | 'suggestion';
  params: {
    month?: string;   // YYYY-MM
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

/** Report section types for frontend rendering */
export type ReportSectionType = 'card' | 'pie' | 'bar' | 'line' | 'alert' | 'suggestion';

export interface ReportCardItem {
  label: string;
  value: number;
  format: 'currency' | 'percent' | 'number';
  trend?: 'up' | 'down' | 'flat';
}

export interface ReportChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface ReportAlertItem {
  text: string;
  severity: 'warning' | 'info';
}

export interface ReportSuggestionItem {
  text: string;
}

export interface ReportSection {
  type: ReportSectionType;
  title: string;
  items?: ReportCardItem[] | ReportAlertItem[] | ReportSuggestionItem[];
  data?: ReportChartDataPoint[] | Record<string, unknown>[];
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/types/ai.ts
git commit -m "feat: add REPORT action type and report section types"
```

---

## Task 3: Backend Validation — Add REPORT schema

**Files:**
- Modify: `backend/src/services/validation.ts`

- [ ] **Step 1: Extend AIResponseSchema and add ReportPayloadSchema**

In `backend/src/services/validation.ts`:

1. Update the import to include `ReportPayload`:
```typescript
import type { TransactionAction, CreatePayload, UpdatePayload, ReadPayload, DeletePayload, ReportPayload } from '../types/ai';
```

2. Update `AIResponseSchema` type enum:
```typescript
export const AIResponseSchema = z.object({
  type: z.enum(['create', 'update', 'read', 'delete', 'report']),
  payload: z.record(z.string(), z.any()),
  confidence: z.number().min(0).max(1),
});
```

3. Add after `DeletePayloadSchema`:
```typescript
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
```

4. Add the validate function:
```typescript
/**
 * Validates report payload
 * @param payload - The raw payload to validate against ReportPayloadSchema
 * @returns Parsed and typed ReportPayload
 * @throws {z.ZodError} If payload fails schema validation
 */
export function validateReportPayload(payload: unknown): ReportPayload {
  return ReportPayloadSchema.parse(payload);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/validation.ts
git commit -m "feat: add REPORT validation schema"
```

---

## Task 4: Backend Service — Chat history CRUD

**Files:**
- Create: `backend/src/services/chat.ts`

- [ ] **Step 1: Create chat service**

Create `backend/src/services/chat.ts`:

```typescript
import { eq, and, desc, lt } from 'drizzle-orm';
import { chatMessages } from '../db/schema';
import type { NewChatMessage } from '../db/schema';

type DB = ReturnType<typeof import('../db/index').getDb>;

export async function saveMessage(db: DB, message: NewChatMessage) {
  const result = await db
    .insert(chatMessages)
    .values(message)
    .returning();
  return result[0];
}

export async function getChatHistory(
  db: DB,
  userId: string,
  limit: number = 50,
  beforeId?: number
) {
  const conditions = [eq(chatMessages.userId, userId)];
  if (beforeId) {
    conditions.push(lt(chatMessages.id, beforeId));
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(and(...conditions))
    .orderBy(desc(chatMessages.id))
    .limit(limit);

  // Return in chronological order (oldest first)
  return messages.reverse();
}

export async function clearChatHistory(db: DB, userId: string) {
  await db
    .delete(chatMessages)
    .where(eq(chatMessages.userId, userId));
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/chat.ts
git commit -m "feat: add chat history CRUD service"
```

---

## Task 5: Backend Service — AI report analysis

**Files:**
- Create: `backend/src/services/ai-report.ts`

- [ ] **Step 1: Create report service**

Create `backend/src/services/ai-report.ts`:

```typescript
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type { Transaction } from '../db/schema';
import type { ReportSection } from '../types/ai';

const REPORT_SYSTEM_PROMPT = `You are a financial analyst assistant. Given transaction data, generate a structured report in JSON format.

Always respond with valid JSON matching this schema:
{
  "message": "한국어 요약 텍스트",
  "sections": [
    {
      "type": "card" | "pie" | "bar" | "line" | "alert" | "suggestion",
      "title": "섹션 제목",
      "items": [...],  // for card, alert, suggestion types
      "data": [...]    // for pie, bar, line types
    }
  ]
}

Section type specifications:
- "card": items = [{ "label": "총지출", "value": 820000, "format": "currency"|"percent"|"number", "trend": "up"|"down"|"flat" }]
- "pie": data = [{ "name": "식비", "value": 230000, "color": "#FF6B6B" }]
- "bar": data = [{ "category": "식비", "lastMonth": 175000, "thisMonth": 230000 }]
- "line": data = [{ "week": "1주", "amount": 180000 }]
- "alert": items = [{ "text": "설명", "severity": "warning"|"info" }]
- "suggestion": items = [{ "text": "제안 내용" }]

Rules:
- All text in Korean
- Currency in Korean Won (₩)
- Use colors: #FF6B6B (red), #4ECDC4 (teal), #45B7D1 (blue), #96CEB4 (green), #FFEAA7 (yellow), #DDA0DD (purple), #98D8C8 (mint)
- Be specific with numbers and dates
- Provide actionable suggestions
- Only return valid JSON. No explanations.`;

export class AIReportService {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: 'models/gemma-2-9b-it' });
  }

  async generateReport(
    reportType: string,
    currentMonthTxs: Transaction[],
    previousMonthTxs: Transaction[],
    params: { month?: string; category?: string }
  ): Promise<{ message: string; sections: ReportSection[] }> {
    const month = params.month || new Date().toISOString().slice(0, 7);

    // Aggregate data for AI
    const currentSummary = this.aggregateTransactions(currentMonthTxs);
    const previousSummary = this.aggregateTransactions(previousMonthTxs);

    const contextMessage = `Report type: ${reportType}
Month: ${month}
${params.category ? `Category filter: ${params.category}` : ''}

Current month transactions (${currentMonthTxs.length} total):
${JSON.stringify(currentSummary, null, 2)}

Current month raw transactions:
${currentMonthTxs.map(t => `${t.date} ${t.type} ₩${t.amount} ${t.category} ${t.memo || ''}`).join('\n')}

Previous month transactions (${previousMonthTxs.length} total):
${JSON.stringify(previousSummary, null, 2)}

Generate a ${reportType} report with appropriate sections.`;

    try {
      const result = await this.model.generateContent([
        { text: REPORT_SYSTEM_PROMPT },
        { text: contextMessage },
      ]);

      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch || !jsonMatch[0]) {
        throw new Error('No JSON found in report response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        message: parsed.message || '리포트를 생성했습니다.',
        sections: parsed.sections || [],
      };
    } catch (error) {
      console.error('AI report generation error:', error);
      throw new Error('리포트 생성에 실패했습니다. 다시 시도해주세요.');
    }
  }

  private aggregateTransactions(txs: Transaction[]) {
    const totalExpense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

    const categoryBreakdown: Record<string, number> = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
    });

    const weeklySpending: Record<string, number> = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
      const day = new Date(t.date).getDate();
      const week = `${Math.ceil(day / 7)}주`;
      weeklySpending[week] = (weeklySpending[week] || 0) + t.amount;
    });

    return { totalExpense, totalIncome, categoryBreakdown, weeklySpending, count: txs.length };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/ai-report.ts
git commit -m "feat: add AI report analysis service"
```

---

## Task 6: Backend Service — Update AI system prompt

**Files:**
- Modify: `backend/src/services/ai.ts`

- [ ] **Step 1: Update SYSTEM_PROMPT to include report type**

In `backend/src/services/ai.ts`, replace the `SYSTEM_PROMPT` constant with:

```typescript
const SYSTEM_PROMPT = `You are a budget transaction assistant. Users write in natural language (Korean),
and you extract/modify financial transactions OR generate report requests.

Always respond with valid JSON matching this schema:
{
  "type": "create" | "update" | "read" | "delete" | "report",
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
- For REPORT: when user asks for analysis, summary, pattern, or report, use type "report"
  payload: { "reportType": "monthly_summary"|"category_detail"|"spending_pattern"|"anomaly"|"suggestion", "params": { "month": "YYYY-MM", "category": "optional" } }
  - "monthly_summary": 이번 달 전체 소비 요약/분석
  - "category_detail": 특정 카테고리 심층 분석
  - "spending_pattern": 소비 패턴/습관 분석
  - "anomaly": 이상 지출/주목할 지출
  - "suggestion": 행동 제안/절약 팁

Only return valid JSON. No explanations.`;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/ai.ts
git commit -m "feat: update AI system prompt to support REPORT type"
```

---

## Task 7: Backend Service — Update messages

**Files:**
- Modify: `backend/src/services/messages.ts`

- [ ] **Step 1: Add generateReportMessage**

In `backend/src/services/messages.ts`, add at the end (before the last empty line):

```typescript
export function generateReportMessage(reportType: string, month: string): string {
  const typeLabels: Record<string, string> = {
    monthly_summary: '월간 소비 요약',
    category_detail: '카테고리 상세 분석',
    spending_pattern: '소비 패턴 분석',
    anomaly: '이상 지출 분석',
    suggestion: '절약 제안',
  };
  const label = typeLabels[reportType] || '리포트';
  return `${month} ${label} 리포트입니다.`;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/messages.ts
git commit -m "feat: add report message generation"
```

---

## Task 8: Backend Route — Extend AI route with REPORT + chat history

**Files:**
- Modify: `backend/src/routes/ai.ts`

- [ ] **Step 1: Rewrite ai.ts to add REPORT case and chat endpoints**

Replace the full content of `backend/src/routes/ai.ts` with:

```typescript
import { Hono } from 'hono';
import { getDb, Env } from '../db/index';
import { transactions } from '../db/schema';
import type { Variables } from '../middleware/auth';
import { AIService } from '../services/ai';
import { AIReportService } from '../services/ai-report';
import {
  validateAIResponse,
  validateCreatePayload,
  validateUpdatePayload,
  validateReadPayload,
  validateDeletePayload,
  validateReportPayload,
  validateAmount,
  validateDate,
  validateCategory,
} from '../services/validation';
import * as messages from '../services/messages';
import * as chatService from '../services/chat';
import { and, eq, isNull, desc, sql } from 'drizzle-orm';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

let aiService: AIService;
let aiReportService: AIReportService;

// POST /api/ai/action
router.post('/action', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const { text } = await c.req.json();

    if (!text || typeof text !== 'string') {
      return c.json({ success: false, error: 'Text input is required' }, 400);
    }

    // Initialize services once
    if (!aiService) {
      aiService = new AIService(c.env.GEMINI_API_KEY);
    }
    if (!aiReportService) {
      aiReportService = new AIReportService(c.env.GEMINI_API_KEY);
    }

    // Save user message
    await chatService.saveMessage(db, {
      userId,
      role: 'user',
      content: text,
      metadata: null,
    });

    // Fetch user context
    const recentTransactions = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.date))
      .limit(10);

    const categoryRows = await db
      .selectDistinct({ category: transactions.category })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)));

    const userCategories = categoryRows.map((r: { category: string }) => r.category);

    // Parse user input with AI
    const action = await aiService.parseUserInput(text, recentTransactions, userCategories);

    let responseData: { success: boolean; type: string; result?: any; message: string; metadata?: any };

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
        responseData = {
          success: true,
          type: 'create',
          result: tx,
          message: messages.generateCreateMessage(tx),
          metadata: {
            actionType: 'CREATE',
            transaction: { id: tx.id, amount: tx.amount, category: tx.category, date: tx.date },
            navigation: { page: '/calendar', params: { date: tx.date } },
          },
        };
        break;
      }

      case 'update': {
        const payload = validateUpdatePayload(action.payload);
        if (!payload.id) {
          throw new Error('Transaction ID is required for update');
        }

        const existing = await db
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, payload.id), eq(transactions.userId, userId)));

        if (!existing.length) {
          return c.json({ success: false, error: 'Transaction not found' }, 404);
        }

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
        responseData = {
          success: true,
          type: 'update',
          result: tx,
          message: messages.generateUpdateMessage(tx),
          metadata: {
            actionType: 'UPDATE',
            transaction: { id: tx.id, amount: tx.amount, category: tx.category, date: tx.date },
            navigation: { page: '/calendar', params: { date: tx.date } },
          },
        };
        break;
      }

      case 'read': {
        const payload = validateReadPayload(action.payload);
        const month = payload.month || new Date().toISOString().slice(0, 7);

        const conditions: any[] = [
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          sql`${transactions.date} LIKE ${month}%`,
        ];

        if (payload.category) {
          conditions.push(eq(transactions.category, payload.category));
        }
        if (payload.type) {
          conditions.push(eq(transactions.type, payload.type));
        }

        const results = await db
          .select()
          .from(transactions)
          .where(and(...conditions))
          .orderBy(desc(transactions.date));

        const totalAmount = results.reduce((sum, t) => sum + t.amount, 0);

        responseData = {
          success: true,
          type: 'read',
          result: results,
          message: messages.generateReadMessage(results, totalAmount, payload),
          metadata: {
            actionType: 'READ',
            navigation: { page: '/stats', params: { month } },
          },
        };
        break;
      }

      case 'delete': {
        const payload = validateDeletePayload(action.payload);
        if (!payload.id) {
          throw new Error('Transaction ID is required for delete');
        }

        const existing = await db
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, payload.id), eq(transactions.userId, userId)));

        if (!existing.length) {
          return c.json({ success: false, error: 'Transaction not found' }, 404);
        }

        const tx = existing[0];

        await db
          .update(transactions)
          .set({ deletedAt: new Date().toISOString() })
          .where(eq(transactions.id, payload.id));

        responseData = {
          success: true,
          type: 'delete',
          result: { id: tx.id },
          message: messages.generateDeleteMessage(tx),
          metadata: {
            actionType: 'DELETE',
            transaction: { id: tx.id, amount: tx.amount, category: tx.category, date: tx.date },
            navigation: { page: '/calendar', params: { date: tx.date } },
          },
        };
        break;
      }

      case 'report': {
        const payload = validateReportPayload(action.payload);
        const month = payload.params.month || new Date().toISOString().slice(0, 7);

        // Get previous month string
        const [yearStr, monthStr] = month.split('-');
        const prevDate = new Date(parseInt(yearStr), parseInt(monthStr) - 2, 1);
        const prevMonth = prevDate.toISOString().slice(0, 7);

        // Fetch current month transactions
        const currentConditions: any[] = [
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          sql`${transactions.date} LIKE ${month}%`,
        ];
        if (payload.params.category) {
          currentConditions.push(eq(transactions.category, payload.params.category));
        }

        const currentMonthTxs = await db
          .select()
          .from(transactions)
          .where(and(...currentConditions))
          .orderBy(desc(transactions.date));

        // Fetch previous month transactions
        const prevConditions: any[] = [
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          sql`${transactions.date} LIKE ${prevMonth}%`,
        ];
        if (payload.params.category) {
          prevConditions.push(eq(transactions.category, payload.params.category));
        }

        const previousMonthTxs = await db
          .select()
          .from(transactions)
          .where(and(...prevConditions))
          .orderBy(desc(transactions.date));

        // Generate report via AI
        const report = await aiReportService.generateReport(
          payload.reportType,
          currentMonthTxs,
          previousMonthTxs,
          { month, category: payload.params.category }
        );

        responseData = {
          success: true,
          type: 'report',
          message: report.message,
          metadata: {
            actionType: 'REPORT',
            reportType: payload.reportType,
            sections: report.sections,
            navigation: { page: '/stats', params: { month } },
          },
        };
        break;
      }

      default:
        return c.json({ success: false, error: 'Unknown action type' }, 400);
    }

    // Save assistant message
    await chatService.saveMessage(db, {
      userId,
      role: 'assistant',
      content: responseData.message,
      metadata: responseData.metadata ? JSON.stringify(responseData.metadata) : null,
    });

    return c.json(responseData);
  } catch (error) {
    console.error('AI action error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process request';
    return c.json({ success: false, error: message }, 400);
  }
});

// GET /api/ai/chat/history
router.get('/chat/history', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');
    const limit = parseInt(c.req.query('limit') || '50');
    const beforeId = c.req.query('before') ? parseInt(c.req.query('before')!) : undefined;

    const history = await chatService.getChatHistory(db, userId, limit, beforeId);

    // Parse metadata JSON strings back to objects
    const parsed = history.map(msg => ({
      ...msg,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
    }));

    return c.json({ success: true, messages: parsed });
  } catch (error) {
    console.error('Chat history error:', error);
    return c.json({ success: false, error: 'Failed to fetch chat history' }, 500);
  }
});

// DELETE /api/ai/chat/history
router.delete('/chat/history', async (c) => {
  try {
    const db = getDb(c.env);
    const userId = c.get('userId');

    await chatService.clearChatHistory(db, userId);

    return c.json({ success: true });
  } catch (error) {
    console.error('Clear chat history error:', error);
    return c.json({ success: false, error: 'Failed to clear chat history' }, 500);
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/ai.ts
git commit -m "feat: add REPORT case and chat history endpoints to AI route"
```

---

## Task 9: Frontend API — Add chat methods

**Files:**
- Modify: `frontend/src/api.ts`

- [ ] **Step 1: Add chat-related types and API methods**

In `frontend/src/api.ts`, add the following types after `SummaryRow`:

```typescript
export type ChatMessage = {
  id: number;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: ChatMessageMetadata | null;
  createdAt: string;
};

export type ChatMessageMetadata = {
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'REPORT';
  transaction?: { id: number; amount: number; category: string; date: string };
  navigation?: { page: string; params: Record<string, string> };
  reportType?: string;
  sections?: ReportSection[];
};

export type ReportSection = {
  type: 'card' | 'pie' | 'bar' | 'line' | 'alert' | 'suggestion';
  title: string;
  items?: any[];
  data?: any[];
};
```

Then add the following methods to the `api` object:

```typescript
  sendAIMessage: (text: string): Promise<{
    success: boolean;
    type: string;
    message: string;
    metadata?: ChatMessageMetadata;
    error?: string;
  }> =>
    fetch(`${BASE}/api/ai/action`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text }),
    }).then((r) => r.json()),

  getChatHistory: (limit?: number, before?: number): Promise<{
    success: boolean;
    messages: ChatMessage[];
  }> => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (before) params.set('before', String(before));
    return fetch(`${BASE}/api/ai/chat/history?${params}`, {
      headers: authHeaders(),
    }).then((r) => r.json());
  },

  clearChatHistory: (): Promise<{ success: boolean }> =>
    fetch(`${BASE}/api/ai/chat/history`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then((r) => r.json()),
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api.ts
git commit -m "feat: add AI chat API methods to frontend client"
```

---

## Task 10: Frontend — ChatInput component

**Files:**
- Create: `frontend/src/components/ai/ChatInput.tsx`

- [ ] **Step 1: Create ChatInput**

```bash
mkdir -p frontend/src/components/ai
```

Create `frontend/src/components/ai/ChatInput.tsx`:

```tsx
import { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-white border-t border-gray-200">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="메시지를 입력하세요..."
        disabled={disabled}
        className="flex-1 px-4 py-3 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ai/ChatInput.tsx
git commit -m "feat: add ChatInput component"
```

---

## Task 11: Frontend — ActionButton component

**Files:**
- Create: `frontend/src/components/ai/ActionButton.tsx`

- [ ] **Step 1: Create ActionButton**

Create `frontend/src/components/ai/ActionButton.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { Calendar, PieChart } from 'lucide-react';
import type { ChatMessageMetadata } from '../../api';

interface ActionButtonProps {
  metadata: ChatMessageMetadata;
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Calendar }> = {
  CREATE: { label: '캘린더에서 확인', icon: Calendar },
  UPDATE: { label: '수정 내역 확인', icon: Calendar },
  DELETE: { label: '캘린더에서 확인', icon: Calendar },
  READ: { label: '통계에서 보기', icon: PieChart },
  REPORT: { label: '통계에서 보기', icon: PieChart },
};

export default function ActionButton({ metadata }: ActionButtonProps) {
  const navigate = useNavigate();

  if (!metadata.navigation) return null;

  const config = ACTION_CONFIG[metadata.actionType];
  if (!config) return null;

  const Icon = config.icon;
  const { page, params } = metadata.navigation;
  const queryString = new URLSearchParams(params).toString();
  const fullPath = queryString ? `${page}?${queryString}` : page;

  return (
    <button
      onClick={() => navigate(fullPath)}
      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full hover:bg-blue-100 active:scale-95 transition-all"
    >
      <Icon size={14} />
      {config.label}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ai/ActionButton.tsx
git commit -m "feat: add ActionButton navigation component"
```

---

## Task 12: Frontend — ReportCard component

**Files:**
- Create: `frontend/src/components/ai/ReportCard.tsx`

- [ ] **Step 1: Create ReportCard**

Create `frontend/src/components/ai/ReportCard.tsx`:

```tsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CardItem {
  label: string;
  value: number;
  format: 'currency' | 'percent' | 'number';
  trend?: 'up' | 'down' | 'flat';
}

interface AlertItem {
  text: string;
  severity: 'warning' | 'info';
}

interface SuggestionItem {
  text: string;
}

interface ReportCardProps {
  section: {
    type: 'card' | 'alert' | 'suggestion';
    title: string;
    items?: (CardItem | AlertItem | SuggestionItem)[];
  };
}

function formatValue(value: number, format: string): string {
  if (format === 'currency') return `₩${value.toLocaleString('ko-KR')}`;
  if (format === 'percent') return `${value}%`;
  return value.toLocaleString('ko-KR');
}

function TrendIcon({ trend }: { trend?: string }) {
  if (trend === 'up') return <TrendingUp size={14} className="text-red-500" />;
  if (trend === 'down') return <TrendingDown size={14} className="text-green-500" />;
  if (trend === 'flat') return <Minus size={14} className="text-gray-400" />;
  return null;
}

export default function ReportCard({ section }: ReportCardProps) {
  if (!section.items || section.items.length === 0) return null;

  if (section.type === 'card') {
    const items = section.items as CardItem[];
    return (
      <div className="mt-2">
        <div className="text-xs font-semibold text-gray-500 mb-1.5">{section.title}</div>
        <div className="grid grid-cols-2 gap-2">
          {items.map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <div className="text-[11px] text-gray-400 mb-0.5">{item.label}</div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-gray-800">
                  {formatValue(item.value, item.format)}
                </span>
                <TrendIcon trend={item.trend} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.type === 'alert') {
    const items = section.items as AlertItem[];
    return (
      <div className="mt-2">
        <div className="text-xs font-semibold text-gray-500 mb-1.5">{section.title}</div>
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div
              key={i}
              className={`rounded-xl px-3 py-2 text-xs ${
                item.severity === 'warning'
                  ? 'bg-yellow-50 text-yellow-800'
                  : 'bg-blue-50 text-blue-800'
              }`}
            >
              {item.text}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.type === 'suggestion') {
    const items = section.items as SuggestionItem[];
    return (
      <div className="mt-2">
        <div className="text-xs font-semibold text-gray-500 mb-1.5">{section.title}</div>
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ai/ReportCard.tsx
git commit -m "feat: add ReportCard component for summary/alert/suggestion sections"
```

---

## Task 13: Frontend — ReportChart component

**Files:**
- Create: `frontend/src/components/ai/ReportChart.tsx`

- [ ] **Step 1: Create ReportChart**

Create `frontend/src/components/ai/ReportChart.tsx`:

```tsx
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';

const DEFAULT_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

interface ReportChartProps {
  section: {
    type: 'pie' | 'bar' | 'line';
    title: string;
    data?: any[];
  };
}

export default function ReportChart({ section }: ReportChartProps) {
  if (!section.data || section.data.length === 0) return null;

  return (
    <div className="mt-2">
      <div className="text-xs font-semibold text-gray-500 mb-2">{section.title}</div>
      <div className="bg-gray-50 rounded-xl p-3">
        {section.type === 'pie' && (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={section.data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {section.data.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₩${value.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {section.type === 'bar' && (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={section.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                <Tooltip formatter={(value: number) => `₩${value.toLocaleString()}`} />
                <Bar dataKey="lastMonth" name="지난달" fill="#D1D5DB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="thisMonth" name="이번달" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {section.type === 'line' && (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={section.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                <Tooltip formatter={(value: number) => `₩${value.toLocaleString()}`} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ai/ReportChart.tsx
git commit -m "feat: add ReportChart component with pie/bar/line chart support"
```

---

## Task 14: Frontend — ChatBubble component

**Files:**
- Create: `frontend/src/components/ai/ChatBubble.tsx`

- [ ] **Step 1: Create ChatBubble**

Create `frontend/src/components/ai/ChatBubble.tsx`:

```tsx
import type { ChatMessage } from '../../api';
import ActionButton from './ActionButton';
import ReportCard from './ReportCard';
import ReportChart from './ReportChart';

interface ChatBubbleProps {
  message: ChatMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const meta = message.metadata;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-md'
            : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Report sections */}
        {meta?.sections?.map((section: any, i: number) => {
          if (['card', 'alert', 'suggestion'].includes(section.type)) {
            return <ReportCard key={i} section={section} />;
          }
          if (['pie', 'bar', 'line'].includes(section.type)) {
            return <ReportChart key={i} section={section} />;
          }
          return null;
        })}

        {/* Navigation button */}
        {meta?.navigation && <ActionButton metadata={meta} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ai/ChatBubble.tsx
git commit -m "feat: add ChatBubble component with report/action rendering"
```

---

## Task 15: Frontend — ChatMessageList component

**Files:**
- Create: `frontend/src/components/ai/ChatMessageList.tsx`

- [ ] **Step 1: Create ChatMessageList**

Create `frontend/src/components/ai/ChatMessageList.tsx`:

```tsx
import { useRef, useEffect } from 'react';
import type { ChatMessage } from '../../api';
import ChatBubble from './ChatBubble';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export default function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 px-8">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-sm font-medium mb-2">안녕하세요! 가계부 AI 어시스턴트입니다.</p>
          <p className="text-xs">지출 기록, 수정, 삭제는 물론 소비 분석까지 도와드려요.</p>
          <div className="mt-4 space-y-1 text-xs text-gray-300">
            <p>"오늘 점심 8000원 썼어"</p>
            <p>"이번 달 식비 얼마?"</p>
            <p>"이번 달 소비 분석해줘"</p>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <ChatBubble key={msg.id} message={msg} />
      ))}

      {isLoading && (
        <div className="flex justify-start mb-3">
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ai/ChatMessageList.tsx
git commit -m "feat: add ChatMessageList component with auto-scroll and typing indicator"
```

---

## Task 16: Frontend — AIPage

**Files:**
- Create: `frontend/src/pages/AIPage.tsx`

- [ ] **Step 1: Create AIPage**

Create `frontend/src/pages/AIPage.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../api';
import type { ChatMessage } from '../api';
import ChatMessageList from '../components/ai/ChatMessageList';
import ChatInput from '../components/ai/ChatInput';

export default function AIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load chat history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await api.getChatHistory(50);
      if (res.success) {
        setMessages(res.messages);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSend = async (text: string) => {
    // Optimistic: add user message immediately
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      userId: '',
      role: 'user',
      content: text,
      metadata: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await api.sendAIMessage(text);
      if (res.success) {
        const assistantMsg: ChatMessage = {
          id: Date.now() + 1,
          userId: '',
          role: 'assistant',
          content: res.message,
          metadata: res.metadata || null,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: Date.now() + 1,
          userId: '',
          role: 'assistant',
          content: res.error || '죄송합니다. 잠시 후 다시 시도해주세요.',
          metadata: null,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        userId: '',
        role: 'assistant',
        content: '네트워크 오류가 발생했습니다. 다시 시도해주세요.',
        metadata: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('대화 기록을 모두 삭제하시겠습니까?')) return;
    try {
      await api.clearChatHistory();
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400 text-sm">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-8 pb-3">
        <h1 className="text-xl font-bold text-gray-800">AI 어시스턴트</h1>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="p-2 text-gray-400 hover:text-red-500 active:scale-90 transition-all"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <ChatMessageList messages={messages} isLoading={isLoading} />

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/AIPage.tsx
git commit -m "feat: add AIPage with chat interface"
```

---

## Task 17: Frontend — Update BottomNav, App.tsx, and routing

**Files:**
- Modify: `frontend/src/components/BottomNav.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add AI tab to BottomNav**

In `frontend/src/components/BottomNav.tsx`:

1. Update the import line:
```typescript
import { CreditCard, Calendar, PieChart, MessageCircle } from 'lucide-react';
```

2. Add the AI item to the `navItems` array:
```typescript
    const navItems = [
        { path: '/record', label: '기록', icon: CreditCard },
        { path: '/calendar', label: '달력', icon: Calendar },
        { path: '/stats', label: '통계', icon: PieChart },
        { path: '/ai', label: 'AI', icon: MessageCircle },
    ];
```

- [ ] **Step 2: Add /ai route to App.tsx**

In `frontend/src/App.tsx`:

1. Add the import:
```typescript
import AIPage from './pages/AIPage';
```

2. Add the route after the `/stats` route:
```tsx
            <Route path="/ai" element={<ProtectedRoute><AIPage /></ProtectedRoute>} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/BottomNav.tsx frontend/src/App.tsx
git commit -m "feat: add AI tab to navigation and /ai route"
```

---

## Task 18: Frontend — Update CalendarPage and StatsPage to read query params

**Files:**
- Modify: `frontend/src/pages/CalendarPage.tsx`
- Modify: `frontend/src/pages/StatsPage.tsx`

- [ ] **Step 1: Update CalendarPage to read ?date= param**

In `frontend/src/pages/CalendarPage.tsx`:

1. Update the import:
```typescript
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
```

2. Inside the component, after `const [selectedDate, setSelectedDate] = useState(...)`:
Add `useSearchParams` and an effect to read the query param:
```typescript
    const [searchParams] = useSearchParams();

    // Sync from query param on mount
    useEffect(() => {
        const dateParam = searchParams.get('date');
        if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
            setSelectedDate(dateParam);
            // Navigate calendar to that month
            const [y, m] = dateParam.split('-').map(Number);
            setCurrentDate(new Date(y, m - 1, 1));
        }
    }, [searchParams]);
```

- [ ] **Step 2: Update StatsPage to read ?month= param**

In `frontend/src/pages/StatsPage.tsx`:

1. Update the import:
```typescript
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
```

2. Inside the component, after `const [currentDate, setCurrentDate] = useState(new Date())`:
```typescript
    const [searchParams] = useSearchParams();

    // Sync from query param on mount
    useEffect(() => {
        const monthParam = searchParams.get('month');
        if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
            const [y, m] = monthParam.split('-').map(Number);
            setCurrentDate(new Date(y, m - 1, 1));
        }
    }, [searchParams]);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/CalendarPage.tsx frontend/src/pages/StatsPage.tsx
git commit -m "feat: add query param navigation support to CalendarPage and StatsPage"
```

---

## Task 19: Smoke Test — Verify build and basic functionality

- [ ] **Step 1: Verify backend TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Verify frontend builds**

Run:
```bash
cd frontend && npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 3: Fix any compilation errors**

If there are errors, fix them and re-run the build commands.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build errors"
```

---

## Task 20: Run migration on database

- [ ] **Step 1: Push migration to Turso**

Run:
```bash
cd backend && npx drizzle-kit push
```

Expected: `chat_messages` table created in Turso.

Note: This requires valid `TURSO_DB_URL` and `TURSO_AUTH_TOKEN` in `.dev.vars` or environment variables.

- [ ] **Step 2: Commit**

No files to commit — migration is already tracked from Task 1.
