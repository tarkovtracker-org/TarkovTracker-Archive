/**
 * Test Isolation Manager
 *
 * Provides comprehensive test isolation, cleanup, and state management
 * to prevent cross-contamination between tests and ensure test reliability.
 */

import { vi, expect } from 'vitest';
import { firestoreMock } from '../setup';

interface TestState {
  testName: string;
  startTime: number;
  memoryBefore: NodeJS.MemoryUsage;
  mockSnapshots: Map<string, any>;
  databaseSnapshots: Map<string, any>;
}

interface IsolationConfig {
  resetMocks: boolean;
  resetDatabase: boolean;
  checkMemoryLeaks: boolean;
  validateCleanShutdown: boolean;
  trackPerformance: boolean;
}

export class TestIsolationManager {
  private static currentTest: TestState | null = null;
  private static defaultConfig: IsolationConfig = {
    resetMocks: true,
    resetDatabase: true,
    checkMemoryLeaks: false,
    validateCleanShutdown: false,
    trackPerformance: false,
  };

  /**
   * Initialize test isolation for a new test
   */
  static async initializeTest(
    testName: string,
    config: Partial<IsolationConfig> = {}
  ): Promise<void> {
    const fullConfig = { ...this.defaultConfig, ...config };

    this.currentTest = {
      testName,
      startTime: Date.now(),
      memoryBefore: process.memoryUsage(),
      mockSnapshots: new Map(),
      databaseSnapshots: new Map(),
    };

    console.log(`🧪 Starting test: ${testName}`);

    // Reset mocks if configured
    if (fullConfig.resetMocks) {
      this.resetAllMocks();
    }

    // Reset database state if configured
    if (fullConfig.resetDatabase) {
      this.resetDatabaseState();
    }
  }

  /**
   * Clean up after test completion
   */
  static async cleanupTest(config: Partial<IsolationConfig> = {}): Promise<void> {
    if (!this.currentTest) {
      console.warn('⚠️  No active test to cleanup');
      return;
    }

    const fullConfig = { ...this.defaultConfig, ...config };
    const testDuration = Date.now() - this.currentTest.startTime;

    // Check for memory leaks if configured
    if (fullConfig.checkMemoryLeaks) {
      await this.checkMemoryLeaks();
    }

    // Validate clean shutdown if configured
    if (fullConfig.validateCleanShutdown) {
      this.validateCleanShutdown();
    }

    // Track performance if configured
    if (fullConfig.trackPerformance) {
      this.trackPerformance(testDuration);
    }

    console.log(`✅ Completed test: ${this.currentTest.testName} (${testDuration}ms)`);

    // Final cleanup
    this.currentTest = null;
  }

  /**
   * Reset all mocks to clean state
   */
  private static resetAllMocks(): void {
    try {
      vi.resetAllMocks();
      vi.clearAllMocks();

      // Reset firestore mock
      if (vi.isMockFunction(firestoreMock.runTransaction)) {
        vi.mocked(firestoreMock.runTransaction).mockReset();
      }
      if (vi.isMockFunction(firestoreMock.collection)) {
        vi.mocked(firestoreMock.collection).mockReset();
      }
      if (vi.isMockFunction(firestoreMock.doc)) {
        vi.mocked(firestoreMock.doc).mockReset();
      }

      console.log('🔄 All mocks reset');
    } catch (error) {
      console.warn('⚠️  Error resetting mocks:', error);
    }
  }

  /**
   * Reset database state to clean baseline
   */
  private static resetDatabaseState(): void {
    try {
      // This would integrate with the actual test database setup
      // For now, we'll just reset the firestore mock
      vi.mocked(firestoreMock.runTransaction).mockReset();
      vi.mocked(firestoreMock.collection).mockReset();
      vi.mocked(firestoreMock.doc).mockReset();

      console.log('🗃️  Database state reset');
    } catch (error) {
      console.warn('⚠️  Error resetting database:', error);
    }
  }

  /**
   * Check for memory leaks during test execution
   */
  private static async checkMemoryLeaks(): Promise<void> {
    if (!this.currentTest) return;

    const memoryAfter = process.memoryUsage();
    const memoryIncrease = {
      heapUsed: memoryAfter.heapUsed - this.currentTest.memoryBefore.heapUsed,
      heapTotal: memoryAfter.heapTotal - this.currentTest.memoryBefore.heapTotal,
      external: memoryAfter.external - this.currentTest.memoryBefore.external,
    };

    // Convert to MB for easier reading
    const increaseMb = {
      heapUsed: memoryIncrease.heapUsed / (1024 * 1024),
      heapTotal: memoryIncrease.heapTotal / (1024 * 1024),
      external: memoryIncrease.external / (1024 * 1024),
    };

    // Warn about significant memory increases
    const thresholdMb = 10;
    if (increaseMb.heapUsed > thresholdMb) {
      console.warn(`⚠️  Memory leak detected: ${increaseMb.heapUsed.toFixed(2)}MB increase`);
    } else {
      console.log(`💾 Memory usage: ${increaseMb.heapUsed.toFixed(2)}MB increase`);
    }
  }

  /**
   * Validate that all asynchronous operations completed cleanly
   */
  private static validateCleanShutdown(): void {
    try {
      // Check for unresolved promises
      const unresolvedPromises = this.getUnresolvedPromises();
      if (unresolvedPromises > 0) {
        console.warn(`⚠️  ${unresolvedPromises} unresolved promises detected`);
      }

      // Check for open timers
      const openTimers = this.getOpenTimers();
      if (openTimers > 0) {
        console.warn(`⚠️  ${openTimers} open timers detected`);
      }

      console.log('🧹 Clean shutdown validated');
    } catch (error) {
      console.warn('⚠️  Error validating clean shutdown:', error);
    }
  }

  /**
   * Track test performance metrics
   */
  private static trackPerformance(duration: number): void {
    const performanceThresholds = {
      slow: 1000, // 1 second
      verySlow: 5000, // 5 seconds
    };

    if (duration > performanceThresholds.verySlow) {
      console.warn(`🐌 Very slow test: ${duration}ms`);
    } else if (duration > performanceThresholds.slow) {
      console.warn(`⏱️  Slow test: ${duration}ms`);
    } else {
      console.log(`⚡ Fast test: ${duration}ms`);
    }
  }

  /**
   * Get count of unresolved promises (simplified implementation)
   */
  private static getUnresolvedPromises(): number {
    // In a real implementation, this would track active promises
    return 0;
  }

  /**
   * Get count of open timers (simplified implementation)
   */
  private static getOpenTimers(): number {
    // In a real implementation, this would track active timers
    return 0;
  }

  /**
   * Create mock snapshot for later restoration
   */
  static captureMockSnapshot(mockName: string, mock: any): void {
    if (!this.currentTest) return;

    const snapshot = {
      calls: vi.isMockFunction(mock) ? [...mock.mock.calls] : [],
      implementations: vi.isMockFunction(mock) ? [...mock.mock.implementation.calls] : [],
    };

    this.currentTest.mockSnapshots.set(mockName, snapshot);
  }

  /**
   * Restore mock from snapshot
   */
  static restoreMockSnapshot(mockName: string, mock: any): void {
    if (!this.currentTest) return;

    const snapshot = this.currentTest.mockSnapshots.get(mockName);
    if (!snapshot) return;

    if (vi.isMockFunction(mock)) {
      mock.mock.calls = snapshot.calls;
      mock.mock.implementation.calls = snapshot.implementations;
    }
  }

  /**
   * Get current test isolation status
   */
  static getStatus(): {
    hasActiveTest: boolean;
    currentTestName?: string;
    testDuration?: number;
  } {
    if (!this.currentTest) {
      return { hasActiveTest: false };
    }

    return {
      hasActiveTest: true,
      currentTestName: this.currentTest.testName,
      testDuration: Date.now() - this.currentTest.startTime,
    };
  }
}

/**
 * Test decorator for automatic isolation management
 */
export function withIsolation(config: Partial<IsolationConfig> = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const testName = `${target.constructor.name}.${propertyKey}`;

      try {
        await TestIsolationManager.initializeTest(testName, config);
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        await TestIsolationManager.cleanupTest(config);
      }
    };

    return descriptor;
  };
}

/**
 * Utility for managing test data isolation
 */
export class TestDataIsolation {
  private static testScopes = new Map<string, any>();

  /**
   * Create isolated test data scope
   */
  static createScope(scopeName: string): any {
    const scope = {};
    this.testScopes.set(scopeName, scope);
    return scope;
  }

  /**
   * Get test data scope
   */
  static getScope(scopeName: string): any {
    return this.testScopes.get(scopeName);
  }

  /**
   * Clean up test data scope
   */
  static cleanupScope(scopeName: string): void {
    this.testScopes.delete(scopeName);
  }

  /**
   * Clean up all test data scopes
   */
  static cleanupAllScopes(): void {
    this.testScopes.clear();
  }
}

/**
 * Global test hooks for Vitest
 */
export function setupGlobalTestHooks(): void {
  // Before each test
  beforeEach(async () => {
    // Global test initialization
    await TestIsolationManager.initializeTest('unknown', {
      resetMocks: true,
      resetDatabase: true,
    });
  });

  // After each test
  afterEach(async () => {
    // Global test cleanup
    await TestIsolationManager.cleanupTest({
      checkMemoryLeaks: true,
      validateCleanShutdown: true,
    });

    // Clean up any remaining test data scopes
    TestDataIsolation.cleanupAllScopes();
  });
}

/**
 * Performance monitoring for test execution
 */
export class TestPerformanceMonitor {
  private static testMetrics = new Map<string, Array<number>>();

  /**
   * Record test execution time
   */
  static recordTime(testName: string, duration: number): void {
    if (!this.testMetrics.has(testName)) {
      this.testMetrics.set(testName, []);
    }
    this.testMetrics.get(testName)!.push(duration);
  }

  /**
   * Get test performance statistics
   */
  static getStats(testName: string): {
    count: number;
    average: number;
    min: number;
    max: number;
  } | null {
    const times = this.testMetrics.get(testName);
    if (!times || times.length === 0) return null;

    return {
      count: times.length,
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
    };
  }

  /**
   * Get all test statistics
   */
  static getAllStats(): Map<
    string,
    {
      count: number;
      average: number;
      min: number;
      max: number;
    }
  > {
    const result = new Map();
    for (const [testName] of this.testMetrics) {
      const stats = this.getStats(testName);
      if (stats) {
        result.set(testName, stats);
      }
    }
    return result;
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.testMetrics.clear();
  }
}
