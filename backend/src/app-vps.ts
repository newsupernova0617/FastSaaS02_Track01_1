import { Hono } from 'hono';
import { cors } from 'hono/cors';
import aiRouter from './routes/ai';
import reportsRouter from './routes/reports';
import sessionsRouter from './routes/sessions';
import { pushPublicRouter } from './routes/push';
import appRouter from './routes/app';
import { authMiddleware } from './middleware/auth';
import { loggingMiddleware } from './middleware/logging';
import type { Env } from './db/index';
import type { Variables } from './middleware/auth';
import { isDirectAiRoute } from './runtime/ai-routing';

export const vpsApp = new Hono<{ Bindings: Env; Variables: Variables }>();

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'capacitor://localhost',
  'https://easyaibudget.com',
  'https://fastsaas02-track01-1.pages.dev',
  'https://landing-page-7hu.pages.dev',
];

let cachedOriginsRaw: string | undefined;
let cachedAllowedOrigins = DEFAULT_ALLOWED_ORIGINS;

function getAllowedOrigins(envOrigins: string | undefined): string[] {
  if (!envOrigins) return DEFAULT_ALLOWED_ORIGINS;
  if (cachedOriginsRaw === envOrigins) return cachedAllowedOrigins;

  cachedOriginsRaw = envOrigins;
  cachedAllowedOrigins = Array.from(
    new Set([
      ...DEFAULT_ALLOWED_ORIGINS,
      ...envOrigins
        .split(',')
        .map((origin: string) => origin.trim())
        .filter(Boolean),
    ]),
  );
  return cachedAllowedOrigins;
}

vpsApp.get('/', (c) => c.text('Hello! FastSaaS AI VPS Backend is running!'));

vpsApp.use('*', async (c, next) => {
  return cors({ origin: getAllowedOrigins(c.env.ALLOWED_ORIGINS) })(c, next);
});

vpsApp.use('*', loggingMiddleware);

vpsApp.use('/api/*', async (c, next) => {
  if (!isDirectAiRoute(c.req.raw)) {
    return c.json({ error: 'Not found' }, 404);
  }

  return next();
});

vpsApp.use('/api/ai/*', authMiddleware);
vpsApp.use('/api/sessions/*', authMiddleware);
vpsApp.use('/api/app/*', async (c, next) => {
  if (c.req.path === '/api/app/push/reply') {
    return next();
  }

  return authMiddleware(c, next);
});
vpsApp.use('/api/reports/*', authMiddleware);

vpsApp.route('/api/ai', aiRouter);
vpsApp.route('/api/sessions', sessionsRouter);
vpsApp.route('/api/app', appRouter);
vpsApp.route('/api/app/push', pushPublicRouter);
vpsApp.route('/api/reports', reportsRouter);

vpsApp.notFound((c) => c.json({ error: 'Not found' }, 404));

vpsApp.onError((err, c) => {
  if (err.name === 'ZodError') {
    return c.json({ error: 'Validation failed', details: JSON.parse(err.message) }, 400);
  }

  console.error('[AI VPS Error]', err);
  return c.json({ error: err.message ?? 'Internal Server Error' }, 500);
});
