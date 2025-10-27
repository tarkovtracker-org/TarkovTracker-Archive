/**
 * Utilities for transforming tarkov.dev map data to TarkovTracker format
 *
 * This handles fetching and converting map metadata from tarkov.dev's format
 * to our internal format while preserving critical coordinate system data.
 */

import type { StaticMapData, StaticMapDefinition } from '@/types/tarkov';
import { logger } from './logger';

// Tarkov.dev raw data types
interface TarkovDevMapLayer {
  svgPath?: string;
  name: string;
  show?: boolean;
}

interface TarkovDevInteractiveMap {
  projection: string;
  svgPath?: string;
  bounds?: number[][];
  coordinateRotation?: number;
  transform?: number[];
  heightRange?: number[];
  layers?: TarkovDevMapLayer[];
}

interface TarkovDevMapGroup {
  normalizedName: string;
  maps: TarkovDevInteractiveMap[];
}

/**
 * Map tarkov.dev's normalizedName to our existing map keys
 */
const NAME_MAPPING: Record<string, string> = {
  'streets-of-tarkov': 'streetsoftarkov',
  'ground-zero': 'groundzero',
  customs: 'customs',
  factory: 'factory',
  interchange: 'interchange',
  'the-lab': 'lab',
  'the-labyrinth': 'labyrinth',
  lighthouse: 'lighthouse',
  reserve: 'reserve',
  shoreline: 'shoreline',
  woods: 'woods',
};

/**
 * Hardcoded coordinateRotation values that must be preserved
 * These are calibrated to existing marker coordinates in the database
 */
const PRESERVED_COORDINATE_ROTATIONS: Record<string, number> = {
  factory: 90,
  lab: 270,
};

/**
 * Hardcoded bounds that must be preserved for specific maps
 * These maps have different bounds than tarkov.dev due to coordinate system differences
 */
const PRESERVED_BOUNDS: Record<string, number[][]> = {
  factory: [
    [-67.5, 77],
    [82, -68],
  ],
  woods: [
    [650, -959],
    [-695, 456],
  ],
};

/**
 * Extract SVG filename from interactive map data
 */
function extractSvgFileName(ourKey: string, interactive: TarkovDevInteractiveMap): string {
  if (ourKey === 'lab') {
    return 'Labs.svg';
  }
  if (interactive.svgPath) {
    const segments = interactive.svgPath
      .split('/')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);
    if (segments.length > 0) {
      return segments[segments.length - 1];
    }
  }
  return `${ourKey}.svg`;
}

/**
 * Build floor array from interactive map data
 */
function buildFloorArray(ourKey: string, interactive: TarkovDevInteractiveMap): string[] {
  const floors: string[] = [];

  if (ourKey === 'factory') {
    // Special case: Factory has custom floor order (Basement first, not last)
    floors.push('Basement', 'Ground_Floor', 'Second_Floor', 'Third_Floor');
  } else {
    // Determine main floor name from SVG filename
    if (interactive.svgPath) {
      const mainFloorMatch = interactive.svgPath.match(/-([\w_]+)\.svg$/);
      const mainFloorName = mainFloorMatch ? mainFloorMatch[1] : 'Ground_Level';
      floors.push(mainFloorName);
    }

    // Add layers as additional floors
    if (interactive.layers) {
      for (const layer of interactive.layers) {
        if (layer.svgPath) {
          const layerMatch = layer.svgPath.match(/-([\w_]+)\.svg$/);
          const layerName = layerMatch ? layerMatch[1] : layer.name.replace(/\s+/g, '_');
          if (!floors.includes(layerName)) {
            floors.push(layerName);
          }
        }
      }
    }
  }

  return floors;
}

/**
 * Determine default floor from interactive map data
 */
function determineDefaultFloor(floors: string[], interactive: TarkovDevInteractiveMap): string {
  let defaultFloor = floors[0];

  if (interactive.svgPath) {
    const mainFloorMatch = interactive.svgPath.match(/-([\w_]+)\.svg$/);
    if (mainFloorMatch && floors.includes(mainFloorMatch[1])) {
      defaultFloor = mainFloorMatch[1];
    }
  }

  // If not found in main path, check for layers with show=true
  if (!defaultFloor && interactive.layers) {
    const defaultLayer = interactive.layers.find((l) => l.show === true);
    if (defaultLayer && defaultLayer.svgPath) {
      const layerMatch = defaultLayer.svgPath.match(/-([\w_]+)\.svg$/);
      if (layerMatch && floors.includes(layerMatch[1])) {
        defaultFloor = layerMatch[1];
      }
    }
  }

  return defaultFloor;
}

/**
 * Convert a single map group to our format
 */
function convertMapGroup(
  mapGroup: TarkovDevMapGroup
): { key: string; definition: StaticMapDefinition } | null {
  const interactive = mapGroup.maps.find((m) => m.projection === 'interactive');

  if (!interactive || !interactive.bounds) {
    logger.debug(`Skipping ${mapGroup.normalizedName} - no interactive map data`);
    return null;
  }

  const ourKey = NAME_MAPPING[mapGroup.normalizedName];
  if (!ourKey) {
    logger.debug(`Skipping ${mapGroup.normalizedName} - not in mapping`);
    return null;
  }

  const svgFileName = extractSvgFileName(ourKey, interactive);
  const floors = buildFloorArray(ourKey, interactive);
  const defaultFloor = determineDefaultFloor(floors, interactive);
  const coordinateRotation =
    PRESERVED_COORDINATE_ROTATIONS[ourKey] ?? interactive.coordinateRotation ?? 0;
  const bounds = PRESERVED_BOUNDS[ourKey] ?? interactive.bounds;

  const mapDefinition: StaticMapDefinition = {
    svg: {
      file: svgFileName,
      floors: floors,
      defaultFloor: defaultFloor,
      coordinateRotation: coordinateRotation,
      bounds: bounds,
    },
  };

  if (interactive.transform) {
    mapDefinition.svg!.transform = interactive.transform;
  }

  if (interactive.heightRange) {
    mapDefinition.svg!.heightRange = interactive.heightRange;
  }

  logger.debug(`Converted ${mapGroup.normalizedName} -> ${ourKey}`);
  return { key: ourKey, definition: mapDefinition };
}

/**
 * Convert tarkov.dev format to TarkovTracker format
 *
 * IMPORTANT: We preserve TarkovTracker's original coordinateRotation and bounds values
 * for specific maps because all marker/zone coordinates in the database are calibrated to them.
 * Changing these would flip/shift all existing markers!
 */
export function convertTarkovDevMaps(rawData: TarkovDevMapGroup[]): StaticMapData {
  const converted: StaticMapData = {};

  for (const mapGroup of rawData) {
    const result = convertMapGroup(mapGroup);
    if (result) {
      converted[result.key] = result.definition;
    }
  }

  return converted;
}

/**
 * Fetch maps.json from tarkov.dev and convert to our format
 */
export async function fetchTarkovDevMaps(): Promise<StaticMapData> {
  const TARKOV_DEV_MAPS_URL =
    'https://raw.githubusercontent.com/the-hideout/tarkov-dev/main/src/data/maps.json';

  try {
    logger.info('Fetching maps from tarkov.dev...');
    const response = await fetch(TARKOV_DEV_MAPS_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const rawData: TarkovDevMapGroup[] = await response.json();
    const converted = convertTarkovDevMaps(rawData);

    logger.info(`Successfully loaded ${Object.keys(converted).length} maps from tarkov.dev`);
    return converted;
  } catch (error) {
    logger.error('Failed to fetch maps from tarkov.dev:', error);
    throw error;
  }
}
