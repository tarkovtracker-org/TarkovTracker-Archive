// Re-export the new modular composables for backward compatibility
export {
  useTarkovApi,
  useTarkovDataQuery,
  useTarkovHideoutQuery,
} from '@/composables/api/useTarkovApi';
export { useTaskData } from '@/composables/data/useTaskData';
export { useHideoutData } from '@/composables/data/useHideoutData';
export { useMapData, useTraderData, usePlayerLevelData } from '@/composables/data/useMapData';
// Re-export types for backward compatibility
export type { Task } from '@/types/tarkov';
import { computed, ref, watch } from 'vue';
import { DISABLED_TASK_IDS } from '@/config/gameConstants';
import { useTarkovApi } from '@/composables/api/useTarkovApi';
import { useTaskData } from '@/composables/data/useTaskData';
import { useHideoutData } from '@/composables/data/useHideoutData';
import { useMapData, useTraderData, usePlayerLevelData } from '@/composables/data/useMapData';
import { createGraph } from '@/composables/utils/graphHelpers';
import type {
  TarkovDataComposable,
  Task,
  TaskObjective,
  TarkovMap,
  Trader,
  PlayerLevel,
  HideoutStation,
  HideoutModule,
  NeededItemTaskObjective,
  NeededItemHideoutModule,
  ObjectiveMapInfo,
  ObjectiveGPSInfo,
} from '@/types/tarkov';
import type Graph from 'graphology';

type SyncSource<T> = { readonly value: T };
type SyncTarget<T> = { value: T };

// These watchers intentionally live for the app lifetime to keep module-level state in sync.
// For tests or HMR teardown we expose optional cleanup by returning the watcher stop handle.
const sync = <T>(source: SyncSource<T>, target: SyncTarget<T>) =>
  watch(
    () => source.value,
    (value) => {
      target.value = value;
    },
    { immediate: true }
  );
// Global state variables for backward compatibility
// These will be initialized when useTarkovData is first called
let globalTaskData: ReturnType<typeof useTaskData> | null = null;
let globalHideoutData: ReturnType<typeof useHideoutData> | null = null;
let globalMapData: ReturnType<typeof useMapData> | null = null;
let globalTraderData: ReturnType<typeof useTraderData> | null = null;
let globalPlayerData: ReturnType<typeof usePlayerLevelData> | null = null;
let globalApiData: ReturnType<typeof useTarkovApi> | null = null;
// Ensure sync watchers are registered only once across composable invocations
let syncInitialized = false;
const syncStops: Array<() => void> = [];
// Initialize function to be called within setup context
function initializeGlobalData() {
  if (!globalTaskData) {
    globalTaskData = useTaskData();
    globalHideoutData = useHideoutData();
    globalMapData = useMapData();
    globalTraderData = useTraderData();
    globalPlayerData = usePlayerLevelData();
    globalApiData = useTarkovApi();

    // Global composables initialize synchronously; non-null assertions are safe
  }
}
// Re-export for backward compatibility - these will be empty until useTarkovData is called
export const hideoutStations = ref<HideoutStation[]>([]);
export const hideoutModules = ref<HideoutModule[]>([]);
export const hideoutGraph = ref<Graph>(createGraph());
export const tasks = ref<Task[]>([]);
export const taskGraph = ref<Graph>(createGraph());
export const objectiveMaps = ref<Record<string, ObjectiveMapInfo[]>>({});
export const alternativeTasks = ref<Record<string, string[]>>({});
export const objectiveGPS = ref<Record<string, ObjectiveGPSInfo[]>>({});
export const mapTasks = ref<Record<string, string[]>>({});
export const neededItemTaskObjectives = ref<NeededItemTaskObjective[]>([]);
export const neededItemHideoutModules = ref<NeededItemHideoutModule[]>([]);
export const loading = ref<boolean>(false);
export const hideoutLoading = ref<boolean>(false);
// Map loading functionality moved to @/composables/api/useTarkovApi.ts
// Helper functions moved to @/composables/utils/graphHelpers.ts
// Language extraction moved to @/composables/api/useTarkovApi.ts
// Disabled tasks moved to @/config/gameConstants.ts
// Watchers moved to individual data composables
// Task processing moved to @/composables/data/useTaskData.ts
// Computed properties moved to individual data composables
export const objectives = ref<TaskObjective[]>([]);
export const maps = ref<TarkovMap[]>([]);
export const traders = ref<Trader[]>([]);
export const playerLevels = ref<PlayerLevel[]>([]);
const minPlayerLevel = ref<number>(1);
const maxPlayerLevel = ref<number>(79);

function initializeSyncWatchers() {
  if (syncInitialized) {
    return;
  }

  initializeGlobalData();

  const localStops: Array<() => void> = [];
  try {
    const taskData = globalTaskData!;
    const hideoutData = globalHideoutData!;
    const mapData = globalMapData!;
    const traderData = globalTraderData!;
    const playerData = globalPlayerData!;

    localStops.push(sync(hideoutData.hideoutStations, hideoutStations));
    localStops.push(sync(hideoutData.hideoutModules, hideoutModules));
    localStops.push(sync(hideoutData.hideoutGraph, hideoutGraph));
    localStops.push(sync(taskData.tasks, tasks));
    localStops.push(sync(taskData.taskGraph, taskGraph));
    localStops.push(sync(taskData.objectiveMaps, objectiveMaps));
    localStops.push(sync(taskData.alternativeTasks, alternativeTasks));
    localStops.push(sync(taskData.objectiveGPS, objectiveGPS));
    localStops.push(sync(taskData.mapTasks, mapTasks));
    localStops.push(sync(taskData.neededItemTaskObjectives, neededItemTaskObjectives));
    localStops.push(sync(hideoutData.neededItemHideoutModules, neededItemHideoutModules));
    localStops.push(sync(taskData.loading, loading));
    localStops.push(sync(hideoutData.loading, hideoutLoading));
    localStops.push(sync(taskData.objectives, objectives));
    localStops.push(sync(mapData.maps, maps));
    localStops.push(sync(traderData.traders, traders));
    localStops.push(sync(playerData.playerLevels, playerLevels));
    localStops.push(sync(playerData.minPlayerLevel, minPlayerLevel));
    localStops.push(sync(playerData.maxPlayerLevel, maxPlayerLevel));

    syncStops.push(...localStops);
    syncInitialized = true;
  } catch (error) {
    localStops.forEach((stop) => stop());
    throw error;
  }
}

export function stopAllSyncWatchers() {
  while (syncStops.length) syncStops.pop()?.();
  syncInitialized = false;
}
/**
 * Main composable that provides backward compatibility
 * while using the new modular structure under the hood
 */
export function useTarkovData(): TarkovDataComposable {
  // Initialize global data when called from a setup function
  initializeGlobalData();
  // Use the now-initialized global data
  const api = globalApiData!;
  const taskData = globalTaskData!;
  const hideoutData = globalHideoutData!;
  const mapData = globalMapData!;
  const traderData = globalTraderData!;
  const playerData = globalPlayerData!;
  initializeSyncWatchers();
  // Return the combined interface for backward compatibility
  return {
    availableLanguages: api.availableLanguages,
    languageCode: api.languageCode,
    queryErrors: taskData.error,
    queryResults: computed(() => null), // Legacy field, not used in new structure
    lastQueryTime: computed(() => Date.now()), // Legacy field
    loading: taskData.loading,
    hideoutLoading: hideoutData.loading,
    queryHideoutErrors: hideoutData.error,
    queryHideoutResults: computed(() => null), // Legacy field
    lastHideoutQueryTime: computed(() => Date.now()), // Legacy field
    hideoutStations: hideoutData.hideoutStations,
    hideoutModules: hideoutData.hideoutModules,
    hideoutGraph: hideoutData.hideoutGraph,
    tasks: taskData.tasks,
    taskGraph: taskData.taskGraph,
    objectiveMaps: taskData.objectiveMaps,
    alternativeTasks: taskData.alternativeTasks,
    objectiveGPS: taskData.objectiveGPS,
    mapTasks: taskData.mapTasks,
    objectives: taskData.objectives,
    maps: mapData.maps,
    rawMaps: mapData.rawMaps, // Includes all maps with variants for normalization
    traders: traderData.traders,
    neededItemTaskObjectives: taskData.neededItemTaskObjectives,
    neededItemHideoutModules: hideoutData.neededItemHideoutModules,
    disabledTasks: [...DISABLED_TASK_IDS],
    playerLevels: playerData.playerLevels,
    minPlayerLevel: playerData.minPlayerLevel,
    maxPlayerLevel: playerData.maxPlayerLevel,
  };
}
