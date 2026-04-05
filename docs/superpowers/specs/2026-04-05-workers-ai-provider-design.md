# Cloudflare Workers AI Provider Integration

**Date:** 2026-04-05  
**Status:** Design

## Overview

Add Cloudflare Workers AI as a default LLM provider for the FastSaaS backend, leveraging native Wrangler bindings for direct integration, cost optimization, and better ecosystem integration with Cloudflare Workers.

## Current State

The backend currently supports three LLM providers via HTTP APIs:
- **Groq** (default)
- **Gemini** (via Google API)
- **OpenAI** (via OpenAI API)

Provider selection is controlled by the `AI_PROVIDER` environment variable in `wrangler.jsonc`. The `getLLMConfig` function reads environment variables and returns provider-specific API keys and model names.

## Goals

1. Add Cloudflare Workers AI as the default provider when configured
2. Use native Wrangler AI binding instead of HTTP API calls
3. Reduce API costs and latency through native integration
4. Maintain separation of concerns and existing code patterns

## Architecture

### Type System

**Update `LLMProvider` type:**
```typescript
export type LLMProvider = 'groq' | 'gemini' | 'openai' | 'workers-ai';
```

### Configuration

**Wrangler binding (wrangler.jsonc):**
Uncomment the existing AI binding:
```jsonc
"ai": {
  "binding": "AI"
}
```

**Environment variable:**
Set `AI_PROVIDER=workers-ai` in `wrangler.jsonc` vars section (or via secrets for production).

No additional API keys needed — Cloudflare handles authentication at the platform level.

### LLM Service Integration

**New `callWorkersAI` function:**
- Takes the AI binding directly as a parameter (passed from `Env` in the Hono context)
- Uses the Cloudflare Workers AI API (`ai.run()`)
- Accepts `LLMMessage[]` and returns response text
- Follows same error handling pattern as other providers (throw on non-200, log details)

**Updated `callLLM` function:**
- Add routing case for `workers-ai` provider
- Pass the AI binding when calling `callWorkersAI`

**Updated `getLLMConfig` function:**
- When `AI_PROVIDER=workers-ai`, return config object with:
  - `provider: 'workers-ai'`
  - `modelName` from env or default (e.g., `@cf/meta/llama-2-7b-chat-int8`)
  - No `apiKey` field (binding is passed separately through Hono context)

### Request Flow

1. Route handler receives request with `Env` (Hono bindings)
2. `getLLMConfig(c.env)` returns config with provider type
3. `AIService.parseUserInput()` calls `callLLM(messages, config)`
4. `callLLM` checks provider type:
   - For `workers-ai`: `callWorkersAI(messages, config, c.env.AI)` (pass binding)
   - For others: existing HTTP-based calls
5. `callWorkersAI` calls `c.env.AI.run()` with formatted messages

### Error Handling

**Fail fast policy:**
- If Workers AI returns non-200 response, throw error immediately
- No automatic fallback to other providers
- Error logged with status, error details
- Request fails with 502 status (bad gateway) if Workers AI unavailable

### Supported Models

Common models available via Cloudflare Workers AI:
- `@cf/meta/llama-2-7b-chat-int8` (default)
- `@cf/mistral/mistral-7b-instruct-v0.1`
- `@cf/openai/gpt-3.5-turbo`

Default model selection: Use `WORKERS_AI_MODEL_NAME` env var or fallback to `@cf/meta/llama-2-7b-chat-int8`.

## Implementation Scope

**Files to modify:**
- `backend/src/services/llm.ts` — Add Workers AI support
- `backend/wrangler.jsonc` — Uncomment AI binding, set AI_PROVIDER
- `backend/.dev.vars` — Add AI_PROVIDER for local development

**New code:**
- `callWorkersAI()` function (~20-30 lines)
- Type updates to `LLMProvider` and `LLMConfig` interface (if needed)

**Existing code:**
- `callLLM()` router updated to handle workers-ai case
- `getLLMConfig()` updated for workers-ai config logic
- No changes to route handlers or service layers

## Testing Considerations

- Verify Workers AI binding is available in Hono context
- Test message formatting matches Cloudflare Workers AI API expectations
- Test error cases (missing binding, API errors)
- Validate response parsing (same `choices[0].message.content` format as other providers, or adjust as needed based on Cloudflare API response shape)

## Backwards Compatibility

- Existing Groq/Gemini/OpenAI configurations remain unchanged
- Default behavior preserved if `AI_PROVIDER` not set
- No breaking changes to public APIs
