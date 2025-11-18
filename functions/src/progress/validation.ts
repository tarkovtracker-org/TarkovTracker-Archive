import { logger } from '../logger.js';
import type { TaskData, FormattedProgress } from './constants.js';
import type { ObjectiveItem } from './constants.js';

/**
 * Recursively invalidates a task and its dependent tasks
 */
export const invalidateTaskRecursive = (
  taskId: string,
  taskData: TaskData | null | undefined,
  tasksProgress: ObjectiveItem[],
  objectiveProgress: ObjectiveItem[],
  childOnly: boolean = false
): { tasksProgress: ObjectiveItem[]; objectiveProgress: ObjectiveItem[] } => {
  // Find the task in the taskData
  const task = taskData?.tasks?.find((task) => task.id === taskId);

  if (task !== null && task !== undefined) {
    // Child only means we only mark the successors as invalid, not the task itself, this is used for alternative tasks
    if (!childOnly) {
      // Find the index of the task in the tasksProgress
      const taskIndex = tasksProgress.findIndex((t) => t.id === taskId);

      // Mark the task as invalid
      if (taskIndex !== -1) {
        tasksProgress[taskIndex].invalid = true;
        tasksProgress[taskIndex].complete = false; // Ensure invalid tasks are not complete
      } else {
        tasksProgress.push({ id: taskId, complete: false, invalid: true });
      }

      // For each objective of the task, mark it as invalid
      task.objectives?.forEach((objective) => {
        const objectiveIndex = objectiveProgress.findIndex((o) => o.id === objective.id);
        if (objectiveIndex !== -1) {
          objectiveProgress[objectiveIndex].invalid = true;
          objectiveProgress[objectiveIndex].complete = false; // Ensure invalid objectives are not complete
        } else {
          objectiveProgress.push({
            id: objective.id,
            complete: false,
            count: 0,
            invalid: true,
          });
        }
      });
    }

    // Find all of the tasks that have this task as a requirement
    const requiredTasks = taskData?.tasks?.filter((reqTask) =>
      reqTask.taskRequirements?.some(
        (requirement) =>
          requirement.task?.id === taskId &&
          requirement.status?.some((status) => status === 'complete' || status === 'active')
      )
    );

    requiredTasks?.forEach((requiredTask) => {
      // Recursively call this function on the task that requires this task
      // Note: This mutates the original arrays passed in, so no need to reassign
      invalidateTaskRecursive(requiredTask.id, taskData, tasksProgress, objectiveProgress);
    });
  }

  // Return references to the (potentially mutated) arrays
  return { tasksProgress, objectiveProgress };
};

/**
 * Applies task invalidation rules based on faction and dependencies
 */
export const invalidateTasks = (
  progress: FormattedProgress,
  taskData: TaskData | null | undefined,
  pmcFaction: string,
  userId: string // Added for logging context
): void => {
  if (!taskData?.tasks) return;

  try {
    // Invalidate faction-specific tasks
    const invalidFactionTasks = taskData.tasks.filter(
      (task) => task.factionName && task.factionName !== 'Any' && task.factionName !== pmcFaction
    );

    invalidFactionTasks.forEach((task) => {
      invalidateTaskRecursive(
        task.id,
        taskData,
        progress.tasksProgress,
        progress.taskObjectivesProgress
      );
    });

    // Invalidate tasks with failed requirements if the requirement isn't actually failed
    const failedRequirementTasks = taskData.tasks.filter((task) =>
      task.taskRequirements?.some((req) => req.status?.includes('failed'))
    );

    failedRequirementTasks.forEach((failTask) => {
      const shouldInvalidate = failTask.taskRequirements?.some(
        (req) =>
          req?.status?.length === 1 &&
          req.status[0] === 'failed' &&
          req.task?.id &&
          !progress.tasksProgress.find((t) => t.id === req.task!.id)?.failed &&
          progress.tasksProgress.find((t) => t.id === req.task!.id)?.complete
      );

      if (shouldInvalidate) {
        invalidateTaskRecursive(
          failTask.id,
          taskData,
          progress.tasksProgress,
          progress.taskObjectivesProgress
        );
      }
    });

    // Invalidate tasks if an alternative task is completed
    const alternativeTasks = taskData.tasks.filter(
      (task) => task.alternatives && task.alternatives.length > 0
    );

    alternativeTasks.forEach((altTask) => {
      const alternativeCompleted = altTask.alternatives?.some((altId) => {
        const altTaskData = progress.tasksProgress.find((t) => t.id === altId);
        const isComplete = altTaskData?.complete;
        const isFailed = altTaskData?.failed;
        return !isFailed && isComplete;
      });

      if (alternativeCompleted) {
        // Invalidate the original task and its successors
        invalidateTaskRecursive(
          altTask.id,
          taskData,
          progress.tasksProgress,
          progress.taskObjectivesProgress,
          false // Invalidate the task itself, not just successors
        );
      }
    });
  } catch (error: unknown) {
    logger.error('Error processing task invalidation rules within helper', {
      error: error instanceof Error ? error.message : String(error),
      userId, // Pass userId for better logging
    });
  }
};
