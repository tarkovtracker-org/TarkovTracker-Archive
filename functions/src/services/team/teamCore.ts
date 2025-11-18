/**
 * Core team operations: creation and fundamental team management
 *
 * This module handles:
 * - Team creation with validation
 * - Password generation
 * - Core team lifecycle operations
 */

import { logger } from '../../logger.js';
import { Timestamp } from 'firebase-admin/firestore';
import UIDGenerator from '../../token/UIDGenerator.js';
import { errors } from '../../middleware/errorHandler.js';
import type { ITeamRepository } from '../../repositories/ITeamRepository.js';

export interface CreateTeamData {
  password?: string;
  maximumMembers?: number;
}

export interface CreateTeamResult {
  team: string;
  password: string;
}

/**
 * Creates a new team with proper transaction safety
 *
 * Validates:
 * - User is not already in a team
 * - Cooldown period after leaving team (5 minutes)
 *
 * Atomically:
 * - Creates team document
 * - Updates user's system document
 *
 * @param repository - Team repository for data access
 * @param userId - ID of the user creating the team
 * @param data - Team creation data (password, maximumMembers)
 * @returns Object with team ID and password
 */
export async function createTeam(
  repository: ITeamRepository,
  userId: string,
  data: CreateTeamData
): Promise<CreateTeamResult> {
  try {
    let createdTeamId = '';
    let finalPassword = '';

    await repository.runTransaction(async (tx) => {
      // Get user's system document
      const systemData = await tx.getSystemDoc(userId);

      // Check if user is already in a team
      if (systemData?.team) {
        throw errors.conflict('User is already in a team');
      }

      // Check cooldown period
      if (systemData?.lastLeftTeam) {
        const now = Timestamp.now();
        const fiveMinutesAgo = Timestamp.fromMillis(now.toMillis() - 5 * 60 * 1000);
        if (systemData.lastLeftTeam > fiveMinutesAgo) {
          throw errors.forbidden(
            'You must wait 5 minutes after leaving a team to create a new one'
          );
        }
      }

      // Generate team ID and password
      const uidgen = new UIDGenerator(32);
      createdTeamId = uidgen.generate();
      finalPassword = data.password ?? generateSecurePassword();

      // Create team document
      tx.setTeamDoc(createdTeamId, {
        owner: userId,
        password: finalPassword,
        maximumMembers: data.maximumMembers ?? 10,
        members: [userId],
        createdAt: repository.serverTimestamp(),
      });

      // Update user's system document
      tx.setSystemDoc(userId, { team: createdTeamId });
    });

    logger.log('Team created successfully', {
      owner: userId,
      team: createdTeamId,
      maximumMembers: data.maximumMembers ?? 10,
    });

    return { team: createdTeamId, password: finalPassword };
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      throw error;
    }
    logger.error('Error creating team:', {
      error: error instanceof Error ? error.message : String(error),
      owner: userId,
    });
    throw errors.internal('Failed to create team');
  }
}

/**
 * Generates a secure password for team creation
 *
 * Uses UIDGenerator with BASE62 encoding to create
 * a cryptographically random 48-character password.
 *
 * Falls back to debug passwords on error (should not happen in production)
 *
 * @returns Secure random password string
 */
export function generateSecurePassword(): string {
  try {
    const passGen = new UIDGenerator(48, UIDGenerator.BASE62);
    const generated = passGen.generate();
    if (generated && generated.length >= 4) {
      return generated;
    }
    logger.warn('Generated password was invalid, using fallback');
    return 'DEBUG_PASS_123';
  } catch (error) {
    logger.error('Error during password generation:', error);
    return 'ERROR_PASS_456';
  }
}
