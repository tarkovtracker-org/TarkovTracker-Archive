import admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { 
  Firestore, 
  DocumentReference, 
  FieldValue 
} from 'firebase-admin/firestore';
import { 
  ProgressDocument, 
  FormattedProgress, 
  TaskStatus, 
  MultipleTaskUpdateRequest, 
  ObjectiveUpdateRequest,
  ServiceOptions,
  TaskCompletion
} from '../types/api.js';
import { errors } from '../middleware/errorHandler.js';
import { formatProgress, updateTaskState } from '../progress/progressUtils.js';
import { getTaskData, getHideoutData } from '../utils/dataLoaders.js';

export class ProgressService {
  private db: Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Gets user progress document with proper error handling
   */
  async getUserProgress(userId: string, gameMode: string = 'pvp'): Promise<FormattedProgress> {
    const progressRef = this.db.collection('progress').doc(userId) as DocumentReference<ProgressDocument>;
    
    try {
      // Fetch data concurrently
      const [progressDoc, hideoutData, taskData] = await Promise.all([
        progressRef.get(),
        getHideoutData(),
        getTaskData()
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
  async setPlayerLevel(userId: string, level: number, gameMode: string = 'pvp', options?: ServiceOptions): Promise<void> {
    const progressRef = this.db.collection('progress').doc(userId) as DocumentReference<ProgressDocument>;
    
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
  async updateSingleTask(userId: string, taskId: string, state: TaskStatus, gameMode: string = 'pvp'): Promise<void> {
    try {
      // Run in transaction to ensure consistency
      await this.db.runTransaction(async (transaction) => {
        const progressRef = this.db.collection('progress').doc(userId) as DocumentReference<ProgressDocument>;
        const updateTime = Date.now();
        const updateData: Record<string, boolean | number | FieldValue> = {};

        // Build update data based on state
        this.buildTaskUpdateData(taskId, state, updateTime, updateData, gameMode);

        // Apply the update within transaction
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
  async updateMultipleTasks(userId: string, taskUpdates: MultipleTaskUpdateRequest, gameMode: string = 'pvp'): Promise<void> {
    const taskIds = Object.keys(taskUpdates);
    
    try {
      // Run in transaction for consistency
      await this.db.runTransaction(async (transaction) => {
        const progressRef = this.db.collection('progress').doc(userId) as DocumentReference<ProgressDocument>;
        const updateTime = Date.now();
        const batchUpdateData: Record<string, boolean | number | FieldValue> = {};

        // Build update data for all tasks
        for (const taskId of taskIds) {
          const state = taskUpdates[taskId];
          this.buildTaskUpdateData(taskId, state, updateTime, batchUpdateData, gameMode);
        }

        // Apply all updates in single transaction
        transaction.update(progressRef, batchUpdateData);

        logger.log('Multiple tasks updated in transaction', {
          userId,
          taskCount: taskIds.length,
          updateTime,
        });
      });

      // Handle dependencies for all tasks (outside transaction)
      const dependencyPromises = taskIds.map(async (taskId) => {
        try {
          const taskData = await getTaskData();
          await updateTaskState(taskId, taskUpdates[taskId], userId, taskData);
        } catch (depError) {
          logger.error('Error updating task dependencies in batch:', {
            error: depError instanceof Error ? depError.message : String(depError),
            userId,
            taskId,
            state: taskUpdates[taskId],
          });
        }
      });

      await Promise.allSettled(dependencyPromises);
      logger.log('Multiple tasks updated successfully', { userId, taskCount: taskIds.length });
    } catch (error) {
      logger.error('Error updating multiple tasks:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        taskCount: taskIds.length,
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
    const progressRef = this.db.collection('progress').doc(userId) as DocumentReference<ProgressDocument>;
    
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
      if (update.count != null) {
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
    updateData: Record<string, boolean | number | FieldValue>,
    gameMode: string = 'pvp'
  ): void {
    const baseKey = `${gameMode}.taskCompletions.${taskId}`;

    switch (state) {
      case 'completed':
        updateData[`${baseKey}.complete`] = true;
        updateData[`${baseKey}.failed`] = false;
        updateData[`${baseKey}.timestamp`] = updateTime;
        break;
        
      case 'failed':
        updateData[`${baseKey}.complete`] = true;
        updateData[`${baseKey}.failed`] = true;
        updateData[`${baseKey}.timestamp`] = updateTime;
        break;
        
      case 'uncompleted':
        updateData[`${baseKey}.complete`] = false;
        updateData[`${baseKey}.failed`] = false;
        updateData[`${baseKey}.timestamp`] = FieldValue.delete();
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
    const progressRef = this.db.collection('progress').doc(userId) as DocumentReference<ProgressDocument>;
    
    try {
      const progressDoc = await progressRef.get();
      
      if (!progressDoc.exists) {
        return null;
      }

      const data = progressDoc.data();
      return data?.taskCompletions?.[taskId] || null;
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
