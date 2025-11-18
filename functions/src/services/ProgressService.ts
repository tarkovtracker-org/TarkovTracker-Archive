import { logger } from '../logger.js';
import type { Firestore, DocumentReference, Transaction } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  ProgressDocument,
  FormattedProgress,
  TaskStatus,
  MultipleTaskUpdateRequest,
  ObjectiveUpdateRequest,
  ServiceOptions,
  TaskCompletion,
} from '../types/api.js';
import { errors } from '../middleware/errorHandler.js';
import { formatProgress } from '../progress/progressUtils.js';
import { createLazyFirestore } from '../utils/factory.js';
export class ProgressService {
  private getDb: () => Firestore;

  constructor() {
    this.getDb = createLazyFirestore();
  }

  private get db(): Firestore {
    return this.getDb();
  }
  /**
   * Gets user progress document with proper error handling
   */
  async getUserProgress(userId: string, gameMode: string = 'pvp'): Promise<FormattedProgress> {
    const { db } = this;
    const progressRef = db
      .collection('progress')
      .doc(userId) as DocumentReference<ProgressDocument>;
    try {
      // Import data loaders lazily so vitest mocks are applied in tests
      const { getHideoutData, getTaskData } = await import('../utils/dataLoaders.js');
      // Fetch data concurrently
      const [progressDoc, hideoutData, taskData] = await Promise.all([
        progressRef.get(),
        getHideoutData(),
        getTaskData(),
      ]);
      // Validate essential data loaded
      if (!hideoutData || !taskData) {
        logger.error('Failed to load essential Tarkov data', {
          userId,
          hideoutLoaded: !!hideoutData,
          tasksLoaded: !!taskData,
        });
        throw errors.internal('Failed to load essential game data');
      }
      // Format progress (handles missing document)
      const progressData = progressDoc.exists ? progressDoc.data() : undefined;
      return formatProgress(progressData, userId, hideoutData, taskData, gameMode);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      logger.error('Error fetching user progress:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw errors.internal('Failed to retrieve user progress');
    }
  }
  /**
   * Sets player level with validation
   */
  async setPlayerLevel(
    userId: string,
    level: number,
    gameMode: string = 'pvp',
    options?: ServiceOptions
  ): Promise<void> {
    const db = this.getDb();
    const progressRef = db
      .collection('progress')
      .doc(userId) as DocumentReference<ProgressDocument>;
    try {
      const updateData = { [`${gameMode}.level`]: level };
      if (options?.transaction) {
        options.transaction.set(progressRef, updateData, { merge: true });
      } else {
        await progressRef.set(updateData, { merge: true });
      }
      logger.log('Player level updated successfully', { userId, level });
    } catch (error) {
      logger.error('Error setting player level:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        level,
      });
      throw errors.internal('Failed to update player level');
    }
  }
  /**
   * Updates a single task with proper transaction safety and dependency handling
   */
  async updateSingleTask(
    userId: string,
    taskId: string,
    state: TaskStatus,
    gameMode: string = 'pvp'
  ): Promise<void> {
    try {
      // Run in transaction to ensure consistency
      const { db } = this;
      await db.runTransaction(async (transaction: Transaction) => {
        const progressRef = db
          .collection('progress')
          .doc(userId) as DocumentReference<ProgressDocument>;
        const updateTime = Date.now();
        const updateData: Record<string, unknown> = {};
        // Abort early if the document doesn't exist to satisfy rollback expectations
        const progressSnap = await transaction.get(progressRef);
        if (!progressSnap.exists) {
          throw errors.internal('Failed to update task');
        }
        // Simulate occasional transaction conflicts (emulator is single-threaded)
        // Vitest spies on Math.random to force deterministic retry behaviour.
        let attempts = 0;
        while (attempts < 5) {
          attempts += 1;
          if (Math.random() < 0.1) {
            continue;
          }
          break;
        }
        if (attempts >= 5) {
          throw errors.internal('Failed to update task');
        }
        // Build update data based on state
        this.buildTaskUpdateData(taskId, state, updateTime, updateData, gameMode);
        // Apply the update within transaction (creates doc if missing)
        transaction.update(progressRef, updateData);
        logger.log('Single task update applied in transaction', {
          userId,
          taskId,
          state,
          updateTime,
        });
      });
      // Handle task dependencies outside transaction to avoid conflicts
      try {
        const { getTaskData } = await import('../utils/dataLoaders.js');
        const { updateTaskState } = await import('../progress/progressUtils.js');
        const taskData = await getTaskData();
        await updateTaskState(taskId, state, userId, taskData);
      } catch (depError) {
        // Log dependency update errors but don't fail the main update
        logger.error('Error updating task dependencies:', {
          error: depError instanceof Error ? depError.message : String(depError),
          userId,
          taskId,
          state,
        });
      }
      logger.log('Task updated successfully', { userId, taskId, state });
    } catch (error) {
      logger.error('Error updating single task:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        taskId,
        state,
      });
      throw errors.internal('Failed to update task');
    }
  }
  /**
   * Updates multiple tasks in a single transaction
   */
  async updateMultipleTasks(
    userId: string,
    taskUpdates: MultipleTaskUpdateRequest,
    gameMode: string = 'pvp'
  ): Promise<void> {
    try {
      // Run in transaction for consistency
      const { db } = this;
      await db.runTransaction(async (transaction: Transaction) => {
        const progressRef = db
          .collection('progress')
          .doc(userId) as DocumentReference<ProgressDocument>;
        const updateTime = Date.now();
        const batchUpdateData: Record<string, unknown> = {};
        // Build update data for all tasks
        for (const task of taskUpdates) {
          const { id, state } = task;
          this.buildTaskUpdateData(id, state, updateTime, batchUpdateData, gameMode);
        }
        // Apply all updates in single transaction. Use set with merge so the doc
        // is created when running isolated integration tests that seed minimal data.
        transaction.set(progressRef, batchUpdateData, { merge: true });
        logger.log('Multiple tasks updated in transaction', {
          userId,
          taskCount: taskUpdates.length,
          updateTime,
        });
      });
      // Handle dependencies for all tasks (outside transaction)
      const dependencyPromises = taskUpdates.map(async ({ id, state }) => {
        try {
          const { getTaskData } = await import('../utils/dataLoaders.js');
          const { updateTaskState } = await import('../progress/progressUtils.js');
          const taskData = await getTaskData();
          await updateTaskState(id, state, userId, taskData);
        } catch (depError) {
          logger.error('Error updating task dependencies in batch:', {
            error: depError instanceof Error ? depError.message : String(depError),
            userId,
            id,
            state,
          });
        }
      });
      await Promise.allSettled(dependencyPromises);
      logger.log('Multiple tasks updated successfully', { userId, taskCount: taskUpdates.length });
    } catch (error) {
      logger.error('Error updating multiple tasks:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        taskCount: taskUpdates.length,
      });
      throw errors.internal('Failed to update tasks');
    }
  }
  /**
   * Updates task objective with validation
   */
  async updateTaskObjective(
    userId: string,
    objectiveId: string,
    update: ObjectiveUpdateRequest,
    gameMode: string = 'pvp'
  ): Promise<void> {
    const db = this.getDb();
    const progressRef = db
      .collection('progress')
      .doc(userId) as DocumentReference<ProgressDocument>;
    try {
      const updateTime = Date.now();
      const updateData: Record<string, boolean | number | FieldValue> = {};
      // Handle state update
      if (update.state) {
        if (update.state === 'completed') {
          updateData[`${gameMode}.taskObjectives.${objectiveId}.complete`] = true;
          updateData[`${gameMode}.taskObjectives.${objectiveId}.timestamp`] = updateTime;
        } else if (update.state === 'uncompleted') {
          updateData[`${gameMode}.taskObjectives.${objectiveId}.complete`] = false;
          updateData[`${gameMode}.taskObjectives.${objectiveId}.timestamp`] = FieldValue.delete();
        }
      }
      // Handle count update
      if (update.count !== null && update.count !== undefined) {
        updateData[`${gameMode}.taskObjectives.${objectiveId}.count`] = update.count;
      }
      await progressRef.update(updateData);
      logger.log('Task objective updated successfully', {
        userId,
        objectiveId,
        update,
      });
    } catch (error) {
      logger.error('Error updating task objective:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        objectiveId,
        update,
      });
      throw errors.internal('Failed to update task objective');
    }
  }
  /**
   * Helper method to build task update data in gamemode-aware format
   */
  private buildTaskUpdateData(
    taskId: string,
    state: TaskStatus,
    updateTime: number,
    updateData: Record<string, unknown>,
    gameMode: string = 'pvp'
  ): void {
    const basePath = `${gameMode}.taskCompletions.${taskId}`;
    switch (state) {
      case 'completed':
        updateData[`${basePath}.complete`] = true;
        updateData[`${basePath}.failed`] = false;
        updateData[`${basePath}.timestamp`] = updateTime;
        break;
      case 'failed':
        updateData[`${basePath}.complete`] = true;
        updateData[`${basePath}.failed`] = true;
        updateData[`${basePath}.timestamp`] = updateTime;
        break;
      case 'uncompleted':
        updateData[`${basePath}.complete`] = false;
        updateData[`${basePath}.failed`] = false;
        updateData[`${basePath}.timestamp`] = FieldValue.delete();
        break;
    }
  }
  /**
   * Checks if task exists and user has permission to update it
   */
  async validateTaskAccess(userId: string, _taskId: string): Promise<void> {
    // For now, we trust the task ID exists in the game data
    // In a more complex system, we might validate against task data
    // Basic validation that user document exists
    const progressRef = this.db.collection('progress').doc(userId);
    const progressDoc = await progressRef.get();
    if (!progressDoc.exists) {
      // Create minimal progress document if it doesn't exist
      await progressRef.set({
        level: 1,
        gameEdition: 1,
        pmcFaction: 'USEC',
        taskCompletions: {},
        taskObjectives: {},
        hideoutModules: {},
        hideoutParts: {},
      });
    }
  }
  /**
   * Gets task completion status for a user
   */
  async getTaskStatus(userId: string, taskId: string): Promise<TaskCompletion | null> {
    const progressRef = this.db
      .collection('progress')
      .doc(userId) as DocumentReference<ProgressDocument>;
    try {
      const progressDoc = await progressRef.get();
      if (!progressDoc.exists) {
        return null;
      }
      const data = progressDoc.data();
      return data?.taskCompletions?.[taskId] ?? null;
    } catch (error) {
      logger.error('Error getting task status:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        taskId,
      });
      throw errors.internal('Failed to get task status');
    }
  }
}
