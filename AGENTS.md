# Repository Guidelines

## Project Structure & Module Organization

This repository contains four apps plus cross-app tests. `backend/` is a Cloudflare Workers API built with Hono; source lives in `backend/src`, with routes, services, middleware, database, migrations, and seeds split by concern. Backend tests live in `backend/tests`. `frontend/` is an Astro/React landing site; edit pages, layouts, components, styles, and copy under `frontend/src`, with static assets in `frontend/public`. `webapp/` is the Vite-based PWA product app that replaces or coexists with Flutter, with source in `webapp/src`. `flutter_app/` contains the Flutter client, with code in `flutter_app/lib`, tests in `flutter_app/test`, and assets in `flutter_app/assets/images`. Root `e2e/` contains Playwright flows.

`webapp/` is a Vite-based PWA that uses a smaller stack than the Flutter app. Expect some less familiar pieces there, especially `hono/jsx/dom`, `Navigo`, `zustand/vanilla`, and `@tanstack/query-core`. When working in `webapp/`, read the local patterns first and call out any assumptions if the library behavior is not obvious.

## Build, Test, and Development Commands

- `cd backend && npm run dev`: start the Worker locally with Wrangler.
- `cd backend && npm run type-check`: run TypeScript checks.
- `cd backend && npm test`: run all Vitest suites.
- `cd backend && npm run test:unit|test:integration|test:e2e`: run a targeted backend suite.
- `cd frontend && npm run dev`: start the Astro dev server.
- `cd frontend && npm run build`: create the production frontend build.
- `cd webapp && npm run dev`: start the Vite/PWA app locally.
- `cd webapp && npm run build`: create the production webapp build.
- `npx playwright test`: run root Playwright tests; config starts frontend and backend servers.
- `cd flutter_app && flutter test`: run Flutter tests.
- `cd flutter_app && flutter analyze`: run Dart analyzer checks.

## Coding Style & Naming Conventions

Use TypeScript ES modules in backend, frontend, and webapp. Existing TypeScript uses two-space indentation, single quotes, and semicolons in backend files. Name modules and tests after their domain, for example `sessions.ts`, `sessions.test.ts`, or `ai-report.test.ts`. Flutter follows standard Dart formatting; run `dart format .` inside `flutter_app` before committing. Prefer `lib/features/<feature>` for features and `lib/shared` or `lib/core` for reusable code.

`webapp/` follows the repo's TypeScript style, but its component model is intentionally lightweight. Prefer existing local patterns for JSX components, store access, and query wiring instead of introducing new abstractions unless they remove real duplication.

## Testing Guidelines

Place backend tests under `backend/tests/<suite>` and use `*.test.ts`, `*.integration.test.ts`, or `*.e2e.test.ts` suffixes. Use `backend/tests/helpers` and `backend/tests/fixtures` for shared auth, database, and app setup. Playwright tests belong in `e2e/tests`. Add tests for new API behavior, database changes, webapp user-visible flows, and any Flutter behavior that remains active.

## Commit & Pull Request Guidelines

Recent history mixes concise Korean summaries, merge commits, and typed messages such as `chore: ...`; there is no strict convention. Use short imperative subjects and add a type prefix (`feat:`, `fix:`, `chore:`) when useful. PRs should include a brief description, test commands run, linked issues, and screenshots or recordings for UI changes.

## Security & Configuration Tips

Do not commit secrets. Use `backend/.dev.vars` for Worker secrets, `frontend/.env` for frontend values, `webapp/.env` for webapp values, and `flutter_app/.env` for mobile config. Keep generated directories such as `node_modules`, `dist`, `.astro`, `.dart_tool`, and `build` out of reviews unless intentionally updating lockfiles.

## 2026-04-28-flutter-commented-features.md
주석화한 부분 2026-04-28-flutter-commented-features.md 에다가 추가
