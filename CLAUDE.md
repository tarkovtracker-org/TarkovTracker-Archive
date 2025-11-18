# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TarkovTracker is a Firebase-backed Vue 3 + TypeScript web application for tracking Escape From Tarkov game progression. The codebase uses npm workspaces (`frontend/` and `functions/`) with shared tooling at the root level.

**Stack:**
- Frontend: Vue 3, Vite, TypeScript, Pinia, Vuetify, VueFire
- Backend: Firebase Cloud Functions (Express), Firestore
- Testing: Vitest (unit/integration), Playwright (e2e)
- Runtime: Node.js 22.x, Java 11+ (Firebase emulators)

## Essential Commands

### Development Modes

Choose based on what you're testing:

```bash
# Frontend only - UI work, fastest iteration
npm run dev

# Frontend + Auth/Firestore/Functions - backend integration testing
npm run dev:full

# Full stack + hosting - production-like pre-deploy testing (slower startup)
npm run dev:firebase
```

**Mock Authentication:** For frontend-only work, copy `frontend/.env.example` to `frontend/.env.local` and set `VITE_DEV_AUTH=true`. Disable before testing real auth flows.

### Testing

```bash
# Run all tests (functions then frontend)
npm test

# Run specific workspace tests
npm run test:functions          # Backend unit + integration tests
npm run test:frontend           # Frontend unit tests + Playwright e2e

# Coverage reports
npm run test:coverage           # Both workspaces
npm run test:coverage:functions # Backend coverage only
npm run test:coverage:frontend  # Frontend coverage only

# Single test files (workspace context required)
cd functions && npm test -- src/services/ProgressService.test.ts
cd frontend && npm run test:watch -- src/composables/useTaskList.test.ts
```

### Building & Deployment

```bash
# Full production build (functions → OpenAPI → frontend)
npm run build

# Individual builds
npm run build:functions         # TypeScript compilation to lib/
npm run build:frontend          # Vite production build to frontend/dist/

# Deployment
npm run deploy:staging          # 7-day preview channel
npm run deploy:prod            # Production deployment
```

### Code Quality

```bash
# Linting (CI requirement: zero errors)
npm run lint                    # ESLint + TypeScript + markdownlint (orchestrated)

# Formatting
npm run format                  # Prettier auto-format
npm run format:check            # Check without modifying files

# Type checking
cd functions && npm run type-check
cd frontend && npm run type-check
```

### API Documentation

```bash
# Generate OpenAPI spec (required after changing endpoints)
npm run docs                    # Build functions + generate openapi.json
npm run docs:generate           # Copy spec to frontend/public/api/
npm run docs:check             # Verify sync between functions and frontend
```

## Architecture & Key Patterns

### Firebase Functions: Lazy Cold-Start Optimization

**CRITICAL:** Cloud Functions minimize cold-start time by lazily constructing the Express app. Never eagerly import heavy resources at module level.

```typescript
// functions/src/index.ts - Correct pattern
let cachedApp: Express | undefined;
async function getApiApp(): Promise<Express> {
  if (cachedApp) return cachedApp;
  cachedApp = await createApp(); // Lazy construction
  return cachedApp;
}

// ❌ NEVER do this at module level in index.ts:
import { myRouter } from './routes/myRouter'; // Loads Express + all routes immediately
```

**When adding routes:** Register in `functions/src/app/app.ts`, NOT in `index.ts` directly.

**Service initialization:**
```typescript
// Correct: Lazy Firestore initialization
const createLazyFirestore = () => {
  let db: Firestore | undefined;
  return () => {
    if (!db) db = getFirestore();
    return db;
  };
};
```

### Backend Structure: Handler → Service Pattern

```
functions/src/
├── app/               # Express app config + routing
├── handlers/          # HTTP endpoint entry points (thin controllers)
├── services/          # Business logic (ProgressService, TeamService, etc.)
├── middleware/        # CORS, auth, validation, error handling
├── repositories/      # Data access layer (growing pattern)
├── scheduled/         # Background jobs (data sync, cleanup)
└── utils/            # Utility functions + factory
```

**Adding a new endpoint:**
1. Create handler in `functions/src/handlers/myFeatureHandler.ts`
2. Create service in `functions/src/services/MyFeatureService.ts`
3. Register routes in `functions/src/app/app.ts`
4. Run `npm run docs` to regenerate OpenAPI spec
5. Commit both `functions/openapi/openapi.json` and `frontend/public/api/openapi.json`

### Frontend Structure: Store → Composable → View

```
frontend/src/
├── components/
│   ├── ui/           # Pure UI components (buttons, cards)
│   ├── layout/       # Navigation, sidebars, footers
│   └── domain/       # Business components (tasks/, hideout/, team/, etc.)
├── views/            # Page-level components (*View.vue)
├── composables/      # Composition functions (use* pattern)
├── stores/           # Pinia state management
├── services/         # API clients
└── utils/           # Utility functions
```

**State management pattern:**
- **Pinia stores** manage UI state and persistence (`stores/user.ts`, `stores/progress.ts`)
- **VueFire composables** handle Firebase real-time sync
- **Custom composables** provide reactive computations and UI logic
- **Components** orchestrate stores and composables (no direct Firebase queries)

**Shared state interfaces:**
- `shared_state.ts` defines core types (`UserProgressData`, `TaskObjective`, `GameMode`)
- Import these types in both stores and composables for consistency

### Test Utilities: Centralized Helpers

**IMPORTANT:** Use standardized test utilities from `functions/test/helpers/index.js`:

```typescript
// Correct pattern (Nov 2025 standard)
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

**Avoid:** Manual `seedDb()`/`resetDb()` calls, local mock factories, duplicate test utilities.

### Data Caching Strategy

The backend uses Firestore to cache Tarkov.dev game data, eliminating heavy GraphQL calls:

**Scheduled jobs** (`functions/src/scheduled/index.ts`):
- Fetch tasks, hideout, items from Tarkov.dev every 6 hours
- Shard large datasets (items) to respect Firestore 1 MiB limit
- Write to `/tarkovData/{tasks,hideout,traders,items}` collections

**Frontend consumption:**
- `useFirestoreTarkovItems()` aggregates sharded items
- `useFirestoreTasks()`, `useFirestoreHideout()` bind to cached collections
- Benefits: Single fetch per session, no GraphQL blocking, immediate reactivity

## Project-Specific Conventions

### TypeScript

- **Functions workspace:** Strict mode enforced, no `any` without `// eslint-disable-next-line` justification
- **Frontend workspace:** Uses `@/` alias for imports (`@/components`, `@/stores`, `@/composables`)
- Both workspaces use ESM (`"type": "module"`) - use `.js` extensions in imports

### File Naming

- Components: `PascalCase.vue` (e.g., `TaskCard.vue`, `HideoutCard.vue`)
- Views: `*View.vue` (e.g., `DashboardView.vue`, `ItemsView.vue`)
- Composables: `use*.ts` (e.g., `useTaskList.ts`, `useUserLevel.ts`)
- Stores: `camelCase.ts` (e.g., `progress.ts`, `ui-settings.ts`)
- Utils: `camelCase.ts` (e.g., `logger.ts`, `debounce.ts`)

### Import Order

1. External libraries (Vue, Express, etc.)
2. Type imports (`import type`)
3. Internal utilities (`@/utils/`, `@/types/`, `@/shared_state`)
4. Composables (`@/composables/`)
5. Stores (`@/stores/`)
6. Components (`@/components/`)

### Security & Validation

- **Input validation:** Always validate at service layer
- **Authorization:** Use permission-based middleware (`requirePermission('GP')`)
- **Rate limiting:** AbuseGuard prevents API abuse on write endpoints
- **Error messages:** Don't leak sensitive information in responses
- **Logging:** Use centralized logger (`functions/src/logger.ts`)

## Common Pitfalls & Solutions

1. **Forgetting OpenAPI regen:** Changed backend routes? Must run `npm run docs` and commit both OpenAPI files
2. **Cold-start regressions:** Never eagerly import Express middleware in `functions/src/index.ts`
3. **Test isolation:** Always use `suite.afterEach()` for cleanup to prevent test pollution
4. **CORS issues:** `functions/src/config/corsConfig.ts` whitelists origins; emulators bypass this
5. **Mixed CJS/ESM:** Root is ESM - use `.js` extensions in imports, not `.ts`
6. **Direct Firebase in components:** Use composables (`composables/firebase/`) instead of direct queries

## Integration Points

- **Tarkov.dev API:** Data sync via scheduled job, manual refresh: `npm run maps:sync`
- **Firestore Rules:** `firestore.rules` at repo root
- **Firestore Indexes:** `firestore.indexes.json` at repo root
- **Hosting:** `frontend/dist/` deployed via Firebase Hosting, configured in `firebase.json`
- **OpenAPI Spec:** Generated at `functions/openapi/openapi.json`, consumed by Scalar UI at `/api-docs`

## Claude Code Behavior & Operating Modes

You are integrated with this repo via Claude Code (VS Code / CLI). You can:
- Search and open files,
- Edit code,
- Run npm scripts and other commands,
- Read test / lint / build output.

### Default Mode: Direct Fix (DO THE WORK)

This is the default for all chats **unless I explicitly ask for agent prompts**.

In Direct Fix mode:

- Start from the **symptom** I give you (logs, stack traces, lint output, failing tests).
- Use your tools to:
  - locate the relevant files (router, views, composables, functions, configs),
  - read enough surrounding code to understand the problem,
  - make focused edits.
- Do **not** wait for me to paste files you can open yourself.
- Do **not** refuse to touch “pre-existing” issues if they are obviously part of the same root cause.
- Prefer fixing the **root cause** (shared type, util, config, pattern) over patching each individual call site.

When I paste **only console logs or stack traces**, treat that as:

> “Figure out what’s actually wrong, find the relevant code using tools, propose a small plan, then implement it.”

After any non-trivial code changes, you should:
- Run the appropriate commands for the area you touched, for example:
  - `npm run lint`
  - `npm run test:frontend` or `npm run test:functions`
  - `npm run build:frontend` or `npm run build:functions` when relevant
- Summarize:
  - what changed (files + intent),
  - which checks you ran,
  - what passed/failed and what still needs attention.

Only ask me questions when:
- a command or file path genuinely does not exist, **and**
- you’ve already tried reasonable alternatives and can’t proceed.

### Orchestrator Mode: 5-Agent Prompt Generator

Sometimes I want you to **plan work for other agents instead of editing code yourself**.

You should enter **Orchestrator Mode** only when my message clearly indicates it, e.g.:
- “Generate 5 agent prompts for this.”
- “I need a 5-agent batch for this task.”
- “Agent plan only, don’t edit code.”

When in Orchestrator Mode:

- **Do not** edit any files.
- **Do not** run commands, except as needed to inspect or understand context.
- Your output should be **exactly 5 agent prompts**, each formatted like this:

```markdown
### Agent Task N: <Short Title>

**Goal:**  
<What this agent should achieve, in 1–2 sentences.>

**Scope (files / areas):**  
- <list key directories/files/modules this agent should touch>

**Instructions for the agent:**  
- Step 1: <inspect / analyze>
- Step 2: <implement changes>
- Step 3: <cleanup / refactor if needed>

**Commands to run:**  
- `npm run <...>` (specify exact scripts relevant to this task)
- `npm run test:<...>` (if applicable)

**Done when:**  
- <clear acceptance criteria, e.g. no ESLint errors in X, all tests in Y suite pass, etc.>
```

* Ensure the 5 tasks are:

  * Non-overlapping,
  * As independent as reasonably possible,
  * High-impact and aligned with this repo’s conventions (as documented above in CLAUDE.md).

When I do **not** explicitly ask for “agent prompts” or “orchestrator/agent mode”, assume I want **Direct Fix mode** and that you should make and validate the changes yourself.

### Attitude

* Default to **taking action** over asking me what to do next.
* If I’m aiming at the wrong problem (e.g., obsessing over one ESLint rule while the real bug is a broken dynamic import), say that clearly and redirect me:

  * e.g., “This ESLint error is a symptom. The real problem is X in file Y; here’s why.”
* Keep changes scoped and explain trade-offs, but don’t treat me like I need hand-holding on every tiny step.

## Development Workflow

### Adding a New Feature

**Backend:**
1. Create handler in `functions/src/handlers/myFeatureHandler.ts`
2. Create service in `functions/src/services/MyFeatureService.ts` with lazy Firestore init
3. Register routes in `functions/src/app/app.ts`
4. Add tests in `functions/test/integration/` using `createTestSuite()`
5. Run `npm run docs` to regenerate OpenAPI spec

**Frontend:**
1. Define types in `types/models/` or use `shared_state.ts` interfaces
2. Create store in `stores/myFeature.ts` with Composition API
3. Create composables in `composables/myFeature/` or feature subdirectory
4. Add domain components in `components/domain/myFeature/`
5. Create view in `views/myFeature/MyFeatureView.vue`
6. Register route in `router/index.ts`
7. Add tests colocated with components/composables

### Quality Gates (All PRs)

```bash
npm run lint                    # ESLint + TypeScript + markdownlint (zero errors)
npm run format:check            # Prettier validation
npm test                        # Full test suite
npm run build                   # Production build
npm run emulators              # Backend integration check
```

### Deployment

```bash
# Staging (7-day preview)
npm run deploy:staging

# Production
npm run deploy:prod
```

## Performance Considerations

### Frontend Performance Goals

- FCP: ≤ 2.5s
- LCP: ≤ 3.0s
- CLS: ≤ 0.1
- TBT: ≤ 200ms
- Initial JS: ≤ 250 KB gzip

**Strategies:**
- Firestore cache eliminates GraphQL blocking
- Lazy component loading with dynamic imports
- Virtual scrolling for large lists
- CSS containment prevents reflows

### Backend Optimization

- Lazy initialization for all heavy resources
- Singleton service instances
- Batch Firestore operations
- Transaction consistency
- Sharded document strategy for large datasets

## Related Documentation

For deeper context, see:

- `docs/BACKEND_STRUCTURE.md` - Backend patterns and technical debt targets
- `docs/ARCHITECTURE.md` - System design and caching strategy
- `docs/DEVELOPMENT.md` - Setup, testing workflows, dependency management
- `docs/WORKFLOWS.md` - Branch strategy and deployment process
- `docs/SECURITY.md` - Authentication, validation, CORS
- `docs/CI_PIPELINE.md` - CI/CD pipeline with quality gates
- `frontend/src/STRUCTURE.md` - Frontend directory organization and patterns
- `scripts/SCRIPTS.md` - Complete scripts reference
- `.github/copilot-instructions.md` - AI coding agent patterns
