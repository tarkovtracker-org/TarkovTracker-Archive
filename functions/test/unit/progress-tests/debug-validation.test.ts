import { describe, it, expect } from 'vitest';
import { invalidateTasks } from '../../../src/progress/validation';
import type { FormattedProgress, TaskData } from '../../../src/progress/constants';

describe('debug validation issue', () => {
  it('should isolate test data correctly', () => {
    // Fresh data
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
        { id: 'task2', complete: true }, // This is key - should be complete
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

    console.log(
      'BEFORE invalidation - task2:',
      progress.tasksProgress.find((t) => t.id === 'task2')
    );

    invalidateTasks(progress, taskData, 'USEC', 'user123');

    console.log(
      'AFTER invalidation - task2:',
      progress.tasksProgress.find((t) => t.id === 'task2')
    );

    // task1 should be invalidated since task2 (alternative) is completed
    expect(progress.tasksProgress.find((t) => t.id === 'task1')?.invalid).toBe(true);
    expect(progress.tasksProgress.find((t) => t.id === 'task2')?.invalid).toBeUndefined();
  });
});
