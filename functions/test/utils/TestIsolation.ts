/**
 * Test Isolation Utilities
 *
 * Provides utilities for ensuring tests don't interfere with each other
 * and implementing proper cleanup patterns for long-term maintainability
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { resetDb, seedDb } from '../setup';

/**
 * Manages test isolation between test runs
 */
export class TestIsolationManager {
  private static testCount = 0;
  private static cleanupCallbacks: Array<() => void | Promise<void>> = [];

  /**
   * Initialize test isolation for a test suite
   * Should be called in describe blocks
   */
  static initializeTestSuite(): void {
    this.testCount = 0;
    this.cleanupCallbacks = [];

    beforeEach(() => {
      this.testCount++;
      vi.clearAllMocks();
    });

    afterEach(async () => {
      await this.cleanup();
    });
  }

  /**
   * Register a cleanup callback to run after each test
   * @param cleanupFn - Function to run for cleanup
   */
  static registerCleanup(cleanupFn: () => void | Promise<void>): void {
    this.cleanupCallbacks.push(cleanupFn);
  }

  /**
   * Run all registered cleanup functions
   */
  private static async cleanup(): Promise<void> {
    for (const cleanup of this.cleanupCallbacks) {
      try {
        await cleanup();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    }
    this.cleanupCallbacks = [];
  }

  /**
   * Get current test number for debugging
   */
  static getTestNumber(): number {
    return this.testCount;
  }
}

/**
 * Database isolation utilities
 */
export class DatabaseIsolation {
  /**
   * Create isolated database state for a test
   * @param testData - Data to seed for the test
   * @returns Cleanup function to reset database
   */
  static createIsolatedDatabase(testData: Record<string, any>): () => void {
    const originalState = DatabaseIsolation.captureDatabaseState();

    // Reset and seed with test data
    resetDb();
    seedDb(testData);

    // Return cleanup function
    return () => {
      resetDb();
      if (originalState) {
        seedDb(originalState);
      }
    };
  }

  /**
   * Capture current database state for restoration later
   * Note: This is a simplified version - in production you might want
   * to capture more detailed state
   */
  private static captureDatabaseState(): Record<string, any> | null {
    // For now, return null as we'll use resetDb() which is more reliable
    // In a more complex setup, you might want to capture the actual dbState
    return null;
  }
}

/**
 * Mock isolation utilities
 */
export class MockIsolation {
  private static mockConfigs = new Map<string, any>();

  /**
   * Save current mock configuration
   * @param name - Identifier for the mock configuration
   * @param mockObject - The mock configuration to save
   */
  static saveMockConfig(name: string, mockObject: any): void {
    this.mockConfigs.set(name, { ...mockObject });
  }

  /**
   * Restore saved mock configuration
   * @param name - Identifier for the mock configuration
   * @returns The saved mock configuration
   */
  static restoreMockConfig(name: string): any {
    const config = this.mockConfigs.get(name);
    if (config) {
      return { ...config };
    }
    return null;
  }

  /**
   * Clear all saved mock configurations
   */
  static clearMockConfigs(): void {
    this.mockConfigs.clear();
  }

  /**
   * Create isolated mock for a specific test
   * @param mockName - Name of the mock
   * @param setupFn - Function to setup the mock
   * @returns Cleanup function
   */
  static createIsolatedMock<T>(mockName: string, setupFn: () => T): T {
    // Save current state if it exists
    MockIsolation.saveMockConfig(mockName, (global as any)[mockName]);

    // Setup new mock
    const mock = setupFn();
    (global as any)[mockName] = mock;

    // Return cleanup function
    return () => {
      const originalConfig = MockIsolation.restoreMockConfig(mockName);
      if (originalConfig) {
        (global as any)[mockName] = originalConfig;
      }
    };
  }
}

/**
 * Test context utilities for tracking test state
 */
export class TestContext {
  private static context = new Map<string, any>();

  /**
   * Set a value in the test context
   * @param key - Context key
   * @param value - Context value
   */
  static set<T>(key: string, value: T): void {
    this.context.set(key, value);
  }

  /**
   * Get a value from the test context
   * @param key - Context key
   * @returns Context value or undefined
   */
  static get<T>(key: string): T | undefined {
    return this.context.get(key);
  }

  /**
   * Check if a context value exists
   * @param key - Context key
   * @returns True if value exists
   */
  static has(key: string): boolean {
    return this.context.has(key);
  }

  /**
   * Remove a value from the test context
   * @param key - Context key
   * @returns True if value was removed
   */
  static delete(key: string): boolean {
    return this.context.delete(key);
  }

  /**
   * Clear all test context
   */
  static clear(): void {
    this.context.clear();
  }
}

/**
 * Test performance utilities
 */
export class TestPerformance {
  private static timers = new Map<string, number>();

  /**
   * Start timing a test operation
   * @param name - Name of the operation being timed
   */
  static startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  /**
   * End timing and return duration
   * @param name - Name of the operation
   * @returns Duration in milliseconds
   */
  static endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (startTime === undefined) {
      throw new Error(`Timer '${name}' was not started`);
    }
    const duration = Date.now() - startTime;
    this.timers.delete(name);
    return duration;
  }

  /**
   * Measure execution time of a function
   * @param name - Name for the measurement
   * @param fn - Function to measure
   * @returns Result of the function and duration
   */
  static async measure<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    this.startTimer(name);
    const result = await fn();
    const duration = this.endTimer(name);
    return { result, duration };
  }

  /**
   * Assert that a test operation completes within time limit
   * @param name - Name of the operation
   * @param fn - Function to test
   * @param maxDuration - Maximum allowed duration in milliseconds
   */
  static async assertCompletesWithin<T>(
    name: string,
    fn: () => Promise<T>,
    maxDuration: number
  ): Promise<{ result: T; duration: number }> {
    const { result, duration } = await this.measure(name, fn);

    if (duration > maxDuration) {
      throw new Error(
        `Test operation '${name}' took ${duration}ms, which exceeds maximum allowed ${maxDuration}ms`
      );
    }

    return { result, duration };
  }

  /**
   * Clear all timers
   */
  static clearTimers(): void {
    this.timers.clear();
  }
}

/**
 * Utility functions for common test patterns
 */
export class TestUtils {
  /**
   * Create a promise that resolves after specified time
   * @param ms - Milliseconds to wait
   * @returns Promise that resolves after timeout
   */
  static async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a promise that rejects after specified time
   * @param ms - Milliseconds to wait
   * @param message - Rejection message
   * @returns Promise that rejects after timeout
   */
  static async timeout(ms: number, message = 'Timeout'): Promise<never> {
    return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
  }

  /**
   * Create a retry function for flaky operations
   * @param fn - Function to retry
   * @param maxAttempts - Maximum number of attempts
   * @param delay - Delay between attempts in milliseconds
   * @returns Promise that resolves when function succeeds
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 100
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          throw lastError;
        }

        await this.wait(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Generate a deterministic test ID
   * @param prefix - Prefix for the ID
   * @param suffix - Optional suffix
   * @returns Deterministic test ID
   */
  static generateTestId(prefix: string, suffix: string = ''): string {
    return `${prefix}-${Date.now()}${suffix ? `-${suffix}` : ''}`;
  }

  /**
   * Generate a consistent random number for tests
   * @param seed - Seed for random number generation
   * @returns Pseudo-random number
   */
  static seededRandom(seed: number): number {
    // Simple LCG (Linear Congruential Generator) for deterministic randomness
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    seed = (a * seed + c) % m;
    return seed / m;
  }
}

/**
 * Convenience functions for common test setup patterns
 */
export const createTestSuite = (suiteName: string) => {
  TestIsolationManager.initializeTestSuite();

  return {
    /**
     * Create isolated database state for a test
     */
    withDatabase: DatabaseIsolation.createIsolatedDatabase,

    /**
     * Create isolated mock for a test
     */
    withMock: MockIsolation.createIsolatedMock,

    /**
     * Get test context value
     */
    getContext: TestContext.get,

    /**
     * Set test context value
     */
    setContext: TestContext.set,

    /**
     * Measure test performance
     */
    measure: TestPerformance.measure,

    /**
     * Assert completion within time limit
     */
    assertWithin: TestPerformance.assertCompletesWithin,

    /**
     * Generate test ID
     */
    generateId: TestUtils.generateTestId,
  };
};
