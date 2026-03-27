# 인증 기능 설계 문서

**날짜**: 2026-03-27
**스택**: Supabase Auth (Google + Kakao) / Hono (Cloudflare Workers) / Turso (libSQL + Drizzle)

---

## 개요

기존 단일 사용자 가계부 앱에 멀티유저 소셜 로그인을 추가한다. Supabase를 통해 Google과 카카오톡 OAuth를 지원하며, 유저 정보는 Turso에 저장한다. 각 유저는 본인의 거래내역만 접근할 수 있다.

**이메일 로그인은 지원하지 않는다.**

---

## 아키텍처

### 인증 플로우

```
[사용자] → 소셜 로그인 버튼 클릭
    → Supabase OAuth (Google / Kakao)
    → 리다이렉트 콜백 처리 (웹: URL fragment / 모바일: 딥링크)
    → POST /api/users/sync  (Authorization: Bearer <JWT>)
    → Hono Workers: JWT 검증 → Turso users upsert
    → 이후 모든 API 요청: Authorization: Bearer <token>
    → Workers: JWT 검증 → user_id 추출 → 본인 데이터만 접근
```

### 웹 vs 모바일 콜백

| 환경 | 리다이렉트 URL | 처리 방식 |
|------|--------------|----------|
| 웹 (Cloudflare Pages) | `https://fastsaas02-track01-1.pages.dev/auth/callback` | Supabase JS SDK가 URL fragment에서 토큰 파싱 |
| 모바일 (Capacitor) | `com.fastsaas02.app://auth/callback` | `@capacitor/browser` + `App.addListener('appUrlOpen', ...)` |

---

## 데이터 모델

### users 테이블 (신규)

```sql
CREATE TABLE users (
  id         TEXT PRIMARY KEY,        -- Supabase user UUID
  email      TEXT,                    -- 소셜 계정 이메일 (nullable)
  name       TEXT,                    -- 표시 이름
  avatar_url TEXT,                    -- 프로필 이미지 URL
  provider   TEXT NOT NULL,           -- 'google' | 'kakao'
  created_at TEXT DEFAULT (datetime('now'))
);
```

### transactions 테이블 변경

```sql
-- 기존 컬럼에 추가
user_id TEXT NOT NULL REFERENCES users(id)
```

> 기존 데이터가 있다면 drizzle-kit migrate로 마이그레이션 처리

### Drizzle 스키마 (`backend/src/db/schema.ts`)

```ts
export const users = sqliteTable('users', {
  id:        text('id').primaryKey(),
  email:     text('email'),
  name:      text('name'),
  avatarUrl: text('avatar_url'),
  provider:  text('provider').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const transactions = sqliteTable('transactions', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    text('user_id').notNull().references(() => users.id),
  type:      text('type', { enum: ['income', 'expense'] }).notNull(),
  amount:    integer('amount').notNull(),
  category:  text('category').notNull(),
  memo:      text('memo'),
  date:      text('date').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
```

---

## API 설계

### 신규 엔드포인트

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/users/sync` | 필수 | 로그인 후 유저 upsert |
| GET | `/api/users/me` | 필수 | 현재 유저 정보 조회 |

### 기존 엔드포인트 변경

모든 `/api/transactions` 라우트에 auth 미들웨어 적용:

| Method | Path | 변경 사항 |
|--------|------|----------|
| GET | `/api/transactions` | `WHERE user_id = :userId` 필터 추가 |
| POST | `/api/transactions` | `user_id` 자동 주입 |
| DELETE | `/api/transactions/:id` | `WHERE id = :id AND user_id = :userId` |
| GET | `/api/transactions/summary` | `WHERE user_id = :userId` 필터 추가 |

### JWT 검증 미들웨어 (`backend/src/middleware/auth.ts`)

- Supabase JWT secret(`SUPABASE_JWT_SECRET`)으로 서명 검증
- Web Crypto API 사용 (Workers 환경, 외부 SDK 불필요)
- 검증 성공 시 `c.set('userId', payload.sub)` 저장
- 실패 시 401 반환

`SUPABASE_JWT_SECRET`은 `wrangler.jsonc`의 `vars`에 추가한다.

---

## 프론트엔드 구조

### 신규 파일

```
frontend/src/
├── pages/
│   ├── LoginPage.tsx        # 구글/카카오 버튼
│   └── AuthCallback.tsx     # OAuth 콜백 처리 + /api/users/sync 호출
├── context/
│   └── AuthContext.tsx      # useAuth hook, 세션 상태 관리
└── lib/
    └── supabase.ts          # Supabase client 초기화
```

### 라우팅 (`App.tsx`)

```
/login          → LoginPage (비인증 접근 가능)
/auth/callback  → AuthCallback
/record         → 인증 필요 (미로그인 시 /login 리다이렉트)
/calendar       → 인증 필요
/stats          → 인증 필요
```

### Capacitor 딥링크 설정

- `capacitor.config.ts`에 custom URL scheme 등록: `com.fastsaas02.app`
- `@capacitor/browser`로 OAuth 팝업 열고 딥링크로 콜백 수신
- `App.addListener('appUrlOpen', ...)` 으로 토큰 파싱

---

## 에러 처리

| 상황 | 처리 |
|------|------|
| sync 실패 | 재시도 1회 후 로그인 페이지로 이동 |
| JWT 만료 | Supabase auto-refresh → 실패 시 /login |
| 백엔드 401 | 세션 초기화 후 /login 리다이렉트 |
| 카카오 미설정 | Supabase 콘솔에서 provider 활성화 필요 (환경설정 별도) |

---

## 패키지 추가

### Frontend

```
@supabase/supabase-js
@capacitor/browser   # 모바일 OAuth 팝업
```

### Backend

추가 패키지 없음 (Web Crypto API로 JWT 검증)

---

## 환경변수

### Frontend (`.env`)

```
VITE_SUPABASE_URL=<supabase project url>
VITE_SUPABASE_ANON_KEY=<supabase anon key>
VITE_API_BASE_URL=<cloudflare workers url>
```

### Backend (`wrangler.jsonc` vars)

```
SUPABASE_JWT_SECRET=<supabase jwt secret>
TURSO_DB_URL=<already set>
TURSO_AUTH_TOKEN=<already set>
```

---

## 배포 체크리스트

- [ ] Supabase 콘솔: Google OAuth provider 활성화
- [ ] Supabase 콘솔: Kakao OAuth provider 활성화
- [ ] Supabase 콘솔: 리다이렉트 URL 등록 (웹 + 딥링크)
- [ ] Cloudflare Pages: env vars 설정
- [ ] wrangler.jsonc: `SUPABASE_JWT_SECRET` 추가
- [ ] drizzle-kit: DB 마이그레이션 실행
