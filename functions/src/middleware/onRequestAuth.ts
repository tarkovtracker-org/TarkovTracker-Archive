/**
 * Legacy CORS and authentication middleware
 * 
 * @deprecated Use withCorsAndAuthentication from ./corsWrapper instead
 * 
 * This file is kept for backward compatibility but new code should use
 * the centralized CORS handling from corsWrapper.ts
 */

import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { withExpressCors } from './corsWrapper';
import type { Request } from 'express';

// Use a flexible response type compatible with both Firebase's bundled Express and standalone Express
// Firebase bundles @types/express v4 while workspace may use v5
interface ExpressResponse {
  status(code: number): ExpressResponse;
  json(body: unknown): ExpressResponse;
  send(body?: unknown): ExpressResponse;
  set(field: string, value: string | readonly string[]): unknown;
  headersSent: boolean;
}

// Define the handler type that accepts the authenticated user ID
type AuthenticatedHandler = (
  req: Request,
  res: ExpressResponse,
  uid: string
) => Promise<void> | void;

/**
 * Wrapper that handles CORS and authentication for Express-style handlers
 * 
 * @deprecated Use withCorsAndAuthentication from ./corsWrapper instead
 * 
 * This function now delegates CORS handling to the centralized corsWrapper
 * and only handles authentication logic.
 */
export async function withCorsAndAuth(
  req: Request,
  res: ExpressResponse,
  handler: AuthenticatedHandler
): Promise<void> {
  // Delegate to centralized CORS handling
  await withExpressCors(async (req, res) => {
    // Extract and verify Bearer token
    try {
      const authHeader = req.headers.authorization ?? '';
      const match = authHeader.match(/^Bearer (.+)$/);
      if (!match) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
      }
      const idToken = match[1];

      // Verify token with Firebase Admin
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      // Log successful verification
      logger.log('Token verified successfully', {
        uid: decodedToken.uid,
        method: req.method,
        path: req.path,
      });

      // Call the handler with authenticated UID
      await handler(req, res, decodedToken.uid);
    } catch (err: unknown) {
      // Log error details
      if (err instanceof Error && err.message.includes('Firebase ID token')) {
        logger.warn('Token verification failed', {
          error: err.message,
          method: req.method,
          path: req.path,
        });
        if (!res.headersSent) {
          res.status(401).json({
            error: err.message,
          });
        }
      } else {
        logger.error('Error in authentication', {
          error: err instanceof Error ? err.message : err,
          method: req.method,
          path: req.path,
        });
        if (!res.headersSent) {
          res.status(500).json({ error: 'An error occurred while processing your request.' });
        }
      }
    }
  })(req, res);
}