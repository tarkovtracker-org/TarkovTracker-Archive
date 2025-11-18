/**
 * Centralized HTTP authentication wrappers for bearer token verification
 *
 * This module provides:
 * - Express middleware for API bearer token authentication
 * - Higher-order function wrappers for Firebase onRequest functions
 * - Permission checking utilities
 * - Composable with CORS middleware
 *
 * Two types of authentication are supported:
 * 1. API Bearer Tokens - Custom tokens stored in Firestore (for API access)
 * 2. Firebase ID Tokens - Standard Firebase Auth tokens (for user actions)
 */

import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { logger } from '../logger.js';
import type { ApiToken } from '../types/api.js';
import { TokenService } from '../services/TokenService.js';
import { asyncHandler } from './errorHandler.js';

/**
 * Extended request interface with authentication data
 */
export interface AuthenticatedRequest extends ExpressRequest {
  apiToken?: ApiToken;
  user?: {
    id: string;
    username?: string;
  };
}

/**
 * Extended Express request with authentication data
 */
export interface AuthenticatedExpressRequest extends ExpressRequest {
  apiToken?: ApiToken;
  user?: {
    id: string;
    username?: string;
  };
}

/**
 * Express middleware that validates API Bearer tokens
 *
 * Usage in Express app:
 * ```typescript
 * import { verifyBearerToken } from './middleware/httpAuthWrapper.js';
 * app.use('/api', verifyBearerToken);
 * ```
 *
 * Behavior:
 * - Allows OPTIONS requests without authentication
 * - Validates Bearer token from Authorization header
 * - Attaches token data to req.apiToken
 * - Returns 401 for missing/invalid tokens
 * - Increments token usage counter
 */
export const verifyBearerToken = asyncHandler(
  async (req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction): Promise<void> => {
    // Allow CORS preflight without auth
    if (req.method === 'OPTIONS') {
      return next();
    }

    try {
      const tokenService = new TokenService();

      // Validate and get token data
      const token = await tokenService.validateToken(req.headers.authorization);

      // Attach token data to request
      req.apiToken = token;
      req.user = { id: token.owner };

      logger.debug('Bearer token verified successfully', {
        owner: token.owner,
        permissions: token.permissions,
      });

      next();
    } catch (err) {
      // Return precise auth errors
      const message = err instanceof Error ? err.message : 'Authentication failed';
      logger.warn('Bearer token verification failed', {
        error: message,
        path: req.path,
      });

      res.status(401).json({ success: false, error: message });
    }
  }
);

/**
 * Higher-order function that wraps a Firebase onRequest handler with API bearer token authentication
 *
 * Usage with Firebase Functions v2:
 * ```typescript
 * import { onRequest } from 'firebase-functions/v2/https';
 * import { withBearerAuth } from './middleware/httpAuthWrapper.js';
 *
 * const myHandler = async (req, res, token) => {
 *   // token.owner contains the authenticated user ID
 *   res.json({ userId: token.owner });
 * };
 *
 * export const myFunction = onRequest(
 *   { memory: '256MiB' },
 *   withBearerAuth(myHandler)
 * );
 * ```
 *
 * The wrapper:
 * 1. Extracts Bearer token from Authorization header
 * 2. Validates token using TokenService
 * 3. Returns 401 for missing/invalid tokens
 * 4. Calls handler with authenticated token data
 */
export function withBearerAuth(
  handler: (
    req: AuthenticatedExpressRequest,
    res: ExpressResponse,
    token: ApiToken
  ) => Promise<void> | void
): (req: ExpressRequest, res: ExpressResponse) => Promise<void> {
  return async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    try {
      const tokenService = new TokenService();

      // Validate and get token data
      const token = await tokenService.validateToken(req.headers.authorization);

      // Attach token data to request
      const authReq = req as AuthenticatedExpressRequest;
      authReq.apiToken = token;
      authReq.user = { id: token.owner };

      logger.debug('Bearer token verified successfully', {
        owner: token.owner,
        permissions: token.permissions,
        url: req.url,
      });

      // Call handler with token
      await handler(authReq, res, token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      logger.warn('Bearer token verification failed', {
        error: message,
        url: req.url,
      });

      res.status(401).json({ success: false, error: message });
    }
  };
}

/**
 * Combined CORS and API bearer token authentication wrapper
 *
 * Usage with Firebase Functions v2:
 * ```typescript
 * import { onRequest } from 'firebase-functions/v2/https';
 * import { withCorsAndBearerAuth } from './middleware/httpAuthWrapper.js';
 *
 * const myHandler = async (req, res, token) => {
 *   res.json({ userId: token.owner, message: 'Hello' });
 * };
 *
 * export const myFunction = onRequest(
 *   { memory: '256MiB' },
 *   withCorsAndBearerAuth(myHandler)
 * );
 * ```
 *
 * The wrapper:
 * 1. Handles CORS (origin validation, headers, OPTIONS)
 * 2. Verifies API bearer token from Authorization header
 * 3. Calls handler with authenticated token data
 * 4. Returns appropriate errors for CORS or auth failures
 */
export function withCorsAndBearerAuth(
  handler: (
    req: AuthenticatedExpressRequest,
    res: ExpressResponse,
    token: ApiToken
  ) => Promise<void> | void
): (req: ExpressRequest, res: ExpressResponse) => Promise<void> {
  // Import CORS wrapper dynamically to avoid circular dependencies
  return async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const { withCorsHandling } = await import('./corsWrapper.js');

    // Wrap with CORS first, then auth
    const corsHandler = withCorsHandling(async (req: ExpressRequest, res: ExpressResponse) => {
      // Now apply bearer auth
      await withBearerAuth(handler)(req, res);
    });

    await corsHandler(req, res);
  };
}

/**
 * Express middleware that checks if the authenticated token has a specific permission
 *
 * Usage in Express app:
 * ```typescript
 * import { requirePermission } from './middleware/httpAuthWrapper.js';
 *
 * app.get('/api/progress',
 *   verifyBearerToken,           // First authenticate
 *   requirePermission('GP'),      // Then check permission
 *   progressHandler.getPlayerProgress
 * );
 * ```
 *
 * Behavior:
 * - Assumes verifyBearerToken has already run
 * - Checks if req.apiToken has the required permission
 * - Returns 401 if not authenticated
 * - Returns 403 if permission missing
 * - Calls next() if permission granted
 */
export const requirePermission =
  (permission: string) =>
  (req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction): void => {
    // Allow OPTIONS preflight
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    const token = req.apiToken;

    if (!token) {
      logger.warn('Permission check failed: No token present', {
        path: req.path,
        permission,
      });
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    if (!Array.isArray(token.permissions) || !token.permissions.includes(permission)) {
      logger.warn('Permission check failed: Missing required permission', {
        path: req.path,
        permission,
        tokenPermissions: token.permissions,
      });
      res.status(403).json({
        success: false,
        error: `Missing required permission: ${permission}`,
      });
      return;
    }

    logger.debug('Permission check passed', {
      permission,
      owner: token.owner,
    });

    next();
  };

/**
 * Helper to create a permission-checking wrapper for onRequest functions
 *
 * Usage:
 * ```typescript
 * import { onRequest } from 'firebase-functions/v2/https';
 * import { withBearerAuthAndPermission } from './middleware/httpAuthWrapper.js';
 *
 * const myHandler = async (req, res, token) => {
 *   // token has been verified and has 'GP' permission
 *   res.json({ data: 'progress data' });
 * };
 *
 * export const myFunction = onRequest(
 *   { memory: '256MiB' },
 *   withBearerAuthAndPermission('GP', myHandler)
 * );
 * ```
 */
export function withBearerAuthAndPermission(
  permission: string,
  handler: (
    req: AuthenticatedExpressRequest,
    res: ExpressResponse,
    token: ApiToken
  ) => Promise<void> | void
): (req: ExpressRequest, res: ExpressResponse) => Promise<void> {
  return withBearerAuth(async (req, res, token) => {
    // Check permission
    if (!Array.isArray(token.permissions) || !token.permissions.includes(permission)) {
      logger.warn('Permission check failed in wrapper', {
        url: req.url,
        permission,
        tokenPermissions: token.permissions,
      });
      res.status(403).json({
        success: false,
        error: `Missing required permission: ${permission}`,
      });
      return;
    }

    // Call handler
    await handler(req, res, token);
  });
}

/**
 * Combined CORS, auth, and permission wrapper
 *
 * Usage:
 * ```typescript
 * import { onRequest } from 'firebase-functions/v2/https';
 * import { withCorsAndBearerAuthAndPermission } from './middleware/httpAuthWrapper.js';
 *
 * const myHandler = async (req, res, token) => {
 *   res.json({ data: 'protected data' });
 * };
 *
 * export const myFunction = onRequest(
 *   { memory: '256MiB' },
 *   withCorsAndBearerAuthAndPermission('GP', myHandler)
 * );
 * ```
 */
export function withCorsAndBearerAuthAndPermission(
  permission: string,
  handler: (
    req: AuthenticatedExpressRequest,
    res: ExpressResponse,
    token: ApiToken
  ) => Promise<void> | void
): (req: ExpressRequest, res: ExpressResponse) => Promise<void> {
  return withCorsAndBearerAuth(async (req, res, token) => {
    // Check permission
    if (!Array.isArray(token.permissions) || !token.permissions.includes(permission)) {
      logger.warn('Permission check failed in CORS+auth wrapper', {
        url: req.url,
        permission,
        tokenPermissions: token.permissions,
      });
      res.status(403).json({
        success: false,
        error: `Missing required permission: ${permission}`,
      });
      return;
    }

    // Call handler
    await handler(req, res, token);
  });
}

/**
 * Re-export for backward compatibility
 *
 * @deprecated Use verifyBearerToken instead
 */
export const verifyBearer = verifyBearerToken;
