/**
 * Centralized CORS handling for HTTP endpoints
 *
 * This module provides:
 * - Express middleware for automatic CORS handling
 * - Higher-order function wrapper for onRequest handlers
 * - Consistent CORS header management across all endpoints
 *
 * All CORS logic delegates to corsConfig.ts for origin validation.
 */

import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { setCorsHeaders } from '../config/corsConfig';
import { logger } from 'firebase-functions/v2';

/**
 * Express middleware that handles CORS for all requests
 *
 * Usage in Express app:
 * ```typescript
 * import { corsMiddleware } from './middleware/corsWrapper';
 * app.use(corsMiddleware);
 * ```
 *
 * Behavior:
 * - Validates origin and sets CORS headers
 * - Returns 403 for invalid origins
 * - Responds with 204 for OPTIONS preflight requests
 * - Passes through valid requests to next middleware
 */
export function corsMiddleware(
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
): void {
  // Validate origin and set CORS headers
  if (!setCorsHeaders(req, res)) {
    logger.warn('CORS middleware: Origin not allowed', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
    });
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    logger.debug('CORS middleware: Handling OPTIONS preflight', {
      origin: req.headers.origin,
      path: req.path,
    });
    res.status(204).send('');
    return;
  }

  // Continue to next middleware
  next();
}

/**
 * Higher-order function that wraps a Firebase onRequest handler with CORS handling
 *
 * Usage with Firebase Functions v2:
 * ```typescript
 * import { onRequest } from 'firebase-functions/v2/https';
 * import { withCorsHandling } from './middleware/corsWrapper';
 *
 * const myHandler = async (req, res) => {
 *   res.json({ message: 'Hello' });
 * };
 *
 * export const myFunction = onRequest(
 *   { memory: '256MiB' },
 *   withCorsHandling(myHandler)
 * );
 * ```
 *
 * The wrapper:
 * 1. Validates origin and sets CORS headers
 * 2. Returns 403 for invalid origins
 * 3. Responds with 204 for OPTIONS preflight
 * 4. Calls the wrapped handler for valid requests
 */
export function withCorsHandling(
  handler: (req: ExpressRequest, res: ExpressResponse) => Promise<void> | void
): (req: ExpressRequest, res: ExpressResponse) => Promise<void> {
  return async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    // Validate origin and set CORS headers
    if (!setCorsHeaders(req, res)) {
      logger.warn('CORS wrapper: Origin not allowed', {
        origin: req.headers.origin,
        method: req.method,
        url: req.url,
      });
      res.status(403).send('Origin not allowed');
      return;
    }

    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      logger.debug('CORS wrapper: Handling OPTIONS preflight', {
        origin: req.headers.origin,
        url: req.url,
      });
      res.status(204).send('');
      return;
    }

    // Call the wrapped handler
    try {
      await handler(req, res);
    } catch (error) {
      // Let error handling middleware deal with errors
      // Don't swallow them here
      throw error;
    }
  };
}

/**
 * Combined CORS and authentication wrapper
 *
 * Usage with Firebase Functions v2 for authenticated endpoints:
 * ```typescript
 * import { onRequest } from 'firebase-functions/v2/https';
 * import { withCorsAndAuthentication } from './middleware/corsWrapper';
 *
 * const myHandler = async (req, res, uid) => {
 *   res.json({ userId: uid, message: 'Hello' });
 * };
 *
 * export const myFunction = onRequest(
 *   { memory: '256MiB' },
 *   withCorsAndAuthentication(myHandler)
 * );
 * ```
 *
 * The wrapper:
 * 1. Handles CORS (origin validation, headers, OPTIONS)
 * 2. Verifies Bearer token from Authorization header
 * 3. Calls handler with authenticated user ID
 * 4. Returns appropriate errors for missing/invalid auth
 */
export function withCorsAndAuthentication(
  handler: (req: ExpressRequest, res: ExpressResponse, uid: string) => Promise<void> | void
): (req: ExpressRequest, res: ExpressResponse) => Promise<void> {
  return withCorsHandling(async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    // Import Firebase Admin dynamically to avoid circular dependencies
    const admin = await import('firebase-admin');

    // Extract Bearer token
    const authHeader = req.headers.authorization ?? '';
    const match = authHeader.match(/^Bearer (.+)$/);

    if (!match) {
      logger.warn('Authentication failed: Missing or invalid Authorization header', {
        method: req.method,
        url: req.url,
      });
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const idToken = match[1];

    try {
      // Verify token with Firebase Admin
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      logger.debug('Token verified successfully', {
        uid: decodedToken.uid,
        method: req.method,
        url: req.url,
      });

      // Call handler with authenticated UID
      await handler(req, res, decodedToken.uid);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Firebase ID token')) {
        logger.warn('Token verification failed', {
          error: err.message,
          method: req.method,
          url: req.url,
        });
        res.status(401).json({ error: err.message });
      } else {
        logger.error('Error in authentication', {
          error: err instanceof Error ? err.message : String(err),
          method: req.method,
          url: req.url,
        });
        res.status(500).json({ error: 'An error occurred while processing your request.' });
      }
    }
  });
}

/**
 * Legacy compatibility wrapper for Express-style handlers
 *
 * This function bridges the gap between the new CORS wrapper and existing
 * Express middleware patterns. Use this when refactoring existing handlers.
 *
 * @deprecated Use corsMiddleware for new Express endpoints
 */
export function withExpressCors(
  handler: (req: ExpressRequest, res: ExpressResponse) => Promise<void> | void
): (req: ExpressRequest, res: ExpressResponse) => Promise<void> {
  return async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    // Validate origin and set CORS headers
    if (!setCorsHeaders(req, res)) {
      logger.warn('Express CORS wrapper: Origin not allowed', {
        origin: req.headers.origin,
        method: req.method,
        path: req.path,
      });
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      logger.debug('Express CORS wrapper: Handling OPTIONS preflight', {
        origin: req.headers.origin,
        path: req.path,
      });
      res.status(204).send('');
      return;
    }

    // Call handler
    await handler(req, res);
  };
}
