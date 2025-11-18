import { STASH_STATION_ID } from '@/stores/progress';
import type { Task } from '@/types/models/tarkov';

/**
 * Utility functions for needed items processing
 */

export function matchesItemFilter(need: any, normalizedFilter: string) {
  if (!normalizedFilter) {
    return true;
  }
  const query = normalizedFilter;
  const candidates = [];
  if (need?.item) {
    if (need.item.shortName) candidates.push(String(need.item.shortName));
    if (need.item.name) candidates.push(String(need.item.name));
  }
  if (need?.markerItem) {
    if (need.markerItem.shortName) candidates.push(String(need.markerItem.shortName));
    if (need.markerItem.name) candidates.push(String(need.markerItem.name));
  }
  return candidates.some((value) => value.toLowerCase().includes(query));
}

export function createTaskMap(tasks: any[] | undefined) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return new Map();
  }
  const map = new Map();
  tasks.forEach((task) => {
    if (task?.id) {
      map.set(task.id, task);
    }
  });
  return map;
}

export function createTaskPrerequisiteCounts(taskMap: Map<string, Task>, tasksCompletions: any) {
  const counts = new Map();
  const completions = tasksCompletions || {};
  taskMap.forEach((task, taskId) => {
    const predecessors = Array.isArray(task?.predecessors) ? task.predecessors : [];
    let unfinished = 0;
    predecessors.forEach((predecessorId: string) => {
      if (completions?.[predecessorId]?.self === false) {
        unfinished += 1;
      }
    });
    counts.set(taskId, unfinished);
  });
  return counts;
}

export function createHideoutModuleMap(hideoutModules: any[] | undefined) {
  if (!Array.isArray(hideoutModules) || hideoutModules.length === 0) {
    return new Map();
  }
  const map = new Map();
  hideoutModules.forEach((module) => {
    if (module?.id) {
      map.set(module.id, module);
    }
  });
  return map;
}

export function createHideoutPrerequisiteCounts(
  hideoutModuleMap: Map<string, any>,
  moduleCompletions: any
) {
  const counts = new Map();
  const completions = moduleCompletions || {};
  hideoutModuleMap.forEach((module, moduleId) => {
    const predecessors = Array.isArray(module?.predecessors) ? module.predecessors : [];
    let unfinished = 0;
    predecessors.forEach((predecessorId: string) => {
      if (completions?.[predecessorId]?.self === false) {
        unfinished += 1;
      }
    });
    counts.set(moduleId, unfinished);
  });
  return counts;
}

export function shouldIncludeHideoutNeed(
  need: any,
  getHideoutLevelFor: (stationId: string, userId: string) => number | undefined,
  getModuleCompletionMap: (moduleId: string) => any
) {
  const moduleInstanceId = need?.hideoutModule?.id;
  const moduleStationId = need?.hideoutModule?.stationId;
  const moduleTargetLevel = need?.hideoutModule?.level;
  if (!moduleInstanceId || !moduleStationId || typeof moduleTargetLevel !== 'number') {
    return true;
  }
  if (moduleStationId === STASH_STATION_ID) {
    const currentEffectiveStashLevel = getHideoutLevelFor(STASH_STATION_ID, 'self');
    if (typeof currentEffectiveStashLevel === 'number') {
      return currentEffectiveStashLevel < moduleTargetLevel;
    }
    const moduleCompletion = getModuleCompletionMap(moduleInstanceId);
    return moduleCompletion?.self !== true;
  }
  const moduleCompletion = getModuleCompletionMap(moduleInstanceId);
  return moduleCompletion?.self !== true;
}
