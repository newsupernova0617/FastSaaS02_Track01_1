// backend/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import transactions from './routes/transactions';
import usersRoute from './routes/users';
import aiRouter from './routes/ai';
import reportsRouter from './routes/reports';
import sessionsRouter from './routes/sessions';
import waitlistRouter from './routes/waitlist';
import contactRequestsRouter from './routes/contact-requests';
import { userNotesRoutes } from './routes/user-notes';
import { userNotesService } from './services/user-notes';
import { VectorizeService } from './services/vectorize';
import { authMiddleware } from './middleware/auth';
import { loggingMiddleware } from './middleware/logging';
import type { Env } from './db/index';
import type { Variables } from './middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// 루트 경로 설정: 서버 작동 확인용
app.get('/', (c) => c.text('Hello! FastSaaS Backend is running!'));

// CORS 설정: 이 도메인들의 요청만 허용
// localhost:5173는 개발 환경, localhost:3000은 Flutter 웹 개발 환경
// capacitor://는 모바일 앱, pages.dev는 프로덕션
// ALLOWED_ORIGINS env var (comma-separated) overrides the defaults when set
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4321',
  'http://localhost:3000',
  'capacitor://localhost',
  'https://fastsaas02-track01-1.pages.dev',
  'https://landing-page-7hu.pages.dev',
  'https://fastsaas2.fastsaas2.workers.dev',
];
let cachedOriginsRaw: string | undefined;
let cachedAllowedOrigins = DEFAULT_ALLOWED_ORIGINS;

function getAllowedOrigins(envOrigins: string | undefined): string[] {
  if (!envOrigins) return DEFAULT_ALLOWED_ORIGINS;
  if (cachedOriginsRaw === envOrigins) return cachedAllowedOrigins;

  cachedOriginsRaw = envOrigins;
  cachedAllowedOrigins = envOrigins
    .split(',')
    .map((origin: string) => origin.trim())
    .filter(Boolean);
  return cachedAllowedOrigins;
}

app.use('*', async (c, next) => {
  return cors({ origin: getAllowedOrigins(c.env.ALLOWED_ORIGINS) })(c, next);
});

// 로깅 미들웨어: 모든 요청/응답 기록
app.use('*', loggingMiddleware);

// 공개 엔드포인트 (authMiddleware 이전에 마운트) — /waitlist는 /api/* 패턴에 매칭되지 않음
app.route('/waitlist', waitlistRouter);

// /api/* 경로의 모든 요청은 JWT 검증을 거쳐야 함
// 검증에 실패하면 401 Unauthorized 반환
app.use('/api/*', authMiddleware);

// 라우트 마운트: /api/transactions, /api/users, /api/ai 엔드포인트 등록
app.route('/api/transactions', transactions);
app.route('/api/users', usersRoute);
app.route('/api/ai', aiRouter);
app.route('/api/reports', reportsRouter);
app.route('/api/sessions', sessionsRouter);
app.route('/api/contact-requests', contactRequestsRouter);

// User Notes 라우트 마운트
// VectorizeService는 각 요청에서 env를 통해 초기화되어야 함
// 테스트 환경에서는 빈 credentials으로 초기화되고, 프로덕션에서는 env에서 로드됨
const vectorizeServiceForNotes = new VectorizeService('', '');
const notesServiceForNotes = userNotesService(vectorizeServiceForNotes);
app.route('/api/notes', userNotesRoutes(notesServiceForNotes));

// 전역 에러 핸들러: 모든 라우트에서 발생하는 에러를 JSON으로 통일
// ZodError (입력값 검증 실패) → 400 Bad Request
// 그 외 에러 → 500 Internal Server Error
app.onError((err, c) => {
  if (err.name === 'ZodError') {
    return c.json({ error: 'Validation failed', details: JSON.parse(err.message) }, 400);
  }
  console.error('[Server Error]', err);
  return c.json({ error: err.message ?? 'Internal Server Error' }, 500);
});

// Required environment variables — validated at request time (Workers start without env access)
const REQUIRED_ENV_VARS: (keyof Env)[] = [
  'SUPABASE_JWT_SECRET',
  'TURSO_DB_URL',
  'TURSO_AUTH_TOKEN',
  'SUPABASE_URL',
];

let envValidated = false;

function validateEnv(env: Env): void {
  if (envValidated) return;
  const missing = REQUIRED_ENV_VARS.filter((key) => !env[key]);
  if (missing.length > 0) {
    console.error(
      `[Startup] Missing required environment variables: ${missing.join(', ')}. ` +
        'Requests may fail. Set these via wrangler secret or .dev.vars.'
    );
  } else {
    console.log('[Startup] All required environment variables are present.');
  }
  envValidated = true;
}

export default {
  fetch(request: Request, env: Env, ctx: Parameters<typeof app.fetch>[2]): Response | Promise<Response> {
    validateEnv(env);
    return app.fetch(request, env, ctx);
  },
};
