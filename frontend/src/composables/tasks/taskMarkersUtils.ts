import type { TaskObjective, Task } from '@/types/tarkov';

export interface ObjectiveWithUsers extends TaskObjective {
  users: string[];
}

export const collectObjectiveMarkers = (
  task: Task,
  activeUserView: string,
  getUnlockedUsersForTask: (taskId: string) => string[],
  usersWithIncompleteObjective: (objectiveId: string, candidateUsers: string[]) => string[],
  objectiveIncompleteForUser: (objectiveId: string, userId: string) => boolean,
  objectiveHasLocation: (objective: TaskObjective) => boolean
): ObjectiveWithUsers[] => {
  if (!Array.isArray(task.objectives) || task.objectives.length === 0) {
    return [];
  }
  const unlockedUsers = getUnlockedUsersForTask(task.id);
  return task.objectives
    .filter((objective): objective is TaskObjective => Boolean(objective && objective.id))
    .filter((objective) => objectiveHasLocation(objective))
    .map((objective) =>
      createMarkerForObjective(
        objective,
        unlockedUsers,
        activeUserView,
        usersWithIncompleteObjective,
        objectiveIncompleteForUser
      )
    )
    .filter((marker): marker is ObjectiveWithUsers => marker !== null);
};

export const getUnlockedUsersForTask = (
  taskId: string,
  getUnlockedMap: (taskId: string) => Record<string, boolean>
) =>
  Object.entries(getUnlockedMap(taskId))
    .filter(([, unlocked]) => unlocked)
    .map(([teamId]) => teamId);

export const createMarkerForObjective = (
  objective: TaskObjective,
  unlockedUsers: string[],
  activeUserView: string,
  usersWithIncompleteObjective: (objectiveId: string, candidateUsers: string[]) => string[],
  objectiveIncompleteForUser: (objectiveId: string, userId: string) => boolean
): ObjectiveWithUsers | null => {
  if (activeUserView === 'all') {
    const pendingUsers = usersWithIncompleteObjective(objective.id, unlockedUsers);
    return pendingUsers.length > 0 ? { ...objective, users: pendingUsers } : null;
  }
  return objectiveIncompleteForUser(objective.id, activeUserView)
    ? { ...objective, users: [activeUserView] }
    : null;
};

export const usersWithIncompleteObjective = (
  objectiveId: string,
  candidateUsers: string[],
  getObjectiveCompletionMap: (objectiveId: string) => Record<string, boolean>
) => {
  const completionMap = getObjectiveCompletionMap(objectiveId);
  if (!completionMap) {
    return [];
  }
  return candidateUsers.filter((userId) => completionMap[userId] === false);
};

export const objectiveIncompleteForUser = (
  objectiveId: string,
  userId: string,
  getObjectiveCompletionMap: (objectiveId: string) => Record<string, boolean>
) => {
  const completionMap = getObjectiveCompletionMap(objectiveId);
  return completionMap ? completionMap[userId] === false : false;
};
