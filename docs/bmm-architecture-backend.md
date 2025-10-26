# TarkovTracker - Backend Architecture

**Part:** Backend (Firebase Cloud Functions)
**Generated:** 2025-10-21
**Root Path:** `/functions/`

---

## Executive Summary

The TarkovTracker backend is a serverless API built on Firebase Cloud Functions using Node.js 22, TypeScript, and Express.js. It provides REST APIs for progress tracking, team management, and API token operations. The architecture leverages Firestore transactions for data consistency, implements comprehensive middleware for authentication and abuse prevention, and follows service-oriented patterns for business logic encapsulation.

---

## Technology Stack

### Core Runtime & Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22 | JavaScript runtime environment |
| TypeScript | 5.9+ | Type-safe JavaScript |
| Express.js | 5.1+ | HTTP server framework |
| Firebase Functions | 6.5+ | Serverless function platform |

### Firebase Services

| Technology | Version | Purpose |
|------------|---------|---------|
| Firebase Admin SDK | 13.5+ | Server-side Firebase operations |
| Cloud Firestore | Admin SDK | NoSQL document database |
| Firebase Auth | Admin SDK | User authentication verification |

### API & Data

| Technology | Version | Purpose |
|------------|---------|---------|
| GraphQL Request | 7.2+ | External API client (Tarkov.dev) |
| body-parser | 2.2+ | Request body parsing |
| CORS | 2.8+ | Cross-origin request handling |

### Documentation

| Technology | Version | Purpose |
|------------|---------|---------|
| Swagger JSDoc | 6.2+ | OpenAPI documentation generation |
| Custom | - | Swagger UI hosting |

### Utilities

| Technology | Purpose |
|------------|---------|
| UID Generator | Unique ID generation for teams and tokens |

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | 3.2+ | Unit testing framework |

---

## Architecture Pattern

**Primary Pattern:** Service-Oriented Architecture with Serverless Functions

### Key Architectural Principles

1. **Lazy Loading for Cold Start Optimization**
   - Express app lazily initialized on first request
   - Cached app instance reused across invocations
   - Dynamic imports reduce initial memory footprint

2. **Service Layer Separation**
   - Business logic encapsulated in service classes
   - Handlers orchestrate service calls
   - Clear separation between HTTP and business logic

3. **Transaction-Based Data Operations**
   - All multi-document operations use Firestore transactions
   - Atomic updates for team operations
   - Consistency guarantees for concurrent requests

4. **Middleware Pipeline**
   - Authentication, authorization, rate limiting
   - Centralized error handling
   - Request validation and sanitization

5. **Dual API Pattern**
   - Firebase Callable Functions for trusted clients
   - HTTP REST API for third-party access
   - Shared business logic via `_logic` functions

---

## Application Bootstrap Flow

### Cloud Functions Initialization (`index.ts`)

```
1. Module Load
   └─> Import Firebase Admin
   └─> Import UID Generators (Team, Token)
   └─> Import GraphQL request library

2. Firebase Admin Initialization
   └─> admin.initializeApp()
       └─> Connects to Firestore, Auth services

3. Function Exports
   ├─> HTTP Function: api (main Express app)
   ├─> Callable Functions:
   │   ├─> createTeam
   │   ├─> joinTeam
   │   ├─> leaveTeam
   │   ├─> kickTeamMember
   │   └─> deleteUserAccount
   ├─> HTTP Wrappers:
   │   ├─> createTeamHttp
   │   └─> createTokenHttp
   └─> Scheduled Functions:
       ├─> scheduledTarkovDataFetch (daily at 00:00 UTC)
       └─> updateTarkovdataHTTPS (manual trigger)

4. Express App Lazy Initialization (getApiApp)
   On First HTTP Request:
   ├─> Dynamic import Express
   ├─> Dynamic import CORS
   ├─> Dynamic import body-parser
   ├─> Dynamic import middleware
   ├─> Dynamic import handlers
   ├─> Configure middleware pipeline
   ├─> Register API routes
   ├─> Cache app instance
   └─> Return Express app
```

### Cold Start Optimization Strategy

**Problem:** Cloud Functions have cold start latency
**Solution:** Lazy loading and module caching

- **Cached App:** `cachedApp` variable stores Express instance
- **Dynamic Imports:** Handlers and middleware loaded on-demand
- **Single Initialization:** Subsequent requests reuse cached app
- **Memory Configuration:** 256MiB for API, 128-256MiB for callable functions

---

## API Architecture

### Dual API Approach

**1. Firebase Callable Functions (SDK Access)**

```typescript
// Called from Firebase SDK (frontend)
firebase.functions().httpsCallable('createTeam')({ ... })
```

**Features:**

- Automatic authentication context
- Firebase SDK error handling
- Type-safe request/response
- Ideal for trusted clients (web/mobile apps)

**2. HTTP REST API (Third-Party Access)**

```
GET/POST https://<region>-<project>.cloudfunctions.net/api/...
```

**Features:**

- Bearer token authentication
- RESTful endpoints
- Swagger documentation
- API token with permissions system
- Rate limiting and abuse prevention

### Shared Business Logic Pattern

Both callable and HTTP endpoints share the same business logic:

```typescript
// Business logic function (reusable)
async function _createTeamLogic(request: CallableRequest<...>) { ... }

// Callable function export
export const createTeam = onCall({ ... }, _createTeamLogic);

// HTTP endpoint wrapper
export const createTeamHttp = onRequest({ ... }, async (req, res) => {
  // Parse HTTP request
  // Verify auth manually
  // Convert to CallableRequest format
  const result = await _createTeamLogic(callableRequest);
  res.json(result);
});
```

**Benefits:**

- Single source of truth for business logic
- Reduced code duplication
- Consistent behavior across access methods
- Easier testing and maintenance

---

## Express Application Structure

### Middleware Pipeline (Execution Order)

```
Incoming Request
  ↓
1. CORS Middleware
   └─> Allow cross-origin requests
   └─> Credentials support
   └─> Preflight OPTIONS handling
  ↓
2. Body Parsing
   └─> JSON parser (1MB limit)
   └─> URL-encoded parser (1MB limit)
  ↓
3. Development Logging (non-production)
   └─> Log method and URL
  ↓
4. Route-Specific Middleware
   ├─> /api/* routes:
   │   ├─> verifyBearer (auth)
   │   └─> abuseGuard (rate limiting)
   ├─> Protected routes:
   │   └─> requirePermission('GP'|'WP'|'TP')
   └─> Sensitive routes:
       └─> requireRecentAuth
  ↓
5. Route Handlers
   └─> Handler functions (wrapped in asyncHandler)
  ↓
6. Error Handlers
   ├─> notFoundHandler (404)
   └─> errorHandler (500)
  ↓
Response
```

### Middleware Modules

#### **1. Authentication (`middleware/auth.ts`)**

**Function:** `verifyBearer`
**Purpose:** Verify Firebase Auth tokens or API tokens
**Flow:**

```
Extract Bearer token from Authorization header
  ├─> Try Firebase Auth token verification
  │   └─> Attach user info to req.user
  └─> Try API token verification
      └─> Attach token info to req.apiToken
```

#### **2. Abuse Prevention (`middleware/abuseGuard.ts`)**

**File Size:** 7.7KB
**Purpose:** Rate limiting and abuse detection
**Features:**

- Request rate limiting per user
- Suspicious pattern detection
- Configurable thresholds
- Temporary blocks for repeat offenders

#### **3. Recent Authentication (`middleware/reauth.ts`)**

**File Size:** 4.6KB
**Purpose:** Require recent authentication for sensitive operations
**Use Cases:**

- Account deletion
- Token revocation
- Critical settings changes
**Flow:**

```
Check Firebase Auth token issue time
  └─> If > 5 minutes old:
      └─> Reject with 401 (re-authentication required)
```

#### **4. Permissions (`middleware/permissions.ts`)**

**Purpose:** Enforce API token permissions
**Permissions:**

- **GP** (Get Progress) - Read user progress
- **WP** (Write Progress) - Modify user progress
- **TP** (Team Progress) - Access team data

**Flow:**

```
requirePermission('WP')
  └─> Check req.apiToken.permissions
      ├─> Contains 'WP'? → Continue
      └─> Missing 'WP'? → 403 Forbidden
```

#### **5. Error Handling (`middleware/errorHandler.ts`)**

**File Size:** 3.7KB
**Exports:**

- `asyncHandler` - Wraps async route handlers
- `errorHandler` - Global error middleware
- `notFoundHandler` - 404 handler

**Features:**

- Automatic error catching for async handlers
- Structured error responses
- Stack traces in development
- HTTP status code mapping

---

## API Endpoints

### API Versioning

**Two Versions:**

- `/api/*` - Original API (v1)
- `/api/v2/*` - Current API (v2)

Both versions share the same handlers for backward compatibility.

### Endpoint Catalog

#### **Progress Endpoints**

| Method | Path | Permission | Handler | Purpose |
|--------|------|------------|---------|---------|
| GET | `/api/progress` | GP | progressHandler.getPlayerProgress | Get user progress |
| GET | `/api/v2/progress` | GP | progressHandler.getPlayerProgress | Get user progress (v2) |
| POST | `/api/progress/level/:levelValue` | WP | progressHandler.setPlayerLevel | Update player level |
| POST | `/api/v2/progress/level/:levelValue` | WP | progressHandler.setPlayerLevel | Update player level (v2) |
| POST | `/api/progress/task/:taskId` | WP | progressHandler.updateSingleTask | Update single task |
| POST | `/api/v2/progress/task/:taskId` | WP | progressHandler.updateSingleTask | Update single task (v2) |
| POST | `/api/progress/tasks` | WP | progressHandler.updateMultipleTasks | Batch update tasks |
| POST | `/api/v2/progress/tasks` | WP | progressHandler.updateMultipleTasks | Batch update tasks (v2) |
| POST | `/api/progress/task/objective/:objectiveId` | WP | progressHandler.updateTaskObjective | Update task objective |
| POST | `/api/v2/progress/task/objective/:objectiveId` | WP | progressHandler.updateTaskObjective | Update task objective (v2) |

#### **Team Endpoints**

| Method | Path | Permission | Handler | Purpose |
|--------|------|------------|---------|---------|
| GET | `/api/team/progress` | TP | teamHandler.getTeamProgress | Get all team member progress |
| GET | `/api/v2/team/progress` | TP | teamHandler.getTeamProgress | Get all team member progress (v2) |
| POST | `/api/team/create` | Auth | teamHandler.createTeam | Create new team |
| POST | `/api/team/join` | Auth | teamHandler.joinTeam | Join existing team |
| POST | `/api/team/leave` | Auth | teamHandler.leaveTeam | Leave current team |

#### **Token Endpoints**

| Method | Path | Permission | Handler | Purpose |
|--------|------|------------|---------|---------|
| GET | `/api/token` | Auth | tokenHandler.getTokenInfo | Get token information |
| GET | `/api/v2/token` | Auth | tokenHandler.getTokenInfo | Get token information (v2) |

#### **User Management Endpoints**

| Method | Path | Auth | Handler | Purpose |
|--------|------|------|---------|---------|
| GET | `/api/user/test` | None | Inline | API health check |
| DELETE | `/api/user/account` | Recent Auth | deleteUserAccountHandler | Delete user account |

#### **System Endpoints**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check endpoint |
| OPTIONS | `*` | CORS preflight |

---

## Handler Modules

### Handler Architecture

**Location:** `handlers/`
**Pattern:** Each handler exports object with route handler methods
**Count:** 4 main handler modules

#### **1. Progress Handler** (`handlers/progressHandler.ts`)

**File Size:** 13.7KB
**Purpose:** User progress tracking operations
**Service Used:** `ProgressService`

**Exported Methods:**

- `getPlayerProgress` - Retrieve user's game progress
- `setPlayerLevel` - Update player level
- `updateSingleTask` - Mark task complete/incomplete
- `updateMultipleTasks` - Batch task updates
- `updateTaskObjective` - Update specific objective status

**OpenAPI Documentation:** ✓ Comprehensive annotations

#### **2. Team Handler** (`handlers/teamHandler.ts`)

**File Size:** 8.5KB
**Purpose:** Team collaboration features
**Service Used:** `TeamService`

**Exported Methods:**

- `getTeamProgress` - Get progress for all team members
- `createTeam` - Create new team (also exported as callable)
- `joinTeam` - Join team with ID and password
- `leaveTeam` - Leave current team
- `kickTeamMember` - Remove member (owner only)

**OpenAPI Documentation:** ✓ Comprehensive annotations

#### **3. Token Handler** (`handlers/tokenHandler.ts`)

**File Size:** 2.5KB
**Purpose:** API token management
**Service Used:** `TokenService`

**Exported Methods:**

- `getTokenInfo` - Get token details and permissions

#### **4. User Deletion Handler** (`handlers/userDeletionHandler.ts`)

**File Size:** 8.5KB
**Purpose:** Account deletion operations
**Service:** `UserDeletionService` class

**Features:**

- Delete user from Firebase Auth
- Remove all Firestore user data
- Handle team membership cleanup
- Transaction-based deletion
- Confirmation text validation

---

## Service Layer

### Service Architecture

**Location:** `services/`
**Pattern:** Class-based services with dependency injection
**Count:** 4 service modules

#### **1. ProgressService** (`services/ProgressService.ts`)

**File Size:** 10.9KB
**Purpose:** Business logic for progress tracking

**Key Methods:**

```typescript
class ProgressService {
  async getUserProgress(userId: string, gameMode: string): Promise<Progress>
  async setPlayerLevel(userId: string, level: number, gameMode: string): Promise<void>
  async updateTask(userId: string, taskId: string, complete: boolean, gameMode: string): Promise<void>
  async updateTaskObjective(userId: string, objectiveId: string, complete: boolean, gameMode: string): Promise<void>
  async batchUpdateTasks(userId: string, updates: TaskUpdate[], gameMode: string): Promise<void>
}
```

**Features:**

- Firestore transaction support
- Game mode handling (PvP/PvE)
- Progress data validation
- Error handling and logging

#### **2. TeamService** (`services/TeamService.ts`)

**File Size:** 10.7KB
**Purpose:** Team collaboration logic

**Key Methods:**

```typescript
class TeamService {
  async getTeamProgress(userId: string, gameMode: string): Promise<TeamProgressResponse>
  async createTeam(userId: string, options: CreateTeamOptions): Promise<TeamCreationResponse>
  async joinTeam(userId: string, teamId: string, password: string): Promise<void>
  async leaveTeam(userId: string): Promise<void>
  async kickMember(ownerId: string, kickedUserId: string): Promise<void>
}
```

**Features:**

- Multi-user transaction handling
- Team membership validation
- Password verification
- Member limit enforcement (max 10)
- Cooldown period for team creation (5 minutes after leaving)

#### **3. TokenService** (`services/TokenService.ts`)

**File Size:** 8.1KB
**Purpose:** API token generation and management

**Key Methods:**

```typescript
class TokenService {
  async createToken(userId: string, options: TokenOptions): Promise<TokenCreationResponse>
  async revokeToken(userId: string, tokenId: string): Promise<void>
  async getTokenInfo(tokenId: string): Promise<ApiToken>
  async validateToken(tokenId: string): Promise<ApiToken | null>
}
```

**Features:**

- Secure token generation (UID Generator)
- Permission-based access control
- Token expiration handling
- Game mode support (PvP, PvE, Dual)
- Token activity tracking

#### **4. ValidationService** (`services/ValidationService.ts`)

**File Size:** 6KB
**Purpose:** Input validation and sanitization

**Key Methods:**

```typescript
class ValidationService {
  static validateUserId(userId?: string): string
  static validateTaskId(taskId: string): string
  static validateLevel(level: number): number
  static validateGameMode(mode: string): 'pvp' | 'pve'
  static sanitizeInput(input: string): string
}
```

**Features:**

- Type validation
- Range checks
- Input sanitization
- Error throwing for invalid input

---

## Data Model & Firestore Schema

### Collections Structure

#### **1. `system` Collection**

**Purpose:** User system settings and metadata
**Document ID:** User UID
**Schema:**

```typescript
interface SystemDoc {
  team: string | null;              // Current team ID
  teamMax: number;                  // Max team size preference
  lastLeftTeam: Timestamp;          // Cooldown tracking
}
```

#### **2. `team` Collection**

**Purpose:** Team information
**Document ID:** Team ID (32-character UID)
**Schema:**

```typescript
interface TeamDoc {
  owner: string;                    // User UID of team owner
  password: string;                 // Team password (48-char UID)
  maximumMembers: number;           // Max members (default: 10)
  members: string[];                // Array of member UIDs
  createdAt: Timestamp;             // Team creation time
}
```

#### **3. `progress` Collection**

**Purpose:** User game progress (nested subcollections)
**Document Structure:**

```
progress/{userId}/
  ├─> pvp/                          # PvP mode progress
  │   ├─> tasks/{taskId}
  │   ├─> objectives/{objectiveId}
  │   └─> metadata/
  └─> pve/                          # PvE mode progress
      ├─> tasks/{taskId}
      ├─> objectives/{objectiveId}
      └─> metadata/
```

#### **4. `tokens` Collection**

**Purpose:** API access tokens
**Document ID:** Token ID
**Schema:**

```typescript
interface TokenDoc {
  owner: string;                    // User UID
  token: string;                    // Bearer token
  permissions: string[];            // ['GP', 'WP', 'TP']
  gameMode: 'pvp' | 'pve' | 'dual'; // Allowed game modes
  note: string;                     // User-defined description
  createdAt: Timestamp;
  lastUsed: Timestamp;
  active: boolean;
}
```

#### **5. `items` Collection**

**Purpose:** Tarkov.dev game data cache
**Document ID:** Item ID (sanitized)
**Schema:**

```typescript
interface ItemDoc {
  id: string;
  name: string;
  shortName: string;
  basePrice: number;
  width: number;
  height: number;
  iconLink: string;
  wikiLink: string;
  types: string[];
  avg24hPrice: number;
  traderPrices: TraderPrice[];
  buyFor: BuyPrice[];
  sellFor: SellPrice[];
  // ... additional Tarkov.dev fields
}
```

### Transaction Patterns

**Team Creation Transaction:**

```
1. Read user's system doc
2. Validate not in team
3. Validate cooldown period
4. Generate team ID and password
5. Write team document
6. Update user's system doc with team ID
7. Commit transaction
```

**Team Join Transaction:**

```
1. Read user's system doc
2. Validate not in team
3. Read team document
4. Validate password
5. Validate team not full
6. Add user to team members array
7. Update user's system doc with team ID
8. Commit transaction
```

**Team Leave Transaction:**

```
1. Read user's system doc
2. Get team ID
3. Read team document
4. If user is owner:
   └─> Remove all members
   └─> Delete team document
5. If user is member:
   └─> Remove user from members array
6. Update user's system doc (team = null)
7. Commit transaction
```

---

## External API Integration

### Tarkov.dev GraphQL API

**Purpose:** Fetch game data (tasks, items, hideout, maps)
**Endpoint:** `https://api.tarkov.dev/graphql`
**Client:** `graphql-request` library

**Query Example:**

```graphql
{
  items {
    id
    name
    shortName
    basePrice
    # ... 20+ fields
  }
}
```

**Data Sync Pattern:**

```
Scheduled Function (daily at 00:00 UTC)
  ├─> Query Tarkov.dev API
  ├─> Receive ~2000+ items
  ├─> Batch write to Firestore (500 items/batch)
  └─> Log completion
```

**Firestore Storage:**

- Collection: `items`
- Batch size: 500 writes per batch
- ID sanitization: Replace `/\*?[]` with `_`

**Manual Trigger:**

- HTTP endpoint: `/updateTarkovdataHTTPS`
- Timeout: 120 seconds
- No authentication (internal use)

---

## Firebase Cloud Functions Configuration

### Function Resource Allocation

**API Function (Main Express App):**

```typescript
{
  memory: '256MiB',
  timeoutSeconds: 30,
  minInstances: 0,
  maxInstances: 3
}
```

**Callable Functions:**

```typescript
{
  memory: '128MiB' to '256MiB',
  timeoutSeconds: 15-30,
  minInstances: 0,
  maxInstances: 1-3
}
```

**Scheduled Functions:**

```typescript
{
  memory: '256MiB',
  schedule: 'every day 00:00',
  timeZone: 'UTC'
}
```

### Cold Start Optimization

**Strategies:**

1. **Lazy Loading:** Express app created on first request
2. **Caching:** Reuse app instance across invocations
3. **Dynamic Imports:** Load handlers and middleware on-demand
4. **Minimal Dependencies:** Keep dependency tree small
5. **Memory Limits:** 256MiB for API, 128MiB for simple functions

### Concurrency & Scaling

**Max Instances:**

- API: 3 concurrent instances
- Team operations: 1 instance (transaction safety)
- Token operations: 1 instance

**Auto-scaling:**

- Firebase automatically scales based on load
- Min instances: 0 (cost optimization)
- Cold start: ~1-2 seconds
- Warm instance: <100ms

---

## Security Architecture

### Authentication Layers

**1. Firebase Auth Token Verification**

```typescript
const decodedToken = await admin.auth().verifyIdToken(token);
// Provides: uid, email, custom claims
```

**2. API Token System**

```typescript
// User generates token via UI
// Token stored in Firestore with permissions
// Bearer token in Authorization header
// Validated via TokenService
```

### Authorization Model

**Permission-Based Access Control:**

- **GP** (Get Progress) - Read-only progress access
- **WP** (Write Progress) - Modify progress data
- **TP** (Team Progress) - Access team member data

**Recent Auth Requirement:**

- Sensitive operations (account deletion, token revocation)
- Token must be <5 minutes old
- Forces re-authentication for high-risk actions

### Rate Limiting

**Abuse Guard Middleware:**

- Per-user request tracking
- Configurable rate limits
- Suspicious pattern detection
- Temporary blocks for violations

### Data Validation

**Input Sanitization:**

- ValidationService for all inputs
- Type checking and range validation
- SQL injection prevention (NoSQL context)
- XSS prevention via sanitization

### CORS Configuration

**Allowed Origins:** Dynamic (reflects request origin)
**Credentials:** Enabled
**Methods:** GET, POST, PUT, DELETE, OPTIONS
**Headers:** Content-Type, Authorization, X-Requested-With

---

## Error Handling & Logging

### Error Handling Strategy

**1. Async Handler Wrapper**

```typescript
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

**2. Global Error Middleware**

```typescript
app.use(errorHandler);
// Catches all errors
// Returns structured JSON response
// Logs to Firebase Functions logger
```

**3. HttpsError for Callable Functions**

```typescript
throw new HttpsError('invalid-argument', 'User message', details);
// Automatically mapped to HTTP status codes in HTTP wrapper
```

### Logging Practices

**Firebase Functions Logger:**

```typescript
import { logger } from 'firebase-functions/v2';

logger.log('Info message', { context });
logger.warn('Warning', { context });
logger.error('Error occurred', error);
```

**Logged Events:**

- Request start (development only)
- Transaction completions
- Error conditions
- Security events (failed auth, rate limit hits)
- Data sync operations

---

## API Documentation

### Swagger/OpenAPI Integration

**Documentation Generation:**

- **Tool:** Swagger JSDoc
- **Source:** JSDoc comments in handler files
- **Output:** `swaggerui/` directory
- **Access:** Open `swaggerui/index.html` in browser

**Generation Command:**

```bash
npm run docs
# Runs: build functions → generate swagger → create UI
```

**Documentation Includes:**

- All API endpoints
- Request/response schemas
- Authentication requirements
- Permission requirements
- Example requests
- Error responses

**OpenAPI Annotations Example:**

```typescript
/**
 * @openapi
 * /progress:
 *   get:
 *     summary: "Returns progress data of the player"
 *     tags: ["Progress"]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Success"
 *       401:
 *         description: "Unauthorized"
 */
```

---

## Testing Strategy

### Unit Testing (Vitest)

**Test Framework:** Vitest 3.2+
**Test Command:** `npm test`
**Coverage:** Handlers, services, utilities

**Test Locations:**

- `test/` directory
- Co-located with source files (future)

**Testing Approach:**

- Service layer unit tests
- Handler logic tests
- Mock Firebase Admin SDK
- Transaction testing

---

## Build & Deployment

### Build Process

**TypeScript Compilation:**

```bash
npm run build
# Compiles: src/*.ts → lib/*.js
```

**Build Configuration:**

- **Compiler:** TypeScript 5.9+
- **Module:** NodeNext (ESM)
- **Target:** ES2022
- **Source Maps:** Enabled
- **Output:** `lib/` directory

### Deployment Process

**Firebase Deployment:**

```bash
npm run deploy:dev   # Development environment
npm run deploy:prod  # Production environment
```

**Deployment Steps:**

1. Build functions (`npm run build:functions`)
2. Generate API docs (`npm run docs`)
3. Switch Firebase project (`firebase use <project>`)
4. Deploy to Cloud Functions (`firebase deploy`)

**Deployed Functions:**

- `api` - Main Express app
- Team callable functions (createTeam, joinTeam, etc.)
- HTTP wrappers (createTeamHttp, createTokenHttp)
- Scheduled functions (scheduledTarkovDataFetch)

---

## Performance Optimizations

### Code Splitting

- Lazy-loaded Express app
- Dynamic imports for handlers
- On-demand middleware loading

### Caching Strategies

- Cached Express app instance
- Firestore query result caching (client-side)
- Service instance reuse

### Database Optimizations

- Batch writes (500 docs/batch for Tarkov data)
- Transaction-based operations
- Indexed queries (via firestore.indexes.json)

### Response Time Targets

- Health endpoint: <50ms
- Progress GET: <200ms
- Progress UPDATE: <500ms
- Team operations: <1s (transaction overhead)

---

## Key Files Reference

| File | Purpose | Size |
|------|---------|------|
| `src/index.ts` | Cloud Functions entry point, route definitions | ~850 lines |
| `src/handlers/progressHandler.ts` | Progress tracking endpoints | 13.7KB |
| `src/handlers/teamHandler.ts` | Team management endpoints | 8.5KB |
| `src/handlers/tokenHandler.ts` | Token operations | 2.5KB |
| `src/handlers/userDeletionHandler.ts` | Account deletion | 8.5KB |
| `src/services/ProgressService.ts` | Progress business logic | 10.9KB |
| `src/services/TeamService.ts` | Team business logic | 10.7KB |
| `src/services/TokenService.ts` | Token business logic | 8.1KB |
| `src/services/ValidationService.ts` | Input validation | 6KB |
| `src/middleware/auth.ts` | Authentication | 1.3KB |
| `src/middleware/abuseGuard.ts` | Rate limiting | 7.7KB |
| `src/middleware/errorHandler.ts` | Error handling | 3.7KB |
| `src/middleware/permissions.ts` | Authorization | 766 bytes |
| `src/middleware/reauth.ts` | Recent auth check | 4.6KB |

---

## Development Guidelines

### Code Organization

- Handlers orchestrate HTTP logic
- Services contain business logic
- Middleware handles cross-cutting concerns
- Types defined in `types/` directory

### Transaction Best Practices

- Always use transactions for multi-document operations
- Keep transactions short and focused
- Retry on transaction failures
- Log transaction outcomes

### Error Handling

- Use HttpsError for callable functions
- Wrap async handlers with asyncHandler
- Provide user-friendly error messages
- Log detailed error context for debugging

### API Design

- RESTful endpoint naming
- Consistent response structure
- Comprehensive OpenAPI documentation
- Version endpoints for breaking changes

---

*This serverless backend architecture provides scalable, secure, and maintainable API services for the TarkovTracker application with comprehensive team collaboration and progress tracking features.*
