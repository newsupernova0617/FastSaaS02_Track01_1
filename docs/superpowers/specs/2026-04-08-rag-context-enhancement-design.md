# RAG Context Enhancement Design

**Date:** 2026-04-08  
**Status:** Approved  
**Goal:** Enhance AI responses by retrieving and injecting user-specific and domain knowledge context via Retrieval-Augmented Generation (RAG) using Cloudflare Vectorize.

---

## Overview

The system augments AI responses with enriched context from three sources:
1. **Financial Knowledge Base** — Curated budgeting tips and best practices
2. **User Transaction History** — User's spending patterns and trends
3. **User Notes** — Manually created personal rules and preferences

Context is retrieved selectively based on the AI action type and injected as a separate "context" message before the LLM call.

---

## User Flow

### Example: User Asks for Analysis (READ action)

```
User: "분석해줘" (Analyze my spending)
↓
AI detects: action type = "read"
↓
ContextService retrieves 15 items:
  - Top 5 from knowledge base (budgeting tips)
  - Top 5 user transactions (spending patterns)
  - Top 5 user notes (personal rules)
↓
Inject context message:
  "User spent 40% on food, 15% on transport. User note: save 30% monthly. Tip: Track anomalies"
↓
LLM receives: [system prompt] + [context] + [user message]
↓
Response: "Based on your patterns, you can save ₩200K by reducing weekend shopping"
```

### Example: User Creates Transaction (CREATE action)

```
User: "커피 5000" (Coffee, ₩5000)
↓
AI detects: action type = "create"
↓
ContextService retrieves 3 items:
  - Top 3 from knowledge base (validation tips)
↓
Inject minimal context (just tips)
↓
Transaction created without delay
```

---

## Architecture

### Data Sources

#### 1. Financial Knowledge Base
- **Storage:** `knowledge_base` table in database
- **Vectorization:** One-time at deployment via Cloudflare Vectorize
- **Update frequency:** Static (manual updates only)
- **Content examples:**
  - "Categorize all spending to track patterns"
  - "Identify anomalies: spending > 2x average is unusual"
  - "Budget rule: Try to save 30% of income"

#### 2. User Transaction History
- **Storage:** Existing `transactions` table
- **Vectorization:** At request time (fresh embeddings)
- **Content:** User's past transactions (category, amount, date, memo)
- **Purpose:** Find similar past transactions to understand spending patterns

#### 3. User Notes
- **Storage:** New `user_notes` table
- **Vectorization:** On write (when user creates/updates note)
- **Content:** User-created personal rules ("I prefer monthly savings of ₩500K", "Avoid shopping on weekends")
- **Purpose:** Inject user's personal preferences into context

### Selective Context Retrieval Strategy

Context items retrieved per action type:

| Action Type | Items | Knowledge Base | Transactions | User Notes | Purpose |
|-------------|-------|-----------------|--------------|-----------|---------|
| CREATE | 3 | ✓ (3) | - | - | Validate transaction, provide tips |
| UPDATE | 3 | ✓ (3) | - | - | Similar to CREATE |
| DELETE | 3 | ✓ (3) | - | - | Similar to CREATE |
| CLARIFY | 5 | ✓ (2) | ✓ (2) | ✓ (1) | Disambiguate using user patterns |
| READ | 15 | ✓ (5) | ✓ (5) | ✓ (5) | Rich analysis context |
| REPORT | 15 | ✓ (5) | ✓ (5) | ✓ (5) | Rich analysis context |
| PLAIN_TEXT | 0 | - | - | - | No context needed |

**Rationale:**
- **Simple actions (CREATE/UPDATE/DELETE):** Minimal context keeps latency low
- **Disambiguation (CLARIFY):** Moderate context helps resolve ambiguity
- **Analysis (READ/REPORT):** Full context enables comprehensive insights

### Components

#### Backend Services

**1. VectorizeService** (`src/services/vectorize.ts`)
- Calls Cloudflare Vectorize API to embed text
- Methods:
  - `embedText(text: string): Promise<number[]>` — Embed user input
  - `searchVectors(embedding: number[], table: string, limit: number): Promise<VectorResult[]>` — Search vector DB
- Handles API errors gracefully (returns empty on failure)

**2. ContextService** (`src/services/context.ts`)
- Orchestrates RAG pipeline
- Methods:
  - `getContextForAction(userId: string, actionType: ActionType, userText: string): Promise<ContextData>` — Main entry point
  - Determines retrieval strategy based on action type
  - Formats context message for LLM injection
- Returns structured context object with knowledge base, transactions, and notes

**3. UserNotesService** (`src/services/user-notes.ts`)
- CRUD operations for user notes
- Methods:
  - `createNote(userId: string, content: string): Promise<UserNote>` — Create note + vectorize
  - `listNotes(userId: string): Promise<UserNote[]>` — List user's notes
  - `updateNote(id: number, content: string): Promise<UserNote>` — Update note + re-vectorize
  - `deleteNote(id: number): Promise<void>` — Delete note
- On create/update: automatically vectorizes note content and stores embedding_id

#### Database Schema

**New: user_notes table**
```sql
CREATE TABLE user_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_user_notes_user_id ON user_notes(user_id);
```

**New: knowledge_base table**
```sql
CREATE TABLE knowledge_base (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  category TEXT,
  embedding_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);
```

#### LLM Integration

Modify `AIService.parseUserInput()` to integrate context:

```typescript
async parseUserInput(
  userText: string,
  recentTransactions: Transaction[],
  userCategories: string[],
  userId: string  // NEW parameter
): Promise<TransactionAction> {
  // Detect action type from user text
  const actionType = detectActionType(userText);
  
  // NEW: Get context for this action
  const context = await contextService.getContextForAction(
    userId,
    actionType,
    userText
  );
  
  // NEW: Build messages with context
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'context', content: context.formatted },  // NEW context message
    { role: 'user', content: contextMessage }
  ];
  
  // Call LLM with context
  const responseText = await callLLM(messages, this.config, this.ai);
  
  // Parse and return action (existing logic)
  const parsed = JSON.parse(responseText);
  return validateAIResponse(parsed);
}
```

---

## Context Message Format

The "context" message injected into LLM messages:

```
[User Financial Patterns]
Monthly spending: Food 40% (₩450K), Transport 15% (₩165K), Shopping 20% (₩235K)
This month: Food spending is 2x higher than average
Trend: Transport costs increasing (up 50% vs last month)

[User Personal Notes]
• Goal: Save ₩500K monthly (currently on track at 32% saved)
• Rule: Avoid shopping on weekends
• Preference: Budget ₩2K/day for food

[Financial Knowledge Tips]
• Tip: Categorize all spending to track patterns effectively
• Tip: Identify spending anomalies > 2x average for budget review
• Tip: Monthly savings goal of 30% is sustainable long-term
```

---

## Error Handling & Fallbacks

**Vectorize API Fails:**
- Log error but don't block user request
- Continue without context (graceful degradation)
- Return empty context message

**No Matching Context Found:**
- Return context message with available data
- Example: If no user notes exist, return only knowledge base + transactions

**User Has No Notes:**
- Fetch context from knowledge base + transaction history
- Skip user notes section

**Vectorization Timeout:**
- Set 2-second timeout on Vectorize API calls
- On timeout, fall back to simple text search (substring matching)

---

## Privacy & Security

**User Data Isolation:**
- Context queries are always filtered by `userId`
- Users only see context from their own transactions and notes
- Knowledge base is shared across all users (no privacy concern)

**Vector Storage:**
- Embeddings stored with `embedding_id` reference
- Original vectors stored in Cloudflare Vectorize (encrypted at rest)
- Database stores only references, not raw embeddings

**Encryption:**
- User notes encrypted in database (sensitive personal rules)
- Vectorize API calls over HTTPS
- No user data logged to Cloudflare

---

## Performance Considerations

**Latency Impact:**
- **Vectorize embedding call:** ~500-800ms per request
- **Vector search:** ~50-100ms
- **Total context retrieval:** ~600-900ms added per request
- **Mitigation:** Only for READ/REPORT (where latency acceptable); skip for CREATE/UPDATE/DELETE

**Cost:**
- **Vectorize API:** ~$0.01 per embedding (100k embeddings = $1)
- **Knowledge base:** One-time cost (static embeddings at deployment)
- **User notes:** Cost on write, amortized over reads
- **Transactions:** Cost per request (READ/REPORT only)
- **Estimate:** ~$0.02-0.05 per user per month for average usage

---

## Testing Strategy

**Unit Tests:**
- VectorizeService: Mock Cloudflare API, test embedding calls
- ContextService: Test retrieval strategy per action type
- UserNotesService: CRUD operations + vectorization triggers

**Integration Tests:**
- End-to-end: User message → context retrieval → LLM response
- Verify context is correctly injected into LLM messages
- Test fallback behavior (API failures, missing context)

**Benchmarks:**
- Measure latency: vectorize + search time per action type
- Measure cost: API calls per action type
- Verify context quality: does retrieved context actually improve response quality?

---

## Success Criteria

✅ Context retrieves relevant knowledge base, transactions, and user notes
✅ Selective retrieval (action-type-specific item counts)
✅ Context injected as separate message in LLM call
✅ Graceful fallback when Vectorize API fails
✅ User privacy maintained (data isolation by userId)
✅ Latency acceptable for interactive use (<2s added per request)
✅ Cost reasonable (~$0.05/user/month)
✅ Tests pass (unit + integration)

---

## Future Enhancements

- **Smart defaults:** Auto-generate default user notes based on spending patterns
- **Context caching:** Cache embeddings for recent transactions (avoid re-vectorizing)
- **Feedback loop:** Learn which context items are actually useful (improve retrieval quality)
- **Multi-language:** Support context retrieval in English, Korean, Chinese, etc.
- **Real-time updates:** Re-vectorize transactions daily instead of per-request
