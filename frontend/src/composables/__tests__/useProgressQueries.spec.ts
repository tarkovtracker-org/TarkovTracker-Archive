import { describe, it, expect, beforeAll } from 'vitest';
import { createPinia, setActivePinia, defineStore } from 'pinia';
import { ref } from 'vue';

type TeamStores = Record<string, { getObjectiveCount: () => number; getHideoutPartCount: () => number }>;

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
  const getFaction = (teamId: string) => (teamId === 'alpha' ? 'USEC' : 'BEAR');

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

vi.mock('@/stores/progress', () => ({
  useProgressStore: () => useMockProgressStore(),
}));

import { useProgressQueries } from '../useProgressQueries';

describe('useProgressQueries', () => {
  beforeAll(() => {
    setActivePinia(createPinia());
  });

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
});
