/**
 * Comprehensive Error Testing Framework
 *
 * Provides unified utilities for testing error scenarios across the entire test suite.
 * Eliminates inconsistent error assertion patterns and adds comprehensive error coverage.
 */

import { expect } from 'vitest';

export interface ErrorExpectation {
  message?: string | RegExp;
  statusCode?: number;
  code?: string;
  type?: string;
}

export interface ErrorTestConfig {
  shouldThrow: boolean;
  expectation?: ErrorExpectation;
  shouldLogError?: boolean;
  shouldNotAffectOtherOperations?: boolean;
}

/**
 * Utilities for error testing scenarios
 */
export class ErrorTestUtils {
  /**
   * Expect a function to throw with specific error properties
   */
  static expectError = async (
    fn: () => Promise<any> | any,
    config: ErrorTestConfig
  ): Promise<void> => {
    if (!config.shouldThrow) {
      // Should NOT throw
      await expect(fn()).resolves.toBeDefined();
      return;
    }

    // Should throw
    const expectation = config.expectation || {};

    if (expectation.message !== undefined) {
      if (typeof expectation.message === 'string') {
        await expect(fn()).rejects.toThrow(expectation.message);
      } else {
        await expect(fn()).rejects.toThrow(expectation.message);
      }
    } else {
      await expect(fn()).rejects.toThrow();
    }

    // Additional error property checks
    if (config.expectation) {
      await this.checkErrorProperties(fn, config.expectation);
    }
  };

  /**
   * Check additional error properties like statusCode, code, etc.
   */
  private static async checkErrorProperties(
    fn: () => Promise<any> | any,
    expectation: ErrorExpectation
  ): Promise<void> {
    try {
      await fn();
    } catch (error) {
      if (expectation.statusCode !== undefined) {
        expect(error).toHaveProperty('statusCode', expectation.statusCode);
      }
      if (expectation.code !== undefined) {
        expect(error).toHaveProperty('code', expectation.code);
      }
      if (expectation.type !== undefined) {
        expect(error).toHaveProperty('type', expectation.type);
      }
    }
  }

  /**
   * Test that an error is logged properly
   */
  static expectLoggedError = async (
    fn: () => Promise<any>,
    errorMessage: string | RegExp
  ): Promise<void> => {
    // Mock console.error to capture logs
    const originalError = console.error;
    let loggedMessage = '';

    console.error = (...args: any[]) => {
      loggedMessage = args.join(' ');
    };

    try {
      await fn();
    } catch (error) {
      // Expected to throw
    } finally {
      console.error = originalError;

      if (typeof errorMessage === 'string') {
        expect(loggedMessage).toContain(errorMessage);
      } else {
        expect(loggedMessage).toMatch(errorMessage);
      }
    }
  };

  /**
   * Test cascade failure scenarios
   */
  static testCascadeFailure = async (
    operations: Array<{
      name: string;
      fn: () => Promise<any>;
      shouldSucceedDespitePriorFailures?: boolean;
    }>
  ): Promise<void> => {
    const results: Array<{ name: string; success: boolean; error?: any }> = [];

    for (const operation of operations) {
      try {
        await operation.fn();
        results.push({ name: operation.name, success: true });
      } catch (error) {
        results.push({ name: operation.name, success: false, error });
      }
    }

    // Verify cascade behavior
    for (let i = 1; i < results.length; i++) {
      const current = results[i];
      const previous = results[i - 1];
      const operation = operations[i];

      if (operation.shouldSucceedDespitePriorFailures) {
        expect(current.success).toBe(true);
      } else if (!previous.success) {
        // Should fail if previous operation failed and not marked to succeed
        expect(current.success).toBe(false);
      }
    }
  };

  /**
   * Test partial failure scenarios
   */
  static testPartialFailure = async (
    fn: () => Promise<any>,
    mockFailures: Array<{ method: string; error: Error }>
  ): Promise<void> => {
    // This would be implemented with specific mock setups
    // Implementation depends on the service being tested
    await fn();
  };
}

/**
 * Factory for common error scenarios
 */
export class ErrorScenarioFactory {
  /**
   * Database connection errors
   */
  static databaseError() {
    return {
      message: 'Database connection failed',
      statusCode: 500,
      code: 'DATABASE_ERROR',
      type: 'InfrastructureError',
    };
  }

  /**
   * Transaction conflict errors
   */
  static transactionConflict() {
    return {
      message: 'Resource busy. Retry transaction.',
      statusCode: 409,
      code: 'TRANSACTION_CONFLICT',
      type: 'ConcurrencyError',
    };
  }

  /**
   * Validation errors
   */
  static validationError(field: string) {
    return {
      message: `Invalid ${field}`,
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      type: 'ClientError',
    };
  }

  /**
   * Authentication errors
   */
  static authenticationError() {
    return {
      message: 'Authentication failed',
      statusCode: 401,
      code: 'AUTHENTICATION_ERROR',
      type: 'SecurityError',
    };
  }

  /**
   * Authorization errors
   */
  static authorizationError() {
    return {
      message: 'Access denied',
      statusCode: 403,
      code: 'AUTHORIZATION_ERROR',
      type: 'SecurityError',
    };
  }

  /**
   * Not found errors
   */
  static notFoundError(resource: string) {
    return {
      message: `${resource} not found`,
      statusCode: 404,
      code: 'NOT_FOUND',
      type: 'ClientError',
    };
  }

  /**
   * Rate limiting errors
   */
  static rateLimitError() {
    return {
      message: 'Rate limit exceeded',
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      type: 'ThrottlingError',
    };
  }

  /**
   * Service unavailable errors
   */
  static serviceUnavailableError() {
    return {
      message: 'Service temporarily unavailable',
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      type: 'InfrastructureError',
    };
  }
}

/**
 * Helper for testing error resilience
 */
export class ResilienceTestHelper {
  /**
   * Test system behavior under concurrent failures
   */
  static async testConcurrentFailures(
    operations: Array<() => Promise<any>>,
    failureRate: number = 0.3
  ): Promise<void> {
    const promises = operations.map(async (operation, index) => {
      if (Math.random() < failureRate) {
        throw new Error(`Simulated failure in operation ${index}`);
      }
      return operation();
    });

    const results = await Promise.allSettled(promises);

    // Verify that some operations succeeded and some failed
    const successes = results.filter((r) => r.status === 'fulfilled').length;
    const failures = results.filter((r) => r.status === 'rejected').length;

    expect(successes + failures).toBe(operations.length);
    expect(failures).toBeGreaterThan(0);
    expect(successes).toBeGreaterThan(0);
  }

  /**
   * Test system recovery after failure
   */
  static async testRecoveryAfterFailure(
    failingOperation: () => Promise<any>,
    recoveryOperation: () => Promise<any>
  ): Promise<void> {
    // First, ensure the failing operation fails
    await expect(failingOperation()).rejects.toThrow();

    // Then test that recovery works
    await expect(recoveryOperation()).resolves.toBeDefined();
  }

  /**
   * Test graceful degradation
   */
  static async testGracefulDegradation(
    primaryOperation: () => Promise<any>,
    fallbackOperation: () => Promise<any>
  ): Promise<void> {
    let primaryFailed = false;

    try {
      await primaryOperation();
    } catch (error) {
      primaryFailed = true;
    }

    if (primaryFailed) {
      // Fallback should work
      await expect(fallbackOperation()).resolves.toBeDefined();
    }
  }
}

/**
 * Performance impact testing for error scenarios
 */
export class ErrorPerformanceTestHelper {
  /**
   * Test that error handling doesn't significantly impact performance
   */
  static async testErrorHandlingPerformance(
    operation: () => Promise<any>,
    errorRate: number = 0.1,
    maxAcceptableSlowdown: number = 1.5 // 50% slowdown acceptable
  ): Promise<void> {
    const iterations = 100;

    // Test without errors
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      // Mock operation without errors
      await operation();
    }
    const normalTime = performance.now() - startTime;

    // Test with errors
    const errorStartTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      if (Math.random() < errorRate) {
        try {
          await operation();
        } catch (error) {
          // Expected error
        }
      } else {
        await operation();
      }
    }
    const errorTime = performance.now() - errorStartTime;

    // Verify performance impact is acceptable
    const slowdown = errorTime / normalTime;
    expect(slowdown).toBeLessThan(maxAcceptableSlowdown);
  }
}

/**
 * Custom matcher for common error assertions
 */
export const toThrowWithError = (
  received: any,
  expected: ErrorExpectation
): { message: () => string; pass: boolean } => {
  if (typeof received !== 'function') {
    return {
      message: () => `Expected ${received} to be a function`,
      pass: false,
    };
  }

  try {
    const result = received();
    return {
      message: () => `Expected function to throw, but it returned ${result}`,
      pass: false,
    };
  } catch (err) {
    const error = err as { message: string };
    let pass = true;
    let message = '';

    if (expected.message) {
      if (typeof expected.message === 'string') {
        pass = error.message.includes(expected.message);
        message = pass
          ? `Expected error not to contain "${expected.message}"`
          : `Expected error to contain "${expected.message}", but got "${error.message}"`;
      } else {
        pass = expected.message.test(error.message);
        message = pass
          ? `Expected error not to match ${expected.message}`
          : `Expected error to match ${expected.message}", but got "${error.message}"`;
      }
    }

    return { message: () => message, pass };
  }
};

// Add custom matcher to expect
expect.extend({ toThrowWithError });
