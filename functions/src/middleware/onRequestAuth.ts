import { logger } from 'firebase-functions/v2';
import admin from 'firebase-admin';
import { setCorsHeaders } from '../config/corsConfig.js';
import { Request as FirebaseRequest } from 'firebase-functions/v2/https';

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
  req: FirebaseRequest,
  res: ExpressResponse,
  uid: string
) => Promise<void> | void;

export async function withCorsAndAuth(
  req: FirebaseRequest,
  res: ExpressResponse,
  handler: AuthenticatedHandler
): Promise<void> {
  // Step 1: Set CORS headers
  if (!setCorsHeaders(req, res)) {
    res.status(403).send('Origin not allowed');
    return;
  }

  // Step 2: Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  // Step 3: Extract and verify Bearer token
  try {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer (.+)$/);

    if (!match) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const idToken = match[1];

    // Step 4: Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Step 5: Log successful verification
    logger.log('Token verified successfully', {
      uid: decodedToken.uid,
      method: req.method,
      path: req.path,
    });

    // Step 6: Call the handler with authenticated UID
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
      logger.error('Error in CORS and auth middleware', {
        error: err instanceof Error ? err.message : err,
        method: req.method,
        path: req.path,
      });

      if (!res.headersSent) {
        res.status(500).json({ error: 'An error occurred while processing your request.' });
      }
    }
  }
}
