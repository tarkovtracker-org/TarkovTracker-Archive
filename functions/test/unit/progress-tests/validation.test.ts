import { describe, it, expect } from 'vitest';
import { invalidateTaskRecursive, invalidateTasks } from '../../../src/progress/validation';
import type { FormattedProgress, TaskData, ObjectiveItem } from '../../../src/progress/constants';

describe('validation module', () => {
  describe('invalidateTaskRecursive', () => {
    it('should handle missing task data', () => {
      const tasksProgress: ObjectiveItem[] = [];
      const objectiveProgress: ObjectiveItem[] = [];

      const result = invalidateTaskRecursive('task1', null, tasksProgress, objectiveProgress);

      expect(result.tasksProgress).toEqual([]);
      expect(result.objectiveProgress).toEqual([]);
    });

    it('should invalidate a task and its objectives', () => {
      const taskData: TaskData = {
        tasks: [
          {
            id: 'task1',
            objectives: [{ id: 'obj1' }, { id: 'obj2' }],
          },
        ],
      };

      const tasksProgress: ObjectiveItem[] = [
        { id: 'task1', complete: true },
        { id: 'task2', complete: true },
      ];

      const objectiveProgress: ObjectiveItem[] = [
        { id: 'obj1', complete: true },
        { id: 'obj2', complete: true },
        { id: 'obj3', complete: true },
      ];

      const result = invalidateTaskRecursive('task1', taskData, tasksProgress, objectiveProgress);

      expect(result.tasksProgress).toEqual([
        { id: 'task1', complete: false, invalid: true },
        { id: 'task2', complete: true },
      ]);

      expect(result.objectiveProgress).toEqual([
        { id: 'obj1', complete: false, invalid: true },
        { id: 'obj2', complete: false, invalid: true },
        { id: 'obj3', complete: true },
      ]);
    });

    it('should add task if not found in progress', () => {
      const taskData: TaskData = {
        tasks: [
          {
            id: 'task1',
            objectives: [],
          },
        ],
      };

      const tasksProgress: ObjectiveItem[] = [];
      const objectiveProgress: ObjectiveItem[] = [];

      const result = invalidateTaskRecursive('task1', taskData, tasksProgress, objectiveProgress);

      expect(result.tasksProgress).toEqual([{ id: 'task1', complete: false, invalid: true }]);
    });

    it('should handle childOnly mode', () => {
      const taskData: TaskData = {
        tasks: [
          {
            id: 'task1',
            objectives: [{ id: 'obj1' }],
          },
          {
            id: 'task2',
            taskRequirements: [{ task: { id: 'task1' }, status: ['complete'] }],
            objectives: [{ id: 'obj2' }],
          },
        ],
      };

      const tasksProgress: ObjectiveItem[] = [
        { id: 'task1', complete: true },
        { id: 'task2', complete: false },
      ];

      const objectiveProgress: ObjectiveItem[] = [
        { id: 'obj1', complete: true },
        { id: 'obj2', complete: false },
      ];

      invalidateTaskRecursive('task1', taskData, tasksProgress, objectiveProgress, true);

      // task1 should remain valid (childOnly = true)
      expect(tasksProgress.find((t) => t.id === 'task1')?.invalid).toBeUndefined();
      // task2 should be invalidated
      expect(tasksProgress.find((t) => t.id === 'task2')?.invalid).toBe(true);
    });

    it('should recursively invalidate dependent tasks', () => {
      const taskData: TaskData = {
        tasks: [
          {
            id: 'task1',
            objectives: [],
          },
          {
            id: 'task2',
            taskRequirements: [{ task: { id: 'task1' }, status: ['complete'] }],
            objectives: [],
          },
          {
            id: 'task3',
            taskRequirements: [{ task: { id: 'task2' }, status: ['complete'] }],
            objectives: [],
          },
        ],
      };

      const tasksProgress: ObjectiveItem[] = [
        { id: 'task1', complete: false },
        { id: 'task2', complete: false },
        { id: 'task3', complete: false },
      ];

      const objectiveProgress: ObjectiveItem[] = [];

      invalidateTaskRecursive('task1', taskData, tasksProgress, objectiveProgress);

      expect(tasksProgress.find((t) => t.id === 'task1')?.invalid).toBe(true);
      expect(tasksProgress.find((t) => t.id === 'task2')?.invalid).toBe(true);
      expect(tasksProgress.find((t) => t.id === 'task3')?.invalid).toBe(true);
    });
  });

  describe('invalidateTasks', () => {
    it('should handle missing task data', () => {
      const progress: FormattedProgress = {
        tasksProgress: [],
        taskObjectivesProgress: [],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
        displayName: 'Test',
        userId: 'user123',
        playerLevel: 1,
        gameEdition: 1,
        pmcFaction: 'USEC',
      };

      // Should not throw
      invalidateTasks(progress, null, 'USEC', 'user123');
    });

    it('should invalidate faction-specific tasks', () => {
      const taskData: TaskData = {
        tasks: [
          {
            id: 'task1',
            factionName: 'USEC',
          },
          {
            id: 'task2',
            factionName: 'BEAR',
          },
          {
            id: 'task3',
            factionName: 'Any',
          },
        ],
      };

      const progress: FormattedProgress = {
        tasksProgress: [
          { id: 'task1', complete: true },
          { id: 'task2', complete: true },
          { id: 'task3', complete: true },
        ],
        taskObjectivesProgress: [],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
        displayName: 'Test',
        userId: 'user123',
        playerLevel: 1,
        gameEdition: 1,
        pmcFaction: 'USEC',
      };

      invalidateTasks(progress, taskData, 'USEC', 'user123');

      // BEAR task should be invalidated for USEC player
      expect(progress.tasksProgress.find((t) => t.id === 'task1')?.invalid).toBeUndefined();
      expect(progress.tasksProgress.find((t) => t.id === 'task2')?.invalid).toBe(true);
      expect(progress.tasksProgress.find((t) => t.id === 'task3')?.invalid).toBeUndefined();
    });

    it('should invalidate tasks with alternative tasks completed', () => {
      const taskData: TaskData = {
        tasks: [
          {
            id: 'task1',
            alternatives: ['task2'],
          },
          {
            id: 'task2',
          },
        ],
      };

      const progress: FormattedProgress = {
        tasksProgress: [
          { id: 'task1', complete: false },
          { id: 'task2', complete: true },
        ],
        taskObjectivesProgress: [],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
        displayName: 'Test',
        userId: 'user123',
        playerLevel: 1,
        gameEdition: 1,
        pmcFaction: 'USEC',
      };

      invalidateTasks(progress, taskData, 'USEC', 'user123');

      // task1 should be invalidated since task2 (alternative) is completed
      expect(progress.tasksProgress.find((t) => t.id === 'task1')?.invalid).toBe(true);
      expect(progress.tasksProgress.find((t) => t.id === 'task2')?.invalid).toBeUndefined();
    });

    it('should handle failed requirements correctly', () => {
      const taskData: TaskData = {
        tasks: [
          {
            id: 'task1',
            taskRequirements: [{ task: { id: 'task2' }, status: ['failed'] }],
          },
          {
            id: 'task2',
          },
        ],
      };

      const progress: FormattedProgress = {
        tasksProgress: [
          { id: 'task1', complete: false },
          { id: 'task2', complete: true, failed: false },
        ],
        taskObjectivesProgress: [],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
        displayName: 'Test',
        userId: 'user123',
        playerLevel: 1,
        gameEdition: 1,
        pmcFaction: 'USEC',
      };

      invalidateTasks(progress, taskData, 'USEC', 'user123');

      // task1 should be invalidated since it requires task2 to be failed, but task2 is complete
      expect(progress.tasksProgress.find((t) => t.id === 'task1')?.invalid).toBe(true);
      expect(progress.tasksProgress.find((t) => t.id === 'task2')?.invalid).toBeUndefined();
    });
  });
});
