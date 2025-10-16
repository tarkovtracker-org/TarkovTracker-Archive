import { describe, it, expect } from 'vitest';
import { formatProgress } from '../../src/progress/progressUtils.js';

describe('progressUtils formatProgress', () => {
  it('formats legacy progress data and applies faction/ hideout rules', () => {
    const progressData = {
      currentGameMode: 'pvp',
      pvp: {
        displayName: 'PlayerOne',
        level: 10,
        pmcFaction: 'USEC',
        taskCompletions: {
          taskBear: { complete: true },
        },
        taskObjectives: {
          objBear: { complete: true },
        },
        hideoutModules: {},
        hideoutParts: {},
      },
    };

    const hideoutData = {
      hideoutStations: [
        {
          id: '5d484fc0654e76006657e0ab',
          levels: [
            {
              id: 'stash-l1',
              level: 1,
              itemRequirements: [{ id: 'stash-item', count: 2 }],
            },
          ],
        },
      ],
    };

    const taskData = {
      tasks: [
        {
          id: 'taskBear',
          factionName: 'BEAR',
          objectives: [{ id: 'objBear' }],
        },
      ],
    };

    const result = formatProgress(progressData, 'user123', hideoutData, taskData, 'pvp');

    expect(result.displayName).toBe('PlayerOne');
    expect(result.userId).toBe('user123');
    expect(result.tasksProgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'taskBear', invalid: true, complete: false }),
      ])
    );
    expect(result.taskObjectivesProgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'objBear', invalid: true, complete: false }),
      ])
    );
    expect(result.hideoutModulesProgress).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'stash-l1', complete: true })])
    );
    expect(result.hideoutPartsProgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'stash-item', count: 2, complete: true }),
      ])
    );
  });

  it('handles missing progress data gracefully', () => {
    const result = formatProgress(undefined, 'userABC', null, null, 'pvp');
    expect(result.displayName).toBe('userAB');
    expect(result.tasksProgress).toEqual([]);
    expect(result.hideoutModulesProgress).toEqual([]);
  });
});
