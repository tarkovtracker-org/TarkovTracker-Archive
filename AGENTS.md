# AI Agent Guide

Shared playbook for any AI coding assistant collaborating on TarkovTracker.

> Keep this file current: whenever scripts, paths, tooling, or workflows change in the repo, reflect those
> updates here (and in `CLAUDE.md`).

## Environment

- **Node.js Runtime**
  - Minimum supported for the Vue workspace: **20.19+**
  - Recommended for parity across functions + frontend: **22.x** (matches CI + Cloud Functions)
- **Java 11+ Runtime** – Required for the Firebase Emulator Suite.
- **Firebase CLI** – Pulled in via the repo-level dev dependency (`firebase-tools`). Prefer the npm scripts instead of invoking it globally.
- Run `npm install` once from the repo root (workspaces handle `frontend/` + `functions/`).

## Repository Layout

- `frontend/` – Vue 3 + Vite SPA using Pinia, Vuetify, Vue Router, Vue I18n, and Firebase/VueFire integrations.
  - `frontend/src/STRUCTURE.md` documents the canonical layout for `components/` (ui/layout/domain), `views/`, `composables/`, `stores/`, `services/`, `utils/`, `types/`, `config/`, `router/`, `plugins/`, `styles/`, and `test/`.
  - Keep Vue components in kebab-case files under the feature-specific folder.
- `functions/` – Firebase Cloud Functions written in TypeScript (Express routing, Firestore, scheduled jobs, Tarkov.dev integrations).
  - `functions/src/` contains `handlers/`, `services/`, `middleware/`, `scheduled/`, `utils/`, `types/`, and the OpenAPI generators under `openapi/`.
  - Legacy v1 handlers still live under `auth/`, `progress/`, `token/`; new work should land under `handlers/` + `services/`.
- `scripts/` – Tooling entry points (see `scripts/SCRIPTS.md`); notable helpers include the emulator wrapper, lint orchestrator, and map fallback sync script.
- Documentation lives under `docs/` (`architecture/`, `development/`, `REPORTS/`, `user-guides/`).
- Firebase configuration (`firebase.json`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`) sits at the repo root.
- Generated artefacts (`frontend/dist/`, `functions/lib/`, `firebase-export-*`, debug logs) must stay untracked.

Ensure new fixtures/config live inside the correct workspace so tooling (tsconfig paths, ESLint, Vitest) can discover them.

## Development Workflows

| Script | What it runs | Typical use |
| --- | --- | --- |
| `npm run dev` | Frontend Vite dev server (port 3000) | UI work without emulators; mock auth |
| `npm run dev:full` | Frontend dev server + Auth/Firestore/Functions emulators | End-to-end feature flows |
| `npm run dev:firebase` | Builds functions then launches the full emulator suite via `scripts/emulator-wrapper.js` (hosting on 5000) | Pre-deploy checks |

Additional helpers:

- `npm run emulators` – Builds functions then launches every emulator target.
- `npm run emulators:backend` – Auth/Firestore/Functions only (no hosting).
- `npm run emulators:local` – Imports state from `./local_data` and exports on exit for deterministic testing.
- `npm run build` – Functions build ➜ OpenAPI generation ➜ frontend production build.
- `npm run build:functions` / `npm run build:frontend` – Workspace-specific builds.
- `npm run clean` – Removes Firebase debug files after emulator runs.
- `npm run deps` – Interactive dependency upgrades via `taze`.
- Map fallback data: run `node scripts/update-maps-from-tarkovdev.js` from the repo root whenever the Tarkov.dev metadata changes (rarely needed at runtime).

All emulator wrappers clean up debug logs on shutdown (SIGINT/SIGTERM aware).

### Mock Authentication

For frontend-only work, enable mock auth:

```bash
cp frontend/.env.example frontend/.env.local
# edit .env.local
VITE_DEV_AUTH=true
npm run dev
```

Mock auth persists a generated dev user ID in `localStorage`; disable it (`false` or remove the line) before testing real auth flows.

## Testing & Quality Gates

- `npm run test` – Executes `functions` tests first, then `frontend`.
- `npm run test:frontend` / `npm run test:functions` – Targeted runs from the root.
- `npm run test:coverage` – Runs coverage in both workspaces (`test:coverage:functions` + `test:coverage:frontend`).
- Frontend workspace:
  - `npm run test:run` – Vitest unit tests (CI mode).
  - `npm run test:e2e` / `npm run test:e2e:ui` / `npm run test:e2e:headed` – Playwright suites.
  - `npm run test:coverage` – Vitest coverage output (attach artefacts for security-sensitive work).
- Functions workspace:
  - `npm test` – Vitest unit/integration tests.
  - `npm run type-check` – `tsc --noEmit` for stricter CI checks.
- Linting/formatting:
  - `npm run lint` – Orchestrates ESLint + TypeScript type-checking + markdownlint via `scripts/lint-all.mjs`.
  - `npm run lint:md` / `lint:md:fix` / `lint:md:json` – Markdown-only lint targets (respect `.markdownlintignore`).
  - `npm run format` / `npm run format:check` – Prettier across `.vue`/`.ts` sources.

CI expects zero lint errors and passing tests. Add a Vitest or Playwright regression guard for every new feature or bug fix that touches logic.

## Documentation & Deploy

- `npm run docs` – Builds functions, regenerates the OpenAPI spec (`functions/openapi/openapi.json`), and prints Scalar UI viewing instructions.
- `npm run docs:generate` – Runs the OpenAPI generator (`npm run openapi --workspace=functions`) and copies the spec into `frontend/public/api/openapi.json` for Scalar UI.
- `npm run deploy:staging` – Build functions ➜ regenerate docs ➜ build frontend ➜ deploy hosting to a 7-day preview channel.
- `npm run deploy:prod` – Same pipeline, followed by production hosting + functions deploy.

If you alter API endpoints or request/response shapes, rerun `npm run docs` and include the resulting diff under `functions/openapi/`.

## Coding Standards

- 2-space indentation with shared Prettier/ESLint configuration; max line length 100 in `frontend/`, 120 in `functions/`. Split literals instead of disabling lint rules.
- Vue components follow the Composition API + typed Pinia stores; keep files <300 LOC and colocate domain components under `components/domain/{feature}`. See `frontend/src/STRUCTURE.md` for the canonical breakdown of `components/`, `views/`, `composables/`, etc.
- Views live in `views/{feature}/` with `*View.vue` naming; business logic goes into composables/services (`frontend/src/composables/`, `frontend/src/services/`).
- Functions export named handlers from `functions/src/handlers/**`; keep handlers thin and move logic into `functions/src/services/**`. Scheduled jobs live under `functions/src/scheduled/**`.
- Avoid `any`; when unavoidable, use the narrowest possible suppression and document the reasoning inline.
- Use the `@/` alias for internal imports on the frontend; remove unused imports promptly. Prefer barrel exports (`index.ts`) for feature directories when it keeps imports tidy.
- Vitest setup helpers live under `frontend/src/test/`; keep fixtures/mocks near the features they support.

## Git & PR Expectations

- Conventional Commit prefixes (`feat`, `fix`, `chore`, `docs`, etc.). Reference tickets (`TT-123`) or issues (`Fixes #123`) when relevant.
- PRs explain scope, provide screenshots or terminal output for UI/CLI changes, and call out Firebase config updates.
- Never commit generated artefacts from `frontend/dist/`, `functions/lib/`, emulator exports, or debug logs.

## Agent Workflow Tips

- Prefer `apply_patch` for surgical edits; avoid rewriting large files unless necessary.
- Default to workspace-level scripts (`npm run … --workspace=<workspace>`) instead of invoking binaries directly.
- When uncertain about project behaviour, search the repo (`rg`) before guessing. Ask the maintainer only if facts remain unclear.

Keep this guidance in sync across `CLAUDE.md` and `AGENTS.md`.
