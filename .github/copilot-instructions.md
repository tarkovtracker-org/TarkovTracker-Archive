# TarkovTracker AI Coding Agent Instructions

## Project Overview

TarkovTracker is a Firebase-backed Vue 3 + TypeScript web app for tracking Escape from Tarkov game progression. The codebase uses npm workspaces (`frontend/` and `functions/`) with shared tooling at the root.

## Critical Architecture Patterns

### Firebase Functions: Lazy Cold-Start Optimization

**Why**: Cloud Functions minimize cold-start memory by lazily constructing Express app

```typescript
// functions/src/index.ts - NEVER eagerly import Express routes at module level
let cachedApp: Express | undefined;
async function getApiApp(): Promise<Express> {
  if (cachedApp) return cachedApp;
  cachedApp = await createApp(); // Lazy construction
  return cachedApp;
}
```

When adding routes: register in `functions/src/app/app.ts`, NOT in `index.ts` directly.

### Frontend State: Pinia + VueFire Coordination

**Pattern**: Pinia stores manage UI state; VueFire handles Firebase real-time sync

```typescript
// Correct: Separate concerns
const teamStore = useTeamStore();        // Pinia for UI state
const { data: progress } = useDocument(...); // VueFire for Firestore binding
```

**Never**: Mix Firebase queries directly in components - use composables in `src/composables/`.

### Test Utilities: Centralized Helpers (NEW - Active Migration)

**Current Standard** (as of Nov 2025):

```typescript
// Import from centralized location
import { createTestSuite, createMockRequest, expectApiSuccess } from './helpers/index.js';

describe('MyService', () => {
  const suite = createTestSuite('MyService');

  beforeEach(() => {
    suite.beforeEach();
    suite.withDatabase({ users: { 'user-1': { uid: 'user-1' } } });
  });

  afterEach(suite.afterEach); // Automatic cleanup tracking
});
```

**Avoid**: Manual `seedDb()`/`resetDb()` calls, local mock factories, duplicate test utilities.
See `functions/test/MIGRATION_LEARNINGS.md` for migration patterns.

## Essential Development Commands

### Development Modes (Choose Based on What You're Testing)

```bash
npm run dev              # Frontend only - UI work, mock auth via VITE_DEV_AUTH=true
npm run dev:full         # Frontend + backend - features requiring auth/Firestore
npm run dev:firebase     # Full stack + hosting - production-like pre-deploy testing
```

**Mock Auth Setup**: Copy `frontend/.env.example` → `frontend/.env.local`, set `VITE_DEV_AUTH=true`.

### Testing & Quality

```bash
npm test                        # Run both frontend + functions tests
npm run test:functions          # Vitest (unit/integration)
npm run test:frontend           # Vitest (unit) + Playwright (e2e)
npm run lint                    # ESLint + TypeScript + markdownlint (CI requirement: zero errors)
```

### API Documentation Workflow

**Critical**: After changing endpoints in `functions/src/`, regenerate OpenAPI spec:

```bash
npm run docs                    # Build functions + generate OpenAPI
# Then commit both functions/openapi/openapi.json AND frontend/public/api/openapi.json
```

Frontend's Scalar UI at `/api-docs` reads from `public/api/openapi.json`.

## Project-Specific Conventions

### TypeScript Strictness

- `functions/`: Strict mode enforced, no `any` without `// eslint-disable-next-line` justification
- `frontend/`: Uses `@/` alias for imports (`@/components`, `@/stores`, `@/composables`)

### File Organization

```
functions/
  src/
    services/        # Business logic (reusable across routes)
    middleware/      # Auth, validation, error handling
    handlers/        # Cloud Functions entry points
    utils/           # Pure utility functions
  test/
    helpers/         # Centralized test utilities (USE THESE)
    *.test.ts        # Colocated with source via mirror structure

frontend/
  src/
    components/      # Vue components (kebab-case.vue)
    composables/     # Composition API logic (useXxx pattern)
    stores/          # Pinia stores (XxxStore.ts)
    services/        # API clients, external integrations
```

### Environment & Runtime

- **Node 22.x required** - Functions runtime + frontend parity
- **Java 11+ required** - Firebase emulator suite dependency
- **Workspace commands**: Use `npm run X --workspace=functions` OR `cd functions && npm run X`

## Common Pitfalls

1. **Forgetting OpenAPI regen**: Changed `functions/src/routes/`? Must run `npm run docs`.
2. **Mixing CJS/ESM**: Root is ESM (`"type": "module"`), use `.js` extensions in imports.
3. **Test isolation**: Always use `suite.afterEach()` for cleanup - prevents test pollution.
4. **CORS issues**: `functions/src/config/corsConfig.ts` whitelists origins; emulators bypass this.
5. **Cold-start regressions**: Never eagerly import heavy Express middleware in `functions/src/index.ts`.

## Integration Points

- **Tarkov.dev API**: Data sync via `functions/src/scheduled/updateTarkovdata.ts`, runs via `npm run maps:sync`
- **Firestore**: Rules in `firestore.rules`, indexes in `firestore.indexes.json` (both at root)
- **Hosting**: `frontend/dist/` deployed via Firebase Hosting, configured in `firebase.json`

## Quick Reference for New Features

1. **Adding API endpoint**:
   - Route in `functions/src/routes/`, register in `app.ts`, run `npm run docs`
2. **Adding Vue page**:
   - Component in `frontend/src/views/`, route in `router/index.ts`
3. **Adding test**:
   - Use `createTestSuite()` pattern from `functions/test/helpers/index.js`
4. **Deploying staging**:
   - `npm run deploy:staging` creates 7-day preview channel

For deeper context, see `AGENTS.md` at repo root (this file distills key patterns for AI agents).
