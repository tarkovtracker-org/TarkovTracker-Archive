// Test bootstrap for Functions workspace
// Loads .env.test, wires core mocks, and exposes helpers for specs.
// Added: framework-agnostic deterministic crypto stubs for stable token generation.
// Also: ESM-safe firebase-admin auth mocks; Firestore emulator-like state with staging/rollback.
// Notes:
//  - We do NOT seed Firestore globally; tests must call seedDb explicitly.
//  - Crypto mocking uses ESM-safe vi.mock('node:crypto') and remains active for test run.
//  - UID generator is mocked to provide deterministic tokens for tests.

import path from 'node:path';
import dotenv from 'dotenv';
import { clearDataLoaderCache } from '../src/utils/dataLoaders';
import { vi, beforeEach, type Mock } from 'vitest';
import type {
  Firestore as FirestoreType,
  DocumentReference,
  Timestamp as TimestampType,
} from 'firebase-admin/firestore';

dotenv.config({ path: path.resolve(process.cwd(), 'functions/.env.test') });

// Type definitions for our mock objects
interface DatabaseState {
  token: Map<string, any>;
  users: Map<string, any>;
  teams: Map<string, any>;
  progress: Map<string, any>;
  system: Map<string, any>;
  tarkovdata: Map<string, any>;
}

interface MockResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
  status: Mock<(code: number) => MockResponse>;
  json: Mock<(data: any) => MockResponse>;
  send: Mock<(data: any) => MockResponse>;
  set: Mock<(keyOrObj: string | Record<string, string>, value?: string) => MockResponse>;
}

interface TransactionOperation {
  type: 'get' | 'create' | 'set' | 'update' | 'delete';
  collection: string;
  id: string;
  docRef: DocumentReference;
  data?: any;
  options?: any;
}

interface MockTransaction {
  get: Mock<
    (
      docRef: DocumentReference
    ) => Promise<{ exists: boolean; data: () => any; ref: DocumentReference }>
  >;
  create: Mock<(docRef: DocumentReference, data: any) => Promise<void>>;
  set: Mock<(docRef: DocumentReference, data: any, options?: any) => Promise<void>>;
  update: Mock<(docRef: DocumentReference, updates: any) => Promise<void>>;
  delete: Mock<(docRef: DocumentReference) => Promise<void>>;
}

interface MockAdminApp {
  name: string;
  options: any;
}

interface AuthInstance {
  verifyIdToken: Mock<(token: string) => Promise<{ uid: string }>>;
  createCustomToken: Mock<() => Promise<string>>;
  deleteUser: Mock<(uid: string) => Promise<void>>;
}

interface HttpsErrorConstructor {
  new (code: string, message: string): Error;
}

interface LoggerMock {
  log: Mock;
  info: Mock;
  warn: Mock;
  error: Mock;
  debug: Mock;
}

interface FunctionsMock {
  config: Mock<() => Record<string, any>>;
  https: {
    onRequest: Mock<(handler: any) => any>;
    onCall: Mock<(handler: any) => any>;
    HttpsError: HttpsErrorConstructor;
  };
  logger: LoggerMock;
  pubsub: {
    schedule: Mock<
      () => {
        timeZone: Mock<() => any>;
        onRun: Mock<(handler: any) => any>;
      }
    >;
  };
}

interface AdminMock {
  initializeApp: Mock<(config: any) => AdminMock>;
  firestore: Mock<() => typeof firestoreMock>;
  auth: Mock<() => AuthInstance>;
  app: Mock<() => AdminMock>;
  credential: { cert: Mock };
  FieldValue: typeof firestoreMock.FieldValue;
  Timestamp: typeof firestoreMock.Timestamp;
  apps: MockAdminApp[];
}

// Global error handlers to catch unhandled rejections and exceptions
// These help identify root causes of async issues during testing
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Throw the error to ensure it fails the test rather than being swallowed
  throw reason;
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Throw the error to ensure it fails the test
  throw error;
});

// ESM-safe deterministic crypto mock
vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
  let uuidCounter = 0;
  let bytesCounter = 0;
  const nextBytes = (n: number): Buffer => {
    const b = Buffer.alloc(n);
    bytesCounter += 1;
    for (let i = 0; i < n; i++) b[i] = (bytesCounter + i) % 256;
    return b;
  };
  return {
    ...actual,
    randomBytes: vi.fn((n: number) => nextBytes(n)),
    randomUUID: vi.fn(() => `uuid-${++uuidCounter}`),
    // Provide createHash for AbuseGuard and any hashing usage in tests
    createHash: vi.fn((_alg: string) => {
      const api = {
        update: vi.fn(() => api), // chainable
        digest: vi.fn((_enc: string) => 'deadbeef'),
      };
      return api;
    }),
  };
});
// ESM-safe deterministic UID generator setup
// Set consistent seed for deterministic token generation in tests
process.env.UID_GENERATOR_SEED = process.env.UID_GENERATOR_SEED || '12345';
// Mock the uid-generator package to use our custom implementation
vi.mock('uid-generator', async () => {
  // Import our custom UIDGenerator
  const { default: CustomUIDGenerator } = await import('../src/token/UIDGenerator');
  return {
    default: CustomUIDGenerator,
  };
});
// --- Mocks ---
// In-memory database state for emulator-style snapshots
const dbState: DatabaseState = {
  token: new Map(), // Changed from 'tokens' to 'token' to match service usage
  users: new Map(),
  teams: new Map(),
  progress: new Map(),
  system: new Map(),
  tarkovdata: new Map(), // Add tarkovdata collection for game data
};
// Helper to reset database state between tests to avoid leakage
const resetDb = (): void => {
  dbState.token.clear(); // Changed from 'tokens' to 'token'
  dbState.users.clear();
  dbState.teams.clear();
  dbState.progress.clear();
  dbState.system.clear();
  dbState.tarkovdata.clear(); // Clear tarkovdata collection
  collectionOverrides.clear();
};
// Helper to seed database with test data
const seedDb = (data: Record<string, Record<string, any>>): void => {
  Object.entries(data).forEach(([collection, documents]) => {
    if (!dbState[collection as keyof DatabaseState]) {
      (dbState as any)[collection] = new Map();
    }
    Object.entries(documents).forEach(([id, doc]) => {
      // Special handling for tarkovdata collection to match data loader expectations
      if (collection === 'tarkovdata') {
        // Data loaders expect documents with IDs 'tasks' and 'hideout'
        if (id === 'tasks' || id === 'hideout') {
          dbState.tarkovdata.set(id, doc);
        } else {
          // For other tarkovdata IDs, merge into a tasks or hideout document
          // This handles backward compatibility with existing test data
          const targetId = id.includes('task') ? 'tasks' : 'hideout';
          const existing = dbState.tarkovdata.get(targetId) || {};
          dbState.tarkovdata.set(targetId, { ...existing, [id]: doc });
        }
      } else {
        (dbState as any)[collection].set(id, doc);
      }
    });
  });
};
// Helper to create chainable response objects
const makeRes = (): MockResponse => {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  } as MockResponse;
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
  res.set.mockImplementation((keyOrObj: string | Record<string, string>, value?: string) => {
    if (typeof keyOrObj === 'string') {
      res.headers[keyOrObj] = value || '';
    } else {
      Object.assign(res.headers, keyOrObj);
    }
    return res;
  });
  return res;
};
// Firestore-like mocks with simple query support
const collectionOverrides = new Map<string, any>();
// Make available globally for vi.mock() factory functions
(globalThis as any).__collectionOverrides = collectionOverrides;

const ensureCollection = (name: string): Map<string, any> => {
  if (!dbState[name as keyof DatabaseState]) {
    (dbState as any)[name] = new Map();
  }
  return (dbState as any)[name];
};
const createDocRef = (collectionName: string, id: string): DocumentReference => {
  const baseGet = () =>
    Promise.resolve({
      exists: ensureCollection(collectionName).has(id),
      data: () => ensureCollection(collectionName).get(id),
    } as any);
  const docRef = {
    id,
    path: `${collectionName}/${id}`,
    get: vi.fn().mockImplementation(() => baseGet()),
    set: vi.fn().mockImplementation((data: any) => {
      ensureCollection(collectionName).set(id, data);
      return Promise.resolve();
    }),
    update: vi.fn().mockImplementation((updates: any) => {
      const existing = ensureCollection(collectionName).get(id) || {};
      const { processed } = applyFieldValueTransforms(
        { [collectionName]: new Map([[id, existing]]) },
        collectionName,
        id,
        updates
      );
      ensureCollection(collectionName).set(id, { ...existing, ...processed });
      return Promise.resolve();
    }),
    delete: vi.fn().mockImplementation(() => {
      ensureCollection(collectionName).delete(id);
      return Promise.resolve();
    }),
  } as DocumentReference;
  const originalGet = docRef.get;
  docRef.get = vi.fn().mockImplementation(() => originalGet());
  return docRef;
};
const defaultCollectionImpl = (name: string) => {
  const override = collectionOverrides.get(name);
  if (override) {
    return override;
  }
  const query = {
    _filters: Array<{ field: string; op: string; value: any }>(),
    _limit: null as number | null,
    doc: vi.fn((id: string) => createDocRef(name, id)),
    add: vi.fn().mockImplementation((data: any) => {
      const id = `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      ensureCollection(name).set(id, data);
      return Promise.resolve({ id });
    }),
    where: vi.fn((field: string, op: string, value: any) => {
      query._filters.push({ field, op, value });
      return query;
    }),
    orderBy: vi.fn(() => query),
    limit: vi.fn((n: number) => {
      query._limit = typeof n === 'number' ? n : null;
      return query;
    }),
    get: vi.fn().mockImplementation(() => {
      let entries = Array.from(ensureCollection(name).entries()).map(([id, data]) => ({
        id,
        data: () => data,
        exists: true,
        ref: createDocRef(name, id),
      }));
      if (query._filters.length) {
        entries = entries.filter((doc) =>
          query._filters.every((f) => {
            if (f.op !== '==') return true;
            return doc.data()?.[f.field] === f.value;
          })
        );
      }
      if (query._limit !== null) {
        entries = entries.slice(0, query._limit);
      }
      return Promise.resolve({
        docs: entries,
        empty: entries.length === 0,
        size: entries.length,
        forEach: (cb: (doc: any) => void) => entries.forEach((doc) => cb(doc)),
      });
    }),
  };
  return query;
};
const defaultDocImpl = (path: string) => {
  const [collection, id] = path.split('/');
  return {
    path,
    get: vi.fn().mockResolvedValue({
      exists: ensureCollection(collection).has(id),
      data: () => ensureCollection(collection).get(id),
    }),
    set: vi.fn().mockImplementation((data: any) => {
      ensureCollection(collection).set(id, data);
      return Promise.resolve();
    }),
    update: vi.fn().mockImplementation((updates: any) => {
      const existing = ensureCollection(collection).get(id) || {};
      const { processed } = applyFieldValueTransforms(
        { [collection]: new Map([[id, existing]]) },
        collection,
        id,
        updates
      );
      ensureCollection(collection).set(id, { ...existing, ...processed });
      return Promise.resolve();
    }),
    delete: vi.fn().mockImplementation(() => {
      ensureCollection(collection).delete(id);
      return Promise.resolve();
    }),
  };
};
interface FieldTransformResult {
  processed: Record<string, any>;
  existing: any;
}
const applyFieldValueTransforms = (
  stage: Record<string, Map<string, any>>,
  collectionName: string,
  id: string,
  data: Record<string, any>
): FieldTransformResult => {
  if (!stage[collectionName]) stage[collectionName] = new Map();
  const existing = stage[collectionName].get(id) || {};
  const processed: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && (value as any).__arrayUnion__) {
      const base = existing[key] || [];
      const newValues = Array.isArray((value as any).value)
        ? (value as any).value
        : [(value as any).value];
      processed[key] = [...base, ...newValues];
    } else if (value && typeof value === 'object' && (value as any)._arrayUnion) {
      const base = existing[key] || [];
      processed[key] = [...base, ...(value as any)._arrayUnion];
    } else if (value && typeof value === 'object' && (value as any)._arrayRemove) {
      const base = existing[key] || [];
      processed[key] = base.filter((item: any) => !(value as any)._arrayRemove.includes(item));
    } else if (value && typeof value === 'object' && (value as any)._increment !== undefined) {
      const current = existing[key] || 0;
      processed[key] = current + (value as any)._increment;
    } else if (value && typeof value === 'object' && (value as any)._serverTimestamp) {
      processed[key] = { toDate: () => new Date(0) };
    } else if (value && typeof value === 'object' && (value as any)._delete) {
      // FieldValue.delete() - don't include this field in the result
      // No action needed since we're building processed object incrementally
    } else {
      processed[key] = value;
    }
  }
  return { processed, existing };
};
const defaultRunTransactionImpl = async (
  updateFunction: (transaction: MockTransaction) => Promise<any>,
  maxRetries: number = 5
): Promise<any> => {
  let attempt = 0;
  while (attempt <= maxRetries) {
    // Create a snapshot of the current database state for this transaction attempt
    const stage: Record<string, Map<string, any>> = Object.fromEntries(
      Object.entries(dbState).map(([k, v]) => [k, new Map(v)])
    );
    // Track all operations performed in this transaction
    const operations: TransactionOperation[] = [];
    const tx: MockTransaction = {
      get: vi.fn().mockImplementation((docRef: DocumentReference) => {
        const [collection, id] = docRef.path.split('/');
        operations.push({ type: 'get', collection, id, docRef });
        return Promise.resolve({
          exists: stage[collection]?.has(id) || false,
          data: () => stage[collection]?.get(id) || undefined,
          ref: docRef,
        });
      }),
      create: vi.fn().mockImplementation((docRef: DocumentReference, data: any) => {
        const [collection, id] = docRef.path.split('/');
        operations.push({ type: 'create', collection, id, docRef, data });
        // Check if document already exists (Firestore constraint)
        if (stage[collection]?.has(id)) {
          throw new Error(`Document at path ${docRef.path} already exists.`);
        }
        if (!stage[collection]) stage[collection] = new Map();
        const { processed } = applyFieldValueTransforms(stage, collection, id, data);
        stage[collection].set(id, processed);
        return Promise.resolve();
      }),
      set: vi.fn().mockImplementation((docRef: DocumentReference, data: any, options?: any) => {
        const [collection, id] = docRef.path.split('/');
        operations.push({ type: 'set', collection, id, docRef, data, options });
        if (!stage[collection]) stage[collection] = new Map();
        const { processed, existing } = applyFieldValueTransforms(stage, collection, id, data);
        if (options?.merge) {
          stage[collection].set(id, { ...existing, ...processed });
        } else {
          stage[collection].set(id, processed);
        }
        return Promise.resolve();
      }),
      update: vi.fn().mockImplementation((docRef: DocumentReference, updates: any) => {
        const [collection, id] = docRef.path.split('/');
        operations.push({ type: 'update', collection, id, docRef, updates });
        // Check if document exists (Firestore constraint)
        if (!stage[collection]?.has(id)) {
          throw new Error(`Document at path ${docRef.path} does not exist.`);
        }
        if (!stage[collection]) stage[collection] = new Map();
        const { processed, existing } = applyFieldValueTransforms(stage, collection, id, updates);
        stage[collection].set(id, { ...existing, ...processed });
        return Promise.resolve();
      }),
      delete: vi.fn().mockImplementation((docRef: DocumentReference) => {
        const [collection, id] = docRef.path.split('/');
        operations.push({ type: 'delete', collection, id, docRef });
        if (stage[collection]) stage[collection].delete(id);
        return Promise.resolve();
      }),
    };
    try {
      const result = await updateFunction(tx);
      // Simulate transaction commit - check for conflicts
      // In a real scenario, this would check if any documents were modified
      // between transaction start and commit. For our mock, we'll simulate
      // a conflict on a configurable retry attempt to test retry logic.
      const shouldSimulateConflict = attempt < 2 && Math.random() < 0.1; // 10% chance of conflict on first 2 attempts
      if (shouldSimulateConflict) {
        throw new Error('Resource busy. Retry transaction.');
      }
      // Commit successful - apply all changes to the main database state
      for (const [k, v] of Object.entries(stage)) {
        (dbState as any)[k] = v;
      }
      return result;
    } catch (e) {
      attempt++;
      // Check if this is a retryable error
      const isRetryable =
        (e as Error).message.includes('Resource busy') ||
        (e as Error).message.includes('Aborted') ||
        (e as Error).message.includes('Deadline exceeded');
      if (attempt > maxRetries || !isRetryable) {
        // Transaction failed - rollback (no changes applied to dbState)
        throw e;
      }
      // Retry the transaction
      // In a real implementation, there would be a small delay here
      // with exponential backoff, but for tests we'll retry immediately
    }
  }
  throw new Error('Transaction failed after maximum retries.');
};
const defaultBatchFactory = () => ({
  set: vi.fn().mockImplementation((docRef: DocumentReference, data: any) => {
    const [collection, id] = docRef.path.split('/');
    ensureCollection(collection).set(id, data);
  }),
  update: vi.fn().mockImplementation((docRef: DocumentReference, updates: any) => {
    const [collection, id] = docRef.path.split('/');
    const existing = ensureCollection(collection).get(id) || {};
    const { processed } = applyFieldValueTransforms(
      { [collection]: new Map([[id, existing]]) },
      collection,
      id,
      updates
    );
    ensureCollection(collection).set(id, { ...existing, ...processed });
  }),
  delete: vi.fn().mockImplementation((docRef: DocumentReference) => {
    const [collection, id] = docRef.path.split('/');
    ensureCollection(collection).delete(id);
  }),
  commit: vi.fn().mockResolvedValue(undefined),
});
const serverTimestampImpl = () => ({ _serverTimestamp: true, toDate: () => new Date(0) });
const arrayRemoveImpl = (...items: any[]) => ({ _arrayRemove: items });
const arrayUnionImpl = (...items: any[]) => ({
  __arrayUnion__: true,
  value: items.length === 1 ? items[0] : items,
  _arrayUnion: items,
});
const incrementImpl = (n: number) => ({ _increment: n });
const deleteImpl = () => ({ _delete: true });
const timestampNowImpl = () => ({ toDate: () => new Date(0) });
const timestampFromDateImpl = (date: Date) => ({ toDate: () => date });
const firestoreMock = {
  collection: vi.fn(defaultCollectionImpl),
  doc: vi.fn(defaultDocImpl),
  runTransaction: vi.fn(defaultRunTransactionImpl),
  batch: vi.fn(defaultBatchFactory),
  FieldValue: {
    serverTimestamp: vi.fn(serverTimestampImpl),
    arrayRemove: vi.fn(arrayRemoveImpl),
    arrayUnion: vi.fn(arrayUnionImpl),
    increment: vi.fn(incrementImpl),
    delete: vi.fn(deleteImpl),
  },
  Timestamp: {
    now: vi.fn(timestampNowImpl),
    fromDate: vi.fn(timestampFromDateImpl),
  },
};
const restoreFirestoreImplementations = (): void => {
  firestoreMock.collection.mockImplementation(defaultCollectionImpl);
  firestoreMock.doc.mockImplementation(defaultDocImpl);
  firestoreMock.runTransaction.mockImplementation((updateFunction) =>
    defaultRunTransactionImpl(updateFunction)
  );
  firestoreMock.batch.mockImplementation(defaultBatchFactory);
  firestoreMock.FieldValue.serverTimestamp.mockImplementation(serverTimestampImpl);
  firestoreMock.FieldValue.arrayRemove.mockImplementation(arrayRemoveImpl);
  firestoreMock.FieldValue.arrayUnion.mockImplementation(arrayUnionImpl);
  firestoreMock.FieldValue.increment.mockImplementation(incrementImpl);
  firestoreMock.FieldValue.delete.mockImplementation(deleteImpl);
  firestoreMock.Timestamp.now.mockImplementation(timestampNowImpl);
  firestoreMock.Timestamp.fromDate.mockImplementation(timestampFromDateImpl);
};
// Expose a stable admin mock that reuses the shared firestore mock
const defaultFirestoreFactoryImpl = () => firestoreMock;
const firestoreFactory = vi.fn(defaultFirestoreFactoryImpl);
Object.assign(firestoreFactory, {
  FieldValue: firestoreMock.FieldValue,
  Timestamp: firestoreMock.Timestamp,
});
const createAuthInstance = (): AuthInstance => ({
  verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-user' }),
  createCustomToken: vi.fn().mockResolvedValue('test-custom-token'),
  deleteUser: vi.fn().mockResolvedValue({}),
});
let authInstance = createAuthInstance();
const defaultAuthImpl = () => authInstance;
const adminMock: AdminMock = {
  initializeApp: vi.fn().mockImplementation((config) => {
    // Track initialized apps
    adminMock.apps.push({
      name: config.name || '[DEFAULT]',
      options: config,
    });
    return adminMock;
  }),
  firestore: firestoreFactory,
  auth: vi.fn(defaultAuthImpl),
  app: vi.fn(() => adminMock), // Returns the admin instance (self-reference)
  credential: { cert: vi.fn() },
  FieldValue: firestoreMock.FieldValue,
  Timestamp: firestoreMock.Timestamp,
  apps: [], // Add apps array to track initialized apps
};
// Make available globally for vi.mock() factory functions
(globalThis as any).__adminMock = adminMock;

const restoreAdminImplementations = (): void => {
  firestoreFactory.mockImplementation(defaultFirestoreFactoryImpl);
  authInstance = createAuthInstance();
  adminMock.auth.mockImplementation(defaultAuthImpl);
};

// Mock Express response object
const createMockResponse = (): MockResponse => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as MockResponse;

  // Chainable methods
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((body: any) => {
    res.body = body;
    return res;
  });

  return res;
};

const loggerMock: LoggerMock = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

const functionsMock: FunctionsMock = {
  // Basic structure
  config: vi.fn().mockReturnValue({}),
  https: {
    onRequest: vi.fn((handler) => handler), // Return handler for testing
    onCall: vi.fn((handler) => handler),
    HttpsError: class HttpsError extends Error {
      // Keep HttpsError
      constructor(code: string, message: string) {
        super(message);
        this.code = code;
      }
    },
  },
  logger: loggerMock,
  pubsub: {
    // Keep basic pubsub structure
    schedule: vi.fn(() => ({
      // Return an object with chainable methods
      timeZone: vi.fn().mockReturnThis(),
      onRun: vi.fn((handler) => handler), // Return handler
    })),
  },
};

// firebase-admin mocks
// NOTE: These vi.mock() calls are hoisted to the top of the file
// We must inline the mock definitions here without referencing variables defined later
// to avoid "Cannot access before initialization" errors

vi.mock('firebase-admin/firestore', () => {
  // Create FieldValue mock inline
  const FieldValueMock = {
    serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
    arrayRemove: vi.fn((...items: any[]) => ({ _arrayRemove: items })),
    arrayUnion: vi.fn((...items: any[]) => ({ _arrayUnion: items })),
    increment: vi.fn((n: number) => ({ _increment: n })),
    delete: vi.fn(() => ({ _delete: true })),
  };

  // Create Timestamp mock inline
  const TimestampMock = {
    now: vi.fn(() => ({ toDate: () => new Date(0) })),
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
  };

  return {
    Firestore: class {},
    DocumentReference: class {},
    FieldValue: FieldValueMock,
    Timestamp: TimestampMock,
    // Export empty Map for collectionOverrides - will be populated by actual collectionOverrides
    get collectionOverrides() {
      // Lazy getter that accesses the real collectionOverrides after initialization
      return globalThis.__collectionOverrides || new Map();
    },
  };
});

vi.mock('firebase-admin', () => {
  // Getter functions to lazily access the real adminMock after initialization
  const getMock = () => (globalThis as any).__adminMock;

  return {
    // default export
    get default() {
      return getMock();
    },
    // Named exports that forward to the real mock
    get initializeApp() {
      return getMock()?.initializeApp;
    },
    get firestore() {
      return getMock()?.firestore;
    },
    get auth() {
      return getMock()?.auth;
    },
    get app() {
      return getMock()?.app;
    },
    get credential() {
      return getMock()?.credential;
    },
    get FieldValue() {
      return getMock()?.FieldValue;
    },
    get Timestamp() {
      return getMock()?.Timestamp;
    },
    get apps() {
      return getMock()?.apps || [];
    },
  };
});

// --- Global Hooks ---
beforeEach(() => {
  restoreFirestoreImplementations();
  restoreAdminImplementations();
  resetDb();
  vi.clearAllMocks();
  clearDataLoaderCache();

  // Seed essential tarkovdata for tests that use real data loaders
  seedDb({
    tarkovdata: {
      tasks: {
        'task-alpha': { id: 'task-alpha', name: 'Task Alpha' },
        'task-beta': { id: 'task-beta', name: 'Task Beta' },
        'task-test': { id: 'task-test', name: 'Test Task' },
      },
      hideout: {
        'module-alpha': { id: 'module-alpha', name: 'Module Alpha' },
        'module-beta': { id: 'module-beta', name: 'Module Beta' },
      },
    },
  });

  // Reset UID generator seed for test isolation
  // This ensures each test starts with the same deterministic state
  if (process.env.UID_GENERATOR_SEED) {
    // Reset the seed to ensure consistent test behavior
    const seed = parseInt(process.env.UID_GENERATOR_SEED, 10);
    // The UIDGenerator will pick up this seed when instantiated
  }
});

// No afterEach restore required; crypto is module-mocked for test run
// Test setup complete

// --- Explicit Exports ---
// Export all necessary helpers and mocks for tests
export {
  adminMock,
  firestoreMock,
  functionsMock,
  seedDb,
  makeRes,
  resetDb,
  createMockResponse,
  loggerMock,
  collectionOverrides,
  type DatabaseState,
  type MockResponse,
  type MockTransaction,
  type AdminMock,
  type FunctionsMock,
  type LoggerMock,
};
