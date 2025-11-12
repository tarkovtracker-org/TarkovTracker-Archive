/**
 * Centralized mock management to avoid vi.mock hoisting issues
 * Provides consistent mock patterns across all test files
 */

import { vi } from 'vitest';

export class MockManager {
  
  /**
   * Standard data loaders mock that avoids hoisting issues
   */
  static getDataLoadersMock() {
    return {
      getHideoutData: vi.fn().mockResolvedValue({ hideoutStations: [] }),
      getTaskData: vi.fn().mockResolvedValue({
        tasks: [
          { id: 'task-alpha', name: 'Task Alpha' },
          { id: 'task-beta', name: 'Task Beta' }
        ]
      }),
    };
  }

  /**
   * Standard progress utils mock
   */
  static getProgressUtilsMock() {
    return {
      formatProgress: vi.fn(),
      updateTaskState: vi.fn().mockResolvedValue(undefined),
    };
  }

  /**
   * Factory mock that properly handles test environment
   */
  static getFactoryMock() {
    return {
      createLazy: vi.fn((init) => () => init()),
      createLazyAsync: vi.fn((init) => async () => await init()),
      createLazyFirestore: vi.fn(() => {
        // Import after mock setup to avoid circular issues
        const { firestoreMock } = require('../setup');
        return () => firestoreMock;
      }),
      createLazyAuth: vi.fn(() => () => ({ mock: true })),
      createLazyFirestoreForTests: vi.fn(() => {
        const { firestoreMock } = require('../setup');
        return () => firestoreMock;
      }),
    };
  }

  /**
   * Validation service mock
   */
  static getValidationServiceMock() {
    return {
      validateUserId: vi.fn().mockResolvedValue(true),
      validateLevel: vi.fn().mockResolvedValue(true),
      validateTaskData: vi.fn().mockResolvedValue(true),
    };
  }

  /**
   * Team service mock
   */
  static getTeamServiceMock() {
    return {
      getTeamProgress: vi.fn().mockResolvedValue({ members: [], progress: {} }),
      createTeam: vi.fn().mockResolvedValue({ id: 'team-1', name: 'Test Team' }),
      joinTeam: vi.fn().mockResolvedValue(undefined),
      leaveTeam: vi.fn().mockResolvedValue(undefined),
    };
  }

  /**
   * Setup all mocks for a test suite
   */
  static setupSuiteMocks() {
    return {
      dataLoaders: this.getDataLoadersMock(),
      progressUtils: this.getProgressUtilsMock(),
      factory: this.getFactoryMock(),
      validationService: this.getValidationServiceMock(),
      teamService: this.getTeamServiceMock(),
    };
  }

  /**
   * Reset all mocks to clean state
   */
  static resetAllMocks() {
    const mocks = this.setupSuiteMocks();
    Object.values(mocks).forEach(mock => {
      if (typeof mock === 'object') {
        Object.values(mock).forEach(fn => {
          if (vi.isMockFunction(fn)) {
            vi.clearAllMocks();
          }
        });
      }
    });
  }
}
