import { Request, Response, NextFunction } from 'express';
import { logger } from 'firebase-functions/v2';
import { ApiError, ApiResponse } from '../types/api.js';

// Enhanced request interface for error context
interface ErrorRequest extends Request {
  apiToken?: {
    owner: string;
    permissions: string[];
  };
  user?: {
    id: string;
    username?: string;
  };
}

/**
 * Centralized error handling middleware
 * Converts errors to consistent API response format
 */
export const errorHandler = (
  error: Error,
  req: ErrorRequest,
  res: Response,
  _next: NextFunction
): void => {
  // Build error context for logging
  const errorContext = {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.apiToken?.owner || req.user?.id,
    permissions: req.apiToken?.permissions,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString(),
  };

  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let errorCode = 'INTERNAL_ERROR';

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    errorMessage = error.message;
    errorCode = (error as ApiError & { code?: string }).code || 'API_ERROR';

    // Log API errors as warnings unless they're 5xx
    if (statusCode >= 500) {
      logger.error('API Error (5xx):', errorContext);
    } else {
      logger.warn('API Error (4xx):', errorContext);
    }
  } else {
    // Log unexpected errors as errors
    logger.error('Unhandled error in API:', errorContext);
  }

  // Send consistent error response
  const response: ApiResponse = {
    success: false,
    error: errorMessage,
    meta: {
      code: errorCode,
      timestamp: errorContext.timestamp,
      // Include additional debug info in development
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        context: errorContext,
      }),
    },
  };

  res.status(statusCode).json(response);
};

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error middleware
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
    meta: {
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
    },
  };

  res.status(404).json(response);
};

/**
 * Helper function to create API errors
 */
export const createError = (statusCode: number, message: string, code?: string): ApiError => {
  return new ApiError(statusCode, message, code);
};

// Common error creators
export const errors = {
  badRequest: (message: string = 'Bad request') => createError(400, message, 'BAD_REQUEST'),
  unauthorized: (message: string = 'Unauthorized') => createError(401, message, 'UNAUTHORIZED'),
  forbidden: (message: string = 'Forbidden') => createError(403, message, 'FORBIDDEN'),
  notFound: (message: string = 'Not found') => createError(404, message, 'NOT_FOUND'),
  conflict: (message: string = 'Conflict') => createError(409, message, 'CONFLICT'),
  unprocessable: (message: string = 'Unprocessable entity') =>
    createError(422, message, 'UNPROCESSABLE_ENTITY'),
  internal: (message: string = 'Internal server error') =>
    createError(500, message, 'INTERNAL_ERROR'),
  serviceUnavailable: (message: string = 'Service unavailable') =>
    createError(503, message, 'SERVICE_UNAVAILABLE'),
};
