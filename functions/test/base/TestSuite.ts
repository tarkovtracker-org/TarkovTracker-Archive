/**
 * Base class for service tests to ensure consistency and reduce duplication
 * Provides standard setup, teardown, and assertion methods
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ServiceTestHelpers } from '../helpers/TestHelpers';

export abstract class TestSuite {
  protected mockState: any = {};

  /**
   * Must be implemented by child classes
   */
  protected abstract getServiceUnderTest(): any;

  /**
   * Optional override for custom test setup
   */
  protected getCustomTestData(): any {
    return {};
  }

  /**
   * Standard test setup for all service tests
   */
  protected setupTest() {
    this.mockState = ServiceTestHelpers.setupServiceTest(this.getCustomTestData());
  }

  /**
   * Standard cleanup after each test
   */
  protected cleanupTest() {
    vi.clearAllMocks();
  }

  /**
   * Helper method for standard error testing
   */
  protected expectAsyncError(
    asyncFn: () => Promise<any>, 
    expectedStatus: number, 
    expectedMessage?: string
  ) {
    return ServiceTestHelpers.expectAsyncError(asyncFn, expectedStatus, expectedMessage);
  }

  /**
   * Helper for verifying mock calls
   */
  protected expectMockCall(mock: any, expectedArgs: any[], callIndex = 0) {
    ServiceTestHelpers.expectMockCall(mock, expectedArgs, callIndex);
  }

  /**
   * Creates a standard test with error handling
   */
  protected createErrorTest(
    testName: string,
    testFn: () => Promise<any>,
    expectedError: { status: number; message?: string }
  ) {
    it(`should throw ${expectedError.status} error when ${testName}`, async () => {
      await this.expectAsyncError(testFn, expectedError.status, expectedError.message);
    });
  }

  /**
   * Creates a standard success test
   */
  protected createSuccessTest(
    testName: string,
    testFn: () => Promise<any>,
    expectedResult?: any
  ) {
    it(`should ${testName}`, async () => {
      const result = await testFn();
      if (expectedResult !== undefined) {
        expect(result).toEqual(expectedResult);
      }
    });
  }
}

/**
 * Factory function to create test suites with standard beforeEach pattern
 */
export function createTestSuite(
  suiteName: string,
  testSuiteClass: new () => TestSuite,
  testDefinitions: (suite: TestSuite) => void
) {
  describe(suiteName, () => {
    let suite: TestSuite;

    beforeEach(() => {
      suite = new testSuiteClass();
      suite.setupTest();
    });

    afterEach(() => {
      suite.cleanupTest();
    });

    testDefinitions(suite);
  });
}
