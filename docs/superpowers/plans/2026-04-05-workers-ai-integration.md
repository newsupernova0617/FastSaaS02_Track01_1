# Cloudflare Workers AI Provider Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Cloudflare Workers AI as a native LLM provider using Wrangler bindings for cost optimization and better ecosystem integration.

**Architecture:** Update the LLM provider system to route requests to Workers AI when configured. The new `callWorkersAI` function uses the native AI binding instead of HTTP, and `getLLMConfig` recognizes the workers-ai provider type.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers, Wrangler

---

## File Structure

**Files to modify:**
- `backend/src/services/llm.ts` — Add callWorkersAI function, update callLLM and getLLMConfig
- `backend/wrangler.jsonc` — Uncomment AI binding, set AI_PROVIDER to workers-ai
- `backend/.dev.vars` — Add AI_PROVIDER for local development

**No new files created** — integration uses existing patterns.

---

## Task 1: Add Workers AI Type and callWorkersAI Function

**Files:**
- Modify: `backend/src/services/llm.ts:1-30`

- [ ] **Step 1: Update LLMProvider type to include workers-ai**

Open `backend/src/services/llm.ts` and modify line 1:

```typescript
export type LLMProvider = 'groq' | 'gemini' | 'openai' | 'workers-ai';
```

- [ ] **Step 2: Add callWorkersAI function**

Add this function after the `callGemini` function (after line 128):

```typescript
async function callWorkersAI(
  messages: LLMMessage[],
  config: LLMConfig,
  ai: any // Cloudflare Workers AI binding from Env
): Promise<string> {
  console.log('[Workers AI Call] Starting request to Cloudflare Workers AI');
  
  // Format messages for Cloudflare Workers AI
  const formattedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const response = await ai.run(config.modelName, {
      messages: formattedMessages,
      max_tokens: 1024,
    });

    // Extract text from response
    const text = response.result?.response || response?.response;
    if (!text) {
      throw new Error('No response from Workers AI');
    }
    return text;
  } catch (error) {
    console.error('[Workers AI Error]', {
      model: config.modelName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(`Workers AI error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

- [ ] **Step 3: Commit type and function additions**

```bash
git add backend/src/services/llm.ts
git commit -m "feat: add workers-ai type and callWorkersAI function"
```

---

## Task 2: Update callLLM Function to Route to Workers AI

**Files:**
- Modify: `backend/src/services/llm.ts:18-26`

- [ ] **Step 1: Update callLLM function signature to accept AI binding**

Modify the `callLLM` function signature (line 18) to accept the AI binding:

```typescript
export async function callLLM(
  messages: LLMMessage[],
  config: LLMConfig,
  ai?: any // Optional Cloudflare Workers AI binding
): Promise<string> {
  if (config.provider === 'workers-ai') {
    if (!ai) {
      throw new Error('Workers AI binding not available in environment');
    }
    return callWorkersAI(messages, config, ai);
  }
  if (config.provider === 'gemini') {
    return callGemini(messages, config);
  }
  if (config.provider === 'openai') {
    return callOpenAI(messages, config);
  }
  return callGroq(messages, config);
}
```

- [ ] **Step 2: Commit callLLM routing update**

```bash
git add backend/src/services/llm.ts
git commit -m "feat: add workers-ai routing to callLLM function"
```

---

## Task 3: Update getLLMConfig to Handle Workers AI

**Files:**
- Modify: `backend/src/services/llm.ts:136-165`

- [ ] **Step 1: Update getLLMConfig function for workers-ai provider**

Replace the `getLLMConfig` function (lines 136-165) with:

```typescript
export function getLLMConfig(env: {
  AI_PROVIDER?: string;
  GROQ_API_KEY: string;
  GROQ_MODEL_NAME?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL_NAME?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL_NAME?: string;
  WORKERS_AI_MODEL_NAME?: string;
}): LLMConfig {
  if (env.AI_PROVIDER === 'workers-ai') {
    return {
      provider: 'workers-ai',
      apiKey: '', // Not used for Workers AI
      modelName: env.WORKERS_AI_MODEL_NAME || '@cf/meta/llama-2-7b-chat-int8',
    };
  }
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

- [ ] **Step 2: Commit getLLMConfig update**

```bash
git add backend/src/services/llm.ts
git commit -m "feat: add workers-ai config handling to getLLMConfig"
```

---

## Task 4: Update wrangler.jsonc to Enable AI Binding

**Files:**
- Modify: `backend/wrangler.jsonc:6-46`

- [ ] **Step 1: Update wrangler.jsonc to set AI_PROVIDER**

Open `backend/wrangler.jsonc` and update the vars section (line 6-8):

```jsonc
"vars": {
  "AI_PROVIDER": "workers-ai"
},
```

- [ ] **Step 2: Uncomment the AI binding**

Uncomment the AI binding section. Find lines 40-42 and change from:

```jsonc
// "ai": {
//   "binding": "AI"
// },
```

To:

```jsonc
"ai": {
  "binding": "AI"
},
```

The file should now look like (keep all other settings intact):

```jsonc
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "backend",
	"main": "src/index.ts",
	"compatibility_date": "2026-03-24",
	"vars": {
		"AI_PROVIDER": "workers-ai"
	},
	"observability": {
		"logs": {
			"enabled": true
		}
	},
	// ... comments ...
	"ai": {
		"binding": "AI"
	},
	// ... rest of config ...
}
```

- [ ] **Step 3: Commit wrangler.jsonc updates**

```bash
git add backend/wrangler.jsonc
git commit -m "config: enable Workers AI binding and set as default provider"
```

---

## Task 5: Update .dev.vars for Local Development

**Files:**
- Modify: `backend/.dev.vars`

- [ ] **Step 1: Verify or create .dev.vars with AI_PROVIDER**

Check if `backend/.dev.vars` exists. If it doesn't, create it. If it does, add or update the `AI_PROVIDER` line:

```
AI_PROVIDER=workers-ai
```

If the file already has content, add this line. The file should look like:

```
AI_PROVIDER=workers-ai
# ... other env vars if any ...
```

- [ ] **Step 2: Commit .dev.vars updates**

```bash
git add backend/.dev.vars
git commit -m "config: set AI_PROVIDER to workers-ai for local development"
```

---

## Task 6: Update AIService to Pass AI Binding

**Files:**
- Modify: `backend/src/services/ai.ts` (or wherever AIService uses callLLM)

- [ ] **Step 1: Check how AIService calls callLLM**

Open `backend/src/services/ai.ts` and find where `callLLM` is invoked. You need to pass the AI binding from the Hono context.

- [ ] **Step 2: Update AIService constructor or call site**

Since AIService is instantiated in the route handler (backend/src/routes/ai.ts:86), we need to pass the AI binding. Update the AIService usage to pass `c.env.AI`.

Find this in `backend/src/routes/ai.ts:86`:

```typescript
const aiService = new AIService(getLLMConfig(c.env));
```

Update to pass the entire Hono context or just the AI binding. You have two options:

**Option A:** Modify AIService to accept and store the AI binding:

In `backend/src/services/ai.ts`, update the constructor:

```typescript
constructor(config: LLMConfig, ai?: any) {
  this.config = config;
  this.ai = ai;
}
```

Then in `parseUserInput` or wherever `callLLM` is called, pass it:

```typescript
return callLLM(messages, this.config, this.ai);
```

In `backend/src/routes/ai.ts:86`, update to:

```typescript
const aiService = new AIService(getLLMConfig(c.env), c.env.AI);
```

- [ ] **Step 3: Update AIReportService similarly**

Find where `AIReportService` is instantiated (in `backend/src/routes/ai.ts:321`) and update similarly:

```typescript
const reportService = new AIReportService(getLLMConfig(c.env), c.env.AI);
```

Update `AIReportService` constructor in `backend/src/services/ai-report.ts` to accept the binding.

- [ ] **Step 4: Commit AIService updates**

```bash
git add backend/src/services/ai.ts backend/src/services/ai-report.ts backend/src/routes/ai.ts
git commit -m "feat: pass Workers AI binding to AI services"
```

---

## Task 7: Verify Configuration and Test Locally

**Files:**
- Test: All modified files

- [ ] **Step 1: Start local development server**

```bash
cd backend
npm run dev
```

Expected: Server starts successfully. You should see logs about the Wrangler environment loading with AI binding available.

- [ ] **Step 2: Test endpoint with curl (or use frontend)**

Test the AI endpoint with a simple request:

```bash
curl -X POST http://localhost:8787/api/ai/action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <test-token>" \
  -d '{"text": "Add a transaction for 50 dollars"}'
```

Expected: Response indicates success (may vary based on Workers AI availability in local environment).

- [ ] **Step 3: Check logs for Workers AI call**

In the console output, you should see:

```
[Workers AI Call] Starting request to Cloudflare Workers AI
```

If you see this, the Workers AI routing is working.

- [ ] **Step 4: Test fallback to other providers (optional)**

To verify other providers still work, temporarily change wrangler.jsonc `AI_PROVIDER` back to `groq` or `openai` and test. Then change it back to `workers-ai`.

- [ ] **Step 5: Commit test verification**

Once verified working locally:

```bash
git log --oneline -5
```

Should show your Workers AI commits. All good!

```bash
git commit -m "test: verify workers-ai provider integration works locally"
```

---

## Task 8: Clean Up and Final Validation

**Files:**
- Review: All modified files

- [ ] **Step 1: Review all changes**

```bash
git diff origin/main
```

Expected: Only changes to llm.ts, wrangler.jsonc, .dev.vars, ai.ts, ai-report.ts, and ai.ts route.

- [ ] **Step 2: Check for any console.log cleanup needed**

Search for any debug logs you may have added:

```bash
git grep "console.log" -- backend/src/services/llm.ts
```

Expected: Only the Workers AI logging statements from callWorkersAI function.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd backend
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 4: Final commit summary**

```bash
git log --oneline origin/main..HEAD
```

Should show commits:
1. feat: add workers-ai type and callWorkersAI function
2. feat: add workers-ai routing to callLLM function
3. feat: add workers-ai config handling to getLLMConfig
4. config: enable Workers AI binding and set as default provider
5. config: set AI_PROVIDER to workers-ai for local development
6. feat: pass Workers AI binding to AI services

All tasks complete!

---

## Implementation Notes

- **Workers AI Binding:** Requires Cloudflare account with Workers AI enabled. For local development with `wrangler dev`, the binding is mocked/simulated.
- **Model Names:** Use `@cf/meta/llama-2-7b-chat-int8` as default, or set `WORKERS_AI_MODEL_NAME` env var for other models.
- **Error Handling:** Workers AI errors throw immediately (fail-fast policy per spec). No fallback to other providers.
- **Message Format:** Workers AI expects `messages` array with `{ role, content }` format, same as OpenAI/Groq.
