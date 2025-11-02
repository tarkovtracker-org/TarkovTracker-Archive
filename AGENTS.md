# Repository Guidelines

## Project Structure & Module Organization

The root `package.json` orchestrates two workspaces: `frontend/` for the Vue 3 + Vite client and `functions/` for Firebase Cloud Functions written in TypeScript. Generated artifacts live in `frontend/dist/` and `functions/lib/`; keep these out of commits. API documentation is emitted into `docs/` via the functions swagger task, and operational playbooks are collected in `REPORTS/`. Shared tooling scripts are under `scripts/`, while Firebase configuration (`firebase.json`, `firestore.rules`, indexes) stays at the repo root.

## Build, Test, and Development Commands

From the root, `npm run dev` runs the web client alongside local Firebase emulators (after compiling functions). Use `npm run build`, `npm run build:frontend`, or `npm run build:functions` when you only need specific artifacts. Generate API docs with `npm run docs`. For a clean emulator snapshot, `npm run emulators:local` reuses `./local_data`. Inside `frontend/`, `npm run dev` starts Vite alone, and `npm run serve` previews the production build. Inside `functions/`, `npm run serve` compiles and serves only the function suite.

## Coding Style & Naming Conventions

All TypeScript and Vue code uses 2-space indentation and must satisfy the shared flat ESLint config plus Prettier formatting. The linter enforces `max-len` 100 in `frontend/` and 120 in `functions/`; break long literals rather than suppress. Prefer typed `Pinia` stores and Composition API patterns in Vue components, naming files in `kebab-case.vue`. Functions modules export named handlers (e.g., `export const syncQuest`) and live under `src/` mirroring their Firestore or HTTP trigger purpose. Avoid `any`; if unavoidable, justify with a suppression comment.

## Testing Guidelines

UI logic relies on `vitest` with Vue Test Utils (`npm run test:run`), while e2e flows use Playwright (`npm run test:e2e`). Aim for deterministic component tests that stub Firebase/Apollo calls with fixtures in `frontend/test/`. Functions use `vitest` as well; run `npm test` from `functions/` before deploying. New features should include at least one automated check (unit or e2e) guarding the regression, and keep coverage reports when touching security-sensitive flows.

## Commit & Pull Request Guidelines

History mixes merge commits with Conventional Commit messages (`chore(deps-dev): …`), so follow conventional prefixes (`feat`, `fix`, `chore`, `docs`) for clarity. Reference GitHub issues as `TT-123` or `Fixes #123` when applicable. Pull requests must explain scope, include screenshots or terminal output for UI/CLI changes, and note any Firebase config updates. If API docs change, attach the generated diff from `docs/openapi.json`.
