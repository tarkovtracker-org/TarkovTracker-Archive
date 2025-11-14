# API Contracts - Type-Safe Request/Response Definitions

## Overview

This document describes the centralized API contract system for TarkovTracker. All HTTP API endpoints now have well-defined TypeScript types that ensure type safety between the backend handlers and frontend clients.

## Architecture

### Single Source of Truth

```
┌──────────────────────────────────────┐
│  types/apiContracts.ts               │
│  (TypeScript Type Definitions)       │
└──────────┬───────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼─────┐  ┌───▼──────────┐
│ Backend │  │   Frontend   │
│ Handlers│  │ API Clients  │
└─────────┘  └──────────────┘
    │             │
    └──────┬──────┘
           │
      ┌────▼────────────────┐
      │ OpenAPI Spec        │
      │ (openapi.json)      │
      └─────────────────────┘
```

**Key Principle:** Define types once in `apiContracts.ts`, use everywhere.

### Files

| File | Purpose |
|------|---------|
| `src/types/apiContracts.ts` | **Central contract definitions** - Request/response types for all endpoints |
| `src/openapi/components.ts` | **OpenAPI schemas** - Component definitions for generated spec |
| `src/openapi/openapi.ts` | **Generator script** - Extracts @openapi annotations and generates spec |
| `functions/openapi/openapi.json` | **Generated spec** - Complete OpenAPI 3.0 specification |
| `frontend/public/api/openapi.json` | **Frontend copy** - Same spec for Scalar UI |

## Contract Types

### Naming Conventions

- **Request bodies:** `<Endpoint>Request` (e.g., `CreateTeamRequest`)
- **Response bodies:** `<Endpoint>Response` (e.g., `CreateTeamResponse`)
- **Query parameters:** `<Endpoint>Query` (e.g., `GetProgressQuery`)
- **Path parameters:** `<Endpoint>Params` (e.g., `UpdateSingleTaskParams`)

### Common Types

```typescript
// Standard wrapper for all API responses
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

// Error response shape
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Game modes
type GameMode = 'pvp' | 'pve';
type TokenGameMode = 'pvp' | 'pve' | 'dual';

// Task status
type TaskStatus = 'completed' | 'failed' | 'uncompleted';

// Permissions
type ApiPermission = 'GP' | 'WP' | 'TP';
```

## Endpoint Contracts

### Token Endpoints

#### GET /token - Get Token Info

**Response:**
```typescript
interface GetTokenInfoResponse {
  success: boolean;
  permissions: string[];
  token: string;
  owner: string;
  note: string;
  calls: number;
  gameMode: TokenGameMode;
}
```

**Example:**
```json
{
  "success": true,
  "permissions": ["GP", "WP"],
  "token": "abc123...",
  "owner": "user-uuid",
  "note": "My mobile app token",
  "calls": 42,
  "gameMode": "pvp"
}
```

---

### Progress Endpoints

#### GET /progress - Get Player Progress

**Query Parameters:**
```typescript
interface GetProgressQuery {
  gameMode?: GameMode; // 'pvp' | 'pve'
}
```

**Response:**
```typescript
interface GetProgressResponse extends ApiResponse<FormattedProgress> {
  success: boolean;
  data: FormattedProgress;
  meta: {
    self: string;
    gameMode: GameMode;
  };
}

interface FormattedProgress {
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

interface ObjectiveItem {
  id: string;
  complete: boolean;
  count?: number;
  invalid?: boolean;
  failed?: boolean;
}
```

**Example:**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "displayName": "Player1",
    "playerLevel": 42,
    "gameEdition": 3,
    "pmcFaction": "usec",
    "tasksProgress": [
      { "id": "task-uuid-1", "complete": true },
      { "id": "task-uuid-2", "complete": false, "failed": false }
    ],
    "taskObjectivesProgress": [...],
    "hideoutModulesProgress": [...],
    "hideoutPartsProgress": [...]
  },
  "meta": {
    "self": "user-123",
    "gameMode": "pvp"
  }
}
```

---

#### POST /progress/level/:levelValue - Set Player Level

**Path Parameters:**
```typescript
interface SetPlayerLevelParams {
  levelValue: string; // "1" to "79"
}
```

**Query Parameters:**
```typescript
interface SetPlayerLevelQuery {
  gameMode?: GameMode;
}
```

**Response:**
```typescript
interface SetPlayerLevelResponse extends ApiResponse {
  success: boolean;
  data: {
    level: number;
    message: string;
  };
}
```

**Example:**
```json
{
  "success": true,
  "data": {
    "level": 42,
    "message": "Level updated successfully"
  }
}
```

---

#### POST /progress/task/:taskId - Update Single Task

**Path Parameters:**
```typescript
interface UpdateSingleTaskParams {
  taskId: string;
}
```

**Request Body:**
```typescript
interface UpdateSingleTaskRequest {
  state: TaskStatus; // 'completed' | 'failed' | 'uncompleted'
}
```

**Query Parameters:**
```typescript
interface UpdateSingleTaskQuery {
  gameMode?: GameMode;
}
```

**Response:**
```typescript
interface UpdateSingleTaskResponse extends ApiResponse {
  success: boolean;
  data: {
    taskId: string;
    state: TaskStatus;
    message: string;
  };
}
```

**Example Request:**
```json
{
  "state": "completed"
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "task-uuid-123",
    "state": "completed",
    "message": "Task updated successfully"
  }
}
```

---

#### POST /progress/tasks - Update Multiple Tasks

**Request Body:**
```typescript
interface UpdateMultipleTasksRequest {
  tasks: Array<{
    id: string;
    state: TaskStatus;
  }>;
}
```

**Query Parameters:**
```typescript
interface UpdateMultipleTasksQuery {
  gameMode?: GameMode;
}
```

**Response:**
```typescript
interface UpdateMultipleTasksResponse extends ApiResponse {
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
```

**Example Request:**
```json
{
  "tasks": [
    { "id": "task-1", "state": "completed" },
    { "id": "task-2", "state": "failed" },
    { "id": "task-3", "state": "uncompleted" }
  ]
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "updated": 3,
    "tasks": [
      { "id": "task-1", "state": "completed" },
      { "id": "task-2", "state": "failed" },
      { "id": "task-3", "state": "uncompleted" }
    ],
    "message": "3 tasks updated successfully"
  }
}
```

---

#### POST /progress/task/objective/:objectiveId - Update Task Objective

**Path Parameters:**
```typescript
interface UpdateTaskObjectiveParams {
  objectiveId: string;
}
```

**Request Body:**
```typescript
interface UpdateTaskObjectiveRequest {
  state?: 'completed' | 'uncompleted';
  count?: number;
}
```

**Query Parameters:**
```typescript
interface UpdateTaskObjectiveQuery {
  gameMode?: GameMode;
}
```

**Response:**
```typescript
interface UpdateTaskObjectiveResponse extends ApiResponse {
  success: boolean;
  data: {
    objectiveId: string;
    state?: string;
    count?: number;
    message: string;
  };
}
```

**Example Request:**
```json
{
  "count": 5
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "objectiveId": "obj-uuid-123",
    "count": 5,
    "message": "Objective updated successfully"
  }
}
```

---

### Team Endpoints

#### GET /team/progress - Get Team Progress

**Query Parameters:**
```typescript
interface GetTeamProgressQuery {
  gameMode?: GameMode;
}
```

**Response:**
```typescript
interface GetTeamProgressResponse extends ApiResponse {
  success: boolean;
  data: FormattedProgress[]; // Array of team member progress
  meta: {
    self: string;
    hiddenTeammates: string[];
  };
}
```

**Example:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "user-1",
      "displayName": "Player1",
      "playerLevel": 42,
      "tasksProgress": [...]
    },
    {
      "userId": "user-2",
      "displayName": "Player2",
      "playerLevel": 35,
      "tasksProgress": [...]
    }
  ],
  "meta": {
    "self": "user-1",
    "hiddenTeammates": []
  }
}
```

---

#### POST /team/create - Create Team

**Request Body:**
```typescript
interface CreateTeamRequest {
  password?: string; // Min 4 characters, auto-generated if not provided
  maximumMembers?: number; // 2-50, default 10
}
```

**Response:**
```typescript
interface CreateTeamResponse extends ApiResponse {
  success: boolean;
  data: {
    team: string;
    password: string;
  };
}
```

**Example Request:**
```json
{
  "password": "myteampass",
  "maximumMembers": 20
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "team": "team-uuid-123",
    "password": "myteampass"
  }
}
```

---

#### POST /team/join - Join Team

**Request Body:**
```typescript
interface JoinTeamRequest {
  id: string;
  password: string;
}
```

**Response:**
```typescript
interface JoinTeamResponse extends ApiResponse {
  success: boolean;
  data: {
    joined: boolean;
  };
}
```

**Example Request:**
```json
{
  "id": "team-uuid-123",
  "password": "myteampass"
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "joined": true
  }
}
```

---

#### POST /team/leave - Leave Team

**Response:**
```typescript
interface LeaveTeamResponse extends ApiResponse {
  success: boolean;
  data: {
    left: boolean;
  };
}
```

**Example:**
```json
{
  "success": true,
  "data": {
    "left": true
  }
}
```

---

### User Account Endpoints

#### DELETE /user/account - Delete User Account

**Response:**
```typescript
interface DeleteUserAccountResponse extends ApiResponse {
  success: boolean;
  data: {
    deleted: boolean;
    userId: string;
  };
}
```

**Example:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "userId": "user-uuid-123"
  }
}
```

---

## Usage in Backend Handlers

### Type-Safe Handler

```typescript
import type { Request, Response } from 'express';
import type { 
  GetProgressQuery, 
  GetProgressResponse, 
  ApiToken 
} from '../types/apiContracts';

interface AuthenticatedRequest extends Request {
  apiToken?: ApiToken;
  query: GetProgressQuery; // Type-safe query params
}

export const getPlayerProgress = asyncHandler(
  async (req: AuthenticatedRequest, res: Response<GetProgressResponse>): Promise<void> => {
    const userId = req.apiToken!.owner;
    const gameMode = req.query.gameMode || 'pvp';
    
    const progressData = await progressService.getUserProgress(userId, gameMode);
    
    // Response is type-checked
    const response: GetProgressResponse = {
      success: true,
      data: progressData,
      meta: { self: userId, gameMode },
    };
    
    res.status(200).json(response);
  }
);
```

### Type-Safe Request Validation

```typescript
import type { CreateTeamRequest, CreateTeamResponse } from '../types/apiContracts';

export const createTeam = asyncHandler(
  async (req: AuthenticatedRequest, res: Response<CreateTeamResponse>): Promise<void> => {
    // Type-safe request body
    const body: CreateTeamRequest = req.body;
    
    // Validate with type information
    if (body.password && body.password.length < 4) {
      throw new Error('Password must be at least 4 characters');
    }
    
    if (body.maximumMembers && (body.maximumMembers < 2 || body.maximumMembers > 50)) {
      throw new Error('Maximum members must be between 2 and 50');
    }
    
    const result = await teamService.createTeam(userId, body);
    
    const response: CreateTeamResponse = {
      success: true,
      data: result,
    };
    
    res.status(200).json(response);
  }
);
```

---

## Usage in Frontend

### Type-Safe API Client

```typescript
import type { 
  GetProgressResponse, 
  UpdateSingleTaskRequest,
  UpdateSingleTaskResponse,
  GameMode 
} from '@/types/apiContracts';

class ProgressApi {
  async getProgress(gameMode?: GameMode): Promise<GetProgressResponse> {
    const params = new URLSearchParams();
    if (gameMode) params.set('gameMode', gameMode);
    
    const response = await fetch(`/api/v2/progress?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.json() as Promise<GetProgressResponse>;
  }
  
  async updateTask(
    taskId: string, 
    request: UpdateSingleTaskRequest
  ): Promise<UpdateSingleTaskResponse> {
    const response = await fetch(`/api/v2/progress/task/${taskId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    return response.json() as Promise<UpdateSingleTaskResponse>;
  }
}
```

### Type-Safe Vue Composable

```typescript
import { ref } from 'vue';
import type { FormattedProgress, GameMode } from '@/types/apiContracts';

export function useProgress() {
  const progress = ref<FormattedProgress | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  async function fetchProgress(gameMode: GameMode = 'pvp') {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await progressApi.getProgress(gameMode);
      
      if (response.success) {
        progress.value = response.data;
      } else {
        error.value = response.error || 'Unknown error';
      }
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }
  
  return {
    progress,
    loading,
    error,
    fetchProgress
  };
}
```

---

## OpenAPI Generation

### Workflow

```bash
# 1. Build TypeScript
npm run build:functions

# 2. Generate OpenAPI spec from @openapi annotations
npm run openapi --workspace=functions

# 3. Copy to frontend
npm run docs:generate

# 4. View in Scalar UI
# Open: http://localhost:3000/api/openapi.json (in Scalar UI)
```

### Adding New Endpoints

1. **Define contract types** in `types/apiContracts.ts`:
```typescript
export interface MyNewEndpointRequest {
  field1: string;
  field2: number;
}

export interface MyNewEndpointResponse extends ApiResponse {
  success: boolean;
  data: {
    result: string;
  };
}
```

2. **Add OpenAPI component** in `openapi/components.ts`:
```typescript
/**
 * @openapi
 * components:
 *   schemas:
 *     MyNewEndpointRequest:
 *       type: object
 *       required:
 *         - field1
 *         - field2
 *       properties:
 *         field1:
 *           type: string
 *         field2:
 *           type: integer
 */
```

3. **Add handler with @openapi annotation**:
```typescript
/**
 * @openapi
 * /my-endpoint:
 *   post:
 *     summary: "My new endpoint"
 *     tags:
 *       - "MyFeature"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MyNewEndpointRequest'
 *     responses:
 *       200:
 *         description: "Success"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
export const myNewEndpoint = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const body: MyNewEndpointRequest = req.body;
    // Handler logic...
  }
);
```

4. **Regenerate spec**:
```bash
npm run docs
```

---

## Type Guards

Use type guards for runtime type checking:

```typescript
import { isErrorResponse, isSuccessResponse } from '../types/apiContracts';

const response = await api.getProgress();

if (isErrorResponse(response)) {
  console.error('API error:', response.error);
  return;
}

if (isSuccessResponse(response)) {
  console.log('Success:', response.data);
}
```

---

## Error Handling

All endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
```

**Example error response:**
```json
{
  "success": false,
  "error": "Invalid task ID provided",
  "code": "INVALID_TASK_ID",
  "details": {
    "taskId": "invalid-uuid"
  }
}
```

---

## Benefits

✅ **Type Safety** - Compile-time checking for requests/responses  
✅ **Single Source of Truth** - One definition, used everywhere  
✅ **Self-Documenting** - Types serve as documentation  
✅ **Refactoring Safety** - TypeScript catches breaking changes  
✅ **IDE Support** - Autocomplete and inline documentation  
✅ **Frontend/Backend Alignment** - Same types on both sides  
✅ **OpenAPI Alignment** - Types match generated spec  

---

## Related Files

- `src/types/apiContracts.ts` - Contract type definitions
- `src/types/api.ts` - Internal backend types
- `src/openapi/components.ts` - OpenAPI component schemas
- `src/openapi/openapi.ts` - OpenAPI generator script
- `functions/openapi/openapi.json` - Generated OpenAPI spec
- `frontend/public/api/openapi.json` - Frontend copy of spec

---

**Last Updated:** 2025-11-13  
**Status:** ✅ Complete - Use these contracts for all API endpoints
