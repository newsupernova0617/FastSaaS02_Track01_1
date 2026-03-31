import { config } from 'dotenv';
config({ path: '.dev.vars' });

console.log('TURSO_DB_URL:', process.env.TURSO_DB_URL ? 'SET' : 'NOT SET');
console.log('TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? 'SET' : 'NOT SET');
