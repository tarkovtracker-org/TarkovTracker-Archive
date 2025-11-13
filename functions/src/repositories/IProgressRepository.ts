/**
 * Repository interface for progress-related Firestore operations
 * 
 * This interface abstracts Firestore operations to enable:
 * - Unit testing with fake implementations (no emulator needed)
 * - Clearer separation between business logic and data access
 * - Easier mocking and testing of edge cases
 */

import type { ProgressDocument } from '../types/api';
import type { FieldValue } from 'firebase-admin/firestore';

/**
 * Transaction context for progress operations
 * Provides read/write operations within a Firestore transaction
 */
export interface IProgressTransactionContext {
  /**
   * Get progress document within transaction
   */
  getProgressDoc(userId: string): Promise<ProgressDocument | undefined>;
  
  /**
   * Set/update progress document (merge mode)
   */
  setProgressDoc(userId: string, data: Record<string, unknown>, merge?: boolean): void;
  
  /**
   * Update progress document fields
   */
  updateProgressDoc(userId: string, updates: Record<string, unknown>): void;
}

/**
 * Repository interface for progress-related data access
 */
export interface IProgressRepository {
  /**
   * Run a Firestore transaction with progress operations
   * @param callback - Function that receives transaction context and returns result
   * @returns Promise with transaction result
   */
  runTransaction<T>(
    callback: (tx: IProgressTransactionContext) => Promise<T>
  ): Promise<T>;
  
  /**
   * Get user's progress document (non-transactional)
   */
  getProgressDocument(userId: string): Promise<ProgressDocument | null>;
  
  /**
   * Set progress document (non-transactional)
   */
  setProgressDocument(
    userId: string,
    data: Record<string, unknown>,
    merge?: boolean
  ): Promise<void>;
  
  /**
   * Update progress document (non-transactional)
   */
  updateProgressDocument(
    userId: string,
    updates: Record<string, unknown>
  ): Promise<void>;
  
  /**
   * Server timestamp field value
   */
  serverTimestamp(): FieldValue;
}
