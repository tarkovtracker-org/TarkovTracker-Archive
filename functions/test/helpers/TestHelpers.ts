/**
 * Reusable test helpers to eliminate code duplication and ensure consistency
 * Provides common patterns used across multiple test files
 */

import { vi, expect } from 'vitest';
import {
  createMockResponse as sharedCreateMockResponse,
  createMockRequest as sharedCreateMockRequest,
} from './httpMocks';
import { seedDb, resetDb } from './emulatorSetup';
import { MOCK_USERS, MOCK_TEAMS, MOCK_TASKS } from '../mocks/MockConstants';

export class ServiceTestHelpers {
  /**
   * Standard setup for service tests with database seeding
   *
   * NOTE: This method is deprecated - tests should use createTestSuite() instead.
   * The global afterEach hook in test/setup.ts handles Firestore cleanup automatically.
   *
   * @deprecated Use createTestSuite() for new tests
   */
  static async setupServiceTest(additionalData = {}) {
    const defaultState = {
      users: MOCK_USERS,
      teams: MOCK_TEAMS,
      tarkovdata: {
        tasks: MOCK_TASKS,
      },
      ...additionalData,
    };
    // Global afterEach in test/setup.ts handles Firestore cleanup
    // No manual resetDb needed here
    await seedDb(defaultState as any);
    vi.resetAllMocks();
    return defaultState;
  }

  /**
   * Asynchronous setup for service tests with database seeding
   */
  static async setupServiceTestAsync(additionalData = {}) {
    return this.setupServiceTest(additionalData);
  }

  /**
   * Creates a mock Firestore document reference
   */
  static createMockDocRef(path: string, id: string, methods = {}) {
    return {
      path,
      id,
      get: vi.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
      set: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      ...methods,
    };
  }

  /**
   * Creates a mock HTTP response object
   */
  static createMockResponse() {
    return sharedCreateMockResponse();
  }

  /**
   * Creates a mock request object with user context
   */
  static createMockRequest(userId = MOCK_USERS.USER_1.id, overrides = {}) {
    return sharedCreateMockRequest({
      headers: {},
      body: {},
      query: {},
      user: { uid: userId },
      ...overrides,
    } as any);
  }

  /**
   * Standard error assertion helper
   */
  static expectError(error: Error, expectedStatus: number, expectedMessage?: string) {
    expect(error).toBeDefined();
    expect((error as any).statusCode).toBe(expectedStatus);
    if (expectedMessage) {
      expect((error as any).message).toContain(expectedMessage);
    }
  }

  /**
   * Async error assertion helper
   */
  static async expectAsyncError(
    asyncFn: () => Promise<any>,
    expectedStatus: number,
    expectedMessage?: string
  ) {
    try {
      await asyncFn();
      expect.fail('Expected function to throw an error');
    } catch (error) {
      this.expectError(error as Error, expectedStatus, expectedMessage);
    }
  }

  /**
   * Creates standard test data with overrides
   */
  static createTestData(type: 'user' | 'team' | 'task', overrides = {}) {
    const baseData = {
      user: MOCK_USERS.USER_1,
      team: MOCK_TEAMS.TEAM_1,
      task: MOCK_TASKS.TASK_ALPHA,
    };

    return { ...baseData[type], ...overrides };
  }

  /**
   * Validates that a mock was called with specific pattern
   */
  static expectMockCall(mock: any, expectedArgs: any[], callIndex = 0) {
    expect(mock).toHaveBeenCalled();
    const actualArgs = mock.mock.calls[callIndex];
    expect(actualArgs).toEqual(expectedArgs);
  }
}

export class DatabaseTestHelpers {
  /**
   * Verifies database state matches expected structure
   * Note: Direct database state verification is not recommended in production tests
   * Use service layer assertions instead
   */
  static verifyDatabaseState(expectedState: any) {
    // This method is deprecated - use service layer assertions instead
    console.warn('DatabaseTestHelpers.verifyDatabaseState is deprecated', { expectedState });
  }

  /**
   * Verifies document was created with expected data
   * Note: Use service assertions instead of direct database access
   */
  static verifyDocumentCreated(collection: string, id: string, expectedData: any) {
    // This method is deprecated - use service layer assertions instead
    console.warn('DatabaseTestHelpers.verifyDocumentCreated is deprecated', {
      collection,
      id,
      expectedData,
    });
  }

  /**
   * Verifies document was deleted
   * Note: Use service assertions instead of direct database access
   */
  static verifyDocumentDeleted(collection: string, id: string) {
    // This method is deprecated - use service layer assertions instead
    console.warn('DatabaseTestHelpers.verifyDocumentDeleted is deprecated', { collection, id });
  }
}
