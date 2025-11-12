import { computed } from 'vue';
import { defineStore } from 'pinia';
import { fireuser } from '@/plugins/firebase';
import { useTarkovStore } from '@/stores/tarkov';
import { useUserStore } from '@/stores/user';
import { useTeammateStores } from './useTeamStore';
import { getCurrentGameModeData } from './utils/gameModeHelpers';
import { GAME_EDITIONS, HIDEOUT_STATION_IDS } from '@/config/gameConstants';
import { createTaskProgressGetters } from './progress/taskProgress';
import { createHideoutProgressGetters } from './progress/hideoutProgress';
import { createTraderProgressGetters } from './progress/traderProgress';
import type { TeamStoresMap } from './progress/types';
import type { Store } from 'pinia';
import type { UserState, UserProgressData } from '@/shared_state';
export const STASH_STATION_ID = HIDEOUT_STATION_IDS.STASH;
export const CULTIST_CIRCLE_STATION_ID = HIDEOUT_STATION_IDS.CULTIST_CIRCLE;
const DISPLAY_NAME_FALLBACK_LENGTH = 5;
const getProgressDataFromStore = (
  store: Store<string, UserState> | null | undefined
): UserProgressData | null => {
  const { currentData } = getCurrentGameModeData<UserProgressData | undefined>(store);
  return currentData ?? null;
};
export const useProgressStore = defineStore('progress', () => {
  const userStore = useUserStore();
  const { teammateStores } = useTeammateStores();
  const teamStores = computed<TeamStoresMap>(() => {
    const result: TeamStoresMap = {};
    try {
      const selfStore = useTarkovStore();
      if (selfStore) {
        result['self'] = selfStore;
      }
    } catch {
      // Ignore errors accessing self store
    }
    try {
      const teammates = teammateStores.value ?? {};
      for (const [id, store] of Object.entries(teammates)) {
        if (store) {
          result[id] = store;
        }
      }
    } catch {
      // Ignore errors accessing teammate stores
    }
    return result;
  });
  // visibleTeamStores: filters with user hidden prefs, defaults to {}
  const visibleTeamStores = computed(() => {
    const result: TeamStoresMap = {};
    const all = teamStores.value ?? {};
    for (const [teamId, store] of Object.entries(all)) {
      try {
        const isHidden = userStore.teamIsHidden?.(teamId);
        if (!isHidden) {
          result[teamId] = store;
        }
      } catch {
        // If teamIsHidden check fails, include the store (treat as visible)
        result[teamId] = store;
      }
    }
    return result;
  });
  const gameEditionData = computed(() => Object.values(GAME_EDITIONS));
  const traderProgress = createTraderProgressGetters(visibleTeamStores);
  const taskProgress = createTaskProgressGetters(visibleTeamStores, {
    traderLevels: traderProgress.traderLevelsAchieved,
    traderStandings: traderProgress.traderStandings,
  });
  const hideoutProgress = createHideoutProgressGetters(visibleTeamStores);
  const getTeamIndex = (teamId: string): string => {
    return teamId === fireuser?.uid ? 'self' : teamId;
  };
  // getDisplayName: fallback length is 5 characters
  const getDisplayName = (teamId: string): string => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value?.[storeKey];
    const progressData = getProgressDataFromStore(store);
    const displayNameFromStore = progressData?.displayName;
    if (!displayNameFromStore) {
      return String(teamId).slice(0, DISPLAY_NAME_FALLBACK_LENGTH);
    }
    return String(displayNameFromStore);
  };
  const getLevel = (teamId: string): number => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const progressData = getProgressDataFromStore(store);
    return progressData?.level ?? 1;
  };
  const getFaction = (teamId: string): string => {
    const store = visibleTeamStores.value[teamId];
    const progressData = getProgressDataFromStore(store);
    return progressData?.pmcFaction ?? 'Unknown';
  };
  const getTeammateStore = (teamId: string): Store<string, UserState> | null => {
    return teammateStores.value[teamId] || null;
  };
  const hasCompletedTask = (teamId: string, taskId: string): boolean => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const progressData = getProgressDataFromStore(store);
    const taskCompletion = progressData?.taskCompletions?.[taskId];
    return taskCompletion?.complete === true;
  };
  const getTaskStatus = (teamId: string, taskId: string): 'completed' | 'failed' | 'incomplete' => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const progressData = getProgressDataFromStore(store);
    const taskCompletion = progressData?.taskCompletions?.[taskId];
    if (taskCompletion?.complete) return 'completed';
    if (taskCompletion?.failed) return 'failed';
    return 'incomplete';
  };
  const getProgressPercentage = (teamId: string, category: string): number => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    if (!store?.$state) return 0;
    const progressData = getProgressDataFromStore(store);
    switch (category) {
      case 'tasks': {
        const taskCompletions = progressData?.taskCompletions ?? {};
        const totalTasks = Object.keys(taskCompletions).length;
        const completedTasks = Object.values(taskCompletions).filter(
          (completion) => completion?.complete === true
        ).length;
        return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      }
      case 'hideout': {
        const hideoutModules = progressData?.hideoutModules ?? {};
        const totalModules = Object.keys(hideoutModules).length;
        const completedModules = Object.values(hideoutModules).filter(
          (module) => module?.complete === true
        ).length;
        return totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
      }
      default:
        return 0;
    }
  };
  // tasksCompletions and moduleCompletions: always defined, exported as refs
  const tasksCompletions = computed(() => {
    try {
      const source = taskProgress.tasksCompletions;
      return source?.value ?? {};
    } catch {
      return {};
    }
  });
  const moduleCompletions = computed(() => {
    try {
      const source = hideoutProgress.moduleCompletions;
      return source?.value ?? {};
    } catch {
      return {};
    }
  });
  return {
    teamStores,
    visibleTeamStores,
    tasksCompletions,
    gameEditionData,
    traderLevelsAchieved: traderProgress.traderLevelsAchieved,
    traderStandings: traderProgress.traderStandings,
    playerFaction: taskProgress.playerFaction,
    unlockedTasks: taskProgress.unlockedTasks,
    objectiveCompletions: taskProgress.objectiveCompletions,
    hideoutLevels: hideoutProgress.hideoutLevels,
    moduleCompletions,
    modulePartCompletions: hideoutProgress.modulePartCompletions,
    getTeamIndex,
    getDisplayName,
    getLevel,
    getFaction,
    getTeammateStore,
    hasCompletedTask,
    getTaskStatus,
    getProgressPercentage,
  };
});
