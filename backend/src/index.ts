// backend/src/index.ts
import { app } from './app';
import type { Env } from './db/index';

// Required environment variables — validated at request time (Workers start without env access)
const REQUIRED_ENV_VARS: (keyof Env)[] = [
  'SUPABASE_JWT_SECRET',
  'TURSO_DB_URL',
  'TURSO_AUTH_TOKEN',
  'SUPABASE_URL',
];

let envValidated = false;

function validateEnv(env: Env): void {
  if (envValidated) return;
  const missing = REQUIRED_ENV_VARS.filter((key) => !env[key]);
  if (missing.length > 0) {
    console.error(
      `[Startup] Missing required environment variables: ${missing.join(', ')}. ` +
        'Requests may fail. Set these via wrangler secret or .dev.vars.'
    );
  } else {
    console.log('[Startup] All required environment variables are present.');
  }
  envValidated = true;
}

export default {
  fetch(request: Request, env: Env, ctx: Parameters<typeof app.fetch>[2]): Response | Promise<Response> {
    validateEnv(env);
    return app.fetch(request, env, ctx);
  },
};
