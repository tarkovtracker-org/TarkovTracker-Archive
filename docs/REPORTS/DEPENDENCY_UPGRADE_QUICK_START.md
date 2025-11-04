# Dependency Upgrade Quick Start Guide

Quick reference for upgrading TarkovTracker dependencies

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

### Step 2: Execute Dependency Updates

#### Week 1-2 – Patch & Minor Updates (Low Risk)

Use the interactive taze workflow to review and accept safe bumps:

```bash
# Launch taze (interactive)
npm run deps

# Run the post-upgrade checks
./scripts/health-check.sh

# Commit the accepted changes
git add .
git commit -m "chore: update patch/minor dependencies"
```

Tips:

- Prefer selecting patch/minor upgrades only on the first pass.
- Keep a short list of accepted upgrades in the commit body for future reference.

#### Week 3-4 – Firebase 12 (BREAKING)

```bash
# Create a feature branch before making breaking changes
git checkout -b upgrade/firebase-12

# Upgrade Firebase packages in both workspaces
cd frontend
npm install firebase@^12.4.0
cd ..
npm install firebase@^12.4.0

# Migrate .exists property usage
./scripts/migrate-firebase-exists.sh

# Verify the repo and tests
git diff
npm run build
npm test
npm run emulators

# Commit once satisfied
git add .
git commit -m "feat: upgrade Firebase to v12"
```

Document breaking changes in the commit body and refer to `REPORTS/DEPENDENCY_UPGRADE_STRATEGY.md`
for the checklist.

#### Week 5-6 – Apollo Client 4 (BREAKING)

```bash
# Create a feature branch
git checkout -b upgrade/apollo-4

# Install required packages
cd frontend
npm install @apollo/client@^4.0.7 rxjs@^7.8.1

# Run the official codemod
npx @apollo/client-codemod@latest migrate-to-4.0

# Perform manual fixes as needed (see migration guide)

# Validate the upgrade
npm run build
npm test
npm run dev

# Commit when ready
git add .
git commit -m "feat: upgrade Apollo Client to v4"
```

#### Week 7+ – Remaining Majors

Handle any remaining major upgrades manually, guided by taze reports or dependency release notes:

```bash
# Example: update remaining majors in the frontend workspace
cd frontend
npm install uuid@^13.0.0 jsdom@^27.0.0 ts-essentials@^10.1.1
npm install -D @intlify/unplugin-vue-i18n@^11.0.1
cd ..

# Update Node types in the root
npm install -D @types/node@^24.7.2

# Final verification
npm run build
npm test

# Commit with a summary of package bumps
git add .
git commit -m "chore: update remaining major dependencies"
```

---

## Manual Testing Checklist

After each major upgrade (Firebase, Apollo, remaining majors), verify:

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
- **Scripts Documentation:** [SCRIPTS.md](/SCRIPTS.md)
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
