// Shared utility functions
import {
  HttpsError,
  CallableRequest,
} from 'firebase-functions/v2/https';
import functions from 'firebase-functions';
import admin from 'firebase-admin';
import {
  DocumentReference,
  WriteBatch,
  FieldValue,
} from 'firebase-admin/firestore';
import UIDGenerator from 'uid-generator';

// Shared UID generators
export const PASSWORD_UID_GEN = new UIDGenerator(48, UIDGenerator.BASE62);
export const TEAM_UID_GEN = new UIDGenerator(32);

// Hoist regex to avoid per-call compilation
export const ITEM_ID_SANITIZER_REGEX = /[/\\*?[\]]/g;

export interface SystemDocData {
  team?: string | null;
  teamMax?: number;
  lastLeftTeam?: admin.firestore.Timestamp;
}

export interface TeamDocData {
  owner?: string;
  password?: string;
  maximumMembers?: number;
  members?: string[];
  createdAt?: admin.firestore.Timestamp;
}

export function validateAuth(request: CallableRequest<unknown>): string {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  return request.auth.uid;
}

export function handleTeamError(error: unknown, context: string): never {
  functions.logger.error(`Team operation error in ${context}:`, error);
  if (error instanceof HttpsError) {
    throw error;
  }
  throw new HttpsError('internal', `Team operation failed: ${context}`);
}

export async function writeToHistory(
  docRef: DocumentReference,
  targetDocRef: DocumentReference,
  data: Record<string, unknown>,
  batch?: WriteBatch
): Promise<void> {
  const historyPath = `${docRef.path}/history/${targetDocRef.id}`;
  const historyRef = admin.firestore().doc(historyPath);
  const historyEntry = {
    ...data,
    updated_at: FieldValue.serverTimestamp(),
  };

  if (batch) {
    batch.set(historyRef, historyEntry);
  } else {
    await historyRef.set(historyEntry);
  }
}

export function sanitizeItemId(itemId: string): string {
  return itemId.replace(ITEM_ID_SANITIZER_REGEX, '_');
}

export async function waitForAll<T>(
  promises: Promise<T>[]
): Promise<{ results: T[]; errors: Error[] }> {
  const results: T[] = [];
  const errors: Error[] = [];

  await Promise.allSettled(promises).then((settledResults) => {
    settledResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push(result.reason);
      }
    });
  });

  return { results, errors };
}
