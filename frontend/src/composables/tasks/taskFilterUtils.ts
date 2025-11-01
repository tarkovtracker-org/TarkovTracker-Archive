import type { Task } from '@/types/tarkov';

export const summarizeSecondaryTaskCounts = (
  entries: Record<string, Task[]>
): { available: number; locked: number; completed: number } => ({
  available: entries.available?.length || 0,
  locked: entries.locked?.length || 0,
  completed: entries.completed?.length || 0,
});

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

const checkParentChildRelation = (a: Task, b: Task) => {
  if (a.parents && a.parents.includes(b.id)) return -1;
  if (b.parents && b.parents.includes(a.id)) return 1;
  return 0;
};

const compareBySuccessorDepth = (a: Task, b: Task, tasks: Task[]) => {
  const aSuccessors = a.successors?.length || 0;
  const bSuccessors = b.successors?.length || 0;

  // Task without successors comes before task with successors
  if (aSuccessors === 0 && bSuccessors > 0) {
    return -1;
  }
  // Task with successors comes after task without successors
  if (aSuccessors > 0 && bSuccessors === 0) {
    return 1;
  }

  // Both tasks have successors: compare by their successor depth values
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

  if (shouldGroupTasks) {
    const tasksArray = [...tasksToSort];
    tasksArray.sort((a, b) => compareForGroupedView(a, b, tasks));
    return tasksArray;
  }

  return tasksToSort;
};
