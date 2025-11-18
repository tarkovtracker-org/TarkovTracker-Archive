// Legacy compatibility module - re-exports from refactored modules
// This file maintains backward compatibility while the new modular structure is used internally

export { formatProgress, invalidateTaskRecursive, updateTaskState } from './main-formatter.js';

// Re-export all types for backward compatibility
export type {
  ObjectiveItem,
  RawObjectiveData,
  TaskRequirement,
  TaskObjective,
  Task,
  TaskData,
  HideoutItemRequirement,
  HideoutLevel,
  HideoutStation,
  HideoutData,
  UserProgressData,
  FormattedProgress,
  ProgressUpdate,
  ProgressDataStructure,
} from './constants.js';
