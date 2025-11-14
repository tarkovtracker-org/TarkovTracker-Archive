# Development Guide

> **Audience:** Contributors, developers  
> **Purpose:** Setup, testing workflows, dependency management, and quality gates

Comprehensive guide for contributors covering setup, workflows, testing, and deployment.

## Contents
- [Development Modes](#development-modes)
- [Testing Strategy](#testing-strategy)
- [Dependency Management](#dependency-management)
- [Rate Limiting](#rate-limiting)
- [Current Focus](#current-focus)
- [Related Documentation](#related-documentation)

---

## Development Modes

Choose the right command for your work:

| Command | What it runs | Use case |
|---------|-------------|----------|
| `npm run dev` | Vite dev server (port 3000) | Fast UI iteration, component work |
| `npm run dev:full` | Vite + Auth/Firestore/Functions emulators | Backend integration, auth flows |
| `npm run dev:firebase` | Production build + all emulators (port 5000) | Pre-deploy verification |

**Quick Tips:**
- `dev` is fastest for frontend-only work
- `dev:full` gives real Firebase services without hosting
- `dev:firebase` mirrors production but takes longer to start

### Mock Authentication

For frontend-only development without emulators:

```bash
cp frontend/.env.example frontend/.env.local
# Edit .env.local:
VITE_DEV_AUTH=true
npm run dev
```

**Important:** Disable mock auth (`false` or remove the line) before testing real authentication flows.

---

## Testing Strategy

### Unit & Integration Tests

**Run All Tests:**
```bash
npm run test                    # Functions → Frontend
npm run test:frontend           # Frontend only
npm run test:functions          # Backend only
npm run test:coverage           # Coverage reports (both)
```

**Frontend Tests:**
```bash
cd frontend
npm run test:run                # Vitest (CI mode)
npm run test:watch              # Watch mode
npm run test:coverage           # Coverage report
```

**Backend Tests:**
```bash
cd functions
npm test                        # Vitest suite
npm run type-check              # TypeScript validation
```

### End-to-End Tests

**Configuration:**
- Playwright runs on `main` and `develop` branch pushes only (not every PR)
- Targets production-like deployments
- Default: Chromium, two workers, single retry

**Running Locally:**
```bash
cd frontend
npm run test:e2e                # Headless Chromium
npm run test:e2e:headed         # Headed mode for debugging
npm run test:e2e:ui             # Playwright UI mode
```

**Browser Coverage:**
- Chromium (default, always enabled)
- Firefox, WebKit, mobile viewports (uncomment in `playwright.config.ts` as needed)

**Best Practices:**
- Use `waitForSelector` instead of hardcoded `waitForTimeout`
- Improve Firebase/API mocks for deterministic results
- Add Lighthouse checks once baseline is stable

### Quality Gates

All PRs must pass:
- ✅ `npm run lint` – ESLint + TypeScript + markdownlint
- ✅ `npm run format:check` – Prettier validation
- ✅ `npm run test` – Full test suite
- ✅ `npm run build` – Production build

**Pre-merge checklist:**
```bash
npm run lint
npm run test
npm run build
npm run emulators  # If touching backend
```

---

## Dependency Management

### Current Baseline

**Runtime:**
- Node.js: 22.16+ (matches CI and Cloud Functions)
- Firebase: 12.x line (`^12.5.0`)
- Apollo Client: v3.14.0 (v4 upgrade pending)
- Vite: 7.1.x, Vitest, Playwright

**Package Management:**
- npm workspaces manage `frontend/` and `functions/`
- Single `package-lock.json` at repo root
- Always run `npm install` from root

### Upgrade Process

**Interactive Upgrades:**
```bash
npm run deps                    # Launch taze for interactive selection
```

**Upgrade Workflow:**
1. Run `scripts/snapshot.sh` to capture baseline
2. Use `npm run deps` to select upgrades
3. Run full quality gate: lint, test, build, emulators
4. Run `scripts/health-check.sh` to verify
5. Document breaking changes in PR

### Priority Upgrades

**Planned:**
- Apollo Client v3 → v4 (requires RxJS peer, API changes)
- Major version bumps for stable packages

**Process:**
- Tackle in small batches (avoid mega-upgrades)
- Test thoroughly with emulators
- Update this document after each major change

---

## Rate Limiting

The backend uses an in-memory abuse guard to protect write endpoints from excessive traffic.

### How It Works

- **Scope:** POST/PUT/PATCH/DELETE on `/api/progress` and `/api/team`
- **Tracking:** Requests counted per hashed token (or IP fallback)
- **Sliding Window:** Configurable time window with automatic reset
- **Warning:** Logs at 80% of threshold
- **Block:** Returns 429 after consecutive breaches

### Configuration

```bash
ABUSE_GUARD_WINDOW_MS=10000           # Window size (1s-60s)
ABUSE_GUARD_THRESHOLD=150             # Max requests per window
ABUSE_GUARD_WARN_RATIO=0.8            # Warning trigger point
ABUSE_GUARD_BREACH_LIMIT=2            # Breaches before 429
ABUSE_GUARD_PATH_PREFIXES=/api/progress,/api/team
ABUSE_GUARD_COLLECTION=rateLimitEvents
```

### Tuning Guidelines

**Raising Limits:**
- Increase `THRESHOLD` for high-traffic events
- Collect baseline data before reverting
- Monitor `rateLimitEvents` collection

**Investigation:**
- Filter events by `tokenOwner` or `cacheKey`
- Check for suspicious patterns (rapid bursts, single source)
- Legitimate users should never hit 429s during normal play

**Event Schema:**
```typescript
{
  tokenOwner: string,    // User UID, team ID, or token ID
  cacheKey: string,      // SHA-256 hash (never raw token)
  timestamp: Timestamp,
  method: string,
  path: string,
  message?: string,
  ip?: string,
  userAgent?: string
}
```

---

## Current Focus

### Performance Migration

**Goal:** Eliminate GraphQL blocking, achieve FCP ≤ 2.5s, LCP ≤ 3.0s

**Strategy:**
- Replace `useTarkovApi()` GraphQL calls with Firestore cache helpers
- Items cache already sharded and scheduled (6-hour refresh)
- Target: Tasks, hideout, trader composables

**Next Steps:**
1. Build Firestore read helpers for remaining datasets
2. Migrate UI components to use cached data
3. Remove unused GraphQL code and dependencies
4. Validate with Lighthouse and Firestore quota monitoring

**Success Metrics:**
- Lighthouse Mobile: FCP ≤ 2.5s, LCP ≤ 3.0s, CLS ≤ 0.1
- Initial JS payload: ≤ 250 KB gzip
- Firestore reads: ≤ 10 per user session

### Other Priorities

See [TECHNICAL_DEBT.md](./development/TECHNICAL_DEBT.md) for ongoing refactoring work.

---

## Related Documentation

- [NEW_FEATURE_TEMPLATE.md](./NEW_FEATURE_TEMPLATE.md) – Step-by-step guide for adding new features
- [WORKFLOWS.md](./WORKFLOWS.md) – Branch strategy and deployment process
- [SECURITY.md](./SECURITY.md) – Authentication, validation, CORS
- [ARCHITECTURE.md](./ARCHITECTURE.md) – System design and caching
- [TECHNICAL_DEBT.md](./development/TECHNICAL_DEBT.md) – Refactoring backlog
