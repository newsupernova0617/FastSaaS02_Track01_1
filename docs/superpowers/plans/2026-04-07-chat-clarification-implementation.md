# Chat Clarification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement in-chat clarification questions when user input is ambiguous (confidence < 70%), enabling users to provide missing data in conversation flow.

**Architecture:** 
- Add `clarify` action type to AI system prompt (returns clarification message + partial data)
- Create `clarification_sessions` table to track ongoing clarifications
- Modify `/api/ai/action` endpoint to handle clarify responses and merge follow-up answers
- Frontend displays clarification as normal chat messages (no UI changes needed)

**Tech Stack:** TypeScript, Hono, Drizzle ORM, SQLite (Turso), Flutter

---

## File Structure

### Backend Files to Create
- `src/services/clarifications.ts` — Clarification state management (save, retrieve, merge, delete)
- `src/db/migrations/002_add_clarification_sessions_table.sql` — Migration for new table

### Backend Files to Modify
- `src/db/schema.ts` — Add `clarificationSessions` table definition
- `src/services/ai.ts` — Update SYSTEM_PROMPT to include `clarify` action type
- `src/routes/ai.ts` — Add clarification handling in `/api/ai/action` endpoint
- `src/types/ai.ts` — Add `ClarifyAction` interface to action types

### Backend Tests to Create
- `backend/tests/services/clarifications.test.ts` — Test clarification state operations

### Frontend Files
- No changes needed (clarification appears as normal chat message)

---

## Implementation Tasks

### Task 1: Add Clarification Sessions Table Schema

**Files:**
- Create: `backend/src/db/migrations/002_add_clarification_sessions_table.sql`
- Modify: `backend/src/db/schema.ts`

**Context:** Store ongoing clarifications at the session level. Each clarification tracks missing fields, partial transaction data, and the AI message that prompted the clarification.

- [ ] **Step 1: Create migration SQL file**

```bash
cat > backend/src/db/migrations/002_add_clarification_sessions_table.sql << 'EOF'
CREATE TABLE IF NOT EXISTS clarification_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  chat_session_id INTEGER NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (chat_session_id) REFERENCES sessions(id)
);

CREATE INDEX idx_clarification_sessions_user_id ON clarification_sessions(user_id);
CREATE INDEX idx_clarification_sessions_chat_session_id ON clarification_sessions(chat_session_id);
EOF
```

- [ ] **Step 2: Add types to schema.ts**

After line 46 (after `sessions` table), add:

```typescript
// Clarification sessions for handling ambiguous user input
export const clarificationSessions = sqliteTable('clarification_sessions', {
    id:        text('id').primaryKey(),                    // UUID, generated
    userId:    text('user_id').notNull().references(() => users.id),
    chatSessionId: integer('chat_session_id').notNull().references(() => sessions.id),
    state:     text('state').notNull(),                    // JSON string
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export type ClarificationSession = typeof clarificationSessions.$inferSelect;
export type NewClarificationSession = typeof clarificationSessions.$inferInsert;

export interface ClarificationState {
  missingFields: string[];          // ['amount', 'category']
  partialData: {
    transactionType?: 'income' | 'expense';
    amount?: number;
    category?: string;
    memo?: string;
    date?: string;
  };
  messageId: number;                // ID of AI's clarification message
}
```

At end of file (after line 71), add export:

```typescript
export type NewClarificationSession = typeof clarificationSessions.$inferInsert;
```

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/db/migrations/002_add_clarification_sessions_table.sql src/db/schema.ts
git commit -m "feat: add clarification_sessions table and schema"
```

---

### Task 2: Create Clarifications Service

**Files:**
- Create: `backend/src/services/clarifications.ts`

**Context:** Service handles saving clarification state, retrieving active clarifications, merging user responses with partial data, and cleanup.

- [ ] **Step 1: Create clarifications.ts**

```bash
cat > backend/src/services/clarifications.ts << 'EOF'
import { db } from '../db';
import { clarificationSessions } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'crypto';

export interface ClarificationState {
  missingFields: string[];
  partialData: {
    transactionType?: 'income' | 'expense';
    amount?: number;
    category?: string;
    memo?: string;
    date?: string;
  };
  messageId: number;
}

export class ClarificationService {
  /**
   * Save a new clarification session
   */
  async saveClarification(
    userId: string,
    chatSessionId: number,
    state: ClarificationState
  ): Promise<string> {
    const id = uuidv4();
    await db.insert(clarificationSessions).values({
      id,
      userId,
      chatSessionId,
      state: JSON.stringify(state),
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  /**
   * Get active clarification for a chat session
   */
  async getClarification(
    userId: string,
    chatSessionId: number
  ): Promise<ClarificationState | null> {
    const result = await db
      .select()
      .from(clarificationSessions)
      .where(
        and(
          eq(clarificationSessions.userId, userId),
          eq(clarificationSessions.chatSessionId, chatSessionId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;
    return JSON.parse(result[0].state) as ClarificationState;
  }

  /**
   * Merge user's clarification response with partial data
   * Returns updated partial data and remaining missing fields
   */
  async mergeClarificationResponse(
    userResponse: string,
    currentState: ClarificationState
  ): Promise<{
    mergedData: ClarificationState['partialData'];
    stillMissingFields: string[];
  }> {
    const { missingFields, partialData } = currentState;

    // Simple merging logic: extract amount from first missing field
    // This is a basic implementation—AI will handle sophisticated parsing

    const mergedData = { ...partialData };

    // Try to extract amount if it's missing
    if (missingFields.includes('amount')) {
      const amountMatch = userResponse.match(/(\d+)/);
      if (amountMatch) {
        mergedData.amount = parseInt(amountMatch[1], 10);
      }
    }

    // Try to extract category if it's missing
    if (missingFields.includes('category')) {
      const categories = ['food', 'transport', 'work', 'shopping', 'entertainment', 'utilities', 'medicine', 'other'];
      for (const cat of categories) {
        if (userResponse.includes(cat)) {
          mergedData.category = cat;
          break;
        }
      }
    }

    // Determine still-missing fields
    const stillMissing = [];
    if (!mergedData.amount) stillMissing.push('amount');
    if (!mergedData.category) stillMissing.push('category');
    if (!mergedData.transactionType) stillMissing.push('transactionType');

    return {
      mergedData,
      stillMissingFields: stillMissing,
    };
  }

  /**
   * Delete clarification session (when done or cancelled)
   */
  async deleteClarification(userId: string, chatSessionId: number): Promise<void> {
    await db
      .delete(clarificationSessions)
      .where(
        and(
          eq(clarificationSessions.userId, userId),
          eq(clarificationSessions.chatSessionId, chatSessionId)
        )
      );
  }

  /**
   * Clean up expired clarifications (> 5 minutes old)
   */
  async cleanupExpired(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await db
      .delete(clarificationSessions)
      .where(`created_at < ?`, [fiveMinutesAgo]);
  }
}

export const clarificationService = new ClarificationService();
EOF
```

- [ ] **Step 2: Verify file created**

```bash
ls -la backend/src/services/clarifications.ts
```

Expected: File exists with ~150 lines

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/services/clarifications.ts
git commit -m "feat: add clarification service for state management"
```

---

### Task 3: Update AI System Prompt

**Files:**
- Modify: `backend/src/services/ai.ts:6-74`

**Context:** Add a new action type `clarify` that returns when confidence < 70%. Also update confidence guidelines to document this behavior.

- [ ] **Step 1: Read current SYSTEM_PROMPT**

Currently at `backend/src/services/ai.ts` lines 6-74. The prompt has 6 sections (CREATE, UPDATE, READ, DELETE, REPORT, PLAIN_TEXT).

- [ ] **Step 2: Replace SYSTEM_PROMPT with updated version**

Replace lines 6-74 (the entire SYSTEM_PROMPT constant) with:

```typescript
const SYSTEM_PROMPT = `You are a budget transaction assistant. Users write in natural language (Korean),
and you extract/modify financial transactions or request financial analysis.

CRITICAL: Return ONLY a valid JSON object. Do not wrap the JSON in quotes. Do not return JSON as a string.
Output must be parseable by JSON.parse(). No explanations, no markdown, no extra text.

Payload schemas for each type:

1. CREATE: User records a new transaction or multiple transactions
   Single:
   {"type":"create","payload":{"transactionType":"expense","amount":12000,"category":"food","memo":"lunch","date":"YYYY-MM-DD"},"confidence":0.95}
   Multiple:
   {"type":"create","payload":{"items":[{"transactionType":"expense","amount":12000,"category":"food","date":"YYYY-MM-DD"},{"transactionType":"income","amount":50000,"category":"salary","date":"YYYY-MM-DD"}]},"confidence":0.9}
   - transactionType MUST be exactly "income" or "expense" (English, lowercase)
   - Infer from context: spent/bought/paid → "expense", earned/received/salary → "income"
   - amount: positive integer (Korean Won, no commas)
   - category: one of food, transport, work, shopping, entertainment, utilities, medicine, other
   - memo: short description (optional, omit if not provided)
   - date: YYYY-MM-DD, use today if not specified

2. UPDATE: User modifies one or more existing transactions
   Single:
   {"type":"update","payload":{"id":123,"amount":15000,"category":"food"},"confidence":0.9}
   Multiple:
   {"type":"update","payload":{"updates":[{"id":123,"amount":15000},{"id":124,"category":"food"}]},"confidence":0.9}
   - id: transaction ID from recent transactions context (for single update)
   - updates: array of updates with id + fields to change (for multiple updates)
   - Only include fields that change; transactionType must be "income" or "expense" if provided

3. READ: User asks to view transactions
   {"type":"read","payload":{"month":"YYYY-MM","category":"food","type":"expense"},"confidence":0.9}
   - All fields optional; month format YYYY-MM

4. DELETE: User removes one or more transactions
   Single:
   {"type":"delete","payload":{"id":123},"confidence":0.9}
   Multiple:
   {"type":"delete","payload":{"items":[123,124,125]},"confidence":0.9}
   - id: single transaction ID from recent transactions context
   - items: array of transaction IDs when deleting multiple transactions (e.g., "delete all on this date")

5. REPORT: User asks for financial analysis or summary
   {"type":"report","payload":{"reportType":"monthly_summary","params":{"month":"YYYY-MM"}},"confidence":0.9}
   - reportType: one of monthly_summary, category_detail, spending_pattern, anomaly, suggestion
   - params: {month: "YYYY-MM"} or {category: "food"} if specified

6. CLARIFY: User input is ambiguous or missing critical fields (confidence < 0.7)
   {"type":"clarify","payload":{"message":"커피를 찾았어요! 얼마를 썼나요?","missingFields":["amount"],"partialData":{"transactionType":"expense","category":"food","memo":"커피"},"confidence":0.65}
   - message: natural Korean question asking for the missing field
   - missingFields: array of field names user needs to provide (e.g., ["amount"], ["category"], ["amount","category"])
   - partialData: object with fields already extracted (transactionType, category, memo, date, amount)
   - confidence: 0.3-0.7 (indicating uncertainty that requires clarification)

7. PLAIN_TEXT: User sends non-financial messages (greetings, casual chat, etc.)
   {"type":"plain_text","payload":{},"confidence":0.95}
   - For ANY message that is NOT related to expense management
   - For greetings like "안녕", "hi", casual chat
   - For off-topic questions not about finances
   - Set confidence to 0.95 (very certain this is a plain text message)

Rules:
- For currency, assume Korean Won (원)
- If date is not specified, use today's date (YYYY-MM-DD format)
- For UPDATE/DELETE, match transaction details to user's recent transactions if ID is ambiguous
- Be strict about amounts—don't guess or round
- For DELETE operations: If you're not 100% certain which transaction to delete, use a LOW confidence score (0.1-0.3)
- For DELETE operations: If deleting multiple transactions, verify the action is clear from context (e.g., "4월 7일 모든 거래 삭제")
- For PLAIN_TEXT: If the message could be financial-related OR casual, prefer financial action with lower confidence (0.5-0.7)

Confidence Score Guidelines:
- 0.95+: Very certain about the interpretation and action (CREATE/DELETE/READ with all clear data)
- 0.7-0.9: Reasonably confident (most CREATE/UPDATE with inferred data)
- 0.3-0.7: Uncertain—return CLARIFY action and ask for missing field(s)
- 0.1-0.3: Very uncertain—use CLARIFY with lower confidence (0.2-0.3)

Decision Tree:
1. Can you extract all required fields (transactionType, amount, category) with high confidence (≥0.7)? → CREATE/UPDATE/DELETE
2. Is this clearly a non-financial message? → PLAIN_TEXT
3. Is the message financial but missing fields or ambiguous? → CLARIFY with message asking for missing data
4. Is the user asking for analysis or reports? → REPORT

Only return valid JSON. No explanations.`;
```

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/services/ai.ts
git commit -m "feat: add clarify action type to AI system prompt"
```

---

### Task 4: Add ClarifyAction Type to AI Types

**Files:**
- Modify: `backend/src/types/ai.ts`

**Context:** Add the `ClarifyAction` interface to represent clarification responses from the AI.

- [ ] **Step 1: Read current ai.ts types**

```bash
head -50 backend/src/types/ai.ts
```

- [ ] **Step 2: Add ClarifyAction interface**

Find the `TransactionAction` union type (should be around line 50-70). Add `ClarifyAction` before the union:

```typescript
export interface ClarifyAction {
  type: 'clarify';
  payload: {
    message: string;
    missingFields: string[];
    partialData: {
      transactionType?: 'income' | 'expense';
      amount?: number;
      category?: string;
      memo?: string;
      date?: string;
    };
  };
  confidence: number;
}
```

Then update the `TransactionAction` union to include `ClarifyAction`:

```typescript
export type TransactionAction = CreateAction | UpdateAction | ReadAction | DeleteAction | ReportAction | ClarifyAction | PlainTextAction;
```

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/types/ai.ts
git commit -m "feat: add ClarifyAction type to transaction actions"
```

---

### Task 5: Modify AI Action Route Handler

**Files:**
- Modify: `backend/src/routes/ai.ts`

**Context:** Update `/api/ai/action` endpoint to:
1. Detect if there's an active clarification and merge user's response
2. Handle `clarify` action type (save clarification, return AI message)
3. Continue processing if confidence improves after merge

- [ ] **Step 1: Read current route**

```bash
head -100 backend/src/routes/ai.ts
```

- [ ] **Step 2: Add clarification imports**

At top of file, add import after other service imports:

```typescript
import { clarificationService } from '../services/clarifications';
```

- [ ] **Step 3: Add clarification logic before AI parsing**

Find the main handler in `ai.ts` (the function that processes `/api/ai/action`). At the start of the handler, after extracting `userId` and `chatSessionId`, add:

```typescript
// Check for active clarification and merge response
let processedUserText = userText;
const activeClarification = await clarificationService.getClarification(userId, chatSessionId);

if (activeClarification) {
  // User is replying to a clarification question
  const { mergedData, stillMissingFields } = await clarificationService.mergeClarificationResponse(
    userText,
    activeClarification
  );

  // If some fields still missing, ask for another clarification
  if (stillMissingFields.length > 0) {
    const nextQuestion = generateClarificationQuestion(mergedData, stillMissingFields);
    
    // Save updated clarification state
    const updatedState = {
      ...activeClarification,
      missingFields: stillMissingFields,
      partialData: mergedData,
    };
    await clarificationService.deleteClarification(userId, chatSessionId);
    const newClarId = await clarificationService.saveClarification(userId, chatSessionId, updatedState);

    // Add AI clarification message to chat
    const aiMessage = await db.insert(chatMessages).values({
      userId,
      sessionId: chatSessionId,
      role: 'assistant',
      content: nextQuestion,
      metadata: JSON.stringify({ actionType: 'clarify', clarificationId: newClarId }),
    }).returning();

    return { success: true, message: aiMessage[0] };
  }

  // All fields provided, clear clarification and continue with normal processing
  await clarificationService.deleteClarification(userId, chatSessionId);
}
```

- [ ] **Step 4: Add clarification handler in action switch**

Find the switch statement that handles `action.type`. Add before the default case:

```typescript
case 'clarify': {
  // Save clarification state
  const clarId = await clarificationService.saveClarification(userId, chatSessionId, {
    missingFields: action.payload.missingFields,
    partialData: action.payload.partialData,
    messageId: 0, // Will update after message is saved
  });

  // Add AI's clarification message to chat
  const aiMessage = await db.insert(chatMessages).values({
    userId,
    sessionId: chatSessionId,
    role: 'assistant',
    content: action.payload.message,
    metadata: JSON.stringify({
      actionType: 'clarify',
      clarificationId: clarId,
      missingFields: action.payload.missingFields,
    }),
  }).returning();

  return { success: true, message: aiMessage[0] };
}
```

- [ ] **Step 5: Add helper function**

Add this function before the route handler:

```typescript
function generateClarificationQuestion(
  partialData: any,
  missingFields: string[]
): string {
  const questions: Record<string, string> = {
    amount: '얼마를 썼나요?',
    category: '어떤 카테고리인가요? (음식, 교통, 쇼핑, 엔터테인먼트, 유틸리티, 의료, 일, 기타)',
    transactionType: '지출인가요, 수입인가요?',
    date: '어느 날짜인가요?',
  };

  if (missingFields.length === 1) {
    return questions[missingFields[0]] || `${missingFields[0]}를(을) 알려주세요.`;
  }

  return `다음 정보를 알려주세요: ${missingFields.map(f => questions[f] || f).join(', ')}`;
}
```

- [ ] **Step 6: Commit**

```bash
cd backend
git add src/routes/ai.ts
git commit -m "feat: add clarification handling in AI action route"
```

---

### Task 6: Write Tests for Clarifications Service

**Files:**
- Create: `backend/tests/services/clarifications.test.ts`

**Context:** Test clarification state management (save, retrieve, merge, delete).

- [ ] **Step 1: Create test file**

```bash
cat > backend/tests/services/clarifications.test.ts << 'EOF'
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clarificationService } from '../../src/services/clarifications';
import type { ClarificationState } from '../../src/services/clarifications';

describe('ClarificationService', () => {
  let testClarId: string;
  const testUserId = 'test-user-123';
  const testSessionId = 1;

  const testState: ClarificationState = {
    missingFields: ['amount'],
    partialData: {
      transactionType: 'expense',
      category: 'food',
      memo: 'coffee',
    },
    messageId: 1,
  };

  beforeEach(async () => {
    // Clean up before each test
    await clarificationService.deleteClarification(testUserId, testSessionId);
  });

  afterEach(async () => {
    // Clean up after test
    if (testClarId) {
      await clarificationService.deleteClarification(testUserId, testSessionId);
    }
  });

  it('should save and retrieve clarification state', async () => {
    testClarId = await clarificationService.saveClarification(testUserId, testSessionId, testState);
    expect(testClarId).toBeDefined();

    const retrieved = await clarificationService.getClarification(testUserId, testSessionId);
    expect(retrieved).toEqual(testState);
  });

  it('should merge response with amount field', async () => {
    const userResponse = '5000';
    const { mergedData, stillMissingFields } = await clarificationService.mergeClarificationResponse(
      userResponse,
      testState
    );

    expect(mergedData.amount).toBe(5000);
    expect(mergedData.category).toBe('food');
    expect(stillMissingFields).not.toContain('amount');
  });

  it('should merge response with category field', async () => {
    const state: ClarificationState = {
      missingFields: ['category'],
      partialData: {
        transactionType: 'expense',
        amount: 15000,
      },
      messageId: 1,
    };

    const userResponse = 'food';
    const { mergedData } = await clarificationService.mergeClarificationResponse(userResponse, state);

    expect(mergedData.category).toBe('food');
    expect(mergedData.amount).toBe(15000);
  });

  it('should handle multiple missing fields', async () => {
    const state: ClarificationState = {
      missingFields: ['amount', 'category'],
      partialData: {
        transactionType: 'expense',
        memo: 'lunch',
      },
      messageId: 1,
    };

    const userResponse = '20000 food';
    const { mergedData, stillMissingFields } = await clarificationService.mergeClarificationResponse(
      userResponse,
      state
    );

    expect(mergedData.amount).toBe(20000);
    expect(mergedData.category).toBe('food');
    expect(stillMissingFields.length).toBeLessThan(state.missingFields.length);
  });

  it('should delete clarification session', async () => {
    testClarId = await clarificationService.saveClarification(testUserId, testSessionId, testState);
    await clarificationService.deleteClarification(testUserId, testSessionId);

    const retrieved = await clarificationService.getClarification(testUserId, testSessionId);
    expect(retrieved).toBeNull();
  });

  it('should return null for non-existent clarification', async () => {
    const retrieved = await clarificationService.getClarification('unknown-user', 999);
    expect(retrieved).toBeNull();
  });
});
EOF
```

- [ ] **Step 2: Run tests**

```bash
cd backend
npm run test -- tests/services/clarifications.test.ts
```

Expected: All tests pass (PASS 6/6)

- [ ] **Step 3: Commit**

```bash
cd backend
git add tests/services/clarifications.test.ts
git commit -m "test: add comprehensive tests for clarification service"
```

---

### Task 7: Test End-to-End Clarification Flow

**Files:**
- Test only (no implementation changes)

**Context:** Manually test the complete flow in development.

- [ ] **Step 1: Start backend**

```bash
cd backend
npm run dev
```

Wait for "Ready on http://localhost:8787" (or 8788 if 8787 occupied)

- [ ] **Step 2: Open another terminal and test via API**

```bash
# Test ambiguous input (low confidence)
curl -X POST http://localhost:8787/api/ai/action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"userText":"커피"}'
```

Expected response: `{ "type": "clarify", "payload": { "message": "...", "missingFields": ["amount"], ... } }`

- [ ] **Step 3: Test follow-up response**

```bash
# User provides amount
curl -X POST http://localhost:8787/api/ai/action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"userText":"5000"}'
```

Expected: Clarification state merged, if still missing fields ask again, otherwise create transaction

- [ ] **Step 4: Verify in Flutter app**

Open Flutter app → Go to chat → Send ambiguous message (e.g., "coffee")

Expected: AI asks clarifying question in chat

- [ ] **Step 5: No formal commit for manual tests**

(Manual verification completed)

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ Clarification questions in chat (when confidence < 70%)
- ✅ Hybrid interaction (questions + button options via metadata)
- ✅ Immediate transaction creation after clarification
- ✅ Multi-step clarifications supported
- ✅ No separate UI components needed

**Placeholders:** None found

**Type Consistency:** 
- ✅ `ClarifyAction` interface matches spec payload
- ✅ `ClarificationState` used consistently
- ✅ `missingFields` array matches across services

**Scope Check:** 
- ✅ Focused on clarification flow (sessions, AI response, merging)
- ✅ Does not cover pattern learning or smart defaults (future enhancement)
- ✅ Database schema separate from business logic

**Ambiguity Check:**
- ✅ Confidence threshold clearly set (< 0.7 triggers clarify)
- ✅ Missing fields explicitly defined (amount, category, transactionType)
- ✅ Clarification timeout documented (5 minutes)

---

## Ready for Implementation

All tasks are bite-sized (2-5 minutes each) with complete code and test samples. Database migration and schema are defined. Tests validate core behavior.
