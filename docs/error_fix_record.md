# 에러 수정 기록

이 문서는 개발 중 발생한 버그와 그 원인, 해결 방법을 기록합니다.

---

## [2026-04-04] 거래 저장 400 Bad Request — 필드명 불일치 (ZodError)

### 증상

`POST /api/transactions` 요청 시 400 응답.

```
POST https://backend.fastsaas2.workers.dev/api/transactions 400 (Bad Request)
```

### 원인

프론트엔드가 보내는 필드명과 백엔드 Zod 스키마가 기대하는 필드명이 달랐습니다.

| 위치 | 필드명 |
| --- | --- |
| `frontend/src/api.ts` (요청 body) | `type` |
| `backend/src/services/validation.ts` (`CreatePayloadSchema`) | `transactionType` |

`transactionType`이 없으니 Zod가 `required` 에러를 던지고, `isClientError()`가 이를 잡아 400을 반환했습니다.

### 해결

`frontend/src/api.ts`의 `addTransaction`에서 요청 body를 만들 때 `transactionType: data.type`을 추가합니다. 프론트 나머지 코드는 `type`을 그대로 사용하고, API 레이어에서만 변환합니다.

```ts
// frontend/src/api.ts
addTransaction: (data) =>
  fetch(`${BASE}/api/transactions`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ...data, transactionType: data.type }),  // 변환 추가
  }).then((r) => r.json()),
```

---

## [2026-04-04] AI 액션 400 Bad Request — Gemma 모델 JSON 파싱 실패

### 증상

`POST /api/ai/action`에 "어제 스타벅스 5300원" 등 자연어를 보내면 400 응답.

### 원인

`backend/src/services/ai.ts`의 `AIService` 생성자에 모델명이 `models/gemma-2-9b-it`으로 하드코딩되어 있었습니다. `routes/ai.ts`에서 `new AIService(apiKey, env.GEMINI_MODEL_NAME)`으로 두 번째 인자를 전달했지만 생성자가 `apiKey`만 받아서 무시됐습니다.

Gemma 모델이 시스템 프롬프트를 따르지 않거나 잘못된 구조의 JSON을 반환하면 `validateCreatePayload()`에서 ZodError → `isClientError()` → 400이 됩니다.

### 해결

`AIService` 생성자가 `modelName`을 받도록 수정하고 기본값을 `gemini-2.0-flash`로 설정했습니다. `ai-report.ts`도 같은 모델을 사용합니다.

```ts
// backend/src/services/ai.ts
constructor(apiKey: string, modelName: string = 'gemini-2.0-flash') {
  this.client = new GoogleGenerativeAI(apiKey);
  this.model = this.client.getGenerativeModel({ model: modelName });
}
```

`backend/.dev.vars`에 `GEMINI_MODEL_NAME=gemini-2.0-flash`가 이미 설정되어 있으므로 로컬과 프로덕션 모두 이 값을 사용합니다.

---

## [2026-04-04] localhost 로그인 후 프로덕션으로 리다이렉트

### 증상

`http://localhost:5174`에서 Google 로그인 시 `https://fastsaas02-track01-1.pages.dev/record`로 리다이렉트됨.

### 원인

`AuthContext.tsx`의 `getRedirectUrl()`은 `window.location.origin`을 사용하므로 localhost에서 호출하면 `http://localhost:5174/auth/callback`을 Supabase에 전달합니다. 그러나 Supabase 대시보드의 허용 Redirect URL 목록에 localhost가 없어서 Supabase가 이를 무시하고 기본 URL(프로덕션)로 리다이렉트합니다.

### 해결

Supabase 대시보드 → **Authentication** → **URL Configuration** → **Redirect URLs**에 아래 추가:

```
http://localhost:5173/**
http://localhost:5174/**
```

코드 변경 없음. 대시보드 설정만으로 해결됩니다.

---

## [2026-04-04] 프론트엔드 dev 서버가 프로덕션 백엔드로 요청

### 증상

`npm run dev`로 로컬 프론트를 띄워도 API 요청이 `backend.fastsaas2.workers.dev`로 감. 로컬 백엔드 터미널에 로그가 없음.

### 원인

`frontend/.env.development`에 `VITE_API_BASE_URL`이 이미 설정되어 있었지만, `http://localhost:5174`가 아닌 배포된 URL(`https://fastsaas02-track01-1.pages.dev`)에서 접속하고 있었기 때문입니다. 배포 사이트는 `frontend/.env.production` 기준으로 빌드되어 있어 항상 프로덕션 백엔드를 가리킵니다.

### 해결

로컬 개발 시 반드시 `http://localhost:5174`로 접속해야 합니다. 배포 사이트와 로컬 dev 서버는 별개입니다.

| 접속 URL | 사용 env 파일 | 백엔드 |
| --- | --- | --- |
| `http://localhost:5174` | `.env.development` | `localhost:8788` (로컬) |
| `https://fastsaas02-track01-1.pages.dev` | `.env.production` | `backend.fastsaas2.workers.dev` (프로덕션) |

---

## [2026-04-04] AI 서비스 Gemini → Groq 전환

### 증상

Gemini API 대신 Groq API를 사용하도록 전환 요청.

### 변경 내용

`ai.ts`는 이미 Groq fetch API를 사용하고 있었으나, `ai-report.ts`, 환경 변수, 테스트 등 나머지 코드가 여전히 `@google/generative-ai` SDK와 `GEMINI_API_KEY`를 참조하고 있었습니다.

| 파일 | 변경 내용 |
| --- | --- |
| `src/services/ai-report.ts` | `@google/generative-ai` SDK 제거 → Groq fetch API로 교체 |
| `src/routes/ai.ts` | `c.env.GEMINI_API_KEY/MODEL_NAME` → `c.env.GROQ_API_KEY/MODEL_NAME` |
| `src/db/index.ts` | `Env` 타입 `GEMINI_API_KEY/MODEL_NAME` → `GROQ_API_KEY/MODEL_NAME` |
| `package.json` | `@google/generative-ai` 의존성 제거 |
| `tests/services/ai.test.ts` | `@google/generative-ai` mock → `fetch` stub으로 완전 재작성 |
| `tests/services/ai-report.test.ts` | `@google/generative-ai` mock → `fetch` stub |
| `tests/routes/ai.test.ts` | `GEMINI_API_KEY` → `GROQ_API_KEY` |
| `.env.example`, `README.md` | Gemini 참조 → Groq으로 업데이트 |

`backend/.dev.vars`의 `GEMINI_API_KEY`도 `GROQ_API_KEY`로 직접 변경 필요 (git 미추적 파일).

---

## [2026-04-04] AI 액션 400 Bad Request — Groq 모델 transactionType 값 불일치 (ZodError)

### 증상

`POST /api/ai/action`에 "점심 12000원 썼어" 등 지출 관련 메시지를 보내면 400 응답.

```
AI action error: ZodError
  "path": ["transactionType"],
  "message": "Transaction type must be either \"income\" or \"expense\""
```

### 원인

시스템 프롬프트에 각 액션 타입별 페이로드 구조가 명시되어 있지 않아서 Groq llama 모델이 `transactionType`에 `"income"`/`"expense"` 외의 값(예: 한국어 "지출", "debit" 등)을 반환했습니다. `validateCreatePayload()`의 Zod 스키마가 이를 거부해 400이 됩니다.

### 해결

`backend/src/services/ai.ts`의 시스템 프롬프트에 각 액션 타입별 정확한 JSON 예시와 제약 조건을 명시적으로 추가했습니다.

```ts
// backend/src/services/ai.ts — SYSTEM_PROMPT
1. CREATE: User records a new transaction
   {"type":"create","payload":{"transactionType":"expense","amount":12000,...},...}
   - transactionType MUST be exactly "income" or "expense" (English, lowercase)
   - Infer from context: spent/bought/paid → "expense", earned/received/salary → "income"
```

기존에 `Rules:` 항목으로만 설명하던 방식에서 각 타입별 JSON 예시 + 강제 조건으로 변경하여 LLM이 잘못된 값을 반환하는 것을 방지합니다.

---

## [2026-04-05] API URL 이중 슬래시 — .env.production trailing slash

### 증상

프로덕션 환경에서 API 요청이 `https://backend.fastsaas2.workers.dev//api/transactions`처럼 슬래시가 두 개 붙음.

### 원인

`frontend/.env.production`의 `VITE_API_BASE_URL`에 trailing slash가 있었습니다.

```
VITE_API_BASE_URL=https://backend.fastsaas2.workers.dev/
```

`api.ts`에서 `${BASE}/api/...`로 조합하면 `//api/...`가 됩니다.

### 해결

`frontend/src/api.ts`에서 BASE 설정 시 trailing slash를 제거합니다.

```ts
const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787').replace(/\/$/, '');
```

---

## [2026-04-05] Groq API 403 Forbidden — 모델 변경

### 증상

`POST /api/ai/action` 요청 시 503 응답.

```
AI model API error: Error: Groq API error: 403 {"error":{"message":"Forbidden"}}
```

### 원인

`llama-3.3-70b-versatile` 모델의 무료 티어 분당 요청 제한(RPM)에 걸렸습니다. 403은 Groq 무료 티어에서 rate limit 초과 시 반환되는 코드입니다.

### 해결

`backend/src/services/ai.ts`, `ai-report.ts`의 기본 모델을 `llama-3.1-8b-instant`로 변경했습니다. 속도가 더 빠르고 rate limit이 더 관대합니다.

```ts
constructor(config: LLMConfig) {
  // 기본값: llama-3.1-8b-instant
}
```

---

## [2026-04-05] drizzle-kit migrate — .dev.vars 환경변수 미인식

### 증상

```
npx drizzle-kit migrate
Error: Please provide required params for 'turso' dialect: url: undefined
```

### 원인

`drizzle-kit`은 Wrangler 전용 파일인 `.dev.vars`를 자동으로 읽지 않습니다. 일반 환경변수나 `.env` 파일만 인식합니다.

### 해결

`backend/drizzle.config.ts`에서 직접 `.dev.vars`를 파싱해서 `process.env`에 주입합니다.

```ts
import { readFileSync } from 'fs';

try {
    const vars = readFileSync('.dev.vars', 'utf-8');
    vars.split('\n').forEach((line) => {
        const [key, ...rest] = line.split('=');
        if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
    });
} catch {}
```

이후 `npx drizzle-kit migrate`를 별도 환경변수 주입 없이 실행 가능합니다.

---

## [2026-04-05] 거래 저장 400 Validation failed — type/transactionType 불일치

### 증상

프로덕션 프론트엔드에서 거래 저장 시 400 응답. 로컬에서는 정상.

### 원인

배포된 프론트엔드 버전에 따라 요청 body에 `transactionType` 없이 `type`만 포함되는 경우가 있었습니다. 백엔드 `CreatePayloadSchema`는 `transactionType`만 required로 받아서 ZodError가 발생했습니다.

### 해결

백엔드 `CreatePayloadSchema`에 `z.preprocess`를 추가해 `type`과 `transactionType` 둘 다 허용하도록 수정했습니다.

```ts
const CreatePayloadSchema = z.preprocess((data: any) => ({
  ...data,
  transactionType: data.transactionType ?? data.type,
}), z.object({
  transactionType: z.enum(['income', 'expense']),
  // ...
}));
```
