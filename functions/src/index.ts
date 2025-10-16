// Cloud Functions entrypoint. Exposes callable and HTTP endpoints
// and lazily builds an Express app to keep cold‑start memory low.
import admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  HttpsError,
  CallableRequest,
  Request as FirebaseRequest,
  onCall,
  onRequest,
} from 'firebase-functions/v2/https';
import { request, gql } from 'graphql-request';
import UIDGenerator from 'uid-generator';
import {
  DocumentReference,
  DocumentSnapshot,
  WriteBatch,
  Transaction,
  Firestore,
  FieldValue,
} from 'firebase-admin/firestore';
// Defer Express-related imports until the API endpoint is invoked
import type {
  Express,
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction,
} from 'express';

// Import legacy functions for backward compatibility
import { createToken, _createTokenLogic } from './token/create.js';
import { revokeToken } from './token/revoke.js';

admin.initializeApp();
export { createToken, revokeToken };

// Lazily construct and cache the Express app used by the `api` HTTP function
let cachedApp: Express | undefined;

// Reuse UID generators across invocations to avoid reallocation overhead
const PASSWORD_UID_GEN = new UIDGenerator(48, UIDGenerator.BASE62);
const TEAM_UID_GEN = new UIDGenerator(32);

// Hoist regex to avoid per-call compilation
const ITEM_ID_SANITIZER_REGEX = /[/\\*?[\]]/g;
async function getApiApp(): Promise<Express> {
  if (cachedApp) return cachedApp;
  const expressModule = await import('express');
  const corsModule = await import('cors');
  const bodyParserModule = await import('body-parser');
  const { verifyBearer } = await import('./middleware/auth.js');
  const { abuseGuard } = await import('./middleware/abuseGuard.js');
  const { requireRecentAuth } = await import('./middleware/reauth.js');
  const { requirePermission } = await import('./middleware/permissions.js');
  const { errorHandler, notFoundHandler, asyncHandler } = await import(
    './middleware/errorHandler.js'
  );
  const progressHandler = (await import('./handlers/progressHandler.js')).default;
  const teamHandler = (await import('./handlers/teamHandler.js')).default;
  const tokenHandler = (await import('./handlers/tokenHandler.js')).default;
  const { deleteUserAccountHandler } = await import('./handlers/userDeletionHandler.js');

  const app = expressModule.default();
  app.use(
    corsModule.default({
      // Reflect the request origin to support credentials across any origin
      origin: true,
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );
  // CORS is already handled globally above and by individual route handlers
  app.use(bodyParserModule.default.json({ limit: '1mb' }));
  app.use(bodyParserModule.default.urlencoded({ extended: true, limit: '1mb' }));
  if (process.env.NODE_ENV !== 'production') {
    app.use((req: ExpressRequest, _res: ExpressResponse, next: NextFunction) => {
      logger.log(`API Request: ${req.method} ${req.originalUrl}`);
      next();
    });
  }
  app.get(
    '/api/user/test',
    asyncHandler(async (_req: ExpressRequest, res: ExpressResponse) => {
      res.status(200).json({ success: true, message: 'User deletion API is working' });
    })
  );
  app.delete('/api/user/account', requireRecentAuth, asyncHandler(deleteUserAccountHandler));
  app.use('/api', verifyBearer);
  app.use('/api', abuseGuard);
  app.get('/api/token', tokenHandler.getTokenInfo);
  app.get('/api/progress', requirePermission('GP'), progressHandler.getPlayerProgress);
  app.get('/api/team/progress', requirePermission('TP'), teamHandler.getTeamProgress);
  app.post(
    '/api/progress/level/:levelValue',
    requirePermission('WP'),
    progressHandler.setPlayerLevel
  );
  app.post('/api/progress/task/:taskId', requirePermission('WP'), progressHandler.updateSingleTask);
  app.post('/api/progress/tasks', requirePermission('WP'), progressHandler.updateMultipleTasks);
  app.post(
    '/api/progress/task/objective/:objectiveId',
    requirePermission('WP'),
    progressHandler.updateTaskObjective
  );
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
  app.get('/api/v2/token', tokenHandler.getTokenInfo);
  app.get('/api/v2/progress', requirePermission('GP'), progressHandler.getPlayerProgress);
  app.get('/api/v2/team/progress', requirePermission('TP'), teamHandler.getTeamProgress);
  app.post(
    '/api/v2/progress/level/:levelValue',
    requirePermission('WP'),
    progressHandler.setPlayerLevel
  );
  app.post(
    '/api/v2/progress/task/:taskId',
    requirePermission('WP'),
    progressHandler.updateSingleTask
  );
  app.post('/api/v2/progress/tasks', requirePermission('WP'), progressHandler.updateMultipleTasks);
  app.post(
    '/api/v2/progress/task/objective/:objectiveId',
    requirePermission('WP'),
    progressHandler.updateTaskObjective
  );
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
  app.use(notFoundHandler);
  app.use(errorHandler);
  cachedApp = app;
  return app;
}
export const rawApp = getApiApp;

export const api = onRequest(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: 3,
  },
  async (req, res) => {
    // Top-level CORS handling for preflight and safety-net for regular requests
    const originHeader = req.headers.origin;
    const origin = typeof originHeader === 'string' ? originHeader : undefined;
    if (origin) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
    }
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (typeof req.headers['access-control-request-headers'] === 'string') {
      res.set('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
    } else {
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    const app = await getApiApp();
    return (app as unknown as (req: unknown, res: unknown) => void)(req, res);
  }
);
interface SystemDocData {
  team?: string | null;
  teamMax?: number;
  lastLeftTeam?: admin.firestore.Timestamp;
}
interface TeamDocData {
  owner?: string;
  password?: string;
  maximumMembers?: number;
  members?: string[];
  createdAt?: admin.firestore.Timestamp;
}

// Utility functions for common team operations
function validateAuth(request: CallableRequest<unknown>): string {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  return request.auth.uid;
}

function handleTeamError(
  operation: string,
  error: unknown,
  context: Record<string, unknown>
): never {
  logger.error(`Failed to ${operation}:`, { ...context, error });
  if (error instanceof HttpsError) {
    throw error;
  }
  const message = error instanceof Error ? error.message : String(error);
  throw new HttpsError('internal', `Error during ${operation}`, message);
}

async function generateSecurePassword(): Promise<string> {
  try {
    const generated = await PASSWORD_UID_GEN.generate();
    if (generated && generated.length >= 4) {
      return generated;
    }
    logger.warn('Generated password was invalid, using fallback');
    return 'DEBUG_PASS_123';
  } catch (error) {
    logger.error('Error during password generation:', error);
    return 'ERROR_PASS_456';
  }
}
async function _leaveTeamLogic(request: CallableRequest<void>): Promise<{ left: boolean }> {
  const db: Firestore = admin.firestore();
  const userUid = validateAuth(request);
  try {
    let originalTeam: string | null = null;
    await db.runTransaction(async (transaction: Transaction) => {
      const systemRef: DocumentReference<SystemDocData> = db
        .collection('system')
        .doc(userUid) as DocumentReference<SystemDocData>;
      const systemDoc: DocumentSnapshot<SystemDocData> = await transaction.get(systemRef);
      const systemData = systemDoc?.data();
      originalTeam = systemData?.team ?? null;
      if (systemData?.team) {
        const teamRef: DocumentReference<TeamDocData> = db
          .collection('team')
          .doc(systemData.team) as DocumentReference<TeamDocData>;
        const teamDoc: DocumentSnapshot<TeamDocData> = await transaction.get(teamRef);
        const teamData = teamDoc?.data();
        if (teamData?.owner === userUid) {
          if (teamData?.members) {
            teamData.members.forEach((member: string) => {
              logger.log('Removing team from member', {
                member,
                team: originalTeam,
              });
              transaction.set(
                db.collection('system').doc(member),
                {
                  team: null,
                  lastLeftTeam: FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
            });
          }
          transaction.delete(teamRef);
        } else {
          transaction.set(teamRef, { members: FieldValue.arrayRemove(userUid) }, { merge: true });
          transaction.set(
            systemRef,
            {
              team: null,
              lastLeftTeam: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      } else {
        throw new HttpsError('failed-precondition', 'User is not in a team');
      }
      logger.log('Left team', {
        user: userUid,
        team: originalTeam,
      });
    });
    logger.log('Finished leave team', { user: userUid });
    return { left: true };
  } catch (e: unknown) {
    handleTeamError('leave team', e, { owner: userUid });
  }
}
interface JoinTeamData {
  id: string;
  password: string;
}
async function _joinTeamLogic(
  request: CallableRequest<JoinTeamData>
): Promise<{ joined: boolean }> {
  const db: Firestore = admin.firestore();
  const userUid = validateAuth(request);
  const data = request.data;
  try {
    await db.runTransaction(async (transaction: Transaction) => {
      const systemRef: DocumentReference<SystemDocData> = db
        .collection('system')
        .doc(userUid) as DocumentReference<SystemDocData>;
      const systemDoc: DocumentSnapshot<SystemDocData> = await transaction.get(systemRef);
      const systemData = systemDoc?.data();
      if (systemData?.team) {
        throw new HttpsError('failed-precondition', 'User is already in a team');
      }
      if (!data.id || !data.password) {
        throw new HttpsError('invalid-argument', 'Team ID and password required.');
      }
      const teamRef: DocumentReference<TeamDocData> = db
        .collection('team')
        .doc(data.id) as DocumentReference<TeamDocData>;
      const teamDoc: DocumentSnapshot<TeamDocData> = await transaction.get(teamRef);
      const teamData = teamDoc?.data();
      if (!teamDoc?.exists) {
        throw new HttpsError('not-found', "Team doesn't exist");
      }
      if (teamData?.password !== data.password) {
        throw new HttpsError('unauthenticated', 'Wrong password');
      }
      if ((teamData?.members?.length ?? 0) >= (teamData?.maximumMembers ?? 10)) {
        throw new HttpsError('resource-exhausted', 'Team is full');
      }
      transaction.set(teamRef, { members: FieldValue.arrayUnion(userUid) }, { merge: true });
      transaction.set(systemRef, { team: data.id }, { merge: true });
    });
    logger.log('Joined team', {
      user: userUid,
      team: data.id,
    });
    return { joined: true };
  } catch (e: unknown) {
    handleTeamError('join team', e, { user: userUid, team: data.id });
  }
}
interface CreateTeamData {
  password?: string;
  maximumMembers?: number;
}
async function _createTeamLogic(
  request: CallableRequest<CreateTeamData>
): Promise<{ team: string; password?: string }> {
  const db: Firestore = admin.firestore();
  const userUid = validateAuth(request);
  const data = request.data;
  try {
    let createdTeam = '';
    let finalTeamPassword = '';
    await db.runTransaction(async (transaction: Transaction) => {
      try {
        const systemRef: DocumentReference<SystemDocData> = db
          .collection('system')
          .doc(userUid) as DocumentReference<SystemDocData>;
        const systemDoc: DocumentSnapshot<SystemDocData> = await transaction.get(systemRef);
        const systemData = systemDoc?.data();

        if (systemData?.team) {
          throw new HttpsError('failed-precondition', 'User is already in a team.');
        }

        if (systemData?.lastLeftTeam) {
          const now = admin.firestore.Timestamp.now();
          const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(
            now.toMillis() - 5 * 60 * 1000
          );
          if (systemData.lastLeftTeam > fiveMinutesAgo) {
            throw new HttpsError(
              'failed-precondition',
              'You must wait 5 minutes after leaving a team to create a new one.'
            );
          }
        }

        const teamId = await TEAM_UID_GEN.generate();
        const teamPassword = data.password || (await generateSecurePassword());

        finalTeamPassword = teamPassword;
        createdTeam = teamId;
        const teamRef = db.collection('team').doc(teamId);

        transaction.set(teamRef, {
          owner: userUid,
          password: teamPassword,
          maximumMembers: data.maximumMembers || 10,
          members: [userUid],
          createdAt: FieldValue.serverTimestamp(),
        });

        transaction.set(systemRef, { team: teamId }, { merge: true });
      } catch (err) {
        logger.error('[createTeam] Error inside transaction:', err);
        throw err;
      }
    });
    logger.log('Created team', {
      owner: userUid,
      team: createdTeam,
      maximumMembers: data.maximumMembers || 10,
    });
    return { team: createdTeam, password: finalTeamPassword };
  } catch (e: unknown) {
    handleTeamError('create team', e, { owner: userUid });
  }
}
interface KickTeamMemberData {
  kicked: string;
}
async function _kickTeamMemberLogic(
  request: CallableRequest<KickTeamMemberData>
): Promise<{ kicked: boolean }> {
  const db: Firestore = admin.firestore();
  const userUid = validateAuth(request);
  const data = request.data;

  if (!data.kicked) {
    throw new HttpsError('invalid-argument', 'Kicked user ID required.');
  }
  if (data.kicked === userUid) {
    throw new HttpsError('invalid-argument', "You can't kick yourself.");
  }

  try {
    await db.runTransaction(async (transaction: Transaction) => {
      const systemRef: DocumentReference<SystemDocData> = db
        .collection('system')
        .doc(userUid) as DocumentReference<SystemDocData>;
      const systemDoc: DocumentSnapshot<SystemDocData> = await transaction.get(systemRef);
      const systemData = systemDoc?.data();
      const teamId = systemData?.team;
      if (!teamId) {
        throw new HttpsError('failed-precondition', 'User is not in a team.');
      }
      const teamRef: DocumentReference<TeamDocData> = db
        .collection('team')
        .doc(teamId) as DocumentReference<TeamDocData>;
      const teamDoc: DocumentSnapshot<TeamDocData> = await transaction.get(teamRef);
      const teamData = teamDoc?.data();
      if (teamData?.owner !== userUid) {
        throw new HttpsError('permission-denied', 'Only the team owner can kick members.');
      }
      if (!teamData?.members?.includes(data.kicked)) {
        throw new HttpsError('not-found', 'User not found in team.');
      }
      transaction.set(teamRef, { members: FieldValue.arrayRemove(data.kicked) }, { merge: true });
      const kickedUserSystemRef: DocumentReference<SystemDocData> = db
        .collection('system')
        .doc(data.kicked) as DocumentReference<SystemDocData>;
      transaction.set(
        kickedUserSystemRef,
        {
          team: null,
          lastLeftTeam: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
    logger.log('Kicked member', {
      owner: userUid,
      kicked: data.kicked,
    });
    return { kicked: true };
  } catch (e: unknown) {
    handleTeamError('kick team member', e, { owner: userUid, kicked: data.kicked });
  }
}
export const createTeam = onCall(
  {
    memory: '128MiB',
    timeoutSeconds: 15,
  },
  _createTeamLogic
);

// Alternative HTTPS endpoint for createTeam with explicit CORS handling
// HTTP mirror for createTeam callable with explicit CORS handling
export const createTeamHttp = onRequest(
  {
    memory: '256MiB',
    timeoutSeconds: 15,
    maxInstances: 1,
    minInstances: 0,
  },
  async (req, res) => {
    // CORS headers aligned with Express middleware; reflect any origin for credentials support
    const originHeader = req.headers.origin;
    const origin = typeof originHeader === 'string' ? originHeader : undefined;
    if (origin) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
    }

    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.set('Access-Control-Allow-Credentials', 'true');

    // Preflight handling
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      // Verify Firebase ID token from Authorization header
      const authToken = req.headers.authorization?.replace('Bearer ', '');
      if (!authToken) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const decodedToken = await admin.auth().verifyIdToken(authToken);

      // Reuse callable logic
      const callableRequest: CallableRequest<CreateTeamData> = {
        auth: {
          uid: decodedToken.uid,
          token: decodedToken,
          rawToken: authToken,
        },
        data: req.body,
        rawRequest: req as unknown as FirebaseRequest,
        acceptsStreaming: false,
      };
      const result = await _createTeamLogic(callableRequest);
      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in createTeamHttp:', error);
      if (error instanceof HttpsError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);

// HTTP mirror for createToken callable with explicit CORS handling
export const createTokenHttp = onRequest(
  {
    memory: '256MiB',
    timeoutSeconds: 20,
    cors: true,
    maxInstances: 1,
    minInstances: 0,
  },
  async (req, res) => {
    // CORS headers: reflect any origin for credentials support
    const originHeader = req.headers.origin;
    const origin = typeof originHeader === 'string' ? originHeader : undefined;
    if (origin) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
    }

    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Max-Age', '3600');

    // Preflight handling
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      // Minimal request diagnostics
      logger.log('CreateTokenHttp request received', {
        method: req.method,
        origin: req.headers.origin,
        contentType: req.headers['content-type'],
        hasAuth: !!req.headers.authorization,
        bodyKeys: req.body ? Object.keys(req.body) : 'no body',
      });

      // Verify Firebase ID token
      const authToken = req.headers.authorization?.replace('Bearer ', '');
      if (!authToken) {
        logger.warn('No auth token provided in createTokenHttp');
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const decodedToken = await admin.auth().verifyIdToken(authToken);
      logger.log('Token verified for user', { uid: decodedToken.uid });

      // Reuse callable logic
      const callableRequest: CallableRequest<{ note: string; permissions: string[] }> = {
        auth: {
          uid: decodedToken.uid,
          token: decodedToken,
          rawToken: authToken,
        },
        data: req.body,
        rawRequest: req as unknown as FirebaseRequest,
        acceptsStreaming: false,
      };

      const result = await _createTokenLogic(callableRequest);
      logger.log('Token created successfully via HTTP', { uid: decodedToken.uid });
      res.status(200).json(result);
    } catch (error) {
      logger.error('Error in createTokenHttp:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof HttpsError ? 'HttpsError' : typeof error,
      });

      if (error instanceof HttpsError) {
        const statusMap: Record<string, number> = {
          'invalid-argument': 400,
          unauthenticated: 401,
          'permission-denied': 403,
          'not-found': 404,
          'resource-exhausted': 429,
          internal: 500,
          ok: 200,
          cancelled: 499,
          unknown: 500,
          'deadline-exceeded': 504,
          'already-exists': 409,
          'failed-precondition': 400,
          aborted: 409,
          'out-of-range': 400,
          unavailable: 503,
          'data-loss': 500,
        };
        const status = statusMap[error.code] || 500;
        res.status(status).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);

export const joinTeam = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 15,
    maxInstances: 1,
    minInstances: 0,
  },
  _joinTeamLogic
);

export const leaveTeam = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 15,
    maxInstances: 1,
    minInstances: 0,
  },
  _leaveTeamLogic
);

export const kickTeamMember = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 15,
    maxInstances: 1,
    minInstances: 0,
  },
  _kickTeamMemberLogic
);

// Account deletion callable function
export const deleteUserAccount = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 1,
    minInstances: 0,
  },
  async (request: CallableRequest) => {
    // Require authentication and explicit confirmation text
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { confirmationText } = request.data || {};

    if (confirmationText !== 'DELETE MY ACCOUNT') {
      throw new HttpsError('invalid-argument', 'Invalid confirmation text');
    }

    logger.info('Account deletion requested', {
      userId: request.auth.uid,
      email: request.auth.token.email,
    });

    try {
      // Use the service directly instead of going through HTTP handler
      const { UserDeletionService } = await import('./handlers/userDeletionHandler.js');
      const userDeletionService = new UserDeletionService();

      const result = await userDeletionService.deleteUserAccount(request.auth.uid, {
        confirmationText,
      });

      return result;
    } catch (error) {
      logger.error('Account deletion error:', error);

      // Map ApiError-like shapes to HttpsError
      if (error instanceof Error && 'statusCode' in error) {
        const apiError = error as Error & { statusCode: number };
        if (apiError.statusCode === 400) {
          throw new HttpsError('invalid-argument', apiError.message);
        } else if (apiError.statusCode === 401) {
          throw new HttpsError('unauthenticated', apiError.message);
        } else if (apiError.statusCode === 403) {
          throw new HttpsError('permission-denied', apiError.message);
        }
      }

      throw new HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Account deletion failed'
      );
    }
  }
);

interface TarkovItem {
  id: string;
  name?: string;
  shortName?: string;
  basePrice?: number;
  updated?: string;
  width?: number;
  height?: number;
  iconLink?: string;
  wikiLink?: string;
  imageLink?: string;
  types?: string[];
  avg24hPrice?: number;
  traderPrices?: {
    price?: number;
    trader?: {
      name?: string;
    };
  }[];
  buyFor?: {
    price?: number;
    currency?: string;
    requirements?: {
      type?: string;
      value?: string | number;
    }[];
    source?: string;
  }[];
  sellFor?: {
    price?: number;
    currency?: string;
    requirements?: {
      type?: string;
      value?: string | number;
    }[];
    source?: string;
  }[];
  [key: string]: unknown;
}
interface TarkovDataResponse {
  items: TarkovItem[];
}

// Hoist GraphQL query to avoid per-call allocation
const TARKOV_ITEMS_QUERY = gql`
  {
    items {
      id
      name
      shortName
      basePrice
      updated
      width
      height
      iconLink
      wikiLink
      imageLink
      types
      avg24hPrice
      traderPrices {
        price
        trader {
          name
        }
      }
      buyFor {
        price
        currency
        requirements {
          type
          value
        }
        source
      }
      sellFor {
        price
        currency
        requirements {
          type
          value
        }
        source
      }
    }
  }
`;

export async function retrieveTarkovdata(): Promise<TarkovDataResponse | undefined> {
  try {
    const data: TarkovDataResponse = await request(
      'https://api.tarkov.dev/graphql',
      TARKOV_ITEMS_QUERY
    );
    return data;
  } catch (e: unknown) {
    logger.error(
      'Failed to retrieve data from Tarkov API:',
      e instanceof Error ? e.message : String(e)
    );
    return undefined;
  }
}
async function saveTarkovData(data: TarkovDataResponse | undefined) {
  if (!data || !data.items) {
    logger.error('No data received from Tarkov API to save.');
    return;
  }
  const db: Firestore = admin.firestore();
  const itemsCollection = db.collection('items');
  const MAX_WRITES_PER_BATCH = 500;
  let totalWritten = 0;
  try {
    for (let i = 0; i < data.items.length; i += MAX_WRITES_PER_BATCH) {
      const slice = data.items.slice(i, i + MAX_WRITES_PER_BATCH);
      const batch: WriteBatch = db.batch();
      slice.forEach((item: TarkovItem) => {
        const docId = item.id.replace(ITEM_ID_SANITIZER_REGEX, '_');
        const docRef = itemsCollection.doc(docId);
        batch.set(docRef, item);
      });
      await batch.commit();
      totalWritten += slice.length;
    }
    logger.log(`Successfully saved ${totalWritten} items to Firestore.`);
  } catch (e: unknown) {
    logger.error(
      'Failed to save Tarkov data to Firestore:',
      e instanceof Error ? e.message : String(e)
    );
  }
}

export const updateTarkovdataHTTPS = onRequest(
  {
    memory: '256MiB',
    timeoutSeconds: 120,
    maxInstances: 1,
    minInstances: 0,
  },
  async (_req, res) => {
    try {
      const data = await retrieveTarkovdata();
      await saveTarkovData(data);
      res.status(200).send('OK');
    } catch (error: unknown) {
      logger.error('Manual Tarkov data refresh failed:', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(200).send('OK');
    }
  }
);
// Nightly data sync from Tarkov API -> Firestore
export const scheduledTarkovDataFetch = onSchedule(
  {
    schedule: 'every day 00:00',
    timeZone: 'UTC',
    memory: '256MiB',
  },
  async () => {
    logger.log('Running scheduled Tarkov data fetch...');
    const data = await retrieveTarkovdata();
    await saveTarkovData(data);
  }
);
export { _createTeamLogic, _joinTeamLogic, _leaveTeamLogic, _kickTeamMemberLogic };
export default api;
