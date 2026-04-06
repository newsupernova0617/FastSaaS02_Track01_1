# FastSaaS02_Track01_1

AI 기반 가계부 챗봇 애플리케이션입니다. 자연어로 가계부를 관리하고, AI가 재무 분석 리포트를 생성해줍니다.

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Frontend | React + Vite + TypeScript |
| Backend | Hono (Cloudflare Workers) |
| Database | Turso (Serverless SQLite) + Drizzle ORM |
| Auth | Supabase (OAuth + JWT) |
| AI | Groq API |
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

> **환경 변수**: 민감 정보(`TURSO_DB_URL`, `TURSO_AUTH_TOKEN`, `SUPABASE_JWT_SECRET`, `GROQ_API_KEY`, `GROQ_MODEL_NAME`)는 `backend/.dev.vars`에 저장합니다. 이 파일은 `.gitignore`에 포함되어 있으므로 git에 올라가지 않습니다.

### 터미널 2: 프론트엔드

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

> **백엔드 포트 충돌 주의**: wrangler dev는 기본 8787 포트를 사용하지만, 이미 점유된 경우 8788 등으로 올라갑니다. 터미널 출력에서 `Ready on http://localhost:XXXX`를 확인하고, `frontend/.env.development`의 `VITE_API_BASE_URL`과 일치시켜야 합니다.

## 환경 변수 파일 구조

| 파일 | 용도 | git 추적 |
| --- | --- | --- |
| `backend/.dev.vars` | 백엔드 시크릿 (로컬 개발용) | ❌ 제외됨 |
| `frontend/.env.development` | 프론트엔드 개발 환경 변수 (`npm run dev` 시 적용) | ❌ 제외됨 |
| `frontend/.env.production` | 프론트엔드 배포 환경 변수 (`npm run build` 시 적용) | ❌ 제외됨 |

## 백엔드 로그 확인 방법

wrangler dev는 **interactive 모드**로 실행되기 때문에, 요청 로그 일부가 터미널 대신 로그 파일에 기록될 수 있습니다.

### 방법 1: wrangler dev 터미널 직접 확인

`npm run dev`를 실행한 **바로 그 터미널 창**에서 요청이 들어올 때마다 로그가 출력됩니다.

```
[wrangler:info] POST /api/ai/action 200 OK (312ms)
[wrangler:info] GET /api/transactions 401 Unauthorized (5ms)
```

### 방법 2: 로그 파일 실시간 추적

별도 터미널에서 wrangler 로그 파일을 tail로 볼 수 있습니다:

```bash
tail -f ~/.config/.wrangler/logs/$(ls -t ~/.config/.wrangler/logs/ | head -1)
```

로그 파일 위치: `~/.config/.wrangler/logs/`

### 방법 3: 포트 점유 프로세스 확인

백엔드 로그가 보이지 않으면, 의도한 wrangler 프로세스가 실제로 해당 포트를 점유하고 있는지 확인하세요:

```bash
lsof -i :8787
# 또는
lsof -i :8788
```

여러 wrangler/vite 프로세스가 떠있으면 정리 후 재시작하세요:

```bash
pkill -f "workerd"
pkill -f "node.*vite"
# 이후 백엔드, 프론트엔드 순서로 재시작
```

<<<<<<< HEAD
## 클라우드 배포 방법

### 백엔드 (Cloudflare Workers)

**1단계: 프로덕션 시크릿 등록 (최초 1회)**

```bash
cd backend
wrangler secret put TURSO_DB_URL
wrangler secret put TURSO_AUTH_TOKEN
wrangler secret put SUPABASE_JWT_SECRET
wrangler secret put GROQ_API_KEY
```

각 명령어 실행 후 터미널에 값을 입력하면 됩니다. 등록된 시크릿은 Cloudflare 대시보드 → Workers → 해당 Worker → Settings → Variables에서 확인할 수 있습니다.

**2단계: 배포**

```bash
cd backend
npm run deploy
```

---

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
| `VITE_API_BASE_URL` | `https://backend.fastsaas2.workers.dev` |

이후 `main` 브랜치에 push할 때마다 자동으로 빌드 및 배포됩니다.

#### 방법 2: 로컬 빌드 후 수동 배포

`.env.production`을 로컬에서 직접 읽어 빌드하므로 Pages 환경변수 설정이 필요 없습니다.

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=fastsaas02-track01-1
```

=======
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
## 기타 명령어

| 명령어 | 위치 | 설명 |
| --- | --- | --- |
| `npm run build` | frontend | 프로덕션 빌드 |
| `npm run deploy` | backend | Cloudflare Workers 배포 |
| `npm run test` | backend | Vitest 테스트 실행 |
<<<<<<< HEAD
| `npm run type-check` | backend | TypeScript 타입 체크 |
=======
| `npm run type-check` | backend | TypeScript 타입 체크 |
>>>>>>> 63fba07758528cfcda93dfe5abdc09497aca712a
