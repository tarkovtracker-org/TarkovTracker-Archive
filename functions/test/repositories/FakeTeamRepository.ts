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

  constructor(
    private systemDocs: Map<string, SystemDocument>,
    private teamDocs: Map<string, TeamDocument>
  ) {}

  async getSystemDoc(userId: string): Promise<SystemDocument | undefined> {
    return this.systemDocs.get(userId);
  }

  async getTeamDoc(teamId: string): Promise<TeamDocument | undefined> {
    return this.teamDocs.get(teamId);
  }

  setSystemDoc(userId: string, data: Partial<SystemDocument>): void {
    this.pendingWrites.push(() => {
      const existing = this.systemDocs.get(userId) || {};
      this.systemDocs.set(userId, { ...existing, ...data });
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
        // Handle array operations
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
            (existing as Record<string, unknown>)[key] = value;
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

  async runTransaction<T>(
    callback: (tx: ITeamTransactionContext) => Promise<T>
  ): Promise<T> {
    const tx = new FakeTeamTransactionContext(this.systemDocs, this.teamDocs);
    const result = await callback(tx);
    tx.commit(); // Commit writes
    return result;
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
   */
  seedSystemDoc(userId: string, data: SystemDocument): void {
    this.systemDocs.set(userId, data);
  }

  /**
   * Seed a team document for testing
   */
  seedTeamDoc(teamId: string, data: TeamDocument): void {
    this.teamDocs.set(teamId, data);
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
   */
  clear(): void {
    this.systemDocs.clear();
    this.teamDocs.clear();
    this.userDocs.clear();
    this.progressDocs.clear();
  }

  /**
   * Get all team documents (for assertions)
   */
  getAllTeams(): Map<string, TeamDocument> {
    return new Map(this.teamDocs);
  }

  /**
   * Get all system documents (for assertions)
   */
  getAllSystemDocs(): Map<string, SystemDocument> {
    return new Map(this.systemDocs);
  }
}
