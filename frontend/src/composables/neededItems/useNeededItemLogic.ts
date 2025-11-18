import { computed, inject, provide, ref, getCurrentInstance } from 'vue';
import { useUserStore } from '@/stores/user';
import { useProgressQueries } from '@/composables/useProgressQueries';
import { useTarkovData } from '@/composables/tarkovdata';
import { useTarkovStore } from '@/stores/tarkov';
import type { Task } from '@/types/models/tarkov';
import { useFirestoreTarkovItems } from '@/composables/api/useFirestoreTarkovData';

export interface Item {
  id: string;
  name: string;
  shortName: string;
  properties?: Record<string, unknown>;
}

export interface HideoutModule {
  id: string;
  stationId: string;
  predecessors: HideoutModule[];
}

export interface Need {
  id: string;
  needType: 'taskObjective' | 'hideoutModule';
  type?: string;
  foundInRaid?: boolean;
  taskId?: string;
  count?: number;
  item?: Item;
  hideoutModule?: HideoutModule;
}

export interface NeededItemData {
  item: any;
  relatedTask: any;
  relatedStation: any;
  selfCompletedNeed: any;
  lockedBefore: any;
  currentCount: any;
  neededCount: any;
  levelRequired: any;
  teamNeeds: any;
  imageItem: any;
}

export function useNeededItemLogic(need: Need) {
  const userStore = useUserStore();
  const {
    progressStore,
    tasksCompletions,
    objectiveCompletions,
    moduleCompletions,
    modulePartCompletions,
    playerFaction,
  } = useProgressQueries();
  const tarkovStore = useTarkovStore();
  const { items: allItems } = useFirestoreTarkovItems();
  const { tasks, hideoutStations, alternativeTasks } = useTarkovData();

  // Helper functions and data to calculate if the item should be shown based
  // on the user's/team's progress and the user's filters
  const filterString = getCurrentInstance() ? inject('itemFilterName', ref('')) : ref('');

  // Helper function to check if objective type should be filtered
  const isObjectiveTypeFiltered = (need: Need) => {
    if (need.type === 'mark' || need.type === 'buildWeapon' || need.type === 'plantItem') {
      return true;
    }
    if (need.type === 'giveItem' && need.foundInRaid === false) {
      return true;
    }
    return false;
  };

  // Helper function to check if task should be hidden based on kappa/lightkeeper requirements
  const isTaskTypeFiltered = (task: Task) => {
    if (userStore.hideKappaRequiredTasks && task.kappaRequired === true) {
      return true;
    }
    if (userStore.hideLightkeeperRequiredTasks && task.lightkeeperRequired === true) {
      return true;
    }
    if (
      userStore.hideNonKappaTasks &&
      task.kappaRequired !== true &&
      task.lightkeeperRequired !== true
    ) {
      return true;
    }
    return false;
  };

  // Helper function to check if faction matches
  const doesFactionMatch = (taskFaction: string, userTeamId: string) => {
    const relevantFactions = ['Any', playerFaction.value[userTeamId]];
    return relevantFactions.some((faction) => faction === taskFaction);
  };

  // Helper function to check if any team needs this objective
  const doesAnyTeamNeedObjective = (taskId: string, objectiveId: string, taskFaction: string) => {
    const taskNeeded = Object.entries(tasksCompletions.value[taskId] ?? {}).some(
      ([userTeamId, userStatus]) =>
        doesFactionMatch(taskFaction, userTeamId) && userStatus === false
    );
    const objectiveNeeded = Object.entries(objectiveCompletions.value[objectiveId] ?? {}).some(
      ([userTeamId, userStatus]) =>
        doesFactionMatch(taskFaction, userTeamId) && userStatus === false
    );
    return taskNeeded && objectiveNeeded;
  };

  function isTaskObjectiveNeeded(need: Need) {
    const rt = relatedTask.value;
    if (!rt) return false;

    // Check if objective type should be filtered
    if (userStore.itemsNeededHideNonFIR && isObjectiveTypeFiltered(need)) {
      return false;
    }

    // Check if task type should be filtered
    if (isTaskTypeFiltered(rt)) {
      return false;
    }

    // Check team visibility settings
    if (userStore.itemsTeamAllHidden) {
      return isTaskObjectiveNeededForSelf(need, rt);
    }

    if (userStore.itemsTeamNonFIRHidden) {
      return isTaskObjectiveNeededForNonFir(need, rt);
    }

    // Default case - show if any team needs it
    return isTaskObjectiveNeededForAnyTeam(need, rt);
  }

  function isTaskObjectiveNeededForSelf(need: Need, rt: Task) {
    return (
      !tasksCompletions.value?.[need.taskId ?? '']?.self &&
      !objectiveCompletions.value?.[need.id ?? '']?.self &&
      ['Any', tarkovStore.getPMCFaction].some((faction) => faction === rt.factionName)
    );
  }

  function isTaskObjectiveNeededForNonFir(need: Need, rt: Task) {
    return (
      need.foundInRaid &&
      need.taskId &&
      need.id &&
      doesAnyTeamNeedObjective(need.taskId, need.id, rt.factionName ?? '')
    );
  }

  function isTaskObjectiveNeededForAnyTeam(need: Need, rt: Task) {
    return (
      need.taskId && need.id && doesAnyTeamNeedObjective(need.taskId, need.id, rt.factionName ?? '')
    );
  }

  function isHideoutModuleNeeded(need: Need) {
    // If hideoutModule or its id is missing, this need cannot be for a hideout module
    if (!need.hideoutModule?.id) {
      return false;
    }

    const { moduleCompletionsForModule, modulePartCompletionsForPart } =
      getHideoutModuleProgress(need);

    // If there is no progress data at all, show the item by default
    if (hasNoProgressData(moduleCompletionsForModule, modulePartCompletionsForPart)) {
      return true;
    }

    if (userStore.itemsTeamAllHidden || userStore.itemsTeamHideoutHidden) {
      return isHideoutModuleNeededForSelf(moduleCompletionsForModule, modulePartCompletionsForPart);
    } else {
      return isHideoutModuleNeededForAnyTeam(
        moduleCompletionsForModule,
        modulePartCompletionsForPart
      );
    }
  }

  function getHideoutModuleProgress(need: Need) {
    const moduleCompletionsForModule =
      moduleCompletions.value?.[need.hideoutModule?.id || ''] || {};
    const modulePartCompletionsForPart = modulePartCompletions.value?.[need.id || ''] || {};
    return { moduleCompletionsForModule, modulePartCompletionsForPart };
  }

  function hasNoProgressData(
    moduleCompletionsForModule: Record<string, boolean | undefined>,
    modulePartCompletionsForPart: Record<string, boolean | undefined>
  ) {
    return (
      Object.keys(moduleCompletionsForModule).length === 0 &&
      Object.keys(modulePartCompletionsForPart).length === 0
    );
  }

  function isHideoutModuleNeededForSelf(
    moduleCompletionsForModule: Record<string, boolean | undefined>,
    modulePartCompletionsForPart: Record<string, boolean | undefined>
  ) {
    return (
      moduleCompletionsForModule.self === undefined ||
      moduleCompletionsForModule.self === false ||
      modulePartCompletionsForPart.self === undefined ||
      modulePartCompletionsForPart.self === false
    );
  }

  function isHideoutModuleNeededForAnyTeam(
    moduleCompletionsForModule: Record<string, boolean | undefined>,
    modulePartCompletionsForPart: Record<string, boolean | undefined>
  ) {
    return (
      Object.values(moduleCompletionsForModule).some((userStatus) => userStatus === false) ||
      Object.values(modulePartCompletionsForPart).some((userStatus) => userStatus === false)
    );
  }

  // Computed properties
  const item = computed(() => {
    if (need.needType === 'taskObjective') {
      // Prefer primary item, otherwise fall back to first alternative if available
      if (need.item) return need.item;
      if (Array.isArray((need as any).items) && (need as any).items.length > 0) {
        return (need as any).items[0];
      }
      return null;
    } else if (need.needType === 'hideoutModule') {
      // For hideout modules, return the associated item
      return need.item;
    } else {
      return null;
    }
  });

  const relatedTask = computed(() => {
    if (need.needType === 'taskObjective') {
      return tasks.value.find((t) => t.id === need.taskId);
    } else {
      return null;
    }
  });

  const imageItem = computed(() => {
    let resolved = item.value as any;
    if (!resolved && need.needType === 'taskObjective') {
      const fallbackId =
        (need as any).item?.id ||
        (Array.isArray((need as any).items) && (need as any).items[0]?.id) ||
        null;
      if (fallbackId) {
        resolved = allItems.value.find((i) => i.id === fallbackId) ?? null;
      }
    }
    if (resolved?.properties?.defaultPreset) {
      return resolved.properties.defaultPreset;
    }
    return resolved;
  });

  const showItem = computed(() => {
    if (need.needType === 'taskObjective') {
      // Show any task objective that has an associated item and passes filters
      if (!item.value) {
        return false;
      }
      return isTaskObjectiveNeeded(need);
    }

    if (need.needType === 'hideoutModule') {
      // Check if a valid item exists and other filters pass
      return item.value && isHideoutModuleNeeded(need);
    }

    return false;
  });

  const showItemFilter = computed(() => {
    if (filterString.value === '') {
      return showItem.value;
    } else {
      return (
        item.value &&
        (item.value.shortName.toLowerCase().includes(filterString.value.toLowerCase()) ||
          item.value.name.toLowerCase().includes(filterString.value.toLowerCase())) &&
        showItem.value
      );
    }
  });

  const currentCount = computed(() => {
    if (selfCompletedNeed.value) {
      return neededCount.value;
    }
    if (need.needType === 'taskObjective') {
      return tarkovStore.getObjectiveCount(need.id);
    } else if (need.needType === 'hideoutModule') {
      return tarkovStore.getHideoutPartCount(need.id);
    } else {
      return 0;
    }
  });

  const neededCount = computed(() => {
    if (need.needType === 'taskObjective' && need.count) {
      return need.count;
    } else if (need.needType === 'hideoutModule' && need.count) {
      return need.count;
    } else {
      return 1;
    }
  });

  const lockedBefore = computed(() => {
    if (need.needType === 'taskObjective') {
      return (
        relatedTask.value?.predecessors?.filter((s) => !tarkovStore.isTaskComplete(s)).length ?? 0
      );
    } else if (need.needType === 'hideoutModule') {
      return (
        need.hideoutModule?.predecessors.filter((s) => !tarkovStore.isHideoutModuleComplete(s.id))
          .length ?? 0
      );
    } else {
      return 0;
    }
  });

  const selfCompletedNeed = computed(() => {
    if (need.needType === 'taskObjective') {
      const alternativeTaskCompleted = alternativeTasks.value[need.taskId ?? '']?.some(
        (altTaskId: string) => tasksCompletions.value?.[altTaskId]?.self
      );
      return (
        tasksCompletions.value?.[need.taskId ?? '']?.self ||
        alternativeTaskCompleted ||
        objectiveCompletions.value?.[need.id ?? '']?.self
      );
    } else if (need.needType === 'hideoutModule') {
      return (
        moduleCompletions.value?.[need.hideoutModule?.id ?? '']?.self ||
        modulePartCompletions.value?.[need.id ?? '']?.self
      );
    } else {
      return false;
    }
  });

  const relatedStation = computed(() => {
    if (need.needType === 'hideoutModule') {
      return Object.values(hideoutStations.value).find(
        (s: any) => s.id === need.hideoutModule?.stationId
      );
    } else {
      return null;
    }
  });

  const levelRequired = computed(() => {
    if (need.needType === 'taskObjective') {
      return relatedTask.value?.minPlayerLevel ?? 0;
    } else if (need.needType === 'hideoutModule') {
      return 0;
    } else {
      return 0;
    }
  });

  const teamNeeds = computed(() => {
    const needingUsers: any[] = [];
    if (need.needType === 'taskObjective') {
      // Find all of the users that need this objective
      Object.entries(objectiveCompletions.value?.[need.id ?? ''] || {}).forEach(
        ([user, completed]) => {
          if (!completed && tasksCompletions.value?.[need.taskId ?? '']?.[user]) {
            needingUsers.push({
              user,
              count:
                (progressStore.teamStores[user] as any).getObjectiveCount?.(need.id ?? '') ?? 0,
            });
          }
        }
      );
    } else if (need.needType === 'hideoutModule') {
      // Find all of the users that need this module
      Object.entries(modulePartCompletions.value?.[need.id || ''] || {}).forEach(
        ([user, completed]) => {
          if (!completed) {
            needingUsers.push({
              user,
              count:
                (progressStore.teamStores[user] as any).getHideoutPartCount?.(need.id || '') ?? 0,
            });
          }
        }
      );
    }
    return needingUsers;
  });

  // Actions
  const decreaseCount = () => {
    if (need.needType === 'taskObjective') {
      if (currentCount.value > 0) {
        tarkovStore.setObjectiveCount(need.id, currentCount.value - 1);
      }
    } else if (need.needType === 'hideoutModule') {
      if (currentCount.value > 0) {
        tarkovStore.setHideoutPartCount(need.id, currentCount.value - 1);
      }
    }
  };

  const increaseCount = () => {
    if (need.needType === 'taskObjective') {
      if (currentCount.value < neededCount.value) {
        tarkovStore.setObjectiveCount(need.id, currentCount.value + 1);
      }
    } else if (need.needType === 'hideoutModule') {
      if (currentCount.value < neededCount.value) {
        tarkovStore.setHideoutPartCount(need.id, currentCount.value + 1);
      }
    }
  };

  const toggleCount = () => {
    if (need.needType === 'taskObjective') {
      if (currentCount.value === 0) {
        tarkovStore.setObjectiveCount(need.id, neededCount.value);
      } else if (currentCount.value === neededCount.value) {
        tarkovStore.setObjectiveCount(need.id, 0);
      } else {
        tarkovStore.setObjectiveCount(need.id, neededCount.value);
      }
    } else if (need.needType === 'hideoutModule') {
      if (currentCount.value === 0) {
        tarkovStore.setHideoutPartCount(need.id, neededCount.value);
      } else if (currentCount.value === neededCount.value) {
        tarkovStore.setHideoutPartCount(need.id, 0);
      } else {
        tarkovStore.setHideoutPartCount(need.id, neededCount.value);
      }
    }
  };

  // Data to be provided to child components
  const neededItemData: NeededItemData = {
    item,
    relatedTask,
    relatedStation,
    selfCompletedNeed,
    lockedBefore,
    currentCount,
    neededCount,
    levelRequired,
    teamNeeds,
    imageItem,
  };

  // Only provide if we're in a component context
  if (getCurrentInstance()) {
    provide('neededitem', neededItemData);
  }

  return {
    // Computed properties
    showItemFilter,
    item,
    relatedTask,
    imageItem,
    showItem,
    currentCount,
    neededCount,
    lockedBefore,
    selfCompletedNeed,
    relatedStation,
    levelRequired,
    teamNeeds,

    // Actions
    decreaseCount,
    increaseCount,
    toggleCount,

    // Data for provide/inject
    neededItemData,
  };
}
