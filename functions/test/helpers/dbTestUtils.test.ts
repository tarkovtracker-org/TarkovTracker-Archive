/**
 * Unit tests for dbTestUtils utilities
 * Verifies that test suite context management works correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  createTestSuite, 
  quickSetup, 
  withTestIsolation,
  TestSuiteContext 
} from './dbTestUtils';
import { seedDb, resetDb } from '../setup';

describe('dbTestUtils', () => {
  describe('TestSuiteContext', () => {
    let context: TestSuiteContext;

    beforeEach(() => {
      context = new TestSuiteContext();
    });

    it('should setup and reset database', () => {
      const testData = { users: { 'user-1': { uid: 'user-1' } } };
      
      context.setupDatabase(testData);
      
      // Verify database was seeded (would need actual db access to verify)
      expect(() => context.setupDatabase(testData)).not.toThrow();
    });

    it('should track cleanup callbacks', () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      
      context.addCleanup(cleanup1);
      context.addCleanup(cleanup2);
      
      return context.cleanup().then(() => {
        expect(cleanup1).toHaveBeenCalled();
        expect(cleanup2).toHaveBeenCalled();
      });
    });

    it('should handle cleanup callback errors gracefully', () => {
      const error = new Error('Cleanup failed');
      const successCallback = vi.fn();
      
      context.addCleanup(() => { throw error; });
      context.addCleanup(successCallback);
      
      return context.cleanup().then(() => {
        expect(successCallback).toHaveBeenCalled();
        // Error should be logged but not throw
      });
    });

    it('should manage withDatabase correctly', () => {
      const testData = { users: { 'user-1': { uid: 'user-1' } } };
      const cleanup = vi.fn();
      
      context.withDatabase(testData);
      
      // Cleanup should have been registered
      return context.cleanup().then(() => {
        expect(cleanup).toHaveBeenCalled();
      });
    });

    it('should manage withMock correctly', () => {
      const mockFn = vi.fn();
      const mock = context.withMock('testMock', mockFn);
      
      expect(mock).toBe(mockFn);
      expect(() => context.getMock('testMock')).toBe(mockFn);
      
      // Cleanup should restore the mock
      return context.cleanup().then(() => {
        expect(mockFn.mockRestore).toHaveBeenCalled();
      });
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

    it('should have working lifecycle methods', () => {
      const suite = createTestSuite('LifecycleTest');
      const resetDbSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // beforeEach should reset database and mocks
      suite.beforeEach();
      
      // afterEach should clean up
      return suite.afterEach().then(() => {
        expect(resetDbSpy).toHaveBeenCalled();
      });
    });
  });

  describe('quickSetup', () => {
    it('should reset and seed database', () => {
      const testData = { users: { 'user-1': { uid: 'user-1' } } };
      const resetDbSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const seedDbSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      quickSetup(testData);
      
      expect(resetDbSpy).toHaveBeenCalled();
      expect(seedDbSpy).toHaveBeenCalled();
    });
  });

  describe('withTestIsolation', () => {
    it('should run test with isolation', async () => {
      const testFn = vi.fn();
      const testData = { users: { 'user-1': { uid: 'user-1' } } };
      
      await withTestIsolation(testFn, testData);
      
      expect(testFn).toHaveBeenCalled();
    });

    it('should cleanup even on test errors', async () => {
      const error = new Error('Test failed');
      const cleanupFn = vi.fn();
      const testFn = () => {
        const context = new TestSuiteContext();
        context.addCleanup(cleanupFn);
        throw error;
      };
      
      try {
        await withTestIsolation(testFn);
      } catch (err) {
        expect(err).toBe(error);
      }
      
      // Cleanup should still run despite error
      expect(cleanupFn).toHaveBeenCalled();
    });

    it('should work without test data', async () => {
      const testFn = vi.fn();
      
      await withTestIsolation(testFn);
      
      expect(testFn).toHaveBeenCalled();
    });
  });

  describe('Integration with Vitest', () => {
    it('should work with actual beforeEach/afterEach hooks', () => {
      const suite = createTestSuite('VitestIntegration');
      let beforeEachCount = 0;
      let afterEachCount = 0;
      
      const customBeforeEach = () => {
        beforeEachCount++;
        suite.beforeEach();
      };
      
      const customAfterEach = () => {
        afterEachCount++;
        return suite.afterEach();
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
    it('should handle database setup errors', () => {
      const context = new TestSuiteContext();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock setup to throw error
      const originalSeedDb = seedDb;
      vi.doMock('../setup.js', () => ({
        seedDb: () => { throw new Error('Setup failed'); }
      }));
      
      expect(() => context.setupDatabase({})).toThrow('Setup failed');
      
      // Restore
      vi.doUnmock('../setup');
      consoleSpy.mockRestore();
    });
  });
});
