/**
 * API Contract Types - Single Source of Truth
 *
 * This module defines the request and response shapes for all HTTP API endpoints.
 * These types align with the OpenAPI specifications and should be used by:
 * - Backend handlers for type-safe implementation
 * - Frontend clients for type-safe API calls
 * - OpenAPI annotations for documentation
 *
 * Naming Convention:
 * - Request bodies: <Endpoint>Request (e.g., CreateTeamRequest)
 * - Response bodies: <Endpoint>Response (e.g., CreateTeamResponse)
 * - Query parameters: <Endpoint>Query (e.g., GetProgressQuery)
 *
 * @module apiContracts
 */

// ============================================================================
// Common Types
// ============================================================================

/**
 * Standard API response wrapper
 * All endpoints return responses in this format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

/**
 * Game mode type for progress tracking
 */
export type GameMode = 'pvp' | 'pve';

/**
 * Token game mode (includes 'dual' for multi-mode tokens)
 */
export type TokenGameMode = 'pvp' | 'pve' | 'dual';

/**
 * Task status values
 */
export type TaskStatus = 'completed' | 'failed' | 'uncompleted';

/**
 * Permission types for API tokens
 */
export type ApiPermission = 'GP' | 'WP' | 'TP';

// ============================================================================
// Token Endpoint Contracts
// ============================================================================

/**
 * GET /token - Get token information
 *
 * Returns details about the bearer token used for authentication
 */
export interface GetTokenInfoResponse {
  success: boolean;
  permissions: string[];
  token: string;
  owner: string;
  note: string;
  calls: number;
  gameMode: TokenGameMode;
}

/**
 * POST /token/create - Create new API token
 */
export interface CreateTokenRequest {
  note: string;
  permissions: ApiPermission[];
  gameMode?: TokenGameMode;
}

export interface CreateTokenResponse {
  success: boolean;
  data: {
    token: string;
    created: boolean;
    owner: string;
    permissions: string[];
  };
}

/**
 * POST /token/revoke - Revoke API token
 */
export interface RevokeTokenRequest {
  token: string;
}

export interface RevokeTokenResponse {
  success: boolean;
  data: {
    revoked: boolean;
    token: string;
  };
}

// ============================================================================
// Progress Endpoint Contracts
// ============================================================================

/**
 * Objective item in progress response
 */
export interface ObjectiveItem {
  id: string;
  complete: boolean;
  count?: number;
  invalid?: boolean;
  failed?: boolean;
}

/**
 * Formatted progress data returned by progress endpoints
 */
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

/**
 * GET /progress - Get player progress
 */
export interface GetProgressQuery {
  gameMode?: GameMode;
}

export interface GetProgressResponse extends ApiResponse<FormattedProgress> {
  success: boolean;
  data: FormattedProgress;
  meta: {
    self: string;
    gameMode: GameMode;
  };
}

/**
 * POST /progress/level/:levelValue - Set player level
 */
export interface SetPlayerLevelParams {
  levelValue: string; // Path parameter (string, validated to number 1-79)
}

export interface SetPlayerLevelQuery {
  gameMode?: GameMode;
}

export interface SetPlayerLevelResponse extends ApiResponse {
  success: boolean;
  data: {
    level: number;
    message: string;
  };
}

/**
 * POST /progress/task/:taskId - Update single task
 */
export interface UpdateSingleTaskParams {
  taskId: string; // Path parameter
}

export interface UpdateSingleTaskRequest {
  state: TaskStatus;
}

export interface UpdateSingleTaskQuery {
  gameMode?: GameMode;
}

export interface UpdateSingleTaskResponse extends ApiResponse {
  success: boolean;
  data: {
    taskId: string;
    state: TaskStatus;
    message: string;
  };
}

/**
 * POST /progress/tasks - Update multiple tasks
 */
export interface UpdateMultipleTasksRequest {
  tasks: Array<{
    id: string;
    state: TaskStatus;
  }>;
}

export interface UpdateMultipleTasksQuery {
  gameMode?: GameMode;
}

export interface UpdateMultipleTasksResponse extends ApiResponse {
  success: boolean;
  data: {
    updated: number;
    tasks: Array<{
      id: string;
      state: TaskStatus;
    }>;
    message: string;
  };
}

/**
 * POST /progress/task/objective/:objectiveId - Update task objective
 */
export interface UpdateTaskObjectiveParams {
  objectiveId: string; // Path parameter
}

export interface UpdateTaskObjectiveRequest {
  state?: 'completed' | 'uncompleted';
  count?: number;
}

export interface UpdateTaskObjectiveQuery {
  gameMode?: GameMode;
}

export interface UpdateTaskObjectiveResponse extends ApiResponse {
  success: boolean;
  data: {
    objectiveId: string;
    state?: string;
    count?: number;
    message: string;
  };
}

// ============================================================================
// Team Endpoint Contracts
// ============================================================================

/**
 * GET /team/progress - Get team member progress
 */
export interface GetTeamProgressQuery {
  gameMode?: GameMode;
}

export interface GetTeamProgressResponse extends ApiResponse {
  success: boolean;
  data: FormattedProgress[];
  meta: {
    self: string;
    hiddenTeammates: string[];
  };
}

/**
 * POST /team/create - Create new team
 */
export interface CreateTeamRequest {
  password?: string;
  maximumMembers?: number;
}

export interface CreateTeamResponse extends ApiResponse {
  success: boolean;
  data: {
    team: string;
    password: string;
  };
}

/**
 * POST /team/join - Join existing team
 */
export interface JoinTeamRequest {
  id: string;
  password: string;
}

export interface JoinTeamResponse extends ApiResponse {
  success: boolean;
  data: {
    joined: boolean;
  };
}

/**
 * POST /team/leave - Leave current team
 */
export interface LeaveTeamResponse extends ApiResponse {
  success: boolean;
  data: {
    left: boolean;
  };
}

// ============================================================================
// User Account Endpoint Contracts
// ============================================================================

/**
 * DELETE /user/account - Delete user account
 */
export interface DeleteUserAccountResponse extends ApiResponse {
  success: boolean;
  data: {
    deleted: boolean;
    userId: string;
  };
}

// ============================================================================
// Health Check Endpoint Contracts
// ============================================================================

/**
 * GET /health - Health check endpoint
 */
export interface HealthCheckResponse {
  success: boolean;
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    service: string;
    features: Record<string, boolean>;
  };
}

// ============================================================================
// Error Response Contracts
// ============================================================================

/**
 * Standard error response shape
 * Returned by all endpoints on failure
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Union type of all possible API responses
 * Useful for discriminated unions based on success field
 */
export type AnyApiResponse<T = unknown> = ApiResponse<T> | ErrorResponse;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(response: AnyApiResponse): response is ErrorResponse {
  return response.success === false && 'error' in response;
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(response: AnyApiResponse<T>): response is ApiResponse<T> {
  return response.success === true;
}

// ============================================================================
// Re-exports from api.ts for backward compatibility
// ============================================================================

export type {
  ApiToken,
  TaskCompletion,
  TaskObjective,
  HideoutModule,
  HideoutPart,
  UserProgressData,
  ProgressDocument,
  TeamDocument,
  SystemDocument,
} from './api.js';
