/**
 * Type definitions for old API migration data structures
 */
export interface OldApiRawData {
  playerLevel?: number;
  level?: number;
  gameEdition?: string;
  pmcFaction?: string;
  displayName?: string;
  tasksProgress?: OldTaskProgress[];
  hideoutModulesProgress?: OldHideoutModuleProgress[];
  hideoutPartsProgress?: OldHideoutPartProgress[];
  taskObjectivesProgress?: OldTaskObjectiveProgress[];
  userId?: string;
  [key: string]: unknown;
}
export interface OldTaskProgress {
  id: string;
  complete?: boolean;
  failed?: boolean;
}
export interface OldHideoutModuleProgress {
  id: string;
  complete?: boolean;
}
export interface OldHideoutPartProgress {
  id: string;
  complete?: boolean;
  count?: number;
}
export interface OldTaskObjectiveProgress {
  id: string;
  complete?: boolean;
  count?: number;
}
export interface ApiResponse<T = unknown> {
  data?: T;
  status?: string;
  message?: string;
}
export interface MigrationResult {
  success: boolean;
  message?: string;
  dataPreview?: {
    level: number;
    taskCount: number;
    hideoutCount: number;
    objectiveCount: number;
  };
}
