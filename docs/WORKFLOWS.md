# Branch & Deployment Workflows

> **Audience:** All contributors  
> **Purpose:** Branch strategy, PR process, and deployment procedures

## Branch Hierarchy

```
main (production)
  ↑
staging (integration preview)
  ↑
feature/*, fix/*, deps/* (short-lived)
```

### Branch Roles

- **`main`** – Production-ready, protected, always deployable
- **`staging`** – Integration branch for preview channel deployment
- **`feature/*`**, **`fix/*`**, **`deps/*`** – Created from `staging`, merged back quickly (≤1 week)

---

## Feature Development Flow

**1. Start from staging:**
```bash
git checkout staging
git pull origin staging
git checkout -b feature/my-feature
```

**2. Daily maintenance:**
- Keep branch updated by merging or rebasing `origin/staging` daily
- Resolve conflicts locally before pushing
- Keep work focused and time-boxed (1-3 days ideal)

**3. Open PR:**
- Target: `staging`
- Ensure CI passes (lint, test, build)
- Address review feedback
- Merge and delete branch

**4. Staging soak:**
- Let changes sit in staging 24-48 hours
- Monitor preview channel for regressions
- Run smoke tests on deployed preview

**5. Promote to production:**
```bash
git checkout main
git pull origin main
git merge staging
git push origin main
npm run deploy:prod
```

---

## Hotfix Process

For critical production issues:

```bash
# 1. Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue

# 2. Fix and test
# ... make changes ...
npm run lint
npm run test
npm run build

# 3. Merge to main
git checkout main
git merge hotfix/critical-issue
git push origin main
npm run deploy:prod

# 4. Backport to staging
git checkout staging
git merge main
git push origin staging
```

---

## Pre-Deployment Checklist

Before promoting `staging` → `main`:

- ✅ All tests pass (`npm run test`)
- ✅ Linting clean (`npm run lint`)
- ✅ Production build succeeds (`npm run build`)
- ✅ Emulators run without errors (`npm run emulators`)
- ✅ Staging preview manually tested
- ✅ No blockers or critical bugs
- ✅ Firebase config changes documented (if any)
- ✅ Secrets/environment variables updated (if needed)

---

## Deployment Commands

**Staging Preview:**
```bash
npm run deploy:staging
```
- Creates 7-day preview channel
- Deploys hosting + functions
- Provides preview URL for testing

**Production:**
```bash
npm run deploy:prod
```
- Builds functions + frontend
- Regenerates OpenAPI docs
- Deploys to production hosting + functions
- Should only run from `main` branch

---

## Best Practices

**Branch Management:**
- Keep branches short-lived (≤1 week)
- Delete feature branches after merge
- Use descriptive names (`feature/token-expiration`, not `feature/updates`)

**Commit Messages:**
- Use Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- Reference tickets/issues (`TT-123`, `Fixes #42`)
- Keep first line ≤72 characters

**Breaking Changes:**
- Document thoroughly in PR description
- Update relevant docs (SECURITY.md, ARCHITECTURE.md, etc.)
- Consider feature flags for risky changes
- Coordinate with team on API changes

**Firebase Config:**
- Never commit secrets or `.env` files
- Update `firebase.json` carefully (validate with emulators first)
- Document Firestore rule changes in PR
- Test index requirements before deploying

---

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) – Setup, testing, and dependency management
- [ARCHITECTURE.md](./ARCHITECTURE.md) – System design and caching
