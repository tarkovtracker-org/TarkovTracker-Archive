/**
 * Firebase Emulator Setup & Helpers
 *
 * Provides centralized access to the Firebase emulator suite for testing.
 * Replaces complex mock infrastructure with real emulator instances.
 */

import * as admin from 'firebase-admin';
import {
  FieldValue,
  Query,
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
} from 'firebase-admin/firestore';

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializeEmulator(): admin.app.App {
  // Use emulator if FIRESTORE_EMULATOR_HOST is set (set by vitest.config.js)
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  }

  // Initialize admin SDK pointing to test project
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'test-project',
    });
  }

  return admin.app();
}

// Initialize on module load
initializeEmulator();

// ============================================================================
// EXPORTS FOR TEST FILES
// ============================================================================

export { admin };

export function firestore() {
  return admin.firestore();
}

export function auth() {
  return admin.auth();
}

// ============================================================================
// DATABASE RESET
// ============================================================================

/**
 * Clear all data from Firestore emulator
 * Uses HTTP DELETE to the emulator's clear endpoint
 */
export async function resetDb(): Promise<void> {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const projectId = 'test-project';
  const url = `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 404) {
      console.warn(`Warning: Failed to clear Firestore emulator: ${response.statusText}`);
    }
  } catch (err) {
    // Silently fail if emulator is not running
    // (tests might be using mocks or emulator might be started elsewhere)
  }
}

// ============================================================================
// DATABASE SEEDING
// ============================================================================

export interface SeedData {
  [collection: string]: {
    [docId: string]: any;
  };
}

/**
 * Seed test data into Firestore emulator
 *
 * Usage:
 * ```typescript
 * await seedDb({
 *   users: {
 *     'user-1': { uid: 'user-1', email: 'test@example.com' },
 *   },
 *   tokens: {
 *     'token-1': { owner: 'user-1', active: true },
 *   },
 * });
 * ```
 */
export async function seedDb(data: SeedData): Promise<void> {
  const db = firestore();

  for (const [collectionName, docs] of Object.entries(data)) {
    const collectionRef = db.collection(collectionName);

    for (const [docId, docData] of Object.entries(docs)) {
      await collectionRef.doc(docId).set(docData);
    }
  }
}

/**
 * Get all documents from a collection
 * Useful for assertions and verification
 */
export async function getAllDocs(collectionName: string): Promise<any[]> {
  const db = firestore();
  const snapshot = await db.collection(collectionName).get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get a single document
 */
export async function getDoc(collectionName: string, docId: string): Promise<any | null> {
  const db = firestore();
  const snapshot = await db.collection(collectionName).doc(docId).get();

  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

/**
 * Delete a specific document
 */
export async function deleteDoc(collectionName: string, docId: string): Promise<void> {
  const db = firestore();
  await db.collection(collectionName).doc(docId).delete();
}

/**
 * Delete all documents from a collection
 */
export async function deleteCollection(collectionName: string): Promise<void> {
  const db = firestore();
  const docs = await db.collection(collectionName).get();

  for (const doc of docs.docs) {
    await doc.ref.delete();
  }
}

// ============================================================================
// COMMON TEST FIXTURES
// ============================================================================

export const testUser = {
  uid: 'test-user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: false,
  disabled: false,
};

export const testUser2 = {
  uid: 'test-user-2',
  email: 'test2@example.com',
  displayName: 'Test User 2',
  photoURL: null,
  emailVerified: false,
  disabled: false,
};

export const testToken = {
  id: 'test-token-1',
  owner: 'test-user-1',
  name: 'Test Token',
  active: true,
  createdAt: new Date(),
  lastUsed: null,
};

export const testTeam = {
  id: 'test-team-1',
  name: 'Test Team',
  owner: 'test-user-1',
  members: ['test-user-1'],
  createdAt: new Date(),
};

/**
 * Seed common test users
 */
export async function seedCommonUsers(): Promise<void> {
  await seedDb({
    users: {
      [testUser.uid]: testUser,
      [testUser2.uid]: testUser2,
    },
  });
}

/**
 * Seed a test team with members
 */
export async function seedTestTeam(teamData?: Partial<typeof testTeam>): Promise<void> {
  const team = { ...testTeam, ...teamData };

  await seedDb({
    teams: {
      [team.id]: team,
    },
  });
}

// ============================================================================
// FIELD VALUE HELPERS
// ============================================================================

/**
 * Create a serverTimestamp FieldValue
 * Real emulator handles this automatically, but provided for explicit use
 */
export function serverTimestamp(): FieldValue {
  return admin.firestore.FieldValue.serverTimestamp();
}

/**
 * Create an arrayUnion FieldValue
 */
export function arrayUnion(...elements: any[]): FieldValue {
  return admin.firestore.FieldValue.arrayUnion(...elements);
}

/**
 * Create an arrayRemove FieldValue
 */
export function arrayRemove(...elements: any[]): FieldValue {
  return admin.firestore.FieldValue.arrayRemove(...elements);
}

/**
 * Create an increment FieldValue
 */
export function increment(n: number): FieldValue {
  return admin.firestore.FieldValue.increment(n);
}

/**
 * Create a delete FieldValue
 */
export function deleteField(): FieldValue {
  return admin.firestore.FieldValue.delete();
}

// ============================================================================
// TRANSACTION HELPERS
// ============================================================================

/**
 * Run a transaction with automatic rollback on error
 * Emulator handles transaction semantics automatically
 */
export async function runTransaction<T>(callback: (transaction: admin.firestore.Transaction) => Promise<T>): Promise<T> {
  const db = firestore();
  return db.runTransaction(callback);
}

/**
 * Helper for concurrent transaction testing
 * Runs multiple transactions in parallel to test conflict handling
 */
export async function runConcurrentTransactions(
  callbacks: Array<(transaction: admin.firestore.Transaction) => Promise<void>>
): Promise<void> {
  const db = firestore();
  const promises = callbacks.map((callback) => db.runTransaction(callback));

  await Promise.all(promises);
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Run a query and return results with IDs
 */
export async function queryCollection<T = any>(
  collectionName: string,
  constraints?: (ref: CollectionReference) => Query
): Promise<Array<T & { id: string }>> {
  const db = firestore();
  let query: Query = db.collection(collectionName);

  if (constraints) {
    query = constraints(db.collection(collectionName) as CollectionReference);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<T & { id: string }>;
}

/**
 * Helper to create query constraints
 * Usage: queryCollection('tokens', whereConstraints({ owner: 'user-1' }))
 */
export function whereConstraints(conditions: Record<string, any>) {
  return (ref: CollectionReference) => {
    let query: Query = ref;

    for (const [field, value] of Object.entries(conditions)) {
      query = query.where(field, '==', value);
    }

    return query;
  };
}

// ============================================================================
// UTILITY FUNCTIONS FOR TESTS
// ============================================================================

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (true) {
    if (await condition()) {
      return;
    }

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for condition (${timeoutMs}ms)`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * Assert that a collection has a specific count of documents
 */
export async function assertCollectionSize(collectionName: string, expectedSize: number): Promise<void> {
  const docs = await getAllDocs(collectionName);
  if (docs.length !== expectedSize) {
    throw new Error(
      `Expected ${expectedSize} documents in ${collectionName}, got ${docs.length}`
    );
  }
}

/**
 * Assert that a document exists with specific data
 */
export async function assertDocExists(
  collectionName: string,
  docId: string,
  expectedData?: Partial<any>
): Promise<void> {
  const doc = await getDoc(collectionName, docId);

  if (doc === null) {
    throw new Error(`Expected document ${collectionName}/${docId} to exist`);
  }

  if (expectedData) {
    for (const [key, value] of Object.entries(expectedData)) {
      if (doc[key] !== value) {
        throw new Error(
          `Expected ${collectionName}/${docId}.${key} to be ${value}, got ${doc[key]}`
        );
      }
    }
  }
}
