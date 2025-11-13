/**
 * Firestore implementation of ITeamRepository
 * 
 * Encapsulates all Firestore operations for team-related data access.
 * This implementation can be swapped with a fake for unit testing.
 */

import type { Firestore, Transaction, DocumentReference, Timestamp } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  ITeamRepository,
  ITeamTransactionContext,
  UserDocumentData,
} from './ITeamRepository';
import type { TeamDocument, SystemDocument, ProgressDocument } from '../types/api';

/**
 * Firestore transaction context implementation
 */
class FirestoreTeamTransactionContext implements ITeamTransactionContext {
  constructor(
    private transaction: Transaction,
    private db: Firestore
  ) {}

  async getSystemDoc(userId: string): Promise<SystemDocument | undefined> {
    const ref = this.db
      .collection('system')
      .doc(userId) as DocumentReference<SystemDocument>;
    const doc = await this.transaction.get(ref);
    return doc.data();
  }

  async getTeamDoc(teamId: string): Promise<TeamDocument | undefined> {
    const ref = this.db
      .collection('team')
      .doc(teamId) as DocumentReference<TeamDocument>;
    const doc = await this.transaction.get(ref);
    return doc.data();
  }

  setSystemDoc(userId: string, data: Partial<SystemDocument>): void {
    const ref = this.db.collection('system').doc(userId);
    this.transaction.set(ref, data, { merge: true });
  }

  setTeamDoc(teamId: string, data: TeamDocument): void {
    const ref = this.db.collection('team').doc(teamId);
    this.transaction.set(ref, data);
  }

  updateTeamDoc(teamId: string, updates: Record<string, unknown>): void {
    const ref = this.db.collection('team').doc(teamId);
    this.transaction.update(ref, updates);
  }

  deleteTeamDoc(teamId: string): void {
    const ref = this.db.collection('team').doc(teamId);
    this.transaction.delete(ref);
  }
}

/**
 * Firestore implementation of team repository
 */
export class FirestoreTeamRepository implements ITeamRepository {
  constructor(private db: Firestore) {}

  async runTransaction<T>(
    callback: (tx: ITeamTransactionContext) => Promise<T>
  ): Promise<T> {
    return this.db.runTransaction(async (transaction) => {
      const txContext = new FirestoreTeamTransactionContext(transaction, this.db);
      return callback(txContext);
    });
  }

  async getSystemDocument(userId: string): Promise<SystemDocument | null> {
    const ref = this.db
      .collection('system')
      .doc(userId) as DocumentReference<SystemDocument>;
    const doc = await ref.get();
    return doc.exists ? doc.data()! : null;
  }

  async getTeamDocument(teamId: string): Promise<TeamDocument | null> {
    const ref = this.db
      .collection('team')
      .doc(teamId) as DocumentReference<TeamDocument>;
    const doc = await ref.get();
    return doc.exists ? doc.data()! : null;
  }

  async getUserDocument(userId: string): Promise<UserDocumentData | null> {
    const ref = this.db
      .collection('user')
      .doc(userId) as DocumentReference<UserDocumentData>;
    const doc = await ref.get();
    return doc.exists ? doc.data()! : null;
  }

  async getProgressDocuments(userIds: string[]): Promise<Map<string, ProgressDocument>> {
    const progressMap = new Map<string, ProgressDocument>();
    
    // Fetch all progress documents
    const progressPromises = userIds.map((userId) =>
      this.db
        .collection('progress')
        .doc(userId)
        .get() as Promise<FirebaseFirestore.DocumentSnapshot<ProgressDocument>>
    );
    
    const progressDocs = await Promise.all(progressPromises);
    
    // Build map of userId -> progress data
    progressDocs.forEach((doc, index) => {
      if (doc.exists) {
        progressMap.set(userIds[index], doc.data()!);
      }
    });
    
    return progressMap;
  }

  serverTimestamp(): Timestamp {
    return FieldValue.serverTimestamp() as unknown as Timestamp;
  }

  arrayUnion(...elements: unknown[]): unknown {
    return FieldValue.arrayUnion(...elements);
  }

  arrayRemove(...elements: unknown[]): unknown {
    return FieldValue.arrayRemove(...elements);
  }
}
