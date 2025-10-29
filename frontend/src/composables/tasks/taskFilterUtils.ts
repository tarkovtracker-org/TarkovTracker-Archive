import type { Task } from '@/types/tarkov';

export const summarizeSecondaryTaskCounts = (entries: Record<string, Task[]>) => ({
  available: entries.available?.length || 0,
  locked: entries.locked?.length || 0,
  completed: entries.completed?.length || 0,
});

export const successorDepth = (task: Task, tasks: Task[]) => {
  const visited = new Set<string>();
  const tasksMap = tasks.reduce(
    (acc, t) => {
      acc[t.id] = t;
      return acc;
    },
    {} as Record<string, Task>
  );

  const calculateDepth = (taskId: string): number => {
    if (visited.has(taskId) || !tasksMap[taskId]) {
      return 0;
    }

    visited.add(taskId);
    const successors = tasksMap[taskId].successors || [];

    if (successors.length === 0) {
      return 1;
    }

    const successorDepths = successors.map(calculateDepth);
    return 1 + Math.max(...successorDepths);
  };

  return calculateDepth(task.id);
};

const checkParentChildRelation = (a: Task, b: Task) => {
  if (a.parents && a.parents.includes(b.id)) return -1;
  if (b.parents && b.parents.includes(a.id)) return 1;
  return 0;
};

const compareBySuccessorDepth = (a: Task, b: Task, tasks: Task[]) => {
  const aSuccessors = b.successors?.length || 0;
  const bSuccessors = a.successors?.length || 0;

  if (aSuccessors > 0 && bSuccessors > 0) {
    const aDepth = successorDepth(a, tasks);
    const bDepth = successorDepth(b, tasks);
    if (aDepth !== bDepth) {
      return aDepth - bDepth;
    }
  }

  return 0;
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
  } else {
    tasksArray.sort((_a, _b) => 0); // No sorting for non-grouped view
  }

  return tasksArray;
};
