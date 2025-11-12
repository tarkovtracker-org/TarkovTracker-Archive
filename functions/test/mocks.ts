// Common mocks for tests
import { vi, type Mock } from 'vitest';

interface DocumentSnapshotMock {
  exists: boolean;
  data: () => any;
  id: string;
  ref: {
    id: string;
    collection: Mock<(name: string) => CollectionRefMock>;
    update: Mock<() => Promise<any>>;
    delete: Mock<() => Promise<any>>;
  };
}

interface CollectionRefMock {
  doc: Mock<(id: string) => DocRefMock>;
  where: Mock<() => CollectionRefMock>;
  orderBy: Mock<() => CollectionRefMock>;
  limit: Mock<() => CollectionRefMock>;
  get: Mock<() => Promise<{
    docs: DocumentSnapshotMock[];
    empty: boolean;
    size: number;
  }>>;
}

interface DocRefMock {
  get: Mock<() => Promise<DocumentSnapshotMock>>;
  set: Mock<(data: any) => Promise<any>>;
  update: Mock<(data: any) => Promise<any>>;
  delete: Mock<() => Promise<any>>;
  collection: Mock<(name: string) => CollectionRefMock>;
}

interface TransactionMock {
  get: Mock<() => Promise<DocumentSnapshotMock>>;
  set: Mock<(data: any) => Promise<any>>;
  update: Mock<(data: any) => Promise<any>>;
  delete: Mock<() => Promise<any>>;
}

interface FirestoreMock {
  collection: Mock<(name: string) => CollectionRefMock>;
  doc: Mock<(path: string) => DocRefMock>;
  where: Mock<() => FirestoreMock>;
  orderBy: Mock<() => FirestoreMock>;
  limit: Mock<() => FirestoreMock>;
  batch: Mock<() => BatchMock>;
  get: Mock<() => Promise<DocumentSnapshotMock>>;
  set: Mock<(data: any) => Promise<any>>;
  add: Mock<() => Promise<{ id: string }>>;
  update: Mock<(data: any) => Promise<any>>;
  delete: Mock<() => Promise<any>>;
  runTransaction: Mock<(callback: (tx: TransactionMock) => Promise<any>) => Promise<any>>;
}

interface BatchMock {
  set: Mock<(data: any) => Promise<any>>;
  update: Mock<(data: any) => Promise<any>>;
  delete: Mock<() => Promise<any>>;
  commit: Mock<() => Promise<any>>;
}

interface AdminMock {
  initializeApp: Mock;
  firestore: Mock<() => FirestoreMock>;
  auth: Mock<() => {
    verifyIdToken: Mock<(token: string) => Promise<{ uid: string }>>;
    createCustomToken: Mock<() => Promise<string>>;
  }>;
}

interface FunctionsMock {
  config: Mock<() => Record<string, any>>;
  https: {
    HttpsError: new (code: string, message?: string) => Error;
    onCall: Mock;
    onRequest: Mock;
  };
  handler: {
    https: {
      onRequest: Mock<(handler: any) => any>;
    };
  };
  schedule: Mock;
  logger: {
    log: Mock;
    info: Mock;
    error: Mock;
    warn: Mock;
    debug: Mock;
  };
}

// Create transaction mock that properly resolves promises
export const createTransactionMock = (): TransactionMock => ({
  get: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      exists: false,
      data: () => ({}),
    });
  }),
  set: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
});

// Create a firestore mock with chainable methods
export const createFirestoreMock = (): { firestoreMock: FirestoreMock; transactionMock: TransactionMock } => {
  // Create a document snapshot mock
  const createDocumentSnapshotMock = (data: any = {}, exists: boolean = true): DocumentSnapshotMock => ({
    exists,
    data: () => data,
    id: 'mock-doc-id',
    ref: {
      id: 'mock-doc-id',
      collection: vi.fn().mockImplementation((name: string) => createCollectionRefMock(name)),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
  });

  // Create a batch mock factory
  const createBatchMock = (): BatchMock => ({
    set: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    commit: vi.fn().mockResolvedValue({}),
  });

  // Create a base mock object
  const firestoreMock: FirestoreMock = {
    collection: vi.fn(),
    doc: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    batch: vi.fn().mockImplementation(createBatchMock),
    get: vi.fn().mockResolvedValue(createDocumentSnapshotMock()),
    set: vi.fn().mockResolvedValue({}),
    add: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    runTransaction: vi.fn(),
  };

  // Create a document reference mock that tracks its own calls
  const createDocRefMock = (_path: string): DocRefMock => {
    const docRef: DocRefMock = {
      get: vi.fn().mockImplementation(() => {
        firestoreMock.get();
        return Promise.resolve(createDocumentSnapshotMock());
      }),
      set: vi.fn().mockImplementation((data: any) => {
        firestoreMock.set(data);
        return Promise.resolve({});
      }),
      update: vi.fn().mockImplementation((data: any) => {
        firestoreMock.update(data);
        return Promise.resolve({});
      }),
      delete: vi.fn().mockImplementation(() => {
        firestoreMock.delete();
        return Promise.resolve({});
      }),
      collection: vi.fn().mockImplementation((name: string) => {
        firestoreMock.collection(name);
        return createCollectionRefMock(name);
      }),
    };
    return docRef;
  };

  // Create a collection reference mock that tracks its own calls
  const createCollectionRefMock = (name: string): CollectionRefMock => {
    const collectionRef: CollectionRefMock = {
      doc: vi.fn().mockImplementation((id: string) => {
        firestoreMock.doc(`${name}/${id}`);
        return createDocRefMock(`${name}/${id}`);
      }),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockImplementation(() => {
        firestoreMock.get();
        return Promise.resolve({
          docs: [createDocumentSnapshotMock()],
          empty: false,
          size: 1,
        });
      }),
    };
    return collectionRef;
  };

  // Set up the main collection method to return the collection reference
  firestoreMock.collection.mockImplementation((name: string) => {
    return createCollectionRefMock(name);
  });

  // Set up the main doc method to return the document reference
  firestoreMock.doc.mockImplementation((path: string) => {
    return createDocRefMock(path);
  });

  // Set up transaction mock
  const transactionMock = createTransactionMock();
  firestoreMock.runTransaction.mockImplementation(async (callback) => {
    return callback(transactionMock);
  });

  return { firestoreMock, transactionMock };
};

// Mock for firebase-admin
export const createFirebaseAdminMock = (): { adminMock: AdminMock; firestoreMock: FirestoreMock; transactionMock: TransactionMock } => {
  // Create the firestore mock
  const { firestoreMock, transactionMock } = createFirestoreMock();

  // Create the firestore function that returns the firestoreMock
  const firestoreFunction = vi.fn().mockReturnValue(firestoreMock);

  // Add static properties
  firestoreFunction.FieldValue = {
    serverTimestamp: vi.fn().mockReturnValue('serverTimestamp'),
    arrayUnion: vi.fn((item: any) => `arrayUnion(${item})`),
    arrayRemove: vi.fn((item: any) => `arrayRemove(${item})`),
    delete: vi.fn().mockReturnValue('delete()'),
    increment: vi.fn((value: number) => `increment(${value})`),
  };

  firestoreFunction.Timestamp = {
    now: vi.fn().mockReturnValue('now'),
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
  };

  // Create the admin mock with all required properties
  const adminMock: AdminMock = {
    initializeApp: vi.fn(),
    firestore: firestoreFunction,
    auth: vi.fn().mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-user' }),
      createCustomToken: vi.fn().mockResolvedValue('test-custom-token'),
    }),
  };

  return { adminMock, firestoreMock, transactionMock };
};

// Mock for firebase-functions
export const createFirebaseFunctionsMock = (): FunctionsMock => {
  const wrapHttpsHandler = (optionsOrHandler: any, maybeHandler?: any) => {
    if (typeof optionsOrHandler === 'function') {
      return optionsOrHandler;
    }
    return typeof maybeHandler === 'function' ? maybeHandler : vi.fn();
  };

  const httpsMock = {
    HttpsError: class HttpsError extends Error {
      code: string;
      constructor(code: string, message?: string) {
        super(message || 'Error during test');
        this.code = code;
      }
    },
    onCall: vi.fn((optionsOrHandler: any, maybeHandler?: any) =>
      wrapHttpsHandler(optionsOrHandler, maybeHandler)
    ),
    onRequest: vi.fn((optionsOrHandler: any, maybeHandler?: any) =>
      wrapHttpsHandler(optionsOrHandler, maybeHandler)
    ),
  };

  const scheduleMock = vi.fn((optionsOrHandler: any, maybeHandler?: any) =>
    wrapHttpsHandler(optionsOrHandler, maybeHandler)
  );

  return {
    config: vi.fn().mockReturnValue({}),
    https: httpsMock,
    handler: {
      https: {
        onRequest: vi.fn((handler: any) => handler),
      },
    },
    schedule: scheduleMock,
    logger: {
      log: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  };
};