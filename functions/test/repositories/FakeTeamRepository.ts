/**
 * Fake implementation of ITeamRepository for unit testing
 *
 * This allows testing TeamService business logic without Firestore emulator:
 * - Fast test execution (no network calls)
 * - Easy simulation of edge cases
 * - Predictable test data
 */

import type {
  ITeamRepository,
  ITeamTransactionContext,
  UserDocumentData,
} from '../../src/repositories/ITeamRepository';
import type { TeamDocument, SystemDocument, ProgressDocument } from '../../src/types/api';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * In-memory fake transaction context
 */
class FakeTeamTransactionContext implements ITeamTransactionContext {
  private pendingWrites: Array<() => void> = [];
  private transactionReads: Map<string, SystemDocument | undefined> = new Map();
  private teamReads: Map<string, TeamDocument | undefined> = new Map();

  constructor(
    private systemDocs: Map<string, SystemDocument>,
    private teamDocs: Map<string, TeamDocument>
  ) {}

  async getSystemDoc(userId: string): Promise<SystemDocument | undefined> {
    // Use cached read within transaction to ensure snapshot isolation
    if (this.transactionReads.has(userId)) {
      return this.transactionReads.get(userId);
    }
    const doc = this.systemDocs.get(userId);
    this.transactionReads.set(userId, doc);
    return doc;
  }

  async getTeamDoc(teamId: string): Promise<TeamDocument | undefined> {
    // Use cached read within transaction to ensure snapshot isolation
    if (this.teamReads.has(teamId)) {
      return this.teamReads.get(teamId);
    }
    const doc = this.teamDocs.get(teamId);
    this.teamReads.set(teamId, doc);
    return doc;
  }

  setSystemDoc(userId: string, data: Partial<SystemDocument>): void {
    this.pendingWrites.push(() => {
      const existing = this.systemDocs.get(userId) || {};
      // Properly handle null values to clear fields
      const merged: SystemDocument = { ...existing };
      Object.entries(data).forEach(([key, value]) => {
        if (value === null) {
          // @ts-ignore - Allow null to clear fields
          merged[key as keyof SystemDocument] = null;
        } else if (value !== undefined) {
          // @ts-ignore - Type assertion for partial update
          merged[key as keyof SystemDocument] = value;
        }
      });
      this.systemDocs.set(userId, merged);
    });
  }

  setTeamDoc(teamId: string, data: TeamDocument): void {
    this.pendingWrites.push(() => {
      this.teamDocs.set(teamId, data);
    });
  }

  updateTeamDoc(teamId: string, updates: Record<string, unknown>): void {
    this.pendingWrites.push(() => {
      const existing = this.teamDocs.get(teamId);
      if (existing) {
        // Handle array operations and field updates
        Object.entries(updates).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null && 'type' in value) {
            const op = value as { type: string; values: unknown[] };
            if (op.type === 'arrayUnion' && key === 'members') {
              const current = existing.members || [];
              const newValues = op.values as string[];
              existing.members = [...new Set([...current, ...newValues])];
            } else if (op.type === 'arrayRemove' && key === 'members') {
              const current = existing.members || [];
              const removeValues = new Set(op.values as string[]);
              existing.members = current.filter((m) => !removeValues.has(m));
            }
          } else {
            // Handle known TeamDocument fields explicitly
            switch (key) {
              case 'members':
                existing.members = value as string[];
                break;
              case 'password':
                existing.password = value as string;
                break;
              case 'maximumMembers':
                existing.maximumMembers = value as number;
                break;
              case 'owner':
                existing.owner = value as string;
                break;
              case 'createdAt':
                existing.createdAt = value as any;
                break;
              default:
                // Silently ignore unknown fields (matches Firestore behavior)
                break;
            }
          }
        });
        this.teamDocs.set(teamId, existing);
      }
    });
  }

  deleteTeamDoc(teamId: string): void {
    this.pendingWrites.push(() => {
      this.teamDocs.delete(teamId);
    });
  }

  /**
   * Commit all pending writes (simulates transaction commit)
   */
  commit(): void {
    this.pendingWrites.forEach((write) => write());
    this.pendingWrites = [];
  }
}

/**
 * Fake team repository with in-memory storage
 */
export class FakeTeamRepository implements ITeamRepository {
  private systemDocs = new Map<string, SystemDocument>();
  private teamDocs = new Map<string, TeamDocument>();
  private userDocs = new Map<string, UserDocumentData>();
  private progressDocs = new Map<string, ProgressDocument>();

  async runTransaction<T>(callback: (tx: ITeamTransactionContext) => Promise<T>): Promise<T> {
    // Create transaction with snapshot of current state
    const tx = new FakeTeamTransactionContext(this.systemDocs, this.teamDocs);

    try {
      const result = await callback(tx);
      tx.commit(); // Commit writes on success
      return result;
    } catch (error) {
      // Transaction failed - don't commit writes (rollback)
      throw error;
    }
  }

  async getSystemDocument(userId: string): Promise<SystemDocument | null> {
    return this.systemDocs.get(userId) || null;
  }

  async getTeamDocument(teamId: string): Promise<TeamDocument | null> {
    return this.teamDocs.get(teamId) || null;
  }

  async getUserDocument(userId: string): Promise<UserDocumentData | null> {
    return this.userDocs.get(userId) || null;
  }

  async getProgressDocuments(userIds: string[]): Promise<Map<string, ProgressDocument>> {
    const result = new Map<string, ProgressDocument>();
    userIds.forEach((userId) => {
      const doc = this.progressDocs.get(userId);
      if (doc) {
        result.set(userId, doc);
      }
    });
    return result;
  }

  serverTimestamp(): Timestamp {
    return Timestamp.now();
  }

  arrayUnion(...elements: unknown[]): unknown {
    return { type: 'arrayUnion', values: elements };
  }

  arrayRemove(...elements: unknown[]): unknown {
    return { type: 'arrayRemove', values: elements };
  }

  // Test helper methods

  /**
   * Seed a system document for testing
   * Note: This completely replaces any existing document
   */
  seedSystemDoc(userId: string, data: SystemDocument): void {
    // Create a clean copy to avoid reference issues
    this.systemDocs.set(userId, { ...data });
  }

  /**
   * Seed a team document for testing
   * Note: This completely replaces any existing document
   */
  seedTeamDoc(teamId: string, data: TeamDocument): void {
    // Create a clean copy to avoid reference issues
    this.teamDocs.set(teamId, { ...data });
  }

  /**
   * Seed a user document for testing
   */
  seedUserDoc(userId: string, data: UserDocumentData): void {
    this.userDocs.set(userId, data);
  }

  /**
   * Seed a progress document for testing
   */
  seedProgressDoc(userId: string, data: ProgressDocument): void {
    this.progressDocs.set(userId, data);
  }

  /**
   * Clear all data (for test cleanup)
   * Call this in afterEach to ensure clean state between tests
   */
  clear(): void {
    this.systemDocs.clear();
    this.teamDocs.clear();
    this.userDocs.clear();
    this.progressDocs.clear();
  }

  /**
   * Reset to initial state (alias for clear())
   * Ensures no state leaks between tests
   */
  reset(): void {
    this.clear();
  }

  /**
   * Get all team documents (for assertions)
   * Returns a copy to prevent external modification
   */
  getAllTeams(): Map<string, TeamDocument> {
    return new Map(this.teamDocs);
  }

  /**
   * Get all system documents (for assertions)
   * Returns a copy to prevent external modification
   */
  getAllSystemDocs(): Map<string, SystemDocument> {
    return new Map(this.systemDocs);
  }

  /**
   * Get internal state size for debugging
   */
  getStateSize(): { systems: number; teams: number; users: number; progress: number } {
    return {
      systems: this.systemDocs.size,
      teams: this.teamDocs.size,
      users: this.userDocs.size,
      progress: this.progressDocs.size,
    };
  }
}
