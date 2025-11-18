import { ref, computed, watch, onBeforeUnmount, type ComputedRef } from 'vue';
import { useCollection, useDocument } from 'vuefire';
import { collection, doc, query, where } from 'firebase/firestore';
import { firestore } from '@/plugins/firebase';
import {
  isIdleCallbackSupported,
  safeRequestIdleCallback,
  safeCancelIdleCallback,
} from '@/utils/idleCallback';
import { useTarkovStore } from '@/stores/tarkov';
import { DISABLED_TASK_IDS, EOD_ONLY_TASK_IDS } from '@/config/gameConstants';
import { isDevAuthEnabled } from '@/utils/devAuth';
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
  TarkovItem,
  RequiredKey,
  Key,
} from '@/types/models/tarkov';
import type Graph from 'graphology';
import { logger } from '@/utils/logger';
import { debounce } from '@/utils/debounce';
import { useTarkovDataQuery } from '@/composables/api/useTarkovApi';
// Timeout for idle callback processing
const IDLE_CALLBACK_TIMEOUT_MS = 2000;
const TASK_IDLE_DEFER_THRESHOLD = 400;
/**
 * Composable for managing task data, relationships, and derived information
 * Migrated from GraphQL to Firestore for improved performance
 */
export function useTaskData(gameMode?: ComputedRef<string>) {
  const store = useTarkovStore();

  // Get current gamemode from store if not provided
  const currentGameMode =
    gameMode ||
    computed(() => {
      const mode = store.getCurrentGameMode();
      return mode === 'pve' ? 'pve' : 'regular';
    });
  // Map UI gamemode to the value stored on shards (pvp → regular)
  const shardGameMode = computed(() => (currentGameMode.value === 'pvp' ? 'regular' : currentGameMode.value || 'regular'));
  let cancelDeferredProcessing: (() => void) | null = null;
  let isMounted = true;

  // Skip Firestore when dev auth is enabled (emulators not running)
  const skipFirestore = isDevAuthEnabled();
  if (skipFirestore) {
    logger.info('[useTaskData] Dev auth enabled - skipping Firestore task data (tasks will be empty)');
  }

  // Get tasks from Firestore (only when not in dev auth mode)
  const tasksQuery = computed(() =>
    skipFirestore
      ? null
      : query(
          collection(firestore, 'tarkovData', 'tasks', 'shards'),
          where('gameMode', '==', shardGameMode.value)
        )
  );
  const taskDataRef = skipFirestore
    ? { data: ref([]), error: ref(null), pending: ref(false), promise: ref(Promise.resolve([])) }
    : useCollection(tasksQuery, {
        ssrKey: 'tarkov-task-shards',
      });
  const taskShards = taskDataRef.data;
  // Fallback to the non-sharded document written by the scheduled importer
  const tasksDocRef = skipFirestore ? null : doc(firestore, 'tarkovData', 'tasks');
  const tasksDoc = skipFirestore
    ? { data: ref(null), error: ref(null) }
    : useDocument(tasksDocRef!, { ssrKey: 'tarkov-task-doc' });
  // Only use GraphQL when we truly have no cached task data yet
  const useGqlFallback = computed(() => {
    const shardHasData =
      Array.isArray(taskShards.value) &&
      taskShards.value.some((s) => Array.isArray(s?.data) && s.data.length > 0);
    const docHasData =
      Array.isArray((tasksDoc.data?.value as { data?: Task[] } | null)?.data) &&
      ((tasksDoc.data?.value as { data?: Task[] } | null)?.data?.length || 0) > 0;
    return !shardHasData && !docHasData;
  });

  // GraphQL fallback (only when both shards AND doc are empty)
  const { result: gqlResult, loading: gqlLoading, error: gqlError } = useTarkovDataQuery(
    shardGameMode as ComputedRef<string>
  );
  const errorState = ref<Error | null>(null);
  watch(
    [taskShards, tasksDoc.data, gqlResult, taskDataRef.error, tasksDoc.error ?? ref(null), gqlError],
([shardDocs, shardDocData, gqlRes, shardErr, docErrRef, gqlErr]) => {
      const shardHasData =
        Array.isArray(shardDocs) &&
        shardDocs.some((shard) => Array.isArray(shard?.data) && shard.data.length > 0);
      const docHasData =
        shardDocData &&
        Array.isArray(shardDocData.data) &&
        shardDocData.data.length > 0;
      const gqlHasData = Boolean(gqlRes?.tasks?.length);
      const hasAnyData = shardHasData || docHasData || gqlHasData;
      const hasShardError = shardErr != null;
      const hasDocError = docErrRef != null;
      const hasGqlError = gqlErr != null;
      const hasAnyError = hasShardError || hasDocError || hasGqlError;
      if (hasAnyError && !hasAnyData) {
        errorState.value =
          shardErr ||
          docErrRef?.value ||
          gqlErr ||
          new Error('Failed to load Tarkov tasks from all sources');
      } else {
        errorState.value = null;
      }
    },
    { immediate: true }
  );
  const error = computed(() => errorState.value);
  const loading = computed(
    () => (taskDataRef.pending?.value ?? false) || (useGqlFallback.value && gqlLoading.value)
  );

  // Process Firestore data into the expected format
  const queryResult = computed(() => {
    if (taskShards.value && taskShards.value.length > 0) {
      // Aggregate tasks from all shards
      const allTasks = taskShards.value.flatMap((shard) => shard.data || []);
      if (allTasks.length) {
        return { tasks: allTasks };
      }
    }
    // Fallback: GraphQL live data
    if (useGqlFallback.value && gqlResult.value?.tasks?.length) {
      return { tasks: gqlResult.value.tasks as Task[] };
    }
    // Fallback: scheduled importer stores tasks as a single document at tarkovData/tasks
    const docTasks = (tasksDoc.data?.value as { data?: Task[] } | null)?.data;
    return { tasks: Array.isArray(docTasks) ? docTasks : [] };
  });
  // Reactive state
  const tasks = ref<Task[]>([]);
  const taskGraph = ref(createGraph());
  const objectiveMaps = ref<{ [taskId: string]: ObjectiveMapInfo[] }>({});
  const alternativeTasks = ref<{ [taskId: string]: string[] }>({});
  const objectiveGPS = ref<{ [taskId: string]: ObjectiveGPSInfo[] }>({});
  const mapTasks = ref<{ [mapId: string]: string[] }>({});
  const neededItemTaskObjectives = ref<NeededItemTaskObjective[]>([]);
  const isDerivingTaskData = ref(false);
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
    tasks.value.filter((task) => !DISABLED_TASK_IDS.includes(task.id))
  );
  // Builds the task graph from task requirements
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
        // Item requirements - handle both new 'items' array and legacy 'item'
        const candidateItems: TarkovItem[] = [];
        if (objective?.item) {
          candidateItems.push(objective.item);
        }
        if (Array.isArray(objective?.items)) {
          objective.items
            .filter((candidate): candidate is TarkovItem => Boolean(candidate))
            .forEach((candidate) => candidateItems.push(candidate));
        }
        const dedupedItems: TarkovItem[] = [];
        const seenItemIds = new Set<string>();
        candidateItems.forEach((candidate) => {
          if (!candidate) {
            return;
          }
          if (candidate.id) {
            if (seenItemIds.has(candidate.id)) {
              return;
            }
            seenItemIds.add(candidate.id);
          }
          dedupedItems.push(candidate);
        });
        if (dedupedItems.length > 0) {
          // Use the first deduped item as representative because all entries share the same item id
          const representativeItem = dedupedItems[0];
          tempNeededObjectives.push({
            id: objective.id,
            needType: 'taskObjective',
            taskId: task.id,
            type: objective.type,
            item: representativeItem,
            alternativeItems: dedupedItems,
            markerItem: objective.markerItem,
            count: objective.count ?? 1,
            foundInRaid: objective.foundInRaid ?? false,
          });
        } else if (objective?.markerItem?.id) {
          tempNeededObjectives.push({
            id: objective.id,
            needType: 'taskObjective',
            taskId: task.id,
            type: objective.type,
            item: undefined,
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
  const resetTaskState = () => {
    tasks.value = [];
    taskGraph.value = createGraph();
    mapTasks.value = {};
    objectiveMaps.value = {};
    objectiveGPS.value = {};
    alternativeTasks.value = {};
    neededItemTaskObjectives.value = [];
  };
  /**
   * Collects required keys from task objectives to replace deprecated neededKeys
   * Falls back to legacy neededKeys if no requiredKeys found on objectives
   */
  const getRequiredKeysFromObjectives = (task: Task) => {
    const requiredKeys: RequiredKey[] = [];
    // First try to collect from objectives.requiredKeys
    task.objectives?.forEach((objective) => {
      if (objective?.requiredKeys) {
        const keys = Array.isArray(objective.requiredKeys)
          ? objective.requiredKeys
          : [objective.requiredKeys];
        const objectiveMaps =
          Array.isArray(objective.maps) && objective.maps.length > 0 ? objective.maps : [null];
        keys.forEach((key: Key) => {
          if (!key) {
            return;
          }
          objectiveMaps.forEach((map) => {
            const mapId = map?.id ?? null;
            const existingMapEntry = requiredKeys.find(
              (entry) => (entry.map?.id ?? null) === mapId
            );
            if (existingMapEntry) {
              if (key.id && !existingMapEntry.keys.some((k: Key) => k.id === key.id)) {
                existingMapEntry.keys.push(key);
              } else if (
                !key.id &&
                !existingMapEntry.keys.some(
                  (k: Key) => k.id === key.id || JSON.stringify(k) === JSON.stringify(key)
                )
              ) {
                existingMapEntry.keys.push(key);
              }
            } else {
              requiredKeys.push({
                keys: key.id ? [key] : [key],
                map: map ?? null,
              });
            }
          });
        });
      }
    });
    // If no keys found from objectives and legacy neededKeys exists, use that
    if (requiredKeys.length === 0 && task.neededKeys && Array.isArray(task.neededKeys)) {
      return task.neededKeys;
    }
    return requiredKeys;
  };
  /**
   * Enhances tasks with graph relationship data and computed required keys
   */
  const enhanceTasksWithRelationships = (taskList: Task[], graph: Graph) => {
    return taskList.map((task) => ({
      ...task,
      eodOnly: EOD_ONLY_TASK_IDS.has(task.id),
      traderIcon: task.trader?.imageLink,
      predecessors: getPredecessors(graph, task.id),
      successors: getSuccessors(graph, task.id),
      parents: getParents(graph, task.id),
      children: getChildren(graph, task.id),
      // Compute neededKeys from objectives with fallback to legacy field
      neededKeys: getRequiredKeysFromObjectives(task),
    }));
  };
  // Watch for query result changes
  const scheduleTaskProcessing = (taskList: Task[]) => {
    if (cancelDeferredProcessing) {
      cancelDeferredProcessing();
      cancelDeferredProcessing = null;
    }
    if (taskList.length === 0) {
      resetTaskState();
      isDerivingTaskData.value = false;
      return;
    }
    const runProcessing = () => {
      try {
        if (!isMounted) {
          return;
        }
        const newGraph = buildTaskGraph(taskList);
        const processedData = processTaskData(taskList);
        const enhancedTasks = enhanceTasksWithRelationships(taskList, newGraph);
        if (!isMounted) {
          return;
        }
        tasks.value = enhancedTasks;
        taskGraph.value = newGraph;
        mapTasks.value = processedData.tempMapTasks;
        objectiveMaps.value = processedData.tempObjectiveMaps;
        objectiveGPS.value = processedData.tempObjectiveGPS;
        alternativeTasks.value = processedData.tempAlternativeTasks;
        neededItemTaskObjectives.value = processedData.tempNeededObjectives;
      } catch (error) {
        logger.error('Error processing task data:', error);
        resetTaskState();
      } finally {
        isDerivingTaskData.value = false;
        cancelDeferredProcessing = null;
      }
    };
    if (!isMounted) {
      return;
    }
    isDerivingTaskData.value = true;
    if (typeof window === 'undefined') {
      runProcessing();
      return;
    }
    const canUseIdleCallback =
      taskList.length >= TASK_IDLE_DEFER_THRESHOLD && isIdleCallbackSupported();
    if (!canUseIdleCallback) {
      let cancelled = false;
      cancelDeferredProcessing = () => {
        cancelled = true;
        isDerivingTaskData.value = false;
      };
      const invoke = () => {
        if (cancelled) {
          return;
        }
        runProcessing();
      };
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(invoke);
      } else {
        Promise.resolve().then(invoke);
      }
      return;
    }
    const handle = safeRequestIdleCallback(
      () => {
        runProcessing();
      },
      { timeout: IDLE_CALLBACK_TIMEOUT_MS }
    );
    cancelDeferredProcessing = () => {
      isDerivingTaskData.value = false;
      safeCancelIdleCallback(handle);
    };
  };
  const debouncedScheduleTaskProcessing = debounce(scheduleTaskProcessing, 150);

  watch(
    queryResult,
    (newResult) => {
      debouncedScheduleTaskProcessing(newResult?.tasks ?? []);
    },
    { immediate: true, flush: 'post' }
  );
  onBeforeUnmount(() => {
    isMounted = false;
    if (cancelDeferredProcessing) {
      cancelDeferredProcessing();
      cancelDeferredProcessing = null;
    }
    debouncedScheduleTaskProcessing?.cancel?.();
  });
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
    disabledTasks: [...DISABLED_TASK_IDS],
    derivedTaskLoading: isDerivingTaskData,
  };
}
