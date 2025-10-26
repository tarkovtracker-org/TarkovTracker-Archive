import { logger } from '@/utils/logger';
import type { ProgressData } from './DataMigrationTypes';

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

/* eslint-disable complexity */
// Complex function that transforms legacy API response format - complexity is necessary for data transformation
export const fetchDataWithApiToken = async (
  apiToken: string,
  oldDomain: string = 'https://tarkovtracker.io/api/v2/progress'
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

    const apiJsonResponse = (await response.json()) as unknown;
    let dataFromApi: OldApiRawData;
    if (typeof apiJsonResponse === 'object' && apiJsonResponse !== null) {
      if (
        'data' in apiJsonResponse &&
        typeof (apiJsonResponse as { data: unknown }).data === 'object' &&
        (apiJsonResponse as { data: unknown }).data !== null
      ) {
        dataFromApi = (apiJsonResponse as { data: OldApiRawData }).data;
      } else {
        dataFromApi = apiJsonResponse as OldApiRawData;
      }
    } else {
      logger.error('[ExternalApiService] API response is not a valid object.');
      return null;
    }

    const taskCompletions: ProgressData['taskCompletions'] = {};
    if (Array.isArray(dataFromApi.tasksProgress)) {
      dataFromApi.tasksProgress.forEach((task: OldTaskProgress) => {
        if (task.complete === true || task.failed === true) {
          taskCompletions![task.id] = {
            complete: task.complete || false,
            timestamp: Date.now(),
            failed: task.failed || false,
          };
        }
      });
    }

    const hideoutModules: ProgressData['hideoutModules'] = {};
    if (Array.isArray(dataFromApi.hideoutModulesProgress)) {
      dataFromApi.hideoutModulesProgress.forEach((module: OldHideoutModuleProgress) => {
        if (module.complete === true) {
          hideoutModules![module.id] = {
            complete: true,
            timestamp: Date.now(),
          };
        }
      });
    }

    const hideoutParts: ProgressData['hideoutParts'] = {};
    if (Array.isArray(dataFromApi.hideoutPartsProgress)) {
      dataFromApi.hideoutPartsProgress.forEach((part: OldHideoutPartProgress) => {
        hideoutParts![part.id] = {
          complete: part.complete || false,
          count: part.count || 0,
          timestamp: part.complete ? Date.now() : null,
        };
      });
    }

    const taskObjectives: ProgressData['taskObjectives'] = {};
    if (Array.isArray(dataFromApi.taskObjectivesProgress)) {
      dataFromApi.taskObjectivesProgress.forEach((objective: OldTaskObjectiveProgress) => {
        taskObjectives![objective.id] = {
          complete: objective.complete || false,
          count: objective.count || 0,
          timestamp: objective.complete ? Date.now() : null,
        };
      });
    }

    const migrationData: ProgressData = {
      level: dataFromApi.playerLevel || dataFromApi.level || 1,
      gameEdition: dataFromApi.gameEdition || 'standard',
      pmcFaction: dataFromApi.pmcFaction || 'usec',
      displayName: dataFromApi.displayName || '',
      taskCompletions,
      taskObjectives,
      hideoutModules,
      hideoutParts,
      importedFromApi: true,
      importDate: new Date().toISOString(),
      sourceUserId: dataFromApi.userId,
      sourceDomain: oldDomain,
    };
    return migrationData;
  } catch (error) {
    logger.error('[ExternalApiService] Error fetching data with API token:', error);
    return null;
  }
};
/* eslint-enable complexity */
