# Canonical Firestore Cleanup Mechanism

## Overview

This document explains the single source of truth for Firestore cleanup in the TarkovTracker backend test suite, ensuring complete test isolation and preventing data leaks between tests.

## The Solution: Global afterEach Hook

**Location:** `functions/test/setup.ts`

All Firestore cleanup is handled by a **single global `afterEach` hook** that runs after every test in the functions workspace.

```typescript
afterEach(async () => {
  await resetDb();
});
```

### Why This Approach?

1. **Complete Test Isolation:** Every test starts with a clean Firestore database, guaranteed.
2. **Deterministic Results:** Tests produce the same results regardless of execution order.
3. **Catches State Dependencies:** Tests that depend on previous test state will fail immediately.
4. **Works Everywhere:** All tests benefit, whether they use `createTestSuite()` or not.
5. **Simple & Maintainable:** One place to manage cleanup logic.

## How It Works

### Test Lifecycle

```
┌─────────────────────────────────────┐
│ Test A starts (clean Firestore)    │
├─────────────────────────────────────┤
│ Test A seeds its own data           │
├─────────────────────────────────────┤
│ Test A runs assertions              │
├─────────────────────────────────────┤
│ Global afterEach → resetDb()        │  ← Cleanup happens here
├─────────────────────────────────────┤
│ Test B starts (clean Firestore)    │
└─────────────────────────────────────┘
```

### What resetDb() Does

1. Calls the Firebase emulator's REST API to clear all documents
2. Clears the data loader cache to prevent stale snapshot reuse
3. Completes before the next test starts (proper async/await)

## Integration with createTestSuite()

`createTestSuite()` provides an additional **defensive** `beforeEach` reset:

```typescript
const suite = createTestSuite('MyTest');

beforeEach(suite.beforeEach);  // Defensive reset + mock clearing
afterEach(suite.afterEach);     // Custom cleanup callbacks
```

### Defense-in-Depth Strategy

- **Global afterEach:** Cleanup after every test (runs last)
- **createTestSuite.beforeEach:** Defensive cleanup before tests (extra safety)
- **createTestSuite.afterEach:** Test-specific cleanup (mocks, custom callbacks)

Both the global hook and `createTestSuite.beforeEach` ensure cleanup, providing redundancy for maximum safety.

## Writing Tests with Clean State

### ✅ Recommended Pattern

```typescript
import { createTestSuite, seedDb } from '../helpers';

describe('MyService', () => {
  const suite = createTestSuite('MyService');
  
  beforeEach(suite.beforeEach);
  afterEach(suite.afterEach);
  
  it('should do something', async () => {
    // Seed your own data
    await seedDb({
      users: { 'user-1': { uid: 'user-1', name: 'Test User' } },
    });
    
    // Run test - Firestore is clean except for your seeded data
    const result = await myService.doSomething('user-1');
    expect(result).toBeDefined();
    
    // No manual cleanup needed - global afterEach handles it
  });
});
```

### ❌ Anti-Patterns to Avoid

**Don't add manual resetDb() calls in test hooks:**

```typescript
// ❌ WRONG - redundant with global hook
beforeEach(async () => {
  await resetDb();  // Don't do this!
});

afterEach(async () => {
  await resetDb();  // Don't do this either!
});
```

**Don't call resetDb() within test bodies unless necessary:**

```typescript
// ❌ WRONG - usually unnecessary
it('should handle empty database', async () => {
  await resetDb();  // Only needed if you want to clear mid-test
  // Test logic
});

// ✅ CORRECT - test starts clean automatically
it('should handle empty database', async () => {
  // Database is already clean from global hook
  // Test logic
});
```

**Don't depend on data from previous tests:**

```typescript
// ❌ WRONG - depends on previous test's data
it('test 1', async () => {
  await seedDb({ users: { 'user-1': { uid: 'user-1' } } });
});

it('test 2', async () => {
  // This will FAIL - test 1's data was cleaned up!
  const user = await getUser('user-1');  // ❌ Will be null
});
```

## Performance Considerations

- **Cleanup overhead:** ~10-50ms per test
- **Why it's worth it:** Prevents hours of debugging flaky tests
- **Optimization:** The HTTP DELETE to the emulator is fast and doesn't scale with data size

## Troubleshooting

### Test Fails with "Document Not Found"

**Cause:** Test expects data that doesn't exist.

**Solution:** Seed the data in `beforeEach` or the test itself:

```typescript
beforeEach(async () => {
  await suite.beforeEach();
  await seedDb({
    users: { 'test-user': { uid: 'test-user' } },
  });
});
```

### Test Passes Alone but Fails in Suite

**Cause:** Test depends on state from previous tests.

**Solution:** Make the test self-sufficient by seeding all required data.

### Firestore Still Has Old Data

**Cause:** Test is running against production instead of the emulator.

**Solution:** Ensure `FIRESTORE_EMULATOR_HOST` is set in your test environment (handled by `vitest.config.js`).

## Files Modified for This Implementation

### Core Infrastructure

- **`functions/test/setup.ts`:** Global afterEach hook (single source of truth)
- **`functions/test/helpers/dbTestUtils.ts`:** createTestSuite with defensive cleanup
- **`functions/test/helpers/emulatorSetup.ts`:** resetDb() implementation
- **`functions/test/helpers/TestHelpers.ts`:** Updated to remove redundant cleanup
- **`functions/test/helpers/testPatterns.ts`:** Updated helper patterns

### Test Files Updated

Removed redundant manual `resetDb()` calls from:

- `functions/test/team-consolidated.test.ts`
- `functions/test/scheduled/index.test.ts`
- `functions/test/utils/helpers.test.ts`
- `functions/test/utils/dataLoaders.test.ts`
- `functions/test/edge-cases/unusualInputs.test.ts`
- `functions/test/edge-cases/dataValidation.test.ts`
- `functions/test/TokenService.test.ts`

## Summary

- **Global afterEach** in `test/setup.ts` is the canonical cleanup mechanism
- **createTestSuite.beforeEach** provides defensive cleanup for extra safety
- **Tests should seed their own data** and not depend on previous test state
- **Manual resetDb() calls are unnecessary** in most cases
- **This approach guarantees test isolation** and deterministic results

For questions or issues, see the implementation in `functions/test/setup.ts` and `functions/test/helpers/dbTestUtils.ts`.
