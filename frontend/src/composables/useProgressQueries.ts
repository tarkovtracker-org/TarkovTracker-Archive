import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useProgressStore } from '@/stores/progress';

type TaskId = string;
type TeamId = string;
type ObjectiveId = string;
type StationId = string;
type ModuleId = string;
type ModulePartId = string;

export function useProgressQueries() {
  const progressStore = useProgressStore();
  const {
    visibleTeamStores,
    unlockedTasks,
    tasksCompletions,
    moduleCompletions,
    modulePartCompletions,
    objectiveCompletions,
    playerFaction,
    hideoutLevels,
    traderLevelsAchieved,
    traderStandings,
    gameEditionData,
  } = storeToRefs(progressStore);

  const visibleTeamIds = computed(() => Object.keys(visibleTeamStores.value ?? {}));

  const getUnlockedMap = (taskId: TaskId) => unlockedTasks.value?.[taskId] ?? {};
  const getTaskCompletionMap = (taskId: TaskId) => tasksCompletions.value?.[taskId] ?? {};
  const getObjectiveCompletionMap = (objectiveId: ObjectiveId) =>
    objectiveCompletions.value?.[objectiveId] ?? {};
  const getHideoutLevelMap = (stationId: StationId) => hideoutLevels.value?.[stationId] ?? {};
  const getModuleCompletionMap = (moduleId: ModuleId) => moduleCompletions.value?.[moduleId] ?? {};
  const getModulePartCompletionMap = (partId: ModulePartId) =>
    modulePartCompletions.value?.[partId] ?? {};

  const isTaskUnlockedFor = (taskId: TaskId, teamId: TeamId) =>
    getUnlockedMap(taskId)?.[teamId] === true;
  const isTaskCompletedFor = (taskId: TaskId, teamId: TeamId) =>
    getTaskCompletionMap(taskId)?.[teamId] === true;
  const isObjectiveIncompleteFor = (objectiveId: ObjectiveId, teamId: TeamId) =>
    getObjectiveCompletionMap(objectiveId)?.[teamId] === false;
  const isTaskUnlockedByAny = (taskId: TaskId) =>
    Object.values(getUnlockedMap(taskId)).some(Boolean);

  const getDisplayName = (teamId: TeamId) => progressStore.getDisplayName(teamId);
  const getLevel = (teamId: TeamId) => progressStore.getLevel(teamId);
  const getFaction = (teamId: TeamId) => progressStore.getFaction(teamId);

  const getHideoutLevelFor = (stationId: StationId, teamId: TeamId) =>
    getHideoutLevelMap(stationId)?.[teamId] ?? 0;
  const isModuleCompleteFor = (moduleId: ModuleId, teamId: TeamId) =>
    getModuleCompletionMap(moduleId)?.[teamId] === true;

  return {
    // underlying store & refs
    progressStore,
    visibleTeamStores,
    unlockedTasks,
    tasksCompletions,
    moduleCompletions,
    modulePartCompletions,
    objectiveCompletions,
    playerFaction,
    hideoutLevels,
    traderLevelsAchieved,
    traderStandings,
    gameEditionData,
    // derived helpers
    visibleTeamIds,
    getDisplayName,
    getLevel,
    getFaction,
    getUnlockedMap,
    getTaskCompletionMap,
    getObjectiveCompletionMap,
    isTaskUnlockedFor,
    isTaskUnlockedByAny,
    isTaskCompletedFor,
    isObjectiveIncompleteFor,
    getHideoutLevelFor,
    getModuleCompletionMap,
    getModulePartCompletionMap,
    isModuleCompleteFor,
  };
}
