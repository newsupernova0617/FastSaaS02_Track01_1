import { Hono } from 'hono';
import { cors } from 'hono/cors';
import transactions from './routes/transactions';

const app = new Hono();

<<<<<<< HEAD
app.use('*', cors({ origin: ['http://localhost:5173', 'capacitor://localhost', 'https://fastsaas02-track01-1.pages.dev'] }));
=======
app.use('*', cors({ origin: ['http://localhost:5173', 'https://fastsaas02-track01-1.pages.dev/', 'capacitor://localhost'] }));
>>>>>>> df7e3ac (add backend diagram)
app.route('/api/transactions', transactions);

export default app;
