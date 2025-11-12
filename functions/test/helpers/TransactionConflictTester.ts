/**
 * Transaction Conflict Testing Framework
 *
 * Provides utilities for testing database transaction conflicts, concurrent operations,
 * and data consistency scenarios across all services that use transactions.
 */

import { vi, expect } from 'vitest';
import { firestoreMock } from '../setup';

export interface ConflictScenario {
  conflictType: 'write-write' | 'read-write' | 'optimistic-lock' | 'deadlock' | 'timeout';
  conflictProbability: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface TransactionResult {
  success: boolean;
  attempts: number;
  error?: Error;
  conflictType?: string;
}

/**
 * Simulates various transaction conflict scenarios
 */
export class TransactionConflictTester {
  /**
   * Simulate write-write conflict (two operations trying to update same document)
   */
  static setupWriteWriteConflict(conflictProbability: number = 0.3): void {
    let callCount = 0;

    firestoreMock.runTransaction.mockImplementation(async (callback) => {
      callCount++;

      // Simulate conflict on first few attempts
      if (callCount <= 2 && Math.random() < conflictProbability) {
        throw new Error('Document already modified by another transaction');
      }

      // Create mock transaction
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ version: callCount }),
          ref: { path: 'test/doc' },
        }),
        create: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      return await callback(mockTransaction);
    });
  }

  /**
   * Simulate optimistic locking conflicts
   */
  static setupOptimisticLockConflict(conflictProbability: number = 0.4): void {
    firestoreMock.runTransaction.mockImplementation(async (callback) => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            version: 1,
            lastModified: Date.now() - 1000, // Modified 1 second ago
          }),
          ref: { path: 'test/doc' },
        }),
        update: vi.fn().mockImplementation((docRef, updates) => {
          // Simulate version conflict
          if (Math.random() < conflictProbability) {
            throw new Error('Version conflict: document was modified');
          }
        }),
        create: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };

      return await callback(mockTransaction);
    });
  }

  /**
   * Simulate transaction timeout scenarios
   */
  static setupTransactionTimeout(timeoutMs: number = 5000): void {
    firestoreMock.runTransaction.mockImplementation(async (callback) => {
      // Simulate long-running transaction
      await new Promise((resolve) => setTimeout(resolve, timeoutMs + 100));

      const mockTransaction = {
        get: vi.fn(),
        create: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      return await callback(mockTransaction);
    });
  }

  /**
   * Simulate deadlock scenarios
   */
  static setupDeadlockScenario(): void {
    let activeTransactions = 0;

    firestoreMock.runTransaction.mockImplementation(async (callback) => {
      activeTransactions++;

      try {
        // Simulate deadlock when multiple transactions are active
        if (activeTransactions > 1 && Math.random() < 0.7) {
          throw new Error('Deadlock detected');
        }

        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ locked: true }),
            ref: { path: 'test/doc' },
          }),
          create: vi.fn(),
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        };

        return await callback(mockTransaction);
      } finally {
        activeTransactions--;
      }
    });
  }

  /**
   * Simulate read-write conflicts
   */
  static setupReadWriteConflict(conflictProbability: number = 0.3): void {
    firestoreMock.runTransaction.mockImplementation(async (callback) => {
      const mockTransaction = {
        get: vi.fn().mockImplementation((docRef) => {
          // Simulate read conflict
          if (Math.random() < conflictProbability) {
            throw new Error('Read conflict: document locked by another transaction');
          }

          return Promise.resolve({
            exists: true,
            data: () => ({ value: 'test' }),
            ref: docRef,
          });
        }),
        create: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      return await callback(mockTransaction);
    });
  }

  /**
   * Reset all transaction mocking
   */
  static resetTransactionMocks(): void {
    vi.mocked(firestoreMock.runTransaction).mockReset();
  }
}

/**
 * Test concurrent transaction operations
 */
export class ConcurrencyTester {
  /**
   * Test multiple concurrent operations on the same document
   */
  static async testConcurrentUpdates(
    operations: Array<() => Promise<any>>,
    conflictScenario: ConflictScenario
  ): Promise<TransactionResult[]> {
    // Setup conflict scenario
    switch (conflictScenario.conflictType) {
      case 'write-write':
        TransactionConflictTester.setupWriteWriteConflict(conflictScenario.conflictProbability);
        break;
      case 'optimistic-lock':
        TransactionConflictTester.setupOptimisticLockConflict(conflictScenario.conflictProbability);
        break;
      case 'read-write':
        TransactionConflictTester.setupReadWriteConflict(conflictScenario.conflictProbability);
        break;
      case 'deadlock':
        TransactionConflictTester.setupDeadlockScenario();
        break;
      case 'timeout':
        TransactionConflictTester.setupTransactionTimeout();
        break;
    }

    // Execute concurrent operations
    const results: TransactionResult[] = [];
    const promises = operations.map(async (operation, index) => {
      const result: TransactionResult = {
        success: false,
        attempts: 1,
      };

      try {
        await operation();
        result.success = true;
      } catch (error) {
        result.error = error as Error;
        result.conflictType = conflictScenario.conflictType;
      }

      results.push(result);
      return result;
    });

    await Promise.allSettled(promises);
    TransactionConflictTester.resetTransactionMocks();

    return results;
  }

  /**
   * Test transaction retry behavior
   */
  static async testTransactionRetryBehavior(
    operation: () => Promise<any>,
    maxRetries: number = 3
  ): Promise<{
    totalAttempts: number;
    success: boolean;
    error?: Error;
  }> {
    let attempts = 0;
    let lastError: Error | undefined;

    // Setup conflicts that will eventually succeed
    let callCount = 0;
    firestoreMock.runTransaction.mockImplementation(async (callback) => {
      callCount++;
      attempts++;

      if (callCount < maxRetries) {
        lastError = new Error(`Retryable error (attempt ${callCount})`);
        throw lastError;
      }

      // Succeed on last attempt
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ success: true }),
          ref: { path: 'test/doc' },
        }),
        create: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      return await callback(mockTransaction);
    });

    try {
      await operation();
      TransactionConflictTester.resetTransactionMocks();
      return { totalAttempts: attempts, success: true };
    } catch (error) {
      TransactionConflictTester.resetTransactionMocks();
      return {
        totalAttempts: attempts,
        success: false,
        error: error as Error,
      };
    }
  }
}

/**
 * Data consistency verification utilities
 */
export class ConsistencyVerifier {
  /**
   * Verify that concurrent operations maintain data consistency
   */
  static verifyDataConsistency(
    expectedState: any,
    actualState: any
  ): {
    isConsistent: boolean;
    differences: Array<{ path: string; expected: any; actual: any }>;
  } {
    const differences: Array<{ path: string; expected: any; actual: any }> = [];

    const compareObjects = (expected: any, actual: any, path: string = ''): void => {
      if (typeof expected !== typeof actual) {
        differences.push({ path, expected, actual });
        return;
      }

      if (expected === null || actual === null) {
        if (expected !== actual) {
          differences.push({ path, expected, actual });
        }
        return;
      }

      if (typeof expected === 'object') {
        const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
        for (const key of keys) {
          compareObjects(expected[key], actual[key], path ? `${path}.${key}` : key);
        }
      } else if (expected !== actual) {
        differences.push({ path, expected, actual });
      }
    };

    compareObjects(expectedState, actualState);

    return {
      isConsistent: differences.length === 0,
      differences,
    };
  }

  /**
   * Verify atomic transaction behavior
   */
  static async verifyAtomicity(
    operations: Array<() => Promise<void>>,
    shouldSucceed: boolean
  ): Promise<{
    allSucceeded: boolean;
    allFailed: boolean;
    partialSuccess: boolean;
  }> {
    const results = await Promise.allSettled(
      operations.map((op) => op().catch((error) => ({ error })))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      allSucceeded: succeeded === operations.length,
      allFailed: failed === operations.length,
      partialSuccess: succeeded > 0 && failed > 0,
    };
  }
}

/**
 * Custom matchers for transaction testing
 */
export const TransactionMatchers = {
  /**
   * Expect operation to handle conflicts gracefully
   */
  toHandleConflictsGracefully: (received: () => Promise<any>) => {
    return {
      name: 'toHandleConflictsGracefully',
      async test() {
        try {
          await received();
          return {
            message: () => 'Expected operation to handle conflicts gracefully',
            pass: true,
          };
        } catch (error) {
          return {
            message: () => `Operation failed with: ${(error as Error).message}`,
            pass: false,
          };
        }
      },
    };
  },

  /**
   * Expect operation to maintain data consistency
   */
  toMaintainDataConsistency: (received: { expected: any; actual: any }) => {
    return {
      name: 'toMaintainDataConsistency',
      test() {
        const { isConsistent, differences } = ConsistencyVerifier.verifyDataConsistency(
          received.expected,
          received.actual
        );

        return {
          message: () =>
            isConsistent
              ? 'Data consistency maintained'
              : `Data inconsistencies found: ${JSON.stringify(differences)}`,
          pass: isConsistent,
        };
      },
    };
  },
};

/**
 * Performance impact testing for transactions
 */
export class TransactionPerformanceTester {
  /**
   * Measure transaction performance under conflict load
   */
  static async measureConflictPerformance(
    operation: () => Promise<any>,
    conflictProbability: number,
    iterations: number = 10
  ): Promise<{
    averageTime: number;
    successRate: number;
    conflictRate: number;
  }> {
    const times: number[] = [];
    let successes = 0;
    let conflicts = 0;

    TransactionConflictTester.setupWriteWriteConflict(conflictProbability);

    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = performance.now();
        await operation();
        const endTime = performance.now();

        times.push(endTime - startTime);
        successes++;
      } catch (error) {
        if (
          (error as Error).message.includes('conflict') ||
          (error as Error).message.includes('modified')
        ) {
          conflicts++;
        }
      }
    }

    TransactionConflictTester.resetTransactionMocks();

    return {
      averageTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      successRate: successes / iterations,
      conflictRate: conflicts / iterations,
    };
  }
}
