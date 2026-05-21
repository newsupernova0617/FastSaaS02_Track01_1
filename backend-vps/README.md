# Backend VPS

This package serves only the direct AI-dependent API paths for the Cloudflare Workers backend.

It is self-contained for VPS deployment. Deploy `backend-vps/` by itself; it does not require the `backend/` source tree at runtime.

```txt
npm install
npm run dev
```

```txt
npm run start
```

Allowed routes in this package:

- `POST /api/ai/action`
- `POST /api/sessions/:sessionId/messages`
- `POST /api/app/chat`
- `POST /api/app/push/reply`
- `GET /api/reports/current`
- `POST /api/reports/generate`
- `GET /api/app/reports/current`
- `POST /api/app/reports/generate`
- `POST /api/rag/embed`
- `POST /api/rag/search`

All other `/api/*` routes return `404` here. The main Cloudflare Workers backend should proxy only these paths through `AI_API_BASE_URL` and authenticate the RAG proxy calls with `AI_PROXY_SECRET`.

For the common case, set `AI_STUDIO_API_KEY` only. Add other provider keys only if you intentionally switch providers.
