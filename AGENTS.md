# Repository Guidelines

## Project Structure & Modules
- `frontend/`: Vue 3 + Vite SPA (TypeScript, Pinia, Vuetify); UI assets in `frontend/src/assets`, routes in `frontend/src/router`, shared composables/stores under `frontend/src/{composables,stores}`.
- `functions/`: Firebase Cloud Functions (TypeScript) with OpenAPI output in `functions/openapi/`; tests live in `functions/test/`.
- `docs/`: Maintainer and operations guides; see `docs/OPENAPI_SYNC.md` and `docs/CI_PIPELINE.md` for pipelines.
- `scripts/`: Automation entry points; `scripts/SCRIPTS.md` explains each helper.
- Root Firebase rules (`firestore.rules`, `firestore.indexes.json`, `database.rules.json`) and config (`firebase.json`) mirror production settings; do not edit without maintainer review.

## Build, Test, and Development Commands
- `npm install` – bootstrap all workspaces (frontend + functions).
- `npm run dev` – Vite dev server only (UI); use `npm run dev:full` to include Auth/Firestore/Functions emulators.
- `npm run build` – full build: functions → OpenAPI sync → frontend.
- `npm test` – Vitest suites for functions then frontend; `npm run test:coverage` adds coverage.
- `npm run lint` – orchestrated lint (ESLint, TS checks, markdownlint); fix formatting via `npm run format`.
- `npm run docs:generate` – regenerate OpenAPI and copy to `frontend/public/api/openapi.json` after API changes.

## Coding Style & Naming Conventions
- TypeScript-first; avoid new plain JS. Vue single-file components use `<script setup>` where possible.
- Formatting enforced by Prettier (2-space indent, single quotes in TS/JS, `max-len` ~100 front / 120 functions); run `npm run format` before commits.
- ESLint (flat config) is authoritative; favor `const`, optional chaining/nullish coalescing, and type-safe async (`no-floating-promises` enabled).
- Naming: PascalCase Vue components (`MyPanel.vue`), camelCase variables/functions, kebab-case route/component file names, test files `*.spec.ts` or `*.test.ts`.

## Testing Guidelines
- Unit/integration: Vitest in both workspaces; functions tests under `functions/test/**`, frontend tests under `frontend/src/**/__tests__` or `*.spec.ts`.
- E2E: Playwright via `npm run test:e2e`; prefer emulator-backed data (`npm run emulators:backend`) and avoid hitting production services.
- Add coverage for new logic; use `npm run test:coverage:functions` or `npm run test:coverage:frontend` when changing a single workspace.

## Commit & Pull Request Guidelines
- Commit style mirrors Conventional Commits (`fix(tests): …`, `docs(architecture): …`); keep subject ≤72 chars and present tense.
- Before opening a PR: run `npm run lint`, `npm run test`, and `npm run build`; include `npm run docs:generate` when API surface changes.
- PRs target `main`; include a concise summary, linked issues (`Fixes #123`), and screenshots for UI changes. Request review from `@TarkovTracker/maintainers`.

## Security & Configuration Tips
- Never commit secrets or Firebase service accounts; use emulator configs and `.env` locals instead.
- Changes to `firestore.rules`, indexes, or hosting configs require maintainer sign-off; document rationale in the PR description.
