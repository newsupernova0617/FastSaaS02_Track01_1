import { app } from './app';
import type { Env } from './db/index';
import { isDirectAiRoute, proxyDirectAiRequest } from './runtime/ai-routing';

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
        'Set these via wrangler secret or backend/.dev.vars.'
    );
  } else {
    console.log('[Startup] All required environment variables are present.');
  }

  envValidated = true;
}

export { app } from './app';
export type { AppType } from './app';

export default {
  fetch(request: Request, env: Env, ctx: Parameters<typeof app.fetch>[2]): Response | Promise<Response> {
    validateEnv(env);

    if (isDirectAiRoute(request)) {
      if (!env.AI_API_BASE_URL) {
        return new Response('AI proxy target is not configured', { status: 503 });
      }

      return proxyDirectAiRequest(request, env.AI_API_BASE_URL);
    }

    return app.fetch(request, env, ctx);
  },
};
