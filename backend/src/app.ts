import { Hono } from 'hono';
import { cors } from 'hono/cors';
import transactions from './routes/transactions';
import usersRoute from './routes/users';
import aiRouter from './routes/ai';
import reportsRouter from './routes/reports';
import sessionsRouter from './routes/sessions';
import waitlistRouter from './routes/waitlist';
import contactRequestsRouter from './routes/contact-requests';
import adminContactRequestsRouter from './routes/admin-contact-requests';
import { billingPublicRoutes, billingRoutes } from './routes/billing';
import { userNotesRoutes } from './routes/user-notes';
import { pushAuthRouter, pushPublicRouter } from './routes/push';
import appRouter from './routes/app';
import { authMiddleware } from './middleware/auth';
import { loggingMiddleware } from './middleware/logging';
import type { Env } from './db/index';
import type { Variables } from './middleware/auth';

export const app = new Hono<{ Bindings: Env; Variables: Variables }>();

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
  'https://fastsaas2.fastsaas2.workers.dev',
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
    ])
  );
  return cachedAllowedOrigins;
}

app.get('/', (c) => c.text('Hello! FastSaaS Backend is running!'));

app.use('*', async (c, next) => {
  return cors({ origin: getAllowedOrigins(c.env.ALLOWED_ORIGINS) })(c, next);
});

app.use('*', loggingMiddleware);

app.route('/waitlist', waitlistRouter);
app.route('/admin-api', adminContactRequestsRouter);
app.route('/billing', billingPublicRoutes);

app.use('/api/*', authMiddleware);

app.route('/api/transactions', transactions);
app.route('/api/users', usersRoute);
app.route('/api/ai', aiRouter);
app.route('/api/app', appRouter);
app.route('/api/app/push', pushAuthRouter);
app.route('/api/app/push', pushPublicRouter);
app.route('/api/reports', reportsRouter);
app.route('/api/sessions', sessionsRouter);
app.route('/api/contact-requests', contactRequestsRouter);
app.route('/api/billing', billingRoutes);

app.route('/api/notes', userNotesRoutes());

app.onError((err, c) => {
  if (err.name === 'ZodError') {
    return c.json({ error: 'Validation failed', details: JSON.parse(err.message) }, 400);
  }
  console.error('[Server Error]', err);
  return c.json({ error: err.message ?? 'Internal Server Error' }, 500);
});

export type AppType = typeof app;
