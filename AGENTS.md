# AI Agent Guide

Shared playbook for any AI coding assistant collaborating on TarkovTracker.

> Keep this file current: whenever scripts, paths, tooling, or workflows change in the repo, reflect those
> updates here (and in `CLAUDE.md`).

## Environment

- **Node.js 22.x** – Functions target Node 22; use the same version for frontend parity
  (Vue workspace tolerates 20.19+, but standardise on 22).
- **Java 11+ Runtime** – Required for Firebase emulators.
- **Firebase CLI** – Available as the local dev dependency `firebase-tools`; invoke through the
  provided npm/yarn scripts.
- Install dependencies once from the repository root via `npm install`.

## Repository Layout

- `frontend/` – Vue 3 + Vite SPA using Pinia, Vuetify, Vue Router, Vue I18n, and Firebase/VueFire integrations.
- `functions/` – Firebase Cloud Functions written in TypeScript (Express, Firestore, scheduled jobs, Tarkov.dev integrations).
- `frontend/dist/`, `functions/lib/`, `firebase-export-*` – Generated output; do not commit.
- `functions/openapi/` – Generated OpenAPI spec consumed by the Scalar UI page.
- `functions/src/openapi/` – TypeScript source for generating the OpenAPI schema.
- `docs/REPORTS/` – Operational runbooks and postmortems (published material lives inside `docs/`).
- `docs/architecture/` – System architecture documentation and technical design documents.
- `docs/user-guides/` – End-user documentation and guides.
- `docs/development/` – Development workflows and setup instructions.
- `scripts/` – Tooling (e.g., map sync automation).
- Firebase configuration (`firebase.json`, `firestore.rules`, `firestore.indexes.json`,
  `database.rules.json`) resides at the repo root.

Ensure new data files or fixtures live inside the appropriate workspace so workspace-specific tooling picks them up.

## Development Workflows

| Script | What it runs | Typical use |
| --- | --- | --- |
| `npm run dev` | Frontend Vite dev server (port 3000) | UI work without emulators; mock auth |
| `npm run dev:full` | Vite dev server + Auth/Firestore/Functions | End-to-end feature flows |
| `npm run dev:firebase` | Builds functions then launches all emulators (incl. hosting on 5000) via `scripts/emulator-wrapper.js` | Pre-deploy checks |

Additional helpers:

- `npm run emulators` – Builds functions and launches the full Firebase emulator suite.
- `npm run emulators:backend` – Functions/Firebase backends only (no hosting).
- `npm run emulators:local` – Replays emulator state from `./local_data` and exports on exit
  for deterministic tests.
- `npm run build` – Functions build ➜ OpenAPI generation ➜ frontend production build.
- `npm run build:functions` / `npm run build:frontend` – Workspace-specific builds.
- `npm run maps:sync` – Refresh Tarkov map metadata from Tarkov.dev.

### Mock Authentication

For frontend-only work, enable mock auth:

```bash
cp frontend/.env.example frontend/.env.local
# edit .env.local
VITE_DEV_AUTH=true
npm run dev
```

Mock auth persists a generated dev user ID in localStorage; disable (`false` or remove) before testing real auth flows.

## Testing & Quality Gates

- `npm run test` – Executes `functions` then `frontend` test suites.
- `npm run test:frontend` / `npm run test:functions` – Targeted runs from the root.
- Frontend workspace:
  - `npm run test:run` – Vitest unit tests (CI mode).
  - `npm run test:e2e` / `npm run test:e2e:ui` – Playwright suites (headless/UI).
  - `npm run test:coverage` – Coverage report (store artifacts for security-related work).
- Functions workspace:
  - `npm test` – Vitest unit/integration tests.
  - `npm run type-check` – TSC with `--noEmit`.
- Linting/formatting:
  - `npm run lint` – ESLint, type-check, and markdown linting for
  all files.
  - `npm run lint:md` – Run only markdown linting for documentation files (human-readable output, respects `.markdownlintignore`).
  - `npm run lint:md:fix` – Auto-fix markdown issues wherever the markdownlint CLI supports it (respects `.markdownlintignore`).
  - `npm run lint:md:json` – Run markdown linting with condensed JSON output (80% reduction in verbosity, respects `.markdownlintignore`).
  - `npm run format` / `npm run format:check` – Prettier across
  `.vue`/`.ts` sources.

CI expects zero lint errors and passing tests. When adding features, include a Vitest or Playwright regression guard.

## Documentation & Deploy

- `npm run docs` – Builds functions and regenerates `functions/openapi/openapi.json`.
- `npm run docs:generate` – Runs `npm run openapi --workspace=functions` and copies the spec into
  `frontend/public/api/openapi.json` for Scalar UI.
- `npm run deploy:staging` – Build functions, regenerate docs, build frontend, then deploy hosting
  to a 7-day preview channel.
- `npm run deploy:prod` – Build functions, regenerate docs, build frontend, then deploy hosting +
  functions.

If you alter API endpoints or request/response shapes, rerun `npm run docs` and include the
resulting diff under `functions/openapi/`.

## Coding Standards

- 2-space indentation, Prettier formatting, shared flat ESLint config.
- Max line length: 100 in `frontend/`, 120 in `functions/`; split literals instead of disabling lint rules.
- Vue components follow Composition API, typed Pinia stores, and live in `kebab-case.vue` files under feature folders.
- Functions export named handlers from `functions/src/**` that mirror their trigger purpose; prefer
  pure services under `src/services/` with thin handler wrappers.
- Avoid `any`; justify unavoidable cases with targeted ESLint suppressions.
- Organise imports using the `@/` alias for local modules; remove unused imports promptly.
- Keep Vue components <300 lines and Firebase handlers focused (<200 lines); refactor shared logic into composables/services.
- Vitest setup helpers live under `frontend/src/test/`; create fixtures/mocks alongside features when needed.

## Git & PR Expectations

- Conventional Commit prefixes (`feat`, `fix`, `chore`, `docs`, etc.). Reference tickets (`TT-123`)
  or issues (`Fixes #123`) when relevant.
- PRs explain scope, surface screenshots or terminal output for UI/CLI changes, and call out Firebase config updates.
- Never commit generated assets from `frontend/dist/`, `functions/lib/`, or emulator exports.

## Agent Workflow Tips

- Prefer `apply_patch` for surgical edits; avoid rewriting large files unless necessary.
- Default to workspace-level scripts (`npm run … --workspace=frontend`) instead of manually invoking binaries.
- When uncertain about project behaviour, search the repo (`rg`) before guessing. Ask the maintainer
  only if facts remain unclear.

Keep this guidance in sync across `CLAUDE.md` and `AGENTS.md`.
