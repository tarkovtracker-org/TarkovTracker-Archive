import { logger } from 'firebase-functions/v2';
import { onRequest, Request as FirebaseRequest } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import {
  Firestore,
  DocumentReference,
  DocumentSnapshot,
  Transaction,
} from 'firebase-admin/firestore';
import { HttpsError, FunctionsErrorCode } from 'firebase-functions/v2/https';
import { withCorsAndAuth } from '../middleware/onRequestAuth.js';
// Define interfaces for data structures
interface RevokeTokenData {
  token: string;
}
interface SystemDocData {
  tokens?: string[];
}
interface TokenDocData {
  owner: string;
}
// Helper function to map HttpsError codes to HTTP status codes (similar to functions/src/index.ts)
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
// Core logic adjusted to accept uid and data directly
async function _revokeTokenLogic(
  ownerUid: string,
  data: RevokeTokenData
): Promise<{ revoked: boolean }> {
  const db: Firestore = admin.firestore();
  logger.log('Starting revoke token logic (onRequest)', {
    data: data,
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

export const revokeToken = onRequest(
  {
    memory: '256MiB',
    timeoutSeconds: 20,
  },
  async (req: FirebaseRequest, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    withCorsAndAuth(req, res, async (req, res, uid: string) => {
      if (!req.body || typeof req.body !== 'object' || !('data' in req.body)) {
        res.status(400).json({ error: 'Invalid request body: "data" field is required.' });
        return;
      }
      const data = req.body.data as RevokeTokenData;
      try {
        const result = await _revokeTokenLogic(uid, data);
        res.status(200).json({ data: result });
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

          // Map HttpsError codes to safe client messages
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

        // Log full error details server-side for debugging
        logger.error('Error from _revokeTokenLogic in revokeToken handler', {
          uid: uid,
          originalError: e,
          errorCode: errorCode,
          errorMessage: fullErrorMessage,
          errorDetails: errorDetails,
          clientMessageSent: messageToSend,
          httpStatusSet: httpStatus,
        });

        res.status(httpStatus).json({ error: messageToSend });
      }
    });
  }
);
