# AGENTS.md

## Project Overview
Personal watchlist web app integrating with Trakt.tv: syncs your watchlist, checks
streaming availability (Netflix, Prime, Max, etc.), supports voting sessions
(swipe-to-pick), posters cached locally, genres/moods browsing, and playback launch
in a browser or on a Google TV / Android device via ADB. The same JSON API also
serves a companion TV app.

## Stack
- **Runtime:** Node.js 24 (pinned via `.nvmrc`; `devEngines` auto-downloads)
- **Package manager:** pnpm 11 via Corepack — run `corepack enable` first. CI uses
  `--frozen-lockfile`.
- **Backend:** Express 5, Sequelize 6 + `sequelize-cli`, SQLite (`data/watchlist.sqlite`),
  Passport (Trakt OAuth), `vite-express` serving the SPA from the same server
- **Frontend:** React 19, React Router 7, MUI 9 + Emotion, TanStack Query 5, Vite 8
- **External APIs:** Trakt.tv, streaming-availability (RapidAPI), `@devicefarmer/adbkit`
- **Tests:** Jest 30 (node + jsdom projects) · **Lint:** ESLint 10 flat config, airbnb-base

## Commands
- Install: `corepack enable && pnpm install && cp .env.example .env`
- Dev server: `pnpm run dev` (migrates, then nodemon)
- Tunnel dev: `pnpm run start-dev` (requires ngrok env vars; see README)
- Prod: `pnpm run start` (migrates, then `node index.js`)
- Lint: `pnpm run lint`
- Tests: `pnpm test` · Single file: `pnpm exec jest <path/to/file.test.js>`
- Build UI: `pnpm run build-ui` (outputs to `build/`)
- Migrate: `pnpm run migrate`
- New migration: `pnpm exec sequelize-cli migration:create --migrations-path=migrations/ --name my_migration_name`
- Regenerate streaming manifest: `pnpm run streaming:manifest` (needs `RAPIDAPI_KEY`; writes `receiver/streaming_manifest.json` — don't edit by hand)

## Structure
- `index.js` / `server.js` — entry point and Express wiring; API mounted at `/api`
- `api/` — backend route controllers and services (`api/api.js` is the main controller;
  route modules export `mountXRoutes(apiRouter, deps)`; services export named functions)
- `receiver/` — playback layer: ADB/Google TV control, `factory.js` singleton, and
  `providers/` with one module per streaming service
- `models/` — Sequelize models; auto-loaded by `models/index.js` (skips `*.test.js`)
- `migrations/` — Sequelize migrations (`YYYYMMDDHHMMSS-kebab-name.js`)
- `frontend/src/` — React SPA (~40 `.jsx` components; `service/api.js` API client)
- `docs/` — design docs; `docs/BUSINESS_LOGIC.md` is the de-facto rules reference
  (voting rounds, sync intervals, sort rules, streaming snapshot policy)
- `build/`, `data/` — generated/runtime artifacts, gitignored. Never commit.

## Conventions
- **Backend is CommonJS** (`require`/`module.exports`); **frontend is ESM** with JSX.
- Naming: backend files & DB columns `snake_case`; JS vars `camelCase`; models/classes
  `PascalCase`; constants `SCREAMING_SNAKE_CASE`. Tests colocated as `<module>.test.js(x)`.
- Errors: throw `ErrorWithStatus(message, status)` (`ErrorWithStatus.js`); wrap handlers
  in `asyncHandler` and respond via `sendError` from `api/route_helpers.js` (JSON
  `{ message }`). Services return `null`/`false` for not-found; routes map that to 404.
- Logging: `require('debug')('watchlist:<subsystem>')`; enable with `DEBUG=watchlist:*`.
  No structured logging framework. `console.*` only in scripts with an eslint-disable.
- ESLint: airbnb-base, two-space indent, single quotes, semicolons, trailing commas.
  CI runs lint + tests on every push — that's the enforcement point (no pre-commit hooks).
- Frontend: fetch with relative `/api/...` URLs and `withCredentials: true`;
  messages surface via `MessageContext`.

## Environment & Gotchas
- `.env` (from `.env.example`) holds Trakt OAuth secrets — never commit it.
- `pnpm-workspace.yaml` is NOT a multi-package monorepo (only `'.'`) but carries
  critical build permissions and security `overrides` — don't delete or restructure it.
- Vite dev server is embedded in Express via `vite-express` (`server.js`), not run
  separately; `REACT_DEV_SERVER`/`WATCH` flags in `start-dev` are largely vestigial.
- Sessions, posters, and the SQLite DB live in gitignored `data/` — assume a fresh
  checkout has none of it until migrations run.
- Legacy leftovers exist (`config-overrides.js`, `frontend/.env` port, empty
  `receiver/adb_test.js`) — ignore, don't try to wire them up.
- There is no typecheck command; only two TS files exist (`theme.ts`, `vite-env.d.ts`).

## Sessions / Worktrees
Sessions may run in isolated Git worktrees (Orca). Do not modify files outside the
current worktree root or switch branches. Do not run `git push` or destructive git
commands unless explicitly asked.
