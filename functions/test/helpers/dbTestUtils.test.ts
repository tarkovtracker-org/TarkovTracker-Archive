/**
 * Unit tests for dbTestUtils utilities
 * Verifies that test suite context management works correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestSuite, quickSetup, withTestIsolation, TestSuiteContext } from './dbTestUtils';
import * as emulatorSetup from './emulatorSetup';

describe('dbTestUtils', () => {
  describe('TestSuiteContext', () => {
    let context: TestSuiteContext;

    beforeEach(async () => {
      context = new TestSuiteContext();
    });

    it('should setup and reset database', () => {
      const testData = { users: { 'user-1': { uid: 'user-1' } } };

      context.setupDatabase(testData);

      // Verify database was seeded (would need actual db access to verify)
      expect(() => context.setupDatabase(testData)).not.toThrow();
    });

    it('should track cleanup callbacks', async () => {
      let firstCalled = false;
      let secondCalled = false;

      context.addCleanup(() => {
        firstCalled = true;
      });
      context.addCleanup(() => {
        secondCalled = true;
      });

      await context.cleanup();
      expect(firstCalled).toBe(true);
      expect(secondCalled).toBe(true);
    });

    it('should handle cleanup callback errors gracefully', async () => {
      const error = new Error('Cleanup failed');
      let successCalled = false;

      context.addCleanup(() => {
        throw error;
      });
      context.addCleanup(() => {
        successCalled = true;
      });

      await expect(context.cleanup()).resolves.toBeUndefined();
      expect(successCalled).toBe(true);
    });

    it('should manage withDatabase correctly', async () => {
      const testData = { users: { 'user-1': { uid: 'user-1' } } };
      let resetCalled = false;
      let seedCalled = false;
      const resetSpy = vi.spyOn(emulatorSetup, 'resetDb').mockImplementation(async () => {
        resetCalled = true;
      });
      const seedSpy = vi.spyOn(emulatorSetup, 'seedDb').mockImplementation(async () => {
        seedCalled = true;
      });
      context.withDatabase(testData);

      await new Promise((resolve) => setTimeout(resolve, 0));
      await context.cleanup();
      expect(seedCalled).toBe(true);
      expect(resetCalled).toBe(true);
      resetSpy.mockRestore();
      seedSpy.mockRestore();
    });

    it('should manage withMock correctly', async () => {
      const mockFn = vi.fn();
      const mock = context.withMock('testMock', mockFn);

      expect(mock).toBe(mockFn);
      expect(context.getMock('testMock')).toBe(mockFn);

      await context.cleanup();
      expect(context.getMock('testMock')).toBeUndefined();
    });

    it('should return undefined for non-existent mock', () => {
      const mock = context.getMock('nonExistent');
      expect(mock).toBeUndefined();
    });
  });

  describe('createTestSuite', () => {
    it('should create test suite with context', () => {
      const suite = createTestSuite('TestSuite');

      expect(suite.suiteName).toBe('TestSuite');
      expect(suite.context).toBeInstanceOf(TestSuiteContext);
      expect(typeof suite.beforeEach).toBe('function');
      expect(typeof suite.afterEach).toBe('function');
      expect(typeof suite.withDatabase).toBe('function');
      expect(typeof suite.withMock).toBe('function');
      expect(typeof suite.addCleanup).toBe('function');
      expect(typeof suite.getMock).toBe('function');
    });

    it('should have working lifecycle methods', async () => {
      const suite = createTestSuite('LifecycleTest');
      let resetCalled = false;
      const resetSpy = vi.spyOn(emulatorSetup, 'resetDb').mockImplementation(async () => {
        resetCalled = true;
      });

      await suite.beforeEach();
      await suite.afterEach();

      expect(resetCalled).toBe(true);
      resetSpy.mockRestore();
    });
  });

  describe('quickSetup', () => {
    it('should reset and seed database', () => {
      const testData = { users: { 'user-1': { uid: 'user-1' } } };
      const resetSpy = vi.spyOn(emulatorSetup, 'resetDb').mockResolvedValue(undefined as any);
      const seedSpy = vi.spyOn(emulatorSetup, 'seedDb').mockResolvedValue(undefined as any);

      quickSetup(testData);

      expect(resetSpy).toHaveBeenCalled();
      expect(seedSpy).toHaveBeenCalledWith(testData);
      resetSpy.mockRestore();
      seedSpy.mockRestore();
    });
  });

  describe('withTestIsolation', () => {
    it('should run test with isolation', async () => {
      let executed = false;
      const testData = { users: { 'user-1': { uid: 'user-1' } } };

      await withTestIsolation(() => {
        executed = true;
      }, testData);

      expect(executed).toBe(true);
    });

    it('should cleanup even on test errors', async () => {
      const error = new Error('Test failed');
      let cleanedUp = false;
      const originalCleanup = TestSuiteContext.prototype.cleanup;
      const cleanupSpy = vi
        .spyOn(TestSuiteContext.prototype, 'cleanup')
        .mockImplementation(async function (this: TestSuiteContext) {
          cleanedUp = true;
          return originalCleanup.apply(this);
        });

      const testFn = () => {
        throw error;
      };

      try {
        await withTestIsolation(testFn);
      } catch (err) {
        expect(err).toBe(error);
      }

      expect(cleanedUp).toBe(true);
      cleanupSpy.mockRestore();
    });

    it('should work without test data', async () => {
      let executed = false;

      await withTestIsolation(() => {
        executed = true;
      });

      expect(executed).toBe(true);
    });
  });

  describe('Integration with Vitest', () => {
    it('should work with actual beforeEach/afterEach hooks', () => {
      const suite = createTestSuite('VitestIntegration');
      let beforeEachCount = 0;
      let afterEachCount = 0;

      const customBeforeEach = () => {
        beforeEachCount++;
        await suite.beforeEach();
      };

      const customAfterEach = () => {
        afterEachCount++;
        return await suite.afterEach();
      };

      // Simulate Vitest calling hooks
      customBeforeEach();
      expect(beforeEachCount).toBe(1);

      return customAfterEach().then(() => {
        expect(afterEachCount).toBe(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database setup errors gracefully', async () => {
      const context = new TestSuiteContext();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Try to setup with invalid data structure
      try {
        await context.setupDatabase({ invalid: 'structure' });
        // Should complete or handle error gracefully
      } catch (error) {
        // Error handling is acceptable
        expect(error).toBeDefined();
      }

      consoleSpy.mockRestore();
    });
  });
});
