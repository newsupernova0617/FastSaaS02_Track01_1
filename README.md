# FastSaaS02_Track01_1

AI 기반 가계부 챗봇 애플리케이션입니다. 자연어로 가계부를 관리하고, AI가 재무 분석 리포트를 생성해줍니다.

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Frontend | React + Vite + TypeScript |
| Backend | Hono (Cloudflare Workers) |
| Database | Turso (Serverless SQLite) + Drizzle ORM |
| Auth | Supabase (OAuth + JWT) |
| AI | OpenAI / Gemini / OpenRouter |
| Mobile | Capacitor |

## 개발 서버 실행 방법

백엔드와 프론트엔드를 **각각 별도의 터미널**에서 실행해야 합니다.

### 터미널 1: 백엔드

```bash
cd backend
npm install      # 최초 1회
npm run dev      # wrangler dev 실행
```

백엔드 API 서버 주소:
```
http://localhost:8787
```

> **환경 변수**: 민감 정보(`TURSO_DB_URL`, `TURSO_AUTH_TOKEN`, `SUPABASE_JWT_SECRET`, `SUPABASE_URL`)는 `backend/.dev.vars`에 저장합니다. AI는 `AI_PROVIDER=openai|gemini|openrouter` 중 하나와 해당 API 키를 사용합니다. AI 직접 호출 경로를 VPS로 분리하려면 `AI_API_BASE_URL=http://localhost:8788` 같은 값을 같이 둡니다.

### 터미널 2: AI VPS 백엔드

```bash
cd backend-vps
npm install      # 최초 1회
npm run dev      # tsx watch src/server.ts
```

AI VPS 서버 주소:
```
http://localhost:8788
```

> **직접 분리 대상**: `POST /api/ai/action`, `POST /api/sessions/:sessionId/messages`, `POST /api/app/chat`, `POST /api/app/push/reply`, 리포트 `current/generate` 경로만 `backend-vps`로 프록시됩니다.

### 터미널 3: 프론트엔드

```bash
cd frontend
npm install      # 최초 1회
npm run dev      # vite 실행
```

웹 앱 접속 주소:
```
http://localhost:5173
```

> **포트 충돌**: 5173 포트가 이미 사용 중이면 Vite가 자동으로 5174, 5175 등으로 시도합니다. 터미널에 출력된 주소를 확인하세요.

> **백엔드 포트 충돌 주의**: `wrangler dev`는 보통 `8787`을 사용하지만 점유 상태에 따라 다른 포트로 올라갈 수 있습니다. 터미널에 출력된 주소를 기준으로 `frontend/.env.development`의 `VITE_API_BASE_URL`을 맞추세요.

## 환경 변수 파일 구조

| 파일 | 용도 | git 추적 |
| --- | --- | --- |
| `backend/.dev.vars` | Workers 백엔드 시크릿 / 로컬 설정 | ❌ 제외됨 |
| `backend-vps/.env` | AI VPS 백엔드 로컬 설정 | ❌ 제외됨 |
| `backend-vps/.dev.vars` | AI VPS 백엔드 로컬 설정 호환용 | ❌ 제외됨 |
| `frontend/.env.development` | 프론트엔드 개발 환경 변수 (`npm run dev` 시 적용) | ❌ 제외됨 |
| `frontend/.env.production` | 프론트엔드 배포 환경 변수 (`npm run build` 시 적용) | ❌ 제외됨 |

## 백엔드 로그 확인 방법

`wrangler dev`는 로컬 Worker 런타임으로 실행되며, 요청 로그는 실행 터미널에서 확인할 수 있습니다.

### 방법 1: dev 터미널 직접 확인

`npm run dev`를 실행한 **바로 그 터미널 창**에서 요청이 들어올 때마다 로그가 출력됩니다.

### 방법 2: 포트 점유 프로세스 확인

백엔드 로그가 보이지 않으면, 의도한 Worker 개발 서버가 실제로 해당 포트를 점유하고 있는지 확인하세요:

```bash
lsof -i :8787
```

포트가 이미 사용 중이면 `wrangler dev --port <port>` 로 실행하거나 점유 프로세스를 정리하세요.

## 배포 방법

### 백엔드 (Cloudflare Workers)

1. `backend/.dev.vars` 또는 Wrangler secrets에 다음 값을 설정합니다:
   - `TURSO_DB_URL`
   - `TURSO_AUTH_TOKEN`
   - `SUPABASE_JWT_SECRET`
   - `SUPABASE_URL`
   - `AI_API_BASE_URL`
   - `AI_PROVIDER`
   - `OPENAI_API_KEY` / `GEMINI_API_KEY` / `OPENROUTER_API_KEY` 중 사용 중인 provider에 맞는 값
2. 배포합니다:

```bash
cd backend
npm run deploy
```

### AI 백엔드 (VPS)

1. `backend-vps/.env` 또는 서버 환경변수에 다음 값을 설정합니다:
   - `TURSO_DB_URL`
   - `TURSO_AUTH_TOKEN`
   - `SUPABASE_JWT_SECRET`
   - `SUPABASE_URL`
   - `AI_PROVIDER`
   - `OPENAI_API_KEY` / `GEMINI_API_KEY` / `OPENROUTER_API_KEY`
2. 서버에서 실행합니다:

```bash
cd backend-vps
npm run start
```

### 프론트엔드 (Cloudflare Pages)

#### 방법 1: GitHub 연동 자동 배포 (권장)

1. Cloudflare 대시보드 → Pages → 프로젝트 생성 → GitHub 저장소 연결
2. 빌드 설정:

| 항목 | 값 |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `frontend` |

3. 환경 변수 등록 (`.env.production`은 gitignore 되어 있어 Pages 빌드 환경에 없으므로 직접 입력):

| 키 | 값 |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_BASE_URL` | `https://your-worker-name.your-subdomain.workers.dev` |

이후 `main` 브랜치에 push할 때마다 자동으로 빌드 및 배포됩니다.

#### 방법 2: 로컬 빌드 후 수동 배포

`.env.production`을 로컬에서 직접 읽어 빌드하므로 Pages 환경변수 설정이 필요 없습니다.

```bash
cd frontend
npm run build
# deploy with your Pages workflow or static hosting provider
```

## 기타 명령어

| 명령어 | 위치 | 설명 |
| --- | --- | --- |
| `npm run build` | frontend | 프로덕션 빌드 |
| `npm run deploy` | backend | Cloudflare Workers 배포 |
| `npm run start` | backend-vps | 직접 AI API용 VPS 서버 실행 |
| `npm run test` | backend | Vitest 테스트 실행 |
| `npm run type-check` | backend | TypeScript 타입 체크 |
