// Cloud Functions entrypoint. Exposes callable and HTTP endpoints
// and lazily builds an Express app to keep cold‑start memory low.
import admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import type { Express } from 'express';
// Import legacy functions for backward compatibility
import { createToken } from './token/create';
import { revokeToken } from './token/revoke';
import { createApp } from './app/app';
import { scheduledFunctions } from './scheduled/index';
// Firebase Admin initialization
admin.initializeApp();
// Export legacy functions for backward compatibility
export { createToken, revokeToken };
// Export scheduled functions
export const { updateTarkovData, expireInactiveTokens } = scheduledFunctions;
// Re-export services for tests and external usage
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
// Main HTTP endpoint
export const api = onRequest(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: 3,
  },
  async (req, res) => {
    const { setCorsHeaders } = await import('./config/corsConfig');
    if (!setCorsHeaders(req, res)) {
      res.status(403).send('Origin not allowed');
      return;
    }
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    const app = await getApiApp();
    return (app as unknown as (req: unknown, res: unknown) => void)(req, res);
  }
);
