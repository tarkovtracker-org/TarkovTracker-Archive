import admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError, CallableRequest, FunctionsErrorCode } from 'firebase-functions/v2/https';
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
import cors from 'cors';
import * as functions from 'firebase-functions';
import express, { Express, Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { verifyBearer } from './auth/verifyBearer.js';
import tokenHandler from './token/tokenHandler.js';
import progressHandler from './progress/progressHandler.js';
import { createToken } from './token/create.js';
import { revokeToken } from './token/revoke.js';
admin.initializeApp();
export { createToken, revokeToken };
interface ApiToken {
  owner: string;
  note: string;
  permissions: string[];
  calls?: number;
  createdAt?: admin.firestore.Timestamp;
  token?: string;
}
interface UserContext {
  id: string;
  username?: string;
  roles?: string[];
}
interface AuthenticatedRequest extends Request {
  apiToken?: ApiToken;
  user?: UserContext;
}
const app: Express = express();
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.log(`API Request: ${req.method} ${req.originalUrl}`);
  next();
});
app.use(cors({ origin: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define a reusable type for Express middleware without causing linting errors
// This is a proper type for middleware that is passed to app.use()
type ExpressMiddleware = (_req: Request, _res: Response, _next: NextFunction) => void;

// Then use this type instead of inline casting
app.use(verifyBearer as ExpressMiddleware);

// Define a type for handlers with only the parameters they use
type AuthenticatedHandler = (_req: AuthenticatedRequest, _res: Response) => void | Promise<void>;
app.get('/api/token', tokenHandler.getTokenInfo as AuthenticatedHandler);
app.get('/api/progress', progressHandler.getPlayerProgress as AuthenticatedHandler);
app.get('/api/team/progress', progressHandler.getTeamProgress as AuthenticatedHandler);
app.post('/api/team/create', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // Create a mock callable request
    const callableRequest: CallableRequest<CreateTeamData> = {
      auth: {
        uid: req.user.id,
        token: req.user as any
      },
      data: req.body,
      rawRequest: req as any,
      acceptsStreaming: false
    };
    
    // Call the existing logic
    const result = await _createTeamLogic(callableRequest);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error in /api/team/create:', error);
    if (error instanceof HttpsError) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
app.post('/api/progress/level/:levelValue', progressHandler.setPlayerLevel as AuthenticatedHandler);
app.post('/api/progress/task/:taskId', progressHandler.updateSingleTask as AuthenticatedHandler);
app.post('/api/progress/tasks', progressHandler.updateMultipleTasks as AuthenticatedHandler);
app.post(
  '/api/progress/task/objective/:objectiveId',
  progressHandler.updateTaskObjective as AuthenticatedHandler
);
// --- Backward Compatibility Routes for /api/v2 ---
// These routes ensure that old /api/v2/ endpoints still work by pointing to the same handlers.
// v2 Token Route
app.get('/api/v2/token', tokenHandler.getTokenInfo as AuthenticatedHandler);
// v2 Progress Routes
app.get('/api/v2/progress', progressHandler.getPlayerProgress as AuthenticatedHandler);
app.get('/api/v2/team/progress', progressHandler.getTeamProgress as AuthenticatedHandler);
app.post(
  '/api/v2/progress/level/:levelValue',
  progressHandler.setPlayerLevel as AuthenticatedHandler
);
app.post('/api/v2/progress/task/:taskId', progressHandler.updateSingleTask as AuthenticatedHandler);
app.post('/api/v2/progress/tasks', progressHandler.updateMultipleTasks as AuthenticatedHandler);
app.post(
  '/api/v2/progress/task/objective/:objectiveId',
  progressHandler.updateTaskObjective as AuthenticatedHandler
);

// Define a type for Express error handling middleware to clearly show intent
type ErrorHandlerMiddleware = (
  _err: Error,
  _req: Request,
  _res: Response,
  _next: NextFunction
) => void;

// Use the error handler type to make the intent clear
app.use(((_err: Error, _req: Request, _res: Response, _next: NextFunction) => {
  const authReq = _req as AuthenticatedRequest;
  const errorDetails = {
    error: _err.message,
    stack: _err.stack,
    url: _req.originalUrl,
    method: _req.method,
    user: {
      id: authReq.user?.id,
      username: authReq.user?.username,
      roles: authReq.user?.roles,
    },
    token: {
      owner: authReq.apiToken?.owner,
      permissions: authReq.apiToken?.permissions,
    },
    headers: _req.headers,
  };
  logger.error('Unhandled error in API:', errorDetails);
  _res.status(500).send({
    error: 'An internal server error occurred.',
    isDevelopment: process.env.NODE_ENV === 'development',
    details: process.env.NODE_ENV === 'development' ? _err.message : undefined,
  });
}) as ErrorHandlerMiddleware);

export const api = functions.https.onRequest(app);
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
async function _leaveTeamLogic(request: CallableRequest<void>): Promise<{ left: boolean }> {
  const db: Firestore = admin.firestore();
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  const userUid: string = request.auth.uid;
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
    logger.error('Failed to leave team', {
      owner: userUid,
      error: e,
    });
    if (e instanceof HttpsError) {
      throw e;
    }
    const message = e instanceof Error ? e.message : String(e);
    throw new HttpsError('internal', 'Error during team leave', message);
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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  const userUid: string = request.auth.uid;
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
    logger.error('Failed to join team', {
      user: userUid,
      team: data.id,
      error: e,
    });
    if (e instanceof HttpsError) {
      throw e;
    }
    const message = e instanceof Error ? e.message : String(e);
    throw new HttpsError('internal', 'Error during team join', message);
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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  const userUid: string = request.auth.uid;
  const data = request.data;
  try {
    let createdTeam = '';
    let finalTeamPassword = '';
    await db.runTransaction(async (transaction: Transaction) => {
      try {
        logger.log('[createTeam] Transaction start', { userUid });
        const systemRef: DocumentReference<SystemDocData> = db
          .collection('system')
          .doc(userUid) as DocumentReference<SystemDocData>;
        logger.log('[createTeam] systemRef', { path: systemRef.path });
        const systemDoc: DocumentSnapshot<SystemDocData> = await transaction.get(systemRef);
        const systemData = systemDoc?.data();
        logger.log('[createTeam] systemData', { systemData });
        if (systemData?.team) {
          logger.log('[createTeam] User already in team', {
            team: systemData.team,
          });
          throw new HttpsError('failed-precondition', 'User is already in a team.');
        }
        if (systemData?.lastLeftTeam) {
          const now = admin.firestore.Timestamp.now();
          const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(
            now.toMillis() - 5 * 60 * 1000
          );
          logger.log('[createTeam] lastLeftTeam', {
            lastLeftTeam: systemData.lastLeftTeam.toMillis(),
            now: now.toMillis(),
            fiveMinutesAgo: fiveMinutesAgo.toMillis(),
          });
          if (systemData.lastLeftTeam > fiveMinutesAgo) {
            throw new HttpsError(
              'failed-precondition',
              'You must wait 5 minutes after leaving a team to create a new one.'
            );
          }
        }
        logger.log('[createTeam] Creating UIDGenerator');
        const uidgen = new UIDGenerator(32);
        const teamId = await uidgen.generate();
        logger.log('[createTeam] Generated teamId', { teamId });
        let teamPassword = data.password;
        logger.log('[createTeam] DEBUG: Initial teamPassword from data (data.password):');
        logger.log(data.password === undefined ? 'undefined' : data.password);
        if (!teamPassword) {
          logger.log('[createTeam] DEBUG: No client password, generating one...');
          try {
            const passGen = new UIDGenerator(48, UIDGenerator.BASE62);
            const generatedPass = await passGen.generate();
            logger.log('[createTeam] DEBUG: Raw generatedPass:');
            logger.log(generatedPass === undefined ? 'undefined' : generatedPass);
            if (generatedPass && generatedPass.length >= 4) {
              teamPassword = generatedPass;
              logger.log('[createTeam] DEBUG: Using generated password (masked): ****');
            } else {
              logger.warn(
                '[createTeam] DEBUG: Generated password was short or falsy. Raw:',
                generatedPass,
                'Using fallback: DEBUG_PASS_123'
              );
              teamPassword = 'DEBUG_PASS_123';
            }
          } catch (genError) {
            logger.error(
              '[createTeam] DEBUG: Error during password generation:',
              genError
            );
            teamPassword = 'ERROR_PASS_456';
          }
        } else {
          logger.log('[createTeam] DEBUG: Using client-provided password (masked): ****');
        }
        finalTeamPassword = teamPassword;
        logger.log(
          '[createTeam] DEBUG: Final teamPassword before set (masked):',
          teamPassword ? '****' : '(IT IS FALSY)',
          'Actual value for Firestore:',
          teamPassword
        );
        createdTeam = teamId;
        const teamRef = db.collection('team').doc(teamId);
        logger.log('[createTeam] teamRef', { path: teamRef.path });
        transaction.set(teamRef, {
          owner: userUid,
          password: teamPassword,
          maximumMembers: data.maximumMembers || 10,
          members: [userUid],
          createdAt: FieldValue.serverTimestamp(),
        });
        logger.log('[createTeam] Set team document');
        transaction.set(systemRef, { team: teamId }, { merge: true });
        logger.log('[createTeam] Set system document');
      } catch (err) {
        logger.error('[createTeam] Error inside transaction', {
          error: err,
          errorString: JSON.stringify(err),
          errorMessage:
            typeof err === 'object' && err !== null && 'message' in err
              ? String((err as { message: unknown }).message)
              : (err?.toString?.() ?? String(err)),
          errorStack:
            typeof err === 'object' &&
            err !== null &&
            'stack' in err &&
            (err as { stack?: unknown }).stack
              ? String((err as { stack: unknown }).stack)
              : undefined,
        });
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
    logger.error('Failed to create team', {
      owner: userUid,
      error: e,
      errorString: JSON.stringify(e),
      errorMessage:
        typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : (e?.toString?.() ?? String(e)),
      errorStack:
        typeof e === 'object' && e !== null && 'stack' in e && (e as { stack?: unknown }).stack
          ? String((e as { stack: unknown }).stack)
          : undefined,
    });
    if (e instanceof HttpsError) {
      throw e;
    }
    const message = e instanceof Error ? e.message : String(e);
    throw new HttpsError('internal', 'Error during team creation', message);
  }
}
interface KickTeamMemberData {
  kicked: string;
}
async function _kickTeamMemberLogic(
  request: CallableRequest<KickTeamMemberData>
): Promise<{ kicked: boolean }> {
  const db: Firestore = admin.firestore();
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  const userUid: string = request.auth.uid;
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
    logger.error('Failed to kick team member', {
      owner: userUid,
      kicked: data.kicked,
      error: e,
    });
    if (e instanceof HttpsError) {
      throw e;
    }
    const message = e instanceof Error ? e.message : String(e);
    throw new HttpsError('internal', 'Error kicking member', message);
  }
}
export const createTeam = functions.https.onCall(_createTeamLogic);

// Alternative HTTPS endpoint for createTeam with explicit CORS handling
export const createTeamHttp = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  
  try {
    // Extract auth token from Authorization header
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(authToken);
    
    // Create a mock callable request
    const callableRequest: CallableRequest<CreateTeamData> = {
      auth: {
        uid: decodedToken.uid,
        token: decodedToken
      },
      data: req.body,
      rawRequest: req as any,
      acceptsStreaming: false
    };
    
    // Call the existing logic
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
});
export const joinTeam = functions.https.onCall(_joinTeamLogic);
export const leaveTeam = functions.https.onCall(_leaveTeamLogic);
export const kickTeamMember = functions.https.onCall(_kickTeamMemberLogic);
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
async function retrieveTarkovdata(): Promise<TarkovDataResponse | undefined> {
  const query = gql`
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
  try {
    const data: TarkovDataResponse = await request('https://api.tarkov.dev/graphql', query);
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
  const batch: WriteBatch = db.batch();
  const itemsCollection = db.collection('items');
  data.items.forEach((item: TarkovItem) => {
    const docId = item.id.replace(/[/\\*?[\]]/g, '_');
    const docRef = itemsCollection.doc(docId);
    batch.set(docRef, item);
  });
  try {
    await batch.commit();
    logger.log(`Successfully saved ${data.items.length} items to Firestore.`);
  } catch (e: unknown) {
    logger.error(
      'Failed to save Tarkov data to Firestore:',
      e instanceof Error ? e.message : String(e)
    );
  }
}
export const scheduledTarkovDataFetch = onSchedule('every day 00:00', async () => {
  logger.log('Running scheduled Tarkov data fetch...');
  const data = await retrieveTarkovdata();
  await saveTarkovData(data);
});
