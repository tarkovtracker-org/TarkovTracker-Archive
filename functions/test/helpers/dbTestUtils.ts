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
import { seedDb } from './emulatorSetup';
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
   *
   * NOTE: Does NOT call resetDb() - the global afterEach hook in test/setup.ts
   * already cleared the database after the previous test. Calling resetDb() here
   * creates race conditions where DELETE requests overlap with seed operations,
   * causing tests to fail with null/empty data.
   *
   * Database cleanup is handled exclusively by the global afterEach hook to:
   * - Prevent redundant HTTP DELETE requests to the emulator
   * - Eliminate race conditions from overlapping clear/seed operations
   * - Improve test performance (one DELETE per test instead of two)
   */
  async setupDatabase(data: Record<string, Record<string, any>>): Promise<void> {
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
   * Seed test data into Firestore
   *
   * Assumes database is already clean from the global afterEach hook.
   * This method ONLY seeds data - it does NOT clear the database first.
   *
   * Cleanup is handled automatically by the global afterEach hook in test/setup.ts,
   * which clears all Firestore data after every test completes.
   *
   * @param data - Database collections and documents to seed
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
     *
     * Also clears data loader caches to prevent stale cached data from leaking
     * between tests, ensuring fresh data is loaded from Firestore each test.
     */
    beforeEach: async () => {
      // Global afterEach in test/setup.ts is the single source of truth for
      // Firestore cleanup. We purposefully avoid calling resetDb() here to
      // prevent redundant cleanup work and keep responsibility clear:
      // - Global afterEach: clears Firestore between tests
      // - This hook: clears mocks and in-memory caches for the current test
      vi.clearAllMocks();
      // Clear data loader caches to prevent stale data leakage between tests
      try {
        const { clearDataLoaderCache } = await import('../../src/utils/dataLoaders');
        clearDataLoaderCache();
      } catch {
        // If dataLoaders can't be imported (e.g., in mocked contexts), silently continue
      }
    },

    /**
     * Standard afterEach - runs test-specific cleanup callbacks
     * Call this in your afterEach hook
     *
     * This runs custom cleanup callbacks registered via addCleanup() and restores mocks.
     * Also clears data loader caches as extra protection against cross-test pollution.
     *
     * IMPORTANT: Does NOT clear Firestore - the global afterEach hook in
     * test/setup.ts handles that. This keeps cleanup responsibilities clear:
     * - Global hook: Firestore cleanup (runs for ALL tests)
     * - This method: Test-specific cleanup (mocks, custom callbacks, cache clearing)
     */
    afterEach: async () => {
      await context.cleanup();
      // Clear data loader caches after test to prevent leakage to next test
      try {
        const { clearDataLoaderCache } = await import('../../src/utils/dataLoaders');
        clearDataLoaderCache();
      } catch {
        // If dataLoaders can't be imported (e.g., in mocked contexts), silently continue
      }
    },

    /**
     * Seed database for a test
     *
     * Seeds data into Firestore without clearing first. The global afterEach hook
     * in test/setup.ts already cleared the database after the previous test.
     *
     * Cleanup is automatic - the global afterEach hook clears all data after this test.
     *
     * @param data - Database collections and documents to seed
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
 * Quick database seeding for simple tests
 * Use when you don't need full test suite infrastructure
 *
 * NOTE: This ONLY seeds data - it does NOT clear the database first.
 * The global afterEach hook in test/setup.ts handles cleanup automatically.
 *
 * @param data - Database state to seed
 *
 * @example
 * ```typescript
 * it('simple test', async () => {
 *   await quickSetup({ users: { 'user-1': { uid: 'user-1' } } });
 *   // Test code - cleanup is automatic via global afterEach
 * });
 * ```
 */
export const quickSetup = async (data: Record<string, Record<string, any>>) => {
  await seedDb(data);
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
 * NOTE: Database cleanup is handled by the global afterEach hook.
 * This function only handles test-specific cleanup (mocks, callbacks).
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
