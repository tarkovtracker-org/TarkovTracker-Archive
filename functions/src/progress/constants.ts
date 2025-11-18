// Constants for hideout stations
export const STASH_STATION_ID = '5d484fc0654e76006657e0ab'; // Stash ID
export const CULTIST_CIRCLE_STATION_ID = '667298e75ea6b4493c08f266'; // Cultist Circle ID

// Core type definitions
export interface ObjectiveItem {
  id: string;
  complete: boolean;
  count?: number;
  invalid?: boolean;
  failed?: boolean;
}

export interface RawObjectiveData {
  [key: string]: {
    complete?: boolean;
    count?: number;
    invalid?: boolean;
    failed?: boolean;
    timestamp?: number;
  };
}

export interface TaskRequirement {
  task?: { id: string };
  status?: string[];
}

export interface TaskObjective {
  id: string;
}

export interface Task {
  id: string;
  objectives?: TaskObjective[];
  taskRequirements?: TaskRequirement[];
  factionName?: string;
  alternatives?: string[];
}

export interface TaskData {
  tasks?: Task[];
}

export interface HideoutItemRequirement {
  id: string;
  count: number;
}

export interface HideoutLevel {
  id: string;
  level: number;
  itemRequirements?: HideoutItemRequirement[];
}

export interface HideoutStation {
  id: string;
  levels?: HideoutLevel[];
}

export interface HideoutData {
  hideoutStations?: HideoutStation[];
}

export interface UserProgressData {
  taskCompletions?: RawObjectiveData;
  taskObjectives?: RawObjectiveData;
  hideoutParts?: RawObjectiveData;
  hideoutModules?: RawObjectiveData;
  displayName?: string;
  level?: number;
  gameEdition?: number;
  pmcFaction?: string;
}

export interface FormattedProgress {
  tasksProgress: ObjectiveItem[];
  taskObjectivesProgress: ObjectiveItem[];
  hideoutModulesProgress: ObjectiveItem[];
  hideoutPartsProgress: ObjectiveItem[];
  displayName: string;
  userId: string;
  playerLevel: number;
  gameEdition: number;
  pmcFaction: string;
}

export interface ProgressUpdate {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: boolean | number | string | any; // For storing updates using dot notation
}

export interface ProgressDataStructure {
  currentGameMode?: string;
  pvp?: UserProgressData;
  pve?: UserProgressData;
  [key: string]: unknown;
}
