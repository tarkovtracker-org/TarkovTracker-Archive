/**
 * Team membership operations: joining and leaving teams
 *
 * This module handles:
 * - Users joining existing teams
 * - Users leaving teams
 * - Owner disbanding teams
 * - Membership validation
 */

import { logger } from '../../logger.js';
import { errors } from '../../middleware/errorHandler.js';
import type { ITeamRepository } from '../../repositories/ITeamRepository.js';

export interface JoinTeamData {
  id: string;
  password: string;
}

export interface JoinTeamResult {
  joined: boolean;
}

export interface LeaveTeamResult {
  left: boolean;
}

/**
 * Join an existing team
 *
 * Validates:
 * - User is not already in a team
 * - Team exists
 * - Password is correct
 * - Team is not full
 *
 * Atomically:
 * - Adds user to team members
 * - Updates user's system document
 *
 * @param repository - Team repository for data access
 * @param userId - ID of the user joining
 * @param data - Join data (team ID and password)
 * @returns Object indicating success
 */
export async function joinTeam(
  repository: ITeamRepository,
  userId: string,
  data: JoinTeamData
): Promise<JoinTeamResult> {
  if (!data.id || !data.password) {
    throw errors.badRequest('Team ID and password are required');
  }

  try {
    await repository.runTransaction(async (tx) => {
      // Get user's system document
      const systemData = await tx.getSystemDoc(userId);

      // Check if user is already in a team
      if (systemData?.team) {
        throw errors.conflict('User is already in a team');
      }

      // Get team document
      const teamData = await tx.getTeamDoc(data.id);
      if (!teamData) {
        throw errors.notFound('Team does not exist');
      }

      // Validate password
      if (teamData.password !== data.password) {
        throw errors.unauthorized('Incorrect team password');
      }

      // Check if team is full
      const currentMembers = teamData.members?.length ?? 0;
      if (currentMembers >= (teamData.maximumMembers ?? 10)) {
        throw errors.forbidden('Team is full');
      }

      // Add user to team
      tx.updateTeamDoc(data.id, {
        members: repository.arrayUnion(userId),
      });

      // Update user's system document
      tx.setSystemDoc(userId, { team: data.id });
    });

    logger.log('User joined team successfully', {
      user: userId,
      team: data.id,
    });

    return { joined: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      throw error;
    }
    logger.error('Error joining team:', {
      error: error instanceof Error ? error.message : String(error),
      user: userId,
      team: data.id,
    });
    throw errors.internal('Failed to join team');
  }
}

/**
 * Leave current team
 *
 * Behavior depends on user role:
 * - Regular member: Removed from team, team continues
 * - Owner: Team is disbanded, all members removed
 *
 * Atomically:
 * - Updates/deletes team document
 * - Updates all affected users' system documents
 * - Sets lastLeftTeam timestamp (for cooldown)
 *
 * @param repository - Team repository for data access
 * @param userId - ID of the user leaving
 * @returns Object indicating success
 */
export async function leaveTeam(
  repository: ITeamRepository,
  userId: string
): Promise<LeaveTeamResult> {
  try {
    let originalTeamId: string | null = null;

    await repository.runTransaction(async (tx) => {
      // Get user's system document
      const systemData = await tx.getSystemDoc(userId);
      originalTeamId = systemData?.team ?? null;

      if (!originalTeamId) {
        throw errors.badRequest('User is not in a team');
      }

      // Get team document
      const teamData = await tx.getTeamDoc(originalTeamId);

      if (teamData?.owner === userId) {
        // If user is owner, disband team and remove all members
        if (teamData.members && teamData.members.length > 0) {
          teamData.members.forEach((memberId: string) => {
            tx.setSystemDoc(memberId, {
              team: null,
              lastLeftTeam: repository.serverTimestamp(),
            });
          });
        }
        tx.deleteTeamDoc(originalTeamId);
      } else {
        // Remove user from team members
        tx.updateTeamDoc(originalTeamId, {
          members: repository.arrayRemove(userId),
        });

        // Delete user's system document when leaving team
        tx.deleteSystemDoc(userId);
      }
    });

    logger.log('User left team successfully', {
      user: userId,
      team: originalTeamId,
    });

    return { left: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      throw error;
    }
    logger.error('Error leaving team:', {
      error: error instanceof Error ? error.message : String(error),
      user: userId,
    });
    throw errors.internal('Failed to leave team');
  }
}
