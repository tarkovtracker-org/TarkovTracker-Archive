import { getMapIdGroup } from '@/utils/mapNormalization';

import type { Task, TaskObjective } from '@/types/tarkov';

export const taskUnlockedForCurrentView = (
  taskId: string,
  activeUserView: string,
  isTaskUnlockedByAny: (taskId: string) => boolean,
  isTaskUnlockedFor: (taskId: string, userId: string) => boolean
) => {
  return activeUserView === 'all'
    ? isTaskUnlockedByAny(taskId)
    : isTaskUnlockedFor(taskId, activeUserView);
};

export const taskHasIncompleteObjectiveOnMap = (
  task: Task,
  mapIdGroup: string[],
  activeUserView: string,
  resolveObjectiveMapIds: (objective: TaskObjective) => string[],
  getObjectiveCompletionMap: (objectiveId: string) => Record<string, boolean> | undefined
) => {
  const objectives = task.objectives;
  
  // Explicit guard for null/undefined objectives
  if (!objectives || objectives.length === 0) {
    return false;
  }
  
  for (const objective of objectives) {
    const objectiveMapIds = resolveObjectiveMapIds(objective);
    if (!objectiveMapIds.some((id: string) => mapIdGroup.includes(id))) continue;
    const completions = getObjectiveCompletionMap(objective.id) || {};
    const isComplete =
      activeUserView === 'all'
        ? Object.values(completions).every(Boolean)
        : completions[activeUserView] === true;
    if (!isComplete) {
      return true;
    }
  }
  return false;
};

export const filterTasksByPrimaryView = (
  taskList: Task[],
  activePrimaryView: string,
  activeMapView: string,
  maps: { id: string; name: string }[],
  collectTaskLocationIds: (task: Task) => Set<string>,
  activeTraderView: string
) => {
  let filteredTasks = Array.isArray(taskList) ? [...taskList] : [];
  if (activePrimaryView === 'maps' && activeMapView !== 'all') {
    const mapIdGroup = getMapIdGroup(activeMapView, maps);
    filteredTasks = filteredTasks.filter((task) => {
      const taskLocations = collectTaskLocationIds(task);
      return mapIdGroup.some((id: string) => taskLocations.has(id));
    });
  }
  if (activeTraderView && activeTraderView !== 'all') {
    filteredTasks = filteredTasks.filter(
      (task) => task.trader && task.trader.id === activeTraderView
    );
  }
  return filteredTasks;
};
