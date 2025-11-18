import { logger } from '../logger.js';
import { onRequest } from 'firebase-functions/v2/https';
// Removed unused imports Request, Response
import admin from 'firebase-admin';
import type {
  Firestore,
  DocumentReference,
  DocumentSnapshot,
  Transaction,
} from 'firebase-admin/firestore';
import type { FunctionsErrorCode } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { withCorsAndAuth } from '../middleware/onRequestAuth.js';
import type { RevokeTokenData, RevokeTokenResult, SystemDocData, TokenDocData } from './types.js';
import { createLazyFirestore } from '../utils/factory.js';
// Map HttpsError codes to HTTP status codes
function getStatusFromHttpsErrorCode(code: FunctionsErrorCode): number {
  switch (code) {
    case 'ok':
      return 200;
    case 'cancelled':
      return 499;
    case 'unknown':
      return 500;
    case 'invalid-argument':
      return 400;
    case 'deadline-exceeded':
      return 504;
    case 'not-found':
      return 404;
    case 'already-exists':
      return 409;
    case 'permission-denied':
      return 403;
    case 'resource-exhausted':
      return 429;
    case 'failed-precondition':
      return 400;
    case 'aborted':
      return 409;
    case 'out-of-range':
      return 400;
    case 'unauthenticated':
      return 401;
    case 'internal':
      return 500;
    case 'unavailable':
      return 503;
    case 'data-loss':
      return 500;
    default:
      logger.warn('Unknown HttpsError code received in revokeToken:', code);
      return 500;
  }
}
async function _revokeTokenLogic(
  ownerUid: string,
  data: RevokeTokenData
): Promise<RevokeTokenResult> {
  const getDb = createLazyFirestore();
  const db: Firestore = getDb();
  logger.log('Starting revoke token logic (onRequest)', {
    data,
    owner: ownerUid,
  });
  // ownerUid is already validated by the time this is called in the onRequest wrapper
  if (!data.token) {
    logger.warn('Invalid revoke parameters: token is required.', {
      data,
    });
    throw new HttpsError('invalid-argument', 'Invalid token parameters: token is required.');
  }
  const systemRef: DocumentReference<SystemDocData> = db
    .collection('system')
    .doc(ownerUid) as DocumentReference<SystemDocData>;
  const tokenRef: DocumentReference<TokenDocData> = db
    .collection('token')
    .doc(data.token) as DocumentReference<TokenDocData>;
  try {
    await db.runTransaction(async (transaction: Transaction) => {
      const tokenDoc: DocumentSnapshot<TokenDocData> = await transaction.get(tokenRef);
      const systemDoc: DocumentSnapshot<SystemDocData> = await transaction.get(systemRef);
      if (!tokenDoc.exists) {
        logger.warn('Attempted to revoke non-existent token.', {
          owner: ownerUid,
          token: data.token,
        });
        throw new HttpsError('not-found', 'Token not found.');
      }
      const tokenData = tokenDoc.data();
      if (tokenData?.owner !== ownerUid) {
        logger.warn('Permission denied to revoke token.', {
          owner: ownerUid,
          tokenOwner: tokenData?.owner,
          token: data.token,
        });
        throw new HttpsError(
          'permission-denied',
          'You do not have permission to revoke this token.'
        );
      }
      transaction.delete(tokenRef);
      if (systemDoc.exists) {
        transaction.update(systemRef, {
          tokens: admin.firestore.FieldValue.arrayRemove(data.token),
        });
      } else {
        logger.warn('System document not found for user while revoking token.', {
          owner: ownerUid,
          token: data.token,
        });
      }
    });
    logger.log('Revoked token successfully (onRequest)', {
      owner: ownerUid,
      token: data.token,
    });
    return { revoked: true };
  } catch (e: unknown) {
    let errorMessage = 'Unknown error during token revocation';
    let errorCode: FunctionsErrorCode | string = 'internal'; // Can be FunctionsErrorCode or a generic string
    let errorDetails: unknown | undefined = undefined;
    if (e instanceof HttpsError) {
      errorMessage = e.message;
      errorCode = e.code;
      errorDetails = e.details;
    } else if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === 'string') {
      errorMessage = e;
    }
    logger.error('Failed to revoke token transaction (onRequest)', {
      owner: ownerUid,
      token: data.token,
      error: errorMessage,
      code: errorCode,
      details: errorDetails,
      originalError: e,
    });
    if (e instanceof HttpsError) {
      throw e;
    } else {
      // Construct a new HttpsError with the determined message
      throw new HttpsError('internal', errorMessage, errorDetails);
    }
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function revokeTokenHandler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  await withCorsAndAuth(req, res, async (req, res, uid: string) => {
    if (!req.body || typeof req.body !== 'object' || !('data' in req.body)) {
      res.status(400).json({ error: 'Invalid request body: "data" field is required.' });
      return;
    }
    const data = req.body.data as RevokeTokenData;
    try {
      const result = await _revokeTokenLogic(uid, data);
      res.status(200).json(result);
    } catch (e: unknown) {
      let messageToSend = 'An error occurred while processing your request.';
      let httpStatus = 500;
      let errorCode: FunctionsErrorCode | string | undefined = 'internal';
      let errorDetails: unknown | undefined = undefined;
      let fullErrorMessage = 'Unknown error';
      if (e instanceof HttpsError) {
        httpStatus = getStatusFromHttpsErrorCode(e.code as FunctionsErrorCode);
        errorCode = e.code;
        errorDetails = e.details;
        fullErrorMessage = e.message;
        switch (e.code) {
          case 'not-found':
            messageToSend = 'Token not found.';
            break;
          case 'permission-denied':
            messageToSend = 'You do not have permission to revoke this token.';
            break;
          case 'invalid-argument':
            messageToSend = 'Invalid request parameters.';
            break;
          default:
            messageToSend = 'An error occurred while processing your request.';
        }
      } else if (e instanceof Error) {
        fullErrorMessage = e.message;
      } else if (typeof e === 'string') {
        fullErrorMessage = e;
      }
      logger.error('Error from _revokeTokenLogic in revokeToken handler', {
        uid,
        originalError: e,
        errorCode,
        errorMessage: fullErrorMessage,
        errorDetails,
        clientMessageSent: messageToSend,
        httpStatusSet: httpStatus,
      });
      res.status(httpStatus).json({ error: messageToSend });
    }
  });
}
export const revokeToken = onRequest(
  {
    memory: '256MiB',
    timeoutSeconds: 20,
  },
  revokeTokenHandler
);
