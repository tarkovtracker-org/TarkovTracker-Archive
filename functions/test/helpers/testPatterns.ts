/**
 * Reusable Test Patterns
 *
 * Common patterns for testing with Firebase emulator.
 * Use these as templates when writing new tests.
 */

import { expect } from 'vitest';
import { resetDb, seedDb, SeedData, admin, firestore } from './emulatorSetup';

// ============================================================================
// BASIC SERVICE TEST PATTERN
// ============================================================================

/**
 * Pattern for testing a service with Firestore operations
 *
 * NOTE: Firestore is automatically cleaned by the global afterEach hook in test/setup.ts.
 * This function focuses on seeding initial data for the test.
 *
 * Usage:
 * ```typescript
 * const { service, db, seed } = await createServiceTest(TokenService);
 *
 * it('should create token', async () => {
 *   const token = await service.create('user-1', { name: 'test' });
 *   expect(token.id).toBeDefined();
 * });
 * ```
 */
export async function createServiceTest<T>(ServiceClass: new (db: any) => T, initialData?: SeedData) {
  // Global afterEach in test/setup.ts handles Firestore cleanup
  // No need to reset here - DB is already clean from previous test
  
  if (initialData) {
    await seedDb(initialData);
  }

  const db = firestore();
  const service = new ServiceClass(db);

  return {
    service,
    db,
    seed: seedDb,
    // Exposed for tests that need explicit cleanup mid-test
    // Most tests should rely on the global afterEach hook instead
    reset: resetDb,
    getAllDocs: (collection: string) => db.collection(collection).get(),
    getDoc: (collection: string, id: string) => db.collection(collection).doc(id).get(),
  };
}

// ============================================================================
// HANDLER TEST PATTERN
// ============================================================================

/**
 * Pattern for testing HTTP handlers
 *
 * Usage:
 * ```typescript
 * const { req, res, send } = createHandlerTest();
 * req.user = { uid: 'user-1' };
 * req.body = { name: 'token' };
 *
 * await tokenCreateHandler(req, res);
 * expect(res.status).toHaveBeenCalledWith(201);
 * ```
 */
export function createHandlerTest() {
  const mockJson = vi.fn().mockReturnThis();
  const mockStatus = vi.fn().mockReturnThis();

  const req = {
    user: null as any,
    body: {} as any,
    params: {} as any,
    query: {} as any,
    headers: {} as any,
  };

  const res = {
    status: mockStatus,
    json: mockJson,
    send: vi.fn().mockReturnThis(),
    end: vi.fn(),
  };

  return {
    req,
    res,
    mockStatus,
    mockJson,
    expectStatus: (code: number) => expect(mockStatus).toHaveBeenCalledWith(code),
    expectJsonResponse: (data: any) => expect(mockJson).toHaveBeenCalledWith(expect.objectContaining(data)),
  };
}

// ============================================================================
// TRANSACTION TEST PATTERN
// ============================================================================

/**
 * Pattern for testing Firestore transactions
 *
 * NOTE: Firestore is automatically cleaned by the global afterEach hook in test/setup.ts.
 *
 * Usage:
 * ```typescript
 * const transaction = createTransactionTest();
 * const result = await runTransaction(async (tx) => {
 *   // ... transaction logic
 * });
 * ```
 */
export async function testTransaction<T>(callback: (db: any) => Promise<T>): Promise<T> {
  // Global afterEach in test/setup.ts handles Firestore cleanup
  const db = firestore();
  return callback(db);
}

/**
 * Pattern for testing concurrent transactions
 *
 * Usage:
 * ```typescript
 * await testConcurrentTransactions([
 *   async (tx) => { ... },
 *   async (tx) => { ... },
 * ]);
 * ```
 */
export async function testConcurrentTransactions(
  callbacks: Array<(tx: any, db: any) => Promise<void>>
): Promise<void> {
  await resetDb();
  const db = firestore();

  const promises = callbacks.map((callback) =>
    db.runTransaction((tx: any) => callback(tx, db))
  );

  await Promise.all(promises);
}

// ============================================================================
// DATA VALIDATION TEST PATTERN
// ============================================================================

/**
 * Pattern for testing data validation
 *
 * Usage:
 * ```typescript
 * await testDataValidation(
 *   { uid: 'user-1', email: 'test@example.com' },
 *   'users',
 *   validateUser
 * );
 * ```
 */
export async function testDataValidation<T>(
  data: T,
  collectionName: string,
  validator: (data: T) => boolean | Promise<boolean>
): Promise<void> {
  await resetDb();
  await seedDb({ [collectionName]: { 'test-doc': data } });

  const db = firestore();
  const snapshot = await db.collection(collectionName).doc('test-doc').get();
  const storedData = snapshot.data() as T;

  const isValid = await validator(storedData);
  if (!isValid) {
    throw new Error(`Data validation failed for ${collectionName}`);
  }
}

// ============================================================================
// EDGE CASE TEST PATTERN
// ============================================================================

/**
 * Pattern for testing edge cases
 *
 * Usage:
 * ```typescript
 * await testEdgeCase({
 *   setup: async (db) => { ... },
 *   test: async (db) => { ... },
 *   assert: (result) => { ... },
 * });
 * ```
 */
export async function testEdgeCase<T>(options: {
  setup?: (db: any) => Promise<void>;
  test: (db: any) => Promise<T>;
  assert: (result: T) => void;
  teardown?: (db: any) => Promise<void>;
}): Promise<void> {
  await resetDb();
  const db = firestore();

  try {
    if (options.setup) {
      await options.setup(db);
    }

    const result = await options.test(db);

    options.assert(result);
  } finally {
    if (options.teardown) {
      await options.teardown(db);
    }
  }
}

// ============================================================================
// PERFORMANCE TEST PATTERN
// ============================================================================

/**
 * Pattern for performance testing
 *
 * Usage:
 * ```typescript
 * const perf = await measurePerformance(async () => {
 *   // operation to measure
 * });
 * console.log(`Operation took ${perf.duration}ms`);
 * ```
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number; memoryDelta: number }> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  const result = await operation();

  const endTime = performance.now();
  const endMem = process.memoryUsage().heapUsed;

  return {
    result,
    duration: endTime - startTime,
    memoryDelta: endMem - startMem,
  };
}

/**
 * Pattern for performance benchmarking multiple operations
 */
export async function benchmarkOperations(
  operations: Array<{
    name: string;
    fn: () => Promise<void>;
  }>,
  iterations: number = 100
): Promise<void> {
  const results: Record<string, { min: number; max: number; avg: number }> = {};

  for (const { name, fn } of operations) {
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      await resetDb();
      const perf = await measurePerformance(fn);
      durations.push(perf.duration);
    }

    const sorted = durations.sort((a, b) => a - b);
    results[name] = {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
    };
  }

  console.table(results);
}

// ============================================================================
// ISOLATION TEST PATTERN
// ============================================================================

/**
 * Pattern for testing that operations don't have side effects
 *
 * Usage:
 * ```typescript
 * await testIsolation(async (db) => {
 *   const before = await db.collection('tokens').get();
 *   await service.create(...);
 *   const after = await db.collection('tokens').get();
 *   expect(after.size).toBe(before.size + 1);
 * });
 * ```
 */
export async function testIsolation(test: (db: any) => Promise<void>): Promise<void> {
  await resetDb();
  const db = firestore();
  await test(db);
  await resetDb(); // Clean up after test
}

// ============================================================================
// SNAPSHOT TESTING PATTERN
// ============================================================================

/**
 * Pattern for verifying document snapshots
 *
 * Usage:
 * ```typescript
 * const snapshot = await getSnapshot('tokens', 'token-1');
 * expect(snapshot).toMatchSnapshot();
 * ```
 */
export async function getSnapshot(collectionName: string, docId: string) {
  const db = firestore();
  const snapshot = await db.collection(collectionName).doc(docId).get();

  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
    _metadata: {
      createTime: snapshot.createTime?.toDate().toISOString(),
      updateTime: snapshot.updateTime?.toDate().toISOString(),
    },
  };
}

// ============================================================================
// BATCH OPERATION PATTERN
// ============================================================================

/**
 * Pattern for testing batch operations
 *
 * Usage:
 * ```typescript
 * const batch = createBatch();
 * batch.set('users', 'user-1', { ... });
 * batch.update('teams', 'team-1', { ... });
 * await batch.commit();
 * ```
 */
export function createBatch() {
  const db = firestore();
  const batch = db.batch();

  const batchWrapper = {
    set: (collection: string, docId: string, data: any) => {
      batch.set(db.collection(collection).doc(docId), data);
      return batchWrapper;
    },
    update: (collection: string, docId: string, data: any) => {
      batch.update(db.collection(collection).doc(docId), data);
      return batchWrapper;
    },
    delete: (collection: string, docId: string) => {
      batch.delete(db.collection(collection).doc(docId));
      return batchWrapper;
    },
    commit: () => batch.commit(),
  };

  return batchWrapper;
}

// ============================================================================
// QUERY PATTERN
// ============================================================================

/**
 * Pattern for testing complex queries
 *
 * Usage:
 * ```typescript
 * const results = await queryWithConstraints('tokens', (q) =>
 *   q.where('owner', '==', 'user-1').where('active', '==', true)
 * );
 * ```
 */
export async function queryWithConstraints<T = any>(
  collectionName: string,
  constraintFn: (query: any) => any
): Promise<Array<T & { id: string }>> {
  const db = firestore();
  let query: any = db.collection(collectionName);

  query = constraintFn(query);

  const snapshot = await query.get();

  return snapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Import for vi.fn if needed
import { vi } from 'vitest';
