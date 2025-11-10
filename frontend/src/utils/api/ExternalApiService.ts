import { logger } from '@/utils/logger';
import type { ProgressData } from '@/utils/migration/DataMigrationTypes';
import type {
  OldApiRawData,
  OldHideoutModuleProgress,
  OldHideoutPartProgress,
  OldTaskObjectiveProgress,
  OldTaskProgress,
} from '@/utils/api/ExternalApiServiceTypes';
const DEFAULT_PROGRESS_ENDPOINT =
  import.meta.env.VITE_PROGRESS_ENDPOINT || 'https://tarkovtracker.io/api/v2/progress';
/**
 * Helper function to get timestamp with fallback to current time
 */
export const getTimestamp = (timestamp?: number): number => {
  return timestamp ?? Date.now();
};
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
      timestamp: getTimestamp(timestamp),
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
  const initialAcc: NonNullable<ProgressData['hideoutModules']> = {};
  return modules.reduce<NonNullable<ProgressData['hideoutModules']>>((acc, module) => {
    if (!module?.id || module.complete !== true) {
      return acc;
    }
    acc[module.id] = {
      complete: true,
      timestamp: getTimestamp(timestamp),
    };
    return acc;
  }, initialAcc);
};
const buildHideoutParts = (
  parts?: OldHideoutPartProgress[],
  timestamp?: number
): ProgressData['hideoutParts'] => {
  if (!Array.isArray(parts)) {
    return {};
  }
  const initialAcc: NonNullable<ProgressData['hideoutParts']> = {};
  return parts.reduce<NonNullable<ProgressData['hideoutParts']>>((acc, part) => {
    if (!part?.id) {
      return acc;
    }
    acc[part.id] = {
      complete: Boolean(part.complete),
      count: part.count ?? 0,
      ...(part.complete ? { timestamp: getTimestamp(timestamp) } : {}),
    };
    return acc;
  }, initialAcc);
};
const buildTaskObjectives = (
  objectives?: OldTaskObjectiveProgress[],
  timestamp?: number
): ProgressData['taskObjectives'] => {
  if (!Array.isArray(objectives)) {
    return {};
  }
  const initialAcc: NonNullable<ProgressData['taskObjectives']> = {};
  return objectives.reduce<NonNullable<ProgressData['taskObjectives']>>((acc, objective) => {
    if (!objective?.id) {
      return acc;
    }
    acc[objective.id] = {
      complete: Boolean(objective.complete),
      count: objective.count ?? 0,
      ...(objective.complete ? { timestamp: getTimestamp(timestamp) } : {}),
    };
    return acc;
  }, initialAcc);
};
const createMigrationData = (dataFromApi: OldApiRawData, endpointUrl: string): ProgressData => {
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
    sourceDomain: endpointUrl,
  };
};
// Fetches and transforms legacy API data format
export const fetchDataWithApiToken = async (
  apiToken: string,
  endpointUrl: string = DEFAULT_PROGRESS_ENDPOINT
): Promise<ProgressData | null> => {
  if (!apiToken) {
    return null;
  }
  try {
    const headers = {
      Authorization: `Bearer ${apiToken}`,
      Accept: 'application/json',
    };
    const response = await fetch(endpointUrl, {
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
    return createMigrationData(dataFromApi, endpointUrl);
  } catch (error) {
    logger.error(
      `[ExternalApiService] Error fetching data with API token: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
    return null;
  }
};
