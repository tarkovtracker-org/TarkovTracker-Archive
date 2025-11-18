import type { ProgressDataStructure, UserProgressData } from './constants.js';

/**
 * Helper function to extract gamemode-specific data
 */
export const extractGameModeData = (
  progressData: unknown,
  gameMode?: string
): UserProgressData | null => {
  if (!progressData) return null;

  // Type guard for gamemode-specific data structure
  const data = progressData as ProgressDataStructure;

  // If specific mode is requested but data is missing (check first)
  if (gameMode && data.currentGameMode && !data[gameMode]) {
    return null;
  }

  // Modern format with mode data
  if (data.currentGameMode && (data.pvp || data.pve)) {
    const currentMode = gameMode ?? data.currentGameMode;
    return (data[currentMode] as UserProgressData) ?? null;
  }

  // Partial migration case (has currentGameMode but no pvp/pve structure)
  if (data.currentGameMode && !data.pvp && !data.pve) {
    // This is partially migrated - return the legacy data (minus currentGameMode)
    const legacyData = { ...data };
    delete legacyData.currentGameMode;
    return legacyData as UserProgressData;
  }

  // Legacy format - return the data as-is (this handles imported data that hasn't been migrated yet)
  return progressData as UserProgressData;
};
