/**
 * Cloud Functions entrypoint for TarkovTracker.
 *
 * This module:
 * - Exposes HTTP endpoints via the main 'api' function
 * - Exports scheduled functions for data synchronization
 * - Exports services and utilities for external consumers (tests, integrations)
 * - Lazily builds Express app to minimize cold-start memory footprint
 *
 * IMPORTANT: This is the main public API surface for Cloud Functions.
 * Keep these exports stable for backward compatibility.
 */
import admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import type { Express } from 'express';
// Import legacy functions for backward compatibility
import { createToken } from './token/create';
import { revokeToken } from './token/revoke';
import { createApp } from './app/app';
import { scheduledFunctions } from './scheduled/index';
import { withCorsHandling } from './middleware/corsWrapper';
// Firebase Admin initialization
admin.initializeApp();

// ============================================================================
// LEGACY FUNCTION EXPORTS - BACKWARD COMPATIBILITY
// ============================================================================
// These are exported for backward compatibility with existing deployments.
// New code should use the explicit handlers from handlers/index.ts.
export { createToken, revokeToken };

// ============================================================================
// SCHEDULED FUNCTION EXPORTS
// ============================================================================
// Background tasks for data synchronization and maintenance
export const { updateTarkovData, expireInactiveTokens } = scheduledFunctions;

// ============================================================================
// SERVICE EXPORTS FOR EXTERNAL CONSUMERS
// ============================================================================
// These services are exported for use by external integrations and test suites.
// Internal code should import directly from './services/{ServiceName}.ts'
// to avoid unnecessary abstraction and make import paths explicit.
export { ProgressService } from './services/ProgressService';
export { ValidationService } from './services/ValidationService';
// Lazily construct and cache the Express app used by the `api` HTTP function
let cachedApp: Express | undefined;
async function getApiApp(): Promise<Express> {
  if (cachedApp) return cachedApp;
  cachedApp = await createApp();
  return cachedApp;
}
export const rawApp = getApiApp;

/**
 * Main HTTP endpoint with centralized CORS handling
 *
 * TYPE SAFETY NOTE:
 * This uses controlled type coercion at the Firebase Functions/Express boundary.
 * - Workspace uses Express v5 types (@types/express@5.0.5)
 * - Firebase Functions v6 bundles Express v4 types (@types/express@4.17.25)
 * - The type mismatch is resolved here with `as any` casting
 * - Internal Express app, middleware, and services remain fully typed
 * - This can be revisited when Firebase Functions updates to Express v5
 */
export const api: ReturnType<typeof onRequest> = onRequest(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: 3,
  },
  withCorsHandling(async (req: any, res: any) => {
    const app = await getApiApp();
    return app(req, res);
  }) as any
);
