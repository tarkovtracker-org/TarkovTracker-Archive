import { ref, shallowRef } from 'vue';
import { useTarkovData } from '@/composables/tarkovdata';
import { getMapIdGroup } from '@/utils/mapNormalization';
import type { Task } from '@/types/tarkov';
import { taskMatchesRequirementFilters } from '@/utils/taskFilters';
import { useProgressQueries } from '@/composables/useProgressQueries';
import { logger } from '@/utils/logger';

export function useTaskFiltering() {
  const {
    visibleTeamIds,
    isTaskUnlockedFor,
    isTaskUnlockedByAny,
    isTaskCompletedFor,
    getDisplayName,
    playerFaction,
    getUnlockedMap,
    getTaskCompletionMap,
    getObjectiveCompletionMap,
  } = useProgressQueries();
  const { tasks, disabledTasks, maps } = useTarkovData();
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

  const filterTasksByView = (
    taskList: Task[],
    primaryView: string,
    mapView: string,
    traderView: string
  ) => {
    if (primaryView === 'maps') {
      return filterTasksByMap(taskList, mapView);
    } else if (primaryView === 'traders') {
      return taskList.filter((task) => task.trader?.id === traderView);
    }
    return taskList;
  };

  /**
   * Filter tasks by map, handling map variants (Ground Zero 21+, Night Factory)
   * by treating all variant IDs as part of the same map group
   */
  const filterTasksByMap = (taskList: Task[], mapView: string) => {
    if (!mapView || mapView === 'all') {
      return taskList;
    }
    // Get all map IDs that should be treated as the same map (canonical + variants)
    const mapIdGroup = getMapIdGroup(mapView, maps.value);

    return taskList.filter((task) => {
      // Check locations field
      const taskLocations = Array.isArray(task.locations) ? task.locations : [];
      let hasMap = mapIdGroup.some((id: string) => taskLocations.includes(id));

      // Also check objective maps
      if (!hasMap && Array.isArray(task.objectives)) {
        hasMap = task.objectives.some(
          (obj) =>
            Array.isArray(obj.maps) &&
            obj.maps.some((map) => mapIdGroup.includes(map.id)) &&
            mapObjectiveTypes.includes(obj.type || '')
        );
      }

      return hasMap;
    });
  };
  const filterTasksByStatus = (taskList: Task[], secondaryView: string, userView: string) => {
    if (userView === 'all') {
      return filterTasksForAllUsers(taskList, secondaryView);
    } else {
      return filterTasksForUser(taskList, secondaryView, userView);
    }
  };
  const filterTasksForAllUsers = (taskList: Task[], secondaryView: string) => {
    if (secondaryView !== 'available') {
      logger.warn("Unexpected state: 'all' user view with non-'available' secondary view");
      return [];
    }
    const tempVisibleTasks = [];
    for (const task of taskList) {
      const usersWhoNeedTask = [];
      let taskIsNeededBySomeone = false;
      for (const teamId of visibleTeamIds.value) {
        const isUnlockedForUser = isTaskUnlockedFor(task.id, teamId);
        const isCompletedByUser = isTaskCompletedFor(task.id, teamId);
        // Check faction requirements for this specific user
        const userFaction = playerFaction.value?.[teamId];
        const taskFaction = task.factionName;
        const factionMatch = taskFaction === 'Any' || taskFaction === userFaction;
        if (isUnlockedForUser && !isCompletedByUser && factionMatch) {
          taskIsNeededBySomeone = true;
          usersWhoNeedTask.push(getDisplayName(teamId));
        }
      }
      if (taskIsNeededBySomeone) {
        tempVisibleTasks.push({ ...task, neededBy: usersWhoNeedTask });
      }
    }
    return tempVisibleTasks;
  };

  const filterTasksForUser = (taskList: Task[], secondaryView: string, userView: string) => {
    let filtered = taskList;

    if (secondaryView === 'available') {
      filtered = filtered.filter((task) => isTaskUnlockedFor(task.id, userView));
    } else if (secondaryView === 'locked') {
      filtered = filtered.filter((task) => {
        const taskCompletions = getTaskCompletionMap(task.id);
        const unlockedMap = getUnlockedMap(task.id);
        return taskCompletions?.[userView] !== true && unlockedMap?.[userView] !== true;
      });
    } else if (secondaryView === 'completed') {
      filtered = filtered.filter((task) => isTaskCompletedFor(task.id, userView));
    }
    // Filter by faction
    return filtered.filter(
      (task) =>
        task.factionName === 'Any' || task.factionName === playerFaction.value?.[userView]
    );
  };

  /**
   * Calculate task counts per map, handling map variants
   */
  const calculateMapTaskTotals = (
    displayedMaps: Array<{ id: string; name: string }>,
    tasks: Task[],
    disabledTasks: string[],
    hideGlobalTasks: boolean,
    hideNonKappaTasks: boolean,
    hideKappaRequiredTasks: boolean,
    hideLightkeeperRequiredTasks: boolean,
    activeUserView: string,
    allMaps: Array<{ id: string; name: string }>
  ) => {
    const mapTaskCounts: Record<string, number> = {};
    const requirementOptions = {
      showKappa: !hideKappaRequiredTasks,
      showLightkeeper: !hideLightkeeperRequiredTasks,
      showEod: true,
      hideNonEndgame: hideNonKappaTasks,
      treatEodAsEndgame: false,
    };

    for (const map of displayedMaps) {
      // Get all map IDs in this map's group (including variants)
      const mapIdGroup = getMapIdGroup(map.id, allMaps);
      mapTaskCounts[map.id] = 0;

      for (const task of tasks) {
        if (disabledTasks.includes(task.id)) continue;
        if (hideGlobalTasks && !task.map) continue;
        if (!taskMatchesRequirementFilters(task, requirementOptions)) continue;

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

        // Check if any of the map group IDs are present in task locations
        if (mapIdGroup.some((id: string) => taskLocations.includes(id))) {
          // Check if task is available for the user
          const unlocked =
            activeUserView === 'all'
              ? isTaskUnlockedByAny(task.id)
              : isTaskUnlockedFor(task.id, activeUserView);
          if (unlocked) {
            let anyObjectiveLeft = false;
            for (const objective of task.objectives || []) {
              if (Array.isArray(objective.maps) && objective.maps.some((m) => mapIdGroup.includes(m.id))) {
                const completions = getObjectiveCompletionMap(objective.id);
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
              mapTaskCounts[map.id]++;
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
        activeTraderView
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
