# Backend Structure Guide

> **Audience:** Backend developers, contributors  
> **Purpose:** Functions workspace organization, patterns, and best practices

## Table of Contents
- [Overview](#overview)
- [Workspace Structure](#workspace-structure)
- [Request Flow](#request-flow)
- [Key Patterns](#key-patterns)
- [Testing Conventions](#testing-conventions)
- [Technical Debt & Refactor Targets](#technical-debt--refactor-targets)
- [Adding New Features](#adding-new-features)

---

## Overview

The functions workspace (`functions/`) contains the Firebase Cloud Functions backend for TarkovTracker. It follows a layered architecture with clear separation of concerns:

- **Handlers**: HTTP endpoint entry points
- **Services**: Business logic and data operations
- **Middleware**: Cross-cutting concerns (auth, validation, error handling)
- **Repositories**: Data access abstraction (growing)
- **Scheduled Jobs**: Background tasks for data synchronization

The backend uses Express.js with lazy initialization to optimize Cloud Function cold starts.

---

## Workspace Structure

```
functions/src/
├── app/                   # Express app configuration and routing
├── auth/                  # Legacy v1 authentication handlers
├── config/                # Feature flags and configuration
├── handlers/              # HTTP request handlers (NEW pattern)
├── logger.ts              # Centralized logging abstraction
├── middleware/            # Express middleware (CORS, auth, errors)
├── openapi/               # OpenAPI spec generation
├── progress/              # Legacy v1 progress handlers
├── repositories/          # Data access layer (growing)
├── scheduled/            # Background scheduled jobs
├── services/             # Business logic services
├── token/                # Legacy v1 token handlers
├── types/                # TypeScript type definitions
└── utils/                # Utility functions and factories
```

### Core Directories

#### `/app` - Express Application
- **Purpose**: Express app setup, middleware configuration, route registration
- **Key File**: `app/app.ts` - Main app builder with route setup
- **Pattern**: Lazy construction via `createApp()` to minimize cold-start

#### `/handlers` - HTTP Request Handlers
- **Purpose**: HTTP endpoint implementations (preferred over legacy folders)
- **Pattern**: Thin controllers that delegate to services
- **Files**:
  - `progressHandler.ts` - Progress-related endpoints
  - `teamHandler.ts` - Team management endpoints
  - `tokenHandler.ts` - Token information endpoints
  - `userDeletionHandler.ts` - User account deletion
  - `index.ts` - Barrel exports for clean imports

#### `/services` - Business Logic
- **Purpose**: Core business logic, reusable across handlers
- **Key Services**:
  - `ProgressService.ts` - User progress operations
  - `TeamService.ts` - Team management logic
  - `TokenService.ts` - API token operations
  - `ValidationService.ts` - Input validation
  - `team/` - Team-specific sub-services

#### `/middleware` - Cross-cutting Concerns
- **Purpose**: Express middleware for common functionality
- **Key Files**:
  - `corsWrapper.ts` - CORS handling
  - `httpAuthWrapper.ts` - Authentication & authorization
  - `abuseGuard.ts` - Rate limiting and abuse prevention
  - `errorHandler.ts` - Centralized error handling
  - `reauth.ts` - Re-authentication requirements

#### `/scheduled` - Background Jobs
- **Purpose**: Scheduled tasks for data synchronization
- **Key Jobs**:
  - `updateTarkovData` - Sync game data from Tarkov.dev
  - `expireInactiveTokens` - Token cleanup
- **Pattern**: Uses GraphQL to fetch data, shards large datasets

#### `/repositories` - Data Access (Emerging)
- **Purpose**: Abstract data access operations
- **Status**: Growing layer, currently minimal
- **Goal**: Centralize Firestore operations and improve testability

---

## Request Flow

### 1. Entry Point (`functions/src/index.ts`)

```typescript
// Lazy app initialization - CRITICAL for cold-start optimization
let cachedApp: Express | undefined;
async function getApiApp(): Promise<Express> {
  if (cachedApp) return cachedApp;
  cachedApp = await createApp(); // Lazy construction
  return cachedApp;
}

// Main HTTP endpoint with CORS wrapper
export const api = onRequest(
  { memory: '256MiB', timeoutSeconds: 30, minInstances: 0, maxInstances: 3 },
  withCorsHandling(async (req, res) => {
    const app = await getApiApp();
    return app(req, res);
  })
);
```

### 2. Express App Setup (`functions/src/app/app.ts`)

1. **Middleware Chain**:
   - CORS middleware (dual-layer for reliability)
   - Body parsing (JSON, urlencoded)
   - Request logging (dev only)
   - Authentication (`verifyBearerToken`)
   - Abuse prevention (`abuseGuard`)

2. **Route Registration**:
   - Progress endpoints (`/api/progress/*`)
   - Team endpoints (`/api/team/*`)
   - Token endpoints (`/api/token/*`)
   - User management (`/api/user/*`)
   - Health check (`/health`)

3. **Error Handling**:
   - `notFoundHandler` for unknown routes
   - `errorHandler` for centralized error responses

### 3. Handler → Service Flow

```typescript
// Example: Progress update request
// 1. Handler receives request (progressHandler.ts)
export const updateSingleTask = async (req: AuthenticatedRequest, res: Response) => {
  const { taskId } = req.params;
  const { teamId } = req.body;
  
  // 2. Delegate to service
  const result = await progressService.updateTaskProgress(
    req.apiToken.owner,
    taskId,
    req.body,
    teamId
  );
  
  // 3. Send response
  res.json(result);
};

// 4. Service handles business logic (ProgressService.ts)
async updateTaskProgress(userId: string, taskId: string, update: TaskUpdate, teamId?: string) {
  // Validation, data loading, Firestore operations
  // Returns formatted result
}
```

---

## Key Patterns

### 1. Lazy Initialization Pattern

**Critical for Cloud Functions cold-start performance**:

```typescript
// ✅ CORRECT - Lazy Firestore initialization
const createLazyFirestore = () => {
  let db: Firestore | undefined;
  return () => {
    if (!db) {
      db = getFirestore(); // Expensive operation
    }
    return db;
  };
};

// ❌ WRONG - Eager initialization increases cold-start time
const db = getFirestore(); // Runs at module load
```

### 2. Service-Based Architecture

**Thin handlers, fat services**:

```typescript
// Handler - Minimal controller logic
export const getPlayerProgress = async (req: AuthenticatedRequest, res: Response) => {
  const progress = await progressService.getUserProgress(
    req.apiToken.owner,
    req.query.gameMode as string
  );
  res.json(progress);
};

// Service - Contains all business logic
async getUserProgress(userId: string, gameMode: string = 'pvp') {
  // Validation, data loading, formatting
}
```

### 3. Centralized Logging

**Consistent logging across environments**:

```typescript
// logger.ts provides environment-aware logging
import { logger } from '../logger';

logger.info('Processing request', { userId, endpoint });
logger.error('Database operation failed', { error, context });
```

### 4. Error Handling Middleware

**Standardized error responses**:

```typescript
// middleware/errorHandler.ts
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({ success: false, message: error.message });
  }
  // ... other error types
};
```

### 5. Authentication & Authorization

**Permission-based access control**:

```typescript
// Middleware stack
app.use('/api', verifyBearerToken);     // Token validation
app.use('/api', abuseGuard);            // Rate limiting
app.get('/api/progress', requirePermission('GP'), handler); // Granular perms
```

---

## Testing Conventions

### 1. Test Structure

```
functions/test/
├── helpers/              # Centralized test utilities (USE THESE)
├── integration/          # End-to-end API tests
├── unit/                 # Isolated unit tests
└── setup.ts             # Global test configuration
```

### 2. Centralized Test Helpers

**Use the standardized test suite**:

```typescript
// Import from centralized location
import { createTestSuite, createMockRequest, expectApiSuccess } from './helpers/index.js';

describe('MyService', () => {
  const suite = createTestSuite('MyService');

  beforeEach(() => {
    suite.beforeEach();
    suite.withDatabase({ users: { 'user-1': { uid: 'user-1' } } });
  });

  afterEach(suite.afterEach); // Automatic cleanup
});
```

### 3. Test Patterns

**Integration Tests**:
- Test full HTTP request/response cycle
- Use real Firestore emulator
- Validate middleware behavior
- Test error paths

**Unit Tests**:
- Isolate individual functions
- Mock dependencies
- Focus on business logic
- Test edge cases

---

## Technical Debt & Refactor Targets

### High Priority

1. **Progress Utils Decomposition** (`functions/src/progress/progressUtils.ts`)
   - **Issue**: 800+ line file mixing concerns
   - **Action**: Split into focused modules
     - `validation/` - Input validation logic
     - `formatting/` - Response formatting
     - `game-modes/` - Game mode specific logic
   - **Files**: 
     - `progress/validation.ts`
     - `progress/formatting.ts`
     - `progress/game-modes/`
   - **Tests**: Add dedicated test suites for each extractor

2. **Token Handler Legacy** (`functions/src/token/`)
   - **Issue**: Legacy v1 handlers inconsistent with new patterns
   - **Action**: Migrate to handler/service pattern
   - **Target**: `TokenService.ts` already exists, consolidate legacy code

3. **Repository Pattern Expansion**
   - **Issue**: Firestore operations scattered across services
   - **Action**: Create repository layer
   - **Examples**:
     - `repositories/ProgressRepository.ts`
     - `repositories/TeamRepository.ts`
     - `repositories/TokenRepository.ts`

### Medium Priority

4. **Auth Handler Consolidation** (`functions/src/auth/`)
   - **Issue**: Legacy authentication patterns
   - **Action**: Consolidate into middleware/service pattern

5. **Scheduled Job Refactoring**
   - **Issue**: Complex monolithic functions
   - **Action**: Extract into smaller, focused jobs

6. **Error Type System**
   - **Issue**: Inconsistent error handling
   - **Action**: Create typed error hierarchy

---

## Adding New Features

### 1. New HTTP Endpoint

**Step 1 - Create Handler** (`functions/src/handlers/`):

```typescript
// myFeatureHandler.ts
import type { AuthenticatedRequest, Response } from 'express';
import { myFeatureService } from '../services/MyFeatureService';

export const getMyFeature = async (req: AuthenticatedRequest, res: Response) => {
  const result = await myFeatureService.getData(req.apiToken.owner);
  res.json(result);
};

export const createMyFeature = async (req: AuthenticatedRequest, res: Response) => {
  const result = await myFeatureService.createData(req.apiToken.owner, req.body);
  res.status(201).json(result);
};
```

**Step 2 - Create Service** (`functions/src/services/`):

```typescript
// MyFeatureService.ts
export class MyFeatureService {
  async getData(userId: string) {
    // Business logic here
  }

  async createData(userId: string, data: CreateRequest) {
    // Validation, database operations
  }
}

export const myFeatureService = new MyFeatureService();
```

**Step 3 - Register Routes** (`functions/src/app/app.ts`):

```typescript
// Import handlers
import { getMyFeature, createMyFeature } from '../handlers/myFeatureHandler';

// Add routes
app.get('/api/my-feature', requirePermission('READ'), getMyFeature);
app.post('/api/my-feature', requirePermission('WRITE'), createMyFeature);
```

**Step 4 - Export from Handlers Index**:

```typescript
// functions/src/handlers/index.ts
export { getMyFeature, createMyFeature } from './myFeatureHandler';
```

**Step 5 - Update OpenAPI**:

```bash
npm run docs  # Regenerates OpenAPI spec
```

### 2. New Scheduled Job

**Create in** `functions/src/scheduled/myJob.ts`:

```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from '../logger';

export const myScheduledJob = onSchedule(
  { schedule: 'every 6 hours' },
  async (event) => {
    logger.info('Running my scheduled job');
    // Job logic here
  }
);
```

**Export in** `functions/src/scheduled/index.ts`:

```typescript
export const scheduledFunctions = {
  updateTarkovData,
  expireInactiveTokens,
  myScheduledJob, // Add here
};
```

### 3. New Service

**Create service with dependency injection**:

```typescript
// services/NewService.ts
import { createLazyFirestore } from '../utils/factory';

export class NewService {
  private getDb: () => Firestore;

  constructor() {
    this.getDb = createLazyFirestore(); // Lazy initialization
  }

  private get db(): Firestore {
    return this.getDb();
  }

  async myMethod(userId: string) {
    // Use this.db for Firestore operations
  }
}

export const newService = new NewService();
```

---

## Performance Considerations

### 1. Cold Start Optimization

- **Never** eagerly initialize heavy resources at module level
- Use lazy initialization for Firestore, admin SDK
- Keep imports minimal in hot paths

### 2. Memory Management

- Service instances should be singletons
- Use object pools for frequently allocated objects
- Clean up resources in error scenarios

### 3. Database Efficiency

- Batch Firestore operations when possible
- Use transactions for consistency
- Implement caching for read-heavy operations

---

## Security Guidelines

1. **Input Validation**: Always validate inputs at service layer
2. **Authorization**: Use permission-based middleware
3. **Rate Limiting**: AbuseGuard prevents API abuse
4. **Error Messages**: Don't leak sensitive information
5. **Logging**: Log security events appropriately

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design overview
- [NEW_FEATURE_TEMPLATE.md](./NEW_FEATURE_TEMPLATE.md) - Feature development workflow
- [SECURITY.md](./SECURITY.md) - Security practices and patterns
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflows and tooling
