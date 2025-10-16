# Dependency Upgrade Quick Start Guide

Quick reference for upgrading TarkovTracker dependencies**

For full details, see [DEPENDENCY_UPGRADE_STRATEGY.md](./DEPENDENCY_UPGRADE_STRATEGY.md)

---

## Prerequisites

- ✅ Node.js v22+ installed
- ✅ All tests passing
- ✅ Clean git working directory
- ✅ Read upgrade strategy document

## Quick Upgrade Path

### Step 1: Create Snapshot (5 minutes)

```bash
# Create pre-upgrade snapshot
./scripts/snapshot.sh

# Verify snapshot created
ls -la .upgrade-snapshots/
```

### Step 2: Execute Batch Updates

#### Week 1 - Patch Updates (Low Risk)

```bash
# Update safe patch versions
./scripts/batch-update.sh 1

# Verify health
./scripts/health-check.sh

# Commit changes
git add .
git commit -m "chore: update patch versions (batch 1)

- concurrently 9.2.0 → 9.2.1
- vite 7.1.9 → 7.1.10
- happy-dom 20.0.0 → 20.0.1
- globals 16.3.0 → 16.4.0
- taze 19.1.0 → 19.7.0"
```

#### Week 2 - Minor Updates (Low Risk)

```bash
# Update minor versions
./scripts/batch-update.sh 2

# Run health check
./scripts/health-check.sh

# Commit
git add .
git commit -m "chore: update minor versions (batch 2)

- eslint-plugin-vue 10.3.0 → 10.5.0
- firebase-tools 14.11.1 → 14.19.1"
```

#### Week 3-4 - Firebase 12 (BREAKING)

```bash
# Update Firebase
./scripts/batch-update.sh 3

# Migrate .exists property to .exists() method
./scripts/migrate-firebase-exists.sh

# Review changes carefully
git diff

# Test thoroughly
npm run build
npm test
npm run emulators

# Manual testing (see checklist below)

# Commit
git add .
git commit -m "feat: upgrade Firebase to v12

BREAKING CHANGES:
- Firebase 11.10.0 → 12.4.0
- Migrated DocumentSnapshot.exists property to method
- Updated 20+ usages across functions codebase

Migration details in DEPENDENCY_UPGRADE_STRATEGY.md"
```

#### Week 5-6 - Apollo Client 4 (BREAKING)

```bash
# Update Apollo Client
./scripts/batch-update.sh 4

# Run automated codemod
cd frontend
npx @apollo/client-codemod@latest migrate-to-4.0

# Manual updates to apollo.ts (see migration guide)

# Test
npm run build
npm test
npm run dev

# Commit
git add .
git commit -m "feat: upgrade Apollo Client to v4

BREAKING CHANGES:
- @apollo/client 3.14.0 → 4.0.7
- Added RxJS peer dependency
- Updated Apollo client configuration
- Migrated to new HttpLink API

Migration details in DEPENDENCY_UPGRADE_STRATEGY.md"
```

#### Week 7+ - Remaining Updates

```bash
# Update remaining packages
./scripts/batch-update.sh 5

# Test extensively
npm run build
npm test

# Commit
git add .
git commit -m "chore: update remaining dependencies (batch 5)

- uuid 11.1.0 → 13.0.0
- jsdom 26.1.0 → 27.0.0
- ts-essentials 9.4.2 → 10.1.1
- @intlify/unplugin-vue-i18n 6.0.8 → 11.0.1
- @types/node 22.18.10 → 24.7.2"
```

---

## Manual Testing Checklist

After each major upgrade (batches 3+), verify:

### Critical User Flows

- [ ] User registration and login
- [ ] Progress tracking (tasks, hideout)
- [ ] Team creation and joining
- [ ] API token generation
- [ ] Map viewing with markers
- [ ] Data sync across team members
- [ ] Task filtering and search
- [ ] Needed items calculation

### Technical Verification

- [ ] No console errors in browser
- [ ] No console errors in server logs
- [ ] Firebase emulators run successfully
- [ ] GraphQL queries return data
- [ ] Firestore reads/writes work
- [ ] Authentication flow works

### Performance Check

- [ ] Page load time acceptable (<3s)
- [ ] Bundle size reasonable (<5MB)
- [ ] API responses fast (<500ms)

---

## Rollback Procedures

### Quick Rollback (Git)

```bash
# Rollback to pre-upgrade commit
git log --oneline | head -5
git checkout <commit-hash>
npm install
npm run build
```

### Restore from Snapshot

```bash
# Find your snapshot
ls -la .upgrade-snapshots/

# Restore package manifests
SNAPSHOT=".upgrade-snapshots/YYYYMMDD-HHMMSS"
cp $SNAPSHOT/package.json .
cp $SNAPSHOT/package-lock.json .
cp $SNAPSHOT/frontend-package.json frontend/package.json
cp $SNAPSHOT/frontend-package-lock.json frontend/package-lock.json
npm install
npm run build
```

### Restore from Git Tag

```bash
# List pre-upgrade tags
git tag -l "pre-upgrade-*"

# Restore to tag
git checkout pre-upgrade-YYYYMMDD-HHMMSS
npm install
npm run build
```

---

## Health Check Commands

```bash
# Full health check
./scripts/health-check.sh

# Individual checks
npm run build                    # Build check
npm run build:functions          # Functions build
cd frontend && npm run type-check  # TypeScript check
npm run lint                     # Lint check
npm test                         # Unit tests
npm run emulators                # Firebase emulators
cd frontend && npm run test:e2e  # E2E tests
npm audit                        # Security check
```

---

## Troubleshooting

### Issue: Build fails after upgrade

```bash
# Check error logs
npm run build 2>&1 | tee build-error.log

# Clear and rebuild
rm -rf node_modules frontend/node_modules functions/node_modules
rm -rf frontend/dist functions/lib
npm install
npm run build
```

### Issue: Tests fail after upgrade

```bash
# Check test output
npm test 2>&1 | tee test-error.log

# Clear test cache
cd frontend && npx vitest run --clearCache
cd ../functions && npx vitest run --clearCache
```

### Issue: Firebase emulator won't start

```bash
# Clear emulator data
rm -rf .firebase/

# Restart emulators
npm run emulators
```

### Issue: TypeScript errors after upgrade

```bash
# Regenerate lockfile
rm -rf node_modules package-lock.json
npm install

# Check TypeScript version compatibility
npm list typescript
```

---

## Success Metrics

After each upgrade, verify:

| Metric | Target | Command |
|--------|--------|---------|
| Build Status | ✅ Success | `npm run build` |
| Test Pass Rate | 100% | `npm test` |
| Type Errors | 0 | `cd frontend && npm run type-check` |
| Security Vulnerabilities | 0 | `npm audit` |
| Bundle Size | <5MB | `ls -lh frontend/dist` |
| Page Load Time | <3s | Manual test |

---

## Getting Help

- **Strategy Document:** [DEPENDENCY_UPGRADE_STRATEGY.md](./DEPENDENCY_UPGRADE_STRATEGY.md)
- **Migration Guides:** See strategy doc sections on Firebase, Apollo, UUID
- **Scripts Documentation:** [SCRIPTS.md](./SCRIPTS.md)
- **Firebase Support:** <https://firebase.google.com/support>
- **Apollo Support:** <https://community.apollographql.com/>

---

## Timeline Summary

| Week | Batch | Packages | Risk | Time Estimate |
|------|-------|----------|------|---------------|
| 1 | Batch 1 | 5 patch updates | Low | 2-4 hours |
| 2 | Batch 2 | 2 minor updates | Low | 2-4 hours |
| 3-4 | Batch 3 | Firebase 12 | Medium | 4-8 hours |
| 5-6 | Batch 4 | Apollo 4 | Medium-High | 6-10 hours |
| 7+ | Batch 5 | 5 major updates | Variable | 4-8 hours |

**Total estimated time:** 18-34 hours across 7+ weeks

---

**Last Updated:** 2025-10-14
**Next Review:** After Batch 3 completion
