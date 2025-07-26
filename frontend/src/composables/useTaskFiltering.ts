import { ref, shallowRef } from 'vue';
import { useProgressStore } from '@/stores/progress';
import { useTarkovData } from '@/composables/tarkovdata';
import type { Task } from '@/types/tarkov';

interface MergedMap {
  id: string;
  mergedIds?: string[];
}

export function useTaskFiltering() {
  const progressStore = useProgressStore();
  const { tasks, disabledTasks } = useTarkovData();
  const reloadingTasks = ref(false);
  const visibleTasks = shallowRef([]);

  const mapObjectiveTypes = [
    'mark',
    'zone',
    'extract',
    'visit',
    'findItem',
    'findQuestItem',
    'plantItem',
    'plantQuestItem',
    'shoot',
  ];

  /**
   * Filter tasks by primary view (all, maps, traders)
   */
  const filterTasksByView = (
    taskList: Task[],
    primaryView: string,
    mapView: string,
    traderView: string,
    mergedMaps: MergedMap[]
  ) => {
    if (primaryView === 'maps') {
      return filterTasksByMap(taskList, mapView, mergedMaps);
    } else if (primaryView === 'traders') {
      return taskList.filter((task) => task.trader?.id === traderView);
    }
    return taskList;
  };

  /**
   * Filter tasks by map, handling merged maps (Ground Zero, Factory)
   */
  const filterTasksByMap = (taskList: Task[], mapView: string, mergedMaps: MergedMap[]) => {
    const mergedMap = mergedMaps.find((m) => m.mergedIds && m.mergedIds.includes(mapView));

    if (mergedMap && mergedMap.mergedIds) {
      const ids = mergedMap.mergedIds;
      return taskList.filter((task) => {
        // Check locations field
        const taskLocations = Array.isArray(task.locations) ? task.locations : [];
        let hasMap = ids.some((id: string) => taskLocations.includes(id));

        // Check objectives[].maps
        if (!hasMap && Array.isArray(task.objectives)) {
          hasMap = task.objectives.some(
            (obj) =>
              Array.isArray(obj.maps) &&
              obj.maps.some((map) => ids.includes(map.id)) &&
              mapObjectiveTypes.includes(obj.type || '')
          );
        }
        return hasMap;
      });
    } else {
      // Default: single map logic
      return taskList.filter((task) =>
        task.objectives?.some(
          (obj) =>
            obj.maps?.some((map) => map.id === mapView) &&
            mapObjectiveTypes.includes(obj.type || '')
        )
      );
    }
  };

  /**
   * Filter tasks by status (available, locked, completed) and user view
   */
  const filterTasksByStatus = (taskList: Task[], secondaryView: string, userView: string) => {
    if (userView === 'all') {
      return filterTasksForAllUsers(taskList, secondaryView);
    } else {
      return filterTasksForUser(taskList, secondaryView, userView);
    }
  };

  /**
   * Filter tasks for all team members view
   */
  const filterTasksForAllUsers = (taskList: Task[], secondaryView: string) => {
    if (secondaryView !== 'available') {
      console.warn("Unexpected state: 'all' user view with non-'available' secondary view");
      return [];
    }

    const tempVisibleTasks = [];

    for (const task of taskList) {
      const usersWhoNeedTask = [];
      let taskIsNeededBySomeone = false;

      for (const teamId of Object.keys(progressStore.visibleTeamStores || {})) {
        const isUnlockedForUser = progressStore.unlockedTasks?.[task.id]?.[teamId] === true;
        const isCompletedByUser = progressStore.tasksCompletions?.[task.id]?.[teamId] === true;

        // Check faction requirements for this specific user
        const userFaction = progressStore.playerFaction[teamId];
        const taskFaction = task.factionName;
        const factionMatch = taskFaction === 'Any' || taskFaction === userFaction;

        if (isUnlockedForUser && !isCompletedByUser && factionMatch) {
          taskIsNeededBySomeone = true;
          usersWhoNeedTask.push(progressStore.getDisplayName(teamId));
        }
      }

      if (taskIsNeededBySomeone) {
        tempVisibleTasks.push({ ...task, neededBy: usersWhoNeedTask });
      }
    }

    return tempVisibleTasks;
  };

  /**
   * Filter tasks for specific user
   */
  const filterTasksForUser = (taskList: Task[], secondaryView: string, userView: string) => {
    let filtered = taskList;

    if (secondaryView === 'available') {
      filtered = filtered.filter(
        (task) => progressStore.unlockedTasks?.[task.id]?.[userView] === true
      );
    } else if (secondaryView === 'locked') {
      filtered = filtered.filter((task) => {
        const taskCompletions = progressStore.tasksCompletions?.[task.id];
        const unlockedTasks = progressStore.unlockedTasks?.[task.id];
        return taskCompletions?.[userView] !== true && unlockedTasks?.[userView] !== true;
      });
    } else if (secondaryView === 'completed') {
      filtered = filtered.filter(
        (task) => progressStore.tasksCompletions?.[task.id]?.[userView] === true
      );
    }

    // Filter by faction
    return filtered.filter(
      (task) =>
        task.factionName === 'Any' || task.factionName === progressStore.playerFaction[userView]
    );
  };

  /**
   * Calculate task totals per map for badge display
   */
  const calculateMapTaskTotals = (
    mergedMaps: MergedMap[],
    tasks: Task[],
    disabledTasks: string[],
    hideGlobalTasks: boolean,
    hideNonKappaTasks: boolean,
    activeUserView: string
  ) => {
    const mapTaskCounts: Record<string, number> = {};

    for (const map of mergedMaps) {
      // If merged, count for both IDs
      const ids = map.mergedIds || [map.id];
      mapTaskCounts[ids[0]] = 0;

      for (const task of tasks) {
        if (disabledTasks.includes(task.id)) continue;
        if (hideGlobalTasks && !task.map) continue;
        if (hideNonKappaTasks && task.kappaRequired !== true) continue;

        const taskLocations = Array.isArray(task.locations) ? task.locations : [];

        if (taskLocations.length === 0 && Array.isArray(task.objectives)) {
          for (const obj of task.objectives) {
            if (Array.isArray(obj.maps)) {
              for (const objMap of obj.maps) {
                if (objMap && objMap.id && !taskLocations.includes(objMap.id)) {
                  taskLocations.push(objMap.id);
                }
              }
            }
          }
        }

        // If any of the merged IDs are present
        if (ids.some((id: string) => taskLocations.includes(id))) {
          // Check if task is available for the user
          const unlocked =
            activeUserView === 'all'
              ? Object.values(progressStore.unlockedTasks[task.id] || {}).some(Boolean)
              : progressStore.unlockedTasks[task.id]?.[activeUserView];

          if (unlocked) {
            let anyObjectiveLeft = false;
            for (const objective of task.objectives || []) {
              if (Array.isArray(objective.maps) && objective.maps.some((m) => ids.includes(m.id))) {
                const completions = progressStore.objectiveCompletions[objective.id] || {};
                const isComplete =
                  activeUserView === 'all'
                    ? Object.values(completions).every(Boolean)
                    : completions[activeUserView] === true;

                if (!isComplete) {
                  anyObjectiveLeft = true;
                  break;
                }
              }
            }

            if (anyObjectiveLeft) {
              mapTaskCounts[ids[0]]++;
            }
          }
        }
      }
    }

    return mapTaskCounts;
  };

  /**
   * Main function to update visible tasks based on all filters
   */
  const updateVisibleTasks = async (
    activePrimaryView: string,
    activeSecondaryView: string,
    activeUserView: string,
    activeMapView: string,
    activeTraderView: string,
    mergedMaps: MergedMap[],
    tasksLoading: boolean
  ) => {
    // Simple guard clauses - data should be available due to global initialization
    if (tasksLoading || !tasks.value || !Array.isArray(disabledTasks)) {
      return;
    }

    reloadingTasks.value = true;

    try {
      let visibleTaskList = JSON.parse(JSON.stringify(tasks.value));

      // Apply primary view filter
      visibleTaskList = filterTasksByView(
        visibleTaskList,
        activePrimaryView,
        activeMapView,
        activeTraderView,
        mergedMaps
      );

      // Apply status and user filters
      visibleTaskList = filterTasksByStatus(visibleTaskList, activeSecondaryView, activeUserView);

      visibleTasks.value = visibleTaskList;
    } finally {
      reloadingTasks.value = false;
    }
  };

  return {
    visibleTasks,
    reloadingTasks,
    filterTasksByView,
    filterTasksByStatus,
    filterTasksByMap,
    filterTasksForAllUsers,
    filterTasksForUser,
    calculateMapTaskTotals,
    updateVisibleTasks,
    mapObjectiveTypes,
  };
}
