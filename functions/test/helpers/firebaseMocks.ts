/**
 * Centralized Firebase mocking utilities
 * Consolidates repeated vi.mock() calls across test files
 *
 * This provides:
 * - Standard Firebase mock setup
 * - Consistent mock behavior across test suites
 * - Easy updates when Firebase APIs change
 */

import { vi } from 'vitest';
import { createFirebaseAdminMock, createFirebaseFunctionsMock } from '../mocks';

/**
 * Standard Firebase mock setup
 * Call once at the top of test files that need Firebase
 *
 * @returns Object containing all mock instances
 *
 * @example
 * ```typescript
 * import { setupFirebaseMocks } from '../helpers/firebaseMocks';
 *
 * // In your test file
 * const { adminMock, firestoreMock, functionsMock } = setupFirebaseMocks();
 * ```
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
 * Use when you only need basic admin functionality
 *
 * @returns Minimal admin mock instance
 *
 * @example
 * ```typescript
 * import { setupMinimalFirebaseMocks } from '../helpers/firebaseMocks';
 *
 * const { adminMock } = setupMinimalFirebaseMocks();
 * ```
 */
export const setupMinimalFirebaseMocks = () => {
  const { adminMock } = createFirebaseAdminMock();

  vi.mock('firebase-admin', () => ({
    default: adminMock,
  }));

  return { adminMock };
};

/**
 * Setup Firebase mocks with custom overrides
 * Useful when you need to modify standard mock behavior
 *
 * @param overrides - Custom mock implementations to merge
 * @returns Mock instances with overrides applied
 *
 * @example
 * ```typescript
 * const { firestoreMock } = setupFirebaseMocksWithOverrides({
 *   firestore: {
 *     ...createFirebaseAdminMock().firestoreMock,
 *     batch: vi.fn().mockImplementation(() => mockBatch)
 *   }
 * });
 * ```
 */
export const setupFirebaseMocksWithOverrides = (
  overrides: {
    admin?: any;
    firestore?: any;
    functions?: any;
  } = {}
) => {
  const defaultMocks = createFirebaseAdminMock();
  const functionsMock = createFirebaseFunctionsMock();

  const adminMock = overrides.admin || defaultMocks.adminMock;
  const firestoreMock = overrides.firestore || defaultMocks.firestoreMock;
  const mockFunctionsMock = overrides.functions || functionsMock;

  vi.mock('firebase-admin', () => ({
    default: adminMock,
  }));

  vi.mock('firebase-functions', () => ({
    default: mockFunctionsMock,
  }));

  vi.mock('firebase-functions/v2', () => ({
    logger: mockFunctionsMock.logger,
  }));

  vi.mock('firebase-functions/v2/https', () => ({
    HttpsError: mockFunctionsMock.https.HttpsError,
    onCall: mockFunctionsMock.https.onCall,
    onRequest: mockFunctionsMock.https.onRequest,
  }));

  vi.mock('firebase-functions/v2/scheduler', () => ({
    onSchedule: mockFunctionsMock.schedule,
  }));

  return { adminMock, firestoreMock, functionsMock: mockFunctionsMock };
};

/**
 * Get mock instances for direct use
 * Useful when mocks are already set up elsewhere
 *
 * @returns Firebase mock instances
 */
export const getFirebaseMocks = () => {
  const { adminMock, firestoreMock } = createFirebaseAdminMock();
  const functionsMock = createFirebaseFunctionsMock();

  return { adminMock, firestoreMock, functionsMock };
};

/**
 * Common mock patterns for frequent use cases
 *
 * @example
 * ```typescript
 * // Mock Firestore transaction
 * const mockTransaction = createMockTransaction();
 *
 * // Mock Auth user
 * const mockUser = createMockAuthUser();
 * ```
 */
export const createMockTransaction = () => {
  return {
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    getAll: vi.fn(),
  };
};

export const createMockAuthUser = (overrides = {}) => {
  return {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    ...overrides,
  };
};

export const createMockDocumentSnapshot = (data: any, exists = true) => {
  return {
    exists,
    id: 'mock-doc-id',
    data: () => data,
    ref: {
      id: 'mock-doc-id',
      path: 'collection/mock-doc-id',
    },
  };
};
