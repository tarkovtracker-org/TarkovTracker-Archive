# Comprehensive Review – Outstanding Actions

**Last checked:** 2025-10-15  
**Reviewer:** Codex automated follow-up  
**Scope:** Surface only the work that still needs attention.

---

## Critical (P0) — Fix Immediately

- **Tokens never expire.**  
  - `functions/src/auth/verifyBearer.ts` and `functions/src/services/TokenService.ts` accept any token indefinitely.  
  - Add an `expiresAt` timestamp when issuing tokens, enforce it during validation, and provide rotation guidance.

- **Cloud Functions entrypoint remains a monolith.**  
  - `functions/src/index.ts` sits at 917 lines and mixes routing, middleware wiring, schedulers, and legacy helpers.  
  - Break it into `api/`, `callables/`, and `scheduled/` modules so each export stays under ~200 lines and gains isolated tests.

---

## High (P1) — Queue for the Next Sprint

- **CORS still mirrors any origin.**  
  - `functions/src/index.ts:38-63` sets `origin: true`, which reflects arbitrary origins along with cookies.  
  - Introduce explicit production allowlists (`https://tarkovtracker.io`, `https://www.tarkovtracker.io`) and keep `true` only for local development.

- **Legacy progress handler remains oversized.**  
  - `functions/src/handlers/progressHandler.ts` is 420 lines and hosts unrelated responsibilities (player, team, objective updates).  
  - Split it into focused handlers/services so each operation is testable and reuse shared validation logic.

---

## Medium (P2) — Plan and Schedule

- **Route duplication between `/api` and `/api/v2`.**  
  - Every route is registered twice in `functions/src/index.ts`.  
  - Decide on a single canonical version or implement real version negotiation to avoid divergence.

- **Shared types are still duplicated.**  
  - Token shapes live independently in `functions/src/auth/verifyBearer.ts` and `functions/src/services/TokenService.ts`, while similar API contracts exist in the frontend.  
  - Create a `/shared` workspace (e.g., `packages/shared`) to hold DTOs and guard against drift.

---

## Follow-Up Checks

- **E2E coverage remains thin.**  
  - Only three Playwright specs exist (`frontend/e2e/auth.spec.ts`, `dashboard.spec.ts`, `tasks.spec.ts`).  
  - Add flows for token management, team management, and privacy settings once critical fixes land.

- **Bundle analysis not documented.**  
  - No script or report tracks Firebase modular imports or Vuetify tree-shaking.  
  - Run `vite build --mode production --report` (or add `rollup-plugin-visualizer`) and capture results in `PERFORMANCE_OPTIMIZATION_REPORT.md`.

- **Apollo Client upgrade planning outstanding.**  
  - `frontend/package.json` still pins `@apollo/client@^3.14.0`.  
  - Draft the v4 migration plan (breaking changes, testing strategy, rollout steps).

---

## Cleared Since Prior Report (No Further Action)

- Dependency audit is clean: `npm audit --omit=dev` inside `functions/` returns `0 vulnerabilities`; `swagger-jsdoc` already upgraded to `^6.2.8`.  
- API rate limiting exists via `functions/src/middleware/abuseGuard.ts`, which is wired into `app.use('/api', abuseGuard)`.  
- Frontend complexity concerns were addressed: `frontend/src/pages/TaskList.vue` is 127 lines and the progress store sits at 200 lines with composables handling the heavy lifting.
