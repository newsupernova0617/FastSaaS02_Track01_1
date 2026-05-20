import fs from 'node:fs';
import path from 'node:path';
import type { Env } from '../db/index';

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key) {
      parsed[key] = value;
    }
  }

  return parsed;
}

function loadLocalEnv(): Record<string, string> {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, '.env'),
    path.resolve(cwd, '.dev.vars'),
    path.resolve(cwd, '..', '.env'),
    path.resolve(cwd, '..', '.dev.vars'),
  ];

  return candidates.reduce<Record<string, string>>((acc, candidate) => {
    return { ...acc, ...parseEnvFile(candidate) };
  }, {});
}

function getString(env: Record<string, string | undefined>, key: string, fallback = ''): string {
  return env[key] ?? fallback;
}

export function buildRuntimeEnv(): Env {
  const fileEnv = loadLocalEnv();
  const merged = { ...fileEnv, ...process.env } as Record<string, string | undefined>;

  return {
    TURSO_DB_URL: getString(merged, 'TURSO_DB_URL'),
    TURSO_AUTH_TOKEN: getString(merged, 'TURSO_AUTH_TOKEN'),
    SUPABASE_JWT_SECRET: getString(merged, 'SUPABASE_JWT_SECRET'),
    SUPABASE_URL: getString(merged, 'SUPABASE_URL'),
    ADMIN_DASHBOARD_PASSWORD: merged.ADMIN_DASHBOARD_PASSWORD,
    AI_STUDIO_API_KEY: merged.AI_STUDIO_API_KEY,
    GEMINI_API_KEY: merged.GEMINI_API_KEY,
    GEMINI_MODEL_NAME: merged.GEMINI_MODEL_NAME,
    OPENROUTER_API_KEY: merged.OPENROUTER_API_KEY,
    OPENROUTER_MODEL_NAME: merged.OPENROUTER_MODEL_NAME,
    OPENAI_API_KEY: merged.OPENAI_API_KEY,
    OPENAI_MODEL_NAME: merged.OPENAI_MODEL_NAME,
    AI_PROVIDER: merged.AI_PROVIDER as Env['AI_PROVIDER'],
    VECTORIZE: undefined,
    CLOUDFLARE_ACCOUNT_ID: merged.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: merged.CLOUDFLARE_API_TOKEN,
    ALLOWED_ORIGINS: merged.ALLOWED_ORIGINS,
    ENVIRONMENT: merged.ENVIRONMENT,
    GOOGLE_PLAY_PACKAGE_NAME: merged.GOOGLE_PLAY_PACKAGE_NAME,
    GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL: merged.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY: merged.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY,
    GOOGLE_PLAY_ACCESS_TOKEN: merged.GOOGLE_PLAY_ACCESS_TOKEN,
    GOOGLE_PUBSUB_PUSH_AUDIENCE: merged.GOOGLE_PUBSUB_PUSH_AUDIENCE,
    GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL: merged.GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL,
    WEB_PUSH_VAPID_PUBLIC_KEY: merged.WEB_PUSH_VAPID_PUBLIC_KEY,
    WEB_PUSH_VAPID_PRIVATE_KEY_JWK: merged.WEB_PUSH_VAPID_PRIVATE_KEY_JWK,
    WEB_PUSH_SUBJECT: merged.WEB_PUSH_SUBJECT,
  };
}
