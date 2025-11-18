import { logger } from '../logger.js';
import type { HideoutData, FormattedProgress, UserProgressData } from './constants.js';
import type { ObjectiveItem, RawObjectiveData } from './constants.js';
import { STASH_STATION_ID, CULTIST_CIRCLE_STATION_ID } from './constants.js';

/**
 * Formats objective data into a standardized structure
 */
export const formatObjective = (
  objectiveData: RawObjectiveData | undefined | null,
  showCount: boolean = false,
  showInvalid: boolean = false
): ObjectiveItem[] => {
  const processedObjectives: ObjectiveItem[] = [];
  if (!objectiveData) return processedObjectives;

  for (const [objectiveKey, objectiveValue] of Object.entries(objectiveData)) {
    let isComplete = false;
    const isFailed = objectiveValue.failed ?? false; // Default based on an explicit 'failed' field

    // Use the 'complete' boolean field (legacy format)
    if (typeof objectiveValue.complete === 'boolean') {
      isComplete = objectiveValue.complete;
    }

    const newObjective: ObjectiveItem = {
      id: objectiveKey,
      complete: isComplete,
    };

    if (showCount && typeof objectiveValue.count === 'number') {
      newObjective.count = objectiveValue.count;
    }

    // Apply invalid status if requested and present
    if (showInvalid && typeof objectiveValue.invalid === 'boolean') {
      newObjective.invalid = objectiveValue.invalid;
    }

    // Set the failed status
    if (isFailed) {
      newObjective.failed = true;
    }

    // Ensure 'invalid' items are not marked 'complete'
    if (newObjective.invalid) {
      newObjective.complete = false;
    }

    processedObjectives.push(newObjective);
  }

  return processedObjectives;
};

/**
 * Extracts game edition from raw progress data
 */
export const getGameEditionFromData = (rawProgressData: unknown): number | undefined => {
  if (!rawProgressData || typeof rawProgressData !== 'object') {
    return undefined;
  }

  const candidate = (rawProgressData as { gameEdition?: unknown }).gameEdition;
  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return candidate;
  }

  if (typeof candidate === 'string') {
    const parsed = Number(candidate);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

/**
 * Initializes base progress properties
 */
export const initializeBaseProgress = (
  progressData: UserProgressData | undefined | null,
  userId: string,
  fullProgressData?: unknown
): Omit<
  FormattedProgress,
  'tasksProgress' | 'taskObjectivesProgress' | 'hideoutModulesProgress' | 'hideoutPartsProgress'
> => {
  const rootGameEdition = getGameEditionFromData(fullProgressData);
  const normalizedGameEdition =
    typeof progressData?.gameEdition === 'number' && Number.isFinite(progressData.gameEdition)
      ? progressData.gameEdition
      : (rootGameEdition ?? 1);

  return {
    displayName: progressData?.displayName ?? userId.substring(0, 6),
    userId,
    playerLevel: progressData?.level ?? 1,
    gameEdition: normalizedGameEdition,
    pmcFaction: progressData?.pmcFaction ?? 'USEC',
  };
};

/**
 * Processes hideout station completions based on game edition
 */
export const processHideoutStations = (
  currentProgress: FormattedProgress,
  hideoutData: HideoutData | null | undefined,
  gameEdition: number,
  userId: string // Added for logging context
): void => {
  if (!hideoutData?.hideoutStations) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateStationLevelForProgress = (level: any, progress: FormattedProgress) => {
    // Mark module complete
    const moduleIndex = progress.hideoutModulesProgress.findIndex(
      (mLevel) => mLevel.id === level.id
    );
    if (moduleIndex === -1) {
      progress.hideoutModulesProgress.push({
        id: level.id,
        complete: true,
      });
    } else {
      progress.hideoutModulesProgress[moduleIndex].complete = true;
    }

    // Mark parts complete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    level.itemRequirements?.forEach((item: any) => {
      const partIndex = progress.hideoutPartsProgress.findIndex((part) => part.id === item.id);
      if (partIndex === -1) {
        progress.hideoutPartsProgress.push({
          id: item.id,
          complete: true,
          count: item.count,
        });
      } else {
        progress.hideoutPartsProgress[partIndex].complete = true;
        // Note: Should we update count here too if it differs?
      }
    });
  };

  try {
    const stashStation = hideoutData.hideoutStations.find(
      (station) => station.id === STASH_STATION_ID
    );
    stashStation?.levels?.forEach((level) => {
      if (level.level <= gameEdition) {
        updateStationLevelForProgress(level, currentProgress);
      }
    });

    // Special case: If Unheard Edition (5) or Unheard+EOD Edition (6), mark Cultist Circle as maxed
    if (gameEdition === 5 || gameEdition === 6) {
      const cultistCircleStation = hideoutData.hideoutStations.find(
        (station) => station.id === CULTIST_CIRCLE_STATION_ID
      );
      cultistCircleStation?.levels?.forEach((level) => {
        // Mark all levels of cultist circle as complete
        updateStationLevelForProgress(level, currentProgress);
      });
    }
  } catch (error: unknown) {
    logger.error('Error processing hideout station data within helper', {
      error: error instanceof Error ? error.message : String(error),
      userId, // Pass userId for better logging
    });
  }
};
