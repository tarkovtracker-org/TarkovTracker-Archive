// Domain Components: Maps Barrel Export

// Export all map-related domain components dynamically for better maintainability
const mapComponents = import.meta.glob('./*.vue');

export const MapMarker = mapComponents['./MapMarker.vue'];
export const MapZone = mapComponents['./MapZone.vue'];
export const TarkovMap = mapComponents['./TarkovMap.vue'];
