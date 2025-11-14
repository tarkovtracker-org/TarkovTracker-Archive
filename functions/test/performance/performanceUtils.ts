import { performance } from 'node:perf_hooks';
/**
 * Performance metrics collection utility
 */
export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  success: boolean;
  error?: Error;
  metadata?: Record<string, any>;
}
export interface LoadTestMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // operations per second
  errorRate: number;
  memoryUsage: {
    initial: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
    final: NodeJS.MemoryUsage;
  };
  duration: number;
}
export interface ConcurrencyTestMetrics {
  concurrentUsers: number;
  operationsPerUser: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  throughput: number;
  errors: Array<{ error: string; count: number }>;
  memoryUsage: NodeJS.MemoryUsage[];
  duration: number;
}
/**
 * Performance measurement utility
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private memorySnapshots: NodeJS.MemoryUsage[] = [];
  /**
   * Start measuring an operation
   */
  startOperation(operationName: string, metadata?: Record<string, any>): () => PerformanceMetrics {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    return (): PerformanceMetrics => {
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;
      const metric: PerformanceMetrics = {
        operationName,
        startTime,
        endTime,
        duration,
        memoryUsage: endMemory,
        success: true,
        metadata,
      };
      this.metrics.push(metric);
      this.memorySnapshots.push(endMemory);
      return metric;
    };
  }
  /**
   * Measure an async operation
   */
  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const endOperation = this.startOperation(operationName, metadata);
    try {
      const result = await operation();
      const metrics = endOperation();
      return { result, metrics };
    } catch (error) {
      const metrics = endOperation();
      metrics.success = false;
      metrics.error = error as Error;
      throw error;
    }
  }
  /**
   * Get all collected metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
  /**
   * Get metrics for a specific operation
   */
  getOperationMetrics(operationName: string): PerformanceMetrics[] {
    return this.metrics.filter((metric) => metric.operationName === operationName);
  }
  /**
   * Calculate statistics for an operation
   */
  calculateStats(operationName: string): {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    p99Duration: number;
    successRate: number;
    errorCount: number;
  } {
    const operationMetrics = this.getOperationMetrics(operationName);

    if (operationMetrics.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        successRate: 0,
        errorCount: 0,
      };
    }
    const durations = operationMetrics.map((m) => m.duration).sort((a, b) => a - b);
    const successCount = operationMetrics.filter((m) => m.success).length;
    const errorCount = operationMetrics.length - successCount;
    return {
      count: operationMetrics.length,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
      successRate: (successCount / operationMetrics.length) * 100,
      errorCount,
    };
  }
  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = [];
    this.memorySnapshots = [];
  }
  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    initial: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
    final: NodeJS.MemoryUsage;
    growth: NodeJS.MemoryUsage;
  } {
    if (this.memorySnapshots.length === 0) {
      throw new Error('No memory snapshots available');
    }
    const initial = this.memorySnapshots[0];
    const final = this.memorySnapshots[this.memorySnapshots.length - 1];

    // Find peak memory usage
    const peak = this.memorySnapshots.reduce((max, current) => {
      return current.heapUsed > max.heapUsed ? current : max;
    }, initial);
    // Calculate growth
    const growth = {
      rss: final.rss - initial.rss,
      heapTotal: final.heapTotal - initial.heapTotal,
      heapUsed: final.heapUsed - initial.heapUsed,
      external: final.external - initial.external,
      arrayBuffers: final.arrayBuffers - initial.arrayBuffers,
    };
    return { initial, peak, final, growth };
  }
}
/**
 * Load testing utility
 */
export class LoadTester {
  private monitor = new PerformanceMonitor();
  /**
   * Execute a load test with specified concurrency
   */
  async runLoadTest(
    operationName: string,
    operation: () => Promise<any>,
    options: {
      totalOperations: number;
      concurrency: number;
      rampUpTime?: number; // ms
    }
  ): Promise<LoadTestMetrics> {
    const { totalOperations, concurrency, rampUpTime = 0 } = options;
    const startTime = performance.now();
    const initialMemory = process.memoryUsage();
    let peakMemory = initialMemory;
    const operations = [];
    const errors: Error[] = [];
    // Create batches of operations
    const batchSize = Math.ceil(totalOperations / concurrency);
    const delayBetweenBatches = rampUpTime > 0 ? rampUpTime / concurrency : 0;
    for (let i = 0; i < concurrency; i++) {
      const batchOperations = Math.min(batchSize, totalOperations - i * batchSize);

      const batch = Array.from({ length: batchOperations }, async (_, index) => {
        // Add delay for ramp-up
        if (delayBetweenBatches > 0 && i > 0) {
          await new Promise((resolve) => setTimeout(resolve, i * delayBetweenBatches));
        }
        try {
          const result = await this.monitor.measureOperation(operationName, operation, {
            batch: i,
            index,
          });

          // Update peak memory
          const currentMemory = process.memoryUsage();
          if (currentMemory.heapUsed > peakMemory.heapUsed) {
            peakMemory = currentMemory;
          }

          return result;
        } catch (error) {
          errors.push(error as Error);
          throw error;
        }
      });
      operations.push(Promise.allSettled(batch));
    }
    // Wait for all operations to complete
    const results = await Promise.all(operations);
    const endTime = performance.now();
    const finalMemory = process.memoryUsage();
    // Count successful and failed operations
    let successfulOperations = 0;
    let failedOperations = 0;
    results.forEach((batch) => {
      batch.forEach((result) => {
        if (result.status === 'fulfilled') {
          successfulOperations++;
        } else {
          failedOperations++;
        }
      });
    });
    // Calculate response time statistics
    const operationMetrics = this.monitor.getOperationMetrics(operationName);
    const durations = operationMetrics.map((m) => m.duration).sort((a, b) => a - b);
    const metrics: LoadTestMetrics = {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageResponseTime:
        durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
      minResponseTime: durations.length > 0 ? durations[0] : 0,
      maxResponseTime: durations.length > 0 ? durations[durations.length - 1] : 0,
      p95ResponseTime: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
      p99ResponseTime: durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0,
      throughput: (successfulOperations / (endTime - startTime)) * 1000, // ops per second
      errorRate: (failedOperations / totalOperations) * 100,
      memoryUsage: {
        initial: initialMemory,
        peak: peakMemory,
        final: finalMemory,
      },
      duration: endTime - startTime,
    };
    return metrics;
  }
  /**
   * Run a concurrency test with multiple users
   */
  async runConcurrencyTest(
    operationName: string,
    operation: (userId: string) => Promise<any>,
    options: {
      concurrentUsers: number;
      operationsPerUser: number;
      duration?: number; // ms
    }
  ): Promise<ConcurrencyTestMetrics> {
    const { concurrentUsers, operationsPerUser, duration } = options;
    const startTime = performance.now();
    const memorySnapshots: NodeJS.MemoryUsage[] = [];
    // Take initial memory snapshot
    memorySnapshots.push(process.memoryUsage());
    const userOperations = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      const userId = `perf-user-${userIndex}`;
      const userMetrics: PerformanceMetrics[] = [];
      let operationCount = 0;
      const executeOperation = async (): Promise<void> => {
        try {
          const endOperation = this.monitor.startOperation(operationName, {
            userId,
            operationIndex: operationCount,
          });
          await operation(userId);
          const metrics = endOperation();
          userMetrics.push(metrics);
          operationCount++;
        } catch (error) {
          const endOperation = this.monitor.startOperation(operationName, {
            userId,
            operationIndex: operationCount,
          });
          const metrics = endOperation();
          metrics.success = false;
          metrics.error = error as Error;
          userMetrics.push(metrics);
          operationCount++;
        }
      };
      if (duration) {
        // Run operations for specified duration
        const endTime = startTime + duration;
        while (performance.now() < endTime && operationCount < operationsPerUser) {
          await executeOperation();
          // Small delay to prevent overwhelming the system
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
        }
      } else {
        // Run fixed number of operations
        for (let i = 0; i < operationsPerUser; i++) {
          await executeOperation();
          // Small delay to simulate realistic usage
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
        }
      }
      // Take memory snapshot after user completes
      memorySnapshots.push(process.memoryUsage());
      return userMetrics;
    });
    // Wait for all users to complete
    const userResults = await Promise.all(userOperations);
    const endTime = performance.now();
    // Aggregate results
    const allMetrics = userResults.flat();
    const successfulOperations = allMetrics.filter((m) => m.success).length;
    const failedOperations = allMetrics.length - successfulOperations;
    const durations = allMetrics.map((m) => m.duration).sort((a, b) => a - b);
    // Count errors by type
    const errorCounts = new Map<string, number>();
    allMetrics.forEach((metric) => {
      if (metric.error) {
        const errorType = metric.error.constructor.name;
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
      }
    });
    const metrics: ConcurrencyTestMetrics = {
      concurrentUsers,
      operationsPerUser,
      totalOperations: allMetrics.length,
      successfulOperations,
      failedOperations,
      averageResponseTime:
        durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
      throughput: (successfulOperations / (endTime - startTime)) * 1000,
      errors: Array.from(errorCounts.entries()).map(([error, count]) => ({ error, count })),
      memoryUsage: memorySnapshots,
      duration: endTime - startTime,
    };
    return metrics;
  }
  /**
   * Reset the load tester
   */
  reset(): void {
    this.monitor.reset();
  }
}
/**
 * Utility to generate test data
 */
export class TestDataGenerator {
  /**
   * Generate a unique user ID
   */
  static generateUserId(suffix?: string): string {
    return `perf-user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}${suffix ? `-${suffix}` : ''}`;
  }
  /**
   * Generate a unique team ID
   */
  static generateTeamId(): string {
    return `perf-team-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  /**
   * Generate a unique token
   */
  static generateToken(): string {
    return `perf-token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  /**
   * Generate task update data
   * Returns array matching MultipleTaskUpdateRequest: { id: string; state: TaskStatus }[]
   */
  static generateTaskUpdates(
    count: number = 1
  ): Array<{ id: string; state: 'completed' | 'failed' | 'uncompleted' }> {
    const updates: Array<{ id: string; state: 'completed' | 'failed' | 'uncompleted' }> = [];

    for (let i = 0; i < count; i++) {
      const taskId = `perf-task-${i}`;
      const states: Array<'completed' | 'failed' | 'uncompleted'> = [
        'completed',
        'failed',
        'uncompleted',
      ];
      const state = states[Math.floor(Math.random() * states.length)];
      updates.push({
        id: taskId,
        state,
      });
    }

    return updates;
  }
  /**
   * Convert task updates array to Record format for database seeding
   */
  static taskUpdatesToRecord(
    updates: Array<{ id: string; state: 'completed' | 'failed' | 'uncompleted' }>
  ): Record<string, { complete: boolean; timestamp: number }> {
    const record: Record<string, { complete: boolean; timestamp: number }> = {};
    updates.forEach(({ id, state }) => {
      record[id] = {
        complete: state === 'completed',
        timestamp: Date.now(),
      };
    });
    return record;
  }

  /**
   * Generate progress data
   */
  static generateProgressData(): {
    level: number;
    gameEdition: number;
    pmcFaction: string;
    taskCompletions: Record<string, any>;
    taskObjectives: Record<string, any>;
    hideoutModules: Record<string, any>;
    hideoutParts: Record<string, any>;
  } {
    return {
      level: Math.floor(Math.random() * 70) + 1,
      gameEdition: Math.floor(Math.random() * 5) + 1,
      pmcFaction: Math.random() > 0.5 ? 'USEC' : 'BEAR',
      taskCompletions: this.taskUpdatesToRecord(this.generateTaskUpdates(10)),
      taskObjectives: {},
      hideoutModules: {},
      hideoutParts: {},
    };
  }
}
