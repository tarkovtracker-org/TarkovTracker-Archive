import { ref, computed, watch } from 'vue';
import { useTarkovHideoutQuery } from '@/composables/api/useTarkovApi';
import { useTarkovStore } from '@/stores/tarkov';
import {
  createGraph,
  getPredecessors,
  getSuccessors,
  getParents,
  getChildren,
  safeAddNode,
  safeAddEdge,
} from '@/composables/utils/graphHelpers';
import type { HideoutStation, HideoutModule, NeededItemHideoutModule } from '@/types/tarkov';
import type { AbstractGraph } from 'graphology-types';
import { logger } from '@/utils/logger';
/**
 * Composable for managing hideout data, station relationships, and requirements
 */
export function useHideoutData() {
  const store = useTarkovStore();

  // Get current gamemode from store and convert to the format expected by API
  const currentGameMode = computed(() => {
    const mode = store.getCurrentGameMode();
    return mode === 'pve' ? 'pve' : 'regular'; // API expects 'regular' for PvP, 'pve' for PvE
  });

  const { result: queryResult, error, loading } = useTarkovHideoutQuery(currentGameMode);
  // Reactive state
  const hideoutStations = ref<HideoutStation[]>([]);
  const hideoutModules = ref<HideoutModule[]>([]);
  const hideoutGraph = ref(createGraph());
  const neededItemHideoutModules = ref<NeededItemHideoutModule[]>([]);
  /**
   * Builds the hideout dependency graph from station level requirements
   */
  const buildHideoutGraph = (stations: HideoutStation[]) => {
    const newGraph = createGraph();
    if (!Array.isArray(stations) || stations.length === 0) {
      return newGraph;
    }

    const levelLookup = new Map<string, string>();

    stations.forEach((station) => {
      station.levels.forEach((level) => {
        safeAddNode(newGraph, level.id);
        levelLookup.set(`${station.id}:${level.level}`, level.id);
      });
    });

    stations.forEach((station) => {
      station.levels.forEach((level) => {
        level.stationLevelRequirements?.forEach((requirement) => {
          const requiredStationId = requirement?.station?.id;
          if (!requiredStationId) {
            return;
          }

          const requiredLevelId = levelLookup.get(`${requiredStationId}:${requirement.level}`);
          if (requiredLevelId) {
            safeAddEdge(newGraph, requiredLevelId, level.id);
          } else {
            logger.warn(
              `Could not find required level ID for station ${requiredStationId} ` +
                `level ${requirement.level} needed by ${level.id}`
            );
          }
        });
      });
    });

    return newGraph;
  };
  /**
   * Converts hideout levels to modules with relationship data
   */
  const createHideoutModules = (
    stations: HideoutStation[],
    graph: AbstractGraph
  ): HideoutModule[] => {
    const modules: HideoutModule[] = [];
    stations.forEach((station) => {
      station.levels.forEach((level) => {
        const moduleData: HideoutModule = {
          ...level,
          stationId: station.id,
          predecessors: getPredecessors(graph, level.id),
          successors: getSuccessors(graph, level.id),
          parents: getParents(graph, level.id),
          children: getChildren(graph, level.id),
        };
        modules.push(moduleData);
      });
    });
    return modules;
  };
  /**
   * Extracts item requirements from hideout modules
   */
  const extractItemRequirements = (modules: HideoutModule[]): NeededItemHideoutModule[] => {
    const neededItems: NeededItemHideoutModule[] = [];
    modules.forEach((module) => {
      module.itemRequirements?.forEach((req) => {
        if (req?.item?.id) {
          neededItems.push({
            id: req.id,
            needType: 'hideoutModule',
            hideoutModule: { ...module },
            item: req.item,
            count: req.count,
            foundInRaid: req.foundInRaid,
          });
        }
      });
    });
    return neededItems;
  };
  // Watch for query result changes
  watch(
    queryResult,
    (newResult) => {
      try {
        if (newResult?.hideoutStations) {
          const newGraph = buildHideoutGraph(newResult.hideoutStations);
          const newModules = createHideoutModules(newResult.hideoutStations, newGraph);
          const newNeededItems = extractItemRequirements(newModules);
          // Update reactive state
          hideoutStations.value = newResult.hideoutStations;
          hideoutModules.value = newModules;
          hideoutGraph.value = newGraph;
          neededItemHideoutModules.value = newNeededItems;
        } else {
          // Reset state if no data
          hideoutStations.value = [];
          hideoutModules.value = [];
          hideoutGraph.value = createGraph();
          neededItemHideoutModules.value = [];
        }
      } catch (error) {
        logger.error('Error processing hideout data:', error);
        // Reset to safe state on error to prevent stuck loading
        hideoutStations.value = [];
        hideoutModules.value = [];
        hideoutGraph.value = createGraph();
        neededItemHideoutModules.value = [];
      }
    },
    { immediate: true }
  );
  // Computed properties
  const stationsByName = computed(() => {
    const stationMap: { [name: string]: HideoutStation } = {};
    hideoutStations.value.forEach((station) => {
      stationMap[station.name] = station;
      if (station.normalizedName) {
        stationMap[station.normalizedName] = station;
      }
    });
    return stationMap;
  });
  const modulesByStation = computed(() => {
    const moduleMap: { [stationId: string]: HideoutModule[] } = {};
    hideoutModules.value.forEach((module) => {
      if (!moduleMap[module.stationId]) {
        moduleMap[module.stationId] = [];
      }
      moduleMap[module.stationId].push(module);
    });
    return moduleMap;
  });
  const maxStationLevels = computed(() => {
    const maxLevels: { [stationId: string]: number } = {};
    hideoutStations.value.forEach((station) => {
      maxLevels[station.id] = Math.max(...station.levels.map((level) => level.level));
    });
    return maxLevels;
  });
  /**
   * Get station by ID
   */
  const getStationById = (stationId: string): HideoutStation | undefined => {
    return hideoutStations.value.find((station) => station.id === stationId);
  };
  /**
   * Get station by name (supports normalized names)
   */
  const getStationByName = (name: string): HideoutStation | undefined => {
    return stationsByName.value[name];
  };
  /**
   * Get module by ID
   */
  const getModuleById = (moduleId: string): HideoutModule | undefined => {
    return hideoutModules.value.find((module) => module.id === moduleId);
  };
  /**
   * Get modules for a specific station
   */
  const getModulesByStation = (stationId: string): HideoutModule[] => {
    return modulesByStation.value[stationId] || [];
  };
  /**
   * Get the highest level module for a station
   */
  const getMaxStationLevel = (stationId: string): number => {
    return maxStationLevels.value[stationId] || 0;
  };
  /**
   * Check if a module is a prerequisite for another module
   */
  const isPrerequisiteFor = (moduleId: string, targetModuleId: string): boolean => {
    const targetModule = getModuleById(targetModuleId);
    return targetModule?.predecessors?.includes(moduleId) ?? false;
  };
  /**
   * Get all items needed for a specific module
   */
  const getItemsForModule = (moduleId: string): NeededItemHideoutModule[] => {
    return neededItemHideoutModules.value.filter((item) => item.hideoutModule.id === moduleId);
  };
  /**
   * Get modules that require a specific item
   */
  const getModulesRequiringItem = (itemId: string): NeededItemHideoutModule[] => {
    return neededItemHideoutModules.value.filter((item) => item.item?.id === itemId);
  };
  /**
   * Calculate total construction time for a module including prerequisites
   */
  const getTotalConstructionTime = (moduleId: string): number => {
    const module = getModuleById(moduleId);
    if (!module) return 0;
    let totalTime = module.constructionTime;
    // Add time for all prerequisite modules
    module.predecessors.forEach((prerequisiteId) => {
      const prerequisite = getModuleById(prerequisiteId);
      if (prerequisite) {
        totalTime += prerequisite.constructionTime;
      }
    });
    return totalTime;
  };
  return {
    // Reactive data
    hideoutStations,
    hideoutModules,
    hideoutGraph,
    neededItemHideoutModules,
    // Computed properties
    stationsByName,
    modulesByStation,
    maxStationLevels,
    // Loading states
    loading,
    error,
    // Utility functions
    getStationById,
    getStationByName,
    getModuleById,
    getModulesByStation,
    getMaxStationLevel,
    isPrerequisiteFor,
    getItemsForModule,
    getModulesRequiringItem,
    getTotalConstructionTime,
  };
}
