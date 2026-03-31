// backend/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import transactions from './routes/transactions';
import usersRoute from './routes/users';
import aiRouter from './routes/ai';
import { authMiddleware } from './middleware/auth';
import type { Env } from './db/index';
import type { Variables } from './middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS 설정: 이 도메인들의 요청만 허용
// localhost:5173는 개발 환경, capacitor://는 모바일 앱, pages.dev는 프로덕션
app.use('*', cors({
    origin: ['http://localhost:5173', 'capacitor://localhost', 'https://fastsaas02-track01-1.pages.dev'],
}));

// /api/* 경로의 모든 요청은 JWT 검증을 거쳐야 함
// 검증에 실패하면 401 Unauthorized 반환
app.use('/api/*', authMiddleware);

// 라우트 마운트: /api/transactions, /api/users, /api/ai 엔드포인트 등록
app.route('/api/transactions', transactions);
app.route('/api/users', usersRoute);
app.route('/api/ai', aiRouter);

export default app;
