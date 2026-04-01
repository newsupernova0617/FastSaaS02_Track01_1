# 백엔드 코드 리뷰 보고서

> 작성일: 2026-04-01  
> 대상: `backend/src/` 전체 소스 코드  
> 스택: Hono (Cloudflare Workers) + Drizzle ORM + Turso (SQLite) + Supabase Auth + Google Generative AI

---

## 전체 평가

이 코드베이스는 TypeScript, Zod 스키마 검증, Hono 라우팅 등 현대적인 도구를 잘 활용하고 있으며, 인증 미들웨어와 Soft Delete 패턴 등 기본 구조는 탄탄하다. 그러나 **보안에 치명적인 하드코딩된 값**, **입력값 미검증 경로**, **에러 처리 누락**, **DB 성능 취약점** 등 프로덕션 배포 전에 반드시 수정해야 할 문제들이 존재한다.

---

## 가장 중요한 수정 사항 Top 5

| 순위 | 문제 | 파일 |
|------|------|------|
| 1 | Supabase URL 하드코딩 (보안 설정 유출) | `middleware/auth.ts:259` |
| 2 | 쿼리 파라미터 미검증 → 의도치 않은 전체 조회 가능 | `routes/transactions.ts:25, 102` |
| 3 | 라우트 핸들러에 try-catch 없음 → ZodError가 500으로 노출 | routes 전체 |
| 4 | 트랜잭션 테이블에 DB 인덱스 없음 → 풀스캔 쿼리 | `db/schema.ts` |
| 5 | AI confidence 값 무시 → 저품질 AI 응답이 그대로 실행됨 | `routes/ai.ts` |

---

## 1. 보안 문제 (Security Issues)

---

### 1-1. Supabase 인스턴스 URL 하드코딩

**심각도:** Critical  
**파일:** `backend/src/middleware/auth.ts:259`

```typescript
const supabaseUrl = 'https://uqvnepemplsdkkawbmdc.supabase.co';
```

**문제:** Supabase 프로젝트 URL이 소스코드에 하드코딩되어 있다. 코드가 공개 저장소에 노출되면 해당 Supabase 인스턴스가 식별되고, 이 URL을 이용한 공격 표면이 생긴다. 또한 환경(개발/스테이징/프로덕션)별로 분리가 불가능하다.

**권장 조치:**
- `Env` 타입(`db/index.ts`)에 `SUPABASE_URL: string`을 추가한다.
- `wrangler.jsonc`의 `vars`에 해당 값을 설정한다.
- 미들웨어에서 `c.env.SUPABASE_URL`을 사용하도록 변경한다.

---

### 1-2. 401 응답에 내부 디버그 정보 노출

**심각도:** High  
**파일:** `backend/src/middleware/auth.ts:265`

```typescript
return c.json({ error: 'Unauthorized', debug: 'JWT verification failed' }, 401);
```

**문제:** `debug` 필드가 프로덕션 응답에 포함되어 공격자가 인증 실패 이유를 정확히 파악할 수 있다. 디버그 정보는 내부 로그에만 남겨야 한다.

**권장 조치:** 응답에서 `debug` 필드를 제거하고, `console.error`로만 기록한다.

---

### 1-3. 쿼리 파라미터 미검증으로 인한 의도치 않은 전체 조회

**심각도:** High  
**파일:** `backend/src/routes/transactions.ts:18-25`, `routes/transactions.ts:90-102`

```typescript
// GET /api/transactions?date=...
const date = c.req.query('date');
// ...
like(transactions.date, `${date}%`)   // date 값이 '%'이면 모든 행 반환
```

```typescript
// GET /api/transactions/summary?month=...
const month = c.req.query('month') ?? new Date().toISOString().slice(0, 7);
// ...
like(transactions.date, `${month}%`)  // month가 '%'이면 모든 월 포함
```

**문제:** `date` 또는 `month` 파라미터에 `%`를 전달하면 해당 사용자의 모든 거래가 반환된다. SQL injection은 아니지만(Drizzle이 파라미터화 처리), 필터 로직을 우회할 수 있다. 특히 `summary` 엔드포인트에서 `month=%`를 전달하면 모든 월의 합산 결과가 노출된다.

**권장 조치:** 파라미터 형식을 Zod 또는 정규표현식으로 검증한다.
```typescript
const dateRegex = /^\d{4}-\d{2}$/;
if (date && !dateRegex.test(date)) {
  return c.json({ error: 'Invalid date format. Use YYYY-MM' }, 400);
}
```

---

### 1-4. wrangler.jsonc의 secrets가 암호화되지 않은 vars에 정의됨

**심각도:** High  
**파일:** `backend/wrangler.jsonc:6-11`

```jsonc
"vars": {
  "TURSO_DB_URL": "your-turso-db-url-here",
  "TURSO_AUTH_TOKEN": "your-turso-auth-token-here",
  "SUPABASE_JWT_SECRET": "your-supabase-jwt-secret-here",
  "GEMINI_API_KEY": "your-gemini-api-key-here"
}
```

**문제:** `vars`는 Cloudflare Workers의 평문 환경 변수다. `TURSO_AUTH_TOKEN`, `SUPABASE_JWT_SECRET`, `GEMINI_API_KEY`와 같은 민감한 정보는 `wrangler secret put` 명령으로 등록하는 암호화된 **Secrets**를 사용해야 한다. 플레이스홀더 값이 실제 값으로 대체된 채 git에 커밋되면 크리티컬한 유출이 발생한다.

**권장 조치:** `wrangler secret put TURSO_AUTH_TOKEN` 등의 명령으로 Secrets으로 이전한다. `vars`에는 비민감 설정만 남긴다.

---

### 1-5. AI 엔드포인트 text 입력 길이 제한 없음

**심각도:** Medium  
**파일:** `backend/src/routes/ai.ts:29-35`

```typescript
const { text } = await c.req.json();
if (!text || typeof text !== 'string') { ... }
// text 길이 제한 없음
```

**문제:** 공격자가 수 MB의 텍스트를 전송해 Google AI API 비용을 증폭시키거나, 처리 지연을 유발할 수 있다.

**권장 조치:** 입력 길이를 제한한다.
```typescript
if (text.length > 500) {
  return c.json({ success: false, error: 'Input text too long (max 500 characters)' }, 400);
}
```

---

### 1-6. JWKS 캐시를 모듈 레벨 변수로 관리

**심각도:** Low  
**파일:** `backend/src/middleware/auth.ts:40-41`

```typescript
let jwksCache: { keys: JWKSKey[] } | null = null;
let jWKSCacheTime = 0;
```

**문제:** Cloudflare Workers는 Worker 인스턴스 간에 메모리를 공유하지 않으므로, 이 캐시는 실제로는 단일 Worker 인스턴스의 수명 동안만 유지된다. Workers가 자주 재시작되는 환경에서는 캐시 히트율이 낮고, 요청마다 JWKS를 재조회하게 될 수 있다.

**권장 조치:** 현재 동작 자체는 안전하지만 코드 주석에 이 한계를 명시하거나, KV 스토리지를 활용한 캐시로 업그레이드를 고려한다.

---

## 2. 에러 처리 문제 (Error Handling Issues)

---

### 2-1. 대부분의 라우트 핸들러에 try-catch 없음

**심각도:** High  
**파일:** `routes/transactions.ts` 전체, `routes/users.ts` 전체

**문제:** `routes/ai.ts`의 `/action` 핸들러만 try-catch로 감싸져 있다. 나머지 모든 라우트에는 에러 처리가 없어, 다음 상황에서 500 응답이 발생한다:
- Zod 검증 실패 시 `ZodError`가 Hono에 그대로 전파 → 500 응답 (클라이언트에는 400이어야 함)
- Turso 연결 실패 시 unhandled exception
- `POST /api/transactions` → `validateCreatePayload()` 실패 시 ZodError → 500

```typescript
// POST /api/transactions (routes/transactions.ts:33-56) — try-catch 없음
const validated = validateCreatePayload(body); // ZodError 발생 시 500
const result = await db.insert(...);           // DB 오류 시 500
```

**권장 조치:** 모든 라우트 핸들러를 try-catch로 감싸거나, Hono 전역 에러 핸들러(`app.onError`)를 `index.ts`에 등록한다.
```typescript
app.onError((err, c) => {
  if (err instanceof z.ZodError) {
    return c.json({ error: 'Validation failed', details: err.errors }, 400);
  }
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});
```

---

### 2-2. 에러 응답 형식 불일치

**심각도:** Medium  
**파일:** `routes/transactions.ts`, `routes/users.ts`, `routes/ai.ts`

**문제:** 에러 응답 형식이 통일되어 있지 않다:
- `routes/users.ts:54` → `{ error: 'User not found' }`
- `routes/transactions.ts:77` → `{ success: false, error: 'Transaction not found' }`
- `routes/ai.ts:215` → `{ success: false, error: message }`
- `middleware/auth.ts:254` → `{ error: 'Unauthorized' }`

클라이언트가 에러를 처리할 때 응답 형식이 일관되지 않으면 파싱 오류가 발생하기 쉽다.

**권장 조치:** 모든 에러 응답을 `{ success: false, error: string }` 형식으로 통일한다.

---

## 3. 데이터 검증 문제 (Validation Issues)

---

### 3-1. URL 파라미터 ID의 NaN 미처리

**심각도:** High  
**파일:** `routes/transactions.ts:63`, `routes/transactions.ts:113`

```typescript
const id = Number(c.req.param('id'));
// id가 'abc'면 NaN, id가 '0'이면 0 — 검증 없음
```

**문제:** `Number('abc')` → `NaN`, `Number('')` → `0`. `NaN`이 Drizzle의 `eq(transactions.id, NaN)`에 전달되면 아무 행도 매칭되지 않아 조용히 실패하거나 의도치 않은 동작이 발생할 수 있다. `0`이 전달되면 schema 제약(`autoIncrement`이므로 id 0은 없음)에 따라 조용히 실패한다.

**권장 조치:**
```typescript
const id = parseInt(c.req.param('id'), 10);
if (isNaN(id) || id <= 0) {
  return c.json({ success: false, error: 'Invalid transaction ID' }, 400);
}
```

---

### 3-2. validateAmount, validateDate, validateCategory 중복 검증

**심각도:** Low  
**파일:** `routes/ai.ts:65-67`, `services/validation.ts:147-195`

```typescript
// ai.ts 에서 Zod 검증 후 또다시 같은 조건을 명령형으로 재검증
const payload = validateCreatePayload(action.payload); // Zod: amount > 0
validateAmount(payload.amount);                          // 다시: amount > 0 검증
validateDate(payload.date);                              // 다시: 날짜 형식 검증
```

**문제:** Zod 스키마(`CreatePayloadSchema`)가 이미 amount, date, category를 검증한다. 이후 `validateAmount()`, `validateDate()`, `validateCategory()`로 동일한 조건을 재검증하는 것은 중복이다. `validateCategory()`는 경고만 출력하고 예외를 던지지 않아 실제 방어 효과도 없다.

**권장 조치:** `validateAmount()`, `validateDate()`, `validateCategory()` 호출을 제거하고 Zod 스키마에 모든 검증 로직을 통합한다.

---

### 3-3. users/sync 엔드포인트에 입력 검증 없음

**심각도:** Medium  
**파일:** `routes/users.ts:16-21`

```typescript
const body = await c.req.json<{
    email?: string;
    name?: string;
    avatar_url?: string;
    provider: string;
}>();
```

**문제:** `provider`는 `notNull()` 컬럼이지만, 빈 문자열이나 임의의 값이 검증 없이 저장된다. `email`은 이메일 형식 검증이 없다. `name`, `avatar_url`도 길이 제한이 없다.

**권장 조치:** Zod 스키마를 추가한다.
```typescript
const SyncPayloadSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().max(100).optional(),
  avatar_url: z.string().url().optional(),
  provider: z.string().min(1).max(50),
});
```

---

## 4. API 설계 문제 (API Design Issues)

---

### 4-1. GET /api/transactions에 페이지네이션 없음

**심각도:** Medium  
**파일:** `routes/transactions.ts:21-28`

```typescript
const rows = date
    ? await db.select().from(transactions).where(...)
    : await db.select().from(transactions).where(...); // 전체 조회
```

**문제:** `date` 파라미터 없이 호출하면 사용자의 모든 거래 내역이 한 번에 반환된다. 수년간 사용한 사용자는 수천 건의 데이터가 반환될 수 있으며, 이는 네트워크 대역폭과 메모리를 낭비한다.

**권장 조치:** `limit`/`offset` 또는 커서 기반 페이지네이션을 추가한다.
```typescript
const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500);
const offset = parseInt(c.req.query('offset') || '0');
// ...
.limit(limit).offset(offset)
```

---

### 4-2. GET /api/transactions에 정렬 기준 없음

**심각도:** Medium  
**파일:** `routes/transactions.ts:21-27`

**문제:** `.orderBy()`가 없어 반환 순서가 DB 엔진에 따라 비결정적이다. 클라이언트는 날짜 역순을 기대하지만 보장이 없다.

**권장 조치:** `.orderBy(desc(transactions.date))`를 추가한다.

---

### 4-3. AI read 액션에서 sql 태그 직접 사용 (Drizzle 연산자 미사용)

**심각도:** Medium  
**파일:** `routes/ai.ts:143`

```typescript
sql`${transactions.date} LIKE ${month}%`
// transactions.ts에서는 like() 연산자를 사용함
like(transactions.date, `${date}%`)  // transactions.ts:25
```

**문제:** 같은 코드베이스에서 동일한 패턴 매칭을 구현하는 데 두 가지 방식이 혼재되어 있다. `sql` 태그를 직접 사용하면 Drizzle의 타입 안전성과 쿼리 로그 도구의 이점을 잃는다.

**권장 조치:** `sql` 태그 대신 `like(transactions.date, \`${month}%\`)` 연산자를 사용한다.

---

### 4-4. AI confidence 점수를 무시

**심각도:** Medium  
**파일:** `routes/ai.ts:59-88`

```typescript
const action = await aiService.parseUserInput(text, recentTransactions, userCategories);
// action.confidence가 파싱되지만 전혀 활용하지 않음
switch (action.type) { ... } // 신뢰도 0.1짜리 응답도 그대로 실행
```

**문제:** AI 모델이 `confidence: 0.1`로 응답해도 DB 쓰기 작업(create/update/delete)이 그대로 실행된다. 이는 잘못 해석된 사용자 의도가 실제 데이터 변경으로 이어지는 UX 문제이자 데이터 무결성 위험이다.

**권장 조치:** 쓰기 작업에 대해 신뢰도 임계값을 설정한다.
```typescript
const WRITE_CONFIDENCE_THRESHOLD = 0.6;
if (['create', 'update', 'delete'].includes(action.type) && action.confidence < WRITE_CONFIDENCE_THRESHOLD) {
  return c.json({
    success: false,
    error: 'AI가 요청을 명확히 이해하지 못했습니다. 좀 더 구체적으로 입력해주세요.',
  }, 400);
}
```

---

### 4-5. GET /api/transactions/:id 엔드포인트 없음

**심각도:** Low  
**파일:** `routes/transactions.ts`

**문제:** 단건 조회 API가 없다. `update`/`delete` 작업 후 클라이언트가 특정 트랜잭션을 재조회하려면 전체 목록을 다시 가져와야 한다.

**권장 조치:** `router.get('/:id', ...)` 엔드포인트를 추가한다.

---

## 5. 데이터베이스 / ORM 문제 (Database / ORM Issues)

---

### 5-1. transactions 테이블에 인덱스 없음

**심각도:** High  
**파일:** `backend/src/db/schema.ts`

```typescript
export const transactions = sqliteTable('transactions', {
    id:        integer('id').primaryKey({ autoIncrement: true }),
    userId:    text('user_id').notNull().references(() => users.id), // 인덱스 없음
    date:      text('date').notNull(),                                // 인덱스 없음
    deletedAt: text('deleted_at'),
    ...
});
```

**문제:** 모든 쿼리가 `WHERE user_id = ? AND date LIKE ?` 조건을 사용하지만, `user_id`와 `date` 컬럼에 인덱스가 없다. 데이터가 적을 때는 문제없지만, 거래 건수가 늘어나면 모든 쿼리가 풀 테이블 스캔을 수행한다.

**권장 조치:** 복합 인덱스를 추가한다.
```typescript
import { index } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  ...
}, (t) => ({
  userDateIdx: index('transactions_user_date_idx').on(t.userId, t.date),
}));
```

---

### 5-2. 요청마다 새 DB 커넥션 생성

**심각도:** Medium  
**파일:** `backend/src/db/index.ts:13-21`

```typescript
export function getDb(env: Env) {
    const client = createClient({   // 매 요청마다 새 클라이언트 생성
        url: env.TURSO_DB_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    });
    return drizzle(client, { schema });
}
```

**문제:** 매 요청마다 libsql 클라이언트를 새로 생성한다. Cloudflare Workers 환경에서 libsql의 HTTP 모드는 무상태이므로 연결 유지가 안 되지만, 클라이언트 인스턴스 생성 자체의 오버헤드가 누적된다. 특히 AI 엔드포인트는 단일 요청에서 `getDb(c.env)`를 한 번만 호출하므로 실용상 문제는 작지만 패턴이 일관되지 않다.

**권장 조치:** Worker 인스턴스 레벨에서 클라이언트를 캐시하거나, libsql의 공식 권고 방식을 따른다.

---

### 5-3. update 시 deletedAt 필터 누락

**심각도:** Medium  
**파일:** `routes/ai.ts:97-107`

```typescript
// update 액션: 소유권 확인
const existing = await db
  .select()
  .from(transactions)
  .where(and(eq(transactions.id, payload.id), eq(transactions.userId, userId)));
  // isNull(transactions.deletedAt) 조건 없음
```

**문제:** `update` 및 `delete` 액션의 소유권 확인 쿼리에 `isNull(transactions.deletedAt)` 조건이 없다. 이미 삭제(soft delete)된 거래를 `update` 또는 `delete` 하려 할 때, 소유권 확인은 통과하고 쓰기가 진행된다. `update` 액션은 삭제된 거래를 복원하지 않으므로 DB에 모순된 상태(삭제됐지만 내용이 바뀐 레코드)가 생긴다.

**권장 조치:** 소유권 확인 쿼리에 `isNull(transactions.deletedAt)`을 추가한다.

---

## 6. 코드 구조 / 유지보수성 문제 (Maintainability Issues)

---

### 6-1. AIService 모듈 레벨 싱글턴 패턴의 오해

**심각도:** Medium  
**파일:** `routes/ai.ts:22-41`

```typescript
let aiService: AIService; // 모듈 레벨 변수

router.post('/action', async (c) => {
  if (!aiService) {
    aiService = new AIService(c.env.GEMINI_API_KEY); // 첫 요청에서만 생성
  }
  ...
});
```

**문제:** 싱글턴으로 재사용하려는 의도이지만, Cloudflare Workers는 Worker 인스턴스가 수시로 재시작되기 때문에 실제로는 매 cold start마다 재생성된다. 또한 `c.env.GEMINI_API_KEY`에 의존하므로 모듈 레벨 초기화(importTime)가 불가능해 코드 의도와 구현이 일치하지 않는다. `createAIService()` 팩토리 함수(`services/ai.ts:79-84`)가 이미 있음에도 사용되지 않는다.

**권장 조치:** 모듈 레벨 변수를 제거하고 요청 핸들러 내에서 직접 `new AIService(c.env.GEMINI_API_KEY)`로 생성하거나, Hono의 미들웨어를 통해 주입한다.

---

### 6-2. AI 응답 타입의 any 사용

**심각도:** Low  
**파일:** `types/ai.ts:49`, `routes/ai.ts:114`

```typescript
// types/ai.ts
result?: any;

// routes/ai.ts
const updateValues: any = {};
```

**문제:** `result?: any`는 타입 안전성을 포기하는 것이다. `updateValues: any = {}`는 잘못된 필드명이 DB 업데이트에 포함되어도 컴파일 타임에 잡히지 않는다.

**권장 조치:**
```typescript
// types/ai.ts에서
result?: Transaction | Transaction[] | { id: number };

// routes/ai.ts에서
const updateValues: Partial<Pick<typeof transactions.$inferInsert, 'type' | 'amount' | 'category' | 'memo' | 'date'>> = {};
```

---

### 6-3. 사용되지 않는 generateUndoMessage 함수

**심각도:** Low  
**파일:** `services/messages.ts:24-26`

```typescript
export function generateUndoMessage(tx: Transaction): string {
  return `...복원되었습니다`;
}
```

**문제:** `generateUndoMessage()`가 정의되어 있지만, `routes/transactions.ts`의 undo 엔드포인트는 이 함수를 사용하지 않고 직접 문자열을 생성한다(`routes/transactions.ts:132`). 두 곳의 메시지가 다르며, `messages.ts`의 함수는 데드 코드다.

**권장 조치:** undo 엔드포인트에서 `generateUndoMessage(tx)`를 호출하거나, 사용하지 않는 함수를 삭제한다.

---

### 6-4. AI 모델 식별자 하드코딩 및 불안정한 모델 사용

**심각도:** Medium  
**파일:** `services/ai.ts:33`

```typescript
this.model = this.client.getGenerativeModel({ model: 'models/gemma-2-9b-it' });
```

**문제:** `gemma-2-9b-it`는 Google AI Studio의 무료 Gemma 모델로, 금융 거래 파싱에 적합하지 않을 수 있으며 모델 가용성이 불안정하다. 모델 식별자가 코드에 하드코딩되어 있어 변경 시 재배포가 필요하다.

**권장 조치:** 모델명을 환경 변수로 이동하고(`GEMINI_MODEL_NAME`), 프로덕션에서는 `gemini-1.5-flash` 또는 `gemini-2.0-flash` 사용을 검토한다.

---

## 7. 테스트 부족 (Testing Gaps)

---

### 7-1. 라우트 핸들러 테스트 전무

**심각도:** Medium  
**파일:** 테스트 파일 없음 (`routes/`, `services/validation.ts`, `services/ai.ts`)

**문제:** `auth.test.ts`만 존재하며, 다음 항목에 대한 테스트가 전혀 없다:
- 모든 HTTP 라우트 (`/api/transactions`, `/api/users`, `/api/ai`)
- Zod 검증 스키마 (`validation.ts`)
- AI 응답 파싱 (`services/ai.ts`)
- 메시지 생성 함수 (`services/messages.ts`)

특히 Zod 스키마 검증 로직은 비즈니스 규칙이 집약된 곳으로, 단위 테스트가 가장 효과적이고 빠르다.

**권장 조치:**
- `validation.test.ts`: 유효/무효 페이로드에 대한 Zod 스키마 단위 테스트
- `transactions.test.ts`: Hono `app.request()`를 사용한 라우트 통합 테스트 (DB 모킹 또는 인메모리 SQLite 사용)
- `messages.test.ts`: 메시지 포맷 검증

---

### 7-2. 인증 테스트가 HS256만 커버

**심각도:** Low  
**파일:** `middleware/auth.test.ts`

**문제:** 현재 `auth.test.ts`는 HS256 토큰만 테스트한다. 실제 프로덕션에서는 Supabase가 ES256 토큰을 발급하지만, ES256 경로(`verifyES256`)에 대한 테스트가 없다. JWKS 패치 실패, kid 불일치, 만료된 ES256 토큰 등의 케이스가 검증되지 않는다.

**권장 조치:** ES256 검증 경로에 대한 단위 테스트를 추가한다 (JWKS 응답을 모킹).

---

## 8. 성능 문제 (Performance Issues)

---

### 8-1. distinct category 조회에 LIMIT 없음

**심각도:** Low  
**파일:** `routes/ai.ts:51-54`

```typescript
const categoryRows = await db
  .selectDistinct({ category: transactions.category })
  .from(transactions)
  .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)));
// LIMIT 없음
```

**문제:** 장기 사용자의 경우 카테고리 수가 많아지면 이 쿼리는 수천 행을 스캔한다. 카테고리는 AI에 컨텍스트로 전달되며, 너무 많은 카테고리는 AI 프롬프트 크기를 늘려 비용과 지연을 증가시킨다.

**권장 조치:** `.limit(50)` 또는 빈도 기반 상위 카테고리만 반환하도록 수정한다.

---

### 8-2. Cache-Control 헤더 없음

**심각도:** Low  
**파일:** 모든 라우트

**문제:** GET 엔드포인트에 `Cache-Control` 헤더가 없어 중간 프록시나 브라우저가 개인 재무 데이터를 캐시할 수 있다.

**권장 조치:** 모든 `/api/*` 응답에 `Cache-Control: private, no-store`를 추가한다.
```typescript
app.use('/api/*', async (c, next) => {
  await next();
  c.res.headers.set('Cache-Control', 'private, no-store');
});
```

---

## 권장 액션 플랜

### 즉시 수정 (Fix Immediately)

1. **`auth.ts:259`** — Supabase URL을 환경 변수로 이동 (`c.env.SUPABASE_URL`)
2. **`auth.ts:265`** — 401 응답에서 `debug` 필드 제거
3. **`transactions.ts:18`, `102`** — `date`/`month` 쿼리 파라미터 형식 검증 추가 (YYYY-MM 정규표현식)
4. **`wrangler.jsonc`** — `TURSO_AUTH_TOKEN`, `SUPABASE_JWT_SECRET`, `GEMINI_API_KEY`를 `wrangler secret put`으로 이전
5. **`routes/ai.ts:97`, `179`** — 소유권 확인 쿼리에 `isNull(transactions.deletedAt)` 추가

### 빠른 시일 내 수정 (Fix Soon)

6. **`index.ts`** — Hono 전역 에러 핸들러(`app.onError`) 등록으로 ZodError → 400, DB 오류 → 500 처리
7. **`routes/transactions.ts:63`, `113`** — URL 파라미터 ID의 NaN 검증 추가
8. **`db/schema.ts`** — `transactions` 테이블에 `(userId, date)` 복합 인덱스 추가
9. **`routes/ai.ts`** — AI confidence 점수 임계값 체크 추가 (쓰기 액션에 한해)
10. **`routes/transactions.ts`** — GET `/` 에 `.orderBy(desc(transactions.date))` 추가
11. **`routes/ai.ts:143`** — `sql` 태그 직접 사용을 `like()` 연산자로 교체
12. **`routes/ai.ts:29`** — `text` 입력 최대 길이 검증 추가

### 나중에 개선해도 좋은 것 (Nice to Improve Later)

13. **`routes/transactions.ts`** — 페이지네이션 (`limit`/`offset`) 지원 추가
14. **`routes/users.ts`** — `/sync` 엔드포인트에 Zod 입력 검증 추가
15. **`types/ai.ts:49`**, **`routes/ai.ts:114`** — `any` 타입 제거
16. **`services/ai.ts:33`** — AI 모델명을 환경 변수로 이동
17. **`services/messages.ts`** — `generateUndoMessage()` 데드 코드 정리
18. **`routes/ai.ts:22`** — 모듈 레벨 `aiService` 변수 제거, 요청별 인스턴스화로 변경
19. **테스트** — `validation.test.ts` (Zod 스키마), 라우트 통합 테스트 추가
20. **`index.ts`** — `/api/*` 경로에 `Cache-Control: private, no-store` 헤더 추가
