/**
 * Shared API types for the TarkovTracker backend
 */

// Standard API response format
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

// Error class for consistent error handling
export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// User context interface (from authentication)
export interface UserContext {
  id: string;
  username?: string;
  roles?: string[];
}

// Token game mode type (for token restrictions)
export type TokenGameMode = 'pvp' | 'pve' | 'dual';

// API Token interface (from authentication)
export interface ApiToken {
  owner: string;
  note: string;
  permissions: string[];
  gameMode?: string;
  calls?: number;
  createdAt?: FirebaseFirestore.Timestamp;
  token: string;
}

// Progress data structures (matching existing Firestore format)
export interface TaskCompletion {
  complete: boolean;
  failed?: boolean;
  timestamp?: number;
}

export interface TaskObjective {
  complete: boolean;
  count?: number;
  timestamp?: number;
}

export interface HideoutModule {
  complete: boolean;
  timestamp?: number;
}

export interface HideoutPart {
  complete: boolean;
  count?: number;
  timestamp?: number;
}

// Game mode type
export type GameMode = 'pvp' | 'pve';

// Progress data for a specific gamemode
export interface UserProgressData {
  level?: number;
  displayName?: string;
  gameEdition?: number;
  pmcFaction?: string;
  taskCompletions?: Record<string, TaskCompletion>;
  taskObjectives?: Record<string, TaskObjective>;
  hideoutModules?: Record<string, HideoutModule>;
  hideoutParts?: Record<string, HideoutPart>;
}

// Main progress document structure (new gamemode-aware format)
export interface ProgressDocument {
  currentGameMode?: GameMode;
  pvp?: UserProgressData;
  pve?: UserProgressData;
  // Legacy fields for backward compatibility
  level?: number;
  displayName?: string;
  gameEdition?: number;
  pmcFaction?: string;
  taskCompletions?: Record<string, TaskCompletion>;
  taskObjectives?: Record<string, TaskObjective>;
  hideoutModules?: Record<string, HideoutModule>;
  hideoutParts?: Record<string, HideoutPart>;
}

// Formatted progress (returned by API)
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

export interface ObjectiveItem {
  id: string;
  complete: boolean;
  count?: number;
  invalid?: boolean;
  failed?: boolean;
}

// Team data structures
export interface TeamDocument {
  owner: string;
  password: string;
  maximumMembers: number;
  members: string[];
  createdAt: FirebaseFirestore.Timestamp;
}

export interface SystemDocument {
  team?: string | null;
  teamMax?: number;
  lastLeftTeam?: FirebaseFirestore.Timestamp;
}

// Task validation types
export type TaskStatus = 'completed' | 'failed' | 'uncompleted';

export interface TaskUpdateRequest {
  state: TaskStatus;
}

export type MultipleTaskUpdateRequest = { id: string, state: TaskStatus }[]

export interface ObjectiveUpdateRequest {
  state?: 'completed' | 'uncompleted';
  count?: number;
}

// Service method options
export interface ServiceOptions {
  transaction?: FirebaseFirestore.Transaction;
  userId?: string;
  validatePermissions?: boolean;
}