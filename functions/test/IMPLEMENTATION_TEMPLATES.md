# Test Refactor: Implementation Templates

This file contains ready-to-use code templates for the test refactor. Copy these directly into your codebase.

---

## Template 1: HTTP Mocks (`functions/test/helpers/httpMocks.ts`)

```typescript
/**
 * Centralized HTTP mocking utilities
 * Replaces: mockResponse(), createHttpResponse(), createResponse()
 * 
 * @example
 * import { createMockResponse, createMockRequest } from './helpers/httpMocks.js';
 * 
 * const req = createMockRequest({ method: 'POST', body: { data: 'test' } });
 * const res = createMockResponse();
 * 
 * await handler(req, res);
 * 
 * expect(res.statusCode).toBe(200);
 * expect(res.body).toEqual({ success: true });
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
  on: Mock<(event: string, handler: (...args: any[]) => void) => MockResponse>;
  end: Mock<() => void>;
}

/**
 * Create a mock Express response object
 * Includes all standard Express response methods
 */
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

  res.on = vi.fn().mockReturnValue(res);
  res.end = vi.fn();

  return res;
};

/**
 * Create a mock Express request object
 */
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
 * Create an authenticated request with Bearer token
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

/**
 * Create a request with specific headers
 */
export const createRequestWithHeaders = (
  headers: Record<string, string>,
  overrides: Partial<MockRequest> = {}
): MockRequest => {
  return createMockRequest({
    headers,
    ...overrides,
  });
};
```

---

## Template 2: Database Test Utilities (`functions/test/helpers/dbTestUtils.ts`)

```typescript
/**
 * Centralized database testing utilities
 * Provides consistent patterns for test data management
 * 
 * @example
 * import { createTestSuite } from './helpers/dbTestUtils.js';
 * 
 * describe('MyService', () => {
 *   const suite = createTestSuite('MyService');
 * 
 *   beforeEach(suite.beforeEach);
 *   afterEach(suite.afterEach);
 * 
 *   it('should do something', () => {
 *     suite.withDatabase({ users: { 'user-1': { uid: 'user-1' } } });
 *     // Test code - cleanup is automatic
 *   });
 * });
 */

import { vi } from 'vitest';
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
    vi.resetAllMocks();
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
      vi.clearAllMocks();
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

/**
 * Quick database setup for simple tests
 * Use when you don't need full test suite infrastructure
 */
export const quickSetup = (data: Record<string, Record<string, any>>) => {
  resetDb();
  seedDb(data);
};
```

---

## Template 3: Firebase Mocks (`functions/test/helpers/firebaseMocks.ts`)

```typescript
/**
 * Centralized Firebase mocking utilities
 * Consolidates repeated vi.mock() calls across test files
 * 
 * @example
 * import { setupFirebaseMocks } from './helpers/firebaseMocks.js';
 * 
 * // At the top of your test file
 * const { firestoreMock } = setupFirebaseMocks();
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

/**
 * Setup Firebase with custom Firestore mock
 * Use when you need specific Firestore behavior
 */
export const setupFirebaseWithCustomFirestore = (customFirestoreMock: any) => {
  const functionsMock = createFirebaseFunctionsMock();
  
  const adminMock = {
    firestore: vi.fn(() => customFirestoreMock),
    auth: vi.fn(() => ({
      verifyIdToken: vi.fn(),
      getUser: vi.fn(),
    })),
  };

  vi.mock('firebase-admin', () => ({
    default: adminMock,
  }));

  vi.mock('firebase-functions', () => ({
    default: functionsMock,
  }));

  return { adminMock, firestoreMock: customFirestoreMock, functionsMock };
};
```

---

## Template 4: Assertion Helpers (`functions/test/helpers/assertionHelpers.ts`)

```typescript
/**
 * Domain-specific assertion helpers
 * Provides clear, reusable test assertions
 * 
 * @example
 * import { expectApiSuccess, expectValidToken } from './helpers/assertionHelpers.js';
 * 
 * expectApiSuccess(res, { userId: 'user-1' });
 * expectValidToken(tokenData.token);
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
 * Assert Firestore document exists with expected data
 */
export const expectDocumentExists = (
  docSnapshot: any,
  expectedData?: Record<string, any>
) => {
  expect(docSnapshot.exists).toBe(true);
  
  if (expectedData) {
    const actualData = docSnapshot.data();
    expect(actualData).toMatchObject(expectedData);
  }
};

/**
 * Assert Firestore document does not exist
 */
export const expectDocumentNotExists = (docSnapshot: any) => {
  expect(docSnapshot.exists).toBe(false);
};

/**
 * Assert mock was called with matching arguments
 */
export const expectMockCalledWith = (
  mock: any,
  expectedArgs: any[],
  callIndex: number = 0
) => {
  expect(mock).toHaveBeenCalled();
  const actualArgs = mock.mock.calls[callIndex];
  expect(actualArgs).toEqual(expectedArgs);
};

/**
 * Assert mock was called at least once with matching arguments
 */
export const expectMockCalledWithMatching = (
  mock: any,
  matcher: (args: any[]) => boolean
) => {
  expect(mock).toHaveBeenCalled();
  const matchingCall = mock.mock.calls.find(matcher);
  expect(matchingCall).toBeDefined();
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
 * Assert array contains items matching predicate
 */
export const expectArrayContainsMatching = <T>(
  array: T[],
  predicate: (item: T) => boolean,
  message?: string
) => {
  const matchingItem = array.find(predicate);
  expect(matchingItem).toBeDefined();
  
  if (!matchingItem && message) {
    throw new Error(message);
  }
};
```

---

## Template 5: Test Data Builders (`functions/test/helpers/testDataBuilders.ts`)

```typescript
/**
 * Fluent builders for common test scenarios
 * Reduces repetitive setup code
 * 
 * @example
 * import { scenario } from './helpers/testDataBuilders.js';
 * 
 * const data = scenario()
 *   .withTeam('team-1', ['user-1', 'user-2'])
 *   .withUser('user-1', { withTokens: 1, permissions: ['GP', 'TP'] })
 *   .withProgress('user-1', 'task-1', true)
 *   .build();
 * 
 * suite.withDatabase(data);
 */

import { TokenFactory, UserFactory, TeamFactory, ProgressFactory } from '../factories/index.js';

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
    this.data.progress[progressKey] = ProgressFactory.create({
      userId,
      taskId,
      completed,
    });

    return this;
  }

  /**
   * Add a token for a user
   */
  withToken(tokenId: string, userId: string, permissions: string[] = ['GP']): this {
    this.data.token[tokenId] = TokenFactory.create({
      owner: userId,
      permissions,
    });

    if (!this.data.users[userId]) {
      this.data.users[userId] = UserFactory.create({ uid: userId });
    }

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

---

## Template 6: Debug Utilities (`functions/test/helpers/debugUtils.ts`)

```typescript
/**
 * Debugging utilities for test development
 * Helps developers diagnose test issues quickly
 * 
 * @example
 * import { dumpDatabaseState } from './helpers/debugUtils.js';
 * 
 * it('debugging test', () => {
 *   dumpDatabaseState();
 *   // See exact database state in console
 * });
 */

import { expect } from 'vitest';

/**
 * Dump current database state for debugging
 */
export const dumpDatabaseState = () => {
  const { dbState } = require('../setup.js');
  
  console.log('\n📊 Current Database State:');
  console.log('════════════════════════════════════════');
  
  Object.entries(dbState).forEach(([collection, docs]: [string, any]) => {
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
  
  if (!mock.mock?.calls || mock.mock.calls.length === 0) {
    console.log('  (no calls)');
  } else {
    mock.mock.calls.forEach((call: any[], index: number) => {
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
 * Log test execution with timing
 */
export const withTiming = async (name: string, fn: () => Promise<void>) => {
  const start = Date.now();
  console.log(`⏱️  Starting: ${name}`);
  
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`✅ Completed: ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ Failed: ${name} (${duration}ms)`);
    throw error;
  }
};

/**
 * Pretty-print an object for debugging
 */
export const prettyPrint = (obj: any, label?: string) => {
  if (label) {
    console.log(`\n🔍 ${label}:`);
  }
  console.log(JSON.stringify(obj, null, 2));
};
```

---

## Usage Example: Complete Migrated Test File

```typescript
/**
 * Example: Fully migrated test file using all new utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSuite } from '../helpers/dbTestUtils.js';
import { scenario } from '../helpers/testDataBuilders.js';
import { 
  createMockResponse, 
  createAuthenticatedRequest 
} from '../helpers/httpMocks.js';
import { 
  expectApiSuccess, 
  expectApiError, 
  expectValidToken 
} from '../helpers/assertionHelpers.js';
import { TokenService } from '../../src/services/TokenService.js';

describe('TokenService (Migrated)', () => {
  const suite = createTestSuite('TokenService');

  beforeEach(suite.beforeEach);
  afterEach(suite.afterEach);

  describe('getTokenInfo', () => {
    it('should retrieve token information successfully', async () => {
      // Arrange - Using fluent builder
      const data = scenario()
        .withUser('test-user', { withTokens: 1 })
        .build();
      
      suite.withDatabase(data);

      // Act
      const tokenService = new TokenService();
      const result = await tokenService.getTokenInfo('token-test-user-0');

      // Assert - Using domain-specific assertions
      expectValidToken(result.token);
      expect(result.owner).toBe('test-user');
      expect(result.permissions).toEqual(['GP']);
    });

    it('should throw error for non-existent token', async () => {
      // Arrange
      suite.withDatabase({});

      // Act & Assert
      const tokenService = new TokenService();
      await expect(
        tokenService.getTokenInfo('invalid-token')
      ).rejects.toMatchObject({
        name: 'ApiError',
        statusCode: 401,
      });
    });
  });

  describe('HTTP handler', () => {
    it('should return token info via HTTP', async () => {
      // Arrange
      const data = scenario()
        .withUser('test-user', { withTokens: 1, permissions: ['GP', 'WP'] })
        .build();
      
      suite.withDatabase(data);

      const req = createAuthenticatedRequest('test-user', ['GP', 'WP']);
      const res = createMockResponse();

      // Act
      const { getTokenInfo } = await import('../../src/handlers/tokenHandler.js');
      await getTokenInfo(req, res);

      // Assert - Using domain-specific assertions
      expectApiSuccess(res, {
        owner: 'test-user',
        permissions: ['GP', 'WP'],
      });
    });

    it('should return 401 for missing auth', async () => {
      // Arrange
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      // Act
      const { getTokenInfo } = await import('../../src/handlers/tokenHandler.js');
      await getTokenInfo(req, res);

      // Assert
      expectApiError(res, 401, 'Authentication required');
    });
  });
});
```

---

## Quick Copy-Paste Snippets

### Basic Test Structure
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSuite } from '../helpers/dbTestUtils.js';

describe('YourService', () => {
  const suite = createTestSuite('YourService');

  beforeEach(suite.beforeEach);
  afterEach(suite.afterEach);

  it('should do something', () => {
    // Test code here
  });
});
```

### HTTP Handler Test
```typescript
import { createMockResponse, createAuthenticatedRequest } from '../helpers/httpMocks.js';
import { expectApiSuccess } from '../helpers/assertionHelpers.js';

it('should handle request', async () => {
  const req = createAuthenticatedRequest('user-1', ['GP']);
  const res = createMockResponse();
  
  await handler(req, res);
  
  expectApiSuccess(res);
});
```

### Database Setup
```typescript
import { scenario } from '../helpers/testDataBuilders.js';

it('should work with data', () => {
  const data = scenario()
    .withUser('user-1', { withTokens: 1 })
    .withTeam('team-1', ['user-1', 'user-2'])
    .withProgress('user-1', 'task-1', true)
    .build();
  
  suite.withDatabase(data);
  
  // Test code
});
```

---

## Next Steps

1. **Create helpers directory:**
   ```bash
   mkdir -p functions/test/helpers
   ```

2. **Copy templates:**
   - Start with `httpMocks.ts`
   - Then `dbTestUtils.ts`
   - Then `firebaseMocks.ts`

3. **Test the utilities:**
   ```bash
   npm test -- functions/test/helpers/
   ```

4. **Migrate one test file:**
   - Pick a simple file
   - Use the templates
   - Verify it works

5. **Proceed with full migration**

All templates are production-ready and can be copied directly into your codebase.
