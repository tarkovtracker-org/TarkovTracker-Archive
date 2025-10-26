#!/usr/bin/env node

/**
 * Script to fetch map data from tarkov.dev and update local maps.json
 * Run: node scripts/update-maps-from-tarkovdev.js
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// eslint-disable-next-line no-redeclare
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line no-redeclare
const __dirname = dirname(__filename);

const TARKOV_DEV_MAPS_URL = 'https://raw.githubusercontent.com/the-hideout/tarkov-dev/main/src/data/maps.json';
const OUTPUT_PATH = join(__dirname, '../frontend/src/composables/api/maps.json');

/**
 * Map tarkov.dev's normalizedName to our existing map keys
 */
const NAME_MAPPING = {
  'streets-of-tarkov': 'streetsoftarkov',
  'ground-zero': 'groundzero',
  'customs': 'customs',
  'factory': 'factory',
  'interchange': 'interchange',
  'the-lab': 'lab',
  'the-labyrinth': 'labyrinth',
  'lighthouse': 'lighthouse',
  'reserve': 'reserve',
  'shoreline': 'shoreline',
  'woods': 'woods',
};

/**
 * Fetch tarkov.dev maps.json
 */
async function fetchTarkovDevMaps() {
  console.log('Fetching maps from tarkov.dev...');
  const response = await fetch(TARKOV_DEV_MAPS_URL);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  
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
  const converted = {};
  
  for (const mapGroup of rawData) {
    // Find the interactive projection (the one with SVG data)
    const interactive = mapGroup.maps.find(m => m.projection === 'interactive');
    
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
    const svgFileName = ourKey === 'lab' 
      ? 'Labs.svg'
      : interactive.svgPath ? 
        interactive.svgPath.split('/').pop() : 
        `${ourKey}.svg`;
    
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
    let defaultFloor = floors[0]; // Fallback to first floor
    
    if (interactive.svgPath) {
      const mainFloorMatch = interactive.svgPath.match(/-([\w_]+)\.svg$/);
      if (mainFloorMatch && floors.includes(mainFloorMatch[1])) {
        defaultFloor = mainFloorMatch[1];
      }
    }
    
    // If not found in main path, check for layers with show=true
    if (!defaultFloor && interactive.layers) {
      const defaultLayer = interactive.layers.find(l => l.show === true);
      if (defaultLayer && defaultLayer.svgPath) {
        const layerMatch = defaultLayer.svgPath.match(/-([\w_]+)\.svg$/);
        if (layerMatch && floors.includes(layerMatch[1])) {
          defaultFloor = layerMatch[1];
        }
      }
    }
    
    // IMPORTANT: Preserve existing coordinateRotation if we have it
    // because marker coordinates are calibrated to existing values
    const existingRotation = existingMaps[ourKey]?.svg?.coordinateRotation;
    const coordinateRotation = existingRotation !== undefined 
      ? existingRotation 
      : (interactive.coordinateRotation || 0);

    // IMPORTANT: Preserve existing bounds for Factory and Woods
    // These maps have different bounds than tarkov.dev due to coordinate system differences
    const existingBounds = existingMaps[ourKey]?.svg?.bounds;
    const bounds = ((ourKey === 'factory' || ourKey === 'woods') && existingBounds) 
      ? existingBounds 
      : interactive.bounds;

    converted[ourKey] = {
      svg: {
        file: svgFileName,
        floors: floors,
        defaultFloor: defaultFloor,
        coordinateRotation: coordinateRotation,
        bounds: bounds,
      }
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
      console.log(`\n🎁 Bonus: ${mapsWithTransform.length} maps now have transform data for better coordinate mapping!`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
