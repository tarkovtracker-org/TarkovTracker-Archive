// UI Components Barrel Export
// Pure, reusable UI components without business logic

// Export all UI components dynamically for better maintainability
const uiComponents = import.meta.glob('./*.vue');

export const ZoomControls = uiComponents['./ZoomControls.vue'];
export const ZoomIndicator = uiComponents['./ZoomIndicator.vue'];
export const FloorControls = uiComponents['./FloorControls.vue'];
export const MapPlaceholder = uiComponents['./MapPlaceholder.vue'];
export const MapErrorAlert = uiComponents['./MapErrorAlert.vue'];
export const MapScrollHint = uiComponents['./MapScrollHint.vue'];
