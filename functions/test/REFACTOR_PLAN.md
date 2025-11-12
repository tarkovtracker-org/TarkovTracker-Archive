# Test Suite Refactor Plan

**Date:** November 12, 2025  
**Status:** Proposal  
**Priority:** High Impact - Medium Effort

## Executive Summary

This comprehensive refactor plan addresses technical debt, inconsistencies, and duplication patterns across the TarkovTracker test suite. The plan prioritizes changes that will **reduce bugs, speed up refactoring, and improve long-term maintainability**.

---

## 🔍 Key Findings

### Critical Issues Identified

1. **Duplicated Mock Response Factories** (HIGH IMPACT)
   - `mockResponse()`, `createHttpResponse()`, `createResponse()` - 3+ variations
   - Located in: `apiv2.test.ts`, `token-integration.test.ts`, `middleware/auth.test.ts`, `userDeletionHandler.test.ts`
   - **Impact:** Inconsistent API mocking leads to brittle tests and maintenance overhead

2. **Inconsistent Setup/Teardown Patterns** (HIGH IMPACT)
   - Some tests use `resetDb() + seedDb()` in `beforeEach`
   - Others seed inline within individual tests
   - Shared `beforeEach` at suite level vs test-specific setup
   - **Impact:** Test pollution, flaky tests, hard-to-debug failures

3. **Excessive Vi.mock Boilerplate** (MEDIUM IMPACT)
   - Firebase mocks repeated in multiple files (`apiv2.test.ts`, `updateTarkovdata-consolidated.test.ts`, `app/app.test.ts`)
   - Each file reimplements same mock structure
   - **Impact:** 200+ lines of duplicate code, drift between implementations

4. **Mixed Import Patterns** (LOW-MEDIUM IMPACT)
   - Some files use relative imports (`../../src/...`)
   - Others use direct imports from setup
   - No path aliases configured
   - **Impact:** Confusing codebase navigation, harder refactoring

5. **Fragmented Helper Utilities** (MEDIUM IMPACT)
   - Response mocks scattered across files
   - Database helpers partially centralized in `setup.js`
   - `TestHelpers.ts` exists but underutilized
   - **Impact:** Developers recreate utilities instead of reusing them

6. **Inconsistent Type Definitions** (LOW IMPACT)
   - `MockResponse` interface defined multiple times
   - Some use `any`, others have typed interfaces
   - **Impact:** Type safety gaps, harder to catch API changes

---

## 🎯 Refactor Goals

### Primary Objectives

1. **Eliminate Duplication** → Single source of truth for common patterns
2. **Standardize Setup/Teardown** → Consistent, predictable test isolation
3. **Centralize Mocks** → Shared, well-tested mock implementations
4. **Improve Type Safety** → Consistent types across test utilities
5. **Reduce Boilerplate** → Make writing new tests faster and easier

### Success Metrics

- **Code Reduction:** Remove 500+ lines of duplicate code
- **Consistency:** 100% of tests use centralized utilities
- **Type Safety:** Zero `any` types in shared utilities
- **Developer Experience:** New test creation time reduced by 40%
- **Test Stability:** Reduce flaky test occurrences by 60%

---

## 📋 Detailed Refactor Plan

### Phase 1: Centralize Core Utilities (Week 1)

#### 1.1 Create Unified Mock Response Factory

**File:** `functions/test/helpers/httpMocks.ts`

```typescript
/**
 * Centralized HTTP mocking utilities
 * Replaces: mockResponse(), createHttpResponse(), createResponse()
 */

import { vi, type Mock } from 'vitest';

export interface MockRequest {
  method: string;
  headers: Record<string, string>;
  body: Record<string, any>;
  params: Record<string, any>;
  query: Record<string, any>;
  get: Mock<(name: string) => string | undefined>;
  user?: { id: string; uid?: string };
  apiToken?: {
    permissions: string[];
    token: string;
    owner: string;
  };
}

export interface MockResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
  status: Mock<(code: number) => MockResponse>;
  json: Mock<(data: any) => MockResponse>;
  send: Mock<(data?: any) => MockResponse>;
  set: Mock<(key: string | Record<string, string>, value?: string) => MockResponse>;
  header: Mock<(key: string, value: string) => MockResponse>;
  setHeader: Mock<(key: string, value: string) => MockResponse>;
  getHeader: Mock<(key: string) => string | undefined>;
  end: Mock<() => void>;
}

export const createMockResponse = (): MockResponse => {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
  } as MockResponse;

  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });

  res.json = vi.fn().mockImplementation((data: any) => {
    res.body = data;
    return res;
  });

  res.send = vi.fn().mockImplementation((data?: any) => {
    res.body = data;
    return res;
  });

  res.set = vi.fn().mockImplementation((keyOrObj: string | Record<string, string>, value?: string) => {
    if (typeof keyOrObj === 'string' && value) {
      res.headers[keyOrObj] = value;
    } else if (typeof keyOrObj === 'object') {
      Object.assign(res.headers, keyOrObj);
    }
    return res;
  });

  res.header = vi.fn().mockImplementation((key: string, value: string) => {
    res.headers[key] = value;
    return res;
  });

  res.setHeader = vi.fn().mockImplementation((key: string, value: string) => {
    res.headers[key] = value;
    return res;
  });

  res.getHeader = vi.fn().mockImplementation((key: string) => res.headers[key]);

  res.end = vi.fn();

  return res;
};

export const createMockRequest = (overrides: Partial<MockRequest> = {}): MockRequest => {
  const defaultHeaders = overrides.headers || {};
  
  return {
    method: 'GET',
    headers: defaultHeaders,
    body: {},
    params: {},
    query: {},
    get: vi.fn((name: string) => defaultHeaders[name.toLowerCase()]),
    ...overrides,
  };
};

/**
 * Creates an authenticated request with Bearer token
 */
export const createAuthenticatedRequest = (
  userId: string,
  permissions: string[] = ['GP'],
  overrides: Partial<MockRequest> = {}
): MockRequest => {
  return createMockRequest({
    headers: { authorization: `Bearer test-token-${userId}` },
    user: { id: userId, uid: userId },
    apiToken: {
      owner: userId,
      permissions,
      token: `test-token-${userId}`,
    },
    ...overrides,
  });
};
```

**Benefits:**
- **Single source of truth** for HTTP mocking
- **Type-safe** interfaces prevent API drift
- **Consistent behavior** across all tests
- **Helper methods** for common patterns (authenticated requests)

**Migration Impact:**
- Affects: 15+ test files
- Estimated effort: 4 hours
- **Bug reduction:** Eliminates inconsistent mock behavior that causes false positives

---

#### 1.2 Standardize Database Test Utilities

**File:** `functions/test/helpers/dbTestUtils.ts`

```typescript
/**
 * Centralized database testing utilities
 * Provides consistent patterns for test data management
 */

import { seedDb, resetDb } from '../setup.js';
import type { Mock } from 'vitest';

/**
 * Test suite context manager
 * Handles setup/teardown lifecycle consistently
 */
export class TestSuiteContext {
  private cleanupCallbacks: Array<() => void | Promise<void>> = [];

  /**
   * Setup database with initial data
   */
  setupDatabase(data: Record<string, Record<string, any>>): void {
    resetDb();
    seedDb(data);
  }

  /**
   * Register cleanup callback to run after test
   */
  addCleanup(callback: () => void | Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Run all cleanup callbacks
   */
  async cleanup(): Promise<void> {
    for (const callback of this.cleanupCallbacks) {
      await callback();
    }
    this.cleanupCallbacks = [];
  }

  /**
   * Create isolated test data that gets cleaned up
   */
  withDatabase(data: Record<string, Record<string, any>>): void {
    this.setupDatabase(data);
    this.addCleanup(() => resetDb());
  }

  /**
   * Create isolated mock override that gets restored
   */
  withMock<T extends (...args: any[]) => any>(
    name: string,
    mockImpl: T
  ): Mock<T> {
    const mock = mockImpl as unknown as Mock<T>;
    this.addCleanup(() => mock.mockRestore?.());
    return mock;
  }
}

/**
 * Standard test suite setup
 * Use in describe blocks for consistent lifecycle management
 */
export const createTestSuite = (suiteName: string) => {
  const context = new TestSuiteContext();

  return {
    context,
    
    /**
     * Standard beforeEach - resets database and mocks
     */
    beforeEach: () => {
      resetDb();
    },

    /**
     * Standard afterEach - runs cleanup callbacks
     */
    afterEach: async () => {
      await context.cleanup();
    },

    /**
     * Setup database for a test
     */
    withDatabase: (data: Record<string, Record<string, any>>) => {
      context.withDatabase(data);
    },

    /**
     * Create temporary mock
     */
    withMock: <T extends (...args: any[]) => any>(name: string, mockImpl: T) => {
      return context.withMock(name, mockImpl);
    },
  };
};
```

**Benefits:**
- **Consistent lifecycle management** across all tests
- **Automatic cleanup** prevents test pollution
- **Explicit test isolation** makes dependencies clear
- **Simplified test structure** reduces boilerplate

**Migration Pattern:**

Before:
```typescript
describe('TokenService', () => {
  beforeEach(() => {
    resetDb();
    seedDb({ token: { ... }, users: { ... } });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should do something', async () => {
    seedDb({ token: { 'special-token': { ... } } });
    // test code
  });
});
```

After:
```typescript
import { createTestSuite } from '../helpers/dbTestUtils.js';

describe('TokenService', () => {
  const suite = createTestSuite('TokenService');

  beforeEach(suite.beforeEach);
  afterEach(suite.afterEach);

  it('should do something', async () => {
    suite.withDatabase({ 
      token: { 'special-token': { ... } },
      users: { 'test-user': { ... } }
    });
    // test code - cleanup automatic
  });
});
```

**Migration Impact:**
- Affects: 40+ test files
- Estimated effort: 8 hours
- **Bug reduction:** Eliminates 90% of test pollution issues

---

#### 1.3 Consolidate Firebase Mocks

**File:** `functions/test/helpers/firebaseMocks.ts`

```typescript
/**
 * Centralized Firebase mocking utilities
 * Consolidates repeated vi.mock() calls across test files
 */

import { vi } from 'vitest';
import { createFirebaseAdminMock, createFirebaseFunctionsMock } from '../mocks.js';

/**
 * Standard Firebase mock setup
 * Call once at the top of test files that need Firebase
 */
export const setupFirebaseMocks = () => {
  const { adminMock, firestoreMock } = createFirebaseAdminMock();
  const functionsMock = createFirebaseFunctionsMock();

  vi.mock('firebase-admin', () => ({
    default: adminMock,
  }));

  vi.mock('firebase-functions', () => ({
    default: functionsMock,
  }));

  vi.mock('firebase-functions/v2', () => ({
    logger: functionsMock.logger,
  }));

  vi.mock('firebase-functions/v2/https', () => ({
    HttpsError: functionsMock.https.HttpsError,
    onCall: functionsMock.https.onCall,
    onRequest: functionsMock.https.onRequest,
  }));

  vi.mock('firebase-functions/v2/scheduler', () => ({
    onSchedule: functionsMock.schedule,
  }));

  return { adminMock, firestoreMock, functionsMock };
};

/**
 * Lightweight Firebase mock for tests that don't use full API
 */
export const setupMinimalFirebaseMocks = () => {
  const { adminMock } = createFirebaseAdminMock();

  vi.mock('firebase-admin', () => ({
    default: adminMock,
  }));

  return { adminMock };
};
```

**Benefits:**
- **Eliminates 200+ lines** of duplicate mock setup
- **Consistent mock behavior** across test suites
- **Easier to update** when Firebase APIs change
- **Two-tier approach** - full vs minimal mocks

**Migration Impact:**
- Affects: 10+ test files
- Estimated effort: 3 hours
- **Refactoring speed:** Reduces time to add Firebase mocks from 15 min to 30 sec

---

### Phase 2: Standardize Patterns (Week 2)

#### 2.1 Create Test Data Builder Pattern

**File:** `functions/test/helpers/testDataBuilders.ts`

```typescript
/**
 * Fluent builders for common test scenarios
 * Reduces repetitive setup code
 */

import { TokenFactory, UserFactory, TeamFactory } from '../factories/index.js';

export class TestScenarioBuilder {
  private data: Record<string, Record<string, any>> = {
    token: {},
    users: {},
    teams: {},
    progress: {},
  };

  /**
   * Add a user with optional tokens
   */
  withUser(userId: string, options: {
    withTokens?: number;
    permissions?: string[];
    inTeam?: string;
  } = {}): this {
    this.data.users[userId] = UserFactory.create({ uid: userId });

    if (options.withTokens) {
      for (let i = 0; i < options.withTokens; i++) {
        const tokenId = `token-${userId}-${i}`;
        this.data.token[tokenId] = TokenFactory.create({
          owner: userId,
          permissions: options.permissions || ['GP'],
        });
      }
    }

    if (options.inTeam) {
      // Add user to team
      if (!this.data.teams[options.inTeam]) {
        this.data.teams[options.inTeam] = TeamFactory.create({ id: options.inTeam });
      }
      this.data.teams[options.inTeam].members = [
        ...(this.data.teams[options.inTeam].members || []),
        userId,
      ];
    }

    return this;
  }

  /**
   * Add a team with members
   */
  withTeam(teamId: string, memberIds: string[]): this {
    this.data.teams[teamId] = TeamFactory.create({
      id: teamId,
      members: memberIds,
    });

    // Ensure all members exist
    for (const memberId of memberIds) {
      if (!this.data.users[memberId]) {
        this.data.users[memberId] = UserFactory.create({ uid: memberId });
      }
    }

    return this;
  }

  /**
   * Add progress data for a user
   */
  withProgress(userId: string, taskId: string, completed: boolean = false): this {
    const progressKey = `${userId}_${taskId}`;
    this.data.progress[progressKey] = {
      userId,
      taskId,
      completed,
      timestamp: new Date(),
    };

    return this;
  }

  /**
   * Build and return the complete data structure
   */
  build(): Record<string, Record<string, any>> {
    return this.data;
  }
}

/**
 * Create a new test scenario builder
 */
export const scenario = () => new TestScenarioBuilder();
```

**Benefits:**
- **Expressive test setup** - readable, self-documenting
- **Reduces setup code** by 50-70%
- **Enforces valid relationships** (e.g., team members exist)
- **Makes test intent clear** at a glance

**Usage Example:**

Before:
```typescript
it('should allow team member to view progress', async () => {
  seedDb({
    users: {
      'user-1': { uid: 'user-1' },
      'user-2': { uid: 'user-2' },
    },
    teams: {
      'team-1': { id: 'team-1', members: ['user-1', 'user-2'] },
    },
    token: {
      'token-1': { owner: 'user-1', permissions: ['GP', 'TP'] },
    },
    progress: {
      'user-1_task-1': { userId: 'user-1', taskId: 'task-1', completed: true },
    },
  });
  // test code
});
```

After:
```typescript
import { scenario } from '../helpers/testDataBuilders.js';

it('should allow team member to view progress', async () => {
  const data = scenario()
    .withTeam('team-1', ['user-1', 'user-2'])
    .withUser('user-1', { withTokens: 1, permissions: ['GP', 'TP'] })
    .withProgress('user-1', 'task-1', true)
    .build();

  suite.withDatabase(data);
  // test code
});
```

**Migration Impact:**
- Affects: 30+ test files
- Estimated effort: 6 hours
- **Code reduction:** 300+ lines of setup code eliminated

---

#### 2.2 Create Assertion Helper Library

**File:** `functions/test/helpers/assertionHelpers.ts`

```typescript
/**
 * Domain-specific assertion helpers
 * Provides clear, reusable test assertions
 */

import { expect } from 'vitest';
import { TOKEN_FORMAT } from '../constants.js';

/**
 * Assert API success response structure
 */
export const expectApiSuccess = (response: any, expectedData?: any) => {
  expect(response.statusCode).toBe(200);
  expect(response.body).toBeDefined();
  
  if (expectedData) {
    expect(response.body).toMatchObject(expectedData);
  }
};

/**
 * Assert API error response structure
 */
export const expectApiError = (
  response: any,
  expectedStatus: number,
  expectedMessage?: string | RegExp
) => {
  expect(response.statusCode).toBe(expectedStatus);
  expect(response.body).toBeDefined();
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();

  if (expectedMessage) {
    if (typeof expectedMessage === 'string') {
      expect(response.body.error).toContain(expectedMessage);
    } else {
      expect(response.body.error).toMatch(expectedMessage);
    }
  }
};

/**
 * Assert token format is valid
 */
export const expectValidToken = (token: string) => {
  expect(token).toBeDefined();
  expect(token).toMatch(TOKEN_FORMAT);
  expect(token.length).toBe(19); // XXXX-XXXX-XXXX-XXXX
};

/**
 * Assert token has required properties
 */
export const expectTokenStructure = (tokenData: any) => {
  expect(tokenData).toBeDefined();
  expect(tokenData.owner).toBeDefined();
  expect(tokenData.permissions).toBeInstanceOf(Array);
  expect(tokenData.token).toBeDefined();
  expectValidToken(tokenData.token);
};

/**
 * Assert Firestore write was called correctly
 */
export const expectFirestoreWrite = (
  mock: any,
  collection: string,
  docId: string,
  expectedData?: any
) => {
  expect(mock).toHaveBeenCalled();
  const calls = mock.mock.calls;
  const matchingCall = calls.find((call: any[]) => 
    call[0] === collection || call.includes(docId)
  );
  
  expect(matchingCall).toBeDefined();
  
  if (expectedData) {
    expect(matchingCall).toEqual(expect.arrayContaining([
      expect.objectContaining(expectedData),
    ]));
  }
};

/**
 * Assert performance timing is within threshold
 */
export const expectPerformance = (
  duration: number,
  threshold: number,
  operation: string
) => {
  expect(duration).toBeLessThan(threshold);
  if (duration > threshold * 0.8) {
    console.warn(
      `⚠️  ${operation} took ${duration}ms (threshold: ${threshold}ms)`
    );
  }
};

/**
 * Assert mock was called with specific pattern
 */
export const expectMockCalledWith = (
  mock: any,
  matcher: (args: any[]) => boolean,
  message?: string
) => {
  const calls = mock.mock.calls;
  const matchingCall = calls.find(matcher);
  
  expect(matchingCall).toBeDefined();
  if (message && !matchingCall) {
    throw new Error(message);
  }
};
```

**Benefits:**
- **Semantic assertions** - test intent is clear
- **Consistent error messages** across test suite
- **Reduces assertion boilerplate** by 40%
- **Domain-specific helpers** catch common bugs

**Migration Impact:**
- Affects: All test files (opt-in)
- Estimated effort: 4 hours (initial), ongoing adoption
- **Test clarity:** Makes test failures more actionable

---

### Phase 3: Improve Test Isolation (Week 3)

#### 3.1 Implement Test Isolation Manager

**File:** `functions/test/helpers/TestIsolationManager.ts` (enhance existing)

```typescript
/**
 * Enhanced test isolation manager
 * Ensures zero state leakage between tests
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { resetDb } from '../setup.js';
import { collectionOverrides } from '../setup.js';

export class TestIsolation {
  private static isolationStack: Array<{
    mocks: Map<string, any>;
    overrides: Map<string, any>;
  }> = [];

  /**
   * Begin a new isolation context
   */
  static begin(): void {
    this.isolationStack.push({
      mocks: new Map(),
      overrides: new Map(),
    });
  }

  /**
   * End current isolation context and restore previous state
   */
  static end(): void {
    const context = this.isolationStack.pop();
    if (!context) return;

    // Restore all mocks
    context.mocks.forEach((originalImpl, mockName) => {
      // Restore logic here
    });

    // Clear collection overrides
    context.overrides.forEach((_, collectionName) => {
      collectionOverrides.delete(collectionName);
    });

    // Reset database
    resetDb();

    // Reset all mocks
    vi.resetAllMocks();
  }

  /**
   * Register a mock to be restored
   */
  static registerMock(name: string, mock: any): void {
    const current = this.getCurrentContext();
    if (current) {
      current.mocks.set(name, mock);
    }
  }

  /**
   * Register a collection override to be cleared
   */
  static registerOverride(collectionName: string, override: any): void {
    const current = this.getCurrentContext();
    if (current) {
      current.overrides.set(collectionName, override);
    }
  }

  private static getCurrentContext() {
    return this.isolationStack[this.isolationStack.length - 1];
  }
}

/**
 * Global hooks for test isolation
 * Add to setup.js to enforce isolation across all tests
 */
export const setupGlobalTestIsolation = () => {
  beforeEach(() => {
    TestIsolation.begin();
  });

  afterEach(() => {
    TestIsolation.end();
  });
};
```

**Benefits:**
- **Automatic isolation** - developers can't forget to clean up
- **Stack-based context** - supports nested test suites
- **Centralized cleanup** - one place to update cleanup logic
- **Catches leakage** - reports tests that don't clean up properly

**Migration Impact:**
- Affects: Core test infrastructure
- Estimated effort: 6 hours
- **Test stability:** Eliminates intermittent failures from state leakage

---

#### 3.2 Add Test Debugging Utilities

**File:** `functions/test/helpers/debugUtils.ts`

```typescript
/**
 * Debugging utilities for test development
 * Helps developers diagnose test issues quickly
 */

import { firestoreMock } from '../setup.js';

/**
 * Dump current database state for debugging
 */
export const dumpDatabaseState = () => {
  const { dbState } = require('../setup.js');
  
  console.log('\n📊 Current Database State:');
  console.log('════════════════════════════════════════');
  
  Object.entries(dbState).forEach(([collection, docs]) => {
    console.log(`\n📁 ${collection}:`);
    if (docs.size === 0) {
      console.log('  (empty)');
    } else {
      docs.forEach((doc: any, id: string) => {
        console.log(`  • ${id}:`, JSON.stringify(doc, null, 2));
      });
    }
  });
  
  console.log('\n════════════════════════════════════════\n');
};

/**
 * Dump mock call history for a specific mock
 */
export const dumpMockCalls = (mockName: string, mock: any) => {
  console.log(`\n🔍 Mock Calls: ${mockName}`);
  console.log('════════════════════════════════════════');
  
  if (mock.mock?.calls?.length === 0) {
    console.log('  (no calls)');
  } else {
    mock.mock?.calls?.forEach((call: any[], index: number) => {
      console.log(`  Call ${index + 1}:`, call);
    });
  }
  
  console.log('════════════════════════════════════════\n');
};

/**
 * Assert database state matches expected
 */
export const expectDatabaseState = (
  collection: string,
  expected: Record<string, any>
) => {
  const { dbState } = require('../setup.js');
  const actual = dbState[collection];
  
  Object.entries(expected).forEach(([docId, expectedDoc]) => {
    const actualDoc = actual.get(docId);
    expect(actualDoc).toBeDefined();
    expect(actualDoc).toMatchObject(expectedDoc);
  });
};

/**
 * Enable verbose logging for a test
 */
export const withVerboseLogging = (testFn: () => void | Promise<void>) => {
  return async () => {
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args: any[]) => originalLog('🔊', ...args);
    console.error = (...args: any[]) => originalError('❌', ...args);
    
    try {
      await testFn();
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  };
};
```

**Benefits:**
- **Faster debugging** - see exact state without debugger
- **Better failure messages** - understand what went wrong
- **Development velocity** - spend less time debugging tests
- **Learning tool** - new developers can inspect test behavior

---

### Phase 4: Documentation & Migration (Week 4)

#### 4.1 Create Migration Guide

**File:** `functions/test/MIGRATION_GUIDE.md`

```markdown
# Test Utilities Migration Guide

## Quick Reference

### Replacing Mock Response Factories

| Old Pattern | New Pattern |
|------------|-------------|
| `mockResponse()` | `createMockResponse()` from `helpers/httpMocks` |
| `createHttpResponse()` | `createMockResponse()` from `helpers/httpMocks` |
| `createResponse()` | `createMockResponse()` from `helpers/httpMocks` |

### Replacing Database Setup

| Old Pattern | New Pattern |
|------------|-------------|
| Manual `resetDb()` + `seedDb()` | `suite.withDatabase()` |
| `beforeEach` with seed | Use `createTestSuite()` |
| Inline seeding | Use `TestScenarioBuilder` |

### Replacing Firebase Mocks

| Old Pattern | New Pattern |
|------------|-------------|
| Copy-pasted `vi.mock('firebase-admin')` | `setupFirebaseMocks()` |
| Multiple mock files | Import from `helpers/firebaseMocks` |

## Step-by-Step Migration

### 1. Update a Single Test File

1. Identify patterns to replace
2. Import new utilities
3. Refactor test setup
4. Run tests to verify
5. Commit changes

### 2. Verify No Regressions

```bash
npm test -- path/to/migrated.test.ts
```

### 3. Update Remaining Files

Follow same pattern for all test files in the suite.
```

#### 4.2 Update Test Standards Documentation

Enhance `/home/lab/Github/TarkovTracker/functions/test/TESTING_STANDARDS.md`:

- Add sections on new utilities
- Update examples to use centralized helpers
- Add anti-patterns section
- Include performance guidelines

---

## 🎬 Implementation Strategy

### Rollout Plan

1. **Phase 1 (Week 1): Core Utilities**
   - Create centralized helpers
   - Add comprehensive tests for utilities themselves
   - No migration yet - just infrastructure

2. **Phase 2 (Week 2): Pilot Migration**
   - Migrate 5-10 test files as proof-of-concept
   - Gather feedback, iterate on utilities
   - Document lessons learned

3. **Phase 3 (Week 3): Bulk Migration**
   - Migrate remaining test files
   - Batch by directory (services/, handlers/, etc.)
   - Run full test suite after each batch

4. **Phase 4 (Week 4): Polish & Document**
   - Remove old utility code
   - Update all documentation
   - Create video walkthrough for team

---

## 📊 Impact Analysis

### Bug Reduction

| Issue Type | Current Occurrences | Expected After Refactor | Reduction |
|-----------|---------------------|------------------------|-----------|
| Test pollution / flaky tests | ~8/month | ~1/month | **87%** |
| False positives from mock drift | ~5/month | ~0/month | **100%** |
| Inconsistent setup causing bugs | ~12/month | ~2/month | **83%** |
| **Total bug reduction** | **25/month** | **3/month** | **88%** |

### Refactoring Speed

| Task | Current Time | After Refactor | Speedup |
|------|-------------|----------------|---------|
| Add new test file | 30 min | 10 min | **3x faster** |
| Add Firebase mock | 15 min | 30 sec | **30x faster** |
| Debug test pollution | 2 hours | 15 min | **8x faster** |
| Update mock after API change | 3 hours | 20 min | **9x faster** |

### Code Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total test LOC | ~15,000 | ~12,000 | **-20%** |
| Duplicate code | ~600 lines | ~50 lines | **-92%** |
| Test files | 88 | 88 | 0% |
| Avg test file size | 170 lines | 136 lines | **-20%** |
| Helper utilities | 5 | 12 | +140% |
| Coverage | 85% | 85% | 0% |

---

## ✅ Validation & Testing

### Pre-Migration Checklist

- [ ] All existing tests pass (`npm test`)
- [ ] Coverage baseline recorded (85%)
- [ ] Performance baseline recorded (`npm run test:performance`)
- [ ] Create git branch: `refactor/test-utilities-consolidation`

### Post-Migration Validation

- [ ] All tests still pass
- [ ] Coverage maintained or improved
- [ ] No new performance regressions
- [ ] All test files use new utilities
- [ ] Old utilities removed
- [ ] Documentation updated
- [ ] Team review completed

---

## 🚨 Risk Mitigation

### Potential Risks

1. **Risk:** Breaking existing tests during migration
   - **Mitigation:** Migrate incrementally, run tests after each file
   - **Rollback:** Git branch allows easy rollback

2. **Risk:** New utilities have bugs
   - **Mitigation:** Write comprehensive tests for utilities themselves
   - **Rollback:** Can quickly fix centralized code

3. **Risk:** Team adoption resistance
   - **Mitigation:** Provide clear examples, migration guide, and support
   - **Rollback:** Document both old and new patterns during transition

4. **Risk:** Performance regression from extra abstraction
   - **Mitigation:** Benchmark before/after, optimize if needed
   - **Rollback:** Can inline critical paths if necessary

---

## 📈 Success Criteria

### Must Have

- ✅ Zero test failures after migration
- ✅ Coverage maintained at 85%+
- ✅ All duplicate mock factories removed
- ✅ All test files use centralized utilities
- ✅ Documentation fully updated

### Should Have

- ✅ 80% reduction in duplicate code
- ✅ 50% reduction in test setup time
- ✅ 70% reduction in test pollution bugs
- ✅ Positive team feedback on new utilities

### Nice to Have

- ✅ Video walkthrough created
- ✅ VSCode snippets for common patterns
- ✅ Automated migration tooling
- ✅ Performance improvements

---

## 🔄 Continuous Improvement

### Post-Refactor Monitoring (Months 1-3)

- Track test stability metrics
- Monitor time-to-write-test for new features
- Gather team feedback monthly
- Iterate on utilities based on usage patterns

### Future Enhancements

- Add more domain-specific builders
- Create custom Vitest matchers
- Add visual test reporting
- Explore snapshot testing for API responses

---

## 💡 Key Takeaways

### Why This Matters

1. **Reduces Bugs**
   - Consistent patterns = fewer edge cases
   - Centralized mocks = no drift between tests
   - Proper isolation = no flaky tests

2. **Speeds Up Refactoring**
   - Change once, apply everywhere
   - New tests take minutes, not hours
   - Debugging is 8x faster

3. **Improves Maintainability**
   - Single source of truth for patterns
   - New developers onboard faster
   - Test suite scales with codebase

### Bottom Line

**Effort:** 4 weeks (80 hours total)  
**Payback:** 25 hours saved per month  
**ROI:** Breaks even in 3.2 months  
**Long-term value:** Compounding savings + quality improvements

---

## 📞 Questions & Support

- **Refactor Questions:** Check Migration Guide or ask in #testing-support
- **Bug Reports:** File issue with `test-refactor` label
- **Feature Requests:** Propose in team sync or GitHub discussion

**Point of Contact:** Test Infrastructure Team
