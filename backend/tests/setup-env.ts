import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvForTests() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value) process.env[key] = value;
      }
    });
  }
}

loadEnvForTests();

// Deterministic overrides — always win over .env for hermetic tests
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-please-do-not-use-in-production-x'.padEnd(64, 'x');
process.env.SUPABASE_URL = 'http://supabase.test.invalid';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.AI_PROVIDER = 'openai';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.OPENAI_MODEL_NAME = 'gpt-4o-mini';
process.env.ENVIRONMENT = 'test';
process.env.TURSO_DB_URL = 'file::memory:?cache=shared';
process.env.TURSO_AUTH_TOKEN = '';
