// Shared utility functions
import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import type admin from 'firebase-admin';
import type { DocumentReference, WriteBatch } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import UIDGenerator from '../token/UIDGenerator';
import { createLazyFirestore } from './factory';
// Shared UID generators
export const PASSWORD_UID_GEN: InstanceType<typeof UIDGenerator> = new UIDGenerator(
  48,
  UIDGenerator.BASE62
);
export const TEAM_UID_GEN: InstanceType<typeof UIDGenerator> = new UIDGenerator(32);
// Hoist regex to avoid per-call compilation
// eslint-disable-next-line no-useless-escape
export const ITEM_ID_SANITIZER_REGEX = /[*?\[\\/]/g;
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
  logger.error(`Team operation error in ${context}:`, error);
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
  const getDb = createLazyFirestore();
  const db = getDb();
  const historyPath = `${docRef.path}/history/${targetDocRef.id}`;
  const historyRef = db.doc(historyPath);
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
  const settledResults = await Promise.allSettled(promises);
  settledResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      const { reason } = result;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      errors.push(error);
    }
  });
  return { results, errors };
}
