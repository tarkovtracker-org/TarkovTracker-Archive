# TarkovTracker - Integration Architecture

**Generated:** 2025-10-22
**Project:** TarkovTracker Monorepo
**Type:** Integration & Data Flow Architecture

---

## Executive Summary

This document describes the integration architecture of the TarkovTracker application, detailing how the frontend Vue 3 SPA, Firebase Cloud Functions backend, Firebase services, and external APIs interact to deliver a cohesive progress tracking and team collaboration experience. The architecture leverages Firebase's real-time capabilities, RESTful APIs, and GraphQL external integrations to provide both immediate user feedback and collaborative features.

---

## Integration Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     TarkovTracker Ecosystem                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐       ┌──────────────┐       ┌─────────────┐ │
│  │   Frontend   │◄─────►│   Firebase   │◄─────►│   Backend   │ │
│  │   Vue 3 SPA  │       │   Services   │       │  Functions  │ │
│  └──────────────┘       └──────────────┘       └─────────────┘ │
│         │                      │                       │         │
│         │                      │                       │         │
│         └──────────────────────┴───────────────────────┘         │
│                                │                                 │
│                                ▼                                 │
│                    ┌─────────────────────┐                      │
│                    │   External APIs     │                      │
│                    │  (Tarkov.dev API)   │                      │
│                    └─────────────────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Layers

1. **Frontend ↔ Firebase Services** - Direct client-side integration
2. **Frontend ↔ Backend Functions** - HTTP/REST API calls
3. **Backend ↔ Firebase Services** - Server-side Firebase Admin SDK
4. **Backend ↔ External APIs** - GraphQL queries to Tarkov.dev
5. **Frontend ↔ External APIs** - Direct GraphQL queries via Apollo Client

---

## Integration Layer 1: Frontend ↔ Firebase Services

### Firebase Authentication Integration

**Pattern:** Direct SDK Integration
**Library:** `firebase/auth` (v11.2+)

#### Authentication Flow

```
User Action (Login/Signup)
  │
  ├─> Frontend: firebase.auth().signInWithPopup(provider)
  │   └─> Google OAuth Provider
  │   └─> Email/Password Provider
  │
  ├─> Firebase Auth Service
  │   └─> Verify credentials
  │   └─> Generate ID token (JWT)
  │
  └─> Frontend: onAuthStateChanged listener
      └─> Store user in Pinia userStore
      └─> Redirect to dashboard
```

#### Implementation

**Location:** `frontend/src/composables/useAuth.ts`
**Key Methods:**

```typescript
const auth = getAuth();

// Google Sign-In
const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

// Email/Password
const signInWithEmail = async (email: string, password: string) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

// Auth State Listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    userStore.setUser(user);
  } else {
    userStore.clearUser();
  }
});
```

**Token Usage:**

- Frontend stores Firebase ID token
- Token included in Authorization header for backend API calls
- Auto-refreshed by Firebase SDK (1-hour expiration)

---

### Firestore Direct Integration

**Pattern:** VueFire Real-time Data Binding
**Library:** `vuefire` (v3.2+)

#### Real-time Data Synchronization

**Use Cases:**

1. **User Progress Tracking** - Live updates to user's task completion
2. **Team Progress** - Real-time team member progress sync
3. **System Settings** - User preferences and team membership

#### Implementation Pattern

**Location:** `frontend/src/composables/useFirestore*.ts`

```typescript
import { useFirestore, useDocument, useCollection } from 'vuefire';
import { doc, collection } from 'firebase/firestore';

// Example: User Progress
const db = useFirestore();
const progressRef = doc(db, `progress/${userId}/pvp/metadata`);
const progressData = useDocument(progressRef);

// Example: Team Members
const teamMembersRef = collection(db, 'team', teamId, 'members');
const teamMembers = useCollection(teamMembersRef);
```

**Features:**

- Automatic reactivity (Vue 3 refs)
- Real-time updates without polling
- Offline persistence via IndexedDB
- Optimistic updates

#### Firestore Access Patterns

| Collection | Frontend Access | Backend Access | Purpose |
|------------|-----------------|----------------|---------|
| `progress/{userId}/{mode}/*` | Read/Write (VueFire) | Read/Write (Admin SDK) | User progress data |
| `system/{userId}` | Read (VueFire) | Read/Write (Admin SDK) | User system settings, team membership |
| `team/{teamId}` | Read (VueFire) | Read/Write (Admin SDK) | Team information |
| `items` | Read (VueFire) | Write (Admin SDK) | Tarkov.dev game data cache |
| `tokens/{tokenId}` | No direct access | Read/Write (Admin SDK) | API tokens (backend only) |

---

## Integration Layer 2: Frontend ↔ Backend Functions

### REST API Integration

**Pattern:** HTTP Client (Axios/Fetch)
**Authentication:** Bearer Token (Firebase ID Token or API Token)

#### API Communication Flow

```
Frontend Component
  │
  ├─> Composable (e.g., useProgress.ts)
  │   └─> API Client (apiClient.ts)
  │       └─> axios.post('/api/progress/task/:taskId', data, { headers: { Authorization: 'Bearer <token>' } })
  │
  └─> Backend Cloud Function
      ├─> CORS Middleware
      ├─> Body Parser
      ├─> verifyBearer (auth middleware)
      ├─> abuseGuard (rate limiting)
      ├─> Handler (progressHandler.ts)
      └─> Service (ProgressService.ts)
          └─> Firestore Transaction
              └─> Response JSON
```

#### API Client Implementation

**Location:** `frontend/src/services/apiClient.ts`

```typescript
import axios from 'axios';
import { getAuth } from 'firebase/auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Add auth token
apiClient.interceptors.request.use(async (config) => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor: Handle errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
    }
    throw error;
  }
);
```

#### Frontend API Endpoints Usage

**Progress Operations:**

```typescript
// GET /api/progress
const getProgress = (gameMode: string) =>
  apiClient.get(`/progress?gameMode=${gameMode}`);

// POST /api/progress/task/:taskId
const updateTask = (taskId: string, completed: boolean, gameMode: string) =>
  apiClient.post(`/progress/task/${taskId}`, { completed }, { params: { gameMode } });

// POST /api/progress/tasks
const batchUpdateTasks = (tasks: TaskUpdate[], gameMode: string) =>
  apiClient.post('/progress/tasks', { tasks }, { params: { gameMode } });
```

**Team Operations:**

```typescript
// GET /api/team/progress
const getTeamProgress = (gameMode: string) =>
  apiClient.get(`/team/progress?gameMode=${gameMode}`);

// POST /api/team/create
const createTeam = (options: CreateTeamOptions) =>
  apiClient.post('/team/create', options);

// POST /api/team/join
const joinTeam = (teamId: string, password: string) =>
  apiClient.post('/team/join', { id: teamId, password });
```

#### Callable Functions Integration

**Pattern:** Firebase Functions SDK
**Alternative to REST:** For specific operations

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// Example: Create Team via Callable
const createTeam = httpsCallable<CreateTeamRequest, CreateTeamResponse>(
  functions,
  'createTeam'
);

const result = await createTeam({ maximumMembers: 10 });
// Auto-authenticated, type-safe
```

**When to Use Callable vs REST:**

- **Callable:** Trusted frontend clients, automatic auth context
- **REST:** Third-party integrations, API tokens, explicit control

---

## Integration Layer 3: Backend ↔ Firebase Services

### Firestore Admin SDK Integration

**Pattern:** Server-side Firebase Admin SDK
**Authentication:** Service Account (auto-provisioned by Cloud Functions)

#### Transaction-Based Operations

**Location:** `functions/src/services/*.ts`

```typescript
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Example: Team Join Transaction
const joinTeamTransaction = await db.runTransaction(async (transaction) => {
  // 1. Read user system doc
  const userRef = db.collection('system').doc(userId);
  const userDoc = await transaction.get(userRef);

  // 2. Read team doc
  const teamRef = db.collection('team').doc(teamId);
  const teamDoc = await transaction.get(teamRef);

  // 3. Validate preconditions
  if (userDoc.data()?.team) {
    throw new Error('Already in team');
  }

  if (teamDoc.data()?.members.length >= maxMembers) {
    throw new Error('Team full');
  }

  // 4. Perform writes
  transaction.update(teamRef, {
    members: admin.firestore.FieldValue.arrayUnion(userId)
  });

  transaction.update(userRef, {
    team: teamId
  });

  return { success: true };
});
```

#### Batch Write Operations

**Use Case:** Syncing Tarkov.dev game data

```typescript
// Scheduled function: Update game items
const items = await fetchTarkovDevItems(); // ~2000+ items

// Batch write (500 max per batch)
const batches = chunkArray(items, 500);

for (const batch of batches) {
  const writeBatch = db.batch();

  for (const item of batch) {
    const itemRef = db.collection('items').doc(sanitizeId(item.id));
    writeBatch.set(itemRef, item);
  }

  await writeBatch.commit();
}
```

---

### Firebase Auth Admin Integration

**Use Case:** Token Verification, User Management

```typescript
import * as admin from 'firebase-admin';

// Verify Firebase ID token
const verifyToken = async (token: string) => {
  const decodedToken = await admin.auth().verifyIdToken(token);
  return decodedToken; // { uid, email, ... }
};

// Delete user account
const deleteUser = async (userId: string) => {
  await admin.auth().deleteUser(userId);
};
```

---

## Integration Layer 4: Backend ↔ External APIs

### Tarkov.dev GraphQL Integration

**API:** `https://api.tarkov.dev/graphql`
**Client:** `graphql-request` library
**Pattern:** Scheduled sync + on-demand queries

#### Scheduled Data Sync

**Function:** `scheduledTarkovDataFetch`
**Schedule:** Daily at 00:00 UTC
**Location:** `functions/src/index.ts:400+`

```typescript
import { request, gql } from 'graphql-request';

const TARKOV_API_URL = 'https://api.tarkov.dev/graphql';

const ITEMS_QUERY = gql`
  query GetItems {
    items {
      id
      name
      shortName
      basePrice
      width
      height
      iconLink
      wikiLink
      types
      avg24hPrice
      traderPrices {
        trader { name }
        price
      }
      buyFor {
        vendor { name }
        price
      }
      sellFor {
        vendor { name }
        price
      }
    }
  }
`;

export const scheduledTarkovDataFetch = onSchedule(
  { schedule: 'every day 00:00', timeZone: 'UTC' },
  async (event) => {
    try {
      // Fetch data from Tarkov.dev
      const data = await request(TARKOV_API_URL, ITEMS_QUERY);

      // Batch write to Firestore
      const items = data.items;
      const batches = chunkArray(items, 500);

      for (const batch of batches) {
        const writeBatch = db.batch();

        for (const item of batch) {
          const sanitizedId = item.id.replace(/[/*?[\]]/g, '_');
          const itemRef = db.collection('items').doc(sanitizedId);
          writeBatch.set(itemRef, item);
        }

        await writeBatch.commit();
      }

      logger.log(`Synced ${items.length} items from Tarkov.dev`);
    } catch (error) {
      logger.error('Failed to sync Tarkov.dev data', error);
    }
  }
);
```

#### Data Flow

```
Tarkov.dev API (GraphQL)
  │
  └─> Cloud Function (Scheduled)
      │
      ├─> Query: items, tasks, maps, hideout
      │
      ├─> Transform & Sanitize IDs
      │
      └─> Batch Write to Firestore
          │
          └─> Frontend reads via VueFire
              └─> Display in UI (maps, items, etc.)
```

---

## Integration Layer 5: Frontend ↔ External APIs

### Direct GraphQL Integration

**Client:** Apollo Client
**Use Case:** Real-time Tarkov.dev queries (tasks, maps, items)

#### Apollo Client Setup

**Location:** `frontend/src/plugins/apollo.ts`

```typescript
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client/core';

const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.tarkov.dev/graphql',
  }),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'cache-first', // Use cache when available
    },
  },
});
```

#### Frontend GraphQL Queries

**Example:** Fetch Tasks

**Location:** `frontend/src/composables/api/useTarkovData.ts`

```typescript
import { useQuery } from '@vue/apollo-composable';
import gql from 'graphql-tag';

const TASKS_QUERY = gql`
  query GetTasks {
    tasks {
      id
      name
      trader { name }
      minLevel
      objectives {
        id
        type
        description
      }
      finishRewards {
        traderStanding { trader { name } value }
        items { item { name } count }
      }
    }
  }
`;

export function useTasks() {
  const { result, loading, error } = useQuery(TASKS_QUERY);

  return {
    tasks: computed(() => result.value?.tasks || []),
    loading,
    error
  };
}
```

**Why Direct Queries?**

- Real-time data for critical features (task tracking)
- Reduces Firestore read costs
- Latest game data without sync delays
- Flexible querying based on user context

---

## Cross-Cutting Integration Concerns

### Authentication Token Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Token Lifecycle                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User logs in (Google/Email)                             │
│     └─> Firebase Auth generates ID token (JWT)             │
│                                                              │
│  2. Frontend stores user in Pinia store                     │
│     └─> ID token auto-refreshed by Firebase SDK            │
│                                                              │
│  3. API requests include token                              │
│     └─> Authorization: Bearer <firebase-id-token>          │
│                                                              │
│  4. Backend verifies token                                  │
│     ├─> admin.auth().verifyIdToken(token)                  │
│     └─> OR TokenService.validateToken(token)               │
│                                                              │
│  5. Request processing with user context                    │
│     └─> req.user = { uid, email, ... }                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Real-time Data Synchronization

**Pattern:** Firebase + Optimistic Updates

```
User Action (Complete Task)
  │
  ├─> Frontend: Optimistic UI Update
  │   └─> Immediately show task as complete
  │
  ├─> Backend: POST /api/progress/task/:taskId
  │   └─> Firestore transaction update
  │   └─> Response: { success: true }
  │
  └─> VueFire: Real-time listener
      └─> Firestore change event
      └─> Update Vue reactivity
      └─> Sync UI state (confirm optimistic update)
```

**Benefits:**

- Instant user feedback (optimistic)
- Automatic conflict resolution (Firestore)
- Multi-device sync (real-time listeners)
- Team collaboration (shared documents)

---

### Error Handling & Retry Logic

#### Frontend Error Handling

```typescript
// API Client Interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    // 401 Unauthorized: Refresh token and retry
    if (error.response?.status === 401) {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        await user.getIdToken(true); // Force refresh
        return apiClient.request(error.config); // Retry
      }
    }

    // 429 Rate Limited: Exponential backoff
    if (error.response?.status === 429) {
      await delay(Math.pow(2, retryCount) * 1000);
      return apiClient.request(error.config);
    }

    throw error;
  }
);
```

#### Backend Error Handling

```typescript
// Global error middleware
app.use((err, req, res, next) => {
  logger.error('API Error', { error: err, path: req.path });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({ error: message });
});
```

---

## Integration Patterns Summary

### Data Read Patterns

| Data Type | Source | Frontend Access | Backend Access | Real-time |
|-----------|--------|-----------------|----------------|-----------|
| User Progress | Firestore | VueFire | Admin SDK | ✓ |
| Team Progress | Firestore | VueFire + API | Admin SDK | ✓ |
| Game Items | Firestore | VueFire | Admin SDK | ✓ |
| Game Tasks | Tarkov.dev | Apollo Client | GraphQL Request | ✗ |
| Game Maps | Tarkov.dev | Apollo Client | N/A | ✗ |
| API Tokens | Firestore | API only | Admin SDK | ✗ |

### Data Write Patterns

| Operation | Frontend | Backend | Transaction | Real-time Sync |
|-----------|----------|---------|-------------|----------------|
| Update Task | REST API | Handler → Service → Firestore | No | Yes (VueFire) |
| Create Team | REST/Callable | Handler → Service → Firestore | Yes | Yes |
| Join Team | REST/Callable | Handler → Service → Firestore | Yes | Yes |
| Set Player Level | REST API | Handler → Service → Firestore | No | Yes |
| Sync Game Data | N/A | Scheduled Function → Firestore | No (Batch) | Yes |

---

## Performance Optimizations

### Caching Strategy

**Frontend:**

- Apollo Client cache for Tarkov.dev queries
- Pinia store for user state
- IndexedDB for Firestore offline persistence

**Backend:**

- Firestore items collection cache (daily sync)
- Express app instance caching (cold start optimization)
- Service layer instance reuse

### Request Optimization

**Batching:**

- `POST /api/progress/tasks` - Batch task updates
- Firestore batch writes (500 docs/batch)

**Pagination:**

- Team progress limited to max 10 members
- Firestore query limits

**Connection Pooling:**

- Axios connection reuse
- Firestore connection persistence

---

## Security Integration

### Authentication Security

- Firebase Auth tokens verified on every request
- HTTPS-only communication
- CORS configured for allowed origins
- API tokens with scoped permissions

### Data Security

- Firestore security rules (client-side access control)
- Backend transaction validation
- Input sanitization (ValidationService)
- Rate limiting (abuseGuard middleware)

### Secrets Management

- Firebase Admin SDK credentials (auto-managed)
- API keys in environment variables
- No sensitive data in frontend code

---

## Monitoring & Observability

### Frontend Monitoring

- Firebase Performance Monitoring
- Error tracking via console logging
- User session tracking (Firebase Analytics)

### Backend Monitoring

- Firebase Functions logger (structured logging)
- Cloud Functions metrics (invocations, errors, latency)
- Firestore usage metrics
- API endpoint performance tracking

---

## Integration Testing

### Frontend Integration Tests

**Tool:** Playwright (E2E)
**Location:** `frontend/e2e/`

```typescript
test('User can complete a task and see real-time update', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.click('button:has-text("Sign in with Google")');

  // 2. Navigate to tasks
  await page.goto('/tasks');

  // 3. Complete task
  await page.click('[data-task-id="task-123"] .complete-btn');

  // 4. Verify UI update (optimistic + VueFire)
  await expect(page.locator('[data-task-id="task-123"]')).toHaveClass(/completed/);
});
```

### Backend Integration Tests

**Tool:** Vitest
**Location:** `functions/test/`

```typescript
describe('Team Join Integration', () => {
  it('should join team with valid credentials', async () => {
    // 1. Create team
    const team = await TeamService.createTeam(userId, { maximumMembers: 5 });

    // 2. Join team as different user
    const result = await TeamService.joinTeam(otherUserId, team.id, team.password);

    // 3. Verify Firestore state
    const teamDoc = await db.collection('team').doc(team.id).get();
    expect(teamDoc.data()?.members).toContain(otherUserId);
  });
});
```

---

## Deployment & Environment Configuration

### Environment Variables

**Frontend (.env):**

```bash
VITE_FIREBASE_API_KEY=<api-key>
VITE_FIREBASE_AUTH_DOMAIN=<auth-domain>
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_API_BASE_URL=https://us-central1-<project>.cloudfunctions.net/api
```

**Backend (Firebase Functions config):**

```bash
firebase functions:config:set tarkov.api.url="https://api.tarkov.dev/graphql"
```

### Multi-Environment Setup

| Environment | Firebase Project | Frontend Domain | Backend Functions |
|-------------|------------------|-----------------|-------------------|
| Development | tarkovtracker-dev | localhost:5173 | dev-functions |
| Production | tarkovtracker-prod | tarkovtracker.org | prod-functions |

---

## Future Integration Enhancements

### Planned Improvements

1. **WebSocket Integration** - Real-time notifications for team events
2. **Service Worker** - Offline-first progressive web app
3. **GraphQL Subscriptions** - Live Tarkov.dev data updates
4. **Webhook Integration** - Third-party app notifications
5. **Analytics Integration** - Enhanced user behavior tracking

---

*This integration architecture provides a comprehensive view of how TarkovTracker's components communicate, ensuring maintainability, scalability, and performance across the entire system.*
