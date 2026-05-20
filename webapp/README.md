# webapp deployment

This app can be deployed to Cloudflare Pages as a static Vite/PWA build.

Project name:

- `fastsaas02-track01-1-webapp`

Required build-time env vars:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Local setup:

1. Copy `.env.example` to `.env`.
2. Fill in the three `VITE_*` values.
3. Run `npm run build`.

Cloudflare Pages direct upload:

1. Authenticate Wrangler: `npx wrangler login`
2. Build and deploy: `npm run pages:deploy`

Local Pages preview:

- `npm run pages:dev`

If you use Cloudflare Pages Git integration instead of direct upload, set the same `VITE_*` variables in the Pages dashboard because Vite reads them at build time.
