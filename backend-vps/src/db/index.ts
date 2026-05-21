// backend/src/db/index.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import * as schema from './schema';

export type Env = {
  TURSO_DB_URL: string;
  TURSO_AUTH_TOKEN: string;
  SUPABASE_JWT_SECRET: string;
  SUPABASE_URL: string;
  ADMIN_DASHBOARD_PASSWORD?: string;
  // GROQ_API_KEY: string;
  // GROQ_MODEL_NAME?: string;
  AI_STUDIO_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL_NAME?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL_NAME?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL_NAME?: string;
  AI_PROVIDER?: 'ai-studio' | 'gemini' | 'openrouter' | 'openai';
  AI_API_BASE_URL?: string;
  AI_PROXY_SECRET?: string;
  VECTORIZE?: any; // Optional vector DB binding used only in legacy tests
  CLOUDFLARE_ACCOUNT_ID?: string; // For Vectorize API calls
  CLOUDFLARE_API_TOKEN?: string; // For Vectorize API authentication
  ALLOWED_ORIGINS?: string; // Comma-separated list of allowed CORS origins
  ENVIRONMENT?: string; // e.g. 'development' | 'production'
  GOOGLE_PLAY_PACKAGE_NAME?: string;
  GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  GOOGLE_PLAY_ACCESS_TOKEN?: string;
  GOOGLE_PUBSUB_PUSH_AUDIENCE?: string;
  GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL?: string;
  WEB_PUSH_VAPID_PUBLIC_KEY?: string;
  WEB_PUSH_VAPID_PRIVATE_KEY_JWK?: string;
  WEB_PUSH_SUBJECT?: string;
};

export function createDb(client: Client) {
    // Drizzle ORM으로 타입 안전한 쿼리 작성 가능하게 래핑
    return drizzle(client, { schema });
}

let cachedDbKey: string | undefined;
let cachedClient: Client | undefined;
let cachedDb: ReturnType<typeof createDb> | undefined;

export function getDbClient(env: Env) {
    const key = `${env.TURSO_DB_URL}\0${env.TURSO_AUTH_TOKEN}`;

    if (cachedClient && cachedDbKey === key) {
        return cachedClient;
    }

    cachedClient = createClient({
        url: env.TURSO_DB_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    });
    cachedDbKey = key;
    return cachedClient;
}

export function getDb(env: Env) {
    const key = `${env.TURSO_DB_URL}\0${env.TURSO_AUTH_TOKEN}`;

    if (cachedDb && cachedClient && cachedDbKey === key) {
        return cachedDb;
    }

    cachedClient = getDbClient(env);
    cachedDb = createDb(cachedClient);
    return cachedDb;
}
