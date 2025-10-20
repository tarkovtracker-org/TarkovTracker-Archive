import { vi, beforeEach } from 'vitest';
import { adminMock, firestoreMock, functionsMock, loggerMock } from './mocks/firebase';
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
