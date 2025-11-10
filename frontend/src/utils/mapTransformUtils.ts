/**
 * Utilities for transforming tarkov.dev map data to TarkovTracker format
 *
 * This handles fetching and converting map metadata from tarkov.dev's format
 * to our internal format while preserving critical coordinate system data.
 */

import type { StaticMapData, StaticMapDefinition } from '@/types/models/tarkov';
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
  name?: string;
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
 * Special floor orders for specific maps that don't follow standard naming conventions
 */
const SPECIAL_FLOOR_ORDERS: Record<string, string[]> = {
  factory: ['Basement', 'Ground_Floor', 'Second_Floor', 'Third_Floor'],
};

/**
 * Extract SVG filename from interactive map data
 */
function extractSvgFileName(ourKey: string, interactive: TarkovDevInteractiveMap): string {
  if (ourKey === 'lab') {
    return 'Labs.svg';
  }
  if (interactive.svgPath) {
    const lastSegment = interactive.svgPath.split('/').pop()?.trim();
    if (lastSegment) {
      return lastSegment;
    }
  }
  return `${ourKey}.svg`;
}

/**
 * Build floor array from interactive map data
 */
function extractFloorFromSvgPath(svgPath: string): string {
  const match = svgPath.match(/-([\w_]+)\.svg$/);
  return match ? match[1] : 'Ground_Level';
}

function buildFloorArray(ourKey: string, interactive: TarkovDevInteractiveMap): string[] {
  const floors: string[] = [];

  // Check if there's a special floor order for this map
  if (SPECIAL_FLOOR_ORDERS[ourKey]) {
    floors.push(...SPECIAL_FLOOR_ORDERS[ourKey]);
  } else {
    // Determine main floor name from SVG filename
    if (interactive.svgPath) {
      floors.push(extractFloorFromSvgPath(interactive.svgPath));
    }

    // Add layers as additional floors
    if (interactive.layers) {
      for (const layer of interactive.layers) {
        if (layer.svgPath) {
          const layerName = extractFloorFromSvgPath(layer.svgPath);
          if (!floors.includes(layerName)) {
            floors.push(layerName);
          }
        }
      }
    }
  }

  // Safety check: ensure at least one floor is returned
  if (floors.length === 0) {
    const defaultFloor = interactive.name ? interactive.name.replace(/\s+/g, '_') : 'Ground_Level';
    floors.push(defaultFloor);
  }

  return floors;
}

/**
 * Extract floor name from SVG path if it matches a valid floor
 */
function extractFloorFromPath(svgPath: string, floors: string[]): string | undefined {
  const match = svgPath.match(/-([\w_]+)\.svg$/);
  return match && floors.includes(match[1]) ? match[1] : undefined;
}

/**
 * Determine default floor from interactive map data
 */
function determineDefaultFloor(floors: string[], interactive: TarkovDevInteractiveMap): string {
  // First, try to derive from interactive.svgPath
  if (interactive.svgPath) {
    const mainFloor = extractFloorFromPath(interactive.svgPath, floors);
    if (mainFloor) return mainFloor;
  }

  // If not found in main path, check for layers with show=true
  if (interactive.layers) {
    const defaultLayer = interactive.layers.find((l) => l.show === true);
    if (defaultLayer?.svgPath) {
      const layerFloor = extractFloorFromPath(defaultLayer.svgPath, floors);
      if (layerFloor) return layerFloor;
    }
  }

  // Final fallback to first floor if no match was found
  return floors[0];
}

/**
 * Apply optional transform and heightRange to map definition
 */
function applyOptionalFields(
  mapDefinition: StaticMapDefinition,
  interactive: TarkovDevInteractiveMap
): void {
  if (!mapDefinition.svg) {
    logger.warn('mapDefinition.svg is undefined, skipping optional fields assignment');
    return;
  }

  const svg = mapDefinition.svg;

  if (interactive.transform) {
    svg.transform = interactive.transform;
  }
  if (interactive.heightRange) {
    svg.heightRange = interactive.heightRange;
  }
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

  applyOptionalFields(mapDefinition, interactive);

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

  // Single source of truth for timeout to align timer and logging
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS); // timeout in ms (see TIMEOUT_MS above)

  logger.info('Fetching maps from tarkov.dev...');

  let response: Response;

  try {
    response = await fetch(TARKOV_DEV_MAPS_URL, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error(`Failed to fetch maps from tarkov.dev: Request timed out after ${TIMEOUT_MS}ms`);
      throw new Error('Request timed out while fetching maps from tarkov.dev');
    } else {
      logger.error('Failed to fetch maps from tarkov.dev:', error);
      throw error;
    }
  } finally {
    // Always clear timeout regardless of success or error
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }

  const rawData: TarkovDevMapGroup[] = await response.json();
  const converted = convertTarkovDevMaps(rawData);

  logger.info(`Successfully loaded ${Object.keys(converted).length} maps from tarkov.dev`);
  return converted;
}
