/**
 * Map normalization utilities for handling map variants
 *
 * This module handles the normalization of map variants like:
 * - "Ground Zero 21+" → "Ground Zero"
 * - "Night Factory" → "Factory"
 *
 * This ensures all tasks from map variants are displayed under their base map,
 * while respecting level restrictions and time-of-day variants in gameplay.
 */

export interface MapVariantConfig {
  /** The canonical/base map name to normalize to */
  canonical: string;
  /** The canonical map ID (if known) */
  canonicalId?: string;
  /** Variant names that should be normalized to the canonical name */
  variants: string[];
  /** Variant IDs that should be normalized to the canonical ID */
  variantIds?: string[];
}

/**
 * Configuration for map variants that should be normalized
 */
export const MAP_VARIANT_CONFIG: MapVariantConfig[] = [
  {
    canonical: 'Ground Zero',
    variants: ['Ground Zero 21+', 'ground zero 21+'],
    variantIds: [], // Will be populated at runtime
  },
  {
    canonical: 'Factory',
    variants: ['Night Factory', 'night factory'],
    variantIds: [], // Will be populated at runtime
  },
];

/**
 * Cache for normalized map lookups
 */
const normalizedMapCache = new Map<string, string>();
const normalizedMapIdCache = new Map<string, string>();

/**
 * Get the canonical map name for a given map name (handles variants)
 *
 * @param mapName - The map name to normalize
 * @returns The canonical map name, or the original if no normalization needed
 */
export function getCanonicalMapName(mapName: string): string {
  if (!mapName) return mapName;

  // Check cache first
  if (normalizedMapCache.has(mapName)) {
    return normalizedMapCache.get(mapName)!;
  }

  // Find matching variant config
  for (const config of MAP_VARIANT_CONFIG) {
    if (config.variants.some((v) => v.toLowerCase() === mapName.toLowerCase())) {
      normalizedMapCache.set(mapName, config.canonical);
      return config.canonical;
    }
  }

  // No normalization needed
  normalizedMapCache.set(mapName, mapName);
  return mapName;
}

/**
 * Get the canonical map ID for a given map ID (handles variant IDs)
 *
 * @param mapId - The map ID to normalize
 * @param mapName - Optional map name for additional context
 * @returns The canonical map ID, or the original if no normalization needed
 */
export function getCanonicalMapId(mapId: string, mapName?: string): string {
  if (!mapId) return mapId;

  // Check cache first
  if (normalizedMapIdCache.has(mapId)) {
    return normalizedMapIdCache.get(mapId)!;
  }

  // If we have a map name, use that for lookup
  if (mapName) {
    const canonicalName = getCanonicalMapName(mapName);
    if (canonicalName !== mapName) {
      // This is a variant, but we need to find the canonical ID
      // For now, just return the mapId as-is and let filtering handle it
      return mapId;
    }
  }

  // Check against known variant IDs
  for (const config of MAP_VARIANT_CONFIG) {
    if (config.variantIds?.includes(mapId)) {
      const canonicalId = config.canonicalId || mapId;
      normalizedMapIdCache.set(mapId, canonicalId);
      return canonicalId;
    }
  }

  // No normalization needed
  normalizedMapIdCache.set(mapId, mapId);
  return mapId;
}

/**
 * Check if a map name is a variant (not the canonical name)
 *
 * @param mapName - The map name to check
 * @returns True if this is a variant map that should be hidden from UI
 */
export function isMapVariant(mapName: string): boolean {
  if (!mapName) return false;

  for (const config of MAP_VARIANT_CONFIG) {
    if (config.variants.some((v) => v.toLowerCase() === mapName.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a map ID represents a variant
 *
 * @param mapId - The map ID to check
 * @returns True if this is a variant map ID
 */
export function isMapIdVariant(mapId: string): boolean {
  if (!mapId) return false;

  for (const config of MAP_VARIANT_CONFIG) {
    if (config.variantIds?.includes(mapId)) {
      return true;
    }
  }

  return false;
}

/**
 * Get all map IDs that should be treated as the same map (canonical + variants)
 *
 * @param mapId - The map ID (can be canonical or variant)
 * @param allMaps - All available maps
 * @returns Array of all map IDs that belong to this map group
 */
export function getMapIdGroup(
  mapId: string,
  allMaps: Array<{ id: string; name: string }>
): string[] {
  if (!mapId || !allMaps?.length) return [mapId];

  const map = allMaps.find((m) => m.id === mapId);
  if (!map) return [mapId];

  const canonicalName = getCanonicalMapName(map.name);

  // Find all maps with the same canonical name
  const groupIds = allMaps
    .filter((m) => getCanonicalMapName(m.name) === canonicalName)
    .map((m) => m.id);

  return groupIds.length > 0 ? groupIds : [mapId];
}

/**
 * Clear the normalization caches (useful for testing or hot reload)
 */
export function clearNormalizationCache(): void {
  normalizedMapCache.clear();
  normalizedMapIdCache.clear();
}
