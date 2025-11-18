
export const parseMapFileName = (baseFile: string, selectedFloor: string): string => {
  const match = baseFile.match(/^(.+?)(-[\w_]+)?\.svg$/);
  if (!match) return baseFile;
  const baseName = match[1];
  return `${baseName}-${selectedFloor}.svg`;
};

const MAP_ASSETS_BASE =
  (import.meta.env?.VITE_TARKOV_MAP_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://assets.tarkov.dev/maps/svg';

/**
 * Resolve the full URL for a map SVG file.
 *
 * By default we use tarkov.dev's CDN (`https://assets.tarkov.dev/maps/svg`),
 * but this can be overridden via VITE_TARKOV_MAP_BASE_URL. If the base URL
 * contains a `{map}` placeholder it will be replaced with the normalized map
 * name, otherwise the file is simply appended.
 */
export function getMapSvgUrl(fileName: string, mapName?: string): string {
  const base = MAP_ASSETS_BASE;

  if (base.includes('{map}')) {
    const safeMap = mapName ? encodeURIComponent(mapName) : '';
    return `${base.replace('{map}', safeMap)}/${fileName}`;
  }

  return `${base}/${fileName}`;
}

/**
 * Human-friendly label for floor names coming from map metadata.
 * Examples:
 *   "Ground_Level" -> "Ground Level"
 *   "basement-1"  -> "Basement 1"
 */
export function formatFloorLabel(rawFloor: string): string {
  if (!rawFloor) return '';
  return rawFloor
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
