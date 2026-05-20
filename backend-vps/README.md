# Backend VPS

This package serves only the direct AI-dependent API paths for the Cloudflare Workers backend.

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

All other `/api/*` routes return `404` here. The main Cloudflare Workers backend should proxy only these paths through `AI_API_BASE_URL`.
