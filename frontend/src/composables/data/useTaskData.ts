import { ref, computed, watch } from 'vue';
import { useTarkovDataQuery } from '@/composables/api/useTarkovApi';
import {
  createGraph,
  getPredecessors,
  getSuccessors,
  getParents,
  getChildren,
  safeAddNode,
  safeAddEdge,
} from '@/composables/utils/graphHelpers';
import type {
  Task,
  TaskObjective,
  TaskRequirement,
  NeededItemTaskObjective,
  ObjectiveMapInfo,
  ObjectiveGPSInfo,
} from '@/types/tarkov';
import type Graph from 'graphology';

// Disabled tasks list
const DISABLED_TASKS: string[] = [
  '61e6e5e0f5b9633f6719ed95',
  '61e6e60223374d168a4576a6',
  '61e6e621bfeab00251576265',
  '61e6e615eea2935bc018a2c5',
  '61e6e60c5ca3b3783662be27',
];

/**
 * Composable for managing task data, relationships, and derived information
 */
export function useTaskData() {
  const { result: queryResult, error, loading } = useTarkovDataQuery();

  // Reactive state
  const tasks = ref<Task[]>([]);
  const taskGraph = ref(createGraph());
  const objectiveMaps = ref<{ [taskId: string]: ObjectiveMapInfo[] }>({});
  const alternativeTasks = ref<{ [taskId: string]: string[] }>({});
  const objectiveGPS = ref<{ [taskId: string]: ObjectiveGPSInfo[] }>({});
  const mapTasks = ref<{ [mapId: string]: string[] }>({});
  const neededItemTaskObjectives = ref<NeededItemTaskObjective[]>([]);

  // Computed properties
  const objectives = computed<TaskObjective[]>(() => {
    if (!tasks.value.length) return [];
    const allObjectives: TaskObjective[] = [];
    tasks.value.forEach((task) => {
      task.objectives?.forEach((obj) => {
        if (obj) {
          allObjectives.push({ ...obj, taskId: task.id });
        }
      });
    });
    return allObjectives;
  });

  const enabledTasks = computed(() =>
    tasks.value.filter((task) => !DISABLED_TASKS.includes(task.id))
  );

  /**
   * Builds the task graph from task requirements
   */
  const buildTaskGraph = (taskList: Task[]) => {
    const newGraph = createGraph();
    const activeRequirements: { task: Task; requirement: TaskRequirement }[] = [];

    // Add all tasks as nodes and process non-active requirements
    taskList.forEach((task) => {
      safeAddNode(newGraph, task.id);
      task.taskRequirements?.forEach((requirement) => {
        if (requirement?.task?.id) {
          if (requirement.status?.includes('active')) {
            activeRequirements.push({ task, requirement });
          } else {
            // Ensure the required task exists before adding edge
            if (taskList.some((t) => t.id === requirement.task.id)) {
              safeAddNode(newGraph, requirement.task.id);
              safeAddEdge(newGraph, requirement.task.id, task.id);
            }
          }
        }
      });
    });

    // Handle active requirements by linking predecessors
    activeRequirements.forEach(({ task, requirement }) => {
      const requiredTaskNodeId = requirement.task.id;
      if (newGraph.hasNode(requiredTaskNodeId)) {
        const predecessors = getParents(newGraph, requiredTaskNodeId);
        predecessors.forEach((predecessorId) => {
          safeAddEdge(newGraph, predecessorId, task.id);
        });
      }
    });

    return newGraph;
  };

  /**
   * Processes tasks to extract map, GPS, and item information
   */
  const processTaskData = (taskList: Task[]) => {
    const tempMapTasks: { [mapId: string]: string[] } = {};
    const tempObjectiveMaps: { [taskId: string]: ObjectiveMapInfo[] } = {};
    const tempObjectiveGPS: { [taskId: string]: ObjectiveGPSInfo[] } = {};
    const tempAlternativeTasks: { [taskId: string]: string[] } = {};
    const tempNeededObjectives: NeededItemTaskObjective[] = [];

    taskList.forEach((task) => {
      // Process finish rewards for alternative tasks
      if (Array.isArray(task.finishRewards)) {
        task.finishRewards.forEach((reward) => {
          if (
            reward?.__typename === 'QuestStatusReward' &&
            reward.status === 'Fail' &&
            reward.quest?.id
          ) {
            if (!tempAlternativeTasks[reward.quest.id]) {
              tempAlternativeTasks[reward.quest.id] = [];
            }
            tempAlternativeTasks[reward.quest.id].push(task.id);
          }
        });
      }

      // Process objectives
      task.objectives?.forEach((objective) => {
        // Map and location data
        if (objective?.location?.id) {
          const mapId = objective.location.id;
          if (!tempMapTasks[mapId]) {
            tempMapTasks[mapId] = [];
          }
          if (!tempMapTasks[mapId].includes(task.id)) {
            tempMapTasks[mapId].push(task.id);
          }

          if (!tempObjectiveMaps[task.id]) {
            tempObjectiveMaps[task.id] = [];
          }
          tempObjectiveMaps[task.id].push({
            objectiveID: String(objective.id),
            mapID: String(mapId),
          });

          // GPS coordinates
          if (objective.x !== undefined && objective.y !== undefined) {
            if (!tempObjectiveGPS[task.id]) {
              tempObjectiveGPS[task.id] = [];
            }
            tempObjectiveGPS[task.id].push({
              objectiveID: objective.id,
              x: objective.x,
              y: objective.y,
            });
          }
        }

        // Item requirements
        if (objective?.item?.id || objective?.markerItem?.id) {
          tempNeededObjectives.push({
            id: objective.id,
            needType: 'taskObjective',
            taskId: task.id,
            type: objective.type,
            item: objective.item!,
            markerItem: objective.markerItem,
            count: objective.count ?? 1,
            foundInRaid: objective.foundInRaid ?? false,
          });
        }
      });
    });

    return {
      tempMapTasks,
      tempObjectiveMaps,
      tempObjectiveGPS,
      tempAlternativeTasks,
      tempNeededObjectives,
    };
  };

  /**
   * Enhances tasks with graph relationship data
   */
  const enhanceTasksWithRelationships = (taskList: Task[], graph: Graph) => {
    return taskList.map((task) => ({
      ...task,
      traderIcon: task.trader?.imageLink,
      predecessors: getPredecessors(graph, task.id),
      successors: getSuccessors(graph, task.id),
      parents: getParents(graph, task.id),
      children: getChildren(graph, task.id),
    }));
  };

  // Watch for query result changes
  watch(
    queryResult,
    (newResult) => {
      if (newResult?.tasks) {
        const newGraph = buildTaskGraph(newResult.tasks);
        const processedData = processTaskData(newResult.tasks);
        const enhancedTasks = enhanceTasksWithRelationships(
          newResult.tasks,
          newGraph
        );

        // Update reactive state
        tasks.value = enhancedTasks;
        taskGraph.value = newGraph;
        mapTasks.value = processedData.tempMapTasks;
        objectiveMaps.value = processedData.tempObjectiveMaps;
        objectiveGPS.value = processedData.tempObjectiveGPS;
        alternativeTasks.value = processedData.tempAlternativeTasks;
        neededItemTaskObjectives.value = processedData.tempNeededObjectives;
      } else {
        // Reset state if no data
        tasks.value = [];
        taskGraph.value = createGraph();
        mapTasks.value = {};
        objectiveMaps.value = {};
        objectiveGPS.value = {};
        alternativeTasks.value = {};
        neededItemTaskObjectives.value = [];
      }
    },
    { immediate: true }
  );
  /**
   * Get task by ID
   */
  const getTaskById = (taskId: string): Task | undefined => {
    return tasks.value.find((task) => task.id === taskId);
  };
  /**
   * Get tasks by trader
   */
  const getTasksByTrader = (traderId: string): Task[] => {
    return tasks.value.filter((task) => task.trader?.id === traderId);
  };
  /**
   * Get tasks by map
   */
  const getTasksByMap = (mapId: string): Task[] => {
    const taskIds = mapTasks.value[mapId] || [];
    return tasks.value.filter((task) => taskIds.includes(task.id));
  };
  /**
   * Check if task is prerequisite for another task
   */
  const isPrerequisiteFor = (taskId: string, targetTaskId: string): boolean => {
    const targetTask = getTaskById(targetTaskId);
    return targetTask?.predecessors?.includes(taskId) ?? false;
  };
  return {
    // Reactive data
    tasks,
    enabledTasks,
    taskGraph,
    objectives,
    objectiveMaps,
    alternativeTasks,
    objectiveGPS,
    mapTasks,
    neededItemTaskObjectives,
    // Loading states
    loading,
    error,
    // Utility functions
    getTaskById,
    getTasksByTrader,
    getTasksByMap,
    isPrerequisiteFor,
    // Constants
    disabledTasks: DISABLED_TASKS,
  };
}
