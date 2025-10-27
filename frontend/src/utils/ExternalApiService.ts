import { logger } from '@/utils/logger';
import type { ProgressData } from './DataMigrationTypes';

const DEFAULT_PROGRESS_ENDPOINT = 'https://tarkovtracker.io/api/v2/progress';

interface OldTaskProgress {
  id: string;
  complete?: boolean;
  failed?: boolean;
}

interface OldHideoutModuleProgress {
  id: string;
  complete?: boolean;
}

interface OldHideoutPartProgress {
  id: string;
  complete?: boolean;
  count?: number;
}

interface OldTaskObjectiveProgress {
  id: string;
  complete?: boolean;
  count?: number;
}

interface OldApiRawData {
  playerLevel?: number;
  level?: number;
  gameEdition?: string;
  pmcFaction?: string;
  displayName?: string;
  tasksProgress?: OldTaskProgress[];
  hideoutModulesProgress?: OldHideoutModuleProgress[];
  hideoutPartsProgress?: OldHideoutPartProgress[];
  taskObjectivesProgress?: OldTaskObjectiveProgress[];
  userId?: string;
  [key: string]: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const extractApiData = (apiJsonResponse: unknown): OldApiRawData | null => {
  if (!isRecord(apiJsonResponse)) {
    return null;
  }

  if ('data' in apiJsonResponse) {
    const nestedData = (apiJsonResponse as { data: unknown }).data;
    if (isRecord(nestedData)) {
      return nestedData as OldApiRawData;
    }
  }

  return apiJsonResponse as OldApiRawData;
};

type TaskCompletions = NonNullable<ProgressData['taskCompletions']>;

const buildTaskCompletions = (
  tasks?: OldTaskProgress[],
  timestamp?: number
): ProgressData['taskCompletions'] => {
  if (!Array.isArray(tasks)) {
    return {};
  }

  const initialAcc: TaskCompletions = {};

  return tasks.reduce<TaskCompletions>((acc, task) => {
    if (!task?.id || (!task.complete && !task.failed)) {
      return acc;
    }

    acc[task.id] = {
      complete: Boolean(task.complete),
      timestamp: timestamp ?? Date.now(),
      failed: Boolean(task.failed),
    };

    return acc;
  }, initialAcc);
};

const buildHideoutModules = (
  modules?: OldHideoutModuleProgress[],
  timestamp?: number
): ProgressData['hideoutModules'] => {
  if (!Array.isArray(modules)) {
    return {};
  }

  const result: ProgressData['hideoutModules'] = {};

  modules.forEach((module) => {
    if (!module?.id || module.complete !== true) {
      return;
    }

    result[module.id] = {
      complete: true,
      timestamp: timestamp ?? Date.now(),
    };
  });

  return result;
};

const buildHideoutParts = (
  parts?: OldHideoutPartProgress[],
  timestamp?: number
): ProgressData['hideoutParts'] => {
  if (!Array.isArray(parts)) {
    return {};
  }

  const result: ProgressData['hideoutParts'] = {};

  parts.forEach((part) => {
    if (!part?.id) {
      return;
    }

    result[part.id] = {
      complete: Boolean(part.complete),
      count: part.count ?? 0,
      ...(part.complete ? { timestamp: timestamp ?? Date.now() } : {}),
    };
  });

  return result;
};

const buildTaskObjectives = (
  objectives?: OldTaskObjectiveProgress[],
  timestamp?: number
): ProgressData['taskObjectives'] => {
  if (!Array.isArray(objectives)) {
    return {};
  }

  const result: ProgressData['taskObjectives'] = {};

  objectives.forEach((objective) => {
    if (!objective?.id) {
      return;
    }

    result[objective.id] = {
      complete: Boolean(objective.complete),
      count: objective.count ?? 0,
      ...(objective.complete ? { timestamp: timestamp ?? Date.now() } : {}),
    };
  });

  return result;
};

const createMigrationData = (dataFromApi: OldApiRawData, oldDomain: string): ProgressData => {
  const importTimestamp = Date.now();

  return {
    level: dataFromApi.playerLevel || dataFromApi.level || 1,
    gameEdition: dataFromApi.gameEdition || 'standard',
    pmcFaction: dataFromApi.pmcFaction || 'usec',
    displayName: dataFromApi.displayName || '',
    taskCompletions: buildTaskCompletions(dataFromApi.tasksProgress, importTimestamp),
    taskObjectives: buildTaskObjectives(dataFromApi.taskObjectivesProgress, importTimestamp),
    hideoutModules: buildHideoutModules(dataFromApi.hideoutModulesProgress, importTimestamp),
    hideoutParts: buildHideoutParts(dataFromApi.hideoutPartsProgress, importTimestamp),
    importedFromApi: true,
    importDate: new Date(importTimestamp).toISOString(),
    sourceUserId: dataFromApi.userId,
    sourceDomain: oldDomain,
  };
};

// Fetches and transforms legacy API data format
export const fetchDataWithApiToken = async (
  apiToken: string,
  oldDomain: string = DEFAULT_PROGRESS_ENDPOINT
): Promise<ProgressData | null> => {
  if (!apiToken) {
    return null;
  }

  try {
    const headers = {
      Authorization: `Bearer ${apiToken}`,
      Accept: 'application/json',
    };

    const response = await fetch(oldDomain, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error(
        `[ExternalApiService] Fetch failed ${response.status} ${response.statusText}. Body: ${body.slice(0, 200)}`
      );
      return null;
    }

    const apiJsonResponse = await response.json();
    const dataFromApi = extractApiData(apiJsonResponse);

    if (!dataFromApi) {
      logger.error('[ExternalApiService] API response is not a valid object.');
      return null;
    }

    return createMigrationData(dataFromApi, oldDomain);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[ExternalApiService] Error fetching data with API token: ${errorMessage}`, error);
    return null;
  }
};
