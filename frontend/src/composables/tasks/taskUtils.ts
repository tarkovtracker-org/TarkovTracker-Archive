import { getMapIdGroup } from '@/utils/mapNormalization';
import type { Task, TaskObjective } from '@/types/tarkov';

// ============================================================================
// COUNTING UTILITIES
// ============================================================================

export const summarizeSecondaryTaskCounts = (entries: Record<string, Task[]>) => ({
  available: entries.available?.length || 0,
  locked: entries.locked?.length || 0,
  completed: entries.completed?.length || 0,
});

// ============================================================================
// SORTING UTILITIES
// ============================================================================

export const successorDepth = (task: Task, tasks: Task[]) => {
  const tasksMap = tasks.reduce(
    (acc, t) => {
      acc[t.id] = t;
      return acc;
    },
    {} as Record<string, Task>
  );
  const depthMemo = new Map<string, number>();

  const calculateDepth = (taskId: string, recursionStack = new Set<string>()): number => {
    if (!tasksMap[taskId]) {
      return 0;
    }

    if (depthMemo.has(taskId)) {
      return depthMemo.get(taskId)!;
    }

    if (recursionStack.has(taskId)) {
      return 0;
    }

    recursionStack.add(taskId);
    const successors = tasksMap[taskId].successors || [];

    if (successors.length === 0) {
      depthMemo.set(taskId, 1);
      return 1;
    }

    const successorDepths = successors.map((sid) => calculateDepth(sid, recursionStack));
    const depth = 1 + Math.max(...successorDepths);
    depthMemo.set(taskId, depth);
    return depth;
  };

  return calculateDepth(task.id);
};

const checkParentChildRelation = (a: Task, b: Task) => {
  if (a.parents && a.parents.includes(b.id)) return -1;
  if (b.parents && b.parents.includes(a.id)) return 1;
  return 0;
};

const compareBySuccessorDepth = (a: Task, b: Task, tasks: Task[]) => {
  const aSuccessors = a.successors?.length || 0;
  const bSuccessors = b.successors?.length || 0;

  // Handle cases where only one task has successors
  if (aSuccessors === 0 && bSuccessors > 0) {
    return -1; // Task without successors sorts before task with successors
  }
  if (aSuccessors > 0 && bSuccessors === 0) {
    return 1; // Task with successors sorts after task without successors
  }

  // Both tasks have successors, compare by depth
  const aDepth = successorDepth(a, tasks);
  const bDepth = successorDepth(b, tasks);
  return aDepth - bDepth;
};

const compareBySuccessorCount = (a: Task, b: Task) => {
  if (a.successors?.length !== b.successors?.length) {
    return (a.successors?.length || 0) - (b.successors?.length || 0);
  }
  return 0;
};

const compareForGroupedView = (a: Task, b: Task, tasks: Task[]) => {
  const parentCheck = checkParentChildRelation(a, b);
  if (parentCheck !== 0) return parentCheck;

  const depthCheck = compareBySuccessorDepth(a, b, tasks);
  if (depthCheck !== 0) return depthCheck;

  const successorCheck = compareBySuccessorCount(a, b);
  if (successorCheck !== 0) return successorCheck;

  return 0; // No further sorting criteria
};

export const sortVisibleTasks = (tasksToSort: Task[], activeUserView: string, tasks: Task[]) => {
  const shouldGroupTasks = activeUserView === 'all';
  const tasksArray = [...tasksToSort];

  if (shouldGroupTasks) {
    tasksArray.sort((a, b) => compareForGroupedView(a, b, tasks));
  }

  return tasksArray;
};

// ============================================================================
// VIEW AND FILTERING UTILITIES
// ============================================================================

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
  for (const objective of task.objectives || []) {
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
