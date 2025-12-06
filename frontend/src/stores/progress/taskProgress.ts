import { computed, type ComputedRef } from 'vue';
import { tasks, objectives } from '@/composables/tarkovdata';
import type { Task, TaskObjective } from '@/types/tarkov';
import { getCurrentGameModeData } from '../utils/gameModeHelpers';
import type {
  TeamStoresMap,
  CompletionsMap,
  TaskAvailabilityMap,
  ObjectiveCompletionsMap,
  FactionMap,
  TraderLevelsMap,
  TraderStandingMap,
} from './types';
import { TaskAvailabilityService } from '@/services/TaskAvailabilityService';
import type { UserProgressData } from '@/shared_state';

export interface TaskProgressDependencies {
  traderLevels: ComputedRef<TraderLevelsMap>;
  traderStandings: ComputedRef<TraderStandingMap>;
}

export function createTaskProgressGetters(
  stores: ComputedRef<TeamStoresMap>,
  { traderLevels, traderStandings }: TaskProgressDependencies
) {
  const tasksCompletions = computed<CompletionsMap>(() => {
    if (!tasks.value || !stores.value) return {};
    return buildTaskCompletionMap(tasks.value as Task[], stores.value);
  });

  const playerFaction = computed<FactionMap>(() => {
    if (!stores.value) return {};
    return buildFactionMap(stores.value);
  });

  const objectiveCompletions = computed<ObjectiveCompletionsMap>(() => {
    if (!objectives.value || !stores.value) return {};
    return buildObjectiveCompletionMap(objectives.value, stores.value);
  });

  const unlockedTasks = computed<TaskAvailabilityMap>(() => {
    if (!tasks.value || !stores.value) return {};

    const taskList = tasks.value as Task[];
    const taskMap = new Map<string, Task>(taskList.map((taskItem) => [taskItem.id, taskItem]));
    const service = new TaskAvailabilityService(
      taskMap,
      stores.value,
      tasksCompletions.value,
      traderLevels.value,
      traderStandings.value,
      playerFaction.value
    );

    return buildTaskAvailability(taskList, stores.value, service);
  });

  return {
    tasksCompletions,
    playerFaction,
    objectiveCompletions,
    unlockedTasks,
  };
}

function buildTaskCompletionMap(taskList: Task[], teamStores: TeamStoresMap): CompletionsMap {
  return taskList.reduce<CompletionsMap>((acc, task) => {
    acc[task.id] = completionStatusForTeams(task.id, teamStores);
    return acc;
  }, {});
}

function completionStatusForTeams(taskId: string, teamStores: TeamStoresMap) {
  return Object.entries(teamStores).reduce<Record<string, boolean>>((acc, [teamId, store]) => {
    const { currentData } = getCurrentGameModeData<UserProgressData | undefined>(store);
    acc[teamId] = currentData?.taskCompletions?.[taskId]?.complete ?? false;
    return acc;
  }, {});
}

function buildFactionMap(teamStores: TeamStoresMap): FactionMap {
  return Object.entries(teamStores).reduce<FactionMap>((acc, [teamId, store]) => {
    const { currentData } = getCurrentGameModeData<UserProgressData | undefined>(store);
    acc[teamId] = currentData?.pmcFaction ?? 'Unknown';
    return acc;
  }, {});
}

function buildObjectiveCompletionMap(objectiveList: TaskObjective[], teamStores: TeamStoresMap) {
  return objectiveList.reduce<ObjectiveCompletionsMap>((acc, objective) => {
    acc[objective.id] = Object.entries(teamStores).reduce<Record<string, boolean>>(
      (teamAcc, [teamId, store]) => {
        const { currentData } = getCurrentGameModeData<UserProgressData | undefined>(store);
        teamAcc[teamId] = currentData?.taskObjectives?.[objective.id]?.complete ?? false;
        return teamAcc;
      },
      {}
    );
    return acc;
  }, {});
}

function buildTaskAvailability(
  taskList: Task[],
  teamStores: TeamStoresMap,
  service: TaskAvailabilityService
): TaskAvailabilityMap {
  return taskList.reduce<TaskAvailabilityMap>((availability, task) => {
    availability[task.id] = evaluateTaskForTeams(task.id, teamStores, service);
    return availability;
  }, {});
}

function evaluateTaskForTeams(
  taskId: string,
  teamStores: TeamStoresMap,
  service: TaskAvailabilityService
) {
  return Object.keys(teamStores).reduce<Record<string, boolean>>((teamAvailability, teamId) => {
    teamAvailability[teamId] = service.evaluateAvailability(taskId, teamId);
    return teamAvailability;
  }, {});
}
