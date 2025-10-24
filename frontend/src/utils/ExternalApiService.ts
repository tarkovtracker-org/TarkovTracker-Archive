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

const buildTaskCompletions = (
  tasks?: OldTaskProgress[]
): ProgressData['taskCompletions'] => {
  if (!Array.isArray(tasks)) {
    return {};
  }

  const timestamp = Date.now();

  return tasks.reduce<ProgressData['taskCompletions']>((acc, task) => {
    if (!task?.id || (!task.complete && !task.failed)) {
      return acc;
    }

    acc[task.id] = {
      complete: Boolean(task.complete),
      timestamp,
      failed: Boolean(task.failed),
    };

    return acc;
  }, {});
};

const buildHideoutModules = (
  modules?: OldHideoutModuleProgress[]
): ProgressData['hideoutModules'] => {
  if (!Array.isArray(modules)) {
    return {};
  }

  const timestamp = Date.now();

  return modules.reduce<ProgressData['hideoutModules']>((acc, module) => {
    if (!module?.id || module.complete !== true) {
      return acc;
    }

    acc[module.id] = {
      complete: true,
      timestamp,
    };

    return acc;
  }, {});
};

const buildHideoutParts = (
  parts?: OldHideoutPartProgress[]
): ProgressData['hideoutParts'] => {
  if (!Array.isArray(parts)) {
    return {};
  }

  return parts.reduce<ProgressData['hideoutParts']>((acc, part) => {
    if (!part?.id) {
      return acc;
    }

    acc[part.id] = {
      complete: Boolean(part.complete),
      count: part.count ?? 0,
      timestamp: part.complete ? Date.now() : null,
    };

    return acc;
  }, {});
};

const buildTaskObjectives = (
  objectives?: OldTaskObjectiveProgress[]
): ProgressData['taskObjectives'] => {
  if (!Array.isArray(objectives)) {
    return {};
  }

  return objectives.reduce<ProgressData['taskObjectives']>((acc, objective) => {
    if (!objective?.id) {
      return acc;
    }

    acc[objective.id] = {
      complete: Boolean(objective.complete),
      count: objective.count ?? 0,
      timestamp: objective.complete ? Date.now() : null,
    };

    return acc;
  }, {});
};

const createMigrationData = (
  dataFromApi: OldApiRawData,
  oldDomain: string
): ProgressData => ({
  level: dataFromApi.playerLevel || dataFromApi.level || 1,
  gameEdition: dataFromApi.gameEdition || 'standard',
  pmcFaction: dataFromApi.pmcFaction || 'usec',
  displayName: dataFromApi.displayName || '',
  taskCompletions: buildTaskCompletions(dataFromApi.tasksProgress),
  taskObjectives: buildTaskObjectives(dataFromApi.taskObjectivesProgress),
  hideoutModules: buildHideoutModules(dataFromApi.hideoutModulesProgress),
  hideoutParts: buildHideoutParts(dataFromApi.hideoutPartsProgress),
  importedFromApi: true,
  importDate: new Date().toISOString(),
  sourceUserId: dataFromApi.userId,
  sourceDomain: oldDomain,
});

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
      logger.error(`[ExternalApiService] API token fetch failed: ${response.status}`);
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
    logger.error('[ExternalApiService] Error fetching data with API token:', error);
    return null;
  }
};
