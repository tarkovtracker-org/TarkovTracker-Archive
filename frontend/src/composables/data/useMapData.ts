import { computed } from 'vue';
import { useTarkovDataQuery, useTarkovApi } from '@/composables/api/useTarkovApi';
import { useTarkovStore } from '@/stores/tarkov';
import type { TarkovMap, Trader, PlayerLevel } from '@/types/tarkov';
// Mapping from GraphQL map names to static data keys
const MAP_NAME_MAPPING: { [key: string]: string } = {
  'night factory': 'factory',
  'the lab': 'lab',
  'ground zero 21+': 'groundzero',
  'the labyrinth': 'labyrinth',
};
/**
 * Composable for managing map data with static SVG integration
 */
export function useMapData() {
  const store = useTarkovStore();

  // Get current gamemode from store and convert to the format expected by API
  const currentGameMode = computed(() => {
    const mode = store.getCurrentGameMode();
    return mode === 'pve' ? 'pve' : 'regular'; // API expects 'regular' for PvP, 'pve' for PvE
  });

  const { result: queryResult, error, loading } = useTarkovDataQuery(currentGameMode);
  const { staticMapData } = useTarkovApi();
  // Computed property for maps with merged static data
  const maps = computed<TarkovMap[]>(() => {
    if (!queryResult.value?.maps || !staticMapData.value) {
      return [];
    }
    const mergedMaps = queryResult.value.maps.map((map) => {
      const lowerCaseName = map.name.toLowerCase();
      const mapKey = MAP_NAME_MAPPING[lowerCaseName] || lowerCaseName.replace(/\s+|\+/g, '');
      const staticData = staticMapData.value?.[mapKey];
      if (staticData?.svg) {
        return {
          ...map,
          svg: staticData.svg,
        };
      } else {
        console.warn(`Static SVG data not found for map: ${map.name} (lookup key: ${mapKey})`);
        return map;
      }
    });
    return [...mergedMaps].sort((a, b) => a.name.localeCompare(b.name));
  });
  // Raw maps without SVG data
  const rawMaps = computed<TarkovMap[]>(() => {
    return queryResult.value?.maps || [];
  });
  // Maps that have SVG data available
  const mapsWithSvg = computed<TarkovMap[]>(() => {
    return maps.value.filter((map) => map.svg);
  });
  // Maps grouped by availability of SVG data
  const mapsByAvailability = computed(() => {
    const withSvg: TarkovMap[] = [];
    const withoutSvg: TarkovMap[] = [];
    maps.value.forEach((map) => {
      if (map.svg) {
        withSvg.push(map);
      } else {
        withoutSvg.push(map);
      }
    });
    return { withSvg, withoutSvg };
  });
  /**
   * Get map by ID
   */
  const getMapById = (mapId: string): TarkovMap | undefined => {
    return maps.value.find((map) => map.id === mapId);
  };
  /**
   * Get map by name (case insensitive)
   */
  const getMapByName = (mapName: string): TarkovMap | undefined => {
    const lowerCaseName = mapName.toLowerCase();
    return maps.value.find(
      (map) =>
        map.name.toLowerCase() === lowerCaseName ||
        map.normalizedName?.toLowerCase() === lowerCaseName
    );
  };
  /**
   * Get the static data key for a map name
   */
  const getStaticMapKey = (mapName: string): string => {
    const lowerCaseName = mapName.toLowerCase();
    return MAP_NAME_MAPPING[lowerCaseName] || lowerCaseName.replace(/\s+|\+/g, '');
  };
  /**
   * Check if a map has SVG data available
   */
  const hasMapSvg = (mapId: string): boolean => {
    const map = getMapById(mapId);
    return !!map?.svg;
  };
  return {
    // Reactive data
    maps,
    rawMaps,
    mapsWithSvg,
    mapsByAvailability,
    // Loading states
    loading,
    error,
    // Utility functions
    getMapById,
    getMapByName,
    getStaticMapKey,
    hasMapSvg,
    // Constants
    mapNameMapping: MAP_NAME_MAPPING,
  };
}
/**
 * Composable for trader data
 */
export function useTraderData() {
  const store = useTarkovStore();

  // Get current gamemode from store and convert to the format expected by API
  const currentGameMode = computed(() => {
    const mode = store.getCurrentGameMode();
    return mode === 'pve' ? 'pve' : 'regular'; // API expects 'regular' for PvP, 'pve' for PvE
  });

  const { result: queryResult, error, loading } = useTarkovDataQuery(currentGameMode);
  // Computed property for sorted traders
  const traders = computed<Trader[]>(() => {
    if (!queryResult.value?.traders) {
      return [];
    }
    return [...queryResult.value.traders].sort((a, b) => a.name.localeCompare(b.name));
  });
  /**
   * Get trader by ID
   */
  const getTraderById = (traderId: string): Trader | undefined => {
    return traders.value.find((trader) => trader.id === traderId);
  };
  /**
   * Get trader by name (case insensitive)
   */
  const getTraderByName = (traderName: string): Trader | undefined => {
    const lowerCaseName = traderName.toLowerCase();
    return traders.value.find(
      (trader) =>
        trader.name.toLowerCase() === lowerCaseName ||
        trader.normalizedName?.toLowerCase() === lowerCaseName
    );
  };
  return {
    // Reactive data
    traders,
    // Loading states
    loading,
    error,
    // Utility functions
    getTraderById,
    getTraderByName,
  };
}
/**
 * Composable for player level data and constraints
 */
export function usePlayerLevelData() {
  const store = useTarkovStore();

  // Get current gamemode from store and convert to the format expected by API
  const currentGameMode = computed(() => {
    const mode = store.getCurrentGameMode();
    return mode === 'pve' ? 'pve' : 'regular'; // API expects 'regular' for PvP, 'pve' for PvE
  });

  const { result: queryResult, error, loading } = useTarkovDataQuery(currentGameMode);
  // Computed properties for player levels
  const playerLevels = computed<PlayerLevel[]>(() => queryResult.value?.playerLevels || []);
  const minPlayerLevel = computed<number>(() => {
    if (!playerLevels.value.length) return 1;
    return Math.min(...playerLevels.value.map((l) => l.level));
  });
  const maxPlayerLevel = computed<number>(() => {
    if (!playerLevels.value.length) return 79;
    return Math.max(...playerLevels.value.map((l) => l.level));
  });
  const levelRange = computed(() => ({
    min: minPlayerLevel.value,
    max: maxPlayerLevel.value,
    count: playerLevels.value.length,
  }));
  /**
   * Get player level data by level number
   */
  const getLevelData = (level: number): PlayerLevel | undefined => {
    return playerLevels.value.find((l) => l.level === level);
  };
  /**
   * Get experience required for a specific level
   */
  const getExpForLevel = (level: number): number => {
    const levelData = getLevelData(level);
    return levelData?.exp || 0;
  };
  /**
   * Check if a level is valid (within available range)
   */
  const isValidLevel = (level: number): boolean => {
    return level >= minPlayerLevel.value && level <= maxPlayerLevel.value;
  };
  /**
   * Get badge image for a specific level
   */
  const getLevelBadge = (level: number): string | undefined => {
    const levelData = getLevelData(level);
    return levelData?.levelBadgeImageLink;
  };
  return {
    // Reactive data
    playerLevels,
    minPlayerLevel,
    maxPlayerLevel,
    levelRange,
    // Loading states
    loading,
    error,
    // Utility functions
    getLevelData,
    getExpForLevel,
    isValidLevel,
    getLevelBadge,
  };
}
