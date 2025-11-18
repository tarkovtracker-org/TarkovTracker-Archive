import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { setLogger } from '../../../src/logger';
import { ApiError } from '../../../src/types/api';

let errorHandlerModule: typeof import('../../../src/middleware/errorHandler');
import { createTestSuite } from '../../helpers';
// Mock firebase-functions logger
const mockLogger = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};
vi.mock('firebase-functions/v2', () => ({
  logger: mockLogger,
}));
setLogger(mockLogger);
describe('middleware/errorHandler', () => {
  const suite = createTestSuite('middleware/errorHandler');
  let mockReq: any;
  let mockRes: any;
  let mockNext: NextFunction;
  beforeEach(async () => {
    await suite.beforeEach();
    setLogger(mockLogger);
    errorHandlerModule = await import('../../../src/middleware/errorHandler');

    mockReq = {
      originalUrl: '/api/test',
      method: 'GET',
      headers: {},
      body: {},
      apiToken: {
        owner: 'test-user-123',
        permissions: ['GP'],
      },
      user: {
        id: 'test-user-123',
        username: 'testuser',
      },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });
  afterEach(() => {
    setLogger();
    suite.afterEach();
  });

  describe('errorHandler middleware', () => {
    it('should handle ApiError instances correctly', () => {
      const apiError = new ApiError(404, 'Resource not found', 'NOT_FOUND');

      errorHandlerModule.errorHandler(apiError, mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Resource not found',
          meta: expect.objectContaining({
            code: 'NOT_FOUND',
            timestamp: expect.any(String),
          }),
        })
      );
      expect(mockLogger.warn).toHaveBeenCalledWith('API Error (4xx):', expect.any(Object));
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
    it('should handle ApiError instances with 5xx status codes as errors', () => {
      const apiError = new ApiError(500, 'Database connection failed', 'DB_ERROR');

      errorHandlerModule.errorHandler(apiError, mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalledWith('API Error (5xx):', expect.any(Object));
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
    it('should handle generic errors as internal server errors', () => {
      const genericError = new Error('Unexpected error occurred');

      errorHandlerModule.errorHandler(genericError, mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Internal server error',
          meta: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            timestamp: expect.any(String),
          }),
        })
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Unhandled error in API:', expect.any(Object));
    });
    it('should include debug information in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandlerModule.errorHandler(error, mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            stack: 'Error stack trace',
            context: expect.objectContaining({
              error: 'Test error',
              url: '/api/test',
              method: 'GET',
              userId: 'test-user-123',
            }),
          }),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
    it('should not include debug information in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandlerModule.errorHandler(error, mockReq, mockRes, mockNext);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.meta).not.toHaveProperty('stack');
      expect(response.meta).not.toHaveProperty('context');

      process.env.NODE_ENV = originalEnv;
    });
    it('should handle errors without apiToken or user context', () => {
      delete mockReq.apiToken;
      delete mockReq.user;

      const error = new Error('Test error');

      errorHandlerModule.errorHandler(error, mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            timestamp: expect.any(String),
          }),
        })
      );
    });
    it('should handle errors with only apiToken context', () => {
      delete mockReq.user;

      const error = new Error('Test error');

      errorHandlerModule.errorHandler(error, mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            timestamp: expect.any(String),
          }),
        })
      );
    });
    it('should handle errors with only user context', () => {
      delete mockReq.apiToken;

      const error = new Error('Test error');

      errorHandlerModule.errorHandler(error, mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            timestamp: expect.any(String),
          }),
        })
      );
    });
    it('should format error context correctly for logging', () => {
      const error = new Error('Test error');

      errorHandlerModule.errorHandler(error, mockReq, mockRes, mockNext);
      expect(mockLogger.error).toHaveBeenCalledWith('Unhandled error in API:', {
        error: 'Test error',
        stack: error.stack,
        url: '/api/test',
        method: 'GET',
        userId: 'test-user-123',
        permissions: ['GP'],
        headers: {},
        body: {},
        timestamp: expect.any(String),
      });
    });
  });
  describe('asyncHandler wrapper', () => {
    it('should wrap async functions and catch errors', async () => {
      const asyncFn = async (_req: Request, _res: Response, _next: NextFunction) => {
        throw new Error('Async error');
      };
      const wrappedFn = errorHandlerModule.asyncHandler(asyncFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Async error',
        })
      );
    });
    it('should pass through successful async functions', async () => {
      const asyncFn = async (_req: Request, res: Response, _next: NextFunction) => {
        res.json({ success: true });
      };
      const wrappedFn = errorHandlerModule.asyncHandler(asyncFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });
    it('should handle synchronous errors in wrapped functions', async () => {
      const syncFn = (_req: Request, _res: Response, _next: NextFunction) => {
        throw new Error('Sync error');
      };
      const wrappedFn = errorHandlerModule.asyncHandler(syncFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Sync error',
        })
      );
    });
  });
  describe('notFoundHandler', () => {
    it('should return 404 for unmatched routes', () => {
      errorHandlerModule.notFoundHandler(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Route GET /api/test not found',
          meta: expect.objectContaining({
            code: 'NOT_FOUND',
            timestamp: expect.any(String),
          }),
        })
      );
    });
  });
  describe('createError helper', () => {
    it('should create ApiError instances', () => {
      const error = errorHandlerModule.createError(400, 'Bad request', 'BAD_REQUEST');

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
      expect(error.code).toBe('BAD_REQUEST');
    });
    it('should create ApiError instances without code', () => {
      const error = errorHandlerModule.createError(500, 'Internal server error');

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
      expect(error.code).toBeUndefined();
    });
  });
  describe('errors object', () => {
    it('should create bad request errors', () => {
      const error = errorHandlerModule.errors.badRequest('Invalid input');

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('BAD_REQUEST');
    });
    it('should create unauthorized errors', () => {
      const error = errorHandlerModule.errors.unauthorized('Token required');

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Token required');
      expect(error.code).toBe('UNAUTHORIZED');
    });
    it('should create forbidden errors', () => {
      const error = errorHandlerModule.errors.forbidden('Access denied');

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('FORBIDDEN');
    });
    it('should create not found errors', () => {
      const error = errorHandlerModule.errors.notFound('Resource missing');

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource missing');
      expect(error.code).toBe('NOT_FOUND');
    });
    it('should create conflict errors', () => {
      const error = errorHandlerModule.errors.conflict('Resource already exists');

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Resource already exists');
      expect(error.code).toBe('CONFLICT');
    });
    it('should create unprocessable entity errors', () => {
      const error = errorHandlerModule.errors.unprocessable('Invalid data format');

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Invalid data format');
      expect(error.code).toBe('UNPROCESSABLE_ENTITY');
    });
    it('should create internal server errors', () => {
      const error = errorHandlerModule.errors.internal('Something went wrong');

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('INTERNAL_ERROR');
    });
    it('should create service unavailable errors', () => {
      const error = errorHandlerModule.errors.serviceUnavailable('Service temporarily down');

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('Service temporarily down');
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });
    it('should use default messages when no custom message provided', () => {
      const error1 = errorHandlerModule.errors.badRequest();
      const error2 = errorHandlerModule.errors.unauthorized();
      const error3 = errorHandlerModule.errors.forbidden();
      const error4 = errorHandlerModule.errors.notFound();

      expect(error1.message).toBe('Bad request');
      expect(error2.message).toBe('Unauthorized');
      expect(error3.message).toBe('Forbidden');
      expect(error4.message).toBe('Not found');
    });
  });
});
