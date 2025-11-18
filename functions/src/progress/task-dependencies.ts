import { logger } from '../logger.js';
import type { Firestore, DocumentReference } from 'firebase-admin/firestore';
import { createLazyFirestore } from '../utils/factory.js';
import type { Task, TaskData, ProgressUpdate } from './constants.js';

/**
 * Helper function to update tasks that REQUIRE the changed task
 */
export const updateDependentTasks = async (
  changedTaskId: string,
  newState: string,
  userId: string,
  taskData: TaskData, // Assuming taskData and tasks are non-null by this point
  db: Firestore,
  progressUpdate: ProgressUpdate,
  updateTime: number
): Promise<void> => {
  for (const dependentTask of taskData.tasks!) {
    for (const req of dependentTask.taskRequirements ?? []) {
      if (req.task?.id === changedTaskId) {
        let shouldUnlock = false;
        let shouldLock = false;

        if (newState === 'completed' && req.status?.includes('complete')) {
          shouldUnlock = await checkAllRequirementsMet(
            dependentTask,
            changedTaskId,
            newState,
            userId,
            db
          );
        }

        if (newState !== 'completed' && req.status?.includes('complete')) {
          shouldLock = true;
        }

        if (shouldUnlock) {
          // Use legacy format: taskCompletions.${taskId}.complete = false (unlocked/active)
          progressUpdate[`taskCompletions.${dependentTask.id}.complete`] = false;
          progressUpdate[`taskCompletions.${dependentTask.id}.failed`] = false;
          progressUpdate[`taskCompletions.${dependentTask.id}.timestamp`] = updateTime;
        }

        if (shouldLock) {
          // Use legacy format: taskCompletions.${taskId}.complete = false (locked, but no separate locked state)
          progressUpdate[`taskCompletions.${dependentTask.id}.complete`] = false;
          progressUpdate[`taskCompletions.${dependentTask.id}.failed`] = false;
          progressUpdate[`taskCompletions.${dependentTask.id}.timestamp`] = updateTime;
        }
      }
    }
  }
};

/**
 * Helper function to update ALTERNATIVE tasks OF the changed task
 */
export const updateAlternativeTasks = (
  changedTask: Task, // Assuming changedTask is non-null
  newState: string,
  progressUpdate: ProgressUpdate,
  updateTime: number
): void => {
  changedTask.alternatives?.forEach((altTaskId) => {
    if (newState === 'completed') {
      // Current task COMPLETED
      // Mark alternative as failed using legacy format
      progressUpdate[`taskCompletions.${altTaskId}.complete`] = true;
      progressUpdate[`taskCompletions.${altTaskId}.failed`] = true;
      progressUpdate[`taskCompletions.${altTaskId}.timestamp`] = updateTime;
    } else if (newState !== 'failed') {
      // Current task is NOT FAILED (i.e., it's active or was un-completed from completed)
      // Mark alternative as active using legacy format
      progressUpdate[`taskCompletions.${altTaskId}.complete`] = false;
      progressUpdate[`taskCompletions.${altTaskId}.failed`] = false;
      progressUpdate[`taskCompletions.${altTaskId}.timestamp`] = updateTime;
    }
    // If newState === 'failed', the current logic intentionally does nothing to its alternatives.
  });
};

/**
 * Checks if all requirements for a task are met, considering current progress
 */
export const checkAllRequirementsMet = async (
  dependentTask: Task,
  changedTaskId: string,
  newState: string,
  userId: string,
  db: Firestore
): Promise<boolean> => {
  try {
    const progressRef: DocumentReference = db.collection('progress').doc(userId);
    const progressDoc = await progressRef.get();
    const progressData = progressDoc.data() ?? {};
    const taskCompletions = progressData.taskCompletions ?? {};

    // Check if ALL requirements for this dependent task are satisfied
    const allRequirementsMet = dependentTask.taskRequirements?.every((innerReq) => {
      if (!innerReq.task?.id) return true; // Skip if requirement has no task id

      const reqTaskId = innerReq.task.id;
      const requirementStatus = innerReq.status ?? [];

      // If this is the task that just changed status
      if (reqTaskId === changedTaskId) {
        // Check if the new state satisfies the requirement
        if (requirementStatus.includes('complete') && newState === 'completed') return true;
        if (requirementStatus.includes('failed') && newState === 'failed') return true;
        if (
          requirementStatus.includes('active') &&
          (newState === 'uncompleted' || newState === 'completed')
        )
          return true;
        return false;
      }

      // For other task requirements, check if they're satisfied based on current progress (legacy format)
      const otherTaskData = taskCompletions[reqTaskId];
      if (
        requirementStatus.includes('complete') &&
        otherTaskData?.complete &&
        !otherTaskData?.failed
      ) {
        return true; // Requirement needs completion and task is complete
      }
      if (
        requirementStatus.includes('active') &&
        (otherTaskData?.complete === false || (otherTaskData?.complete && !otherTaskData?.failed))
      ) {
        return true; // Requirement needs activation and task is active or complete
      }
      if ((requirementStatus.includes('failed') && otherTaskData?.failed) ?? false) {
        return true; // Requirement needs failure and task is failed
      }
      return (
        (requirementStatus.includes('complete') &&
          otherTaskData?.complete &&
          !otherTaskData?.failed) ??
        (requirementStatus.includes('active') &&
          (otherTaskData?.complete === false ||
            (otherTaskData?.complete && !otherTaskData?.failed))) ??
        (requirementStatus.includes('failed') && otherTaskData?.failed) ??
        false
      );
    });

    if (allRequirementsMet) {
      logger.log('All requirements met for task unlocking', {
        userId,
        taskId: dependentTask.id,
        changedTaskId,
      });
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Error checking task requirements:', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      taskId: dependentTask.id,
    });
    // Default to the simplified behavior if checking fails
    return true;
  }
};

/**
 * Updates task state and handles dependencies
 */
export const updateTaskState = async (
  taskId: string,
  newState: string,
  userId: string,
  taskData: TaskData | null | undefined
): Promise<void> => {
  if (!taskData?.tasks) return;

  const getDb = createLazyFirestore();
  const db: Firestore = getDb();
  const progressRef: DocumentReference = db.collection('progress').doc(userId);
  const updateTime = Date.now();
  const progressUpdate: ProgressUpdate = {};
  const changedTask = taskData.tasks.find((t) => t.id === taskId);

  if (!changedTask) return;

  // --- Update tasks that REQUIRE the changed task ---
  await updateDependentTasks(
    taskId,
    newState,
    userId,
    taskData as TaskData,
    db,
    progressUpdate,
    updateTime
  );

  // --- Update ALTERNATIVE tasks OF the changed task ---
  updateAlternativeTasks(changedTask, newState, progressUpdate, updateTime);

  // Commit any collected updates
  if (Object.keys(progressUpdate).length > 0) {
    try {
      await progressRef.update(progressUpdate);
      logger.log('Updated dependent task states', {
        userId,
        changedTaskId: taskId,
        newState,
        updates: progressUpdate,
      });
    } catch (error: unknown) {
      logger.error('Error updating dependent task states', {
        userId,
        changedTaskId: taskId,
        newState,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
};
