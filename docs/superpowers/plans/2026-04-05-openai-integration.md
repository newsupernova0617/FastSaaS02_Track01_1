# OpenAI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OpenAI as a third provider option to the unified LLM service, allowing users to switch between Groq, Gemini, and OpenAI via environment variables.

**Architecture:** Extend the existing provider pattern by adding a `callOpenAI()` function that mirrors the structure of `callGroq()` and `callGemini()`. The `callLLM()` dispatcher and `getLLMConfig()` builder will route to OpenAI when `AI_PROVIDER=openai`. No changes required to consumers.

**Tech Stack:** TypeScript, OpenAI ChatCompletion API, existing LLMMessage/LLMConfig interfaces

---

### Task 1: Update LLMProvider Type

**Files:**
- Modify: `backend/src/services/llm.ts:1`

- [ ] **Step 1: Add 'openai' to the LLMProvider type union**

Open `backend/src/services/llm.ts` and change line 1:

```typescript
export type LLMProvider = 'groq' | 'gemini' | 'openai';
```

- [ ] **Step 2: Commit**

```bash
cd /home/yj437/coding/mingunFastSaaS_Error_fixed
git add backend/src/services/llm.ts
git commit -m "feat: add openai to LLMProvider type"
```

---

### Task 2: Implement callOpenAI Function

**Files:**
- Modify: `backend/src/services/llm.ts` (add new function after `callGroq`, before `callGemini`)

- [ ] **Step 1: Add callOpenAI function**

Insert this function at line 49 (right after `callGroq` ends and before `callGemini` starts):

```typescript
async function callOpenAI(messages: LLMMessage[], config: LLMConfig): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(err)}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  const text = data.choices[0]?.message?.content;
  if (!text) throw new Error('No response from OpenAI');
  return text;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/llm.ts
git commit -m "feat: implement callOpenAI function for OpenAI ChatCompletion API"
```

---

### Task 3: Update callLLM Dispatcher

**Files:**
- Modify: `backend/src/services/llm.ts:18-23`

- [ ] **Step 1: Add openai condition to callLLM**

Find the `callLLM()` function and update it to route to `callOpenAI`:

```typescript
export async function callLLM(messages: LLMMessage[], config: LLMConfig): Promise<string> {
  if (config.provider === 'openai') {
    return callOpenAI(messages, config);
  }
  if (config.provider === 'gemini') {
    return callGemini(messages, config);
  }
  return callGroq(messages, config);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/llm.ts
git commit -m "feat: route openai provider to callOpenAI in dispatcher"
```

---

### Task 4: Update getLLMConfig Builder

**Files:**
- Modify: `backend/src/services/llm.ts:89-108`

- [ ] **Step 1: Add openai condition to getLLMConfig**

Update the `getLLMConfig()` function to handle OpenAI. Change it to:

```typescript
export function getLLMConfig(env: {
  AI_PROVIDER?: string;
  GROQ_API_KEY: string;
  GROQ_MODEL_NAME?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL_NAME?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL_NAME?: string;
}): LLMConfig {
  if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      apiKey: env.OPENAI_API_KEY,
      modelName: env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
    };
  }
  if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
    return {
      provider: 'gemini',
      apiKey: env.GEMINI_API_KEY,
      modelName: env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
    };
  }
  return {
    provider: 'groq',
    apiKey: env.GROQ_API_KEY,
    modelName: env.GROQ_MODEL_NAME || 'llama-3.1-8b-instant',
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/llm.ts
git commit -m "feat: add openai config handling to getLLMConfig"
```

---

### Task 5: Document Environment Variables

**Files:**
- Modify: `backend/wrangler.jsonc` (add comment documenting OpenAI vars)

- [ ] **Step 1: Update wrangler.jsonc comments**

Find the comment section around line 14 and update it to document the OpenAI environment variables:

```jsonc
// 환경 변수는 .dev.vars 파일에서 로드됩니다 (로컬 개발용)
// 프로덕션 환경에서는 wrangler secret 또는 Cloudflare 대시보드에서 설정하세요
//
// AI Provider options (set AI_PROVIDER in vars above):
// - groq: requires GROQ_API_KEY, optionally GROQ_MODEL_NAME (default: llama-3.1-8b-instant)
// - gemini: requires GEMINI_API_KEY, optionally GEMINI_MODEL_NAME (default: gemini-2.5-flash)
// - openai: requires OPENAI_API_KEY, optionally OPENAI_MODEL_NAME (default: gpt-4o-mini)
```

- [ ] **Step 2: Commit**

```bash
git add backend/wrangler.jsonc
git commit -m "docs: document OpenAI environment variables in wrangler.jsonc"
```

---

### Task 6: Verify Implementation

**Files:**
- No files modified; manual verification only

- [ ] **Step 1: Review the complete llm.ts file**

Open `backend/src/services/llm.ts` and verify:
- Line 1: `LLMProvider` includes `'openai'`
- Lines 25-48: `callGroq()` function intact
- Lines 50-68: `callOpenAI()` function present and mirrors Groq structure
- Lines 70-82: `callGemini()` function intact
- Lines 18-23: `callLLM()` routes openai → callOpenAI
- Lines 89-115: `getLLMConfig()` checks openai first, with default model `gpt-4o-mini`

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd /home/yj437/coding/mingunFastSaaS_Error_fixed/backend
npx tsc --noEmit
```

Expected: No errors reported (or only pre-existing ones)

- [ ] **Step 3: Manual integration test setup**

To test that OpenAI works when someone switches to it:
1. Set `AI_PROVIDER=openai` in `wrangler.jsonc`
2. Add `OPENAI_API_KEY=sk-...` to `.dev.vars` 
3. Start the backend server
4. Call the AI action endpoint with a test transaction request
5. Verify the response comes back (or appropriate error if no key provided)

(This step is just documenting how to test — no actual execution needed in this task)

- [ ] **Step 4: Final commit (if any cleanup needed)**

```bash
git status
# Should show all changes committed
```

---

## Plan Self-Review

✅ **Spec coverage:** 
- ✓ Add 'openai' to LLMProvider type (Task 1)
- ✓ Create callOpenAI() function (Task 2)
- ✓ Update callLLM() dispatcher (Task 3)
- ✓ Update getLLMConfig() (Task 4)
- ✓ Document env vars (Task 5)
- ✓ Verification (Task 6)

✅ **No placeholders:** All code blocks are complete and exact. No "implement X", "add validation", or TBD.

✅ **Type consistency:** Function signatures match (`LLMMessage[]`, `LLMConfig`, `Promise<string>`). Default model is consistently `'gpt-4o-mini'`.

✅ **File paths exact:** All paths are absolute and verified to exist.
