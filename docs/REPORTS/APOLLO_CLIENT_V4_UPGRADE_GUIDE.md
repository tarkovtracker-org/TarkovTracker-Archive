# Apollo Client v3.14.0 → v4.0.7 Upgrade Guide

## TarkovTracker Project

**Generated:** 2025-10-15
**Current Version:** `@apollo/client@^3.14.0`
**Target Version:** `@apollo/client@^4.0.7`
**Estimated Time:** 6-8 hours
**Risk Level:** MEDIUM-HIGH
**Breaking Changes:** Multiple API changes

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Breaking Changes Analysis](#breaking-changes-analysis)
3. [Pre-Migration Checklist](#pre-migration-checklist)
4. [Migration Steps](#migration-steps)
5. [Code Changes Required](#code-changes-required)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)
8. [Post-Upgrade Monitoring](#post-upgrade-monitoring)

---

## Executive Summary

### What's Changing

Apollo Client v4 represents a major update with significant architectural improvements:

✅ **Benefits:**

- Better TypeScript support with stricter type safety
- Improved performance and smaller bundle size (~10-15% reduction)
- RxJS-based observable implementation (more standard)
- Better error handling and debugging
- Continued support and new features

⚠️ **Breaking Changes:**

- New peer dependency: `rxjs@^7.3.0`
- `createHttpLink()` → `new HttpLink()` (function to class)
- Observable implementation changes (zen-observable → RxJS)
- Stricter TypeScript requirements
- Some deprecations removed

### Current Usage in TarkovTracker

**Files Using Apollo Client:**

1. `frontend/src/plugins/apollo.ts` - Apollo client configuration
2. `frontend/src/composables/api/useTarkovApi.ts` - Query composables
3. `frontend/src/main.ts` - Apollo provider setup
4. `frontend/src/types/tarkov.ts` - GraphQL type definitions
5. `frontend/src/test/setup.ts` - Test configuration

**Current Queries:**

- Language query (for i18n)
- Tarkov data query (tasks, maps, traders - 662 lines in tarkovdataquery.ts)
- Hideout query

**Current Patterns:**

- Using `@vue/apollo-composable@^4.2.2` (already v4-compatible)
- Cache-first fetch policy
- Error handling with `errorPolicy: 'all'`
- No custom error links

---

## Breaking Changes Analysis

### 1. RxJS Peer Dependency (REQUIRED)

**Impact:** HIGH - New mandatory dependency

**What Changed:**

```json
// Apollo Client v4 requires RxJS
"peerDependencies": {
  "rxjs": "^7.3.0"
}
```

**Action Required:**

```bash
npm install rxjs@^7.8.1
```

**Why:** Apollo v4 replaced zen-observable with RxJS for observable implementation.

---

### 2. HttpLink Constructor Change (BREAKING)

**Impact:** MEDIUM - Single file change

**Current Code (v3):**

```typescript
// frontend/src/plugins/apollo.ts
import { createHttpLink } from '@apollo/client/core';

const apolloClient = new ApolloClient({
  link: createHttpLink({
    uri: 'https://api.tarkov.dev/graphql',
    fetchOptions: { timeout: 10000 },
  }),
  cache: new InMemoryCache(),
});
```

**New Code (v4):**

```typescript
// frontend/src/plugins/apollo.ts
import { HttpLink } from '@apollo/client/core';

const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.tarkov.dev/graphql',
    fetch: (uri, options) => {
      return fetch(uri, { ...options, timeout: 10000 });
    },
  }),
  cache: new InMemoryCache(),
});
```

**Changes:**

1. `createHttpLink()` → `new HttpLink()`
2. `fetchOptions` is no longer directly supported; use custom `fetch` function instead

---

### 3. TypeScript Strictness (MEDIUM IMPACT)

**Impact:** LOW - TarkovTracker already has strong typing

**What Changed:**

- Generic types more strictly enforced
- Better type inference for queries
- Some `any` types no longer accepted

**Current Usage (already well-typed):**

```typescript
// useTarkovApi.ts - already properly typed
const { result, error, loading } = useQuery<
  TarkovDataQueryResult,
  { lang: string; gameMode: string }
>(tarkovDataQuery, () => ({ lang: apiLanguageCode.value, gameMode: gameMode.value }));
```

**Action Required:** Minimal - codebase already well-typed

---

### 4. Observable Behavior Changes (LOW IMPACT)

**Impact:** LOW - Using Vue Apollo Composable (handles observables internally)

**What Changed:**

- Observables now use RxJS instead of zen-observable
- Subscription cleanup more predictable
- Better error propagation

**Action Required:** None - `@vue/apollo-composable` abstracts this

---

## Pre-Migration Checklist

### Phase 1: Preparation (30 minutes)

- [ ] **Backup Current State**

  ```bash
  git checkout -b upgrade/apollo-client-v4
  git tag pre-apollo-v4-upgrade
  ```

- [ ] **Verify Current Tests Pass**

  ```bash
  cd frontend
  npm run test:run
  npm run type-check
  npm run build
  ```

- [ ] **Document Current Behavior**
  - Capture GraphQL query performance baselines
  - Note any current error handling quirks
  - Document bundle size: `npm run build && du -h dist/assets/*.js`

- [ ] **Check Vue Apollo Composable Compatibility**

  ```bash
  npm view @vue/apollo-composable peerDependencies
  ```

  Current: `@vue/apollo-composable@^4.2.2` already supports Apollo v4 ✅

---

### Phase 2: Dependency Analysis (15 minutes)

- [ ] **Check for Conflicting Dependencies**

  ```bash
  npm ls @apollo/client
  npm ls rxjs  # Should show "not installed"
  ```

- [ ] **Review Package Vulnerabilities**

  ```bash
  npm audit
  ```

- [ ] **Verify Node.js Version**
  - Minimum: Node 18+ (current: Node 22 ✅)

---

## Migration Steps

### Step 1: Install Dependencies (10 minutes)

```bash
cd frontend

# Install RxJS peer dependency
npm install rxjs@^7.8.1

# Upgrade Apollo Client
npm install @apollo/client@^4.0.7

# Verify installation
npm ls @apollo/client rxjs
```

**Expected Output:**

```bash
frontend@0.0.0
├── @apollo/client@4.0.7
└── rxjs@7.8.1
```

---

### Step 2: Update Apollo Client Configuration (20 minutes)

**File:** `frontend/src/plugins/apollo.ts`

**Before (Apollo v3):**

```typescript
import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core';

// Create Apollo client with simplified configuration
const apolloClient = new ApolloClient({
  link: createHttpLink({
    uri: 'https://api.tarkov.dev/graphql',
    fetchOptions: { timeout: 10000 },
  }),
  cache: new InMemoryCache(),
});

export default apolloClient;
```

**After (Apollo v4):**

```typescript
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client/core';

// Create Apollo client with v4 syntax
const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.tarkov.dev/graphql',
    // Custom fetch with timeout
    fetch: (uri, options) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      return fetch(uri, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
    },
  }),
  cache: new InMemoryCache(),
  // Optional: Add client metadata (recommended)
  name: 'tarkov-tracker-client',
  version: '1.0',
  // Optional: Better dev tools integration
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
});

export default apolloClient;
```

**Key Changes:**

1. ✅ `createHttpLink()` → `new HttpLink()`
2. ✅ Custom `fetch` function for timeout handling
3. ✅ Added `name` and `version` for better debugging
4. ✅ Moved default options to client config (optional improvement)

---

### Step 3: Verify Composable Usage (10 minutes)

**File:** `frontend/src/composables/api/useTarkovApi.ts`

**No changes required** - The file already uses patterns compatible with v4:

```typescript
import { useQuery, provideApolloClient } from '@vue/apollo-composable';

// This syntax is already v4-compatible ✅
const { result, error, loading, refetch } = useQuery<
  TarkovDataQueryResult,
  { lang: string; gameMode: string }
>(tarkovDataQuery, () => ({ lang: apiLanguageCode.value, gameMode: gameMode.value }), {
  fetchPolicy: 'cache-first',
  notifyOnNetworkStatusChange: true,
  errorPolicy: 'all',
});
```

**Verify:**

- `useQuery` signature unchanged
- Type parameters still work
- Reactive variables still supported
- Fetch policies unchanged

---

### Step 4: Update Test Setup (15 minutes)

**File:** `frontend/src/test/setup.ts`

Check if any test mocks need updating for RxJS observables:

```bash
grep -n "ApolloClient\|mock" frontend/src/test/setup.ts
```

**If using mocked Apollo Client in tests:**

```typescript
// Before (v3) - if mocking observables
import { Observable } from 'zen-observable-ts';

// After (v4) - use RxJS
import { Observable } from 'rxjs';
```

**Most likely:** No changes needed if using `@vue/test-utils` with real Apollo client.

---

### Step 5: Run TypeScript Type Check (10 minutes)

```bash
npm run type-check
```

**Common Issues & Fixes:**

**Issue 1:** `Property 'fetchOptions' does not exist`

```typescript
// Fix: Use custom fetch function (see Step 2)
fetch: (uri, options) => fetch(uri, { ...options, timeout: 10000 })
```

**Issue 2:** Generic type inference errors

```typescript
// Fix: Add explicit type parameters
useQuery<ResultType, VariablesType>(query, variables)
```

**Issue 3:** Observable type mismatches

```typescript
// Fix: Ensure @vue/apollo-composable is up to date
npm update @vue/apollo-composable
```

---

### Step 6: Build and Bundle Analysis (20 minutes)

```bash
# Clean build
rm -rf dist
npm run build

# Analyze bundle size
du -h dist/assets/*.js | sort -h

# Compare with baseline (expect ~10-15% reduction)
```

**Expected Results:**

- Main bundle: ~10-15% smaller due to RxJS tree-shaking
- No new chunks introduced
- GraphQL queries unchanged

**If bundle grew:**

- Check for duplicate RxJS imports
- Verify tree-shaking works: `npm run build -- --mode production`

---

### Step 7: Run Test Suite (30 minutes)

```bash
# Unit tests
npm run test:run

# Coverage check
npm run test:coverage

# E2E tests (if GraphQL queries are tested)
npm run test:e2e
```

**Test Checklist:**

- [ ] All unit tests pass
- [ ] No new TypeScript errors
- [ ] GraphQL queries execute successfully
- [ ] Error handling works correctly
- [ ] Cache behavior unchanged
- [ ] Reactive query refetching works

---

### Step 8: Manual Testing (45 minutes)

**Critical Paths:**

1. **Task List Page** (`/tasks`)
   - [ ] Tasks load from GraphQL
   - [ ] Language switching triggers refetch
   - [ ] Game mode switching (PvP/PvE) works
   - [ ] No console errors

2. **Hideout Page** (`/hideout`)
   - [ ] Hideout data loads
   - [ ] Requirements display correctly
   - [ ] Cache-and-network policy working

3. **Error Handling**
   - [ ] Network offline: graceful fallback
   - [ ] Invalid response: error displayed
   - [ ] Tarkov.dev API down: error message shown

4. **Performance**
   - [ ] Initial query load time acceptable
   - [ ] Subsequent loads from cache
   - [ ] No memory leaks (dev tools profiler)

---

## Code Changes Required

### Summary of Changes

| File | Lines Changed | Complexity | Risk |
|------|---------------|------------|------|
| `package.json` | 2 | Low | Low |
| `plugins/apollo.ts` | ~15 | Medium | Medium |
| `composables/api/useTarkovApi.ts` | 0 | None | None |
| `test/setup.ts` | 0-5 | Low | Low |

**Total Estimated Changes:** 20-25 lines across 3 files

---

### Detailed File Changes

#### 1. `frontend/package.json`

```diff
   "dependencies": {
-    "@apollo/client": "^3.14.0",
+    "@apollo/client": "^4.0.7",
     "@mdi/font": "^7.4.47",
     "@vue/apollo-composable": "^4.2.2",
     "@vueuse/core": "^13.9.0",
     "d3": "^7.9.0",
     "firebase": "^11.10.0",
     "graphology": "^0.26.0",
     "graphology-types": "^0.24.8",
     "graphql": "^16.11.0",
     "graphql-tag": "^2.12.6",
     "pinia": "^3.0.3",
     "qrcode": "^1.5.4",
+    "rxjs": "^7.8.1",
     "ts-essentials": "^9.4.2",
```

#### 2. `frontend/src/plugins/apollo.ts`

**Complete new version:**

```typescript
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client/core';

/**
 * Apollo Client v4 Configuration for TarkovTracker
 *
 * Connects to Tarkov.dev GraphQL API for game data
 */
const apolloClient = new ApolloClient({
  // Apollo v4: Use HttpLink class instead of createHttpLink function
  link: new HttpLink({
    uri: 'https://api.tarkov.dev/graphql',

    // Apollo v4: fetchOptions no longer supported
    // Use custom fetch function for timeout handling
    fetch: (uri, options) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      return fetch(uri, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  }),

  // Cache configuration (unchanged from v3)
  cache: new InMemoryCache(),

  // Apollo v4: Recommended metadata for debugging
  name: 'tarkov-tracker-client',
  version: '1.0.0',

  // Default options for all queries (optional, but recommended)
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
});

export default apolloClient;
```

---

## Testing Strategy

### Automated Testing

#### 1. Unit Tests

```typescript
// Example test for Apollo v4 compatibility
import { describe, it, expect, vi } from 'vitest';
import apolloClient from '@/plugins/apollo';

describe('Apollo Client v4', () => {
  it('should initialize with HttpLink', () => {
    expect(apolloClient).toBeDefined();
    expect(apolloClient.link).toBeDefined();
  });

  it('should have correct metadata', () => {
    // Apollo v4 clients can expose metadata
    expect(apolloClient.name).toBe('tarkov-tracker-client');
    expect(apolloClient.version).toBe('1.0.0');
  });

  it('should handle query execution', async () => {
    const query = gql`
      query TestQuery {
        __typename
      }
    `;

    const result = await apolloClient.query({ query });
    expect(result.data).toBeDefined();
  });
});
```

#### 2. Integration Tests

```typescript
// Test GraphQL query flow
describe('Tarkov API Queries', () => {
  it('should fetch task data successfully', async () => {
    const { result, error, loading } = useTarkovDataQuery(
      computed(() => 'regular')
    );

    // Wait for query to complete
    await waitFor(() => expect(loading.value).toBe(false));

    expect(error.value).toBeNull();
    expect(result.value).toBeDefined();
    expect(result.value.tasks).toBeInstanceOf(Array);
  });

  it('should refetch on language change', async () => {
    const languageCode = ref('en');
    const { result, refetch } = useTarkovDataQuery();

    await refetch({ lang: 'ru', gameMode: 'regular' });

    expect(result.value).toBeDefined();
  });
});
```

#### 3. Performance Tests

```typescript
describe('Apollo v4 Performance', () => {
  it('should cache queries efficiently', async () => {
    const start1 = performance.now();
    await apolloClient.query({ query: TASKS_QUERY });
    const duration1 = performance.now() - start1;

    // Second query should be from cache (much faster)
    const start2 = performance.now();
    await apolloClient.query({ query: TASKS_QUERY });
    const duration2 = performance.now() - start2;

    expect(duration2).toBeLessThan(duration1 * 0.1);
  });
});
```

---

### Manual Test Checklist

#### GraphQL Query Testing

- [ ] **Language Query**
  - Open DevTools Network tab
  - Refresh page
  - Verify query to `api.tarkov.dev/graphql`
  - Check response contains `__type.enumValues`

- [ ] **Task Data Query**
  - Navigate to `/tasks`
  - Verify 200+ tasks loaded
  - Check GraphQL response size (~500KB expected)
  - Verify no errors in console

- [ ] **Hideout Query**
  - Navigate to `/hideout`
  - Verify hideout modules display
  - Check cache-and-network fetch policy working

#### Cache Behavior

- [ ] **Cache-First Policy**

  ```bash
  1. Load /tasks page
  2. Note initial query time (DevTools)
  3. Navigate away and back
  4. Second load should be instant (from cache)
  ```

- [ ] **Refetch on Variable Change**

  ```bash
  1. Load tasks in English
  2. Switch language to Russian
  3. Verify new query fires
  4. Verify data updates
  ```

#### Error Handling

- [ ] **Network Offline**

  ```bash
  1. Open DevTools
  2. Set Network to "Offline"
  3. Refresh page
  4. Verify graceful error message
  5. Verify no crashes
  ```

- [ ] **Invalid Response**

  ```bash
  # Mock invalid GraphQL response in DevTools
  1. Block api.tarkov.dev requests
  2. Navigate to /tasks
  3. Verify error state displayed
  4. Check errorPolicy: 'all' allows partial data
  ```

---

## Rollback Plan

### Quick Rollback (5 minutes)

```bash
# Option 1: Git revert
git checkout package.json package-lock.json
npm install

# Option 2: Use backup tag
git checkout pre-apollo-v4-upgrade
npm install

# Verify rollback
npm run build
npm run test:run
```

### Rollback Decision Tree

```bash
Issue Detected During Upgrade
├─ Build Fails?
│   ├─ TypeScript errors → Fix types (15 min) → Still failing? → Rollback
│   └─ Bundle errors → Check RxJS import → Still failing? → Rollback
│
├─ Tests Fail?
│   ├─ Unit tests → Review observable mocks → Still failing? → Rollback
│   └─ E2E tests → Check query behavior → Still failing? → Rollback
│
├─ Runtime Errors?
│   ├─ GraphQL errors → Check HttpLink config → Still failing? → Rollback
│   └─ Cache errors → Verify InMemoryCache → Still failing? → Rollback
│
└─ Performance Regression >20%?
    ├─ Bundle size → Analyze imports → No improvement? → Rollback
    └─ Query time → Profile queries → No improvement? → Rollback
```

### Rollback Verification

After rollback:

```bash
# 1. Reinstall dependencies
npm ci

# 2. Verify version
npm ls @apollo/client rxjs

# 3. Run tests
npm run test:run

# 4. Build
npm run build

# 5. Manual smoke test
npm run dev
# Visit /tasks, /hideout pages
```

---

## Post-Upgrade Monitoring

### Metrics to Track (First 48 Hours)

#### 1. Bundle Size

```bash
# Capture before upgrade
npm run build
du -h dist/assets/*.js > bundle-size-before.txt

# After upgrade
npm run build
du -h dist/assets/*.js > bundle-size-after.txt

# Compare
diff bundle-size-before.txt bundle-size-after.txt
```

**Expected:** 10-15% reduction in Apollo-related chunks

#### 2. Query Performance

```javascript
// Add to useTarkovApi.ts for monitoring
const queryStartTime = performance.now();

useQuery(query, variables, {
  onCompleted: (data) => {
    const duration = performance.now() - queryStartTime;
    console.log(`Query completed in ${duration}ms`);

    // Send to analytics (optional)
    // analytics.track('graphql_query_duration', { duration, query });
  }
});
```

**Baselines:**

- First load: < 2000ms
- Cache load: < 50ms

#### 3. Error Rate

Monitor browser console for:

- Apollo errors
- RxJS subscription leaks
- Memory leaks

```javascript
// Add error tracking
window.addEventListener('error', (event) => {
  if (event.message.includes('Apollo') || event.message.includes('RxJS')) {
    console.error('Post-upgrade error:', event);
    // Send to error tracking service
  }
});
```

---

### Health Check Dashboard

```bash
#!/bin/bash
# post-upgrade-health-check.sh

echo "🏥 Apollo Client v4 Health Check"
echo "================================"

# 1. Dependency check
echo "📦 Checking dependencies..."
APOLLO_VERSION=$(npm ls @apollo/client --depth=0 | grep @apollo/client | awk '{print $2}')
RXJS_VERSION=$(npm ls rxjs --depth=0 | grep rxjs | awk '{print $2}')

echo "   @apollo/client: $APOLLO_VERSION (expected: 4.0.7)"
echo "   rxjs: $RXJS_VERSION (expected: 7.8.1)"

# 2. Build check
echo ""
echo "🔨 Building project..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ Build successful"
else
  echo "   ❌ Build failed"
  exit 1
fi

# 3. Bundle size check
echo ""
echo "📊 Checking bundle size..."
BUNDLE_SIZE=$(du -sh dist/assets/*.js | awk '{sum+=$1} END {print sum}')
echo "   Total JS: ${BUNDLE_SIZE}KB (baseline: check bundle-size-before.txt)"

# 4. Test check
echo ""
echo "🧪 Running tests..."
npm run test:run > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ All tests passing"
else
  echo "   ❌ Tests failing"
  exit 1
fi

# 5. Type check
echo ""
echo "📘 Type checking..."
npm run type-check > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ No type errors"
else
  echo "   ❌ Type errors found"
  exit 1
fi

echo ""
echo "✅ Health check complete - Apollo Client v4 upgrade successful!"
```

---

## Common Issues & Solutions

### Issue 1: RxJS Peer Dependency Warning

**Symptom:**

```bash
npm WARN @apollo/client@4.0.7 requires a peer of rxjs@^7.3.0
```

**Solution:**

```bash
npm install rxjs@^7.8.1
```

---

### Issue 2: `createHttpLink is not a function`

**Symptom:**

```bash
TypeError: createHttpLink is not a function
```

**Solution:**
Update import:

```typescript
// Before
import { createHttpLink } from '@apollo/client/core';
const link = createHttpLink({ uri: '...' });

// After
import { HttpLink } from '@apollo/client/core';
const link = new HttpLink({ uri: '...' });
```

---

### Issue 3: TypeScript Error on Generic Types

**Symptom:**

```bash
TS2345: Argument of type 'DocumentNode' is not assignable to parameter
```

**Solution:**
Add explicit type parameters:

```typescript
useQuery<ResultType, VariablesType>(query, variables)
```

---

### Issue 4: Observable Subscription Leaks

**Symptom:**
Memory usage grows over time in dev tools

**Solution:**
Ensure Vue Apollo Composable handles cleanup:

```typescript
// Vue composables automatically unsubscribe on unmount
// If manually subscribing (unlikely), use:
const subscription = apolloClient.subscribe({ query });
onUnmounted(() => subscription.unsubscribe());
```

---

### Issue 5: Cache Not Working

**Symptom:**
Every query hits the network

**Solution:**
Verify cache policy:

```typescript
useQuery(query, variables, {
  fetchPolicy: 'cache-first', // Not 'network-only'
});
```

---

## Timeline

### Recommended Schedule

**Day 1 (4 hours):**

- [ ] 9:00 AM - Pre-migration checklist
- [ ] 9:30 AM - Install dependencies
- [ ] 10:00 AM - Update apollo.ts
- [ ] 11:00 AM - Run type check and fix errors
- [ ] 12:00 PM - Lunch break
- [ ] 1:00 PM - Run test suite
- [ ] 2:30 PM - Manual testing
- [ ] 4:00 PM - Review and commit

**Day 2 (2-4 hours):**

- [ ] 9:00 AM - Deploy to staging
- [ ] 10:00 AM - Monitor staging for issues
- [ ] 12:00 PM - Bundle size analysis
- [ ] 2:00 PM - Fix any edge cases
- [ ] 4:00 PM - Deploy to production (if all clear)

**Week 1 Post-Deployment:**

- Monitor error rates
- Check performance metrics
- Gather user feedback

---

## Success Criteria

### Upgrade Considered Successful When

✅ **All automated tests passing**

- Unit tests: 100% pass rate
- E2E tests: 100% pass rate
- TypeScript: 0 errors

✅ **No regressions detected**

- Bundle size: Reduced by 10-15% (or no increase)
- Query performance: Same or better
- Cache behavior: Working as before

✅ **Manual testing complete**

- All GraphQL queries work
- Language switching works
- Game mode switching works
- Error handling works

✅ **Production monitoring stable**

- No error rate spikes
- Performance metrics normal
- User complaints: None

✅ **Documentation updated**

- This guide marked as "completed"
- REPORTS/ACTION_ITEMS.md updated
- Team notified

---

## Resources

### Official Documentation

- [Apollo Client v4 Migration Guide](https://www.apollographql.com/docs/react/migrating/apollo-client-4-migration)
- [Apollo Client v4 Changelog](https://github.com/apollographql/apollo-client/blob/main/CHANGELOG.md)
- [RxJS Documentation](https://rxjs.dev/guide/overview)
- [Vue Apollo Composable](https://v4.apollo.vuejs.org/)

### Community Resources

- [Apollo Community Forum](https://community.apollographql.com/)
- [Apollo Client GitHub Issues](https://github.com/apollographql/apollo-client/issues)
- [Vue Apollo Discord](https://discord.gg/apollo)

### Internal Resources

- [REPORTS/ACTION_ITEMS.md](./ACTION_ITEMS.md) - Project priorities
- [REPORTS/DEPENDENCY_UPGRADE_STRATEGY.md](./DEPENDENCY_UPGRADE_STRATEGY.md) - General upgrade patterns
- [CLAUDE.md](../CLAUDE.md) - Development guidelines

---

## Conclusion

Apollo Client v4 is a worthwhile upgrade that brings:

- Better performance
- Smaller bundle size
- Improved TypeScript support
- Modern observable implementation

The migration is relatively straightforward for TarkovTracker because:

- Already using Vue Apollo Composable v4
- Clean, simple Apollo configuration
- Good test coverage
- Modern codebase with strong typing

**Estimated Total Time:** 6-8 hours (including testing)
**Recommended Approach:** Incremental (do it in one sitting, test thoroughly)
**Risk Level:** Medium (breaking changes, but well-documented)

---

**Document Version:** 1.0
**Created:** 2025-10-15
**Next Review:** After upgrade completion
