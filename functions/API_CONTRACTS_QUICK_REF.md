# API Contracts Quick Reference

## 🎯 What Is This?

Centralized TypeScript type definitions for **all HTTP API endpoints** in TarkovTracker. These types ensure type safety between the Cloud Functions backend and Vue frontend.

## 📦 Key Files

| File | Purpose | LOC |
|------|---------|-----|
| `src/types/apiContracts.ts` | **Contract definitions** (use these!) | 395 |
| `src/openapi/components.ts` | OpenAPI schema definitions | 135 |
| `API_CONTRACTS.md` | Complete usage guide | 906 |
| `API_CONTRACTS_SUMMARY.md` | Implementation summary | 710 |

## 🚀 Quick Start

### Backend Handler

```typescript
import type { 
  GetProgressQuery, 
  GetProgressResponse 
} from '../types/apiContracts';

interface AuthenticatedRequest extends Request {
  query: GetProgressQuery;
  apiToken: ApiToken;
}

export const getProgress = asyncHandler(
  async (req: AuthenticatedRequest, res: Response<GetProgressResponse>): Promise<void> => {
    const gameMode = req.query.gameMode || 'pvp';
    const data = await service.getUserProgress(req.apiToken.owner, gameMode);
    
    const response: GetProgressResponse = {
      success: true,
      data,
      meta: { self: req.apiToken.owner, gameMode }
    };
    
    res.status(200).json(response);
  }
);
```

### Frontend Client

```typescript
import type { GameMode, GetProgressResponse } from '@/types/apiContracts';

async function getProgress(gameMode: GameMode): Promise<GetProgressResponse> {
  const response = await fetch(`/api/v2/progress?gameMode=${gameMode}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return response.json() as Promise<GetProgressResponse>;
}

// Type-safe usage
const result = await getProgress('pvp');
if (result.success) {
  console.log(result.data.playerLevel); // ✅ Autocomplete works!
}
```

## 📋 Available Contracts

### Token Endpoints

```typescript
GetTokenInfoResponse
CreateTokenRequest / CreateTokenResponse
RevokeTokenRequest / RevokeTokenResponse
```

### Progress Endpoints

```typescript
GetProgressQuery / GetProgressResponse
SetPlayerLevelParams / SetPlayerLevelQuery / SetPlayerLevelResponse
UpdateSingleTaskParams / UpdateSingleTaskRequest / UpdateSingleTaskResponse
UpdateMultipleTasksRequest / UpdateMultipleTasksResponse
UpdateTaskObjectiveParams / UpdateTaskObjectiveRequest / UpdateTaskObjectiveResponse
```

### Team Endpoints

```typescript
GetTeamProgressQuery / GetTeamProgressResponse
CreateTeamRequest / CreateTeamResponse
JoinTeamRequest / JoinTeamResponse
LeaveTeamResponse
```

### Other Endpoints

```typescript
DeleteUserAccountResponse
HealthCheckResponse
```

## 🛠️ Common Types

```typescript
// Response wrapper
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

// Error response
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

// Progress data
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

## 🔍 Type Guards

```typescript
import { isErrorResponse, isSuccessResponse } from '../types/apiContracts';

const response = await api.getProgress();

if (isErrorResponse(response)) {
  // response is ErrorResponse
  console.error(response.error);
  return;
}

if (isSuccessResponse(response)) {
  // response.data is available
  console.log(response.data);
}
```

## 🎨 Naming Conventions

- **Request body:** `<Endpoint>Request`
  - Example: `CreateTeamRequest`
  
- **Response body:** `<Endpoint>Response`
  - Example: `CreateTeamResponse`
  
- **Query params:** `<Endpoint>Query`
  - Example: `GetProgressQuery`
  
- **Path params:** `<Endpoint>Params`
  - Example: `UpdateSingleTaskParams`

## 🌐 OpenAPI Generation

```bash
# Generate OpenAPI spec from TypeScript types
npm run docs

# Or step-by-step:
npm run build:functions           # Build TypeScript
npm run openapi --workspace=functions  # Generate spec
npm run docs:generate             # Copy to frontend
```

## ✅ Benefits

- ✅ **Type Safety** - Compile-time checking
- ✅ **Autocomplete** - IDE support
- ✅ **Self-Documenting** - Types are documentation
- ✅ **Refactoring Safety** - Breaking changes caught
- ✅ **Frontend/Backend Alignment** - Same types everywhere
- ✅ **OpenAPI Integration** - Types match spec

## 📚 Full Documentation

- **Complete Guide:** `API_CONTRACTS.md`
- **Implementation Details:** `API_CONTRACTS_SUMMARY.md`
- **This Reference:** `API_CONTRACTS_QUICK_REF.md`

## 🔗 Related Systems

Works seamlessly with:
- **CORS Wrapper** (`middleware/corsWrapper.ts`)
- **HTTP Auth Wrapper** (`middleware/httpAuthWrapper.ts`)
- **OpenAPI Generator** (`openapi/openapi.ts`)

## 💡 Example: Complete Flow

```typescript
// 1. Define contract (apiContracts.ts)
export interface UpdateTaskRequest {
  state: TaskStatus;
}

export interface UpdateTaskResponse extends ApiResponse {
  success: boolean;
  data: {
    taskId: string;
    state: TaskStatus;
    message: string;
  };
}

// 2. Use in backend handler
import type { UpdateTaskRequest, UpdateTaskResponse } from '../types/apiContracts';

export const updateTask = asyncHandler(
  async (req: Request, res: Response<UpdateTaskResponse>): Promise<void> => {
    const body: UpdateTaskRequest = req.body;
    const { taskId } = req.params;
    
    await service.updateTask(taskId, body.state);
    
    const response: UpdateTaskResponse = {
      success: true,
      data: {
        taskId,
        state: body.state,
        message: 'Task updated'
      }
    };
    
    res.json(response);
  }
);

// 3. Use in frontend client
import type { UpdateTaskRequest, UpdateTaskResponse } from '@/types/apiContracts';

async function updateTask(
  taskId: string, 
  state: TaskStatus
): Promise<UpdateTaskResponse> {
  const request: UpdateTaskRequest = { state };
  
  const response = await fetch(`/api/v2/progress/task/${taskId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });
  
  return response.json() as Promise<UpdateTaskResponse>;
}

// 4. Use in Vue component
const result = await updateTask('task-123', 'completed');

if (result.success) {
  toast.success(result.data.message);
} else {
  toast.error(result.error);
}
```

## 📊 Coverage

✅ **13 endpoints** with complete type definitions  
✅ **All request/response** shapes typed  
✅ **Query and path** parameters typed  
✅ **Error responses** standardized  
✅ **Type guards** provided  
✅ **OpenAPI aligned** with types  

## 🎯 Best Practices

1. **Always import** contract types for new endpoints
2. **Use type guards** for runtime checking
3. **Regenerate OpenAPI** after contract changes
4. **Document examples** when adding new contracts
5. **Keep backward compatible** when updating contracts

---

**Last Updated:** 2025-11-13  
**Status:** ✅ Production Ready  
**Version:** 1.0.0
