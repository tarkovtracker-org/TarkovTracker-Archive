import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, watchEffect } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/user';
import { useProgressQueries } from '@/composables/useProgressQueries';
import { useTarkovStore } from '@/stores/tarkov';
import { useTarkovData } from '@/composables/tarkovdata';
import { useTaskSettings } from '@/components/domain/tasks/composables/useTaskSettings';
import { taskMatchesRequirementFilters } from '@/utils/taskFilters';
import { getMapIdGroup } from '@/utils/mapNormalization';
import { logger } from '@/utils/logger';
import { debounce } from '@/utils/debounce';
import { useVirtualTaskList } from './useVirtualTaskList';
import { EOD_EDITIONS, TRADER_ORDER } from '@/config/gameConstants';
import {
  summarizeSecondaryTaskCounts,
  sortVisibleTasks,
  taskUnlockedForCurrentView,
  taskHasIncompleteObjectiveOnMap,
  filterTasksByPrimaryView,
  collectTaskLocationIds,
  resolveObjectiveMapIds,
} from './taskCore';
import {
  collectObjectiveMarkers,
  getUnlockedUsersForTask,
  usersWithIncompleteObjective,
  objectiveIncompleteForUser,
} from './taskMarkersUtils';
import type { Task, TaskObjective } from '@/types/models/tarkov';
interface ObjectiveWithUsers extends TaskObjective {
  users: string[];
}
interface SecondaryTaskCounts {
  available: number;
  locked: number;
  completed: number;
}
export function useTaskList() {
  const { t } = useI18n({ useScope: 'global' });
  const userStore = useUserStore();
  const {
    visibleTeamStores,
    visibleTeamIds,
    getDisplayName,
    unlockedTasks,
    tasksCompletions,
    objectiveCompletions,
    playerFaction,
    isTaskUnlockedFor,
    isTaskUnlockedByAny,
    isTaskCompletedFor,
    getUnlockedMap,
    getTaskCompletionMap,
    getObjectiveCompletionMap,
  } = useProgressQueries();
  const tarkovStore = useTarkovStore();
  const { tasks, maps, traders, loading: tasksLoading, disabledTasks } = useTarkovData();
  const primaryViews = computed(() => [
    {
      title: t('page.tasks.primaryviews.all'),
      icon: 'mdi-clipboard-check',
      view: 'all',
    },
    {
      title: t('page.tasks.primaryviews.maps'),
      icon: 'mdi-compass',
      view: 'maps',
    },
  ]);
  const secondaryViews = computed(() => [
    {
      title: t('page.tasks.secondaryviews.available'),
      icon: 'mdi-clipboard-text',
      view: 'available',
    },
    {
      title: t('page.tasks.secondaryviews.locked'),
      icon: 'mdi-lock',
      view: 'locked',
    },
    {
      title: t('page.tasks.secondaryviews.completed'),
      icon: 'mdi-clipboard-check',
      view: 'completed',
    },
  ]);
  const activePrimaryView = computed({
    get: () => userStore.getTaskPrimaryView,
    set: (value: string) => userStore.setTaskPrimaryView(value),
  });
  const validPrimaryViews = new Set(['all', 'maps']);
  if (!validPrimaryViews.has(activePrimaryView.value)) {
    activePrimaryView.value = 'all';
  }
  const activeMapView = computed({
    get: () => userStore.getTaskMapView,
    set: (value: string) => userStore.setTaskMapView(value),
  });
  const activeTraderView = computed({
    get: () => userStore.getTaskTraderView,
    set: (value: string) => userStore.setTaskTraderView(value),
  });
  const activeUserView = computed({
    get: () => userStore.getTaskUserView,
    set: (value: string) => userStore.setTaskUserView(value),
  });
  const activeSecondaryView = computed({
    get: () => userStore.getTaskSecondaryView,
    set: (value: string) => {
      if (value !== 'available' && activeUserView.value === 'all') {
        activeUserView.value = 'self';
      }
      userStore.setTaskSecondaryView(value);
    },
  });
  const userViews = computed(() => {
    const views: Array<{ title: string; view: string }> = [];
    const teamStoreKeys = visibleTeamIds.value;
    if (teamStoreKeys.length > 1) {
      views.push({ title: t('page.tasks.userviews.all'), view: 'all' });
    }
    const displayName = tarkovStore.getDisplayName();
    if (displayName == null) {
      views.push({
        title: t('page.tasks.userviews.yourself'),
        view: 'self',
      });
    } else {
      views.push({ title: displayName, view: 'self' });
    }
    for (const teamId of teamStoreKeys) {
      if (teamId !== 'self') {
        views.push({
          title: getDisplayName(teamId),
          view: teamId,
        });
      }
    }
    return views;
  });
  const traderAvatar = (id: string) => {
    const trader = traders.value.find((t) => t.id === id);
    return trader?.imageLink;
  };
  const getSelfGameEdition = () =>
    typeof tarkovStore.getGameEdition === 'function' ? tarkovStore.getGameEdition() : 0;
  const isEditionEod = (edition: number | null | undefined) => EOD_EDITIONS.has(edition ?? 0);
  const selfGameEdition = computed(() => getSelfGameEdition());
  const isSelfEod = computed(() => isEditionEod(selfGameEdition.value));
  const currentPlayerLevel = computed(() =>
    typeof tarkovStore.playerLevel === 'function' ? tarkovStore.playerLevel() : 0
  );
  const {
    hideGlobalTasks,
    hideNonKappaTasks,
    showKappaRequiredTasks,
    hideKappaRequiredTasks,
    showLightkeeperRequiredTasks,
    hideLightkeeperRequiredTasks,
    showEodOnlyTasks,
    showNextTasks,
    showPreviousTasks,
    filterControls,
    appearanceControls,
  } = useTaskSettings(userStore, {
    isSelfEod,
    createNonKappaLabel: () =>
      isSelfEod.value
        ? 'page.tasks.filters.show_non_endgame_tasks_eod'
        : 'page.tasks.filters.show_non_endgame_tasks',
    createNonKappaTooltip: () =>
      isSelfEod.value
        ? 'page.tasks.filters.tooltips.show_non_endgame_tasks_eod'
        : 'page.tasks.filters.tooltips.show_non_endgame_tasks',
  });
  const requirementFilterOptions = computed(() => ({
    showKappa: showKappaRequiredTasks.value,
    showLightkeeper: showLightkeeperRequiredTasks.value,
    showEod: showEodOnlyTasks.value,
    hideNonEndgame: hideNonKappaTasks.value,
    treatEodAsEndgame: isSelfEod.value,
  }));
  type RequirementOptions = {
    showKappa: boolean;
    showLightkeeper: boolean;
    showEod: boolean;
    hideNonEndgame: boolean;
    treatEodAsEndgame: boolean;
  };
  const getEditionForView = (viewId: string) => {
    if (viewId === 'all') return null;
    if (viewId === 'self') {
      return getSelfGameEdition();
    }
    const teamStores = visibleTeamStores.value || {};
    const teamStore = teamStores[viewId];
    if (teamStore && teamStore.$state) {
      return teamStore.$state.gameEdition ?? 0;
    }
    return 0;
  };
  const loadingTasks = computed(() => {
    if (tasksLoading.value) return true;
    if (!tasks.value || tasks.value.length === 0) {
      return true;
    }
    if (!unlockedTasks.value || !tasksCompletions.value || !playerFaction.value) {
      return true;
    }
    return false;
  });
  const reloadingTasks = ref(false);
  const visibleTasks: ShallowRef<Task[]> = shallowRef([]);
  const secondaryTaskCounts = ref<SecondaryTaskCounts>({
    available: 0,
    locked: 0,
    completed: 0,
  });
  const initialVisibleTasksHydrated = ref(false);
  const {
    renderedTasks,
    hasMoreTasks,
    loadMore,
    reset: resetVirtualTasks,
  } = useVirtualTaskList(visibleTasks as Ref<Task[]>);
  const visibleGPS = computed<ObjectiveWithUsers[]>(() => {
    if (activePrimaryView.value !== 'maps' || activeSecondaryView.value !== 'available') {
      return [];
    }
    return (visibleTasks.value || []).flatMap((task) =>
      collectObjectiveMarkers(
        task,
        activeUserView.value,
        (taskId: string) => getUnlockedUsersForTask(taskId, getUnlockedMap),
        (objectiveId: string, candidateUsers: string[]) =>
          usersWithIncompleteObjective(objectiveId, candidateUsers, getObjectiveCompletionMap),
        (objectiveId: string, userId: string) =>
          objectiveIncompleteForUser(objectiveId, userId, getObjectiveCompletionMap),
        objectiveHasLocation
      )
    );
  });
  const selectedMap = computed(() => maps.value.find((m) => m.id === activeMapView.value) ?? null);
  const mapTaskTotals = computed<Record<string, number>>(() => {
    if (activePrimaryView.value !== 'maps') {
      return {};
    }
    const requirementOptions = requirementFilterOptions.value;
    return maps.value.reduce<Record<string, number>>((acc, map) => {
      acc[map.id] = countTasksForMap(map.id, requirementOptions);
      return acc;
    }, {});
  });
  const countTasksForMap = (mapId: string, options: RequirementOptions) => {
    const mapIdGroup = getMapIdGroup(mapId, maps.value);
    return tasks.value.reduce((total, task) => {
      if (!taskShouldBeConsidered(task, options, hideGlobalTasks.value)) {
        return total;
      }
      if (!taskTouchesMap(task, mapIdGroup)) {
        return total;
      }
      if (
        !taskUnlockedForCurrentView(
          task.id,
          activeUserView.value,
          isTaskUnlockedByAny,
          isTaskUnlockedFor
        )
      ) {
        return total;
      }
      return taskHasIncompleteObjectiveOnMap(
        task,
        mapIdGroup,
        activeUserView.value,
        resolveObjectiveMapIds,
        getObjectiveCompletionMap
      )
        ? total + 1
        : total;
    }, 0);
  };
  const taskShouldBeConsidered = (task: Task, options: RequirementOptions, hideGlobal: boolean) => {
    if (disabledTasks.includes(task.id)) return false;
    if (hideGlobal && collectTaskLocationIds(task).size === 0) return false;
    return taskMatchesRequirementFilters(task, options);
  };
  const taskTouchesMap = (task: Task, mapIdGroup: string[]) => {
    const taskLocations = collectTaskLocationIds(task);
    return mapIdGroup.some((id) => taskLocations.has(id));
  };
  const applyRequirementFilters = (taskList: Task[]) => {
    const requirementOptions = requirementFilterOptions.value;
    return taskList.filter((task) => {
      if (!task || typeof task.id !== 'string') return false;
      if (disabledTasks.includes(task.id)) return false;
      if (!taskMatchesRequirementFilters(task, requirementOptions)) return false;
      if (task.eodOnly) {
        if (activeUserView.value === 'all') {
          const anyEod = visibleTeamIds.value.some((id) => isEditionEod(getEditionForView(id)));
          if (!anyEod) {
            return false;
          }
        } else {
          const editionForView = getEditionForView(activeUserView.value);
          if (!isEditionEod(editionForView)) {
            return false;
          }
        }
      }
      return true;
    });
  };
  const filterTasksForAllUsersAvailable = (taskList: Task[], includeNeededBy = false) =>
    taskList.reduce<Task[]>((acc, task) => {
      const usersWhoNeedTask = computeUsersNeedingTask(task);
      if (usersWhoNeedTask.length === 0) {
        return acc;
      }
      acc.push(
        includeNeededBy ? { ...task, neededBy: usersWhoNeedTask.map(getDisplayName) } : task
      );
      return acc;
    }, []);
  const computeUsersNeedingTask = (task: Task) =>
    visibleTeamIds.value.filter((teamId) => userNeedsTask(teamId, task));
  const userNeedsTask = (teamId: string, task: Task) => {
    if (!isTaskUnlockedFor(task.id, teamId)) {
      return false;
    }
    if (isTaskCompletedFor(task.id, teamId)) {
      return false;
    }
    const userFaction = playerFaction.value?.[teamId];
    return task.factionName === 'Any' || task.factionName === userFaction;
  };
  const filterTasksForSpecificUser = (taskList: Task[], secondaryView: string) => {
    let filtered = [...taskList];
    if (secondaryView === 'available') {
      filtered = filtered.filter((task) => {
        const unlockedMap = getUnlockedMap(task.id);
        const completionMap = getTaskCompletionMap(task.id);
        if (
          Object.keys(unlockedTasks.value || {}).length === 0 ||
          Object.keys(unlockedMap).length === 0
        ) {
          return true;
        }
        if (completionMap?.[activeUserView.value] === true) {
          return false;
        }
        return unlockedMap?.[activeUserView.value] === true;
      });
    } else if (secondaryView === 'locked') {
      filtered = filtered.filter((task) => {
        const taskCompletions = getTaskCompletionMap(task.id);
        const unlockedMap = getUnlockedMap(task.id);
        if (Object.keys(unlockedTasks.value || {}).length === 0) {
          return true;
        }
        return (
          taskCompletions?.[activeUserView.value] !== true &&
          unlockedMap?.[activeUserView.value] !== true
        );
      });
    } else if (secondaryView === 'completed') {
      const completions = tasksCompletions.value || {};
      filtered = filtered.filter((task) => {
        if (Object.keys(completions).length === 0) {
          return false;
        }
        return completions?.[task.id]?.[activeUserView.value] === true;
      });
    }
    return filtered.filter((task) => {
      if (!playerFaction.value?.[activeUserView.value]) {
        return true;
      }
      return (
        task.factionName === 'Any' ||
        task.factionName === playerFaction.value?.[activeUserView.value]
      );
    });
  };
  const buildTasksForSecondaryView = (taskList: Task[], secondaryView: string, options = {}) => {
    const { includeNeededBy = false } = options as { includeNeededBy?: boolean };
    let filtered: Task[] = [];
    if (activeUserView.value === 'all') {
      if (secondaryView === 'available') {
        filtered = filterTasksForAllUsersAvailable(taskList, includeNeededBy);
      } else {
        filtered = [];
      }
    } else {
      filtered = filterTasksForSpecificUser(taskList, secondaryView);
    }
    return applyRequirementFilters(filtered);
  };
  const buildTaskViewEntries = (baseTaskList: Task[], includeNeededBy: boolean) =>
    secondaryViews.value.reduce<Record<string, Task[]>>((acc, view) => {
      acc[view.view] = buildTasksForSecondaryView(baseTaskList, view.view, {
        includeNeededBy: includeNeededBy && view.view === activeSecondaryView.value,
      });
      return acc;
    }, {});
  const shouldSkipVisibleTaskUpdate = () =>
    loadingTasks.value ||
    !Array.isArray(disabledTasks) ||
    !Array.isArray(tasks.value) ||
    tasks.value.length === 0;
  const filterCache = ref<{
    key: string;
    baseTaskList: Task[];
    taskViewEntries: Record<string, Task[]>;
  } | null>(null);
  const getTaskFingerprint = () => {
    return tasks.value.map((task) => task.id).join('|');
  };

  const getFilterCacheKey = () => {
    const parts = [
      activePrimaryView.value,
      activeMapView.value,
      activeTraderView.value,
      activeUserView.value,
      hideGlobalTasks.value ? '1' : '0',
      hideNonKappaTasks.value ? '1' : '0',
      hideKappaRequiredTasks.value ? '1' : '0',
      hideLightkeeperRequiredTasks.value ? '1' : '0',
      showEodOnlyTasks.value ? '1' : '0',
      getTaskFingerprint(),
    ];
    return parts.join('|');
  };
  const getOrComputeTaskViews = (
    cacheKey: string
  ): { baseTaskList: Task[]; taskViewEntries: Record<string, Task[]> } => {
    const hasValidCache = filterCache.value && filterCache.value.key === cacheKey;
    if (hasValidCache) {
      return {
        baseTaskList: filterCache.value!.baseTaskList,
        taskViewEntries: filterCache.value!.taskViewEntries,
      };
    }
    const baseTaskList = filterTasksByPrimaryView(
      [...tasks.value],
      activePrimaryView.value,
      activeMapView.value,
      maps.value,
      collectTaskLocationIds,
      activeTraderView.value
    );
    const includeNeededBy =
      activeUserView.value === 'all' && activeSecondaryView.value === 'available';
    const taskViewEntries = buildTaskViewEntries(baseTaskList, includeNeededBy);
    filterCache.value = { key: cacheKey, baseTaskList, taskViewEntries };
    return { baseTaskList, taskViewEntries };
  };
  const ensureInitialHydration = () => {
    if (!initialVisibleTasksHydrated.value) {
      initialVisibleTasksHydrated.value = true;
    }
  };
  const updateVisibleTasks = () => {
    if (shouldSkipVisibleTaskUpdate()) {
      return;
    }
    try {
      reloadingTasks.value = true;
      const cacheKey = getFilterCacheKey();
      const { taskViewEntries } = getOrComputeTaskViews(cacheKey);
      // Calculate badge counts synchronously to prevent layout shifts
      // Async updates would cause badges to appear after initial render
      secondaryTaskCounts.value = summarizeSecondaryTaskCounts(taskViewEntries);
      visibleTasks.value = sortVisibleTasks(
        taskViewEntries[activeSecondaryView.value] || [],
        activeUserView.value,
        tasks.value
      );
      ensureInitialHydration();
    } catch (error) {
      logger.error('Error updating visible tasks:', error);
      visibleTasks.value = [];
    } finally {
      ensureInitialHydration();
      reloadingTasks.value = false;
    }
  };
  // Debounce delay can be configured via VITE_FILTER_DEBOUNCE_DELAY env variable
  const FILTER_DEBOUNCE_DELAY =
    typeof import.meta.env.VITE_FILTER_DEBOUNCE_DELAY !== 'undefined'
      ? Number(import.meta.env.VITE_FILTER_DEBOUNCE_DELAY) || 100
      : 100;
  const debouncedUpdateVisibleTasks = debounce(updateVisibleTasks, FILTER_DEBOUNCE_DELAY);
  const invalidateFilterCacheAndUpdate = () => {
    if (loadingTasks.value) {
      return;
    }
    filterCache.value = null;
    debouncedUpdateVisibleTasks();
  };
  watchEffect(() => {
    if (loadingTasks.value) {
      return;
    }
    // Initial load should not rely on any previous cache
    filterCache.value = null;
    debouncedUpdateVisibleTasks();
  });
  // Watch core filter controls and trigger debounced updates with cache invalidation.
  // Progress maps are additionally covered by a dedicated deep watcher below.
  watch(
    [
      activePrimaryView,
      activeMapView,
      activeTraderView,
      activeSecondaryView,
      activeUserView,
      hideGlobalTasks,
      hideNonKappaTasks,
      hideKappaRequiredTasks,
      hideLightkeeperRequiredTasks,
      showEodOnlyTasks,
      currentPlayerLevel,
    ],
    () => {
      invalidateFilterCacheAndUpdate();
    }
  );
  // Explicit deep watch for progress-dependent sources that can mutate independently:
  // - unlockedTasks
  // - tasksCompletions
  // - objectiveCompletions
  // - playerFaction (per-team faction affects availability)
  // Any mutation invalidates the memoized filter results before invoking the debounced update.
  watch(
    [unlockedTasks, tasksCompletions, objectiveCompletions, playerFaction],
    () => {
      if (!loadingTasks.value) {
        filterCache.value = null;
        debouncedUpdateVisibleTasks();
      }
    },
    { deep: true }
  );
  onBeforeUnmount(() => {
    debouncedUpdateVisibleTasks.cancel();
    filterCache.value = null;
    visibleTasks.value = [];
  });
  watch(visibleTasks, () => {
    resetVirtualTasks();
  });
  const traderOrder: string[] = [...TRADER_ORDER];
  const orderedTraders = computed(() => {
    const traderList = Array.isArray(traders.value) ? traders.value : [];
    return [...traderList].sort((a, b) => {
      const aIdx = traderOrder.indexOf(a.name ?? '');
      const bIdx = traderOrder.indexOf(b.name ?? '');
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
  });
  function objectiveHasLocation(objective: TaskObjective) {
    return Boolean(objective.possibleLocations?.length || objective.zones?.length);
  }
  onMounted(() => {
    resetVirtualTasks();
  });
  return {
    primaryViews,
    secondaryViews,
    userViews,
    orderedTraders,
    traderAvatar,
    activePrimaryView,
    activeSecondaryView,
    activeUserView,
    activeMapView,
    activeTraderView,
    loadingTasks,
    reloadingTasks,
    visibleTasks,
    renderedTasks,
    hasMoreTasks,
    loadMoreTasks: loadMore,
    secondaryTaskCounts,
    initialVisibleTasksHydrated,
    mapTaskTotals,
    visibleGPS,
    selectedMap,
    maps,
    filterControls,
    appearanceControls,
    showNextTasks,
    showPreviousTasks,
    requirementFilterOptions,
  };
}
