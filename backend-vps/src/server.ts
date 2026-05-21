import { serve } from '@hono/node-server';
import { vpsApp } from './app-vps';
import { buildRuntimeEnv } from './runtime/node-env';

const env = buildRuntimeEnv();
const port = Number(process.env.PORT || 8788);

serve(
  {
    fetch: (request: Request) => vpsApp.fetch(request, env),
    port,
  },
  (info) => {
    console.log(`[AI-VPS] Backend listening on http://${info.address}:${info.port}`);
  },
);
