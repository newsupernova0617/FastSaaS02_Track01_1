import { serve } from '@hono/node-server';
import { app } from './app';
import { buildRuntimeEnv } from './runtime/node-env';

const env = buildRuntimeEnv();
const port = Number(process.env.PORT || 8787);

serve(
  {
    fetch: (request: Request) => app.fetch(request, env),
    port,
  },
  (info) => {
    console.log(`[VPS] Backend listening on http://${info.address}:${info.port}`);
  }
);
