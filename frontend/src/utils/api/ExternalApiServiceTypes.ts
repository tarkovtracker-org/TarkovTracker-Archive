/**
 * Type definitions shared by `ExternalApiService`.
 */
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
