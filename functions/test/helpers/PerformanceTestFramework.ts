/**
 * Performance Baseline Testing Framework
 *
 * Provides performance monitoring, regression detection, and baseline management
 * for all test operations. Ensures code changes don't introduce performance regressions.
 */

import { expect } from 'vitest';

export interface PerformanceBaseline {
  testName: string;
  averageTime: number;
  maxTime: number;
  minTime: number;
  sampleSize: number;
  threshold: number; // Percentage increase considered regression
  date: string;
}

export interface PerformanceThresholds {
  tokenGeneration: number;
  progressUpdate: number;
  dataRetrieval: number;
  transaction: number;
  userRegistration: number;
  teamOperations: number;
}

export class PerformanceBaseline {
  private static baselines = new Map<string, PerformanceBaseline>();
  private static readonly BASELINE_FILE = 'performance-baselines.json';

  /**
   * Default performance thresholds in milliseconds
   */
  static readonly DEFAULT_THRESHOLDS: PerformanceThresholds = {
    tokenGeneration: 100,
    progressUpdate: 200,
    dataRetrieval: 150,
    transaction: 250,
    userRegistration: 300,
    teamOperations: 180,
  };

  /**
   * Establish a performance baseline for a test
   */
  static async establishBaseline(
    testName: string,
    operation: () => Promise<any>,
    options: {
      sampleSize?: number;
      threshold?: number;
    } = {}
  ): Promise<PerformanceBaseline> {
    const sampleSize = options.sampleSize || 10;
    const threshold = options.threshold || 50; // 50% default threshold

    const times: number[] = [];

    for (let i = 0; i < sampleSize; i++) {
      const startTime = performance.now();
      await operation();
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const baseline: PerformanceBaseline = {
      testName,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      maxTime: Math.max(...times),
      minTime: Math.min(...times),
      sampleSize: times.length,
      threshold,
      date: new Date().toISOString(),
    };

    this.baselines.set(testName, baseline);
    return baseline;
  }

  /**
   * Check if performance has regressed compared to baseline
   */
  static async checkRegression(
    testName: string,
    operation: () => Promise<any>,
    options: {
      sampleSize?: number;
      customThreshold?: number;
    } = {}
  ): Promise<{
    hasRegression: boolean;
    currentTime: number;
    baseline: PerformanceBaseline | undefined;
    percentageIncrease: number;
  }> {
    const sampleSize = options.sampleSize || 5;
    const customThreshold = options.customThreshold;

    const baseline = this.baselines.get(testName);
    if (!baseline) {
      throw new Error(`No baseline found for test: ${testName}`);
    }

    const times: number[] = [];
    for (let i = 0; i < sampleSize; i++) {
      const startTime = performance.now();
      await operation();
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const currentTime = times.reduce((a, b) => a + b, 0) / times.length;
    const threshold = customThreshold || baseline.threshold;
    const percentageIncrease = ((currentTime - baseline.averageTime) / baseline.averageTime) * 100;
    const hasRegression = percentageIncrease > threshold;

    return {
      hasRegression,
      currentTime,
      baseline,
      percentageIncrease,
    };
  }

  /**
   * Assert that performance is within acceptable limits
   */
  static async expectPerformance(
    testName: string,
    operation: () => Promise<any>,
    options: {
      maxTime?: number;
      baseline?: PerformanceBaseline;
      threshold?: number;
    } = {}
  ): Promise<void> {
    const maxTime = options.maxTime || this.DEFAULT_THRESHOLDS.tokenGeneration;

    const startTime = performance.now();
    await operation();
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    expect(executionTime).toBeLessThan(maxTime);
  }

  /**
   * Get all established baselines
   */
  static getAllBaselines(): Map<string, PerformanceBaseline> {
    return new Map(this.baselines);
  }

  /**
   * Load baselines from storage (would implement file I/O in real scenario)
   */
  static loadBaselines(): void {
    // In a real implementation, this would load from file system
    console.log('Baselines would be loaded from storage');
  }

  /**
   * Save baselines to storage
   */
  static saveBaselines(): void {
    // In a real implementation, this would save to file system
    console.log('Baselines would be saved to storage');
  }
}

/**
 * Memory usage monitoring for detecting memory leaks
 */
export class MemoryMonitor {
  private static snapshots: Array<{
    testName: string;
    heapUsed: number;
    heapTotal: number;
    external: number;
    timestamp: number;
  }> = [];

  /**
   * Take a memory snapshot
   */
  static takeSnapshot(testName: string): void {
    const memUsage = process.memoryUsage();
    this.snapshots.push({
      testName,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      timestamp: Date.now(),
    });
  }

  /**
   * Check for memory leaks between snapshots
   */
  static checkForLeaks(
    testName: string,
    thresholdMb: number = 10
  ): {
    hasLeak: boolean;
    increaseMb: number;
  } {
    const testSnapshots = this.snapshots.filter(s => s.testName === testName);
    if (testSnapshots.length < 2) {
      return { hasLeak: false, increaseMb: 0 };
    }

    const first = testSnapshots[0];
    const last = testSnapshots[testSnapshots.length - 1];
    const increaseBytes = last.heapUsed - first.heapUsed;
    const increaseMb = increaseBytes / (1024 * 1024);

    return {
      hasLeak: increaseMb > thresholdMb,
      increaseMb,
    };
  }

  /**
   * Clear snapshots for a test
   */
  static clearSnapshots(testName: string): void {
    this.snapshots = this.snapshots.filter(s => s.testName !== testName);
  }

  /**
   * Get memory usage statistics
   */
  static getStats(testName: string) {
    const testSnapshots = this.snapshots.filter(s => s.testName === testName);
    if (testSnapshots.length === 0) return null;

    const heapUsages = testSnapshots.map(s => s.heapUsed);
    return {
      min: Math.min(...heapUsages),
      max: Math.max(...heapUsages),
      average: heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length,
      samples: testSnapshots.length,
    };
  }
}

/**
 * Load testing utilities
 */
export class LoadTester {
  /**
   * Test system under concurrent load
   */
  static async testConcurrentLoad(
    operation: () => Promise<any>,
    concurrency: number,
    iterations: number = 10
  ): Promise<{
    totalTime: number;
    averageTime: number;
    successCount: number;
    errorCount: number;
    errors: Array<{ error: Error; count: number }>;
  }> {
    const startTime = performance.now();
    const promises: Promise<void>[] = [];
    const errors: Array<{ error: Error; count: number }> = [];

    for (let i = 0; i < concurrency; i++) {
      promises.push(
        this.runOperationWithRetry(operation, iterations).catch(error => {
          const existingError = errors.find(e => e.error.message === error.message);
          if (existingError) {
            existingError.count++;
          } else {
            errors.push({ error, count: 1 });
          }
          throw error;
        })
      );
    }

    try {
      await Promise.all(promises);
    } catch (error) {
      // Some operations failed, which is expected under load
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    return {
      totalTime,
      averageTime: totalTime / (concurrency * iterations),
      successCount: (concurrency * iterations) - errors.reduce((sum, e) => sum + e.count, 0),
      errorCount: errors.reduce((sum, e) => sum + e.count, 0),
      errors,
    };
  }

  private static async runOperationWithRetry(
    operation: () => Promise<any>,
    retries: number = 3
  ): Promise<void> {
    let lastError: Error;

    for (let i = 0; i < retries; i++) {
      try {
        await operation();
        return;
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          // Brief delay before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Gradual load increase test
   */
  static async testGradualLoadIncrease(
    operation: () => Promise<any>,
    maxConcurrency: number,
    stepSize: number = 5
  ): Promise<Array<{
    concurrency: number;
    results: any;
  }>> {
    const results = [];

    for (let concurrency = stepSize; concurrency <= maxConcurrency; concurrency += stepSize) {
      const result = await this.testConcurrentLoad(operation, concurrency, 5);
      results.push({
        concurrency,
        results: result,
      });
    }

    return results;
  }
}

/**
 * Performance assertion helpers
 */
export class PerformanceAssertions {
  /**
   * Assert that an operation completes within time limit
   */
  static async completesWithin(
    operation: () => Promise<any>,
    maxMs: number
  ): Promise<void> {
    const startTime = performance.now();
    await operation();
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(maxMs);
  }

  /**
   * Assert that operation scales linearly with load
   */
  static assertLinearScaling(
    lowConcurrencyResult: { averageTime: number; concurrency: number },
    highConcurrencyResult: { averageTime: number; concurrency: number },
    tolerance: number = 0.3
  ): void {
    const expectedRatio = highConcurrencyResult.concurrency / lowConcurrencyResult.concurrency;
    const actualRatio = highConcurrencyResult.averageTime / lowConcurrencyResult.averageTime;
    const deviation = Math.abs(actualRatio - expectedRatio) / expectedRatio;

    expect(deviation).toBeLessThan(tolerance);
  }

  /**
   * Assert error rate is within acceptable limits
   */
  static assertErrorRate(
    results: { errorCount: number; successCount: number },
    maxErrorRate: number = 0.05
  ): void {
    const total = results.errorCount + results.successCount;
    const errorRate = results.errorCount / total;

    expect(errorRate).toBeLessThan(maxErrorRate);
  }
}

/**
 * Performance monitoring decorator
 */
export function monitorPerformance(testName: string, maxTime?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      MemoryMonitor.takeSnapshot(testName);

      const startTime = performance.now();
      const result = await originalMethod.apply(this, args);
      const duration = performance.now() - startTime;

      if (maxTime) {
        expect(duration).toBeLessThan(maxTime);
      }

      MemoryMonitor.takeSnapshot(testName);

      console.log(`📊 Performance: ${testName} took ${duration.toFixed(2)}ms`);

      return result;
    };
  };
}