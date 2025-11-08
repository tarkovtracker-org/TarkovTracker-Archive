import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from '../errorHandler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    errorHandler.clearErrors();
  });

  describe('generateErrorId', () => {
    it('should generate error IDs with err_ prefix', () => {
      const errorId = errorHandler.handleError('Test error');
      expect(errorId).toMatch(/^err_/);
    });

    it('should generate unique error IDs', () => {
      const id1 = errorHandler.handleError('Error 1');
      const id2 = errorHandler.handleError('Error 2');
      expect(id1).not.toBe(id2);
    });

    it('should use fallback when crypto methods are unavailable', () => {
      // Mock crypto methods as unavailable (not functions)
      const originalRandomUUID = global.crypto.randomUUID;
      const originalGetRandomValues = global.crypto.getRandomValues;

      // @ts-expect-error - Testing unavailable methods
      global.crypto.randomUUID = undefined;
      // @ts-expect-error - Testing unavailable methods
      global.crypto.getRandomValues = undefined;

      const errorId = errorHandler.handleError('Test error without crypto methods');
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/); // Should use timestamp fallback format

      // Restore crypto methods
      global.crypto.randomUUID = originalRandomUUID;
      global.crypto.getRandomValues = originalGetRandomValues;
    });

    it('should fallback when crypto.randomUUID throws', () => {
      const originalRandomUUID = global.crypto.randomUUID;
      global.crypto.randomUUID = vi.fn(() => {
        throw new Error('randomUUID not available');
      });

      const errorId = errorHandler.handleError('Test error with randomUUID failure');
      expect(errorId).toMatch(/^err_/);

      // Restore
      global.crypto.randomUUID = originalRandomUUID;
    });
  });

  describe('handleError', () => {
    it('should handle Error instances', () => {
      const error = new Error('Test error message');
      const _errorId = errorHandler.handleError(error, 'TestContext');

      const errors = errorHandler.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Test error message');
      expect(errors[0].context).toBe('TestContext');
    });

    it('should handle string errors', () => {
      const _errorId = errorHandler.handleError('Simple string error');

      const errors = errorHandler.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Simple string error');
    });

    it('should handle unknown error types', () => {
      const _errorId = errorHandler.handleError({ custom: 'object' });

      const errors = errorHandler.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('[object Object]');
    });

    it('should include additional details', () => {
      const details = { userId: '123', action: 'login' };
      errorHandler.handleError('Login failed', 'Auth', details);

      const errors = errorHandler.getErrors();
      expect(errors[0].details).toEqual(details);
    });
  });

  describe('handleAsyncError', () => {
    it('should handle async errors and re-throw', async () => {
      const promise = Promise.reject(new Error('Async error'));

      await expect(errorHandler.handleAsyncError(promise, 'AsyncContext')).rejects.toThrow(
        'Async error'
      );

      const errors = errorHandler.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].context).toBe('AsyncContext');
    });

    it('should preserve resolved values', async () => {
      const promise = Promise.resolve('success');

      const result = await errorHandler.handleAsyncError(promise, 'AsyncContext');
      expect(result).toBe('success');

      const errors = errorHandler.getErrors();
      expect(errors).toHaveLength(0);
    });
  });

  describe('error management', () => {
    it('should limit stored errors to maxErrors', () => {
      // Generate more than 50 errors
      for (let i = 0; i < 60; i++) {
        errorHandler.handleError(`Error ${i}`);
      }

      const errors = errorHandler.getErrors();
      expect(errors.length).toBeLessThanOrEqual(50);
    });

    it('should keep most recent errors', () => {
      for (let i = 0; i < 60; i++) {
        errorHandler.handleError(`Error ${i}`);
      }

      const errors = errorHandler.getErrors();
      // Most recent error should be Error 59
      expect(errors[0].message).toBe('Error 59');
    });

    it('should filter errors by context', () => {
      errorHandler.handleError('Error 1', 'Context A');
      errorHandler.handleError('Error 2', 'Context B');
      errorHandler.handleError('Error 3', 'Context A');

      const contextAErrors = errorHandler.getErrorsByContext('Context A');
      expect(contextAErrors).toHaveLength(2);
    });

    it('should clear errors by context', () => {
      errorHandler.handleError('Error 1', 'Context A');
      errorHandler.handleError('Error 2', 'Context B');

      errorHandler.clearErrorsByContext('Context A');

      const allErrors = errorHandler.getErrors();
      expect(allErrors).toHaveLength(1);
      expect(allErrors[0].context).toBe('Context B');
    });
  });

  describe('user ID tracking', () => {
    it('should include user ID when provider is set', () => {
      errorHandler.setUserIdProvider(() => 'user-123');

      errorHandler.handleError('Test error');

      const errors = errorHandler.getErrors();
      expect(errors[0].userId).toBe('user-123');
    });

    it('should handle undefined user ID', () => {
      errorHandler.setUserIdProvider(() => undefined);

      errorHandler.handleError('Test error');

      const errors = errorHandler.getErrors();
      expect(errors[0].userId).toBeUndefined();
    });

    it('should throw if provider is not a function', () => {
      // @ts-expect-error - Testing invalid input
      expect(() => errorHandler.setUserIdProvider('not a function')).toThrow(
        'User ID provider must be a function'
      );
    });
  });

  describe('safeStringifyError', () => {
    it('should handle null', () => {
      errorHandler.handleError(null);
      const errors = errorHandler.getErrors();
      expect(errors[0].message).toBe('null');
    });

    it('should handle undefined', () => {
      errorHandler.handleError(undefined);
      const errors = errorHandler.getErrors();
      expect(errors[0].message).toBe('undefined');
    });

    it('should handle circular references', () => {
      const circular: Record<string, unknown> = { name: 'circular' };
      circular.self = circular;

      errorHandler.handleError(circular);
      const errors = errorHandler.getErrors();
      // Should not throw and should produce some output
      expect(errors[0].message).toBeTruthy();
    });
  });
});
