/**
 * Centralized test utilities index
 * Provides convenient re-exports of all test helpers
 *
 * @example
 * ```typescript
 * // Import everything you need from one place
 * import {
 *   createTestSuite,
 *   createMockResponse,
 *   createAuthenticatedRequest,
 *   expectApiSuccess,
 *   expectValidToken
 * } from './helpers/index';
 * ```
 */

// HTTP Mocking Utilities
export {
  createMockResponse,
  createMockRequest,
  createAuthenticatedRequest,
  createMockResponseReturnThis,
  createMockReqRes,
  type MockRequest,
  type MockResponse,
} from './httpMocks';

// Database Test Utilities
export {
  createTestSuite,
  createTestSuiteWithHooks,
  quickSetup,
  withTestIsolation,
  TestSuiteContext,
} from './dbTestUtils';

// Assertion Helpers
export {
  expectApiSuccess,
  expectApiError,
  expectValidToken,
  expectTokenStructure,
  expectDocumentExists,
  expectDocumentNotExists,
  expectMockCalledWith,
  expectMockCalledWithMatching,
  expectPerformance,
  expectArrayContainsMatching,
  expectProgressStructure,
  expectTeamStructure,
  expectUserStructure,
  expectInRange,
  expectRecentTimestamp,
  expectSameKeys,
  expectErrorWithStatus,
} from './assertionHelpers';

// Re-export from setup for convenience
export { seedDb, resetDb, firestoreMock } from '../setup';
