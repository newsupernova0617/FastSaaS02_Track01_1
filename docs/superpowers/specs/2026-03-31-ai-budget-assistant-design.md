# AI Budget Assistant Design Specification

**Date:** 2026-03-31
**Feature:** AI-powered natural language transaction management for budget app
**Status:** Approved for implementation

---

## 1. Overview

Users can manage budget transactions (create, read, update, delete) through natural language chat. Instead of filling out forms, users type messages like "어제 스타벅스에서 아이스아메리카노 마시느라 5500원 썼어" and the AI extracts transaction details, validates them, and saves them automatically.

**Scope:**
- CREATE: Add new transactions via chat
- UPDATE: Modify existing transactions via chat
- READ: Query and summarize transactions via chat
- DELETE: Remove transactions (soft delete with undo)
- UNDO: Restore recently deleted transactions

---

## 2. Architecture

### High-Level Flow

```
Frontend (React)
    ↓
POST /api/ai/action { text: "..." }
    ↓
Backend (Hono)
    ├─ Auth middleware → Extract userId from JWT
    ├─ Fetch user context (recent transactions, categories)
    ├─ Call Google Gemini API with system prompt + context
    ├─ Parse JSON response into action object
    ├─ Validate schema (Zod)
    ├─ Validate semantics (ownership, data quality)
    ├─ Execute action (POST/PUT/GET/DELETE on transactions)
    ├─ Generate specific message in Korean
    └─ Return { success, type, result, message }
    ↓
Frontend → Display alert, update UI
```

### Security Model

- **User isolation:** Auth middleware extracts `userId` from JWT; all DB queries are scoped to this user
- **API key protection:** Gemini API key lives on backend only
- **Ownership validation:** For UPDATE/DELETE, backend verifies transaction ID belongs to authenticated user before executing
- **No implicit trust:** Backend never executes an action based on user input alone; always enforces security at DB level

---

## 3. AI Action Schema

Gemini returns JSON in this format for every request:

```json
{
  "type": "create" | "update" | "read" | "delete",
  "payload": { ... },
  "confidence": 0.0 - 1.0
}
```

### CREATE
Adds a new transaction.

```json
{
  "type": "create",
  "payload": {
    "transactionType": "expense" | "income",
    "amount": 5500,
    "category": "food",
    "memo": "Starbucks iced americano",
    "date": "2026-03-30"
  },
  "confidence": 0.95
}
```

### UPDATE
Modifies an existing transaction. Requires transaction ID (which backend provides via context).

```json
{
  "type": "update",
  "payload": {
    "id": 42,
    "transactionType": "expense",
    "amount": 6000,
    "category": "food",
    "memo": "Updated memo",
    "date": "2026-03-30"
  },
  "confidence": 0.88
}
```

### READ
Queries transactions with filters.

```json
{
  "type": "read",
  "payload": {
    "month": "2026-03",
    "category": "food"
  },
  "confidence": 0.92
}
```

### DELETE
Marks transaction as deleted (soft delete). Backend performs logical delete by setting `deletedAt` timestamp.

```json
{
  "type": "delete",
  "payload": {
    "id": 42,
    "reason": "User requested deletion"
  },
  "confidence": 0.99
}
```

---

## 4. Backend Endpoint

### POST /api/ai/action

**Request:**
```json
{
  "text": "어제 스타벅스에서 아이스아메리카노 마시느라 5500원 썼어"
}
```

**Response (Success - CREATE):**
```json
{
  "success": true,
  "type": "create",
  "result": {
    "id": 123,
    "amount": 5500,
    "category": "food",
    "memo": "Starbucks iced americano",
    "date": "2026-03-30"
  },
  "message": "지출 ₩5,500 Starbucks iced americano로 2026-03-30에 저장되었습니다"
}
```

**Response (Success - UPDATE):**
```json
{
  "success": true,
  "type": "update",
  "result": {
    "id": 42,
    "amount": 6000,
    "category": "food",
    "memo": "Updated memo",
    "date": "2026-03-30"
  },
  "message": "거래가 수정되었습니다. 지출 ₩6,000 Updated memo (2026-03-30)"
}
```

**Response (Success - READ):**
```json
{
  "success": true,
  "type": "read",
  "result": [
    { "id": 1, "amount": 5500, "category": "food", "date": "2026-03-30", "memo": "..." },
    { "id": 2, "amount": 3000, "category": "food", "date": "2026-03-29", "memo": "..." }
  ],
  "message": "2026-03월 food 거래 2건 조회됨 (총 ₩8,500)"
}
```

**Response (Success - DELETE):**
```json
{
  "success": true,
  "type": "delete",
  "result": {
    "id": 42
  },
  "message": "지출 ₩5,500 Starbucks (2026-03-30) 삭제되었습니다. 최근 삭제된 항목에서 되돌릴 수 있습니다"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Could not understand the request. Please be more specific."
}
```

---

## 5. Gemini System Prompt

```
You are a budget transaction assistant. Users write in natural language (Korean),
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

Only return valid JSON. No explanations.
```

---

## 6. User Context Sent to Gemini

Before calling Gemini, the backend constructs context:

```typescript
const recentTransactions = await db.select()
  .from(transactions)
  .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
  .orderBy(desc(transactions.date))
  .limit(10);

const usedCategories = await db.select({ category: transactions.category })
  .from(transactions)
  .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
  .groupBy(transactions.category);

const contextMessage = `
User said: "${userText}"

Recent transactions (for context):
${recentTransactions.map(t =>
  `- ${t.date}: ${t.type === 'income' ? '수입' : '지출'} ₩${t.amount} (${t.category}) - ${t.memo || 'no memo'}`
).join('\n')}

User's categories: ${usedCategories.map(u => u.category).join(', ')}
`;
```

This gives Gemini visibility into the user's transaction history and patterns, enabling smarter parsing (e.g., "delete the last Starbucks" without the user specifying the ID).

---

## 7. Database Schema Changes

### Add `deletedAt` to transactions table

```typescript
export const transactions = sqliteTable('transactions', {
    id:        integer('id').primaryKey({ autoIncrement: true }),
    userId:    text('user_id').notNull().references(() => users.id),
    type:      text('type', { enum: ['income', 'expense'] }).notNull(),
    amount:    integer('amount').notNull(),
    category:  text('category').notNull(),
    memo:      text('memo'),
    date:      text('date').notNull(),
    deletedAt: text('deleted_at'),  // null = active, timestamp = deleted
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});
```

### New UNDO Endpoint

```typescript
// POST /api/transactions/:id/undo
// Clears deletedAt field (only if transaction belongs to user)
```

---

## 8. Validation Layers

### Layer 1: Schema Validation (Zod)

```typescript
const ActionSchema = z.object({
  type: z.enum(['create', 'update', 'read', 'delete']),
  payload: z.record(z.any()),
  confidence: z.number().min(0).max(1),
});
```

Reject if Gemini response doesn't match structure.

### Layer 2: Semantic Validation

**For CREATE/UPDATE:**
- `amount > 0` and `amount < 10,000,000` (reasonable bounds)
- `category` is non-empty string
- `date` is valid YYYY-MM-DD format
- `transactionType` is 'income' or 'expense'
- `memo` length < 500 chars

**For UPDATE/DELETE:**
- Transaction ID exists
- Transaction belongs to authenticated user (join userId)

**For READ:**
- Month format is YYYY-MM or empty
- Category is in user's existing categories (or allow any)

---

## 9. Error Handling

| Scenario | Behavior |
|----------|----------|
| Gemini API timeout/error | Return `{ success: false, error: "AI service unavailable. Please try again." }` |
| Invalid JSON from Gemini | Log error, return `{ success: false, error: "Could not understand the request. Please be more specific." }` |
| Schema validation fails | Return `{ success: false, error: "Invalid response format. Try rephrasing." }` |
| Semantic validation fails | Return `{ success: false, error: "Invalid transaction data (e.g., negative amount, invalid date)." }` |
| User doesn't own transaction | Return `{ success: false, error: "Transaction not found." }` (404) |
| Database error | Return `{ success: false, error: "Failed to save. Please try again." }` (500) |

All errors are caught at the endpoint level—no unhandled exceptions.

---

## 10. Message Generation

Backend generates specific, localized messages for each action:

**CREATE:**
```
지출 ₩5,500 Starbucks iced americano로 2026-03-30에 저장되었습니다
```

**UPDATE:**
```
거래가 수정되었습니다. 지출 ₩6,000 Updated memo (2026-03-30)
```

**READ:**
```
2026-03월 food 거래 3건 조회됨 (총 ₩35,500)
```

**DELETE:**
```
지출 ₩5,500 Starbucks (2026-03-30) 삭제되었습니다. 최근 삭제된 항목에서 되돌릴 수 있습니다
```

**UNDO:**
```
지출 ₩5,500 Starbucks iced americano (2026-03-30) 복원되었습니다
```

---

## 11. Frontend Integration (Overview)

1. **Chat input component** captures user text
2. **POST /api/ai/action** sends text to backend
3. **Display alert** with returned `message`
4. **Update transaction list** if action was CREATE/UPDATE/DELETE/UNDO
5. **Show undo button** on deleted transactions (optional)

---

## 12. Testing Strategy

**Unit tests:**
- Schema validation (valid/invalid JSON)
- Semantic validation (amounts, dates, ownership)
- Message generation (format, localization)

**Integration tests:**
- Mock Gemini API
- Test all action types (CREATE, UPDATE, READ, DELETE, UNDO)
- Test error scenarios (bad transactions, unauthorized access, network failures)
- Test user isolation (User A can't modify User B's transactions)

**Manual/E2E tests:**
- Create, update, read, delete via chat
- Verify undo restores deleted transactions
- Check alert messages appear with correct details

---

## 13. Future Enhancements (Out of Scope)

- Confidence-based confirmation (low confidence → ask user to confirm before auto-posting)
- Gemini multi-turn conversation (chat history context)
- Receipt image upload (OCR-based transaction extraction)
- Batch operations ("delete all food expenses from March")
- Transaction analytics summaries via AI

---

## 14. Assumptions & Constraints

- **Language:** System assumes Korean input; can be extended to other languages
- **Currency:** Fixed to Korean Won; hardcoded in system prompt
- **Gemini availability:** Assumes Google Gemini API is always available; fallback to user manual entry
- **Transaction date:** If not specified, assumes today (no future transactions)
- **Undo history:** No permanent undo—once user clears browser cache, undo is lost (soft-deleted transactions remain in DB)

---

## 15. Success Criteria

✅ Users can describe transactions in natural language and they're saved automatically
✅ AI correctly parses amounts, categories, dates, and memo from chat text
✅ Backend validates all data before saving
✅ Security: Users can only access/modify their own transactions
✅ Soft delete with undo works
✅ All messages are clear and localized in Korean
✅ Error messages guide users to retry (no cryptic errors)
✅ System handles Gemini API failures gracefully
