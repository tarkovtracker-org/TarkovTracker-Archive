/**
 * Centralized database testing utilities
 * Provides consistent patterns for test data management and cleanup
 *
 * This module offers:
 * - Automatic database reset/cleanup
 * - Test isolation management
 * - Fluent test suite setup
 * - Mock tracking and restoration
 *
 * @example
 * ```typescript
 * import { createTestSuite } from './helpers/dbTestUtils';
 *
 * describe('MyService', () => {
 *   const suite = createTestSuite('MyService');
 *
 *   beforeEach(suite.beforeEach);
 *   afterEach(suite.afterEach);
 *
 *   it('should do something', () => {
 *     suite.withDatabase({ users: { 'user-1': { uid: 'user-1' } } });
 *     // Test code - cleanup is automatic
 *   });
 * });
 * ```
 */

import { vi } from 'vitest';
import { seedDb, resetDb } from './emulatorSetup';
import type { Mock } from 'vitest';

/**
 * Test suite context manager
 * Handles setup/teardown lifecycle consistently
 */
export class TestSuiteContext {
  private cleanupCallbacks: Array<() => void | Promise<void>> = [];
  private mockRegistry = new Map<string, Mock>();

  /**
   * Setup database with initial data
   * Resets database first to ensure clean state
   */
  async setupDatabase(data: Record<string, Record<string, any>>): Promise<void> {
    await resetDb();
    await seedDb(data);
  }

  /**
   * Register cleanup callback to run after test
   * Callbacks run in reverse order (LIFO)
   */
  addCleanup(callback: () => void | Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Run all cleanup callbacks
   * Clears all registered cleanups after execution
   */
  async cleanup(): Promise<void> {
    // Run in reverse order (LIFO - last registered runs first)
    const callbacks = [...this.cleanupCallbacks].reverse();
    for (const callback of callbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('Cleanup callback failed:', error);
        // Continue with other cleanups even if one fails
      }
    }
    this.cleanupCallbacks = [];
    this.mockRegistry.clear();
    vi.resetAllMocks();
  }

  /**
   * Create isolated test data that gets cleaned up
   * Database is cleared by global afterEach hook, not by this method
   * This method just seeds the data for the test
   */
  async withDatabase(data: Record<string, Record<string, any>>): Promise<void> {
    await this.setupDatabase(data);
  }

  /**
   * Create isolated mock override that gets restored
   * Automatically tracks and restores the mock
   */
  withMock<T extends (...args: any[]) => any>(name: string, mockImpl: T): Mock<T> {
    const mock = mockImpl as unknown as Mock<T>;
    this.mockRegistry.set(name, mock);
    this.addCleanup(() => {
      if (mock.mockRestore) {
        mock.mockRestore();
      }
    });
    return mock;
  }

  /**
   * Get a previously registered mock by name
   */
  getMock<T extends (...args: any[]) => any>(name: string): Mock<T> | undefined {
    return this.mockRegistry.get(name) as Mock<T> | undefined;
  }
}

/**
 * Standard test suite setup
 * Use in describe blocks for consistent lifecycle management
 *
 * @param suiteName - Name of the test suite (for logging/debugging)
 * @returns Test suite helper object with lifecycle methods
 *
 * @example
 * ```typescript
 * describe('TokenService', () => {
 *   const suite = createTestSuite('TokenService');
 *
 *   beforeEach(suite.beforeEach);
 *   afterEach(suite.afterEach);
 *
 *   it('should create token', () => {
 *     suite.withDatabase({ users: { 'user-1': { uid: 'user-1' } } });
 *     // Test implementation
 *   });
 * });
 * ```
 */
export const createTestSuite = (suiteName: string) => {
  const context = new TestSuiteContext();

  return {
    context,
    suiteName,

    /**
     * Standard beforeEach - clears mocks and provides defensive database reset
     * Call this in your beforeEach hook
     *
     * NOTE: The global afterEach hook in test/setup.ts is the canonical cleanup.
     * This resetDb() call is defensive: it ensures a clean slate even if the
     * global hook is somehow bypassed or a test runs in isolation.
     * 
     * In normal operation:
     * - Global afterEach clears Firestore after the previous test
     * - This beforeEach provides an extra safety check
     * - Both together guarantee no state leakage
     */
    beforeEach: async () => {
      await resetDb();
      vi.clearAllMocks();
    },

    /**
     * Standard afterEach - runs test-specific cleanup callbacks
     * Call this in your afterEach hook
     *
     * This runs custom cleanup callbacks registered via addCleanup() and restores mocks.
     * 
     * IMPORTANT: Does NOT clear Firestore - the global afterEach hook in 
     * test/setup.ts handles that. This keeps cleanup responsibilities clear:
     * - Global hook: Firestore cleanup (runs for ALL tests)
     * - This method: Test-specific cleanup (mocks, custom callbacks)
     */
    afterEach: async () => {
      await context.cleanup();
    },

    /**
     * Setup database for a test
     * Automatically registers cleanup
     *
     * @param data - Database state to seed
     */
    withDatabase: (data: Record<string, Record<string, any>>) => {
      return context.withDatabase(data);
    },

    /**
     * Create temporary mock that gets restored
     *
     * @param name - Identifier for the mock
     * @param mockImpl - Mock implementation
     * @returns The mock for further configuration
     */
    withMock: <T extends (...args: any[]) => any>(name: string, mockImpl: T) => {
      return context.withMock(name, mockImpl);
    },

    /**
     * Add custom cleanup callback
     * Useful for test-specific cleanup beyond database/mocks
     *
     * @param callback - Cleanup function to run after test
     */
    addCleanup: (callback: () => void | Promise<void>) => {
      context.addCleanup(callback);
    },

    /**
     * Get a previously registered mock by name
     *
     * @param name - Identifier of the mock
     * @returns The registered mock or undefined
     */
    getMock: <T extends (...args: any[]) => any>(name: string) => {
      return context.getMock<T>(name);
    },
  };
};

/**
 * Quick database setup for simple tests
 * Use when you don't need full test suite infrastructure
 *
 * WARNING: This does NOT register automatic cleanup.
 * Only use in tests with manual cleanup or where isolation isn't critical.
 *
 * @param data - Database state to seed
 *
 * @example
 * ```typescript
 * it('simple test', () => {
 *   quickSetup({ users: { 'user-1': { uid: 'user-1' } } });
 *   // Test code
 * });
 * ```
 */
export const quickSetup = (data: Record<string, Record<string, any>>) => {
  resetDb();
  seedDb(data);
};

/**
 * Create a test suite with automatic beforeEach/afterEach hooks
 * Use when you want hooks automatically registered
 *
 * @param suiteName - Name of the test suite
 * @param beforeEachFn - Vitest beforeEach function
 * @param afterEachFn - Vitest afterEach function
 * @returns Test suite helper object
 *
 * @example
 * ```typescript
 * import { beforeEach, afterEach } from 'vitest';
 *
 * describe('MyService', () => {
 *   const suite = createTestSuiteWithHooks('MyService', beforeEach, afterEach);
 *
 *   it('should work', () => {
 *     suite.withDatabase({ users: {} });
 *   });
 * });
 * ```
 */
export const createTestSuiteWithHooks = (
  suiteName: string,
  beforeEachFn: (fn: () => void | Promise<void>) => void,
  afterEachFn: (fn: () => void | Promise<void>) => void
) => {
  const suite = createTestSuite(suiteName);

  beforeEachFn(suite.beforeEach);
  afterEachFn(suite.afterEach);

  return suite;
};

/**
 * Helper to run a test with automatic cleanup
 * Useful for one-off tests that need isolation
 *
 * @param testFn - Test function to run
 * @param data - Optional database state to seed
 * @returns Promise that resolves when test and cleanup complete
 *
 * @example
 * ```typescript
 * await withTestIsolation(async () => {
 *   // Test code with isolated state
 * }, { users: { 'user-1': { uid: 'user-1' } } });
 * ```
 */
export const withTestIsolation = async (
  testFn: () => void | Promise<void>,
  data?: Record<string, Record<string, any>>
): Promise<void> => {
  const context = new TestSuiteContext();

  try {
    if (data) {
      await context.setupDatabase(data);
    }
    await testFn();
  } finally {
    await context.cleanup();
  }
};
