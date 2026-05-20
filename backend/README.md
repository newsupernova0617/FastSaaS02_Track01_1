# Backend

This package runs the Hono API on Cloudflare Workers.

```txt
npm install
npm run dev
```

```txt
npm run deploy
```

```txt
npm run test
```

The Worker entrypoint is [`src/index.ts`](./src/index.ts). The shared Hono app lives in [`src/app.ts`](./src/app.ts).

Direct AI-dependent routes are proxied to `AI_API_BASE_URL` before the request reaches the Worker app:

- `POST /api/ai/action`
- `POST /api/sessions/:sessionId/messages`
- `POST /api/app/chat`
- `POST /api/app/push/reply`
- `GET /api/reports/current`
- `POST /api/reports/generate`
- `GET /api/app/reports/current`
- `POST /api/app/reports/generate`

Set `AI_API_BASE_URL` in `backend/.dev.vars` or Wrangler secrets so those paths can be forwarded to the VPS package in [`../backend-vps/`](../backend-vps/).
