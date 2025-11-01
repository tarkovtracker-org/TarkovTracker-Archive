export const parseMapFileName = (baseFile: string, selectedFloor: string): string => {
  // Get the base name without floor suffix
  // e.g., "Factory-Ground_Floor.svg" -> "Factory"
  const match = baseFile.match(/^(.+?)(-[\w_]+)?\.svg$/);
  if (match) {
    const baseName = match[1];
    // Construct filename for selected floor
    // e.g., "Factory" + "-" + "Second_Floor" + ".svg"
    return `${baseName}-${selectedFloor}.svg`;
  }
  return baseFile;
};

export const getMapSvgUrl = (fileName: string, mapName?: string): string => {
  const isLab = mapName?.toLowerCase() === 'the lab';
  return isLab
    ? `https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master/maps/${fileName}`
    : `https://assets.tarkov.dev/maps/svg/${fileName}`;
};

export const formatFloorLabel = (floor: string): string => {
  const formatted = floor.replace(/_/g, ' ').replace(/Floor|Level/g, '').trim();
  return formatted || floor;
};
