// Firebase mocks for testing
import { vi, type Mock } from 'vitest';

interface DocumentSnapshot {
  exists: boolean;
  data: Mock<() => any>;
}

interface TransactionMock {
  get: Mock<() => Promise<DocumentSnapshot>>;
  set: Mock<() => Promise<any>>;
  update: Mock<() => Promise<any>>;
  delete: Mock<() => Promise<any>>;
}

interface FirestoreMock {
  collection: Mock<() => FirestoreMock>;
  doc: Mock<() => FirestoreMock>;
  where: Mock<() => FirestoreMock>;
  orderBy: Mock<() => FirestoreMock>;
  limit: Mock<() => FirestoreMock>;
  get: Mock<() => Promise<DocumentSnapshot>>;
  runTransaction: Mock<(callback: (tx: TransactionMock) => Promise<any>) => Promise<any>>;
  set: Mock<() => Promise<any>>;
  update: Mock<() => Promise<any>>;
  delete: Mock<() => Promise<any>>;
}

interface AdminMock {
  initializeApp: Mock;
  firestore: Mock<() => FirestoreMock>;
  auth: Mock<() => {
    verifyIdToken: Mock<() => Promise<{ uid: string }>>;
    createCustomToken: Mock<() => Promise<string>>;
  }>;
}

interface FunctionsMock {
  https: {
    HttpsError: Mock<(code: string, message: string) => Error>;
    onCall: Mock<(fn: any) => any>;
    onRequest: Mock<(fn: any) => any>;
  };
  handler: {
    https: {
      onRequest: Mock<(fn: any) => any>;
    };
  };
  logger: {
    log: Mock;
    error: Mock;
    warn: Mock;
    info: Mock;
    debug: Mock;
  };
}

// Create a transaction mock
export const createTransactionMock = (): TransactionMock => ({
  get: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      exists: false,
      data: vi.fn().mockReturnValue({ tokens: [] }),
    });
  }),
  set: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
});

// Create a chainable firestore mock
export const createFirestoreMock = (): { firestoreMock: FirestoreMock; transactionMock: TransactionMock } => {
  // Create a base mock object that returns itself for chaining
  const mock = {} as FirestoreMock;

  // Define chainable methods
  mock.collection = vi.fn().mockReturnValue(mock);
  mock.doc = vi.fn().mockReturnValue(mock);
  mock.where = vi.fn().mockReturnValue(mock);
  mock.orderBy = vi.fn().mockReturnValue(mock);
  mock.limit = vi.fn().mockReturnValue(mock);

  // Define non-chainable methods
  mock.get = vi.fn().mockResolvedValue({
    exists: false,
    data: vi.fn().mockReturnValue({}),
  });

  // Add transaction support
  const transactionMock = createTransactionMock();
  mock.runTransaction = vi.fn().mockImplementation(async (callback) => {
    return callback(transactionMock);
  });

  // Add other methods
  mock.set = vi.fn().mockResolvedValue({});
  mock.update = vi.fn().mockResolvedValue({});
  mock.delete = vi.fn().mockResolvedValue({});

  return {
    firestoreMock: mock,
    transactionMock,
  };
};

// Create Firebase Admin mock
export const createFirebaseAdminMock = (): { adminMock: AdminMock; firestoreMock: FirestoreMock; transactionMock: TransactionMock } => {
  const { firestoreMock, transactionMock } = createFirestoreMock();

  // Create the Firebase admin mock with firestore as a function
  const firestoreFunction = vi.fn().mockReturnValue(firestoreMock);

  // Add FieldValue and Timestamp as properties to the function
  firestoreFunction.FieldValue = {
    serverTimestamp: vi.fn().mockReturnValue('server-timestamp'),
    arrayUnion: vi.fn((item: any) => `array-union-${item}`),
    arrayRemove: vi.fn((item: any) => `array-remove-${item}`),
  };

  firestoreFunction.Timestamp = {
    now: vi.fn().mockReturnValue('timestamp-now'),
  };

  const adminMock: AdminMock = {
    initializeApp: vi.fn(),
    firestore: firestoreFunction,
    auth: vi.fn().mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-user' }),
      createCustomToken: vi.fn().mockResolvedValue('custom-token'),
    }),
  };

  return { adminMock, firestoreMock, transactionMock };
};

// Create Firebase Functions mock
export const createFirebaseFunctionsMock = (): FunctionsMock => {
  return {
    https: {
      HttpsError: vi.fn((code: string, message: string) => {
        const error = new Error(message);
        (error as any).code = code;
        return error;
      }),
      onCall: vi.fn((fn: any) => fn),
      onRequest: vi.fn((fn: any) => fn),
    },
    handler: {
      https: {
        onRequest: vi.fn((fn: any) => fn),
      },
    },
    logger: {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  };
};