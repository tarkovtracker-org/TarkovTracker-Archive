import { describe, it, expect } from 'vitest';
import { createPinia, setActivePinia, defineStore } from 'pinia';
import { ref } from 'vue';

type TeamStores = Record<
  string,
  { getObjectiveCount: () => number; getHideoutPartCount: () => number }
>;

type CompletionMap = Record<string, Record<string, boolean>>;

const initialTeamStores: TeamStores = {
  alpha: {
    getObjectiveCount: () => 2,
    getHideoutPartCount: () => 1,
  },
  beta: {
    getObjectiveCount: () => 0,
    getHideoutPartCount: () => 0,
  },
};

const initialUnlockedTasks: CompletionMap = {
  taskA: { alpha: true, beta: false },
  taskB: { alpha: false, beta: false },
};

const initialTaskCompletions: CompletionMap = {
  taskA: { alpha: true, beta: false },
  taskB: { alpha: false, beta: true },
};

const initialObjectiveCompletions: CompletionMap = {
  obj1: { alpha: false, beta: true },
};

const initialModuleCompletions: CompletionMap = {
  mod1: { alpha: false },
};

const initialModulePartCompletions: CompletionMap = {
  part1: { alpha: false },
};

const initialHideoutLevels: Record<string, Record<string, number>> = {
  station1: { alpha: 2 },
};

const initialPlayerFaction: Record<string, string> = {
  alpha: 'USEC',
  beta: 'BEAR',
};

// Create pinia instance before defining the store
setActivePinia(createPinia());

const useMockProgressStore = defineStore('progress', () => {
  const visibleTeamStores = ref(initialTeamStores);
  const unlockedTasks = ref(initialUnlockedTasks);
  const tasksCompletions = ref(initialTaskCompletions);
  const objectiveCompletions = ref(initialObjectiveCompletions);
  const moduleCompletions = ref(initialModuleCompletions);
  const modulePartCompletions = ref(initialModulePartCompletions);
  const hideoutLevels = ref(initialHideoutLevels);
  const playerFaction = ref(initialPlayerFaction);
  const traderLevelsAchieved = ref({});
  const traderStandings = ref({});
  const gameEditionData = ref([{ version: 1, defaultStashLevel: 2 }]);

  const getDisplayName = (teamId: string) => `Name-${teamId}`;
  const getLevel = () => 15;
  const getFaction = (teamId: string) => {
    const factions = playerFaction.value;
    return factions[teamId] || (teamId === 'alpha' ? 'USEC' : 'BEAR');
  };

  return {
    visibleTeamStores,
    unlockedTasks,
    tasksCompletions,
    objectiveCompletions,
    moduleCompletions,
    modulePartCompletions,
    hideoutLevels,
    playerFaction,
    traderLevelsAchieved,
    traderStandings,
    gameEditionData,
    getDisplayName,
    getLevel,
    getFaction,
  };
});

// Create singleton instance
const mockProgressStoreInstance = useMockProgressStore();

vi.mock('@/stores/progress', () => ({
  useProgressStore: () => mockProgressStoreInstance,
}));

import { useProgressQueries } from '../useProgressQueries';

describe('useProgressQueries', () => {
  it('exposes team visibility and completion helpers', () => {
    const {
      visibleTeamIds,
      isTaskUnlockedFor,
      isTaskUnlockedByAny,
      isTaskCompletedFor,
      isObjectiveIncompleteFor,
      getUnlockedMap,
      getTaskCompletionMap,
      getObjectiveCompletionMap,
      getHideoutLevelFor,
      isModuleCompleteFor,
      getModuleCompletionMap,
      getModulePartCompletionMap,
    } = useProgressQueries();

    expect(visibleTeamIds.value).toEqual(['alpha', 'beta']);
    expect(isTaskUnlockedFor('taskA', 'alpha')).toBe(true);
    expect(isTaskUnlockedByAny('taskA')).toBe(true);
    expect(isTaskCompletedFor('taskB', 'beta')).toBe(true);
    expect(isObjectiveIncompleteFor('obj1', 'alpha')).toBe(true);
    expect(getUnlockedMap('taskA')).toEqual({ alpha: true, beta: false });
    expect(getTaskCompletionMap('taskB')).toEqual({ alpha: false, beta: true });
    expect(getObjectiveCompletionMap('obj1')).toEqual({ alpha: false, beta: true });
    expect(getHideoutLevelFor('station1', 'alpha')).toBe(2);
    expect(isModuleCompleteFor('mod1', 'alpha')).toBe(false);
    expect(getModuleCompletionMap('mod1')).toEqual({ alpha: false });
    expect(getModulePartCompletionMap('part1')).toEqual({ alpha: false });
  });

  it('handles missing/undefined data gracefully', () => {
    // This test focuses on the composable behavior with empty/partial data

    // Clear all data to test empty state
    mockProgressStoreInstance.visibleTeamStores.value = {};
    mockProgressStoreInstance.unlockedTasks.value = {};
    mockProgressStoreInstance.tasksCompletions.value = {};
    mockProgressStoreInstance.objectiveCompletions.value = {};
    mockProgressStoreInstance.moduleCompletions.value = {};
    mockProgressStoreInstance.modulePartCompletions.value = {};
    mockProgressStoreInstance.hideoutLevels.value = {};
    mockProgressStoreInstance.playerFaction.value = {};
    mockProgressStoreInstance.traderLevelsAchieved.value = {};
    mockProgressStoreInstance.traderStandings.value = {};
    mockProgressStoreInstance.gameEditionData.value = [];

    const {
      visibleTeamIds,
      isTaskUnlockedFor,
      isTaskUnlockedByAny,
      getUnlockedMap,
      getTaskCompletionMap,
    } = useProgressQueries();

    // Should handle empty data without errors
    expect(visibleTeamIds.value).toEqual([]);
    expect(isTaskUnlockedFor('nonexistent', 'team')).toBe(false);
    expect(isTaskUnlockedByAny('nonexistent')).toBe(false);
    expect(getUnlockedMap('nonexistent')).toEqual({});
    expect(getTaskCompletionMap('nonexistent')).toEqual({});

    // Restore initial data for subsequent tests
    mockProgressStoreInstance.visibleTeamStores.value = initialTeamStores;
    mockProgressStoreInstance.unlockedTasks.value = initialUnlockedTasks;
    mockProgressStoreInstance.tasksCompletions.value = initialTaskCompletions;
    mockProgressStoreInstance.objectiveCompletions.value = initialObjectiveCompletions;
    mockProgressStoreInstance.moduleCompletions.value = initialModuleCompletions;
    mockProgressStoreInstance.modulePartCompletions.value = initialModulePartCompletions;
    mockProgressStoreInstance.hideoutLevels.value = initialHideoutLevels;
    mockProgressStoreInstance.playerFaction.value = initialPlayerFaction;
    mockProgressStoreInstance.traderLevelsAchieved.value = {};
    mockProgressStoreInstance.traderStandings.value = {};
    mockProgressStoreInstance.gameEditionData.value = [{ version: 1, defaultStashLevel: 2 }];
  });

  it('handles team data with mixed completion states', () => {
    // Set up complex completion scenario according to current unlock logic
    mockProgressStoreInstance.unlockedTasks.value = {
      complexTask: {
        alpha: true,
        beta: false,
        gamma: true,
        delta: false,
      } as any,
    };

    mockProgressStoreInstance.tasksCompletions.value = {
      complexTask: {
        alpha: true,
        beta: false,
        gamma: true,
        delta: false,
      } as any,
    };

    const { isTaskUnlockedFor, isTaskCompletedFor, isTaskUnlockedByAny } = useProgressQueries();

    // Test individual team states according to fixture logic
    expect(isTaskUnlockedFor('complexTask', 'alpha')).toBe(true);
    expect(isTaskUnlockedFor('complexTask', 'beta')).toBe(false);
    expect(isTaskUnlockedFor('complexTask', 'gamma')).toBe(true);
    expect(isTaskUnlockedFor('complexTask', 'delta')).toBe(false);

    // Test completion states
    expect(isTaskCompletedFor('complexTask', 'alpha')).toBe(true);
    expect(isTaskCompletedFor('complexTask', 'beta')).toBe(false);

    // Test unlocked by any (should be true if at least one team has it unlocked)
    expect(isTaskUnlockedByAny('complexTask')).toBe(true);

    // Test with completely locked task
    mockProgressStoreInstance.unlockedTasks.value['lockedTask'] = {
      alpha: false,
      beta: false,
      gamma: false,
    } as any;
    expect(isTaskUnlockedByAny('lockedTask')).toBe(false);

    // Restore initial data
    mockProgressStoreInstance.unlockedTasks.value = initialUnlockedTasks;
    mockProgressStoreInstance.tasksCompletions.value = initialTaskCompletions;
  });

  it('handles empty and undefined team stores', () => {
    // Test with completely empty team stores
    mockProgressStoreInstance.visibleTeamStores.value = {} as any;

    const { visibleTeamIds } = useProgressQueries();

    // Should handle empty data without errors
    expect(visibleTeamIds.value).toEqual([]);

    // Restore initial data
    mockProgressStoreInstance.visibleTeamStores.value = initialTeamStores;
  });

  it('handles missing hideout level data', () => {
    // Clear hideout level data
    mockProgressStoreInstance.hideoutLevels.value = {} as any;

    const { getHideoutLevelFor } = useProgressQueries();

    // Should return 0 for missing station/team combinations
    expect(getHideoutLevelFor('missingStation', 'alpha')).toBe(0);
    expect(getHideoutLevelFor('station1', 'missingTeam')).toBe(0);

    // Restore initial data
    mockProgressStoreInstance.hideoutLevels.value = initialHideoutLevels;
  });

  it('handles missing module completion data', () => {
    // Clear module completion data
    mockProgressStoreInstance.moduleCompletions.value = {} as any;
    mockProgressStoreInstance.modulePartCompletions.value = {} as any;

    const { isModuleCompleteFor, getModuleCompletionMap, getModulePartCompletionMap } =
      useProgressQueries();

    // Should handle missing data gracefully
    expect(isModuleCompleteFor('missingModule', 'alpha')).toBe(false);
    expect(getModuleCompletionMap('missingModule')).toEqual({});
    expect(getModulePartCompletionMap('missingPart')).toEqual({});

    // Restore initial data
    mockProgressStoreInstance.moduleCompletions.value = initialModuleCompletions;
    mockProgressStoreInstance.modulePartCompletions.value = initialModulePartCompletions;
  });

  it('handles player faction and display name retrieval', () => {
    // Update faction data to produce explicit factions for alpha and gamma
    mockProgressStoreInstance.playerFaction.value = {
      alpha: 'USEC',
      beta: 'BEAR',
      gamma: 'USEC',
    } as any;

    const { getFaction, getDisplayName, getLevel } = useProgressQueries();

    // Test faction retrieval with fixture data
    expect(getFaction('alpha')).toBe('USEC'); // when fixture sets it
    expect(getFaction('beta')).toBe('BEAR'); // default or fixture
    expect(getFaction('gamma')).toBe('USEC'); // when fixture sets it
    expect(getFaction('nonexistent')).toBe('BEAR'); // fallback to BEAR for missing

    // Test display name retrieval
    expect(getDisplayName('alpha')).toBe('Name-alpha');
    expect(getDisplayName('beta')).toBe('Name-beta');

    // Test level retrieval
    expect(getLevel('alpha')).toBe(15); // mock returns constant 15

    // Restore initial data
    mockProgressStoreInstance.playerFaction.value = initialPlayerFaction;
  });

  it('handles trader level and standing data', () => {
    // Set up trader data
    mockProgressStoreInstance.traderLevelsAchieved.value = {
      alpha: { prapor: 2, therapist: 3 },
      beta: { prapor: 1 },
    };

    mockProgressStoreInstance.traderStandings.value = {
      alpha: { prapor: 0.85, therapist: 0.92 },
    };

    // These are exposed in the composable
    const { traderLevelsAchieved, traderStandings } = useProgressQueries();

    // Unwrap nested refs consistently
    expect(
      (traderLevelsAchieved as any).value?.value ?? (traderLevelsAchieved as any).value
    ).toEqual({
      alpha: { prapor: 2, therapist: 3 },
      beta: { prapor: 1 },
    });

    expect((traderStandings as any).value?.value ?? (traderStandings as any).value).toEqual({
      alpha: { prapor: 0.85, therapist: 0.92 },
    });

    // Restore initial data
    mockProgressStoreInstance.traderLevelsAchieved.value = {};
    mockProgressStoreInstance.traderStandings.value = {};
  });

  it('handles game edition data correctly', () => {
    // Test with game edition data
    const { gameEditionData } = useProgressQueries();

    // Compare plain objects/arrays by unwrapping proxies
    expect(JSON.parse(JSON.stringify(gameEditionData.value))).toEqual([
      { version: 1, defaultStashLevel: 2 },
    ]);

    // Note: gameEditionData is readonly from the store, so we test the current behavior
    // The value is populated from the store's game edition configuration
    expect(gameEditionData.value.length).toBeGreaterThan(0);
  });
});
