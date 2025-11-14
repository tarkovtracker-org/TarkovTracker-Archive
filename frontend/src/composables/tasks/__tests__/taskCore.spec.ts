import { describe, it, expect, vi } from 'vitest';
import {
  summarizeSecondaryTaskCounts,
  successorDepth,
  sortVisibleTasks,
  taskUnlockedForCurrentView,
  taskHasIncompleteObjectiveOnMap,
  collectTaskLocationIds,
  resolveObjectiveMapIds,
  filterTasksByPrimaryView,
} from '../taskCore';
import type { Task, TaskObjective } from '@/types/models/tarkov';
describe('taskCore', () => {
  describe('summarizeSecondaryTaskCounts', () => {
    it('returns zero counts for empty entries', () => {
      expect(summarizeSecondaryTaskCounts({})).toEqual({
        available: 0,
        locked: 0,
        completed: 0,
      });
    });
    it('counts tasks in each category', () => {
      const entries = {
        available: [{} as Task, {} as Task],
        locked: [{} as Task],
        completed: [{} as Task, {} as Task, {} as Task],
      };
      expect(summarizeSecondaryTaskCounts(entries)).toEqual({
        available: 2,
        locked: 1,
        completed: 3,
      });
    });
    it('handles missing categories gracefully', () => {
      const entries = {
        available: [{} as Task],
      };
      expect(summarizeSecondaryTaskCounts(entries)).toEqual({
        available: 1,
        locked: 0,
        completed: 0,
      });
    });
    it('handles null/undefined values in arrays', () => {
      const entries = {
        available: undefined,
        locked: null,
        completed: [{} as Task],
      };
      expect(summarizeSecondaryTaskCounts(entries as any)).toEqual({
        available: 0,
        locked: 0,
        completed: 1,
      });
    });
  });
  describe('successorDepth', () => {
    it('returns 1 for task with no successors', () => {
      const task = { id: 'task1', successors: [] } as Task;
      const tasks = [task];
      expect(successorDepth(task, tasks)).toBe(1);
    });
    it('calculates depth for simple successor chain', () => {
      const task1 = { id: 'task1', successors: ['task2'] } as Task;
      const task2 = { id: 'task2', successors: ['task3'] } as Task;
      const task3 = { id: 'task3', successors: [] } as Task;
      const tasks = [task1, task2, task3];
      expect(successorDepth(task1, tasks)).toBe(3);
      expect(successorDepth(task2, tasks)).toBe(2);
      expect(successorDepth(task3, tasks)).toBe(1);
    });
    it('handles circular dependencies gracefully', () => {
      const task1 = { id: 'task1', successors: ['task2'] } as Task;
      const task2 = { id: 'task2', successors: ['task1'] } as Task;
      const tasks = [task1, task2];
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const depth = successorDepth(task1, tasks);
      expect(depth).toBeGreaterThan(0);
      consoleWarnSpy.mockRestore();
    });
    it('memoizes depth calculations', () => {
      const task1 = { id: 'task1', successors: ['task2', 'task3'] } as Task;
      const task2 = { id: 'task2', successors: ['task4'] } as Task;
      const task3 = { id: 'task3', successors: ['task4'] } as Task;
      const task4 = { id: 'task4', successors: [] } as Task;
      const tasks = [task1, task2, task3, task4];

      const depth = successorDepth(task1, tasks);
      expect(depth).toBe(3);
    });
    it('returns 0 for non-existent task', () => {
      const task = { id: 'nonexistent', successors: [] } as Task;
      const tasks = [] as Task[];
      expect(successorDepth(task, tasks)).toBe(0);
    });
    it('handles multiple successor branches correctly', () => {
      const task1 = { id: 'task1', successors: ['task2', 'task3'] } as Task;
      const task2 = { id: 'task2', successors: ['task4'] } as Task;
      const task3 = { id: 'task3', successors: [] } as Task;
      const task4 = { id: 'task4', successors: [] } as Task;
      const tasks = [task1, task2, task3, task4];

      expect(successorDepth(task1, tasks)).toBe(3);
    });
  });
  describe('sortVisibleTasks', () => {
    it('returns tasks unsorted when not in "all" view', () => {
      const tasks = [
        { id: 'task2', name: 'Task 2' } as Task,
        { id: 'task1', name: 'Task 1' } as Task,
      ];
      const result = sortVisibleTasks(tasks, 'user1', tasks);
      expect(result).toEqual(tasks);
    });
    it('sorts by parent-child relationship in "all" view', () => {
      const parent = { id: 'parent', parents: [] } as Task;
      const child = { id: 'child', parents: ['parent'] } as Task;
      const tasks = [child, parent];

      const result = sortVisibleTasks(tasks, 'all', tasks);
      expect(result[0].id).toBe('parent');
      expect(result[1].id).toBe('child');
    });
    it('sorts by successor depth when no parent-child relationship', () => {
      const task1 = { id: 'task1', successors: ['task2'] } as Task;
      const task2 = { id: 'task2', successors: [] } as Task;
      const tasks = [task2, task1];

      const result = sortVisibleTasks(tasks, 'all', tasks);
      expect(result[0].id).toBe('task2');
      expect(result[1].id).toBe('task1');
    });
    it('preserves original array and returns new sorted array', () => {
      const tasks = [
        { id: 'task2', name: 'Task 2' } as Task,
        { id: 'task1', name: 'Task 1' } as Task,
      ];
      const original = [...tasks];
      sortVisibleTasks(tasks, 'all', tasks);
      expect(tasks).toEqual(original);
    });
  });
  describe('taskUnlockedForCurrentView', () => {
    it('checks "all" view using isTaskUnlockedByAny', () => {
      const isTaskUnlockedByAny = vi.fn().mockReturnValue(true);
      const isTaskUnlockedFor = vi.fn();

      const result = taskUnlockedForCurrentView(
        'task1',
        'all',
        isTaskUnlockedByAny,
        isTaskUnlockedFor
      );

      expect(result).toBe(true);
      expect(isTaskUnlockedByAny).toHaveBeenCalledWith('task1');
      expect(isTaskUnlockedFor).not.toHaveBeenCalled();
    });
    it('checks specific user view using isTaskUnlockedFor', () => {
      const isTaskUnlockedByAny = vi.fn();
      const isTaskUnlockedFor = vi.fn().mockReturnValue(true);

      const result = taskUnlockedForCurrentView(
        'task1',
        'user123',
        isTaskUnlockedByAny,
        isTaskUnlockedFor
      );

      expect(result).toBe(true);
      expect(isTaskUnlockedFor).toHaveBeenCalledWith('task1', 'user123');
      expect(isTaskUnlockedByAny).not.toHaveBeenCalled();
    });
  });
  describe('taskHasIncompleteObjectiveOnMap', () => {
    const mockResolveObjectiveMapIds = (_obj: TaskObjective) => ['customs'];
    const mockGetObjectiveCompletionMap = (_id: string) => ({ user1: false });
    it('returns true when objective is incomplete for user', () => {
      const task = {
        objectives: [{ id: 'obj1' }] as TaskObjective[],
      } as Task;

      const result = taskHasIncompleteObjectiveOnMap(
        task,
        ['customs'],
        'user1',
        mockResolveObjectiveMapIds,
        mockGetObjectiveCompletionMap
      );

      expect(result).toBe(true);
    });
    it('returns false when all objectives complete', () => {
      const task = {
        objectives: [{ id: 'obj1' }] as TaskObjective[],
      } as Task;
      const getCompletion = () => ({ user1: true });

      const result = taskHasIncompleteObjectiveOnMap(
        task,
        ['customs'],
        'user1',
        mockResolveObjectiveMapIds,
        getCompletion
      );

      expect(result).toBe(false);
    });
    it('returns true in "all" view when any user has incomplete objective', () => {
      const task = {
        objectives: [{ id: 'obj1' }] as TaskObjective[],
      } as Task;
      const getCompletion = () => ({ user1: true, user2: false });

      const result = taskHasIncompleteObjectiveOnMap(
        task,
        ['customs'],
        'all',
        mockResolveObjectiveMapIds,
        getCompletion
      );

      expect(result).toBe(true);
    });
    it('handles missing completion data gracefully', () => {
      const task = {
        objectives: [{ id: 'obj1' }] as TaskObjective[],
      } as Task;
      const getCompletion = () => undefined;

      const result = taskHasIncompleteObjectiveOnMap(
        task,
        ['customs'],
        'user1',
        mockResolveObjectiveMapIds,
        getCompletion
      );

      expect(result).toBe(true);
    });
    it('skips objectives not on the specified map', () => {
      const task = {
        objectives: [{ id: 'obj1' }] as TaskObjective[],
      } as Task;
      const resolveMapIds = () => ['factory'];

      const result = taskHasIncompleteObjectiveOnMap(
        task,
        ['customs'],
        'user1',
        resolveMapIds,
        mockGetObjectiveCompletionMap
      );

      expect(result).toBe(false);
    });
  });
  describe('collectTaskLocationIds', () => {
    it('returns Set<string> and contains map ids from objective.maps', () => {
      const task = {
        id: 'task1',
        name: 'Test',
        objectives: [
          {
            id: 'obj1',
            type: 'mark',
            maps: [{ id: 'customs', name: 'Customs' }],
          },
        ],
      } as unknown as Task;
      const result = collectTaskLocationIds(task);
      expect(result instanceof Set).toBe(true);
      expect(result.has('customs')).toBe(true);
      expect(result.size).toBe(1);
    });
    it('deduplicates duplicate map ids across multiple objectives', () => {
      const task = {
        id: 'task2',
        name: 'Test',
        objectives: [
          {
            id: 'obj1',
            type: 'visit',
            maps: [{ id: 'customs', name: 'Customs' }],
          },
          {
            id: 'obj2',
            type: 'mark',
            maps: [{ id: 'customs', name: 'Customs' }],
          },
        ],
      } as unknown as Task;
      const result = collectTaskLocationIds(task);
      expect(result.size).toBe(1);
      expect(result.has('customs')).toBe(true);
    });
    it('handles mixed map sources (objective.maps and objective.location)', () => {
      const task = {
        id: 'task3',
        name: 'Test',
        objectives: [
          {
            id: 'obj1',
            type: 'mark',
            maps: [{ id: 'customs', name: 'Customs' }],
            location: { id: 'factory', name: 'Factory' },
          },
        ],
      } as unknown as Task;
      const result = collectTaskLocationIds(task);
      expect(result.has('customs')).toBe(true);
      expect(result.has('factory')).toBe(true);
      expect(result.size).toBe(2);
    });
    it('collects from possibleLocations', () => {
      const task = {
        objectives: [
          {
            id: 'obj1',
            possibleLocations: [{ map: { id: 'customs' } }, { map: { id: 'factory' } }],
          },
        ],
      } as unknown as Task;
      const result = collectTaskLocationIds(task);
      expect(result.has('customs')).toBe(true);
      expect(result.has('factory')).toBe(true);
    });
    it('collects from zones', () => {
      const task = {
        objectives: [
          {
            id: 'obj1',
            zones: [{ map: { id: 'customs' } }, { map: { id: 'shoreline' } }],
          },
        ],
      } as unknown as Task;
      const result = collectTaskLocationIds(task);
      expect(result.has('customs')).toBe(true);
      expect(result.has('shoreline')).toBe(true);
    });
    it('returns empty Set for tasks with no objectives', () => {
      const task = {
        id: 'task4',
        name: 'Test',
        objectives: [],
      } as unknown as Task;
      const result = collectTaskLocationIds(task);
      expect(result.size).toBe(0);
    });
    it('returns empty Set when objectives is undefined', () => {
      const task = {
        id: 'task5',
        name: 'Test',
      } as unknown as Task;
      const result = collectTaskLocationIds(task);
      expect(result.size).toBe(0);
    });
  });
  describe('resolveObjectiveMapIds', () => {
    it('returns array of unique map IDs from objective', () => {
      const objective = {
        id: 'obj1',
        maps: [{ id: 'customs' }, { id: 'factory' }],
        location: { id: 'shoreline' },
      } as unknown as TaskObjective;
      const result = resolveObjectiveMapIds(objective);
      expect(result).toHaveLength(3);
      expect(result).toContain('customs');
      expect(result).toContain('factory');
      expect(result).toContain('shoreline');
    });
    it('returns empty array when no map data present', () => {
      const objective = { id: 'obj1' } as TaskObjective;
      const result = resolveObjectiveMapIds(objective);
      expect(result).toEqual([]);
    });
  });
  describe('filterTasksByPrimaryView', () => {
    const maps = [
      { id: 'customs', name: 'Customs' },
      { id: 'factory', name: 'Factory' },
    ];
    const mockCollectTaskLocationIds = (_task: Task) => new Set(['customs']);
    it('returns all tasks when not in maps view', () => {
      const tasks = [{ id: 'task1' } as Task, { id: 'task2' } as Task];

      const result = filterTasksByPrimaryView(
        tasks,
        'all',
        'all',
        maps,
        mockCollectTaskLocationIds,
        'all'
      );

      expect(result).toHaveLength(2);
    });
    it('filters by map when in maps view', () => {
      const tasks = [{ id: 'task1' } as Task, { id: 'task2' } as Task];
      const collectIds = (task: Task) =>
        task.id === 'task1' ? new Set(['customs']) : new Set(['factory']);

      const result = filterTasksByPrimaryView(tasks, 'maps', 'customs', maps, collectIds, 'all');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task1');
    });
    it('filters by trader when trader filter is active', () => {
      const tasks = [
        { id: 'task1', trader: { id: 'prapor' } } as Task,
        { id: 'task2', trader: { id: 'therapist' } } as Task,
      ];

      const result = filterTasksByPrimaryView(
        tasks,
        'all',
        'all',
        maps,
        mockCollectTaskLocationIds,
        'prapor'
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task1');
    });
    it('handles non-array input gracefully', () => {
      const result = filterTasksByPrimaryView(
        null as any,
        'all',
        'all',
        maps,
        mockCollectTaskLocationIds,
        'all'
      );

      expect(result).toEqual([]);
    });
  });
});
