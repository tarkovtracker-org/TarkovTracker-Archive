/**
 * Test Helpers - Common utilities for test setup, teardown, and execution
 * 
 * This file provides reusable helper functions to standardize test patterns
 * and reduce code duplication across test files.
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { adminMock, firestoreMock, resetDb, seedDb } from '../setup';

/**
 * Test context interface for consistent test setup
 */
export interface TestContext {
  userId: string;
  teamId: string;
  tokenId: string;
  timestamp: number;
}

/**
 * Creates a standardized test context with unique identifiers
 */
export const createTestContext = (): TestContext => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  
  return {
    userId: `test-user-${timestamp}-${randomSuffix}`,
    teamId: `test-team-${timestamp}-${randomSuffix}`,
    tokenId: `test-token-${timestamp}-${randomSuffix}`,
    timestamp,
  };
};

/**
 * Test setup helper for consistent test initialization
 */
export const setupTest = (context?: Partial<TestContext>): TestContext => {
  const testContext = { ...createTestContext(), ...context };
  
  // Reset database state
  resetDb();
  
  // Clear all mocks
  vi.clearAllMocks();
  
  return testContext;
};

/**
 * Test cleanup helper for consistent test teardown
 */
export const cleanupTest = (): void => {
  // Reset database state
  resetDb();
  
  // Reset all mocks
  vi.resetAllMocks();
  
  // Restore original implementations
  vi.restoreAllMocks();
};

/**
 * Standard test setup and teardown for describe blocks
 */
export const withTestSetup = (testFn: (context: TestContext) => void | Promise<void>) => {
  let context: TestContext;
  
  beforeEach(() => {
    context = setupTest();
  });
  
  afterEach(() => {
    cleanupTest();
  });
  
  return () => testFn(context);
};

/**
 * Helper to create mock response objects
 */
export const createMockResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  
  // Chainable methods with proper implementation
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  
  res.json.mockImplementation((body: any) => {
    res.body = body;
    return res;
  });
  
  res.send.mockImplementation((body: any) => {
    res.body = body;
    return res;
  });
  
  res.set.mockImplementation((keyOrObj: string | Record<string, any>, value?: any) => {
    if (typeof keyOrObj === 'string') {
      res.headers[keyOrObj] = value;
    } else {
      Object.assign(res.headers, keyOrObj);
    }
    return res;
  });
  
  return res;
};

/**
 * Helper to create mock request objects
 */
export const createMockRequest = (overrides: Partial<Request> = {}) => {
  return {
    method: 'GET',
    url: '/',
    headers: {},
    body: null,
    query: {},
    params: {},
    user: null,
    ...overrides,
  };
};

/**
 * Helper to wait for async operations
 */
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Helper to wait for next tick (useful for async operations)
 */
export const waitForNextTick = (): Promise<void> => {
  return new Promise(resolve => setImmediate(resolve));
};

/**
 * Helper to create a spy on console methods
 */
export const spyOnConsole = () => {
  const spies = {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  };
  
  const restore = () => {
    Object.values(spies).forEach(spy => spy.mockRestore());
  };
  
  return { ...spies, restore };
};

/**
 * Helper to measure execution time
 */
export const measureTime = async <T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  
  return {
    result,
    duration: end - start,
  };
};

/**
 * Helper to create a mock transaction
 */
export const createMockTransaction = () => {
  const operations: any[] = [];
  
  const transaction = {
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    
    // Helper to get all operations
    getOperations: () => [...operations],
    
    // Helper to clear operations
    clearOperations: () => {
      operations.length = 0;
    },
  };
  
  // Track operations
  const trackOperation = (type: string) => {
    return (...args: any[]) => {
      operations.push({ type, args, timestamp: Date.now() });
      return Promise.resolve();
    };
  };
  
  transaction.get.mockImplementation(trackOperation('get'));
  transaction.set.mockImplementation(trackOperation('set'));
  transaction.update.mockImplementation(trackOperation('update'));
  transaction.delete.mockImplementation(trackOperation('delete'));
  transaction.create.mockImplementation(trackOperation('create'));
  
  return transaction;
};

/**
 * Helper to setup Firestore collection mock
 */
export const setupCollectionMock = (collectionName: string) => {
  const documents = new Map<string, any>();
  
  const collection = {
    _documents: documents,
    
    doc: vi.fn((id: string) => ({
      id,
      path: `${collectionName}/${id}`,
      
      get: vi.fn(() => {
        return Promise.resolve({
          exists: documents.has(id),
          data: () => documents.get(id),
        });
      }),
      
      set: vi.fn((data: any) => {
        documents.set(id, data);
        return Promise.resolve();
      }),
      
      update: vi.fn((updates: any) => {
        const existing = documents.get(id) || {};
        documents.set(id, { ...existing, ...updates });
        return Promise.resolve();
      }),
      
      delete: vi.fn(() => {
        documents.delete(id);
        return Promise.resolve();
      }),
    })),
    
    add: vi.fn((data: any) => {
      const id = `auto-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      documents.set(id, data);
      return Promise.resolve({ id });
    }),
    
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    
    get: vi.fn(() => {
      const docs = Array.from(documents.entries()).map(([id, data]) => ({
        id,
        data: () => data,
        exists: true,
      }));
      
      return Promise.resolve({
        docs,
        empty: docs.length === 0,
        size: docs.length,
      });
    }),
  };
  
  // Mock the collection in firestore
  const originalCollection = firestoreMock.collection.getMockImplementation();
  firestoreMock.collection.mockImplementation((name: string) => {
    return name === collectionName ? collection : originalCollection!(name);
  });
  
  return {
    collection,
    documents,
    restore: () => {
      firestoreMock.collection.mockImplementation(originalCollection);
    },
  };
};

/**
 * Helper to create a mock Firebase auth user
 */
export const createMockAuthUser = (overrides: Partial<any> = {}) => {
  return {
    uid: `user-${Date.now()}`,
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: true,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    ...overrides,
  };
};

/**
 * Helper to create a mock error
 */
export const createMockError = (message: string, code: string = 'unknown') => {
  const error = new Error(message) as any;
  error.code = code;
  error.name = 'FirebaseError';
  return error;
};

/**
 * Helper to test async error handling
 */
export const expectAsyncError = async (
  fn: () => Promise<any>,
  expectedError: string | RegExp | Error
): Promise<Error> => {
  try {
    await fn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (typeof expectedError === 'string') {
      expect((error as Error).message).toContain(expectedError);
    } else if (expectedError instanceof RegExp) {
      expect((error as Error).message).toMatch(expectedError);
    } else if (expectedError instanceof Error) {
      expect(error).toEqual(expectedError);
    }
    return error as Error;
  }
};

/**
 * Helper to test multiple async operations
 */
export const runConcurrentOperations = async <T>(
  operations: Array<() => Promise<T>>,
  concurrency: number = 5
): Promise<Array<{ result?: T; error?: Error }>> => {
  const results: Array<{ result?: T; error?: Error }> = [];
  
  // Process operations in batches
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(op => op())
    );
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push({ result: result.value });
      } else {
        results.push({ error: result.reason });
      }
    });
  }
  
  return results;
};

/**
 * Helper to create test data with relationships
 */
export const createRelatedTestData = (context: TestContext) => {
  const user = {
    uid: context.userId,
    email: `${context.userId}@example.com`,
    displayName: 'Test User',
    level: 25,
    gameEdition: 4,
    pmcFaction: 'BEAR',
  };
  
  const team = {
    id: context.teamId,
    name: 'Test Team',
    description: 'Test team description',
    owner: context.userId,
    members: [context.userId],
    createdAt: context.timestamp,
    settings: {
      allowMemberProgress: true,
      requireApproval: false,
    },
  };
  
  const token = {
    id: context.tokenId,
    owner: context.userId,
    note: 'Test token',
    permissions: ['GP', 'WP'],
    gameMode: 'pvp',
    calls: 0,
    createdAt: new Date(context.timestamp),
  };
  
  const progress = {
    currentGameMode: 'pvp',
    pvp: {
      taskCompletions: {},
      taskObjectives: {},
      hideoutModules: {},
      hideoutParts: {},
    },
    pve: {
      taskCompletions: {},
      taskObjectives: {},
      hideoutModules: {},
      hideoutParts: {},
    },
  };
  
  return { user, team, token, progress };
};

/**
 * Helper to seed related test data
 */
export const seedRelatedTestData = async (context: TestContext) => {
  const { user, team, token, progress } = createRelatedTestData(context);
  
  await seedDb({
    users: { [context.userId]: user },
    teams: { [context.teamId]: team },
    token: { [context.tokenId]: token },
    progress: { [context.userId]: progress },
  });
  
  return { user, team, token, progress };
};

/**
 * Helper to verify mock calls
 */
export const expectMockCall = (
  mock: any,
  expectedArgs: any[] = [],
  callIndex: number = 0
) => {
  expect(mock).toHaveBeenCalled();
  
  if (expectedArgs.length > 0) {
    expect(mock.mock.calls[callIndex]).toEqual(expectedArgs);
  }
};

/**
 * Helper to verify mock call count
 */
export const expectMockCallCount = (mock: any, expectedCount: number) => {
  expect(mock).toHaveBeenCalledTimes(expectedCount);
};

/**
 * Helper to create a mock with default behavior
 */
export const createMock = <T extends (...args: any[]) => any>(
  implementation?: T
): { mock: any; restore: () => void } => {
  const mock = vi.fn(implementation);
  
  const restore = () => {
    mock.mockRestore();
  };
  
  return { mock, restore };
};

/**
 * Helper to setup environment variables for tests
 */
export const setTestEnv = (env: Record<string, string>) => {
  const originalEnv = { ...process.env };
  
  // Set test environment variables
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  // Return restore function
  const restore = () => {
    process.env = originalEnv;
  };
  
  return restore;
};

/**
 * Helper to create a test timeout
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error = new Error('Test timeout')
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(timeoutError), timeoutMs);
    }),
  ]);
};

/**
 * Helper to retry operations in tests
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 100
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        await waitFor(delay);
      }
    }
  }
  
  throw lastError!;
};

/**
 * Helper to create a test suite with common setup
 */
export const createTestSuite = (
  suiteName: string,
  testDefinitions: Array<{
    name: string;
    fn: (context: TestContext) => void | Promise<void>;
    skip?: boolean;
    only?: boolean;
  }>
) => {
  describe(suiteName, () => {
    let context: TestContext;
    
    beforeEach(() => {
      context = setupTest();
    });
    
    afterEach(() => {
      cleanupTest();
    });
    
    testDefinitions.forEach(({ name, fn, skip, only }) => {
      const testFn = () => fn(context);
      
      if (only) {
        it.only(name, testFn);
      } else if (skip) {
        it.skip(name, testFn);
      } else {
        it(name, testFn);
      }
    });
  });
};