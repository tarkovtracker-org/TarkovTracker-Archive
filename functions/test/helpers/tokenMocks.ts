import { vi } from 'vitest';
import { firestoreMock, collectionOverrides } from '../setup.js';
import type { TokenCollection } from '../setup.js';

/**
 * Helper to create token collection mocks with override capabilities
 * Returns a restore function to clean up the mock after the test
 */
export const withTokenCollectionMock = (mutate: (collection: TokenCollection) => void) => {
  const originalImpl = firestoreMock.collection.getMockImplementation() as (
    name: string
  ) => TokenCollection;

  if (!originalImpl) {
    throw new Error('Firestore collection mock implementation is missing');
  }

  const collectionMock = originalImpl('token');
  mutate(collectionMock);

  collectionOverrides.set('token', collectionMock);

  return {
    collectionMock,
    restore: () => {
      collectionOverrides.delete('token');
    },
  };
};

/**
 * Factory to create a mock token with default values
 */
export const createMockToken = (overrides = {}) => ({
  owner: 'test-user',
  note: 'Test token',
  permissions: ['GP'],
  gameMode: 'pvp',
  calls: 0,
  createdAt: { toDate: () => new Date() },
  ...overrides,
});

/**
 * Factory to create mock transaction for Firestore operations
 */
export const createMockTransaction = (overrides = {}) => {
  const defaultTransaction = {
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
  };

  return { ...defaultTransaction, ...overrides };
};

/**
 * Helper to setup deterministic Firestore transaction mock
 */
export const withTransactionMock = (callback: (transaction: any) => void) => {
  firestoreMock.runTransaction.mockImplementation(async (updateFunction) => {
    const mockTransaction = createMockTransaction();
    callback(mockTransaction);
    return updateFunction(mockTransaction);
  });
};
