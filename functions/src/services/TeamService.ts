/**
 * TeamService - Main aggregator for team operations
 * 
 * This service provides a unified interface for all team-related operations
 * by delegating to focused modules:
 * 
 * - teamCore: Team creation and core operations
 * - teamMembership: Joining and leaving teams
 * - teamProgress: Fetching team member progress
 * 
 * Uses repository pattern for better testability:
 * - Can be tested with fake repositories (no Firestore emulator needed)
 * - Clear separation between business logic and data access
 * - Easier to mock edge cases and transaction failures
 * 
 * Architecture:
 * - Each module is < 200 LOC with clear responsibilities
 * - All transactional behavior is preserved
 * - Public API remains unchanged for backward compatibility
 */

import type { Firestore } from 'firebase-admin/firestore';
import { createLazyFirestore } from '../utils/factory';
import type { ITeamRepository } from '../repositories/ITeamRepository';
import { FirestoreTeamRepository } from '../repositories/FirestoreTeamRepository';

// Import focused modules
import {
  createTeam as createTeamImpl,
  type CreateTeamData,
  type CreateTeamResult,
} from './team/teamCore';
import {
  joinTeam as joinTeamImpl,
  leaveTeam as leaveTeamImpl,
  type JoinTeamData,
  type JoinTeamResult,
  type LeaveTeamResult,
} from './team/teamMembership';
import {
  getTeamProgress as getTeamProgressImpl,
  type TeamProgressResult,
} from './team/teamProgress';

// Re-export types for public API
export type { CreateTeamData, JoinTeamData };

/**
 * Service for managing team operations
 * 
 * This class is a thin aggregator that delegates to focused modules
 * while maintaining the same public API for backward compatibility.
 */
export class TeamService {
  private repository: ITeamRepository;
  private getDb: () => Firestore;

  /**
   * Create a new TeamService
   * @param repository - Optional repository implementation (defaults to Firestore)
   */
  constructor(repository?: ITeamRepository) {
    this.getDb = createLazyFirestore();
    // Use provided repository or create default Firestore implementation
    this.repository = repository || new FirestoreTeamRepository(this.getDb());
  }

  /**
   * For backward compatibility - direct database access
   * @deprecated Use repository methods instead
   */
  private get db(): Firestore {
    return this.getDb();
  }

  /**
   * Creates a new team with proper transaction safety
   * 
   * Delegates to teamCore module
   * 
   * @param userId - ID of the user creating the team
   * @param data - Team creation data (password, maximumMembers)
   * @returns Object with team ID and password
   */
  async createTeam(userId: string, data: CreateTeamData): Promise<CreateTeamResult> {
    return createTeamImpl(this.repository, userId, data);
  }

  /**
   * Join an existing team
   * 
   * Delegates to teamMembership module
   * 
   * @param userId - ID of the user joining
   * @param data - Join data (team ID and password)
   * @returns Object indicating success
   */
  async joinTeam(userId: string, data: JoinTeamData): Promise<JoinTeamResult> {
    return joinTeamImpl(this.repository, userId, data);
  }

  /**
   * Leave current team
   * 
   * Delegates to teamMembership module
   * 
   * @param userId - ID of the user leaving
   * @returns Object indicating success
   */
  async leaveTeam(userId: string): Promise<LeaveTeamResult> {
    return leaveTeamImpl(this.repository, userId);
  }

  /**
   * Get team progress for all members
   * 
   * Delegates to teamProgress module
   * 
   * @param userId - ID of the user requesting progress
   * @param gameMode - Game mode to fetch progress for (pvp/pve)
   * @returns Object with progress data and metadata
   */
  async getTeamProgress(userId: string, gameMode: string = 'pvp'): Promise<TeamProgressResult> {
    return getTeamProgressImpl(this.repository, userId, gameMode);
  }
}
