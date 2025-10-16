import type { UserProgressData } from '@/shared_state';

export interface ProgressData {
  level: number;
  gameEdition?: string;
  pmcFaction?: string;
  displayName?: string;
  taskCompletions?: {
    [key: string]: { complete: boolean; timestamp?: number; failed?: boolean };
  };
  taskObjectives?: {
    [key: string]: {
      complete: boolean;
      count?: number;
      timestamp?: number | null;
    };
  };
  hideoutModules?: { [key: string]: { complete: boolean; timestamp?: number } };
  hideoutParts?: {
    [key: string]: {
      complete: boolean;
      count?: number;
      timestamp?: number | null;
    };
  };
  traderStandings?: {
    [traderId: string]:
      | number
      | {
          loyaltyLevel?: number;
          standing?: number;
        };
  };
  lastUpdated?: string;
  migratedFromLocalStorage?: boolean;
  migrationDate?: string;
  autoMigrated?: boolean;
  imported?: boolean;
  importedFromExternalSource?: boolean;
  importDate?: string;
  importedFromApi?: boolean;
  sourceUserId?: string;
  sourceDomain?: string;
  [key: string]: unknown;
}

export interface ExportObject {
  type: 'tarkovtracker-migration';
  timestamp: string;
  version: number;
  data: ProgressData;
}

export type TransformedObjectives = UserProgressData['taskObjectives'];
export type TransformedHideoutParts = UserProgressData['hideoutParts'];
export type TransformedTraderStandings = UserProgressData['traderStandings'];
