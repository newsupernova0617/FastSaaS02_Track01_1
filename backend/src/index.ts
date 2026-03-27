// backend/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import transactions from './routes/transactions';
import usersRoute from './routes/users';
import { authMiddleware } from './middleware/auth';
import type { Env } from './db/index';
import type { Variables } from './middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', cors({
    origin: ['http://localhost:5173', 'capacitor://localhost', 'https://fastsaas02-track01-1.pages.dev'],
}));

// All /api/* routes require a valid Supabase JWT
app.use('/api/*', authMiddleware);

app.route('/api/transactions', transactions);
app.route('/api/users', usersRoute);

export default app;
