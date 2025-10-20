import { vi, beforeEach } from 'vitest';
import { adminMock, firestoreMock, functionsMock, loggerMock } from './mocks/firebase';

vi.mock(
  'firebase-admin',
  () => {
    const admin = {
      ...adminMock,
      firestore: vi.fn(() => firestoreMock),
      auth: vi.fn(() => ({
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-user' }),
        createCustomToken: vi.fn().mockResolvedValue('test-custom-token'),
      })),
      credential: { cert: vi.fn() },
    };
    admin.default = admin;
    return { default: admin, admin };
  },
  { virtual: true }
);

vi.mock(
  'firebase-admin/firestore',
  () => ({
    Firestore: class {},
    DocumentReference: class {},
    DocumentSnapshot: class {},
    FieldValue: firestoreMock.FieldValue,
    Timestamp: firestoreMock.Timestamp,
    default: {
      FieldValue: firestoreMock.FieldValue,
      Timestamp: firestoreMock.Timestamp,
    },
  }),
  { virtual: true }
);

vi.mock(
  'firebase-functions',
  () => ({ ...functionsMock, default: functionsMock }),
  { virtual: true }
);

vi.mock(
  'firebase-functions/v1',
  () => ({ ...functionsMock, default: functionsMock }),
  { virtual: true }
);

vi.mock(
  'firebase-functions/logger',
  () => ({ ...loggerMock, default: loggerMock }),
  { virtual: true }
);

vi.mock(
  'firebase-functions/v2',
  () => ({ logger: loggerMock, default: { logger: loggerMock } }),
  { virtual: true }
);

vi.mock(
  'firebase-functions/v2/https',
  () => {
    class HttpsError extends Error {
      code;
      details;

      constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
      }
    }

    const wrapHandler = (optionsOrHandler, maybeHandler) =>
      typeof optionsOrHandler === 'function' && !maybeHandler ? optionsOrHandler : maybeHandler;

    const normalizeContext = (ctx = {}) => ({
      auth: ctx?.auth,
      params: ctx?.params ?? {},
      headers: ctx?.headers ?? {},
      rawRequest: ctx?.rawRequest,
      acceptsStreaming: ctx?.acceptsStreaming ?? false,
    });

    const onCall = (optionsOrHandler, maybeHandler) => {
      const handler = wrapHandler(optionsOrHandler, maybeHandler);
      return async (...invocationArgs) => {
        let request;
        let context;

        if (
          invocationArgs.length === 1 &&
          invocationArgs[0] &&
          typeof invocationArgs[0] === 'object' &&
          'data' in invocationArgs[0]
        ) {
          const shapedRequest = {
            ...invocationArgs[0],
            params: invocationArgs[0].params ?? {},
            headers: invocationArgs[0].headers ?? {},
            acceptsStreaming: invocationArgs[0].acceptsStreaming ?? false,
          };
          request = shapedRequest;
          context = normalizeContext(shapedRequest);
        } else {
          const [data, ctx = {}] = invocationArgs;
          context = normalizeContext(ctx);
          request = {
            data,
            ...context,
          };
        }

        if (handler.length >= 2) {
          return handler(request.data, context);
        }

        return handler(request);
      };
    };

    const onRequest = (optionsOrHandler, maybeHandler) => {
      const handler = wrapHandler(optionsOrHandler, maybeHandler);
      return async (req, res) => handler(req, res);
    };

    return {
      onCall,
      onRequest,
      HttpsError,
      Request: class {},
      CallableRequest: class {},
    };
  },
  { virtual: true }
);

vi.mock(
  'firebase-functions/v2/scheduler',
  () => ({
    onSchedule: (optionsOrHandler, maybeHandler) => {
      const handler =
        typeof optionsOrHandler === 'function' && !maybeHandler ? optionsOrHandler : maybeHandler;
      return async (...args) => handler?.(...args);
    },
  }),
  { virtual: true }
);

vi.mock(
  '@tarkov-tracker/shared/constants/player',
  () => ({
    MAX_PLAYER_LEVEL: 79,
    ALLOWED_PMC_FACTIONS: Object.freeze(['USEC', 'BEAR']),
    OBJECTIVE_PROGRESS_STATES: Object.freeze(['completed', 'uncompleted']),
  }),
  { virtual: true }
);
vi.mock('uid-generator', () => ({
  default: class UIDGenerator {
    constructor() {}

    async generate() {
      return 'mock-uid';
    }
  },
}));
// --- Global Hooks ---
beforeEach(() => {
  // Reset all mocks provided by vitest vi.fn()
  vi.clearAllMocks();
  // --- Reset specific mock implementations/return values ---
  // Reset top-level Firestore spies to basic chainable mocks
  // This ensures tests start with a consistent baseline
  const mockDocMethods = {
    get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn(() => mockCollectionMethods), // Chain back to collection
  };
  const mockCollectionMethods = {
    doc: vi.fn(() => mockDocMethods),
    get: vi.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  firestoreMock.collection.mockImplementation(() => mockCollectionMethods);
  firestoreMock.doc.mockImplementation(() => mockDocMethods);
  // Reset transaction mock to provide basic spied methods
  firestoreMock.runTransaction.mockImplementation(async (callback) => {
    const transaction = {
      get: vi.fn().mockImplementation((docRef) => {
        if (docRef?.path?.startsWith('system/')) {
          return Promise.resolve({
            exists: true,
            data: () => ({ tokens: [] }),
          });
        }
        return Promise.resolve({ exists: false, data: () => ({}) });
      }),
      set: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    return callback(transaction);
  });
});
// Test setup complete
// --- Explicit Exports ---
export { adminMock, firestoreMock, functionsMock };
