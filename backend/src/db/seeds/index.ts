import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getDb, type Env } from '../index';
import { seedKnowledgeBase } from './knowledge-base';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load environment variables from .env or .dev.vars file
 */
function loadEnv() {
  const envFiles = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../.dev.vars'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../../.dev.vars'),
  ];

  for (const envPath of envFiles) {
    if (fs.existsSync(envPath)) {
      console.log(`Loading environment from ${envPath}`);
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=');
          if (key && value) {
            process.env[key] = value;
          }
        }
      });
      return;
    }
  }
}

async function runSeeds() {
  console.log('Running database seeds...');

  // Load environment variables from .env or .dev.vars
  loadEnv();

  // Get database configuration from environment
  const env: Env = {
    TURSO_DB_URL: process.env.TURSO_DB_URL || '',
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || '',
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || '',
  };

  if (!env.TURSO_DB_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error('Missing required environment variables: TURSO_DB_URL and TURSO_AUTH_TOKEN');
  }

  const db = getDb(env);

  await seedKnowledgeBase(db);

  console.log('All seeds completed successfully');
}

runSeeds().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
