// Express app configuration and route setup
import type {
  Express,
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction,
} from 'express';
import { logger } from 'firebase-functions/v2';
import { verifyBearer } from '../middleware/auth.js';
import { abuseGuard } from '../middleware/abuseGuard.js';
import { requireRecentAuth } from '../middleware/reauth.js';
import { requirePermission } from '../middleware/permissions.js';
import { errorHandler, notFoundHandler, asyncHandler } from '../middleware/errorHandler.js';
import { getExpressCorsOptions } from '../config/corsConfig.js';
import progressHandler from '../handlers/progressHandler.js';
import teamHandler from '../handlers/teamHandler.js';
import tokenHandler from '../handlers/tokenHandler.js';
import { deleteUserAccountHandler } from '../handlers/userDeletionHandler.js';

export async function createApp(): Promise<Express> {
  const expressModule = await import('express');
  const corsModule = await import('cors');
  const bodyParserModule = await import('body-parser');

  const app = expressModule.default();

  // Middleware setup
  app.use(corsModule.default(getExpressCorsOptions()));
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
  app.get(
    '/api/user/test',
    asyncHandler(async (_req: ExpressRequest, res: ExpressResponse) => {
      res.status(200).json({ success: true, message: 'User deletion API is working' });
    })
  );
  app.delete('/api/user/account', requireRecentAuth, asyncHandler(deleteUserAccountHandler));

  // Auth middleware for all /api routes
  app.use('/api', verifyBearer);
  app.use('/api', abuseGuard);

  // Token endpoints
  app.get('/api/token', tokenHandler.getTokenInfo);
  app.get('/api/v2/token', tokenHandler.getTokenInfo);

  // Progress endpoints
  app.get('/api/progress', requirePermission('GP'), progressHandler.getPlayerProgress);
  app.get('/api/v2/progress', requirePermission('GP'), progressHandler.getPlayerProgress);

  app.post(
    '/api/progress/level/:levelValue',
    requirePermission('WP'),
    progressHandler.setPlayerLevel
  );
  app.post(
    '/api/v2/progress/level/:levelValue',
    requirePermission('WP'),
    progressHandler.setPlayerLevel
  );

  app.post('/api/progress/task/:taskId', requirePermission('WP'), progressHandler.updateSingleTask);
  app.post(
    '/api/v2/progress/task/:taskId',
    requirePermission('WP'),
    progressHandler.updateSingleTask
  );

  app.post('/api/progress/tasks', requirePermission('WP'), progressHandler.updateMultipleTasks);
  app.post('/api/v2/progress/tasks', requirePermission('WP'), progressHandler.updateMultipleTasks);

  app.post(
    '/api/progress/task/objective/:objectiveId',
    requirePermission('WP'),
    progressHandler.updateTaskObjective
  );
  app.post(
    '/api/v2/progress/task/objective/:objectiveId',
    requirePermission('WP'),
    progressHandler.updateTaskObjective
  );

  // Team endpoints
  app.get('/api/team/progress', requirePermission('TP'), teamHandler.getTeamProgress);
  app.get('/api/v2/team/progress', requirePermission('TP'), teamHandler.getTeamProgress);

  // Team management with CORS preflight
  app.options('/api/team/create', (_req: ExpressRequest, res: ExpressResponse) => {
    res.status(200).send();
  });
  app.post('/api/team/create', teamHandler.createTeam);

  app.options('/api/team/join', (_req: ExpressRequest, res: ExpressResponse) => {
    res.status(200).send();
  });
  app.post('/api/team/join', teamHandler.joinTeam);

  app.options('/api/team/leave', (_req: ExpressRequest, res: ExpressResponse) => {
    res.status(200).send();
  });
  app.post('/api/team/leave', teamHandler.leaveTeam);

  // Health check endpoint
  app.get(
    '/health',
    asyncHandler(async (_req: ExpressRequest, res: ExpressResponse) => {
      res.status(200).json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '2.0.0',
          service: 'tarkovtracker-api',
          features: {
            newErrorHandling: true,
            newProgressService: true,
            newTeamService: true,
            newTokenService: true,
          },
        },
      });
    })
  );
}
