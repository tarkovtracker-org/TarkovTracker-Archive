#!/usr/bin/env node
/**
 * Script to generate fallback maps.json from tarkov.dev
 *
 * NOTE: Maps are now fetched at runtime from tarkov.dev (see mapTransformUtils.ts).
 * This script is ONLY needed to update the fallback maps.json that's used when
 * tarkov.dev is unreachable. Run this occasionally to keep the fallback up-to-date.
 *
 * Run: npm run maps:sync
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TARKOV_DEV_MAPS_URL =
  'https://raw.githubusercontent.com/the-hideout/tarkov-dev/main/src/data/maps.json';
const OUTPUT_PATH = join(__dirname, '../frontend/src/composables/api/maps.json');

const TIMEOUT = 10000; // 10 seconds
const MAX_ATTEMPTS = 3;
const BACKOFF_BASE = 1000; // 1 second

type FetchRetryOptions = {
  timeout?: number;
  maxAttempts?: number;
};

type MapLayer = {
  svgPath?: string;
  name?: string;
  show?: boolean;
};

type InteractiveMap = {
  projection?: string;
  svgPath?: string;
  bounds?: unknown;
  layers?: MapLayer[];
  coordinateRotation?: number;
  transform?: unknown;
  heightRange?: unknown;
};

type MapGroup = {
  normalizedName?: string;
  maps?: InteractiveMap[];
};

type ConvertedMap = {
  svg: {
    file: string;
    floors: string[];
    defaultFloor: string;
    coordinateRotation: number;
    bounds: unknown;
    transform?: unknown;
    heightRange?: unknown;
  };
};

type ConvertedMaps = Record<string, ConvertedMap>;

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

async function fetchWithTimeoutAndRetry(
  url: string,
  options: FetchRetryOptions = {}
): Promise<Response> {
  const { timeout = TIMEOUT, maxAttempts = MAX_ATTEMPTS } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TarkovTracker-MapSync/1.0',
        },
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        return response;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      clearTimeout(timeoutId);
      if (attempt === maxAttempts) {
        if (error instanceof Error) {
          throw new Error(`Failed after ${maxAttempts} attempts: ${error.message}`);
        }
        throw new Error(`Failed after ${maxAttempts} attempts: ${String(error)}`);
      }
      const backoffDelay = BACKOFF_BASE * 2 ** (attempt - 1);
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Attempt ${attempt} failed: ${message}. Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw new Error('Unexpected retry handler exit');
}

async function fetchTarkovDevMaps(): Promise<MapGroup[]> {
  console.log('Fetching maps from tarkov.dev...');
  const response = await fetchWithTimeoutAndRetry(TARKOV_DEV_MAPS_URL);
  const parsed = (await response.json()) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('Unexpected response format from tarkov.dev');
  }

  return parsed as MapGroup[];
}

function convertToOurFormat(rawData: MapGroup[], existingMaps: ConvertedMaps = {}): ConvertedMaps {
  const converted: ConvertedMaps = {};

  for (const mapGroup of rawData) {
    if (!mapGroup || typeof mapGroup !== 'object') {
      console.warn('Skipping invalid mapGroup (not an object)');
      continue;
    }

    if (!mapGroup.normalizedName || typeof mapGroup.normalizedName !== 'string') {
      console.warn('Skipping mapGroup with missing or invalid normalizedName');
      continue;
    }

    if (!Array.isArray(mapGroup.maps)) {
      console.warn(`Skipping ${mapGroup.normalizedName} - maps is not an array`);
      continue;
    }

    const interactive = mapGroup.maps.find((mapEntry) => mapEntry.projection === 'interactive');
    if (!interactive || !interactive.bounds) {
      console.log(`Skipping ${mapGroup.normalizedName} - no interactive map data`);
      continue;
    }

    const ourKey = NAME_MAPPING[mapGroup.normalizedName];
    if (!ourKey) {
      console.log(`Skipping ${mapGroup.normalizedName} - not in mapping`);
      continue;
    }

    const svgFileName =
      ourKey === 'lab'
        ? 'Labs.svg'
        : interactive.svgPath
          ? interactive.svgPath.split('/').pop() ?? `${ourKey}.svg`
          : `${ourKey}.svg`;

    const floors: string[] = [];

    if (ourKey === 'factory') {
      floors.push('Basement', 'Ground_Floor', 'Second_Floor', 'Third_Floor');
    } else {
      if (interactive.svgPath) {
        const mainFloorMatch = interactive.svgPath.match(/-([\w_]+)\.svg$/);
        const mainFloorName = mainFloorMatch ? mainFloorMatch[1] : 'Ground_Level';
        floors.push(mainFloorName);
      }

      if (interactive.layers) {
        for (const layer of interactive.layers) {
          let layerName: string | undefined;
          if (layer.svgPath) {
            const layerMatch = layer.svgPath.match(/-([\w_]+)\.svg$/);
            if (layerMatch) {
              layerName = layerMatch[1];
            } else if (typeof layer.name === 'string') {
              layerName = layer.name.replace(/\s+/g, '_');
            }
          }

          if (layerName && !floors.includes(layerName)) {
            floors.push(layerName);
          }
        }
      }
    }

    let defaultFloor: string | undefined;
    if (interactive.svgPath) {
      const mainFloorMatch = interactive.svgPath.match(/-([\w_]+)\.svg$/);
      if (mainFloorMatch && floors.includes(mainFloorMatch[1])) {
        defaultFloor = mainFloorMatch[1];
      }
    }

    if (!defaultFloor && interactive.layers) {
      const defaultLayer = interactive.layers.find((layer) => layer.show === true);
      if (defaultLayer?.svgPath) {
        const layerMatch = defaultLayer.svgPath.match(/-([\w_]+)\.svg$/);
        if (layerMatch && floors.includes(layerMatch[1])) {
          defaultFloor = layerMatch[1];
        }
      }
    }

    if (!defaultFloor) {
      defaultFloor = floors[0];
    }

    const existingRotation = existingMaps[ourKey]?.svg?.coordinateRotation;
    const coordinateRotation =
      existingRotation !== undefined ? existingRotation : interactive.coordinateRotation ?? 0;

    const existingBounds = existingMaps[ourKey]?.svg?.bounds;
    const bounds =
      (ourKey === 'factory' || ourKey === 'woods') && existingBounds
        ? existingBounds
        : interactive.bounds;

    converted[ourKey] = {
      svg: {
        file: svgFileName,
        floors,
        defaultFloor,
        coordinateRotation,
        bounds,
      },
    };

    if (interactive.transform) {
      converted[ourKey].svg.transform = interactive.transform;
    }

    if (interactive.heightRange) {
      converted[ourKey].svg.heightRange = interactive.heightRange;
    }

    console.log(`✓ Converted ${mapGroup.normalizedName} -> ${ourKey}`);
  }

  return converted;
}

async function main(): Promise<void> {
  let existingMaps: ConvertedMaps = {};
  if (existsSync(OUTPUT_PATH)) {
    try {
      const existingData = readFileSync(OUTPUT_PATH, 'utf-8');
      const parsed = JSON.parse(existingData) as unknown;
      if (parsed && typeof parsed === 'object') {
        existingMaps = parsed as ConvertedMaps;
        console.log('✓ Loaded existing maps.json to preserve coordinateRotation values\n');
      }
    } catch {
      console.log('⚠ Could not parse existing maps.json, using fresh data\n');
    }
  } else {
    console.log('⚠ maps.json not found, using fresh data\n');
  }

  const rawData = await fetchTarkovDevMaps();
  console.log(`Fetched ${rawData.length} map groups from tarkov.dev\n`);

  const converted = convertToOurFormat(rawData, existingMaps);
  const mapCount = Object.keys(converted).length;
  console.log(`\nConverted ${mapCount} maps to our format`);

  const jsonContent = JSON.stringify(converted, null, 2);
  writeFileSync(OUTPUT_PATH, jsonContent, 'utf8');
  console.log(`\n✅ Successfully wrote maps.json to: ${OUTPUT_PATH}`);
  console.log(`\n📊 Maps included: ${Object.keys(converted).join(', ')}`);

  const mapsWithTransform = Object.entries(converted)
    .filter(([, data]) => data.svg.transform)
    .map(([key]) => key);

  if (mapsWithTransform.length > 0) {
    console.log(
      `\n🎁 Bonus: ${mapsWithTransform.length} maps now have transform data for better coordinate mapping!`
    );
  }
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error('❌ Error:', error.message);
  } else {
    console.error('❌ Error:', error);
  }
  process.exit(1);
});
