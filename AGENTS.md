# Repository Guidelines

## Project Structure & Module Organization

This repository contains three apps plus cross-app tests. `backend/` is a Cloudflare Workers API built with Hono; source lives in `backend/src`, with routes, services, middleware, database, migrations, and seeds split by concern. Backend tests live in `backend/tests`. `frontend/` is an Astro/React landing site; edit pages, layouts, components, styles, and copy under `frontend/src`, with static assets in `frontend/public`. `flutter_app/` contains the Flutter client, with code in `flutter_app/lib`, tests in `flutter_app/test`, and assets in `flutter_app/assets/images`. Root `e2e/` contains Playwright flows.

## Build, Test, and Development Commands

- `cd backend && npm run dev`: start the Worker locally with Wrangler.
- `cd backend && npm run type-check`: run TypeScript checks.
- `cd backend && npm test`: run all Vitest suites.
- `cd backend && npm run test:unit|test:integration|test:e2e`: run a targeted backend suite.
- `cd frontend && npm run dev`: start the Astro dev server.
- `cd frontend && npm run build`: create the production frontend build.
- `npx playwright test`: run root Playwright tests; config starts frontend and backend servers.
- `cd flutter_app && flutter test`: run Flutter tests.
- `cd flutter_app && flutter analyze`: run Dart analyzer checks.

## Coding Style & Naming Conventions

Use TypeScript ES modules in backend and frontend. Existing TypeScript uses two-space indentation, single quotes, and semicolons in backend files. Name modules and tests after their domain, for example `sessions.ts`, `sessions.test.ts`, or `ai-report.test.ts`. Flutter follows standard Dart formatting; run `dart format .` inside `flutter_app` before committing. Prefer `lib/features/<feature>` for features and `lib/shared` or `lib/core` for reusable code.

## Testing Guidelines

Place backend tests under `backend/tests/<suite>` and use `*.test.ts`, `*.integration.test.ts`, or `*.e2e.test.ts` suffixes. Use `backend/tests/helpers` and `backend/tests/fixtures` for shared auth, database, and app setup. Playwright tests belong in `e2e/tests`. Add tests for new API behavior, database changes, and user-visible flows.

## Commit & Pull Request Guidelines

Recent history mixes concise Korean summaries, merge commits, and typed messages such as `chore: ...`; there is no strict convention. Use short imperative subjects and add a type prefix (`feat:`, `fix:`, `chore:`) when useful. PRs should include a brief description, test commands run, linked issues, and screenshots or recordings for UI changes.

## Security & Configuration Tips

Do not commit secrets. Use `backend/.dev.vars` for Worker secrets, `frontend/.env` for frontend values, and `flutter_app/.env` for mobile config. Keep generated directories such as `node_modules`, `dist`, `.astro`, `.dart_tool`, and `build` out of reviews unless intentionally updating lockfiles.

## 2026-04-28-flutter-commented-features.md
주석화한 부분 2026-04-28-flutter-commented-features.md 에다가 추가
