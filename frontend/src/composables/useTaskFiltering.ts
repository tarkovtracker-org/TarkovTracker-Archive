import { ref, shallowRef } from 'vue';
import { useTarkovData } from '@/composables/tarkovdata';
import { getMapIdGroup } from '@/utils/mapNormalization';
import type { Task, TaskObjective } from '@/types/tarkov';
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
  const visibleTasks = shallowRef<Task[]>([]);

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
      if (!traderView || traderView === 'all') {
        return taskList;
      }
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
  /**
   * Filter tasks for the 'all users' view, showing tasks needed by any team member
   *
   * Creates augmented task objects with a 'neededBy' array listing which team members
   * need each task. Only includes tasks that are:
   * - Unlocked for at least one team member
   * - Not completed by that team member
   * - Match the team member's faction requirements
   *
   * @param taskList - Tasks to filter
   * @param secondaryView - Expected to be 'available' (other views not supported for 'all')
   * @returns Array of tasks with additional 'neededBy' property containing user display names
   */
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
      filtered = filtered.filter(
        (task) => isTaskUnlockedFor(task.id, userView) && !isTaskCompletedFor(task.id, userView)
      );
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
      (task) => task.factionName === 'Any' || task.factionName === playerFaction.value?.[userView]
    );
  };

  /**
   * Calculate available task counts per map for display in UI
   *
   * This function counts tasks that:
   * 1. Have incomplete objectives on the specified map
   * 2. Are unlocked for the active user/team
   * 3. Match the current requirement filters (Kappa, Lightkeeper, EOD, etc.)
   *
   * The function handles map variants (e.g., Night Factory, Ground Zero 21+) by treating
   * them as part of the same map group using getMapIdGroup().
   *
   * Location resolution logic:
   * - Checks task.map, task.locations array
   * - For each objective: checks obj.maps, obj.location, obj.possibleLocations, obj.zones
   * - Collects all map IDs to determine if task belongs to a map
   *
   * Objective completion tracking:
   * - For 'all' view: Only counts if ALL team members have completed the objective
   * - For single user: Only counts if that user has completed the objective
   * - Only counts tasks with at least one incomplete objective on the map
   *
   * @param displayedMaps - Maps to calculate counts for (usually visible in UI)
   * @param tasks - Full task list to analyze
   * @param disabledTasks - Task IDs to exclude from counts
   * @param hideGlobalTasks - Whether to exclude tasks without specific map locations
   * @param hideNonKappaTasks - Whether to show only endgame tasks
   * @param hideKappaRequiredTasks - Whether to hide Kappa-required tasks
   * @param hideLightkeeperRequiredTasks - Whether to hide Lightkeeper-required tasks
   * @param activeUserView - Current user view ('all' or specific user ID)
   * @param allMaps - Complete map list for variant resolution
   * @param hideEodOnlyTasks - Whether to hide EOD-only tasks
   * @param treatEodAsEndgame - Whether to treat EOD tasks as endgame tasks
   * @returns Record mapping map ID to count of available tasks with incomplete objectives
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
    allMaps: Array<{ id: string; name: string }>,
    hideEodOnlyTasks: boolean = false,
    treatEodAsEndgame: boolean = false
  ) => {
    const mapTaskCounts: Record<string, number> = {};
    const requirementOptions = {
      showKappa: !hideKappaRequiredTasks,
      showLightkeeper: !hideLightkeeperRequiredTasks,
      showEod: !hideEodOnlyTasks,
      hideNonEndgame: hideNonKappaTasks,
      treatEodAsEndgame,
    };

    for (const map of displayedMaps) {
      // Get all map IDs in this map's group (including variants)
      const mapIdGroup = getMapIdGroup(map.id, allMaps);
      mapTaskCounts[map.id] = 0;

      for (const task of tasks) {
        if (disabledTasks.includes(task.id)) continue;

        const taskLocations: string[] = [];
        const appendLocation = (mapId?: string | null) => {
          if (mapId && !taskLocations.includes(mapId)) {
            taskLocations.push(mapId);
          }
        };

        appendLocation(task.map?.id);

        if (Array.isArray(task.locations)) {
          for (const locationId of task.locations) {
            appendLocation(locationId);
          }
        }

        if (Array.isArray(task.objectives)) {
          for (const obj of task.objectives) {
            if (Array.isArray(obj.maps)) {
              for (const objMap of obj.maps) {
                appendLocation(objMap?.id);
              }
            }

            appendLocation(obj.location?.id);

            if (Array.isArray(obj.possibleLocations)) {
              for (const possibleLocation of obj.possibleLocations) {
                appendLocation(possibleLocation?.map?.id);
              }
            }

            if (Array.isArray(obj.zones)) {
              for (const zone of obj.zones) {
                appendLocation(zone?.map?.id);
              }
            }
          }
        }

        if (hideGlobalTasks && taskLocations.length === 0) continue;
        if (!taskMatchesRequirementFilters(task, requirementOptions)) continue;

        // Check if any of the map group IDs are present in task locations
        if (mapIdGroup.some((id: string) => taskLocations.includes(id))) {
          // Check if task is available for the user
          const unlocked =
            activeUserView === 'all'
              ? isTaskUnlockedByAny(task.id)
              : isTaskUnlockedFor(task.id, activeUserView);
          if (unlocked) {
            let anyObjectiveLeft = false;
            const objectiveTouchesMap = (objective: TaskObjective | null | undefined) => {
              if (!objective) return false;
              const matchesId = (id?: string | null) => !!id && mapIdGroup.includes(id);
              if (Array.isArray(objective.maps) && objective.maps.some((m) => matchesId(m?.id))) {
                return true;
              }
              const objectiveLocation = objective.location as
                | { id?: string | null; map?: { id?: string | null } }
                | undefined;
              if (matchesId(objectiveLocation?.id)) {
                return true;
              }
              if (matchesId(objectiveLocation?.map?.id)) {
                return true;
              }
              if (
                Array.isArray(objective.possibleLocations) &&
                objective.possibleLocations.some((possibleLocation) =>
                  matchesId(possibleLocation?.map?.id)
                )
              ) {
                return true;
              }
              if (
                Array.isArray(objective.zones) &&
                objective.zones.some((zone) => matchesId(zone?.map?.id))
              ) {
                return true;
              }
              return false;
            };
            for (const objective of task.objectives || []) {
              if (!objectiveTouchesMap(objective)) continue;
              const completions = getObjectiveCompletionMap(objective.id);
              const isComplete =
                activeUserView === 'all'
                  ? visibleTeamIds.value.length > 0 &&
                    visibleTeamIds.value.every((id: string) => completions?.[id] === true)
                  : completions?.[activeUserView] === true;
              if (!isComplete) {
                anyObjectiveLeft = true;
                break;
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
   * Main function to update visible tasks based on all active filters
   *
   * Applies filtering in two stages:
   * 1. Primary view filter (maps/traders) - narrows down by selected map or trader
   * 2. Status and user filter (available/locked/completed) - filters by task availability
   *
   * Performance note: No deep cloning is performed. Filter functions create new arrays
   * as needed via .filter(), and filterTasksForAllUsers creates new objects with spread operator.
   *
   * @param activePrimaryView - Current primary view ('maps', 'traders', etc.)
   * @param activeSecondaryView - Current status filter ('available', 'locked', 'completed')
   * @param activeUserView - Current user selection ('all' or specific user ID)
   * @param activeMapView - Selected map ID (or 'all')
   * @param activeTraderView - Selected trader ID (or 'all')
   * @param tasksLoading - Whether tasks are currently loading (skips update if true)
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
      // No need for deep clone - filter functions create new arrays/objects as needed
      // filterTasksForAllUsers creates new objects with { ...task, neededBy }
      // Other filters only read properties and return new arrays via .filter()
      let visibleTaskList = tasks.value;
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
