// Re-export all fragments and queries from the modular GraphQL structure
export * from './items.js';
export * from './tasks.js';
export * from './hideout.js';
export * from './traders.js';
export * from './maps.js';
export * from './presets.js';
export * from './queries.js';
export * from './types.js';

// Legacy aliases for backward compatibility
export {
  taskFragment as TaskDataFragment,
  taskObjectiveFragment as TaskObjectiveData,
} from './tasks.js';
export { itemDataFragment as ItemDataFragment } from './items.js';
export { hideoutModuleFragment as HideoutModuleDataFragment } from './hideout.js';
export { traderFragment as TraderDataFragment } from './traders.js';
export { mapFragment as MapDataFragment } from './maps.js';
export { mapWithPositionsDataFragment as MapWithPositionsDataFragment } from './tasks.js';

// The taskPositionDataFragment is no longer needed since mapPositionDataFragment serves the same purpose
export { mapPositionDataFragment as taskPositionDataFragment } from './tasks.js';
