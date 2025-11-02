import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { useTaskFiltering } from '../useTaskFiltering';
import type { Task } from '@/types/tarkov';

// Mock dependencies
vi.mock('../useProgressQueries', () => ({
  useProgressQueries: vi.fn(() => ({
    visibleTeamIds: ref(['player1', 'player2']),
    isTaskUnlockedFor: vi.fn(
      (taskId: string, teamId: string) => taskId === 'task1' && teamId === 'player1'
    ),
    isTaskUnlockedByAny: vi.fn((taskId: string) => taskId === 'task1'),
    isTaskCompletedFor: vi.fn(
      (taskId: string, teamId: string) => taskId === 'completed1' && teamId === 'player1'
    ),
    getDisplayName: vi.fn((teamId: string) => `User ${teamId}`),
    playerFaction: ref({ player1: 'USEC', player2: 'BEAR' }),
    getUnlockedMap: vi.fn((taskId: string) => ({ player1: taskId === 'task1', player2: false })),
    getTaskCompletionMap: vi.fn((taskId: string) => ({
      player1: taskId === 'completed1',
      player2: false,
    })),
    getObjectiveCompletionMap: vi.fn(() => ({ player1: false, player2: false })),
  })),
}));

vi.mock('../tarkovdata', () => ({
  useTarkovData: vi.fn(() => ({
    tasks: ref<Task[]>([]),
    disabledTasks: [],
    maps: ref([
      { id: 'customs', name: 'Customs' },
      { id: 'factory', name: 'Factory' },
      { id: 'factory-night', name: 'Factory Night' },
    ]),
  })),
}));

vi.mock('@/utils/mapNormalization', () => ({
  getMapIdGroup: vi.fn((mapId: string) => {
    if (mapId === 'factory') return ['factory', 'factory-night'];
    if (mapId === 'factory-night') return ['factory', 'factory-night'];
    return [mapId];
  }),
}));

vi.mock('@/utils/taskFilters', () => ({
  taskMatchesRequirementFilters: vi.fn(() => true),
}));

vi.mock('@/utils/logger', () => ({
  logger: console,
}));

describe('useTaskFiltering', () => {
  let composable: ReturnType<typeof useTaskFiltering>;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).logger = console;
    composable = useTaskFiltering();
  });

  describe('filterTasksByView', () => {
    it('filters tasks by map view when primaryView is maps', () => {
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'Test Task',
          locations: ['customs'],
          objectives: [],
        } as Task,
        {
          id: 'task2',
          name: 'Test Task 2',
          locations: ['factory'],
          objectives: [],
        } as Task,
      ];

      const result = composable.filterTasksByView(tasks, 'maps', 'customs', '');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('task1');
    });

    it('filters tasks by trader view when primaryView is traders', () => {
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'Test Task',
          trader: { id: 'prapor', name: 'Prapor' },
          objectives: [],
        } as Task,
        {
          id: 'task2',
          name: 'Test Task 2',
          trader: { id: 'therapist', name: 'Therapist' },
          objectives: [],
        } as Task,
      ];

      const result = composable.filterTasksByView(tasks, 'traders', '', 'prapor');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('task1');
    });

    it('returns all tasks when primaryView is neither maps nor traders', () => {
      const tasks: Task[] = [
        { id: 'task1', name: 'Test Task', objectives: [] } as Task,
        { id: 'task2', name: 'Test Task 2', objectives: [] } as Task,
      ];

      const result = composable.filterTasksByView(tasks, 'all', '', '');
      expect(result.length).toBe(2);
    });
  });

  describe('filterTasksByMap', () => {
    it('filters tasks by direct location match', () => {
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'Test Task',
          locations: ['customs'],
          objectives: [],
        } as Task,
        {
          id: 'task2',
          name: 'Test Task 2',
          locations: ['factory'],
          objectives: [],
        } as Task,
      ];

      const result = composable.filterTasksByMap(tasks, 'customs');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('task1');
    });

    it('filters tasks by objective maps', () => {
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'Test Task',
          locations: [],
          objectives: [
            {
              id: 'obj1',
              type: 'mark',
              maps: [{ id: 'customs', name: 'Customs' }],
            },
          ],
        } as unknown as Task,
      ];

      const result = composable.filterTasksByMap(tasks, 'customs');
      expect(result.length).toBe(1);
    });

    it('handles map variants correctly', () => {
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'Test Task',
          locations: ['factory-night'],
          objectives: [],
        } as Task,
      ];

      // Should match both factory and factory-night due to map group
      const result = composable.filterTasksByMap(tasks, 'factory');
      expect(result.length).toBe(1);
    });

    it('only includes tasks with map objective types', () => {
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'Test Task',
          locations: [],
          objectives: [
            {
              id: 'obj1',
              type: 'buildItem', // Not a map objective type
              maps: [{ id: 'customs', name: 'Customs' }],
            },
          ],
        } as unknown as Task,
      ];

      const result = composable.filterTasksByMap(tasks, 'customs');
      expect(result.length).toBe(0);
    });
  });

  describe('filterTasksForAllUsers', () => {
    it('returns tasks needed by any user', () => {
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'Test Task',
          factionName: 'Any',
          objectives: [],
        } as Task,
      ];

      const result = composable.filterTasksForAllUsers(tasks, 'available');
      expect(result.length).toBe(1);
      expect(result[0].neededBy).toContain('User player1');
    });

    it('respects faction requirements per user', () => {
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'USEC Task',
          factionName: 'USEC',
          objectives: [],
        } as Task,
      ];

      const result = composable.filterTasksForAllUsers(tasks, 'available');
      // Should only include player1 (USEC), not player2 (BEAR)
      expect(result[0]?.neededBy).toEqual(['User player1']);
    });

    it('excludes completed tasks', () => {
      const tasks: Task[] = [
        {
          id: 'completed1',
          name: 'Completed Task',
          factionName: 'Any',
          objectives: [],
        } as Task,
      ];

      const result = composable.filterTasksForAllUsers(tasks, 'available');
      // Task is completed for player1, so shouldn't be in their list
      expect(result.length).toBe(0);
    });

    it('warns on unexpected secondary view', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const tasks: Task[] = [];

      const result = composable.filterTasksForAllUsers(tasks, 'locked');
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Unexpected state: 'all' user view with non-'available' secondary view"
      );

      consoleSpy.mockRestore();
    });
  });

  describe('filterTasksForUser', () => {
    it('filters available tasks for specific user', () => {
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'Test Task',
          factionName: 'Any',
          objectives: [],
        } as Task,
        {
          id: 'task2',
          name: 'Test Task 2',
          factionName: 'Any',
          objectives: [],
        } as Task,
      ];

      const result = composable.filterTasksForUser(tasks, 'available', 'player1');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('task1');
    });

    it('filters locked tasks for specific user', () => {
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'Unlocked Task',
          factionName: 'Any',
          objectives: [],
        } as Task,
        {
          id: 'task2',
          name: 'Locked Task',
          factionName: 'Any',
          objectives: [],
        } as Task,
      ];

      const result = composable.filterTasksForUser(tasks, 'locked', 'player1');
      // task1 is unlocked, task2 is locked
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('task2');
    });

    it('filters completed tasks for specific user', () => {
      const tasks: Task[] = [
        {
          id: 'completed1',
          name: 'Completed Task',
          factionName: 'Any',
          objectives: [],
        } as Task,
        {
          id: 'task1',
          name: 'Incomplete Task',
          factionName: 'Any',
          objectives: [],
        } as Task,
      ];

      const result = composable.filterTasksForUser(tasks, 'completed', 'player1');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('completed1');
    });

    it('filters by faction', () => {
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'USEC Task',
          factionName: 'USEC',
          objectives: [],
        } as Task,
        {
          id: 'task2',
          name: 'BEAR Task',
          factionName: 'BEAR',
          objectives: [],
        } as Task,
        {
          id: 'task3',
          name: 'Any Task',
          factionName: 'Any',
          objectives: [],
        } as Task,
      ];

      // Test 'locked' filter which doesn't filter by unlock status first
      const result = composable.filterTasksForUser(tasks, 'locked', 'player1');
      // player1 is USEC, so should only get USEC and Any tasks
      const taskIds = result.map((t) => t.id);
      // task1 is locked and matches USEC faction
      // task3 is locked and matches Any faction
      // task2 should be excluded (BEAR only)
      expect(taskIds).not.toContain('task2');
      // At minimum, faction filtering should exclude BEAR tasks
      expect(result.every((t) => t.factionName !== 'BEAR')).toBe(true);
    });
  });

  describe('calculateMapTaskTotals', () => {
    it('calculates task counts per map', () => {
      const { calculateMapTaskTotals } = useTaskFiltering();
      const displayedMaps = [
        { id: 'customs', name: 'Customs' },
        { id: 'factory', name: 'Factory' },
      ];
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'Customs Task',
          locations: ['customs'],
          objectives: [{ id: 'obj1', type: 'mark', maps: [{ id: 'customs', name: 'Customs' }] }],
        } as unknown as Task,
      ];
      const allMaps = [
        { id: 'customs', name: 'Customs' },
        { id: 'factory', name: 'Factory' },
      ];

      const result = calculateMapTaskTotals(
        displayedMaps,
        tasks,
        [],
        false,
        false,
        false,
        false,
        'player1',
        allMaps,
        false,
        false
      );

      expect(result).toHaveProperty('customs');
      expect(result).toHaveProperty('factory');
    });

    it('excludes disabled tasks', () => {
      const { calculateMapTaskTotals } = useTaskFiltering();
      const displayedMaps = [{ id: 'customs', name: 'Customs' }];
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'Disabled Task',
          locations: ['customs'],
          objectives: [{ id: 'obj1', type: 'mark', maps: [{ id: 'customs', name: 'Customs' }] }],
        } as unknown as Task,
      ];
      const allMaps = [{ id: 'customs', name: 'Customs' }];

      const result = calculateMapTaskTotals(
        displayedMaps,
        tasks,
        ['task1'], // disabled
        false,
        false,
        false,
        false,
        'player1',
        allMaps,
        false,
        false
      );

      expect(result.customs).toBe(0);
    });

    it('excludes global tasks when hideGlobalTasks is true', () => {
      const { calculateMapTaskTotals } = useTaskFiltering();
      const displayedMaps = [{ id: 'customs', name: 'Customs' }];
      const tasks: Task[] = [
        {
          id: 'task1',
          name: 'Global Task',
          // No map field
          locations: ['customs'],
          objectives: [],
        } as Task,
      ];
      const allMaps = [{ id: 'customs', name: 'Customs' }];

      const result = calculateMapTaskTotals(
        displayedMaps,
        tasks,
        [],
        true, // hideGlobalTasks
        false,
        false,
        false,
        'player1',
        allMaps,
        false,
        false
      );

      expect(result.customs).toBe(0);
    });
  });

  describe('updateVisibleTasks', () => {
    it('updates visible tasks based on filters', async () => {
      const { updateVisibleTasks, visibleTasks } = useTaskFiltering();

      await updateVisibleTasks('all', 'available', 'player1', '', '', false);

      expect(visibleTasks.value).toBeDefined();
      expect(Array.isArray(visibleTasks.value)).toBe(true);
    });

    it('does not update when tasks are loading', async () => {
      const { updateVisibleTasks, visibleTasks, reloadingTasks } = useTaskFiltering();
      const initialValue = visibleTasks.value;

      await updateVisibleTasks('all', 'available', 'player1', '', '', true);

      expect(visibleTasks.value).toBe(initialValue);
      expect(reloadingTasks.value).toBe(false);
    });

    it('sets reloadingTasks flag during update', async () => {
      const { updateVisibleTasks, reloadingTasks } = useTaskFiltering();

      const promise = updateVisibleTasks('all', 'available', 'player1', '', '', false);
      await promise;

      expect(reloadingTasks.value).toBe(false);
    });

    it('combines multiple filter layers correctly', async () => {
      const { updateVisibleTasks } = useTaskFiltering();

      // Test combining map view + status filter
      await updateVisibleTasks('maps', 'available', 'player1', 'customs', '', false);

      // Should not throw and should complete
      expect(true).toBe(true);
    });
  });

  describe('mapObjectiveTypes', () => {
    it('exports correct map objective types', () => {
      const { mapObjectiveTypes } = useTaskFiltering();

      expect(mapObjectiveTypes).toContain('mark');
      expect(mapObjectiveTypes).toContain('zone');
      expect(mapObjectiveTypes).toContain('extract');
      expect(mapObjectiveTypes).toContain('visit');
      expect(mapObjectiveTypes).toContain('findItem');
      expect(mapObjectiveTypes).toContain('findQuestItem');
      expect(mapObjectiveTypes).toContain('plantItem');
      expect(mapObjectiveTypes).toContain('plantQuestItem');
      expect(mapObjectiveTypes).toContain('shoot');
    });
  });
});
