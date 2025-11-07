#!/usr/bin/env node

/**
 * Script to generate fallback maps.json from tarkov.dev
 *
 * NOTE: Maps are now fetched at runtime from tarkov.dev (see mapTransformUtils.ts).
 * This script is ONLY needed to update the fallback maps.json that's used when
 * tarkov.dev is unreachable. Run this occasionally to keep the fallback up-to-date.
 *
 * Run: npm run maps:sync
 * Or: node scripts/update-maps-from-tarkovdev.js
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// eslint-disable-next-line no-redeclare
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line no-redeclare
const __dirname = dirname(__filename);

const TARKOV_DEV_MAPS_URL =
  'https://raw.githubusercontent.com/the-hideout/tarkov-dev/main/src/data/maps.json';
const OUTPUT_PATH = join(__dirname, '../frontend/src/composables/api/maps.json');

// Retry configuration constants
const TIMEOUT = 10000; // 10 seconds
const MAX_ATTEMPTS = 3;
const BACKOFF_BASE = 1000; // 1 second

/**
 * Fetch with timeout and retry logic using AbortController
 */
async function fetchWithTimeoutAndRetry(url, options = {}) {
  const { timeout = TIMEOUT, maxAttempts = MAX_ATTEMPTS } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        throw new Error(`Failed after ${maxAttempts} attempts: ${error.message}`);
      }

      const backoffDelay = BACKOFF_BASE * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed: ${error.message}. Retrying in ${backoffDelay}ms...`);

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }
}

/**
 * Map tarkov.dev's normalizedName to our existing map keys
 */
const NAME_MAPPING = {
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
 * Fetch tarkov.dev maps.json with robust retry logic
 */
async function fetchTarkovDevMaps() {
  console.log('Fetching maps from tarkov.dev...');
  const response = await fetchWithTimeoutAndRetry(TARKOV_DEV_MAPS_URL);
  return response.json();
}

/**
 * Convert tarkov.dev format to our simplified format
 *
 * IMPORTANT: We preserve TarkovTracker's original coordinateRotation values
 * because all marker/zone coordinates in the database are calibrated to them.
 * Changing coordinateRotation would flip all existing markers!
 */
function convertToOurFormat(rawData, existingMaps = {}) {
  // Validate input is an array
  if (!Array.isArray(rawData)) {
    throw new Error('convertToOurFormat: rawData must be an array');
  }

  const converted = {};

  for (const mapGroup of rawData) {
    // Validate mapGroup has required fields
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

    // Find the interactive projection (the one with SVG data)
    const interactive = mapGroup.maps.find((m) => m.projection === 'interactive');

    if (!interactive || !interactive.bounds) {
      console.log(`Skipping ${mapGroup.normalizedName} - no interactive map data`);
      continue;
    }

    // Map to our key
    const ourKey = NAME_MAPPING[mapGroup.normalizedName];
    if (!ourKey) {
      console.log(`Skipping ${mapGroup.normalizedName} - not in mapping`);
      continue;
    }

    // Extract SVG file name from URL
    // Special case: Lab uses PNG tiles on tarkov.dev but we have Labs.svg from tarkovdata
    const svgFileName =
      ourKey === 'lab'
        ? 'Labs.svg'
        : interactive.svgPath
          ? interactive.svgPath.split('/').pop()
          : `${ourKey}.svg`;

    // Build floor array
    const floors = [];

    // Special case: Factory has custom floor order (Basement first, not last)
    if (ourKey === 'factory') {
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

    // Default floor - the main svgPath is the default visible floor
    // Extract from the main svgPath (the floor that shows by default)
    let defaultFloor; // Initially undefined

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

    // Final fallback: use first floor if nothing else matched
    if (!defaultFloor) {
      defaultFloor = floors[0];
    }

    // IMPORTANT: Preserve existing coordinateRotation if we have it
    // because marker coordinates are calibrated to existing values
    const existingRotation = existingMaps[ourKey]?.svg?.coordinateRotation;
    const coordinateRotation =
      existingRotation !== undefined ? existingRotation : interactive.coordinateRotation || 0;

    // IMPORTANT: Preserve existing bounds for Factory and Woods
    // These maps use different coordinate systems than tarkov.dev:
    // - Factory: Has a different SVG coordinate origin (90° rotation applied)
    // - Woods: Uses legacy coordinate offsets calibrated to existing markers
    // Using tarkov.dev bounds would shift all existing marker/zone coordinates.
    // For example, Factory markers are positioned assuming top-left origin with 90° rotation,
    // while tarkov.dev uses bottom-left origin with different axis orientation.
    const existingBounds = existingMaps[ourKey]?.svg?.bounds;
    const bounds =
      (ourKey === 'factory' || ourKey === 'woods') && existingBounds
        ? existingBounds
        : interactive.bounds;

    converted[ourKey] = {
      svg: {
        file: svgFileName,
        floors: floors,
        defaultFloor: defaultFloor,
        coordinateRotation: coordinateRotation,
        bounds: bounds,
      },
    };

    // Add transform if available (new data we didn't have before!)
    if (interactive.transform) {
      converted[ourKey].svg.transform = interactive.transform;
    }

    // Add height range if available
    if (interactive.heightRange) {
      converted[ourKey].svg.heightRange = interactive.heightRange;
    }

    console.log(`✓ Converted ${mapGroup.normalizedName} -> ${ourKey}`);
  }

  return converted;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Read existing maps to preserve coordinateRotation values
    let existingMaps = {};
    if (existsSync(OUTPUT_PATH)) {
      try {
        const existingData = readFileSync(OUTPUT_PATH, 'utf-8');
        existingMaps = JSON.parse(existingData);
        console.log('✓ Loaded existing maps.json to preserve coordinateRotation values\n');
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

    // Write to file with pretty formatting
    const jsonContent = JSON.stringify(converted, null, 2);
    writeFileSync(OUTPUT_PATH, jsonContent, 'utf8');

    console.log(`\n✅ Successfully wrote maps.json to: ${OUTPUT_PATH}`);
    console.log(`\n📊 Maps included: ${Object.keys(converted).join(', ')}`);

    // Show what's new
    const mapsWithTransform = Object.entries(converted)
      .filter(([, data]) => data.svg.transform)
      .map(([key]) => key);

    if (mapsWithTransform.length > 0) {
      console.log(
        `\n🎁 Bonus: ${mapsWithTransform.length} maps now have transform data for better coordinate mapping!`
      );
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
