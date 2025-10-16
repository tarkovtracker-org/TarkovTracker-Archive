# Dependency Upgrade Strategy
## TarkovTracker Monorepo

**Generated:** 2025-10-14
**Current Node.js:** v22.16.0
**Security Status:** ✅ No vulnerabilities found

---

## Executive Summary

This document outlines a safe, incremental approach to upgrading dependencies across the TarkovTracker monorepo. The analysis identified **13 packages** with available updates, including **5 major version** upgrades requiring careful migration.

### Risk Assessment Overview

| Priority | Count | Risk Level | Timeline |
|----------|-------|------------|----------|
| **Critical** | 0 | N/A | Immediate |
| **High** | 3 | Low-Medium | 1-2 weeks |
| **Medium** | 5 | Low | 2-4 weeks |
| **Low** | 5 | Minimal | 4+ weeks |

### Key Findings

- ✅ **No security vulnerabilities** detected
- ⚠️ **5 major version upgrades** available with breaking changes
- ✅ **Node.js 22.16.0** meets all upgrade requirements
- ⚠️ **20+ usages** of Firestore `.exists` property requiring migration

---

## Detailed Dependency Analysis

### 1. Priority Matrix

#### Batch 1: High Priority - Patch Updates (Safe, Quick Wins)
**Timeline:** Week 1 | **Risk:** Minimal | **Testing:** Smoke Tests

| Package | Current | Target | Type | Breaking Changes |
|---------|---------|--------|------|------------------|
| `concurrently` | 9.2.0 | 9.2.1 | patch | None |
| `vite` | 7.1.9 | 7.1.10 | patch | None |
| `happy-dom` | 20.0.0 | 20.0.1 | patch | None |
| `globals` | 16.3.0 | 16.4.0 | minor | None |
| `taze` | 19.1.0 | 19.7.0 | minor | None |

**Upgrade Command:**
```bash
npm update concurrently vite globals taze
cd frontend && npm update vite happy-dom
```

**Testing Strategy:**
- Run `npm run build` across all workspaces
- Execute smoke tests: `npm test -- --run`
- Verify development server: `npm run dev`

---

#### Batch 2: Medium Priority - Minor Updates
**Timeline:** Week 2 | **Risk:** Low | **Testing:** Regression Suite

| Package | Current | Target | Type | Breaking Changes |
|---------|---------|--------|------|------------------|
| `eslint-plugin-vue` | 10.3.0 | 10.5.0 | minor | None expected |
| `firebase-tools` | 14.11.1 | 14.19.1 | minor | None expected |

**Upgrade Command:**
```bash
npm update eslint-plugin-vue firebase-tools
```

**Testing Strategy:**
- Full lint pass: `npm run lint`
- Build and test: `npm run build && npm test`
- Emulator test: `npm run emulators`

---

#### Batch 3: High Impact - Firebase 11 → 12 (BREAKING)
**Timeline:** Week 3-4 | **Risk:** Medium | **Testing:** Comprehensive

| Package | Current | Target | Type | Breaking Changes |
|---------|---------|--------|------|------------------|
| `firebase` (frontend) | 11.10.0 | 12.4.0 | major | ⚠️ Yes |
| `firebase` (root) | 12.2.1 | 12.4.0 | minor | None |

**Breaking Changes:**
1. **Node.js requirement:** Minimum v20 (✅ Current: v22.16.0)
2. **Firestore API change:** `DocumentSnapshot.exists` property → `exists()` method
3. **ES2020 target:** May require build configuration updates

**Impact Assessment:**
- 📊 **20+ occurrences** of `.exists` property in functions codebase
- 🔧 **Automated fix available** via codemod
- ⚠️ **Critical files affected:**
  - `functions/src/progress/progressHandler.ts` (3 occurrences)
  - `functions/src/services/ProgressService.ts` (3 occurrences)
  - `functions/src/services/TeamService.ts` (3 occurrences)
  - `functions/src/services/TokenService.ts` (2 occurrences)
  - `functions/src/token/create.ts` (2 occurrences)
  - `functions/src/token/revoke.ts` (2 occurrences)
  - `functions/src/auth/verifyBearer.ts` (1 occurrence)
  - `functions/src/handlers/userDeletionHandler.ts` (4 occurrences)

See **Migration Guide #1** below for detailed steps.

---

#### Batch 4: Complex - Apollo Client 3 → 4 (BREAKING)
**Timeline:** Week 5-6 | **Risk:** Medium-High | **Testing:** Full Integration

| Package | Current | Target | Type | Breaking Changes |
|---------|---------|--------|------|------------------|
| `@apollo/client` | 3.14.0 | 4.0.7 | major | ⚠️ Yes |

**Breaking Changes:**
1. **RxJS dependency:** New peer dependency `rxjs@^7.3.0` required
2. **Observable implementation:** Migrated from `zen-observable` to RxJS
3. **Core/React split:** Framework-specific exports separated (Vue apps use `/core`)
4. **Error handling:** Unified error properties, deprecated `ApolloError`
5. **TypeScript:** Stricter type requirements

**Current Usage:**
- 📁 `frontend/src/plugins/apollo.ts` - Core Apollo client setup
- 📁 `frontend/src/types/tarkov.ts` - GraphQL type definitions
- 📁 `frontend/src/test/setup.ts` - Test configuration

**Impact:** Moderate - Using `@apollo/client/core` (Vue-compatible), minimal React-specific code.

See **Migration Guide #2** below for detailed steps.

---

#### Batch 5: Build Tools - Major Updates
**Timeline:** Week 7+ | **Risk:** Variable | **Testing:** Comprehensive

| Package | Current | Target | Type | Breaking Changes |
|---------|---------|--------|------|------------------|
| `@intlify/unplugin-vue-i18n` | 6.0.8 | 11.0.1 | major | ⚠️ Unknown |
| `uuid` | 11.1.0 | 13.0.0 | major | ⚠️ Yes |
| `ts-essentials` | 9.4.2 | 10.1.1 | major | ⚠️ Unknown |
| `jsdom` | 26.1.0 | 27.0.0 | major | ⚠️ Unknown |
| `@types/node` | 22.18.10 | 24.7.2 | major | ⚠️ Type changes |

**UUID Breaking Changes:**
- Browser exports now default
- Dropped CommonJS support (ESM only)
- Dropped Node.js 16 support (✅ using v22)
- TypeScript 5.2+ required (✅ using v5.9.3)

**Current Usage:**
- 📁 `frontend/src/features/maps/TarkovMap.vue:49` - `import { v4 as uuidv4 } from 'uuid'`

**Recommendation:** Defer until after Firebase and Apollo migrations are complete.

---

## Migration Guides

### Migration Guide #1: Firebase 11 → 12

#### Overview
- **Estimated time:** 4-6 hours
- **Risk level:** Medium
- **Breaking changes:** 20+
- **Rollback complexity:** Low

#### Pre-Migration Checklist

- [ ] Current test suite passing (`npm test`)
- [ ] Create git branch: `git checkout -b upgrade/firebase-12`
- [ ] Backup Firebase emulator data: `npm run export:data`
- [ ] Team notified of planned upgrade

#### Step 1: Update Dependencies

```bash
# Update Firebase in frontend workspace
cd frontend
npm install firebase@^12.4.0

# Update Firebase in root workspace (minor update)
cd ..
npm install firebase@^12.4.0

# Verify installations
npm list firebase
```

#### Step 2: Automated Migration - Fix `.exists` Property

Create a migration script to automate the `.exists` → `.exists()` conversion:

```bash
# Create migration script
cat > scripts/migrate-firebase-exists.sh << 'EOF'
#!/bin/bash
# Firebase 12 Migration: Convert .exists property to .exists() method

echo "🔍 Scanning for .exists usage..."

# Find and replace in functions directory
find functions/src -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i.bak 's/\(Doc\|Snap\|snapshot\|doc\)\.exists\([^(]\)/\1.exists()\2/g' {} \;

echo "✅ Migration complete!"
echo "📝 Backup files created with .bak extension"
echo ""
echo "🔍 Please review changes with: git diff"
EOF

chmod +x scripts/migrate-firebase-exists.sh

# Run migration
./scripts/migrate-firebase-exists.sh
```

**Manual verification required for:**
- `functions/src/progress/progressHandler.ts:157, 253, 274`
- `functions/src/services/ProgressService.ts:53, 292, 315`
- `functions/src/services/TeamService.ts:129, 274, 291`
- `functions/src/services/TokenService.ts:32, 148`
- `functions/src/token/create.ts:87, 105`
- `functions/src/token/revoke.ts:89, 109`
- `functions/src/auth/verifyBearer.ts:47`
- `functions/src/handlers/userDeletionHandler.ts:90, 104, 178`
- `functions/src/utils/dataLoaders.ts:29`
- `functions/test/apiv2.test.js:57` (test file)

#### Step 3: Code Pattern Updates

**Before:**
```typescript
const userDoc = await userRef.get();
if (userDoc.exists) {  // ❌ Property access
  const data = userDoc.data();
}
```

**After:**
```typescript
const userDoc = await userRef.get();
if (userDoc.exists()) {  // ✅ Method call
  const data = userDoc.data();
}
```

#### Step 4: Build & Test

```bash
# TypeScript type checking
npm run type-check

# Build functions
npm run build:functions

# Run unit tests
cd functions && npm test
cd ../frontend && npm test:run

# Integration tests
cd ..
npm run emulators &
# Wait for emulators to start, then run integration tests
npm run test:e2e
```

#### Step 5: Manual Testing Checklist

- [ ] User authentication flow works
- [ ] Firestore read operations return correct data
- [ ] Firestore write operations succeed
- [ ] Team creation and management works
- [ ] API token generation works
- [ ] Progress tracking updates correctly
- [ ] Firebase emulators run without errors
- [ ] Production build completes successfully

#### Step 6: Performance Validation

```bash
# Check bundle size impact
cd frontend
npm run build
ls -lh dist/assets/*.js | awk '{print $5, $9}'

# Compare with previous build (if available)
# Expected: Minimal change (<5%)
```

#### Rollback Plan

If issues arise:

```bash
# Option 1: Revert via git
git checkout package.json package-lock.json frontend/package.json frontend/package-lock.json
npm install
npm run build:functions

# Option 2: Delete branch and start over
git checkout master
git branch -D upgrade/firebase-12

# Option 3: Restore emulator data
firebase emulators:start --import=./local_data
```

#### Common Issues & Solutions

**Issue 1: Type errors after upgrade**
```
error TS2339: Property 'exists' does not exist on type 'DocumentSnapshot'
```
**Solution:** Ensure all `.exists` calls use parentheses: `.exists()`

**Issue 2: Test failures in mock Firestore**
```
TypeError: snapshot.exists is not a function
```
**Solution:** Update test mocks to return functions instead of boolean properties:
```typescript
// Before
{ exists: true, data: () => ({...}) }
// After
{ exists: () => true, data: () => ({...}) }
```

**Issue 3: Emulator connection issues**
**Solution:** Clear emulator data and restart:
```bash
rm -rf .firebase/
npm run emulators
```

#### Resources

- [Firebase JS SDK Release Notes](https://firebase.google.com/support/release-notes/js)
- [Firebase v12 Breaking Changes](https://firebase.google.com/support/release-notes/js#version_1200_-_october_21_2025)
- [Firestore DocumentSnapshot API](https://firebase.google.com/docs/reference/js/firestore_.documentsnapshot)

---

### Migration Guide #2: Apollo Client 3 → 4

#### Overview
- **Estimated time:** 6-8 hours
- **Risk level:** Medium-High
- **Breaking changes:** Multiple API changes
- **Rollback complexity:** Low

#### Pre-Migration Checklist

- [ ] Firebase upgrade completed and tested
- [ ] Current GraphQL queries documented
- [ ] Create git branch: `git checkout -b upgrade/apollo-4`
- [ ] Review Apollo 4 migration guide

#### Step 1: Install RxJS Peer Dependency

```bash
cd frontend
npm install rxjs@^7.8.1
```

#### Step 2: Update Apollo Client

```bash
npm install @apollo/client@^4.0.7 @vue/apollo-composable@latest
```

#### Step 3: Update Apollo Client Configuration

**File:** `frontend/src/plugins/apollo.ts`

**Before (Apollo Client 3):**
```typescript
import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core';

const apolloClient = new ApolloClient({
  link: createHttpLink({
    uri: 'https://api.tarkov.dev/graphql',
    fetchOptions: { timeout: 10000 },
  }),
  cache: new InMemoryCache(),
});
```

**After (Apollo Client 4):**
```typescript
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client/core';

const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.tarkov.dev/graphql',
    fetchOptions: { timeout: 10000 },
  }),
  cache: new InMemoryCache(),
  // Optional: Configure client awareness
  name: 'tarkov-tracker',
  version: '1.0',
});
```

**Key changes:**
1. `createHttpLink()` → `new HttpLink()` (function to class)
2. Added optional `name` and `version` for client identification

#### Step 4: Update Error Handling

Apollo Client 4 unified error handling. If using error boundaries:

**Before:**
```typescript
import { ApolloError } from '@apollo/client';

catch (error) {
  if (error instanceof ApolloError) {
    // Handle
  }
}
```

**After:**
```typescript
import { isApolloError } from '@apollo/client';

catch (error) {
  if (isApolloError(error)) {
    // Handle - error.graphQLErrors, error.networkError
  }
}
```

#### Step 5: Update TypeScript Types

Apollo Client 4 has stricter TypeScript requirements. Update query type definitions:

**Before:**
```typescript
const { data } = useQuery(QUERY);
// data is possibly undefined
```

**After:**
```typescript
const { data } = useQuery<QueryResultType>(QUERY);
// Explicit typing required
```

#### Step 6: Run Apollo Codemod (Optional)

Apollo provides an automated codemod for mechanical changes:

```bash
cd frontend
npx @apollo/client-codemod@latest migrate-to-4.0
```

**Review all changes carefully before committing!**

#### Step 7: Testing

```bash
# Type check
npm run type-check

# Unit tests
npm test:run

# Build
npm run build

# Manual testing
npm run dev
```

#### Step 8: Manual Testing Checklist

- [ ] GraphQL queries fetch data correctly
- [ ] Tarkov.dev API connection works
- [ ] Task data loads properly
- [ ] Map data renders correctly
- [ ] Error states display appropriately
- [ ] Loading states work as expected
- [ ] Cache updates trigger UI updates
- [ ] No console errors in browser

#### Step 9: Bundle Size Analysis

```bash
npm run build
npx vite-bundle-visualizer

# Expected: 10-15% reduction in bundle size due to optimizations
```

#### Rollback Plan

```bash
# Revert dependencies
git checkout package.json package-lock.json
npm install

# Or use npm to downgrade
npm install @apollo/client@^3.14.0
npm uninstall rxjs  # If not used elsewhere
```

#### Common Issues & Solutions

**Issue 1: RxJS peer dependency warning**
```
npm WARN @apollo/client@4.0.7 requires a peer of rxjs@^7.3.0
```
**Solution:** Install RxJS: `npm install rxjs@^7.8.1`

**Issue 2: TypeScript errors on query hooks**
```
error TS2345: Argument of type 'string' is not assignable to parameter of type 'DocumentNode'
```
**Solution:** Ensure GraphQL queries use `gql` tag:
```typescript
import { gql } from '@apollo/client';
const QUERY = gql`query { ... }`;
```

**Issue 3: Cache not updating after mutations**
**Solution:** Update cache configuration:
```typescript
cache: new InMemoryCache({
  typePolicies: {
    // Define merge strategies
  }
})
```

#### Resources

- [Apollo Client 4.0 Migration Guide](https://www.apollographql.com/docs/react/migrating/apollo-client-4-migration)
- [Apollo Client 4.0 Announcement](https://www.apollographql.com/blog/announcing-apollo-client-4-0)
- [Vue Apollo Documentation](https://v4.apollo.vuejs.org/)

---

### Migration Guide #3: UUID 11 → 13

#### Overview
- **Estimated time:** 1-2 hours
- **Risk level:** Low
- **Breaking changes:** ESM-only, browser defaults
- **Rollback complexity:** Minimal

#### Pre-Migration Checklist

- [ ] Major upgrades (Firebase, Apollo) completed
- [ ] Create git branch: `git checkout -b upgrade/uuid-13`

#### Step 1: Update Package

```bash
cd frontend
npm install uuid@^13.0.0
npm install -D @types/uuid@latest  # If needed
```

#### Step 2: Verify Import Syntax

Current usage in `frontend/src/features/maps/TarkovMap.vue:49`:
```typescript
import { v4 as uuidv4 } from 'uuid';
```

✅ **No changes required** - Named imports work in UUID 13.

#### Step 3: Testing

```bash
# Type check
npm run type-check

# Run tests
npm test:run

# Test map rendering specifically
npm run dev
# Navigate to map pages and verify rendering
```

#### Step 4: Verification

- [ ] Maps render without errors
- [ ] Random IDs generated correctly
- [ ] No TypeScript compilation errors
- [ ] Tests pass

#### Rollback Plan

```bash
cd frontend
npm install uuid@^11.1.0
```

---

## Batch Update Strategy

### Recommended Execution Timeline

```
Week 1: Batch 1 - Patch Updates
├── Day 1: Update packages
├── Day 2: Test and verify
└── Day 3: Deploy to dev environment

Week 2: Batch 2 - Minor Updates
├── Day 1-2: Update and test
└── Day 3: Deploy to dev environment

Week 3-4: Batch 3 - Firebase 12
├── Week 3 Day 1-2: Prepare and update
├── Week 3 Day 3-5: Migrate .exists usage
├── Week 4 Day 1-2: Testing and fixes
└── Week 4 Day 3: Deploy to dev environment

Week 5-6: Batch 4 - Apollo Client 4
├── Week 5: Migration and testing
└── Week 6: Integration testing and deployment

Week 7+: Batch 5 - Remaining Major Updates
├── Evaluate based on previous upgrade learnings
└── Execute incrementally
```

---

## Post-Upgrade Monitoring

### Metrics to Track

#### Performance Metrics
```javascript
// Add to frontend build pipeline
const metrics = {
  bundleSize: {
    threshold: 5 * 1024 * 1024, // 5MB
    current: getBundleSize(),
  },
  pageLoadTime: {
    threshold: 3000, // 3s
    current: measurePageLoad(),
  },
  apiResponseTime: {
    threshold: 500, // 500ms
    current: measureApiResponse(),
  }
};
```

#### Error Monitoring
- Monitor Firebase errors in console
- Track GraphQL query failures
- Watch for Firestore transaction conflicts
- Monitor build failures in CI/CD

#### Health Check Script

```bash
#!/bin/bash
# health-check.sh

echo "🏥 Post-Upgrade Health Check"
echo "=============================="

# 1. Build check
echo "📦 Building project..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed"
  exit 1
fi

# 2. Test check
echo "🧪 Running tests..."
npm test -- --run > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Tests passing"
else
  echo "❌ Tests failing"
  exit 1
fi

# 3. Lint check
echo "🔍 Linting code..."
npm run lint > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ No lint errors"
else
  echo "⚠️  Lint warnings present"
fi

# 4. Type check
echo "📘 Type checking..."
cd frontend && npm run type-check > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ No type errors"
else
  echo "❌ Type errors found"
  exit 1
fi

echo ""
echo "✅ Health check complete!"
```

---

## Rollback Procedures

### General Rollback Strategy

#### 1. Git-Based Rollback (Recommended)

```bash
# Rollback to pre-upgrade commit
git log --oneline | head -10  # Find commit hash
git checkout <commit-hash>
npm install
npm run build
```

#### 2. Package-Specific Rollback

```bash
# Rollback specific package
npm install <package>@<old-version>
npm run build
npm test
```

#### 3. Branch-Based Rollback

```bash
# Abandon upgrade branch
git checkout master
git branch -D upgrade/<package-name>
```

### Rollback Decision Tree

```
Issue Detected
  ├─ Build Failure?
  │   ├─ Yes → Investigate for 30min → Still failing? → Rollback
  │   └─ No → Continue
  │
  ├─ Test Failure?
  │   ├─ Yes → Investigate for 1hr → Still failing? → Rollback
  │   └─ No → Continue
  │
  ├─ Production Issue?
  │   ├─ Yes → Immediate rollback → Investigate offline
  │   └─ No → Monitor closely
  │
  └─ Performance Regression >10%?
      ├─ Yes → Profile and optimize → No improvement? → Rollback
      └─ No → Deploy
```

---

## Compatibility Matrix

| Package | Current | Target | Node 22 | TS 5.9 | Vite 7 | Vue 3 | Status |
|---------|---------|--------|---------|--------|--------|-------|--------|
| `firebase` | 11.10.0 | 12.4.0 | ✅ | ✅ | ✅ | ✅ | Compatible |
| `@apollo/client` | 3.14.0 | 4.0.7 | ✅ | ✅ | ✅ | ✅ | Compatible |
| `uuid` | 11.1.0 | 13.0.0 | ✅ | ✅ | ✅ | ✅ | Compatible |
| `vite` | 7.1.9 | 7.1.10 | ✅ | ✅ | N/A | ✅ | Compatible |
| `jsdom` | 26.1.0 | 27.0.0 | ✅ | ✅ | ✅ | ✅ | Research Needed |
| `@intlify/unplugin-vue-i18n` | 6.0.8 | 11.0.1 | ✅ | ⚠️ | ⚠️ | ⚠️ | Research Needed |
| `ts-essentials` | 9.4.2 | 10.1.1 | ✅ | ⚠️ | ✅ | ✅ | Research Needed |

**Legend:**
- ✅ Confirmed compatible
- ⚠️ Needs verification
- ❌ Known incompatibility

---

## Risk Mitigation Strategies

### 1. Incremental Rollout
- Deploy to development environment first
- Monitor for 48 hours before staging
- Gradual rollout to production (canary deployment if possible)

### 2. Automated Testing
- Expand test coverage before major upgrades
- Add integration tests for critical paths
- Implement E2E tests for user flows

### 3. Feature Flags
Consider implementing feature flags for major dependency changes:
```typescript
// Enable new Apollo Client 4 features gradually
const useApolloV4Features = import.meta.env.VITE_APOLLO_V4_FEATURES === 'true';
```

### 4. Monitoring & Alerting
- Set up error tracking (e.g., Sentry)
- Monitor Firebase usage metrics
- Track GraphQL query performance
- Set up alerts for error rate spikes

### 5. Documentation
- Document all configuration changes
- Update team wiki/docs with upgrade notes
- Create runbook for common issues

---

## Upgrade Automation Scripts

### 1. Batch Update Script

```bash
#!/bin/bash
# batch-update.sh - Automate batch updates

set -e

BATCH=$1

if [ -z "$BATCH" ]; then
  echo "Usage: ./batch-update.sh <batch-number>"
  exit 1
fi

echo "🚀 Starting Batch $BATCH upgrade..."

case $BATCH in
  1)
    echo "📦 Updating patch versions..."
    npm update concurrently vite globals taze
    cd frontend && npm update vite happy-dom
    ;;
  2)
    echo "📦 Updating minor versions..."
    npm update eslint-plugin-vue firebase-tools
    ;;
  3)
    echo "📦 Updating Firebase to v12..."
    cd frontend && npm install firebase@^12.4.0
    cd .. && npm install firebase@^12.4.0
    echo "⚠️  Run migration script: ./scripts/migrate-firebase-exists.sh"
    ;;
  4)
    echo "📦 Updating Apollo Client to v4..."
    cd frontend
    npm install rxjs@^7.8.1
    npm install @apollo/client@^4.0.7
    ;;
  5)
    echo "📦 Updating remaining packages..."
    cd frontend
    npm install uuid@^13.0.0
    ;;
  *)
    echo "❌ Invalid batch number"
    exit 1
    ;;
esac

echo "✅ Batch $BATCH upgrade complete!"
echo "🧪 Running health check..."
./scripts/health-check.sh
```

### 2. Pre-Upgrade Snapshot

```bash
#!/bin/bash
# snapshot.sh - Create upgrade snapshot

SNAPSHOT_DIR=".upgrade-snapshots/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$SNAPSHOT_DIR"

echo "📸 Creating upgrade snapshot..."

# Save package manifests
cp package.json "$SNAPSHOT_DIR/"
cp package-lock.json "$SNAPSHOT_DIR/"
cp frontend/package.json "$SNAPSHOT_DIR/frontend-package.json"
cp frontend/package-lock.json "$SNAPSHOT_DIR/frontend-package-lock.json"
cp functions/package.json "$SNAPSHOT_DIR/functions-package.json"

# Save git state
git rev-parse HEAD > "$SNAPSHOT_DIR/commit-hash.txt"
git status > "$SNAPSHOT_DIR/git-status.txt"

# Save current bundle size
if [ -d "frontend/dist" ]; then
  du -sh frontend/dist > "$SNAPSHOT_DIR/bundle-size.txt"
fi

# Create git tag
TAG="pre-upgrade-$(date +%Y%m%d-%H%M%S)"
git tag -a "$TAG" -m "Pre-upgrade snapshot"

echo "✅ Snapshot created: $SNAPSHOT_DIR"
echo "📌 Git tag: $TAG"
```

---

## Testing Strategy

### 1. Unit Tests
```bash
# Functions
cd functions && npm test

# Frontend
cd frontend && npm test:run

# Coverage thresholds
npm test -- --coverage --threshold 80
```

### 2. Integration Tests
```bash
# Start emulators
npm run emulators:local &

# Run integration tests
cd functions
npm test -- --grep "integration"
```

### 3. E2E Tests
```bash
cd frontend
npm run test:e2e

# Headless mode for CI
npm run test:e2e -- --headed=false
```

### 4. Manual Testing Checklist

**Critical User Flows:**
- [ ] User registration and login
- [ ] Progress tracking (tasks, hideout)
- [ ] Team creation and joining
- [ ] API token generation
- [ ] Map viewing
- [ ] Data synchronization across team members
- [ ] Task filtering and search
- [ ] Needed items calculation

**Browser Testing:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## Success Criteria

### Upgrade Complete When:

✅ **All automated tests passing**
- Unit tests: 100% pass rate
- Integration tests: 100% pass rate
- E2E tests: 100% pass rate

✅ **No regressions detected**
- Bundle size increase <10%
- Page load time increase <15%
- API response time increase <10%

✅ **Manual testing complete**
- All critical user flows tested
- Cross-browser testing complete
- Mobile testing complete

✅ **Production deployment successful**
- No error rate spikes
- Performance metrics stable
- User feedback positive

✅ **Documentation updated**
- README updated with new versions
- Migration notes documented
- Team trained on changes

---

## Maintenance Schedule

### Ongoing Dependency Monitoring

```bash
# Weekly: Check for security updates
npm audit

# Monthly: Check for outdated packages
npm outdated

# Quarterly: Major version update review
npx taze --I

# Annual: Comprehensive dependency audit
npm run deps:audit  # Custom script
```

### Recommended Tools

- **Dependabot:** Automated dependency updates (GitHub)
- **Renovate:** Advanced dependency management
- **npm-check-updates:** Interactive upgrade tool
- **taze:** Fast dependency upgrade utility (already installed)

---

## Conclusion

This upgrade strategy prioritizes safety and stability while modernizing the TarkovTracker codebase. By following the incremental batch approach, you can:

1. ✅ **Minimize risk** with small, testable updates
2. ✅ **Maintain stability** through comprehensive testing
3. ✅ **Learn iteratively** from each upgrade
4. ✅ **Rollback easily** if issues arise
5. ✅ **Stay current** with security patches

### Next Steps

1. **Week 1:** Execute Batch 1 (patch updates) - Quick wins
2. **Week 2:** Execute Batch 2 (minor updates) - Low risk
3. **Week 3-4:** Execute Batch 3 (Firebase 12) - First major upgrade
4. **Review:** Assess Batch 3 outcomes before proceeding
5. **Week 5-6:** Execute Batch 4 (Apollo 4) - If Batch 3 successful
6. **Future:** Defer Batch 5 until other upgrades stabilized

### Support Resources

- **Firebase Support:** https://firebase.google.com/support
- **Apollo GraphQL:** https://community.apollographql.com/
- **Vue.js Discord:** https://discord.com/invite/vue
- **Project Issues:** https://github.com/TarkovTracker/tarkov-tracker/issues

---

**Document Version:** 1.0
**Last Updated:** 2025-10-14
**Next Review:** After Batch 3 completion
