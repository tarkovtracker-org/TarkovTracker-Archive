import { getMapIdGroup } from '@/utils/mapNormalization';
import type { Task, TaskObjective } from '@/types/models/tarkov';
import { createLogger } from '@/utils/logger';

const logger = createLogger('TaskCore');

export const summarizeSecondaryTaskCounts = (entries: Record<string, Task[]>) => ({
  available: entries.available?.length || 0,
  locked: entries.locked?.length || 0,
  completed: entries.completed?.length || 0,
});

export const successorDepth = (task: Task, tasks: Task[]): number => {
  const tasksMap = tasks.reduce(
    (acc, t) => {
      acc[t.id] = t;
      return acc;
    },
    {} as Record<string, Task>
  );
  const depthMemo = new Map<string, number>();

  const calculateDepth = (taskId: string, recursionStack = new Set<string>()): number => {
    if (!tasksMap[taskId]) return 0;
    if (depthMemo.has(taskId)) return depthMemo.get(taskId)!;

    if (recursionStack.has(taskId)) {
      logger.warn(`Cycle detected in task dependencies for task: ${taskId}`);
      if (import.meta.env.DEV) {
        console.warn('[TaskCore] Task dependency cycle detected:', taskId, [...recursionStack]);
      }
      return 0;
    }

    recursionStack.add(taskId);
    try {
      const successors = tasksMap[taskId].successors || [];
      if (successors.length === 0) {
        depthMemo.set(taskId, 1);
        return 1;
      }

      const successorDepths = successors.map((sid) => calculateDepth(sid, recursionStack));
      const depth = 1 + Math.max(...successorDepths);
      depthMemo.set(taskId, depth);
      return depth;
    } finally {
      recursionStack.delete(taskId);
    }
  };

  return calculateDepth(task.id);
};

const checkParentChildRelation = (a: Task, b: Task): number => {
  if (a.parents?.includes(b.id)) return 1;
  if (b.parents?.includes(a.id)) return -1;
  return 0;
};

const compareBySuccessorDepth = (a: Task, b: Task, tasks: Task[]): number => {
  const aSuccessors = a.successors?.length || 0;
  const bSuccessors = b.successors?.length || 0;

  if (aSuccessors === 0 && bSuccessors > 0) return -1;
  if (aSuccessors > 0 && bSuccessors === 0) return 1;

  const aDepth = successorDepth(a, tasks);
  const bDepth = successorDepth(b, tasks);
  return aDepth - bDepth;
};

const compareBySuccessorCount = (a: Task, b: Task): number => {
  if (a.successors?.length !== b.successors?.length) {
    return (a.successors?.length || 0) - (b.successors?.length || 0);
  }
  return 0;
};

const compareForGroupedView = (a: Task, b: Task, tasks: Task[]): number => {
  const parentCheck = checkParentChildRelation(a, b);
  if (parentCheck !== 0) return parentCheck;

  const depthCheck = compareBySuccessorDepth(a, b, tasks);
  if (depthCheck !== 0) return depthCheck;

  const successorCheck = compareBySuccessorCount(a, b);
  if (successorCheck !== 0) return successorCheck;

  return 0;
};

export const sortVisibleTasks = (
  tasksToSort: Task[],
  activeUserView: string,
  tasks: Task[]
): Task[] => {
  const shouldGroupTasks = activeUserView === 'all';
  if (shouldGroupTasks) {
    const tasksArray = [...tasksToSort];
    tasksArray.sort((a, b) => compareForGroupedView(a, b, tasks));
    return tasksArray;
  }
  return tasksToSort;
};

export const taskUnlockedForCurrentView = (
  taskId: string,
  activeUserView: string,
  isTaskUnlockedByAny: (taskId: string) => boolean,
  isTaskUnlockedFor: (taskId: string, userId: string) => boolean
): boolean => {
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
): boolean => {
  for (const objective of task.objectives || []) {
    const objectiveMapIds = resolveObjectiveMapIds(objective);
    if (!objectiveMapIds.some((id: string) => mapIdGroup.includes(id))) continue;

    const completions = getObjectiveCompletionMap(objective.id);
    if (activeUserView === 'all') {
      if (!completions || Object.keys(completions).length === 0) return true;
      if (Object.values(completions).some((value) => value !== true)) return true;
    } else if (!completions || completions[activeUserView] !== true) {
      return true;
    }
  }
  return false;
};

export const addLocationId = (locationIds: Set<string>, id?: string | null): void => {
  if (id) locationIds.add(id);
};

export const collectObjectiveLocationIds = (
  objective: TaskObjective,
  locationIds: Set<string>
): void => {
  if (Array.isArray(objective.maps)) {
    objective.maps.forEach((objMap) => addLocationId(locationIds, objMap?.id));
  }
  addLocationId(locationIds, objective.location?.id);

  if (Array.isArray(objective.possibleLocations)) {
    objective.possibleLocations.forEach((loc) => addLocationId(locationIds, loc?.map?.id));
  }

  if (Array.isArray(objective.zones)) {
    objective.zones.forEach((zone) => addLocationId(locationIds, zone?.map?.id));
  }
};

export const resolveObjectiveMapIds = (objective: TaskObjective): string[] => {
  const ids = new Set<string>();
  collectObjectiveLocationIds(objective, ids);
  return [...ids];
};

export const collectTaskLocationIds = (task: Task): Set<string> => {
  const locationIds = new Set<string>();
  if (task.objectives) {
    task.objectives.forEach((objective) => {
      collectObjectiveLocationIds(objective, locationIds);
    });
  }
  return locationIds;
};

export const filterTasksByPrimaryView = (
  taskList: Task[],
  activePrimaryView: string,
  activeMapView: string,
  maps: { id: string; name: string }[],
  collectTaskLocationIds: (task: Task) => Set<string>,
  activeTraderView: string
): Task[] => {
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