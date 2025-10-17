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
import { computed, ref } from 'vue';
import { DISABLED_TASK_IDS } from '@/config/gameConstants';
import { useTarkovApi } from '@/composables/api/useTarkovApi';
import { useTaskData } from '@/composables/data/useTaskData';
import { useHideoutData } from '@/composables/data/useHideoutData';
import { useMapData, useTraderData, usePlayerLevelData } from '@/composables/data/useMapData';
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
} from '@/types/tarkov';
import type { AbstractGraph } from 'graphology-types';
// Global state variables for backward compatibility
// These will be initialized when useTarkovData is first called
let globalTaskData: ReturnType<typeof useTaskData> | null = null;
let globalHideoutData: ReturnType<typeof useHideoutData> | null = null;
let globalMapData: ReturnType<typeof useMapData> | null = null;
let globalTraderData: ReturnType<typeof useTraderData> | null = null;
let globalPlayerData: ReturnType<typeof usePlayerLevelData> | null = null;
let globalApiData: ReturnType<typeof useTarkovApi> | null = null;
// Initialize function to be called within setup context
function initializeGlobalData() {
  if (!globalTaskData) {
    globalTaskData = useTaskData();
    globalHideoutData = useHideoutData();
    globalMapData = useMapData();
    globalTraderData = useTraderData();
    globalPlayerData = usePlayerLevelData();
    globalApiData = useTarkovApi();
  }
}
// Re-export for backward compatibility - these will be empty until useTarkovData is called
export const hideoutStations = ref<HideoutStation[]>([]);
export const hideoutModules = ref<HideoutModule[]>([]);
export const hideoutGraph = ref<AbstractGraph | null>(null);
export const tasks = ref<Task[]>([]);
export const taskGraph = ref<AbstractGraph | null>(null);
export const objectiveMaps = ref<Record<string, unknown>>({});
export const alternativeTasks = ref<Record<string, unknown>>({});
export const objectiveGPS = ref<Record<string, unknown>>({});
export const mapTasks = ref<Record<string, unknown>>({});
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
  // Update the exported refs with the real data
  hideoutStations.value = hideoutData.hideoutStations.value;
  hideoutModules.value = hideoutData.hideoutModules.value;
  hideoutGraph.value = hideoutData.hideoutGraph.value;
  tasks.value = taskData.tasks.value;
  taskGraph.value = taskData.taskGraph.value;
  objectiveMaps.value = taskData.objectiveMaps.value;
  alternativeTasks.value = taskData.alternativeTasks.value;
  objectiveGPS.value = taskData.objectiveGPS.value;
  mapTasks.value = taskData.mapTasks.value;
  objectives.value = taskData.objectives.value;
  maps.value = mapData.maps.value;
  traders.value = traderData.traders.value;
  playerLevels.value = playerData.playerLevels.value;
  minPlayerLevel.value = playerData.minPlayerLevel.value;
  maxPlayerLevel.value = playerData.maxPlayerLevel.value;
  neededItemTaskObjectives.value = taskData.neededItemTaskObjectives.value;
  neededItemHideoutModules.value = hideoutData.neededItemHideoutModules.value;
  loading.value = taskData.loading.value;
  hideoutLoading.value = hideoutData.loading.value;
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
