/**
 * Firestore implementation of IProgressRepository
 * 
 * Encapsulates all Firestore operations for progress-related data access.
 * This implementation can be swapped with a fake for unit testing.
 */

import type { Firestore, Transaction, DocumentReference, FieldValue } from 'firebase-admin/firestore';
import { FieldValue as FieldValueClass } from 'firebase-admin/firestore';
import type {
  IProgressRepository,
  IProgressTransactionContext,
} from './IProgressRepository';
import type { ProgressDocument } from '../types/api';

/**
 * Firestore transaction context implementation
 */
class FirestoreProgressTransactionContext implements IProgressTransactionContext {
  constructor(
    private transaction: Transaction,
    private db: Firestore
  ) {}

  async getProgressDoc(userId: string): Promise<ProgressDocument | undefined> {
    const ref = this.db
      .collection('progress')
      .doc(userId) as DocumentReference<ProgressDocument>;
    const doc = await this.transaction.get(ref);
    return doc.data();
  }

  setProgressDoc(userId: string, data: Record<string, unknown>, merge = true): void {
    const ref = this.db.collection('progress').doc(userId);
    this.transaction.set(ref, data, { merge });
  }

  updateProgressDoc(userId: string, updates: Record<string, unknown>): void {
    const ref = this.db.collection('progress').doc(userId);
    this.transaction.update(ref, updates);
  }
}

/**
 * Firestore implementation of progress repository
 */
export class FirestoreProgressRepository implements IProgressRepository {
  constructor(private db: Firestore) {}

  async runTransaction<T>(
    callback: (tx: IProgressTransactionContext) => Promise<T>
  ): Promise<T> {
    return this.db.runTransaction(async (transaction) => {
      const txContext = new FirestoreProgressTransactionContext(transaction, this.db);
      return callback(txContext);
    });
  }

  async getProgressDocument(userId: string): Promise<ProgressDocument | null> {
    const ref = this.db
      .collection('progress')
      .doc(userId) as DocumentReference<ProgressDocument>;
    const doc = await ref.get();
    return doc.exists ? doc.data()! : null;
  }

  async setProgressDocument(
    userId: string,
    data: Record<string, unknown>,
    merge = true
  ): Promise<void> {
    const ref = this.db.collection('progress').doc(userId);
    await ref.set(data, { merge });
  }

  async updateProgressDocument(
    userId: string,
    updates: Record<string, unknown>
  ): Promise<void> {
    const ref = this.db.collection('progress').doc(userId);
    await ref.update(updates);
  }

  serverTimestamp(): FieldValue {
    return FieldValueClass.serverTimestamp();
  }
}
