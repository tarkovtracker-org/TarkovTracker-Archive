/**
 * Repository interface for team-related Firestore operations
 * 
 * This interface abstracts Firestore operations to enable:
 * - Unit testing with fake implementations (no emulator needed)
 * - Clearer separation between business logic and data access
 * - Easier mocking and testing of edge cases
 */

import type { Timestamp } from 'firebase-admin/firestore';
import type { TeamDocument, SystemDocument, ProgressDocument } from '../types/api';

/**
 * User document data (from 'user' collection)
 */
export interface UserDocumentData {
  teamHide?: Record<string, boolean>;
  [key: string]: unknown;
}

/**
 * Transaction context for team operations
 * Provides read/write operations within a Firestore transaction
 */
export interface ITeamTransactionContext {
  /**
   * Get system document within transaction
   */
  getSystemDoc(userId: string): Promise<SystemDocument | undefined>;
  
  /**
   * Get team document within transaction
   */
  getTeamDoc(teamId: string): Promise<TeamDocument | undefined>;
  
  /**
   * Set/update system document
   */
  setSystemDoc(userId: string, data: Partial<SystemDocument>): void;
  
  /**
   * Set/create team document
   */
  setTeamDoc(teamId: string, data: TeamDocument): void;
  
  /**
   * Update team document (merge)
   */
  updateTeamDoc(teamId: string, updates: Record<string, unknown>): void;
  
  /**
   * Delete team document
   */
  deleteTeamDoc(teamId: string): void;
}

/**
 * Repository interface for team-related data access
 */
export interface ITeamRepository {
  /**
   * Run a Firestore transaction with team operations
   * @param callback - Function that receives transaction context and returns result
   * @returns Promise with transaction result
   */
  runTransaction<T>(
    callback: (tx: ITeamTransactionContext) => Promise<T>
  ): Promise<T>;
  
  /**
   * Get user's system document (non-transactional)
   */
  getSystemDocument(userId: string): Promise<SystemDocument | null>;
  
  /**
   * Get team document (non-transactional)
   */
  getTeamDocument(teamId: string): Promise<TeamDocument | null>;
  
  /**
   * Get user document for visibility settings (non-transactional)
   */
  getUserDocument(userId: string): Promise<UserDocumentData | null>;
  
  /**
   * Get multiple progress documents for team members (non-transactional)
   */
  getProgressDocuments(userIds: string[]): Promise<Map<string, ProgressDocument>>;
  
  /**
   * Generate a server timestamp
   */
  serverTimestamp(): Timestamp;
  
  /**
   * Create array union field value
   */
  arrayUnion(...elements: unknown[]): unknown;
  
  /**
   * Create array remove field value
   */
  arrayRemove(...elements: unknown[]): unknown;
}
