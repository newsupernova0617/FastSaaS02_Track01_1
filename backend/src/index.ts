import { Hono } from 'hono';
import { cors } from 'hono/cors';
import transactions from './routes/transactions';

const app = new Hono();

app.use('*', cors({ origin: ['http://localhost:5173', 'capacitor://localhost'] }));
app.route('/api/transactions', transactions);

export default app;
