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
import { vi, beforeEach } from 'vitest';

dotenv.config({ path: path.resolve(process.cwd(), 'functions/.env.test') });

// -------------------------------
// ESM-safe deterministic crypto mock
// -------------------------------
vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
  let uuidCounter = 0;
  let bytesCounter = 0;
  const nextBytes = (n) => {
    const b = Buffer.alloc(n);
    bytesCounter += 1;
    for (let i = 0; i < n; i++) b[i] = (bytesCounter + i) % 256;
    return b;
  };
  return {
    ...actual,
    randomBytes: vi.fn((n) => nextBytes(n)),
    randomUUID: vi.fn(() => `uuid-${++uuidCounter}`),
    // Provide createHash for AbuseGuard and any hashing usage in tests
    createHash: vi.fn((_alg) => {
      const api = {
        update: vi.fn(() => api), // chainable
        digest: vi.fn((_enc) => 'deadbeef'),
      };
      return api;
    }),
  };
});

// -------------------------------
// ESM-safe uid-generator mock
// -------------------------------
vi.mock('uid-generator', () => {
  let counter = 0;
  const UIDGenerator = class {
    constructor(length) {
      this.length = length || 128;
    }
    async generate() {
      return `test-token-${++counter}`;
    }
  };
  return {
    default: UIDGenerator
  };
});

// -------------------------------
// ESM-safe firebase-admin/firestore mock
// -------------------------------
vi.mock('firebase-admin/firestore', () => {
  return {
    Firestore: class {
      constructor() {
        // Mock implementation
      }
    },
    DocumentReference: class {
      constructor() {
        // Mock implementation
      }
    },
    FieldValue: {
      serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
      arrayUnion: vi.fn((value) => ({ __arrayUnion__: true, value })),
      increment: vi.fn((n) => ({ _increment: n })),
    },
    // Add FieldValue directly to admin mock for easier access
    ...(() => {
      const fv = {
        serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
        arrayUnion: vi.fn((value) => ({ __arrayUnion__: true, value })),
        increment: vi.fn((n) => ({ _increment: n })),
      };
      return { FieldValue: fv };
    })(),
    Timestamp: {
      now: vi.fn(() => ({ toDate: () => new Date() })),
      fromDate: vi.fn((date) => ({ toDate: () => date })),
    },
  };
});

// -------------------------------
// ESM-safe firebase-admin mock (auth + firestore)
// -------------------------------
vi.mock('firebase-admin', () => {
  const firestoreMock = {
    collection: vi.fn((name) => {
      // simple query accumulator for this collection reference
      const stateMap = () => dbState[name] || new Map();
      const query = {
        _filters: [],
        _limit: null,
        doc: vi.fn((id) => ({
          id,
          path: `${name}/${id}`,
          get: vi.fn().mockResolvedValue({
            exists: stateMap().has(id) || false,
            data: () => stateMap().get(id) || undefined,
          }),
          set: vi.fn().mockImplementation((data) => {
            if (!dbState[name]) dbState[name] = new Map();
            dbState[name].set(id, data);
            return Promise.resolve();
          }),
          update: vi.fn().mockImplementation((updates) => {
            if (!dbState[name]) dbState[name] = new Map();
            const existing = dbState[name].get(id) || {};
            dbState[name].set(id, { ...existing, ...updates });
            return Promise.resolve();
          }),
          delete: vi.fn().mockImplementation(() => {
            if (dbState[name]) dbState[name].delete(id);
            return Promise.resolve();
          }),
        })),
        add: vi.fn().mockImplementation((data) => {
          if (!dbState[name]) dbState[name] = new Map();
          const id = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          dbState[name].set(id, data);
          return Promise.resolve({ id });
        }),
        where: vi.fn((field, op, value) => {
          // Only equality supported in tests
          query._filters.push({ field, op, value });
          return query;
        }),
        orderBy: vi.fn((_field, _dir) => {
          // no-op ordering for tests
          return query;
        }),
        limit: vi.fn((n) => {
          query._limit = typeof n === 'number' ? n : null;
          return query;
        }),
        get: vi.fn().mockImplementation(() => {
          let entries = Array.from(stateMap().entries()).map(([id, data]) => ({
            id,
            data: () => data,
            exists: true,
          }));
          if (query._filters.length) {
            entries = entries.filter((doc) =>
              query._filters.every((f) => {
                if (f.op !== '==') return true; // unsupported ops ignored
                const val = doc.data()?.[f.field];
                return val === f.value;
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
          });
        }),
      };
      return query;
    }),
    doc: vi.fn((path) => {
      const [collection, id] = path.split('/');
      return {
        path,
        get: vi.fn().mockResolvedValue({
          exists: dbState[collection]?.has(id) || false,
          data: () => dbState[collection]?.get(id) || undefined,
        }),
        set: vi.fn().mockImplementation((data) => {
          if (!dbState[collection]) dbState[collection] = new Map();
          dbState[collection].set(id, data);
          return Promise.resolve();
        }),
        update: vi.fn().mockImplementation((updates) => {
          if (!dbState[collection]) dbState[collection] = new Map();
          const existing = dbState[collection].get(id) || {};
          dbState[collection].set(id, { ...existing, ...updates });
          return Promise.resolve();
        }),
        delete: vi.fn().mockImplementation(() => {
          if (dbState[collection]) dbState[collection].delete(id);
          return Promise.resolve();
        }),
      };
    }),
    runTransaction: vi.fn().mockImplementation(async (updateFunction) => {
      // Atomic staging: clone current state; only commit if updateFunction resolves.
      const stage = Object.fromEntries(
        Object.entries(dbState).map(([k, v]) => [k, new Map(v)])
      );
      const tx = {
        get: vi.fn().mockImplementation((docRef) => {
          const [collection, id] = docRef.path.split('/');
          return Promise.resolve({
            exists: stage[collection]?.has(id) || false,
            data: () => stage[collection]?.get(id) || undefined,
          });
        }),
        create: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockImplementation((docRef, updates) => {
          const [collection, id] = docRef.path.split('/');
          if (!stage[collection]) stage[collection] = new Map();
          const existing = stage[collection].get(id) || {};
          
          // Handle increment operations in updates
          const processedUpdates = {};
          for (const [key, value] of Object.entries(updates)) {
            if (value && typeof value === 'object' && value._increment !== undefined) {
              const existingValue = existing[key] || 0;
              processedUpdates[key] = existingValue + value._increment;
            } else {
              processedUpdates[key] = value;
            }
          }
          
          stage[collection].set(id, { ...existing, ...processedUpdates });
        }),
        delete: vi.fn().mockImplementation((docRef) => {
          const [collection, id] = docRef.path.split('/');
          if (stage[collection]) stage[collection].delete(id);
        }),
        set: vi.fn().mockImplementation((docRef, data, options) => {
          const [collection, id] = docRef.path.split('/');
          if (!stage[collection]) stage[collection] = new Map();
          
          // Handle merge option
          if (options?.merge) {
            const existing = stage[collection].get(id) || {};
            
            // Handle arrayUnion and increment operations in data
            const processedData = { ...existing };
            for (const [key, value] of Object.entries(data)) {
              if (value && typeof value === 'object' && value.__arrayUnion__) {
                const existingArray = existing[key] || [];
                processedData[key] = [...existingArray, value.value];
              } else if (value && typeof value === 'object' && value._increment !== undefined) {
                const existingValue = existing[key] || 0;
                processedData[key] = existingValue + value._increment;
              } else {
                processedData[key] = value;
              }
            }
            
            stage[collection].set(id, processedData);
          } else {
            // Handle arrayUnion and increment operations in data
            const processedData = {};
            for (const [key, value] of Object.entries(data)) {
              if (value && typeof value === 'object' && value.__arrayUnion__) {
                const existing = stage[collection].get(id) || {};
                const existingArray = existing[key] || [];
                processedData[key] = [...existingArray, value.value];
              } else if (value && typeof value === 'object' && value._increment !== undefined) {
                const existing = stage[collection].get(id) || {};
                const existingValue = existing[key] || 0;
                processedData[key] = existingValue + value._increment;
              } else {
                processedData[key] = value;
              }
            }
            
            stage[collection].set(id, processedData);
          }
        }),
        update: vi.fn().mockImplementation((docRef, updates) => {
          const [collection, id] = docRef.path.split('/');
          if (!stage[collection]) stage[collection] = new Map();
          const existing = stage[collection].get(id) || {};
          
          // Handle increment operations in updates
          const processedUpdates = {};
          for (const [key, value] of Object.entries(updates)) {
            if (value && typeof value === 'object' && value._increment !== undefined) {
              const existingValue = existing[key] || 0;
              processedUpdates[key] = existingValue + value._increment;
            } else {
              processedUpdates[key] = value;
            }
          }
          
          stage[collection].set(id, { ...existing, ...processedUpdates });
        }),
        delete: vi.fn().mockImplementation((docRef) => {
          const [collection, id] = docRef.path.split('/');
          if (stage[collection]) stage[collection].delete(id);
        }),
      };
      try {
        const res = await updateFunction(tx);
        // Commit: replace dbState with staged snapshot
        for (const [k, v] of Object.entries(stage)) dbState[k] = v;
        return res;
      } catch (e) {
        // Rollback: keep dbState untouched
        throw e;
      }
    }),
    batch: vi.fn(() => ({
      set: vi.fn().mockImplementation((docRef, data) => {
        const [collection, id] = docRef.path.split('/');
        if (!dbState[collection]) dbState[collection] = new Map();
        dbState[collection].set(id, data);
      }),
      update: vi.fn().mockImplementation((docRef, updates) => {
        const [collection, id] = docRef.path.split('/');
        if (!dbState[collection]) dbState[collection] = new Map();
        const existing = dbState[collection].get(id) || {};
        dbState[collection].set(id, { ...existing, ...updates });
      }),
      delete: vi.fn().mockImplementation((docRef) => {
        const [collection, id] = docRef.path.split('/');
        if (dbState[collection]) dbState[collection].delete(id);
      }),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
    FieldValue: {
      serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
      arrayUnion: vi.fn((value) => ({ __arrayUnion__: true, value })),
      increment: vi.fn((n) => ({ _increment: n })),
    },
    // Add FieldValue directly to admin mock for easier access
    ...(() => {
      const fv = {
        serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
        arrayUnion: vi.fn((value) => ({ __arrayUnion__: true, value })),
        increment: vi.fn((n) => ({ _increment: n })),
      };
      return { FieldValue: fv };
    })(),
    Timestamp: {
      now: vi.fn(() => ({ toDate: () => new Date() })),
      fromDate: vi.fn((date) => ({ toDate: () => date })),
    },
  };

  const adminMock = {
    initializeApp: vi.fn(),
    firestore: Object.assign(
      vi.fn(() => ({
        ...firestoreMock,
      })),
      {
        FieldValue: {
          serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
          arrayUnion: vi.fn((value) => ({ __arrayUnion__: true, value })),
          increment: vi.fn((n) => ({ _increment: n })),
        },
        Timestamp: {
          now: vi.fn(() => ({ toDate: () => new Date() })),
          fromDate: vi.fn((date) => ({ toDate: () => date })),
        },
      }
    ),
    auth: vi.fn(() => ({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-user' }),
      createCustomToken: vi.fn().mockResolvedValue('test-custom-token'),
      deleteUser: vi.fn().mockResolvedValue({}),
    })),
    credential: { cert: vi.fn() },
    ...firestoreMock,
  };

  return {
    default: adminMock,
    ...adminMock,
  };
});



// --- Mocks ---

// In-memory database state for emulator-style snapshots
const dbState = {
  token: new Map(), // Changed from 'tokens' to 'token' to match service usage
  users: new Map(),
  teams: new Map(),
  progress: new Map(),
  system: new Map(),
};

// Helper to reset database state between tests to avoid leakage
const resetDb = () => {
  dbState.token.clear(); // Changed from 'tokens' to 'token'
  dbState.users.clear();
  dbState.teams.clear();
  dbState.progress.clear();
  dbState.system.clear();
};

// Helper to seed database with test data
const seedDb = (data) => {
  Object.entries(data).forEach(([collection, documents]) => {
    if (!dbState[collection]) {
      dbState[collection] = new Map();
    }
    Object.entries(documents).forEach(([id, doc]) => {
      dbState[collection].set(id, doc);
    });
  });
};

// Helper to create chainable response objects
const makeRes = () => {
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
  res.status.mockImplementation((code) => {
    res.statusCode = code;
    return res;
  });
  
  res.json.mockImplementation((body) => {
    res.body = body;
    return res;
  });
  
  res.send.mockImplementation((body) => {
    res.body = body;
    return res;
  });
  
  res.set.mockImplementation((keyOrObj, value) => {
    if (typeof keyOrObj === 'string') {
      res.headers[keyOrObj] = value;
    } else {
      Object.assign(res.headers, keyOrObj);
    }
    return res;
  });
  
  return res;
};

// Firestore-like mocks with simple query support
const firestoreMock = {
  collection: vi.fn((name) => {
    // simple query accumulator for this collection reference
    const stateMap = () => dbState[name] || new Map();
    const query = {
      _filters: [],
      _limit: null,
      doc: vi.fn((id) => {
        const docRef = {
          id,
          path: `${name}/${id}`,
          get: vi.fn().mockResolvedValue({
            exists: stateMap().has(id) || false,
            data: () => stateMap().get(id) || undefined,
          }),
          set: vi.fn().mockImplementation((data) => {
            if (!dbState[name]) dbState[name] = new Map();
            dbState[name].set(id, data);
            return Promise.resolve();
          }),
          update: vi.fn().mockImplementation((updates) => {
            if (!dbState[name]) dbState[name] = new Map();
            const existing = dbState[name].get(id) || {};
            dbState[name].set(id, { ...existing, ...updates });
            return Promise.resolve();
          }),
          delete: vi.fn().mockImplementation(() => {
            if (dbState[name]) dbState[name].delete(id);
            return Promise.resolve();
          }),
        };
        
        // Allow test to override the get method
        let originalGet = docRef.get;
        docRef.get = vi.fn().mockImplementation(() => {
          return originalGet();
        });
        
        return docRef;
      }),
      add: vi.fn().mockImplementation((data) => {
        if (!dbState[name]) dbState[name] = new Map();
        const id = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        dbState[name].set(id, data);
        return Promise.resolve({ id });
      }),
      where: vi.fn((field, op, value) => {
        // Only equality supported in tests
        query._filters.push({ field, op, value });
        return query;
      }),
      orderBy: vi.fn((_field, _dir) => {
        // no-op ordering for tests
        return query;
      }),
      limit: vi.fn((n) => {
        query._limit = typeof n === 'number' ? n : null;
        return query;
      }),
      get: vi.fn().mockImplementation(() => {
        let entries = Array.from(stateMap().entries()).map(([id, data]) => ({
          id,
          data: () => data,
          exists: true,
        }));
        if (query._filters.length) {
          entries = entries.filter((doc) =>
            query._filters.every((f) => {
              if (f.op !== '==') return true; // unsupported ops ignored
              const val = doc.data()?.[f.field];
              return val === f.value;
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
        });
      }),
    };
    return query;
  }),
  doc: vi.fn((path) => {
    const [collection, id] = path.split('/');
    return {
      path,
      get: vi.fn().mockResolvedValue({
        exists: dbState[collection]?.has(id) || false,
        data: () => dbState[collection]?.get(id) || undefined,
      }),
      set: vi.fn().mockImplementation((data) => {
        if (!dbState[collection]) dbState[collection] = new Map();
        dbState[collection].set(id, data);
        return Promise.resolve();
      }),
      update: vi.fn().mockImplementation((updates) => {
        if (!dbState[collection]) dbState[collection] = new Map();
        const existing = dbState[collection].get(id) || {};
        dbState[collection].set(id, { ...existing, ...updates });
        return Promise.resolve();
      }),
      delete: vi.fn().mockImplementation(() => {
        if (dbState[collection]) dbState[collection].delete(id);
        return Promise.resolve();
      }),
    };
  }),
  runTransaction: vi.fn().mockImplementation(async (updateFunction) => {
    // Atomic staging: clone current state; only commit if updateFunction resolves.
    const stage = Object.fromEntries(
      Object.entries(dbState).map(([k, v]) => [k, new Map(v)])
    );
    const tx = {
      get: vi.fn().mockImplementation((docRef) => {
        const [collection, id] = docRef.path.split('/');
        return Promise.resolve({
          exists: stage[collection]?.has(id) || false,
          data: () => stage[collection]?.get(id) || undefined,
        });
      }),
      create: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockImplementation((docRef, data, options) => {
        const [collection, id] = docRef.path.split('/');
        if (!stage[collection]) stage[collection] = new Map();
        
        // Handle FieldValue operations in data
        const processedData = {};
        for (const [key, value] of Object.entries(data)) {
          if (value && typeof value === 'object' && value.__arrayUnion__) {
            const existing = stage[collection].get(id) || {};
            const existingArray = existing[key] || [];
            processedData[key] = [...existingArray, value.value];
          } else if (value && typeof value === 'object' && value._arrayUnion) {
            const existing = stage[collection].get(id) || {};
            const existingArray = existing[key] || [];
            processedData[key] = [...existingArray, ...value._arrayUnion];
          } else if (value && typeof value === 'object' && value._arrayRemove) {
            const existing = stage[collection].get(id) || {};
            const existingArray = existing[key] || [];
            processedData[key] = existingArray.filter(item => !value._arrayRemove.includes(item));
          } else if (value && typeof value === 'object' && value._increment !== undefined) {
            const existing = stage[collection].get(id) || {};
            const existingValue = existing[key] || 0;
            processedData[key] = existingValue + value._increment;
          } else if (value && typeof value === 'object' && value._serverTimestamp) {
            processedData[key] = { toDate: () => new Date(0) };
          } else {
            processedData[key] = value;
          }
        }
        
        // Handle merge option
        if (options?.merge) {
          const existing = stage[collection].get(id) || {};
          stage[collection].set(id, { ...existing, ...processedData });
        } else {
          stage[collection].set(id, processedData);
        }
      }),
      update: vi.fn().mockImplementation((docRef, updates) => {
        const [collection, id] = docRef.path.split('/');
        if (!stage[collection]) stage[collection] = new Map();
        const existing = stage[collection].get(id) || {};
        
        // Handle FieldValue operations in updates
        const processedUpdates = {};
        for (const [key, value] of Object.entries(updates)) {
          if (value && typeof value === 'object' && value._arrayUnion) {
            const existingArray = existing[key] || [];
            processedUpdates[key] = [...existingArray, ...value._arrayUnion];
          } else if (value && typeof value === 'object' && value._arrayRemove) {
            const existingArray = existing[key] || [];
            processedUpdates[key] = existingArray.filter(item => !value._arrayRemove.includes(item));
          } else if (value && typeof value === 'object' && value._increment) {
            const existingValue = existing[key] || 0;
            processedUpdates[key] = existingValue + value._increment;
          } else if (value && typeof value === 'object' && value._serverTimestamp) {
            processedUpdates[key] = { toDate: () => new Date(0) };
          } else {
            processedUpdates[key] = value;
          }
        }
        
        stage[collection].set(id, { ...existing, ...processedUpdates });
      }),
      delete: vi.fn().mockImplementation((docRef) => {
        const [collection, id] = docRef.path.split('/');
        if (stage[collection]) stage[collection].delete(id);
      }),
    };
    try {
      const res = await updateFunction(tx);
      // Commit: replace dbState with staged snapshot
      for (const [k, v] of Object.entries(stage)) dbState[k] = v;
      return res;
    } catch (e) {
      // Rollback: keep dbState untouched
      throw e;
    }
  }),
  batch: vi.fn(() => ({
    set: vi.fn().mockImplementation((docRef, data) => {
      const [collection, id] = docRef.path.split('/');
      if (!dbState[collection]) dbState[collection] = new Map();
      dbState[collection].set(id, data);
    }),
    update: vi.fn().mockImplementation((docRef, updates) => {
      const [collection, id] = docRef.path.split('/');
      if (!dbState[collection]) dbState[collection] = new Map();
      const existing = dbState[collection].get(id) || {};
      dbState[collection].set(id, { ...existing, ...updates });
    }),
    delete: vi.fn().mockImplementation((docRef) => {
      const [collection, id] = docRef.path.split('/');
      if (dbState[collection]) dbState[collection].delete(id);
    }),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  FieldValue: {
    // Sentinels used by codepaths; tests should treat them as markers
    // Use fixed epoch for deterministic testing
    serverTimestamp: vi.fn(() => ({ toDate: () => new Date(0) })),
    arrayRemove: vi.fn((...items) => ({ _arrayRemove: items })),
    arrayUnion: vi.fn((...items) => ({ _arrayUnion: items })),
    increment: vi.fn((n) => ({ _increment: n })),
  },
  Timestamp: {
    // Use fixed epoch for deterministic testing
    now: vi.fn(() => ({ toDate: () => new Date(0) })),
    fromDate: vi.fn((date) => ({ toDate: () => date })),
  },
};

// This is the fully-fleshed out admin mock that will be used by tests
const adminMock = {
  initializeApp: vi.fn(),
  firestore: vi.fn(() => firestoreMock),
  // Expose Timestamp directly on admin.firestore for tests
  get firestore() {
    return {
      ...firestoreMock,
      Timestamp: {
        // Use fixed epoch for deterministic testing
        now: vi.fn(() => ({ toDate: () => new Date(0) })),
        fromDate: vi.fn((date) => ({ toDate: () => date })),
      },
      FieldValue: {
        // Use fixed epoch for deterministic testing
        serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
        arrayUnion: vi.fn((...items) => ({ _arrayUnion: items })),
        arrayRemove: vi.fn((...items) => ({ _arrayRemove: items })),
      },
    };
  },
  auth: vi.fn(() => ({
    verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-user' }),
    createCustomToken: vi.fn().mockResolvedValue('test-custom-token'),
    deleteUser: vi.fn().mockResolvedValue({}),
  })),
  credential: { cert: vi.fn() },
};

// Mock Express response object
const createMockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  // Chainable methods
  res.status.mockImplementation((code) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((body) => {
    res.body = body;
    return res;
  });
  return res;
};

const loggerMock = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};


const functionsMock = {
  // Basic structure
  config: vi.fn().mockReturnValue({}),
  https: {
    onRequest: vi.fn((handler) => handler), // Return handler for testing
    onCall: vi.fn((handler) => handler),
    HttpsError: class HttpsError extends Error {
      // Keep HttpsError
      constructor(code, message) {
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
// --- Global Hooks ---
// --- Global Hooks ---
beforeEach(() => {
  // Ensure clean state per test
  resetDb();

  // Reset all mocks provided by vitest vi.fn()
  vi.clearAllMocks();
  // --- Reset specific mock implementations/return values ---
  // (your existing resets remain here)
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
  loggerMock
};
