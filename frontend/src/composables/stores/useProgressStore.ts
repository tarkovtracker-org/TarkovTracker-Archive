import { computed } from 'vue';
import { defineStore } from 'pinia';
import { fireuser } from '@/plugins/firebase';
import { useTarkovStore } from '@/stores/tarkov';
import { useUserStore } from '@/stores/user';
import { useTeammateStores } from './useTeamStore';
import type { Store } from 'pinia';
import type { UserState } from '@/shared_state';

/**
 * Progress store that manages team progress tracking and visibility
 */
export const useProgressStore = defineStore('progress', () => {
  const userStore = useUserStore();
  const { teammateStores } = useTeammateStores();

  // Get the main Tarkov store
  const getTarkovStore = () => useTarkovStore();

  // Computed property that combines self and teammate stores
  const teamStores = computed(() => {
    const stores: { [key: string]: Store<string, UserState> } = {};

    // Add self store
    stores['self'] = getTarkovStore() as Store<string, UserState>;

    // Add teammate stores
    for (const teammate of Object.keys(teammateStores.value)) {
      if (teammateStores.value[teammate]) {
        stores[teammate] = teammateStores.value[teammate];
      }
    }

    return stores;
  });

  // Computed property for visible team stores (excluding hidden teammates)
  const visibleTeamStores = computed(() => {
    const visibleStores: { [key: string]: Store<string, UserState> } = {};

    Object.entries(teamStores.value).forEach(([teamId, store]) => {
      if (!userStore.teamIsHidden(teamId)) {
        visibleStores[teamId] = store;
      }
    });

    return visibleStores;
  });

  /**
   * Gets the team index for a given team ID
   * Returns 'self' for current user, otherwise returns the team ID
   */
  const getTeamIndex = (teamId: string): string => {
    return teamId === fireuser?.uid ? 'self' : teamId;
  };

  /**
   * Gets the display name for a team member
   * Falls back to UID substring if no display name is available
   */
  const getDisplayName = (teamId: string): string => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const displayNameFromStore = store?.$state?.displayName;

    if (!displayNameFromStore) {
      console.warn(
        `Display name for ${teamId} (storeKey: ${storeKey}) is falsy. ` +
          `Falling back to UID substring. Store state: ${JSON.stringify(store?.$state)}`
      );
      return teamId.substring(0, 6);
    }

    return displayNameFromStore;
  };

  /**
   * Gets the level for a team member
   * Returns 1 as default if no level is available
   */
  const getLevel = (teamId: string): number => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    return store?.$state?.level ?? 1;
  };

  /**
   * Gets a specific teammate store by ID
   */
  const getTeammateStore = (teamId: string): Store<string, UserState> | null => {
    return teammateStores.value[teamId] || null;
  };

  /**
   * Checks if a team member has completed a specific task
   */
  const hasCompletedTask = (teamId: string, taskId: string): boolean => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const taskCompletion = store?.$state?.taskCompletions?.[taskId];
    return taskCompletion?.complete === true;
  };

  /**
   * Gets task status for a specific team member
   */
  const getTaskStatus = (teamId: string, taskId: string): 'completed' | 'failed' | 'incomplete' => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];
    const taskCompletion = store?.$state?.taskCompletions?.[taskId];

    if (taskCompletion?.complete) return 'completed';
    if (taskCompletion?.failed) return 'failed';
    return 'incomplete';
  };

  /**
   * Gets the progress percentage for a specific area (tasks, hideout, etc.)
   */
  const getProgressPercentage = (teamId: string, category: string): number => {
    const storeKey = getTeamIndex(teamId);
    const store = teamStores.value[storeKey];

    if (!store?.$state) return 0;

    const state = store.$state;

    switch (category) {
      case 'tasks': {
        const totalTasks = Object.keys(state.taskCompletions || {}).length;
        const completedTasks = Object.values(state.taskCompletions || {}).filter(
          (completion) => completion?.complete === true
        ).length;
        return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      }

      case 'hideout': {
        const totalModules = Object.keys(state.hideoutModules || {}).length;
        const completedModules = Object.values(state.hideoutModules || {}).filter(
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
    getDisplayName,
    getTeamIndex,
    getLevel,
    getTeammateStore,
    getTarkovStore,
    hasCompletedTask,
    getTaskStatus,
    getProgressPercentage,
  };
});
