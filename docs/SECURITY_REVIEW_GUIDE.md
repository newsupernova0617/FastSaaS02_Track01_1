# 보안 핵심 코드 리뷰 가이드

> **목적**: AI 코드 생성 도구(Claude Code 등)를 사용하더라도, 아래 영역은 반드시 **인간이 직접 코드리뷰**해야 합니다.
> 보안 취약점은 "동작하는 코드"와 "안전한 코드"의 차이에서 발생하며, AI는 이 미묘한 차이를 놓칠 수 있습니다.

---

## 목차

1. [인증/인가 (Authentication & Authorization)](#1-인증인가-authentication--authorization)
2. [DB 조작 (Database Operations)](#2-db-조작-database-operations)
3. [보안 (Security Infrastructure)](#3-보안-security-infrastructure)
4. [결제 (Payment)](#4-결제-payment)
5. [리뷰 체크리스트](#5-리뷰-체크리스트)

---

## 1. 인증/인가 (Authentication & Authorization)

**왜 중요한가?** 인증 로직의 한 줄 실수로 전체 시스템이 뚫릴 수 있습니다.

### 1-1. JWT 검증 미들웨어 (최우선 리뷰)

| 항목 | 내용 |
|------|------|
| **파일** | `backend/src/middleware/auth.ts` |
| **역할** | 모든 API 요청의 JWT 토큰을 검증하고, 사용자 ID를 추출 |
| **알고리즘** | ES256 (타원곡선, 권장) → HS256 (HMAC, 폴백) |
| **리뷰 포인트** | |
| ⚠️ **L236-244** | DEV 모드 인증 우회 — `ENVIRONMENT !== 'development'`가 프로덕션에서 보장되는지 확인 |
| 🔍 L40-69 | JWKS 캐싱 (1시간 TTL) — Supabase 키 로테이션 시 최대 1시간 지연 가능 |
| 🔍 L71-155 | ES256 서명 검증 — `crypto.subtle.verify()` 파라미터가 올바른지 |
| 🔍 L144-148 | 토큰 만료 시간(exp) 검증 |
| 🔍 L231-233 | Bearer 토큰 추출 — `Authorization: Bearer <token>` 형식만 허용하는지 |

### 1-2. Flutter 인증 서비스

| 항목 | 내용 |
|------|------|
| **파일** | `flutter_app/lib/core/auth/supabase_auth.dart` |
| **역할** | Supabase SDK를 통한 로그인/회원가입/로그아웃 |
| **리뷰 포인트** | |
| ⚠️ L62-72 | JWT를 SharedPreferences에 평문 저장 — Android 네이티브 코드 연동용이지만, 루팅된 기기에서 노출 가능 |
| 🔍 L45-60 | Supabase 초기화 시 anonKey 노출 여부 (클라이언트에 포함되는 공개키이므로 정상) |
| 🔍 L119-127 | 토큰 갱신 로직 |

### 1-3. HTTP 인터셉터 (토큰 자동 첨부 & 갱신)

| 항목 | 내용 |
|------|------|
| **파일** | `flutter_app/lib/core/api/api_interceptor.dart` |
| **역할** | 모든 HTTP 요청에 JWT 첨부, 401 시 자동 토큰 갱신 |
| **리뷰 포인트** | |
| 🔍 L48-62 | AuthInterceptor — Completer를 사용한 동시 401 처리 (race condition 방지) |
| 🔍 L88-166 | 401 에러 핸들링 — 토큰 갱신 실패 시 로그아웃 처리 |
| 🔍 L76-82 | Bearer 토큰 헤더 첨부 |

---

## 2. DB 조작 (Database Operations)

**왜 중요한가?** 모든 DB 쿼리에 `userId` 필터가 빠지면 다른 사용자의 데이터가 노출됩니다.

### 2-1. 스키마 정의

| 항목 | 내용 |
|------|------|
| **파일** | `backend/src/db/schema.ts` |
| **역할** | 8개 테이블의 Drizzle ORM 스키마 정의 |
| **리뷰 포인트** | |
| 🔍 모든 테이블 | `userId` FK가 존재하고 `notNull()`인지 확인 (knowledgeBase는 공유 데이터라 예외) |
| 🔍 L16-27 | transactions 테이블 — soft delete(`deletedAt`), undo(`previousState`) 필드 |

### 2-2. 라우트별 DB 조작

#### `backend/src/routes/transactions.ts` — 거래 CRUD

| 리뷰 포인트 | 위치 | 설명 |
|-------------|------|------|
| ✅ userId 출처 | L17, L36, L68 | `c.get('userId')` — JWT에서 추출 (정상) |
| ✅ 조회 필터 | L22-27 | `eq(transactions.userId, userId)` 포함 (정상) |
| ✅ 삭제 소유권 | L74-79 | `and(eq(id), eq(userId))` — 본인 거래만 삭제 가능 |
| ✅ soft delete | L76 | `deletedAt` 설정 (hard delete 아님) |
| 🔍 L45 | `any` 타입 사용 — 타입 안전성 확인 필요 |

#### `backend/src/routes/sessions.ts` — 세션 + AI 메시지 처리

| 리뷰 포인트 | 위치 | 설명 |
|-------------|------|------|
| ✅ 세션 소유권 | L147, L279, L342 | `getSession(db, sessionId, userId)` — userId 포함 검증 |
| ✅ 메시지 저장 | L351-360 | userId가 서버에서 설정됨 |
| 🔍 L291-293 | 메시지 조회 시 `sessionId`로만 필터 — 세션 소유권은 L279에서 사전 검증 |
| ⚠️ L288-293 | `chatMessages` 조회에서 `userId` 조건이 빠져있음 — 세션 소유권 사전검증(L279)에 의존 |

#### `backend/src/routes/ai.ts` — 레거시 AI 엔드포인트

| 리뷰 포인트 | 위치 | 설명 |
|-------------|------|------|
| ✅ 세션 소유권 | L120-126 | `getSession(db, sessionId, userId)` → null이면 403 |
| ✅ 거래 조회 | L137-142 | `eq(transactions.userId, userId)` 포함 |
| ✅ 삭제 소유권 | L413-420 | `eq(transactions.userId, userId)` 포함 |

#### `backend/src/routes/reports.ts` — 리포트 CRUD

| 리뷰 포인트 | 위치 | 설명 |
|-------------|------|------|
| ✅ 모든 핸들러 | L28, L63, L89, L135, L172 | `c.get('userId')` 사용 |
| 🔍 ReportService | 별도 파일 | `getReports()`, `getReportDetail()`, `deleteReport()`에 userId 전달 확인 필요 |

#### `backend/src/routes/users.ts` — 사용자 동기화

| 리뷰 포인트 | 위치 | 설명 |
|-------------|------|------|
| ✅ L15, L50 | `c.get('userId')` — JWT에서 추출 |
| 🔍 L24-42 | upsert 로직 — `onConflictDoUpdate` 시 provider 필드는 변경하지 않음 |

#### `backend/src/routes/user-notes.ts` — 사용자 노트 CRUD

| 리뷰 포인트 | 위치 | 설명 |
|-------------|------|------|
| ✅ 모든 핸들러 | L15, L35, L49, L75, L104 | `c.get('userId')` 사용 |
| 🔍 userNotesService | 별도 파일 | 서비스 내부에서 userId 필터링이 제대로 되는지 확인 필요 |

### 2-3. 서비스 레이어 DB 조작

#### `backend/src/services/sessions.ts` — 세션 서비스

| 리뷰 포인트 | 위치 | 설명 |
|-------------|------|------|
| ✅ getSession | L76-85 | `and(eq(id, sessionId), eq(userId, userId))` — 이중 검증 |
| ✅ deleteSession | L140-168 | 소유권 먼저 확인 → 메시지 삭제 → 세션 삭제 |
| 🔍 deleteSession | L149-153 | 메시지 삭제 시 `sessionId`로만 필터 — 세션 소유권 사전검증(L142)에 의존 |

#### `backend/src/services/chat.ts` — 채팅 서비스

| 리뷰 포인트 | 위치 | 설명 |
|-------------|------|------|
| ✅ getChatHistoryBySession | L127-151 | userId가 **필수** 파라미터 (3번째 인자) |
| ✅ getChatHistory | L68-97 | `eq(chatMessages.userId, userId)` 포함 |
| ✅ clearChatHistory | L105-117 | `eq(chatMessages.userId, userId)` 포함 |
| ⚠️ deleteSessionMessages | L160-170 | `sessionId`로만 삭제 — 호출자가 소유권 검증 책임 |

#### `backend/src/services/clarifications.ts` — 명확화 세션

| 리뷰 포인트 | 위치 | 설명 |
|-------------|------|------|
| ✅ getClarification | L50-58 | `and(eq(userId), eq(chatSessionId))` — 이중 필터 |
| ✅ deleteClarification | L133-142 | `and(eq(userId), eq(chatSessionId))` — 이중 필터 |
| 🔍 cleanupExpired | L149-154 | 5분 이상 된 세션 자동 정리 — 시간 기반 삭제 |

### 2-4. DB 마이그레이션 (6개 파일)

| 파일 | 리뷰 포인트 |
|------|------------|
| `migrations/001_add_reports_table.sql` | FK 제약조건, 인덱스 |
| `migrations/002_add_session_id_to_chat_messages.sql` | 세션 인덱스 |
| `migrations/003_create_sessions_table.sql` | userId FK |
| `migrations/004_add_clarification_sessions_table.sql` | userId + sessionId FK |
| `migrations/005_add_user_notes_and_knowledge_base_tables.sql` | userId FK |
| `migrations/006_add_previous_state_to_transactions.sql` | undo용 스냅샷 필드 |

---

## 3. 보안 (Security Infrastructure)

### 3-1. CORS 설정

| 항목 | 내용 |
|------|------|
| **파일** | `backend/src/index.ts` (L22-34) |
| **리뷰 포인트** | |
| 🔍 L26 | 허용 origin 목록에 와일드카드(`*`)가 없는지 확인 |
| 🔍 L28-33 | `ALLOWED_ORIGINS` 환경변수로 동적 설정 — 프로덕션 값 확인 필요 |

### 3-2. Rate Limiting

| 항목 | 내용 |
|------|------|
| **파일** | `backend/src/middleware/rateLimit.ts` |
| **적용 지점** | AI 요청(20/min), 리포트(10/min), 세션 메시지(20/min) |
| **리뷰 포인트** | |
| ⚠️ 전체 | per-isolate 인메모리 방식 — Cloudflare Workers의 여러 isolate에서 각각 독립 카운트 |
| 🔍 L44-48 | 만료된 엔트리 정리 로직 — 메모리 누수 방지 |

### 3-3. 입력 검증 (Zod)

| 항목 | 내용 |
|------|------|
| **파일** | `backend/src/services/validation.ts` |
| **리뷰 포인트** | |
| 🔍 L20-22 | 금액: 양수, 최대 ₩10억 |
| 🔍 L32-33 | 날짜: YYYY-MM-DD 정규식 |
| 🔍 L268-279 | 미래 30일 이내 날짜만 허용 |
| 🔍 L23-26 | 카테고리: 1-50자 |
| 🔍 L27-31 | 메모: 최대 500자, 공백만 불허 |

### 3-4. Semgrep 보안 규칙

| 항목 | 내용 |
|------|------|
| **파일** | `.semgrep.yml` |
| **규칙 수** | 7개 |
| **리뷰 포인트** | |
| 🔍 L3-12 | hardcoded-api-key — API 키 하드코딩 탐지 |
| 🔍 L14-22 | hardcoded-jwt-secret — JWT 시크릿 하드코딩 탐지 |
| 🔍 L24-34 | sql-injection-string-concat — SQL 인젝션 탐지 |
| 🔍 L36-44 | eval-usage — eval() 사용 탐지 |
| 🔍 L46-64 | userid-from-request-body — userId를 body에서 읽는 패턴 탐지 |
| 🔍 L66-78 | direct-req-json-for-userid — userId 구조분해 탐지 |
| 🔍 L80-95 | any-type-in-security-files — 보안 파일에서 any 타입 사용 경고 |

### 3-5. 로깅 미들웨어

| 항목 | 내용 |
|------|------|
| **파일** | `backend/src/middleware/logging.ts` |
| **리뷰 포인트** | |
| 🔍 L17-29 | 요청 본문 로깅 — 민감 정보(비밀번호 등)가 로그에 남지 않는지 확인 |
| 🔍 L44-54 | 응답 본문 로깅 — 큰 응답의 메모리 사용량 |

---

## 4. 결제 (Payment)

**현재 상태: 결제 로직 없음**

이 프로젝트는 개인 재무 "기록" 앱이며, 실제 결제 처리(Stripe, 빌링 등)는 구현되어 있지 않습니다.
향후 결제 기능 추가 시 이 섹션을 업데이트하세요.

---

## 5. 리뷰 체크리스트

### 최우선 (Must Review)

- [ ] `auth.ts` L236-244: DEV 모드 우회가 프로덕션에서 비활성화되는지
- [ ] 모든 라우트에서 `userId = c.get('userId')` 패턴 사용 확인
- [ ] 모든 DB 쿼리에 `where(eq(table.userId, userId))` 존재 확인
- [ ] `sessions.ts` L288-293: 메시지 조회 시 세션 소유권 검증이 충분한지

### 높음 (Should Review)

- [ ] `supabase_auth.dart` L62-72: SharedPreferences JWT 평문 저장의 보안 영향
- [ ] `api_interceptor.dart` L88-166: 동시 401 핸들링 로직의 정확성
- [ ] `chat.ts` L160-170: `deleteSessionMessages`가 userId 없이 삭제하는 것이 안전한지
- [ ] 모든 마이그레이션 SQL의 FK 제약조건

### 중간 (Nice to Review)

- [ ] `rateLimit.ts`: per-isolate 제한의 프로덕션 적합성
- [ ] `.semgrep.yml`: 규칙이 충분한지, 추가 필요한 패턴이 있는지
- [ ] `validation.ts`: 금액/날짜/카테고리 제한값의 비즈니스 적합성
- [ ] `logging.ts`: 민감 정보 로깅 여부

---

## 파일 전체 목록 (19개)

| # | 카테고리 | 파일 경로 |
|---|---------|----------|
| 1 | 인증 | `backend/src/middleware/auth.ts` |
| 2 | 인증 | `flutter_app/lib/core/auth/supabase_auth.dart` |
| 3 | 인증 | `flutter_app/lib/core/api/api_interceptor.dart` |
| 4 | DB | `backend/src/db/schema.ts` |
| 5 | DB | `backend/src/routes/transactions.ts` |
| 6 | DB | `backend/src/routes/sessions.ts` |
| 7 | DB | `backend/src/routes/ai.ts` |
| 8 | DB | `backend/src/routes/reports.ts` |
| 9 | DB | `backend/src/routes/users.ts` |
| 10 | DB | `backend/src/routes/user-notes.ts` |
| 11 | DB | `backend/src/services/sessions.ts` |
| 12 | DB | `backend/src/services/chat.ts` |
| 13 | DB | `backend/src/services/clarifications.ts` |
| 14 | DB/보안 | `backend/src/db/migrations/*.sql` (6개) |
| 15 | 보안 | `backend/src/index.ts` |
| 16 | 보안 | `backend/src/middleware/rateLimit.ts` |
| 17 | 보안 | `backend/src/services/validation.ts` |
| 18 | 보안 | `.semgrep.yml` |
| 19 | 보안 | `backend/src/middleware/logging.ts` |
