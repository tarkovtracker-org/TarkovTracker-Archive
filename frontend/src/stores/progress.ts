import { computed } from 'vue';
import { defineStore } from 'pinia';
import { fireuser } from '@/plugins/firebase';
import { useTarkovStore } from '@/stores/tarkov';
import { useUserStore } from '@/stores/user';
import { useTeammateStores } from './useTeamStore';
import type { Task } from '@/composables/tarkovdata';
import { tasks, traders, objectives, hideoutStations } from '@/composables/tarkovdata';
import type { Store } from 'pinia';
import type { UserState } from '@/shared_state';
export const STASH_STATION_ID = '5d484fc0654e76006657e0ab';
export const CULTIST_CIRCLE_STATION_ID = '667298e75ea6b4493c08f266';
interface GameEdition {
  version: number;
  value: number;
  defaultStashLevel: number;
}
const gameEditions: GameEdition[] = [
  { version: 1, value: 0.0, defaultStashLevel: 1 },
  { version: 2, value: 0.0, defaultStashLevel: 2 },
  { version: 3, value: 0.2, defaultStashLevel: 3 },
  { version: 4, value: 0.2, defaultStashLevel: 4 },
  { version: 5, value: 0.2, defaultStashLevel: 5 },
  { version: 6, value: 0.2, defaultStashLevel: 5 },
];
type TeamStoresMap = Record<string, Store<string, UserState>>;
type CompletionsMap = Record<string, Record<string, boolean>>;
type TraderLevelsMap = Record<string, Record<string, number>>;
type FactionMap = Record<string, string>;
type TaskAvailabilityMap = Record<string, Record<string, boolean>>;
type ObjectiveCompletionsMap = Record<string, Record<string, boolean>>;
type HideoutLevelMap = Record<string, Record<string, number>>;
/*
type ProgressGetters = {
  teamStores: TeamStoresMap;
  visibleTeamStores: TeamStoresMap;
  tasksCompletions: CompletionsMap;
  gameEditionData: GameEdition[];
  traderLevelsAchieved: TraderLevelsMap;
  playerFaction: FactionMap;
  unlockedTasks: TaskAvailabilityMap;
  objectiveCompletions: ObjectiveCompletionsMap;
  hideoutLevels: HideoutLevelMap;
  getTeamIndex: (teamId: string) => number;
  getDisplayName: (teamId: string) => string;
  getLevel: (teamId: string) => number;
  getFaction: (teamId: string) => string;
};
*/
// Define the Fireswap configuration type expected by the plugin
interface FireswapConfig {
  path: string;
  document: string;
  debouncems: number;
  localKey: string;
}
export const useProgressStore = defineStore(
  'progress',
  () => {
    const userStore = useUserStore();
    const { teammateStores } = useTeammateStores();

    const teamStores = computed(() => {
      const stores: TeamStoresMap = {};
      stores['self'] = useTarkovStore() as Store<string, UserState>;

      for (const teammate of Object.keys(teammateStores.value)) {
        if (teammateStores.value[teammate]) {
          stores[teammate] = teammateStores.value[teammate];
        }
      }

      return stores;
    });
    const visibleTeamStores = computed(() => {
      const visibleStores: TeamStoresMap = {};
      Object.entries(teamStores.value).forEach(([teamId, store]) => {
        if (!userStore.teamIsHidden(teamId)) {
          visibleStores[teamId] = store;
        }
      });
      return visibleStores;
    });
    const tasksCompletions = computed(() => {
      const completions: CompletionsMap = {};
      if (!tasks.value || !visibleTeamStores.value) return {};
      for (const task of tasks.value as Task[]) {
        completions[task.id] = {};
        for (const teamId of Object.keys(visibleTeamStores.value)) {
          const store = visibleTeamStores.value[teamId];
          // Get current gamemode data, with fallback to legacy structure
          const currentGameMode = store?.$state.currentGameMode || 'pvp';
          const currentData = store?.$state[currentGameMode] || store?.$state;
          completions[task.id][teamId] = currentData?.taskCompletions?.[task.id]?.complete ?? false;
        }
      }
      return completions;
    });
    const gameEditionData = computed(() => gameEditions);
    const traderLevelsAchieved = computed(() => {
      const levels: TraderLevelsMap = {};
      if (!traders.value || !visibleTeamStores.value) return {};
      for (const teamId of Object.keys(visibleTeamStores.value)) {
        levels[teamId] = {};
        const store = visibleTeamStores.value[teamId];
        for (const trader of traders.value) {
          const currentGameMode = store?.$state.currentGameMode || 'pvp';
          const currentData = store?.$state[currentGameMode] || store?.$state;
          levels[teamId][trader.id] = (currentData as UserProgressData)?.level ?? 0;
        }
      }
      return levels;
    });
    const playerFaction = computed(() => {
      const faction: FactionMap = {};
      if (!visibleTeamStores.value) return {};
      for (const teamId of Object.keys(visibleTeamStores.value)) {
        const store = visibleTeamStores.value[teamId];
        // Get current gamemode data, with fallback to legacy structure
        const currentGameMode = store?.$state.currentGameMode || 'pvp';
        const currentData = store?.$state[currentGameMode] || store?.$state;
        faction[teamId] = currentData?.pmcFaction ?? 'Unknown';
      }
      return faction;
    });
    const unlockedTasks = computed(() => {
      const available: TaskAvailabilityMap = {};
      if (!tasks.value || !visibleTeamStores.value) return {};
      for (const task of tasks.value as Task[]) {
        available[task.id] = {};
        for (const teamId of Object.keys(visibleTeamStores.value)) {
          const store = visibleTeamStores.value[teamId];
          // Get current gamemode data, with fallback to legacy structure
          const currentGameMode = store?.$state.currentGameMode || 'pvp';
          const currentData = store?.$state[currentGameMode] || store?.$state;
          const playerLevel = currentData?.level ?? 0;
          const currentPlayerFaction = playerFaction.value[teamId];
          const isTaskComplete = tasksCompletions.value[task.id]?.[teamId] ?? false;
          if (isTaskComplete) {
            available[task.id][teamId] = false;
            continue;
          }
          let failedReqsMet = true;
          if (task.failedRequirements) {
            for (const req of task.failedRequirements) {
              const failed = currentData?.taskCompletions?.[req.task.id]?.failed ?? false;
              if (failed) {
                failedReqsMet = false;
                break;
              }
            }
          }
          if (!failedReqsMet) {
            available[task.id][teamId] = false;
            continue;
          }
          if (task.minPlayerLevel && playerLevel < task.minPlayerLevel) {
            available[task.id][teamId] = false;
            continue;
          }
          let traderLevelsMet = true;
          if (task.traderLevelRequirements) {
            for (const req of task.traderLevelRequirements) {
              const currentTraderLevel = traderLevelsAchieved.value[teamId]?.[req.trader.id] ?? 0;
              if (currentTraderLevel < req.level) {
                traderLevelsMet = false;
                break;
              }
            }
          }
          if (!traderLevelsMet) {
            available[task.id][teamId] = false;
            continue;
          }
          let prereqsMet = true;
          if (task.taskRequirements) {
            for (const req of task.taskRequirements) {
              const isPrereqComplete = tasksCompletions.value[req.task.id]?.[teamId] ?? false;
              if (!isPrereqComplete) {
                prereqsMet = false;
                break;
              }
            }
          }
          if (!prereqsMet) {
            available[task.id][teamId] = false;
            continue;
          }
          if (
            task.factionName &&
            task.factionName !== 'Any' &&
            task.factionName !== currentPlayerFaction
          ) {
            available[task.id][teamId] = false;
            continue;
          }
          available[task.id][teamId] = true;
        }
      }
      return available;
    });
    const objectiveCompletions = computed(() => {
      const completions: ObjectiveCompletionsMap = {};
      if (!objectives.value || !visibleTeamStores.value) return {};
      for (const objective of objectives.value) {
        completions[objective.id] = {};
        for (const teamId of Object.keys(visibleTeamStores.value)) {
          const store = visibleTeamStores.value[teamId];
          // Get current gamemode data, with fallback to legacy structure
          const currentGameMode = store?.$state.currentGameMode || 'pvp';
          const currentData = store?.$state[currentGameMode] || store?.$state;
          completions[objective.id][teamId] =
            currentData?.taskObjectives?.[objective.id]?.complete ?? false;
        }
      }
      return completions;
    });
    const hideoutLevels = computed(() => {
      const levels: HideoutLevelMap = {};
      if (!hideoutStations.value || !visibleTeamStores.value) return {};
      for (const station of hideoutStations.value) {
        if (!station || !station.id) continue;
        levels[station.id] = {};
        for (const teamId of Object.keys(visibleTeamStores.value)) {
          const store = visibleTeamStores.value[teamId];
          // Get current gamemode data, with fallback to legacy structure
          const currentGameMode = store?.$state.currentGameMode || 'pvp';
          const currentData = store?.$state[currentGameMode] || store?.$state;
          const modulesState = currentData?.hideoutModules ?? {};
          let maxManuallyCompletedLevel = 0;
          if (station.levels && Array.isArray(station.levels)) {
            for (const lvl of station.levels) {
              if (
                lvl &&
                lvl.id &&
                modulesState[lvl.id]?.complete &&
                typeof lvl.level === 'number'
              ) {
                maxManuallyCompletedLevel = Math.max(maxManuallyCompletedLevel, lvl.level);
              }
            }
          }
          let currentStationDisplayLevel;
          if (station.id === STASH_STATION_ID) {
            const gameEditionVersion = currentData?.gameEdition ?? 0;
            const edition = gameEditionData.value.find(
              (e: GameEdition) => e.version === gameEditionVersion
            );
            const defaultStashFromEdition = edition?.defaultStashLevel ?? 0;
            const maxLevel = station.levels?.length || 0;
            const effectiveStashLevel = Math.min(defaultStashFromEdition, maxLevel);
            if (effectiveStashLevel === maxLevel) {
              currentStationDisplayLevel = maxLevel;
            } else {
              currentStationDisplayLevel = Math.max(effectiveStashLevel, maxManuallyCompletedLevel);
            }
          } else if (station.id === CULTIST_CIRCLE_STATION_ID) {
            const gameEditionVersion = currentData?.gameEdition ?? 0;
            if (
              (gameEditionVersion === 5 || gameEditionVersion === 6) &&
              station.levels &&
              station.levels.length > 0
            ) {
              currentStationDisplayLevel = station.levels.length;
            } else {
              currentStationDisplayLevel = maxManuallyCompletedLevel;
            }
          } else {
            currentStationDisplayLevel = maxManuallyCompletedLevel;
          }
          levels[station.id][teamId] = currentStationDisplayLevel;
        }
      }
      return levels;
    });
    const getTeamIndex = (teamId: string): string => {
      return teamId === fireuser?.uid ? 'self' : teamId;
    };
    const getDisplayName = (teamId: string): string => {
      const storeKey = getTeamIndex(teamId);
      const store = teamStores.value[storeKey];
      const currentGameMode = store?.$state.currentGameMode || 'pvp';
      const currentData = store?.$state[currentGameMode] || store?.$state;
      const displayNameFromStore = (currentData as UserProgressData)?.displayName;

      if (!displayNameFromStore) {
        return teamId.substring(0, 6);
      }
      return displayNameFromStore;
    };
    const getLevel = (teamId: string): number => {
      const storeKey = getTeamIndex(teamId);
      const store = teamStores.value[storeKey];
      // Get current gamemode data, with fallback to legacy structure
      const currentGameMode = store?.$state.currentGameMode || 'pvp';
      const currentData = store?.$state[currentGameMode] || store?.$state;
      return currentData?.level ?? 1;
    };
    const getFaction = (teamId: string): string => {
      const store = visibleTeamStores.value[teamId];
      // Get current gamemode data, with fallback to legacy structure
      const currentGameMode = store?.$state.currentGameMode || 'pvp';
      const currentData = store?.$state[currentGameMode] || store?.$state;
      return currentData?.pmcFaction ?? 'Unknown';
    };
    const getTeammateStore = (teamId: string): Store<string, UserState> | null => {
      return teammateStores.value[teamId] || null;
    };

    const hasCompletedTask = (teamId: string, taskId: string): boolean => {
      const storeKey = getTeamIndex(teamId);
      const store = teamStores.value[storeKey];
      // Get current gamemode data, with fallback to legacy structure
      const currentGameMode = store?.$state.currentGameMode || 'pvp';
      const currentData = store?.$state[currentGameMode] || store?.$state;
      const taskCompletion = currentData?.taskCompletions?.[taskId];
      return taskCompletion?.complete === true;
    };

    const getTaskStatus = (
      teamId: string,
      taskId: string
    ): 'completed' | 'failed' | 'incomplete' => {
      const storeKey = getTeamIndex(teamId);
      const store = teamStores.value[storeKey];
      // Get current gamemode data, with fallback to legacy structure
      const currentGameMode = store?.$state.currentGameMode || 'pvp';
      const currentData = store?.$state[currentGameMode] || store?.$state;
      const taskCompletion = currentData?.taskCompletions?.[taskId];

      if (taskCompletion?.complete) return 'completed';
      if (taskCompletion?.failed) return 'failed';
      return 'incomplete';
    };

    const getProgressPercentage = (teamId: string, category: string): number => {
      const storeKey = getTeamIndex(teamId);
      const store = teamStores.value[storeKey];

      if (!store?.$state) return 0;

      // Get current gamemode data, with fallback to legacy structure
      const currentGameMode = store.$state.currentGameMode || 'pvp';
      const currentData = store.$state[currentGameMode] || store.$state;

      switch (category) {
        case 'tasks': {
          const totalTasks = Object.keys(currentData.taskCompletions || {}).length;
          const completedTasks = Object.values(currentData.taskCompletions || {}).filter(
            (completion) => completion?.complete === true
          ).length;
          return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        }

        case 'hideout': {
          const totalModules = Object.keys(currentData.hideoutModules || {}).length;
          const completedModules = Object.values(currentData.hideoutModules || {}).filter(
            (module) => module?.complete === true
          ).length;
          return totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
        }

        default:
          return 0;
      }
    };

    return {
      teamStores,
      visibleTeamStores,
      tasksCompletions,
      gameEditionData,
      traderLevelsAchieved,
      playerFaction,
      unlockedTasks,
      objectiveCompletions,
      hideoutLevels,
      getTeamIndex,
      getDisplayName,
      getLevel,
      getFaction,
      getTeammateStore,
      hasCompletedTask,
      getTaskStatus,
      getProgressPercentage,
    };
  },
  {
    fireswap: [
      {
        path: '.',
        document: 'userProgress/{uid}',
        debouncems: 500,
        localKey: 'userProgress',
      },
    ] as FireswapConfig[],
  }
);
