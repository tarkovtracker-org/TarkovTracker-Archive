# Verification of Analysis Reports — Outstanding Work

**Verification Date**: 2025-10-15  
**Scope**: Trim resolved tasks from the four root reports so only actionable follow-ups remain.

---

## Snapshot of Remaining Work

- 🟥 **P0 (Critical)**  
  - Add token expiration checks in `functions/src/auth/verifyBearer.ts`.  
  - Break up `functions/src/index.ts` (917 lines) into focused modules.

- 🟧 **P1 (High)**  
  - Confirm route-level code splitting in the Vue router.  
  - Audit Firebase bundle size (ensure modular imports, run analyzer).  
  - Plan `@apollo/client` v4 migration.  
  - Harden CORS rules in `functions/src/index.ts`.  
  - Extract legacy `progressHandler` logic into dedicated files.

- 🟨 **P2 (Medium)**  
  - Verify Vuetify tree-shaking during build.  
  - Create a `/shared` workspace for common types.  
  - Clean up duplicate API version routes (`/api/` vs `/api/v2/`).  
  - Expand high-value E2E coverage in `frontend/e2e/`.  
  - Implement GDPR-compliant data export callable.  
  - Spot-check lingering `console.log` statements (`rg "console.log"`).

---

## Report-Specific Tracking

### PERFORMANCE_OPTIMIZATION_REPORT.md

- **P0-3** • Route-level code splitting — inspect router configuration for dynamic imports and add tests where missing.  
- **P0** • Firebase bundle size — validate modular imports in `frontend/src/plugins/firebase.ts` and run the bundle analyzer to confirm the target (~200 KB).  
- **P1-4** • Vuetify tree-shaking — execute the analyzer to ensure unused components are not bundled.

### LEGACY_MODERNIZATION_REPORT.md

- **High** • Apollo Client v4 migration — schedule upgrade work, document breaking changes, and create migration plan.  
- **Medium** • progressHandler refactor — extract legacy callable logic out of `functions/src/index.ts`.  
- **Low** • Console logging audit — remove stray `console.log` usage after verifying with `rg`.

### COMPREHENSIVE_REVIEW_REPORT.md

- **P0** • Token expiration — introduce `expiresAt` handling for API tokens and enforce revocation.  
- **P1** • CORS hardening — restrict origins and align config with deployment environments.

### ARCHITECTURE_REVIEW.md

- **P0** • Modularize `functions/src/index.ts` into `callables/` and `scheduled/` folders.  
- **P2** • Shared types workspace — create `/shared` package consumed by frontend and functions.  
- **P2** • API versioning cleanup — remove duplicate `/api` routing or implement real version negotiation.

---

## Dependency & Build Follow-Ups

| Package / Area | Current | Action |
|----------------|---------|--------|
| `@apollo/client` | 3.14.0 | Prepare migration path to v4+. |
| `firebase` (frontend) | 11.10.0 | Confirm compatibility and increment to v12.x after bundle audit. |
| `swagger-jsdoc` | 6.2.8 | Track v7 release for potential adoption. |
| Build tooling | — | Run `npm audit` and `npm run build -- --analyze` to validate security + bundle size targets. |

---

## Immediate Next Steps

1. Implement token expiration enforcement (`functions/src/auth/verifyBearer.ts`).  
2. Start modularizing `functions/src/index.ts` by moving team/token callables into their own files.  
3. Schedule bundle analysis session to cover Firebase imports and Vuetify tree-shaking.  
4. Draft the Apollo v4 migration plan (timeline, breaking changes, testing strategy).  
5. Update this summary after each item ships so the root reports stay solely focused on live issues.
