# Budget App — Backend Architecture

백엔드 시스템의 아키텍처, 폴더 구조, 데이터 흐름을 하나의 문서로 정리합니다.
각 외부 서비스(Cloudflare Workers, Turso, Supabase, Hono)가 시스템에 어떤 역할로 관여하는지 다이어그램과 함께 설명합니다.

---

## 1. System Architecture (시스템 아키텍처)

```mermaid
graph TB
    subgraph Client["👤 클라이언트"]
        Web["🌐 웹 브라우저<br/>(Vite + React)"]
        Mobile["📱 모바일 앱<br/>(Capacitor)"]
    end

    subgraph Auth["🔐 인증 서비스"]
        Supabase["Supabase Auth<br/>· OAuth 로그인 (Google / Kakao)<br/>· JWT 발급<br/>· JWKS 공개키 제공"]
    end

    subgraph Edge["⚡ Cloudflare Workers"]
        Hono["Hono Framework<br/>· 라우팅 & 미들웨어<br/>· CORS 처리<br/>· JWT 검증"]
        Routes["API Routes<br/>· /api/users/*<br/>· /api/transactions/*"]
    end

    subgraph DB["🗄️ 데이터베이스"]
        Turso["Turso (libSQL)<br/>· SQLite 호스팅<br/>· Edge 최적화<br/>· Drizzle ORM 연동"]
    end

    Web  -- "1. OAuth 로그인 요청" --> Supabase
    Mobile -- "1. OAuth 로그인 요청" --> Supabase
    Supabase -- "2. JWT 토큰 발급" --> Web
    Supabase -- "2. JWT 토큰 발급" --> Mobile

    Web -- "3. API 요청<br/>Authorization: Bearer JWT" --> Hono
    Mobile -- "3. API 요청<br/>Authorization: Bearer JWT" --> Hono

    Hono -- "4. JWKS 공개키로<br/>JWT 서명 검증" --> Supabase
    Hono --> Routes
    Routes -- "5. SQL 쿼리<br/>(Drizzle ORM)" --> Turso
    Turso -- "6. 결과 반환" --> Routes

    %% 스타일
    classDef client fill:#4A90D9,stroke:#2D6EB5,color:#fff,rx:12px;
    classDef auth fill:#6C5CE7,stroke:#5A4BD1,color:#fff,rx:12px;
    classDef edge fill:#FF8C42,stroke:#E07530,color:#fff,rx:12px;
    classDef db fill:#27AE60,stroke:#1E8449,color:#fff,rx:12px;

    class Web,Mobile client;
    class Supabase auth;
    class Hono,Routes edge;
    class Turso db;
```

### 각 스택의 역할 요약

| 스택 | 역할 | 데이터 흐름에서의 위치 |
|------|------|----------------------|
| **Cloudflare Workers** | 서버리스 런타임 환경. 전 세계 Edge에서 코드 실행 | 모든 API 요청의 진입점 (컴퓨팅) |
| **Hono** | 경량 웹 프레임워크. 라우팅, 미들웨어, CORS 처리 | Workers 위에서 HTTP 요청을 받아 분배 |
| **Supabase** | OAuth 로그인 + JWT 발급/검증용 공개키(JWKS) 제공 | 인증 계층 (로그인 ↔ 토큰 검증) |
| **Turso** | SQLite 기반 분산 DB. Edge 환경에 최적화 | 데이터 저장소 (유저, 거래내역) |
| **Drizzle ORM** | 타입 안전한 SQL 빌더. 스키마 정의 + 마이그레이션 | 백엔드 ↔ DB 사이의 쿼리 추상화 계층 |

---

## 2. Folder Structure (폴더 구조)

```mermaid
graph TD
    Backend["backend/"]

    Backend --- PkgJson("package.json")
    Backend --- Wrangler("wrangler.jsonc")
    Backend --- DrizzleCfg("drizzle.config.ts")
    Backend --- TsConfig("tsconfig.json")

    Backend --- Drizzle["drizzle/"]
    Backend --- Src["src/"]

    Drizzle --- Migration0("0000_calm_ben_grimm.sql")
    Drizzle --- Migration1("0001_pretty_jamie_braddock.sql")
    Drizzle --- Meta["meta/"]

    Src --- SrcIndex("index.ts — 앱 진입점")

    Src --- DbDir["db/"]
    Src --- MwDir["middleware/"]
    Src --- RtDir["routes/"]

    DbDir --- DbIndex("index.ts — DB 연결")
    DbDir --- DbSchema("schema.ts — 테이블 정의")

    MwDir --- MwAuth("auth.ts — JWT 검증")
    MwDir --- MwTest("auth.test.ts")

    RtDir --- RtTx("transactions.ts — 가계부 API")
    RtDir --- RtUser("users.ts — 사용자 API")

    classDef mainFolder fill:#2D7B93,stroke:#2D7B93,color:#fff,rx:8px,font-weight:bold;
    classDef folder fill:#DE9033,stroke:#DE9033,color:#fff,rx:8px,font-weight:bold;
    classDef subFolder fill:#65A8B2,stroke:#65A8B2,color:#fff,rx:8px,font-weight:bold;
    classDef file fill:#BDBDBD,stroke:#BDBDBD,color:#333,rx:8px;

    class Backend mainFolder;
    class Drizzle,Src folder;
    class DbDir,MwDir,RtDir,Meta subFolder;
    class PkgJson,Wrangler,DrizzleCfg,TsConfig,Migration0,Migration1,SrcIndex,DbIndex,DbSchema,MwAuth,MwTest,RtTx,RtUser file;
```

---

## 3. Data Flow (데이터 흐름)

사용자가 로그인하고, 가계부 내역을 조회하는 전체 플로우입니다.

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 사용자
    participant FE as 🌐 프론트엔드<br/>(React)
    participant SB as 🔐 Supabase<br/>(Auth)
    participant G as 🏢 Google/Kakao<br/>(OAuth Provider)
    participant CF as ⚡ Cloudflare<br/>Workers (Hono)
    participant DB as 🗄️ Turso<br/>(SQLite)

    Note over U,DB: === OAuth 로그인 플로우 ===

    U->>FE: 구글/카카오 로그인 버튼 클릭
    FE->>SB: signInWithOAuth({ provider })
    SB->>G: OAuth 인증 페이지로 리다이렉트
    G->>U: 구글/카카오 로그인 화면 표시
    U->>G: 아이디/비밀번호 입력
    G->>SB: 인증 코드 전달
    SB->>FE: JWT(access_token) 발급 & 리다이렉트

    Note over U,DB: === 사용자 정보 동기화 ===

    FE->>CF: POST /api/users/sync<br/>Authorization: Bearer JWT
    CF->>SB: JWKS 공개키 요청 (캐싱)
    SB-->>CF: ES256 공개키 반환
    CF->>CF: JWT 서명 검증 → userId 추출
    CF->>DB: UPSERT users 테이블
    DB-->>CF: 성공
    CF-->>FE: { success: true }

    Note over U,DB: === 가계부 데이터 CRUD ===

    U->>FE: 지출 내역 조회 요청
    FE->>CF: GET /api/transactions?date=2026-03<br/>Authorization: Bearer JWT
    CF->>CF: JWT 검증 → userId 추출
    CF->>DB: SELECT * FROM transactions<br/>WHERE user_id = ? AND date LIKE '2026-03%'
    DB-->>CF: 거래 내역 배열
    CF-->>FE: JSON 응답
    FE->>U: 화면에 내역 표시
```

---

## 4. 기술 스택 연결 상세

### Cloudflare Workers (런타임)
- 모든 백엔드 코드가 실행되는 **서버리스 환경**
- `wrangler.jsonc`에 환경 변수(Turso URL, Supabase Secret) 설정
- 전 세계 Edge 노드에서 실행되어 **저지연 응답** 제공

### Hono (웹 프레임워크)
- Cloudflare Workers 위에서 돌아가는 **초경량 라우터**
- `src/index.ts`에서 CORS, 인증 미들웨어, 라우트를 조립
- 미들웨어 체인: `CORS → authMiddleware → Route Handler`

### Supabase (인증)
- 프론트엔드에서 **OAuth 로그인**(Google/Kakao)을 처리
- JWT 토큰을 발급하고, 백엔드는 **JWKS 공개키**로 토큰 진위를 검증
- 백엔드는 Supabase DB를 사용하지 않고 **인증 기능만** 활용

### Turso + Drizzle ORM (데이터 저장)
- **Turso**: Edge 환경에 최적화된 SQLite 호스팅 서비스 (libSQL 프로토콜)
- **Drizzle ORM**: TypeScript 타입 안전 쿼리 빌더 + 마이그레이션 관리
- `db/schema.ts`에서 `users`, `transactions` 테이블 정의
- `db/index.ts`에서 Turso 클라이언트를 Drizzle로 래핑하여 사용
