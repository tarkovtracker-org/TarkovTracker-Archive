# TarkovTracker Domain & API Architecture

A concise reference for Firestore schemas, permissions, and API endpoint mappings in TarkovTracker.

## Quick Start

This document is for:
- **Developers** adding new features or debugging data flows
- **AI agents** reasoning about system behavior without reading every file
- **Architects** understanding core business rules and constraints

Key takeaway: TarkovTracker separates user progress (game state), team membership, and API token management into 6 Firestore collections, secured by bearer token authentication with 3 permission levels (GP/TP/WP).

---

## Firestore Collections

### `system/{userId}`
User metadata and team/token references. Each authenticated user has exactly one `system/{userId}` document.

| Field | Type | Purpose |
|-------|------|---------|
| `team` | `string \| null` | ID of team user belongs to (null if solo) |
| `teamMax` | `number` | Maximum team size (inherited from team doc) |
| `lastLeftTeam` | `Timestamp` | Cooldown timestamp; user cannot create/join for 5 minutes after leaving |
| `tokens` | `string[]` | Array of token IDs (stored in `token` collection) |

**Access Control** (`/firestore.rules`):
- User can read/write own `system/{userId}` only
- Backend services can read/write for account operations

**Example**:
```json
{
  "team": "team-abc123def456",
  "teamMax": 10,
  "lastLeftTeam": Timestamp(2025-01-15T10:00:00Z),
  "tokens": ["token1_base64url", "token2_base64url"]
}
```

---

### `progress/{userId}`
Game progress tracker with separate PvP and PvE modes. Represents player level, task/objective completion, and hideout progression.

| Field | Type | Purpose |
|-------|------|---------|
| `currentGameMode` | `'pvp' \| 'pve'` | Active mode (informational) |
| `pvp` | `ProgressMode` | PvP-specific progress data |
| `pve` | `ProgressMode` | PvE-specific progress data |

**ProgressMode structure**:
```typescript
{
  level?: number;                    // Player level (1-79)
  displayName?: string;              // Character name
  gameEdition?: number;              // Edition (1-6)
  pmcFaction?: 'USEC' \| 'BEAR';      // PMC faction
  taskCompletions?: {
    [taskId]: {
      complete: boolean;
      failed?: boolean;              // Task failed but marked complete
      timestamp?: number;            // Completion time (ms since epoch)
    }
  };
  taskObjectives?: {
    [objectiveId]: {
      complete: boolean;
      count?: number;                // Progress toward objective (e.g., kills)
      timestamp?: number;
    }
  };
  hideoutModules?: {
    [moduleId]: {
      complete: boolean;
      timestamp?: number;
    }
  };
  hideoutParts?: {
    [partId]: {
      complete: boolean;
      count?: number;
      timestamp?: number;
    }
  };
}
```

**Access Control**:
- Owner can read/write own progress
- Team members can read each other's progress (via `memberOfSameTeam()` rule)
- Non-team users cannot access other progress

**Game Mode Isolation**:
- Progress is tracked separately for PvP and PvE
- API endpoints accept `?gameMode=pvp|pve` query parameter
- Token `gameMode` field restricts which modes a token can access
  - `'pvp'` | `'pve'`: Single-mode tokens (fixed to one mode)
  - `'dual'`: Dual-mode tokens (query parameter required to specify mode)

---

### `user/{userId}`
User UI preferences and account settings. Optional document; created on first access.

| Field | Type | Purpose |
|-------|------|---------|
| `teamHide` | `{[userId]: boolean}` | Hidden teammates map (visibility preferences) |
| `displayName` | `string` | User's display name (sanitized for XSS) |
| `createdAt` | `Timestamp` | Account creation time |
| `lastSignInTime` | `Timestamp` | Last authentication time |
| `[key: string]` | `unknown` | Other user-specific preferences |

**Access Control**:
- User can read/write own `user/{userId}` only

---

### `token/{tokenString}`
API authentication tokens. Document ID is the token itself (base64url encoded, 64 characters).

| Field | Type | Purpose |
|-------|------|---------|
| `owner` | `string` | User ID who owns the token |
| `note` | `string` | Token description (e.g., "Mobile app", "Integration") |
| `permissions` | `string[]` | Array of permission scopes: `['GP', 'TP', 'WP']` (any combination) |
| `gameMode` | `'pvp' \| 'pve' \| 'dual'` | Game mode restriction (optional; defaults to 'dual') |
| `calls` | `number` | Usage counter (incremented on each request) |
| `createdAt` | `Timestamp` | Token creation time |
| `revoked` | `boolean` | Soft-delete marker (checked on validation) |
| `isActive` | `boolean` | Expiration flag (optional; checked if present) |
| `status` | `'active' \| 'expired' \| 'revoked'` | Token status (optional) |
| `lastUsed` | `Timestamp` | Last usage time (optional; updated fire-and-forget) |
| `expiredAt` | `Timestamp` | Expiration deadline (optional; set by expiration job) |

**Token Generation**:
- Created via `crypto.randomBytes(48).toString('base64url')` → 64 characters
- Stored in Firestore with token string as the document ID
- Referenced in `system/{userId}.tokens[]` array

**Access Control**:
- Token owner can read own tokens and update `calls`, `note` only
- Backend can read/write for auth operations

**Example**:
```json
{
  "owner": "user-12345",
  "note": "Mobile app token",
  "permissions": ["GP", "WP"],
  "gameMode": "pvp",
  "calls": 247,
  "createdAt": Timestamp(2025-01-01T00:00:00Z),
  "revoked": false
}
```

---

### `team/{teamId}`
Team information and membership. Document ID is a generated 32-character team ID.

| Field | Type | Purpose |
|-------|------|---------|
| `owner` | `string` | User ID of team owner |
| `password` | `string` | Join password (auto-generated 48-char or custom min 4 chars) |
| `maximumMembers` | `number` | Max team size (2–50; default 10) |
| `members` | `string[]` | Array of user IDs in team |
| `createdAt` | `Timestamp` | Team creation time |

**Access Control**:
- Team members can read the team document
- Non-members cannot read
- Owner can update members and maximumMembers
- Members can remove themselves (owner disbands team)

**Team Ownership Transfer**:
- When owner leaves/deletes account: Ownership transfers to oldest member (by `user.createdAt`)
- If no members remain: Team is deleted

---

### `tarkovData/tasks, tarkovData/hideout, tarkovData/items`
Cached game metadata from [Tarkov.dev API](https://tarkov.dev). Updated via `updateTarkovData` scheduled function.

**Access**: Read-only by backend; synced automatically from Tarkov.dev.

---

### `rateLimitEvents/{eventId}`
Abuse detection event log. Used by rate limiting middleware to enforce request quotas.

| Field | Type | Purpose |
|-------|------|---------|
| `cacheKey` | `string` | Identifier for rate limit bucket (e.g., IP, token) |
| `createdAt` | `Timestamp` | Event time |
| `(rate limit metadata)` | `*` | Event-specific data |

**Index**: Composite `(cacheKey ASC, createdAt DESC)` for efficient range queries.

---

## Permissions & Tokens

### Permission Types

Permissions are stored as strings in `token.permissions[]`. Three permission levels control API access:

| Permission | Meaning | Grants access to |
|------------|---------|------------------|
| **GP** | Get Progress | `GET /api/progress` — read own game progress |
| **TP** | Team Progress | `GET /api/team/progress` — read all team members' progress |
| **WP** | Write Progress | `POST /api/progress/*` — create/update own progress (tasks, objectives, level) |

**Permission Combinations**:
- `['GP']`: Read own progress only
- `['GP', 'WP']`: Read and write own progress
- `['TP']`: Read team progress only
- `['GP', 'TP', 'WP']`: Full access (team operations + progress read/write)

### Token Lifecycle

**1. Creation** (Callable Firebase Function):
```javascript
// Client calls: firebase.functions().httpsCallable('createToken')({
//   note: 'My token',
//   permissions: ['GP', 'WP'],
//   gameMode: 'pvp'
// })
// Returns: { token: 'base64url_string', ... }
```

**2. Usage** (API endpoint):
```bash
GET /api/progress \
  -H "Authorization: Bearer <token>"
```

**3. Validation Flow**:
1. Middleware `verifyBearerToken` extracts token from `Authorization: Bearer <token>`
2. Looks up token in `token/{tokenString}` collection
3. Checks: exists, not revoked, not expired
4. Attaches `req.apiToken` and `req.user` to request object
5. Increments `calls` counter (fire-and-forget)
6. Returns 401 if missing; 403 if missing permission

**4. Permission Enforcement**:
- Handlers use `requirePermission('GP')` middleware before executing
- Service-level enforcement in `ValidationService.validatePermissions(token, requiredPermission)`
- Returns 403 Forbidden if token lacks required permission

**5. Revocation**:
- Owner can revoke via callable function
- Sets `revoked: true` or deletes document entirely
- Revoked tokens rejected on next API request (no immediate effect; cached briefly)

**6. Expiration** (optional):
- Scheduled function `expireInactiveTokens` runs periodically
- Sets `isActive: false` or `status: 'expired'` on tokens unused for N days
- Expired tokens rejected during validation

---

## API Endpoint Mapping

### Base URL & Authentication
- **Base**: `/api/*` (all endpoints)
- **Auth**: All endpoints require `Authorization: Bearer <tokenString>` header
- **Exception**: `GET /health` requires no auth
- **Protection**: All write operations (POST/PUT/PATCH/DELETE) rate-limited (150 req/10s default)

### Progress Endpoints

| Endpoint | Method | Permission | Handler | Service | Description |
|----------|--------|-----------|---------|---------|-------------|
| `/api/progress` | GET | GP | `progressHandler.getPlayerProgress` | `ProgressService.getUserProgress()` | Get own progress for specified game mode |
| `/api/v2/progress` | GET | GP | `progressHandler.getPlayerProgress` | `ProgressService.getUserProgress()` | Same as v1 |
| `/api/progress/level/:levelValue` | POST | WP | `progressHandler.setPlayerLevel` | `ProgressService.setPlayerLevel()` | Set player level (1-79) |
| `/api/v2/progress/level/:levelValue` | POST | WP | `progressHandler.setPlayerLevel` | `ProgressService.setPlayerLevel()` | Same as v1 |
| `/api/progress/task/:taskId` | POST | WP | `progressHandler.updateSingleTask` | `ProgressService.updateSingleTask()` | Update single task state (complete/failed/uncompleted) |
| `/api/v2/progress/task/:taskId` | POST | WP | `progressHandler.updateSingleTask` | `ProgressService.updateSingleTask()` | Same as v1 |
| `/api/progress/tasks` | POST | WP | `progressHandler.updateMultipleTasks` | `ProgressService.updateMultipleTasks()` | Batch update multiple tasks (transactional) |
| `/api/v2/progress/tasks` | POST | WP | `progressHandler.updateMultipleTasks` | `ProgressService.updateMultipleTasks()` | Same as v1 |
| `/api/progress/task/objective/:objectiveId` | POST | WP | `progressHandler.updateTaskObjective` | `ProgressService.updateTaskObjective()` | Update objective state and/or count |
| `/api/v2/progress/task/objective/:objectiveId` | POST | WP | `progressHandler.updateTaskObjective` | `ProgressService.updateTaskObjective()` | Same as v1 |

**Query Parameters**:
- `?gameMode=pvp|pve` — Specify game mode (required for dual-mode tokens; optional for single-mode)

**Request Bodies** (examples):
- Level: `{ level: 42 }`
- Single task: `{ status: 'completed' \| 'failed' \| 'uncompleted' }`
- Multiple tasks: `{ tasks: [{ id: 'task-1', status: 'completed' }, ...] }`
- Objective: `{ state: true, count: 5 }`

---

### Team Endpoints

| Endpoint | Method | Permission | Handler | Service | Description |
|----------|--------|-----------|---------|---------|-------------|
| `/api/team/progress` | GET | TP | `teamHandler.getTeamProgress` | `TeamService.getTeamProgress()` | Get all team members' progress |
| `/api/v2/team/progress` | GET | TP | `teamHandler.getTeamProgress` | `TeamService.getTeamProgress()` | Same as v1 |
| `/api/team/create` | POST | — | `teamHandler.createTeam` | `TeamService.createTeam()` | Create new team (no permission required) |
| `/api/team/join` | POST | — | `teamHandler.joinTeam` | `TeamService.joinTeam()` | Join existing team (no permission required) |
| `/api/team/leave` | POST | — | `teamHandler.leaveTeam` | `TeamService.leaveTeam()` | Leave team (no permission required) |

**Request Bodies**:
- Create: `{ password?: string, maximumMembers?: 2-50 }` (optional; password auto-generated)
- Join: `{ id: string, password: string }` (required)
- Leave: `{}` (empty body)

**Constraints**:
- User cannot be in a team when creating/joining
- 5-minute cooldown after leaving before creating/joining again
- Owner disband: All members removed; ownership transfers to oldest member if any remain

---

### Token Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/token` | GET | Get token metadata (owner, note, permissions, usage stats) |
| `/api/v2/token` | GET | Same as v1 |

**Callable Functions** (Firebase Cloud Functions v1; deprecated in favor of REST):
- `createToken(data)` — Create new token
- `revokeToken(data)` — Revoke token by ID

---

### User Management

| Endpoint | Method | Handler | Service | Description |
|----------|--------|---------|---------|-------------|
| `/api/user/account` | DELETE | `deleteUserAccountHandler` | `UserDeletionService` | Permanently delete user account and all data |

**Requirements**:
- Valid bearer token
- `requireRecentAuth` — User must have authenticated recently (see `middleware/reauth.ts`)
- Request body: `{ confirm: "DELETE MY ACCOUNT" }` (exact string required)

**On Deletion**:
1. Team ownership transfers to oldest member (or team deleted if empty)
2. All documents deleted: `progress/{userId}`, `system/{userId}`, `user/{userId}`, `token/{*}` (all owned by user)
3. Firebase Auth account deleted
4. Transactional consistency for team operations; progress/user/tokens deleted post-transaction

---

### Health & Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check; returns `{ status: 'healthy', timestamp, version, service, features }` |

**No authentication required**.

---

## Service Architecture

### Design Pattern: Repository + Service Layers

Services use repositories (injected) to abstract Firestore access, enabling unit testing without emulator.

```
Handler (Express route)
  ↓
Service (Business logic)
  ↓
Repository (Data access) → Firestore
```

### Core Services

#### **ProgressService** (`functions/src/services/ProgressService.ts`)

Manages game progress (tasks, objectives, hideout, levels).

| Method | Returns | Purpose |
|--------|---------|---------|
| `getUserProgress(userId, gameMode)` | `ProgressMode` | Fetch progress; return empty if not found |
| `setPlayerLevel(userId, level, gameMode)` | `void` | Validate level (1-79); update in transaction |
| `updateSingleTask(userId, taskId, status, gameMode)` | `void` | Update task; resolve dependencies; run post-transaction |
| `updateMultipleTasks(userId, updates, gameMode)` | `void` | Batch update tasks in single transaction |
| `updateTaskObjective(userId, objectiveId, update, gameMode)` | `void` | Update objective `state` and/or `count` |
| `validateTaskAccess(userId, taskId)` | `boolean` | Check if task is valid (placeholder for future expansion) |
| `getTaskStatus(userId, taskId)` | `TaskStatus \| undefined` | Get task completion state |

**Key Features**:
- **Game mode awareness**: All methods accept `gameMode` param; read/write to `progress.{pvp|pve}.*`
- **Transactional updates**: Use Firestore transactions for consistency
- **Dependency handling**: Tasks with dependencies; completing a task may invalidate dependent tasks
- **Lazy init**: Firestore initialized on first service instantiation

**File Locations**:
- Core logic: `functions/src/services/ProgressService.ts`
- Utilities: `functions/src/progress/progressUtils.ts` (dependency resolution, state validation)

---

#### **TeamService** (`functions/src/services/TeamService.ts`)

Manages team creation, membership, and team-wide progress queries.

**Architecture**: Aggregator pattern
- Core logic modularized under `functions/src/services/team/`:
  - `teamCore.ts` — Create, generate password
  - `teamMembership.ts` — Join, leave
  - `teamProgress.ts` — Fetch all members' progress
- Repository pattern: `ITeamRepository` interface with `FirestoreTeamRepository` implementation

| Method | Returns | Purpose |
|--------|---------|---------|
| `createTeam(userId, options)` | `{ id, password, ... }` | Create new team; validate user not in team; check cooldown |
| `joinTeam(userId, { id, password })` | `{ id, ... }` | Join team; validate password; add user to members |
| `leaveTeam(userId)` | `void` | Remove user from team; disband if owner; transfer ownership if needed |
| `getTeamProgress(userId, gameMode)` | `Map<userId, ProgressMode>` | Fetch all members' progress for specified mode |

**Business Rules**:
- User cannot be in team when creating/joining
- 5-minute cooldown after leaving (checked via `system.{userId}.lastLeftTeam`)
- Owner leaving: Team disbanded; all members removed
- Owner deletion: Ownership transfers to oldest member (by `user.createdAt`); team deleted if no members remain
- Non-owner leaving: User removed from `team.members[]` array
- Visibility: Members can optionally hide teammates via `user.{userId}.teamHide` map

**Repository Abstraction**:
- `ITeamRepository` interface defines data access contract
- `FirestoreTeamRepository` implements against Firestore
- Enables `FakeTeamRepository` for testing (see `functions/test/repositories/FakeTeamRepository.ts`)
- Transactional consistency for join/leave operations

---

#### **TokenService** (`functions/src/services/TokenService.ts`)

Manages API token creation, validation, and metadata.

| Method | Returns | Purpose |
|--------|---------|---------|
| `getTokenInfo(tokenString)` | `TokenMetadata` | Retrieve token metadata (owner, note, permissions, calls) |
| `validateToken(authHeader)` | `{ token, userId }` | Parse `Authorization: Bearer <token>`; validate in Firestore; return token doc |
| `createToken(owner, options)` | `{ token: string, ... }` | Generate new token; store in Firestore; add to `system.{userId}.tokens[]` |
| `revokeToken(tokenString, userId)` | `void` | Validate ownership; delete token document |
| `listUserTokens(userId)` | `Token[]` | Fetch all tokens owned by user |
| `validatePermissions(token, requiredPermission)` | `void` (throws on error) | Check if token has required permission; throw 403 if missing |

**Key Features**:
- **Secure generation**: `crypto.randomBytes(48).toString('base64url')` → 64-char token
- **Game mode support**: Single-mode (`pvp`/`pve`) or dual-mode (`dual`) tokens
- **Usage tracking**: `calls` field auto-incremented (fire-and-forget; doesn't block request)
- **Expiration**: Optional `isActive`, `status`, `expiredAt` fields checked during validation
- **Permission validation**: Static method to check required permissions

---

#### **ValidationService** (`functions/src/services/ValidationService.ts`)

Input validation and sanitization. **All methods are static.**

| Method | Purpose |
|--------|---------|
| `validateTaskStatus(status)` | Ensure status is `'completed'`, `'failed'`, or `'uncompleted'` |
| `validateTaskUpdate(body)` | Parse task update request; return `{ status }` or throw |
| `validateMultipleTaskUpdate(body)` | Parse batch update; return `{ tasks: [...] }` or throw |
| `validateObjectiveUpdate(body)` | Parse objective update; return `{ state?, count? }` or throw |
| `validateTaskId(taskId)` | Validate task ID format; throw if invalid |
| `validateObjectiveId(objectiveId)` | Validate objective ID format |
| `validateLevel(level)` | Ensure level is integer between 1 and 79 |
| `validatePermissions(token, requiredPermission)` | Check if token has permission; throw 403 if missing |
| `validateUserId(userId)` | Validate user ID format |
| `validateDisplayName(displayName)` | Sanitize for XSS; trim whitespace |
| `validateGameEdition(edition)` | Ensure edition is integer 1–6 |
| `validatePmcFaction(faction)` | Ensure faction is `'USEC'` or `'BEAR'` |

**Error Handling**: All methods throw `ApiError` (caught by error handler middleware) with appropriate HTTP status.

---

#### **UserDeletionService** (part of `functions/src/handlers/userDeletionHandler.ts`)

Handles permanent account deletion with cascade cleanup.

| Method | Purpose |
|--------|---------|
| `deleteUserAccount(userId, request)` | Validate confirmation; orchestrate deletion flow |
| `handleTeamCleanup(userId)` | Transfer ownership or remove from team |
| `transferTeamOwnership(tx, teamRef, teamData, ownerId)` | Transfer to oldest member |
| `findOldestMember(memberIds)` | Fetch all members; return oldest by `createdAt` |
| `deleteUserData(userId)` | Delete all Firestore documents for user |
| `deleteFirebaseAuthUser(userId)` | Delete Firebase Auth account |

**Deletion Flow**:
1. Validate `confirm: "DELETE MY ACCOUNT"` in request body
2. Handle team: Transfer ownership to oldest member or delete if empty (transactional)
3. Delete all Firestore documents: `progress/{userId}`, `system/{userId}`, `user/{userId}`, `token/{*}`
4. Delete Firebase Auth account (last step; no rollback)
5. Return 200 OK on success

---

## Key Business Rules & Constraints

### Progress Management

1. **Game Mode Isolation**
   - Progress tracked separately in `progress.pvp` and `progress.pve`
   - Tokens restricted to `gameMode: 'pvp'` | `'pve'` | `'dual'`
   - Single-mode tokens: API request fails if `?gameMode` param doesn't match token mode
   - Dual-mode tokens: `?gameMode=pvp|pve` query parameter required (no default)

2. **Task States**
   - `'completed'`: Task finished (may be failed)
   - `'failed'`: Task attempted but failed; still marked complete
   - `'uncompleted'`: Task not done

3. **Task Dependencies**
   - Completing a task may invalidate tasks that require it uncompleted
   - Dependency resolution runs **outside transaction** (to avoid conflicts)
   - Updates are fire-and-forget; failures logged but don't block main request

4. **Level Constraints**
   - Valid: 1–79 (integers only)
   - Updates `progress.{gameMode}.level` field

5. **Objective Updates**
   - `state`: boolean (completed vs. uncompleted)
   - `count`: non-negative integer (progress toward objective)
   - Timestamp added on completion

---

### Team Management

1. **Team Creation**
   - User must not be in a team (check `system.{userId}.team` is null)
   - If user left team recently: Check `lastLeftTeam` timestamp; reject if < 5 minutes ago
   - Password: Auto-generated (48 random bytes → base64) or custom (min 4 chars)
   - Maximum members: 2–50 (default 10)
   - Team ID: Generated 32-character unique identifier
   - Ownership: Creator becomes owner
   - Members: Initialized as `[userId]` (owner alone)

2. **Team Joining**
   - User must not be in team
   - Team must exist and have space (members count < maximumMembers)
   - Password must match exactly
   - User added to `team.members[]` array
   - `system.{userId}.team` set to team ID

3. **Team Leaving / Disbanding**
   - Non-owner leaves: Removed from `team.members[]`; `lastLeftTeam` timestamp set
   - Owner leaves: Team disbanded; all members removed; **ownership transfers to oldest member** (by account creation time)
   - If no members remain: Team document deleted

4. **Ownership Transfer** (on user deletion)
   - Find oldest member by `user.{userId}.createdAt` timestamp
   - Set `team.owner` to oldest member's user ID
   - If no members: Delete team

---

### Token Management

1. **Token Generation**
   - 48 random bytes → base64url encoding → 64-character token
   - Stored in `token/{tokenString}` collection
   - Referenced in `system/{userId}.tokens[]`

2. **Valid Permissions**
   - `['GP']`, `['TP']`, `['WP']` (any combination)
   - At least one permission required
   - Invalid permissions cause creation to fail (400 Bad Request)

3. **Token Revocation**
   - Owner can revoke via callable function or REST endpoint
   - Revoked tokens deleted from Firestore (hard delete; no soft-delete flag)
   - Removed from `system.{userId}.tokens[]`

4. **Token Expiration** (optional feature)
   - Scheduled job `expireInactiveTokens` marks unused tokens as `isActive: false` or `status: 'expired'`
   - Validation check rejects expired tokens (401 Unauthorized)

5. **Usage Tracking**
   - Every API request increments `token.calls` counter
   - Update is fire-and-forget (doesn't block request response)
   - No transaction; eventual consistency acceptable

---

### Security & Abuse Prevention

1. **Rate Limiting** (via `abuseGuard` middleware)
   - Applies to: POST, PUT, PATCH, DELETE methods
   - Protected paths: `/api/progress/*`, `/api/team/*`
   - Limit: 150 requests per 10-second window
   - Breach at 2 consecutive limits: Temporary block
   - Warning at 80% threshold

2. **Authentication Requirements**
   - All `/api/*` endpoints require valid `Authorization: Bearer <token>` header
   - Exception: `/health` (no auth required)
   - Invalid token: 401 Unauthorized
   - Missing permission: 403 Forbidden

3. **Recent Auth Requirement** (for destructive operations)
   - Account deletion requires `requireRecentAuth` middleware
   - Ensures user has authenticated within a time window (default: 5 minutes)

4. **Input Validation**
   - All user inputs validated via `ValidationService` static methods
   - Display names sanitized for XSS
   - IDs trimmed; whitespace validation
   - Invalid inputs: 400 Bad Request

---

### Data Integrity

1. **Transaction Safety**
   - Team operations (join, leave, create) use Firestore transactions
   - Progress updates use transactions for single-user consistency
   - Task dependency updates run post-transaction (no rollback on failure)

2. **Lazy Initialization**
   - Services initialize Firestore Admin SDK on first use
   - Prevents initialization errors in hot-reload dev environments

3. **Error Handling**
   - Structured errors: `ApiError` class with HTTP status and message
   - Middleware catches errors; returns JSON response
   - All errors logged with context (user ID, endpoint, error details)

4. **Cascading Deletes**
   - User deletion triggers:
     - Team cleanup (transfer ownership or delete)
     - Deletion of all user documents (`progress`, `system`, `user`)
     - Deletion of all user tokens
     - Firebase Auth account deletion (last step)

---

## Key Relationships & Workflows

### User ↔ Team
```
system/{userId}.team → team/{teamId}.id
team/{teamId}.owner → userId
team/{teamId}.members[] ← [userId, userId, ...]
```

**Invariant**: If `system/{userId}.team == teamId`, then `userId ∈ team/{teamId}.members[]`.

### User ↔ Token
```
system/{userId}.tokens[] → token/{tokenString}
token/{tokenString}.owner → userId
```

**Invariant**: If `tokenString ∈ system/{userId}.tokens[]`, then `token/{tokenString}.owner == userId`.

### User ↔ Progress
```
system/{userId}.team → (may be null)
progress/{userId}.pvp, pve → (separate game modes)
token.gameMode ← determines which progress to access
```

### Token ↔ Permissions ↔ Endpoints
```
token.permissions[] → ['GP', 'TP', 'WP']
GP → GET /api/progress (read own)
TP → GET /api/team/progress (read team)
WP → POST /api/progress/* (write own)
```

---

## Common Workflows

### Create Account & Token
1. User signs up via Firebase Auth
2. System auto-creates `system/{userId}` with empty team/tokens
3. User calls `createToken(...)` → generates token → stores in `token/{tokenString}`
4. Token ID added to `system/{userId}.tokens[]`
5. User receives token; uses in API requests

### Update Progress
1. Client sends `POST /api/progress/task/:taskId` with `Authorization: Bearer <token>`
2. Middleware validates token; checks permission (WP required)
3. Handler calls `ProgressService.updateSingleTask(userId, taskId, status, gameMode)`
4. Service validates input; looks up task; updates Firestore (transaction)
5. Post-transaction: Resolve task dependencies asynchronously
6. Return 200 OK with updated progress state

### Create & Join Team
1. User A calls `POST /api/team/create` → system creates team
   - Generates 32-char team ID, auto-password
   - Sets `team.owner = userId`, `team.members = [userId]`
   - Sets `system/{userId}.team = teamId`
2. User B calls `POST /api/team/join` with team ID and password
   - Validates password matches
   - Adds user B to `team.members[]`
   - Sets `system/{userB}.team = teamId`
3. Both users can now see each other's progress via `GET /api/team/progress`

### Leave Team & Transfer Ownership
1. Owner calls `POST /api/team/leave`
2. System checks `team.owner == userId` → disbanding scenario
3. Fetches oldest member by `user.{memberId}.createdAt`
4. Transfers ownership: `team.owner = oldestMemberId`
5. Owner removed from `team.members[]`
6. Sets `system/{ownerId}.lastLeftTeam = now` (5-min cooldown)
7. Remaining members can continue using team

### Delete Account
1. User calls `DELETE /api/user/account` with recent auth + confirmation text
2. System fetches `system/{userId}` and `team/{teamId}` (if member)
3. If team owner: Transfers to oldest member or deletes team (transactional)
4. Deletes all user documents: `progress`, `system`, `user`, `token/*`
5. Deletes Firebase Auth account
6. Returns 200 OK; user cannot authenticate afterward

---

## File References

| Concern | File | Key Functions |
|---------|------|----------------|
| **Firestore Rules** | `firestore.rules` | `memberOfSameTeam()`, `isTeamMember()` |
| **Indexes** | `firestore.indexes.json` | Token queries, rate limit event queries |
| **Progress Service** | `functions/src/services/ProgressService.ts` | `getUserProgress()`, `updateMultipleTasks()` |
| **Progress Utils** | `functions/src/progress/progressUtils.ts` | `updateTaskState()`, `resolveDependencies()` |
| **Team Service** | `functions/src/services/TeamService.ts` | `createTeam()`, `joinTeam()`, `leaveTeam()` |
| **Team Core** | `functions/src/services/team/teamCore.ts` | Password generation, team initialization |
| **Team Repository** | `functions/src/repositories/ITeamRepository.ts`, `FirestoreTeamRepository.ts` | Data access abstraction |
| **Token Service** | `functions/src/services/TokenService.ts` | Token validation, generation, revocation |
| **Validation Service** | `functions/src/services/ValidationService.ts` | Input validation & sanitization |
| **Progress Handler** | `functions/src/handlers/progressHandler.ts` | Express routes for progress endpoints |
| **Team Handler** | `functions/src/handlers/teamHandler.ts` | Express routes for team endpoints |
| **Auth Middleware** | `functions/src/middleware/auth.ts`, `onRequestAuth.ts` | Bearer token validation |
| **Permission Middleware** | `functions/src/middleware/permissions.ts` | Permission enforcement (`requirePermission`) |
| **Error Handler** | `functions/src/middleware/errorHandler.ts` | Centralized error response formatting |
| **Abuse Guard** | `functions/src/middleware/abuseGuard.ts` | Rate limiting logic |
| **User Deletion** | `functions/src/handlers/userDeletionHandler.ts` | Account deletion & cascade cleanup |

---

## Appendix: Example Data Shapes

### Progress Document (Filled)
```json
{
  "currentGameMode": "pvp",
  "pvp": {
    "level": 42,
    "displayName": "FearsomeGunner",
    "gameEdition": 4,
    "pmcFaction": "USEC",
    "taskCompletions": {
      "task-001": { "complete": true, "timestamp": 1704067200000 },
      "task-002": { "complete": true, "failed": true, "timestamp": 1704153600000 }
    },
    "taskObjectives": {
      "obj-001": { "complete": false, "count": 15 },
      "obj-002": { "complete": true, "count": 5, "timestamp": 1704240000000 }
    },
    "hideoutModules": {
      "hideout-001": { "complete": true, "timestamp": 1704326400000 }
    },
    "hideoutParts": {
      "part-001": { "complete": false, "count": 3 }
    }
  }
}
```

### Team Document
```json
{
  "owner": "user-abc123",
  "password": "aB3xY9mK0pQrSt1u",
  "maximumMembers": 10,
  "members": ["user-abc123", "user-def456", "user-ghi789"],
  "createdAt": Timestamp(2024-12-01T10:30:00Z)
}
```

### Token Document
```json
{
  "owner": "user-abc123",
  "note": "Mobile app integration",
  "permissions": ["GP", "WP"],
  "gameMode": "pvp",
  "calls": 1247,
  "createdAt": Timestamp(2024-12-15T14:20:00Z),
  "revoked": false,
  "lastUsed": Timestamp(2025-01-10T09:15:00Z)
}
```

---

## Questions?

- **For data model questions**: Review `firestore.rules` and `firestore.indexes.json`
- **For service implementation details**: Check files under `functions/src/services/`
- **For endpoint behavior**: Review handlers under `functions/src/handlers/`
- **For permission/token details**: See `TokenService` and `auth.ts` middleware
