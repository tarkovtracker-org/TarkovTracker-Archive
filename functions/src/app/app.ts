// Express app configuration and route setup
import type {
  Express,
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction,
} from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from 'firebase-functions/v2';
import { verifyBearerToken } from '../middleware/httpAuthWrapper';
import { requirePermission } from '../middleware/httpAuthWrapper';
import { abuseGuard } from '../middleware/abuseGuard';
import { requireRecentAuth } from '../middleware/reauth';
import { errorHandler, notFoundHandler, asyncHandler } from '../middleware/errorHandler';
import { corsMiddleware } from '../middleware/corsWrapper';
import {
  getPlayerProgress,
  setPlayerLevel,
  updateSingleTask,
  updateMultipleTasks,
  updateTaskObjective,
  getTeamProgress,
  createTeam,
  joinTeam,
  leaveTeam,
  getTokenInfo,
  deleteUserAccountHandler,
} from '../handlers';
import { API_FEATURES } from '../config/features';
// Read package version at module load
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../../package.json');
let APP_VERSION = '0.0.0';
try {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  APP_VERSION = packageJson.version;
} catch (error) {
  logger.error('Failed to read package.json version:', error);
  APP_VERSION = 'unknown';
}
export async function createApp(): Promise<Express> {
  const expressModule = await import('express');
  const bodyParserModule = await import('body-parser');
  const app = expressModule.default();
  // CORS middleware - centralized handling for all requests
  // Note: The outer onRequest wrapper also handles CORS, but this ensures
  // consistent behavior when the Express app is used directly (e.g., in tests)
  app.use(corsMiddleware);
  // Body parsing middleware
  app.use(bodyParserModule.default.json({ limit: '1mb' }));
  app.use(bodyParserModule.default.urlencoded({ extended: true, limit: '1mb' }));
  // Request logging in non-production
  if (process.env.NODE_ENV !== 'production') {
    app.use((req: ExpressRequest, _res: ExpressResponse, next: NextFunction) => {
      logger.log(`API Request: ${req.method} ${req.originalUrl}`);
      next();
    });
  }
  // Routes
  setupRoutes(app);
  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
function setupRoutes(app: Express) {
  // User management routes
  if (process.env.NODE_ENV !== 'production') {
    app.get(
      '/api/user/test',
      asyncHandler(async (_req: ExpressRequest, res: ExpressResponse) => {
        res.status(200).json({ success: true, message: 'User deletion API is working' });
      })
    );
  }
  // Auth middleware for all /api routes
  // Verifies API bearer tokens and attaches token data to req.apiToken
  app.use('/api', verifyBearerToken);
  app.use('/api', abuseGuard);
  app.delete('/api/user/account', requireRecentAuth, asyncHandler(deleteUserAccountHandler));
  // Token endpoints
  app.get('/api/token', getTokenInfo);
  app.get('/api/v2/token', getTokenInfo);
  // Progress endpoints
  app.get('/api/progress', requirePermission('GP'), getPlayerProgress);
  app.get('/api/v2/progress', requirePermission('GP'), getPlayerProgress);
  app.post('/api/progress/level/:levelValue', requirePermission('WP'), setPlayerLevel);
  app.post('/api/v2/progress/level/:levelValue', requirePermission('WP'), setPlayerLevel);
  app.post('/api/progress/task/:taskId', requirePermission('WP'), updateSingleTask);
  app.post('/api/v2/progress/task/:taskId', requirePermission('WP'), updateSingleTask);
  app.post('/api/progress/tasks', requirePermission('WP'), updateMultipleTasks);
  app.post('/api/v2/progress/tasks', requirePermission('WP'), updateMultipleTasks);
  app.post(
    '/api/progress/task/objective/:objectiveId',
    requirePermission('WP'),
    updateTaskObjective
  );
  app.post(
    '/api/v2/progress/task/objective/:objectiveId',
    requirePermission('WP'),
    updateTaskObjective
  );
  // Team endpoints
  app.get('/api/team/progress', requirePermission('TP'), getTeamProgress);
  app.get('/api/v2/team/progress', requirePermission('TP'), getTeamProgress);
  // Team management
  app.post('/api/team/create', createTeam);
  app.post('/api/team/join', joinTeam);
  app.post('/api/team/leave', leaveTeam);
  // Health check endpoint
  app.get(
    '/health',
    asyncHandler(async (_req: ExpressRequest, res: ExpressResponse) => {
      res.status(200).json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: APP_VERSION,
          service: 'tarkovtracker-api',
          features: API_FEATURES,
        },
      });
    })
  );
}
