/**
 * Team progress operations: retrieving and formatting team member progress
 *
 * This module handles:
 * - Fetching progress for all team members
 * - Formatting progress data
 * - Handling visibility settings (hidden teammates)
 */

import { logger } from 'firebase-functions/v2';
import { errors } from '../../middleware/errorHandler';
import { formatProgress } from '../../progress/progressUtils';
import { getTaskData, getHideoutData } from '../../utils/dataLoaders';
import type { ITeamRepository } from '../../repositories/ITeamRepository';
import type { FormattedProgress } from '../../types/api';

export interface TeamProgressResult {
  data: FormattedProgress[];
  meta: {
    self: string;
    hiddenTeammates: string[];
  };
}

/**
 * Get team progress for all members
 *
 * Fetches and formats progress data for:
 * - All team members (if user is in a team)
 * - Just the requesting user (if not in a team)
 *
 * Respects visibility settings:
 * - Hidden teammates are listed in meta but their progress is still included
 * - Frontend uses this to filter display
 *
 * @param repository - Team repository for data access
 * @param userId - ID of the user requesting progress
 * @param gameMode - Game mode to fetch progress for (pvp/pve)
 * @returns Object with progress data and metadata
 */
export async function getTeamProgress(
  repository: ITeamRepository,
  userId: string,
  gameMode: string = 'pvp'
): Promise<TeamProgressResult> {
  try {
    // Load game data and user documents
    const [systemData, userData, hideoutData, taskData] = await Promise.all([
      repository.getSystemDocument(userId),
      repository.getUserDocument(userId),
      getHideoutData(),
      getTaskData(),
    ]);

    if (!hideoutData || !taskData) {
      throw errors.internal('Failed to load essential game data');
    }

    const teamId = systemData?.team;
    const hiddenTeammatesMap = userData?.teamHide || {};
    let memberIds = [userId]; // Start with self

    // Get team members if in a team
    if (teamId) {
      const teamData = await repository.getTeamDocument(teamId);
      if (teamData) {
        memberIds = [...new Set([...(teamData.members || []), userId])];
      }
    }

    // Fetch progress for all members
    const progressMap = await repository.getProgressDocuments(memberIds);

    // Format progress for each member
    const teamProgress = memberIds
      .map((memberId) => {
        const progressData = progressMap.get(memberId);
        if (!progressData) {
          logger.warn(`Progress document not found for member ${memberId}`);
          return null;
        }
        return formatProgress(progressData, memberId, hideoutData, taskData, gameMode);
      })
      .filter((progress): progress is FormattedProgress => progress !== null);

    // Determine hidden teammates
    const hiddenTeammates = memberIds.filter((id) => id !== userId && hiddenTeammatesMap[id]);

    return {
      data: teamProgress,
      meta: {
        self: userId,
        hiddenTeammates,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      throw error;
    }
    logger.error('Error fetching team progress:', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw errors.internal('Failed to retrieve team progress');
  }
}
