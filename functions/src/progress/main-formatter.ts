import type { FormattedProgress, HideoutData, TaskData } from './constants.js';
import { formatObjective, initializeBaseProgress, processHideoutStations } from './formatting.js';
import { invalidateTasks } from './validation.js';
import { extractGameModeData } from './game-modes.js';

/**
 * Main progress formatting function that combines all modules
 */
export const formatProgress = (
  progressData: unknown,
  userId: string,
  hideoutData: HideoutData | null | undefined,
  taskData: TaskData | null | undefined,
  gameMode: string = 'pvp'
): FormattedProgress => {
  // Extract gamemode-specific data
  const gameModeData = extractGameModeData(progressData, gameMode);
  const baseProgress = initializeBaseProgress(gameModeData, userId, progressData);

  const progress: FormattedProgress = {
    ...baseProgress,
    tasksProgress: formatObjective(gameModeData?.taskCompletions, false, true),
    taskObjectivesProgress: formatObjective(gameModeData?.taskObjectives, true, true),
    hideoutModulesProgress: formatObjective(gameModeData?.hideoutModules),
    hideoutPartsProgress: formatObjective(gameModeData?.hideoutParts, true),
  };

  // --- Hideout Post-processing ---
  processHideoutStations(progress, hideoutData, progress.gameEdition, userId);

  // --- Task Post-processing ---
  invalidateTasks(progress, taskData, progress.pmcFaction, userId);

  return progress;
};

// Re-export invalidateTaskRecursive for backwards compatibility
export { invalidateTaskRecursive } from './validation.js';

// Re-export updateTaskState for backwards compatibility
export { updateTaskState } from './task-dependencies.js';
