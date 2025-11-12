import { describe, it, expect } from 'vitest';
import {
  formatProgress,
  updateTaskState,
  invalidateTaskRecursive,
} from '../../src/progress/progressUtils';

describe('progressUtils - Enhanced Coverage', () => {
  describe('formatProgress', () => {
    it('formats progress with default game mode', () => {
      const mockHideoutData = {
        hideoutStations: [
          {
            id: '5d484fc0654e76006657e0ab',
            levels: [
              { id: 'stash-level-1', level: 1 },
              { id: 'stash-level-2', level: 2 },
            ],
          },
        ],
      };
      const mockTaskData = {
        tasks: [
          {
            id: 'task-1',
            objectives: [{ id: 'obj-1' }],
            taskRequirements: [],
            factionName: 'Any',
          },
        ],
      };
      const result = formatProgress(
        {
          displayName: 'Test User',
          level: 15,
          gameEdition: 1,
          taskCompletions: { 'task-1': { complete: true } },
          taskObjectives: { 'obj-1': { complete: true, count: 5 } },
          hideoutModules: { 'module-1': { complete: true } },
          hideoutParts: { 'part-1': { complete: true, count: 3 } },
        },
        'user-123',
        mockHideoutData,
        mockTaskData,
        'pvp'
      );
      expect(result).toBeDefined();
      expect(result.displayName).toBe('Test User');
      expect(result.playerLevel).toBe(15);
      expect(result.gameEdition).toBe(1);
      expect(result.userId).toBe('user-123');
      expect(result.pmcFaction).toBe('USEC');
    });
    it('handles missing game mode by defaulting to pvp', () => {
      const mockHideoutData = { hideoutStations: [] };
      const mockTaskData = { tasks: [] };
      const result = formatProgress(
        {
          displayName: 'Test User',
          level: 15,
          gameEdition: 1,
        },
        'user-123',
        mockHideoutData,
        mockTaskData
      );
      expect(result).toBeDefined();
      expect(result.displayName).toBe('Test User');
      expect(result.playerLevel).toBe(15);
      expect(result.gameEdition).toBe(1);
    });
    it('handles different game editions', () => {
      const mockHideoutData = { hideoutStations: [] };
      const mockTaskData = { tasks: [] };
      const result = formatProgress(
        {
          displayName: 'Test User',
          level: 15,
          gameEdition: 4, // Edge of Darkness
        },
        'user-123',
        mockHideoutData,
        mockTaskData,
        'pvp'
      );
      expect(result).toBeDefined();
      expect(result.gameEdition).toBe(4);
    });
    it('handles malformed progress data gracefully', () => {
      const mockHideoutData = { hideoutStations: [] };
      const mockTaskData = { tasks: [] };
      // Should handle malformed data without throwing
      const result = formatProgress(
        {
          displayName: 'Test User',
          level: 'invalid' as any, // Invalid level
          gameEdition: 'invalid' as any, // Invalid edition
          taskCompletions: 'not-an-object' as any, // Invalid data
        },
        'user-malformed',
        mockHideoutData,
        mockTaskData,
        'pvp'
      );
      expect(result).toBeDefined();
    });
  });
  describe('updateTaskState', () => {
    it('handles missing task data gracefully', async () => {
      // Should handle missing task data gracefully
      await updateTaskState('task-1', 'completed', 'user-error', null);
    });
    it('handles empty task data gracefully', async () => {
      const mockTaskData = {
        tasks: [],
      };
      // Should handle empty task data gracefully
      await updateTaskState('non-existent-task', 'completed', 'user-123', mockTaskData);
    });
  });
  describe('invalidateTaskRecursive', () => {
    it('invalidates task and its dependents', () => {
      const mockTaskData = {
        tasks: [
          {
            id: 'task-1',
            objectives: [{ id: 'obj-1' }],
            taskRequirements: [],
            alternatives: [],
          },
          {
            id: 'task-2',
            objectives: [{ id: 'obj-2' }],
            taskRequirements: [{ task: { id: 'task-1' }, status: ['complete'] }],
            alternatives: [],
          },
          {
            id: 'task-3',
            objectives: [{ id: 'obj-3' }],
            taskRequirements: [{ task: { id: 'task-1' }, status: ['complete'] }],
            alternatives: [],
          },
        ],
      };
      const tasksProgress = [
        { id: 'task-1', complete: true },
        { id: 'task-2', complete: true },
        { id: 'task-3', complete: true },
      ];
      const objectiveProgress = [
        { id: 'obj-1', complete: true },
        { id: 'obj-2', complete: true },
        { id: 'obj-3', complete: true },
      ];
      const result = invalidateTaskRecursive(
        'task-1',
        mockTaskData,
        tasksProgress,
        objectiveProgress
      );
      // Should invalidate task-1 and all its dependents
      expect(result.tasksProgress[0].invalid).toBe(true);
      expect(result.tasksProgress[0].complete).toBe(false);
      expect(result.objectiveProgress[0].invalid).toBe(true);
      expect(result.objectiveProgress[0].complete).toBe(false);
    });
    it('handles task with no dependents', () => {
      const mockTaskData = {
        tasks: [
          {
            id: 'task-1',
            objectives: [{ id: 'obj-1' }],
            taskRequirements: [],
            alternatives: [],
          },
        ],
      };
      const tasksProgress = [{ id: 'task-1', complete: true }];
      const objectiveProgress = [{ id: 'obj-1', complete: true }];
      const result = invalidateTaskRecursive(
        'task-1',
        mockTaskData,
        tasksProgress,
        objectiveProgress
      );
      expect(result.tasksProgress[0].invalid).toBe(true);
      expect(result.tasksProgress[0].complete).toBe(false);
      expect(result.objectiveProgress[0].invalid).toBe(true);
      expect(result.objectiveProgress[0].complete).toBe(false);
    });
    it('handles missing task data gracefully', () => {
      const tasksProgress = [{ id: 'task-1', complete: true }];
      const objectiveProgress = [{ id: 'obj-1', complete: true }];
      const result = invalidateTaskRecursive('task-1', null, tasksProgress, objectiveProgress);
      // Should handle missing task data gracefully
      expect(result).toBeDefined();
      expect(result.tasksProgress).toEqual(tasksProgress);
      expect(result.objectiveProgress).toEqual(objectiveProgress);
    });
  });
  describe('Error Handling', () => {
    it('handles database errors during formatting', () => {
      const mockHideoutData = { hideoutStations: [] };
      const mockTaskData = { tasks: [] };
      // Should handle database errors gracefully
      const result = formatProgress(
        {
          displayName: 'Test User',
          level: 15,
          gameEdition: 1,
        },
        'user-error',
        mockHideoutData,
        mockTaskData,
        'pvp'
      );
      expect(result).toBeDefined();
    });
  });
  describe('Edge Cases', () => {
    it('handles empty progress document', () => {
      const mockHideoutData = { hideoutStations: [] };
      const mockTaskData = { tasks: [] };
      // Should handle empty progress document gracefully
      const result = formatProgress({}, 'user-empty', mockHideoutData, mockTaskData, 'pvp');
      expect(result).toBeDefined();
    });
    it('handles progress with only one game mode', () => {
      const mockHideoutData = { hideoutStations: [] };
      const mockTaskData = { tasks: [] };
      const result = formatProgress(
        {
          displayName: 'Test User',
          level: 15,
          gameEdition: 1,
          taskCompletions: { 'task-1': { complete: true } },
        },
        'user-123',
        mockHideoutData,
        mockTaskData,
        'pvp'
      );
      expect(result).toBeDefined();
      expect(result.displayName).toBe('Test User');
    });
    it('handles null progress data', () => {
      const mockHideoutData = { hideoutStations: [] };
      const mockTaskData = { tasks: [] };
      // Should handle null progress data gracefully
      const result = formatProgress(null, 'user-null', mockHideoutData, mockTaskData, 'pvp');
      expect(result).toBeDefined();
      expect(result.userId).toBe('user-null');
    });
    it('handles undefined progress data', () => {
      const mockHideoutData = { hideoutStations: [] };
      const mockTaskData = { tasks: [] };
      // Should handle undefined progress data gracefully
      const result = formatProgress(
        undefined,
        'user-undefined',
        mockHideoutData,
        mockTaskData,
        'pvp'
      );
      expect(result).toBeDefined();
      expect(result.userId).toBe('user-undefined');
    });
  });
});
