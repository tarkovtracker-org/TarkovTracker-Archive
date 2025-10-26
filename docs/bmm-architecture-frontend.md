# TarkovTracker - Frontend Architecture

**Part:** Frontend (Vue 3 SPA)
**Generated:** 2025-10-21
**Root Path:** `/frontend/`

---

## Executive Summary

The TarkovTracker frontend is a modern Single Page Application (SPA) built with Vue 3 using the Composition API and TypeScript. It follows a feature-based modular architecture with clear separation of concerns across 11 domain-specific feature modules. The application provides real-time game progress tracking for Escape From Tarkov with team collaboration features, leveraging Firebase for authentication and real-time data synchronization.

---

## Technology Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Vue.js | 3.5+ | Reactive UI framework with Composition API |
| TypeScript | 5.9+ | Type-safe JavaScript |
| Vite | Latest | Fast build tool and dev server |

### UI & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| Vuetify | 3.10+ | Material Design component library |
| SCSS | Latest | CSS preprocessing |
| Custom Fonts | Share Tech Mono | Thematic typography |

### State Management

| Technology | Version | Purpose |
|------------|---------|---------|
| Pinia | 3.0+ | Vue state management (6 stores) |
| VueFire | 3.2+ | Firebase-Vue reactive bindings |
| Custom Plugin | PiniaFireswap | Custom Firestore integration for Pinia |

### Routing & Navigation

| Technology | Version | Purpose |
|------------|---------|---------|
| Vue Router | 4.6+ | Client-side routing (11 routes) |
| Web History | Built-in | SEO-friendly URLs |

### Data & API Integration

| Technology | Version | Purpose |
|------------|---------|---------|
| Firebase SDK | 11.10+ | Authentication & Firestore client |
| Apollo Client | 3.14+ | GraphQL client for Tarkov.dev API |
| GraphQL | 16.11+ | Query language for external data |

### Internationalization

| Technology | Version | Purpose |
|------------|---------|---------|
| Vue I18n | 11.1+ | Multi-language support |
| Custom i18n Plugin | - | Integration with Vue ecosystem |

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | Latest | Unit testing framework |
| Playwright | 1.56+ | End-to-end testing |
| Vue Test Utils | Latest | Component testing utilities |

### Additional Libraries

| Technology | Purpose |
|------------|---------|
| D3.js | Data visualizations |
| QRCode | QR code generation |
| UUID | Unique identifier generation |
| VueUse | Vue composition utilities |

---

## Architecture Pattern

**Primary Pattern:** Feature-Based Modular Architecture

### Key Architectural Principles

1. **Feature-Based Organization**
   - Code organized by business domain/feature
   - Each feature is self-contained with components, logic, and styles
   - Promotes maintainability and scalability

2. **Composition API First**
   - All components use Vue 3 Composition API
   - Reusable logic extracted into composables
   - Better TypeScript support and code reuse

3. **Reactive State Management**
   - Pinia stores for global state
   - Custom Firestore integration for real-time data
   - Local component state for UI-specific concerns

4. **Lazy Loading**
   - Route-based code splitting
   - Dynamic imports for page components
   - Optimized bundle sizes

5. **Plugin-Based Initialization**
   - Ordered plugin initialization in main.ts
   - Clear dependency chain (i18n → Pinia → Router → Vuetify → VueFire)

---

## Application Bootstrap Flow

### Initialization Sequence (`main.ts`)

```
1. Create Vue App Instance
   └─> Load App.vue root component

2. Initialize Privacy Consent
   └─> Check and initialize consent preferences

3. Setup Global Error Handler
   └─> Configure Vue error logging

4. Plugin Installation (ORDERED)
   ├─> i18n (Internationalization)
   │   └─> Mark i18n as ready
   ├─> Pinia (State Management)
   ├─> Vue Router (Routing)
   ├─> Vuetify (UI Framework)
   ├─> VueFire (Firebase Integration)
   │   └─> Connect to Firebase app
   └─> Apollo Client (GraphQL)
       └─> Provide DefaultApolloClient

5. Mount Application
   └─> Attach to #app DOM element

6. Mark Store System Initialized
   └─> Signal that stores are ready
```

### Critical Initialization Details

- **Plugin Order Matters:** i18n must load first for translation support in other plugins
- **Store Initialization:** Custom PiniaFireswap plugin extends stores with Firebase bindings
- **Migration Flag:** Global `window.__TARKOV_DATA_MIGRATED` tracks data migration status
- **Error Handling:** Global Vue error handler logs all component errors

---

## Application Structure

### Root Component (`App.vue`)

```vue
<v-app> (Vuetify root wrapper)
  └─> <router-view /> (Dynamic route rendering)
```

**Responsibilities:**

- Provides Vuetify theming context
- Handles locale switching based on user preferences
- Manages data migration state on mount
- Rebinds Firestore listeners after migration

### Routing Architecture

**Router:** Vue Router with Web History mode
**Base Configuration:** `router/index.ts`
**Routes Defined:** `router/routes.ts`

**Route Structure:**

```
/ (StandardLayout.vue - parent)
  ├─> / (dashboard) → TrackerDashboard.vue
  ├─> /items → NeededItems.vue
  ├─> /tasks → TaskList.vue
  ├─> /hideout → HideoutList.vue
  ├─> /settings → UserSettings.vue
  ├─> /api → TrackerSettings.vue
  ├─> /privacy → PrivacyPolicy.vue
  ├─> /terms → TermsOfService.vue
  ├─> /team/:id → TeamPage.vue
  ├─> /map/:mapName → MapDetails.vue
  └─> /* (catch-all) → NotFound.vue
```

**Routing Features:**

- Lazy-loaded page components via dynamic imports
- Meta tags for background customization
- Nested routes under StandardLayout
- 404 catch-all route

---

## State Management Architecture

### Pinia Stores (6 Global Stores)

#### 1. **User Store** (`stores/user.ts`)

**Size:** ~15KB, most complex store
**Purpose:** User preferences and UI settings
**State:**

- Tips visibility (hide tips, tutorial states)
- Streamer mode toggle
- Team visibility preferences
- Task view filters (primary, map, trader, secondary, user)
- Feature toggles (hide global tasks, Kappa tasks, etc.)
- UI display preferences (show experience, task IDs, etc.)

**Firebase Integration:** Syncs to user's Firestore document
**Key Features:**

- Reactive Firebase bindings via PiniaFireswap
- Automatic save on state changes
- Local state caching

#### 2. **Tarkov Store** (`stores/tarkov.ts`)

**Size:** ~8KB
**Purpose:** Game data from Tarkov.dev API
**State:**

- Tasks, items, hideout stations
- Maps, quest objectives
- Traders and their inventories

**Data Source:** GraphQL queries to Tarkov.dev
**Key Features:**

- Apollo Client integration
- Data caching and normalization
- Real-time updates

#### 3. **Progress Store** (`stores/progress.ts`)

**Size:** ~7KB
**Purpose:** User progress tracking
**State:**

- Completed tasks
- Hideout upgrade progress
- Item tracking
- Quest objectives status

**Firebase Integration:** Syncs to user progress collection
**Key Features:**

- Transaction-based updates
- Team progress aggregation
- Real-time sync across devices

#### 4. **Team Store** (`stores/useTeamStore.ts`)

**Size:** ~6KB
**Purpose:** Team collaboration features
**State:**

- Team membership
- Team member progress
- Shared task completion

**Firebase Integration:** Team documents in Firestore
**Key Features:**

- Multi-user real-time updates
- Aggregated team progress views
- Member management

#### 5. **App Store** (`stores/app.ts`)

**Size:** ~757 bytes, lightweight
**Purpose:** Global app state
**State:**

- Locale override
- App-wide UI state

#### 6. **System Store** (`stores/useSystemStore.ts`)

**Size:** ~1.5KB
**Purpose:** System-level state
**State:**

- System notifications
- Loading states
- Error messages

### Custom Pinia Plugin: PiniaFireswap

**File:** `plugins/pinia-firestore.ts`
**Purpose:** Extends Pinia stores with Firebase/Firestore integration
**Capabilities:**

- Adds `firebind()` and `fireunbind()` methods to stores
- Automatic reactive syncing between store state and Firestore
- Transaction support for atomic updates
- Type-safe with TypeScript extensions

**Usage Pattern:**

```typescript
const store = useUserStore() as StoreWithFireswapExt<...>
store.firebind('users', userId) // Bind to Firestore document
```

---

## Feature Modules

### Module Organization

**Base Path:** `src/features/`
**Count:** 11 feature modules
**Pattern:** Each feature contains components, composables, and feature-specific logic

### Feature Module Breakdown

#### 1. **Auth** (`features/auth/`)

**Purpose:** User authentication and session management
**Key Components:**

- Login/Logout flows
- User session handling
- Firebase Auth integration

#### 2. **Dashboard** (`features/dashboard/`)

**Purpose:** Main dashboard and progress overview
**Key Components:**

- Progress statistics
- Recent activity
- Quick actions

#### 3. **Drawer** (`features/drawer/`)

**Purpose:** Navigation drawer component
**Key Components:**

- Navigation menu
- User profile section
- Team switcher

#### 4. **Game** (`features/game/`)

**Purpose:** Game-specific functionality
**Key Components:**

- Game settings
- Wipe cycle tracking

#### 5. **Hideout** (`features/hideout/`)

**Purpose:** Hideout upgrade tracking
**Key Components:**

- Station progress
- Requirement tracking
- Upgrade costs

#### 6. **Layout** (`features/layout/`)

**Purpose:** Application layout components
**Key Components:**

- StandardLayout.vue (main layout wrapper)
- Header, Footer components
- Background theming

#### 7. **Maps** (`features/maps/`)

**Purpose:** Map-related features
**Key Components:**

- Map selection
- Quest locations
- Extract tracking

#### 8. **Needed Items** (`features/neededitems/`)

**Purpose:** Required items tracking
**Key Components:**

- Item lists
- FIR (Found in Raid) filtering
- Hideout item requirements

#### 9. **Settings** (`features/settings/`)

**Purpose:** User settings and preferences
**Key Components:**

- User preferences UI
- Display options
- Privacy settings

#### 10. **Tasks** (`features/tasks/`)

**Purpose:** Task and quest tracking
**Key Components:**

- Task list with filters
- Task details
- Objective tracking
- Completion status

#### 11. **Team** (`features/team/`)

**Purpose:** Team collaboration features
**Key Components:**

- Team creation/joining
- Member progress views
- Team settings

#### 12. **UI** (`features/ui/`)

**Purpose:** Shared UI components
**Key Components:**

- Common buttons
- Modals, dialogs
- Reusable widgets

---

## Composables Architecture

**Base Path:** `src/composables/`
**Purpose:** Reusable reactive logic using Composition API

### Composable Categories

#### **API Composables** (`composables/api/`)

- API client wrappers
- HTTP request helpers
- Error handling utilities

#### **Data Composables** (`composables/data/`)

- Data fetching logic
- Data transformation
- Cache management

#### **Firebase Composables** (`composables/firebase/`)

- Firebase Auth helpers
- Firestore query builders
- Real-time listener management

#### **Task Composables** (`composables/tasks/`)

- Task filtering logic (`useTaskFiltering.ts` - 14KB, complex)
- Task state management
- Task dependency resolution

#### **Utility Composables** (`composables/utils/`)

- i18n helpers
- Common UI utilities
- Helper functions

### Key Composables

**`tarkovdata.ts` (6.6KB):**

- Manages Tarkov.dev API integration
- Fetches game data (tasks, items, maps)
- Apollo Client query management

**`useTaskFiltering.ts` (14KB):**

- Complex task filtering logic
- Multi-criteria filtering (map, trader, status)
- User preference integration

**`useDataMigration.ts` (5.3KB):**

- Handles legacy data migration
- Version upgrade logic
- Data transformation

**`usePrivacyConsent.ts` (4.7KB):**

- Privacy consent management
- GDPR compliance helpers
- Analytics opt-in/out

**`useProgressQueries.ts` (3KB):**

- Progress data queries
- Firebase query builders
- Real-time progress updates

**`livedata.ts` (2.2KB):**

- Real-time data streaming
- WebSocket-like functionality
- Live updates handling

---

## Data Flow Architecture

### Primary Data Flow Patterns

#### 1. **User Authentication Flow**

```
User Action (Login/Logout)
  └─> Firebase Auth SDK
      └─> Auth State Change
          └─> fireuser reactive object
              └─> Stores bind to user data
                  └─> UI updates reactively
```

#### 2. **Progress Tracking Flow**

```
User Marks Task Complete
  └─> Progress Store action
      └─> Firestore transaction
          └─> Backend Cloud Function (optional)
              └─> Firestore update
                  └─> VueFire reactive binding
                      └─> Store state updates
                          └─> UI re-renders
```

#### 3. **Team Collaboration Flow**

```
User A Updates Progress
  └─> Firestore team document update
      └─> Real-time listener (User B's client)
          └─> Team Store state update
              └─> Aggregated view re-renders
```

#### 4. **Game Data Fetching Flow**

```
App Initialization
  └─> useTarkovData composable
      └─> Apollo Client GraphQL query
          └─> Tarkov.dev API
              └─> Response cached
                  └─> Tarkov Store populated
                      └─> Components consume data
```

---

## Plugin System

### Plugin Initialization Order

**Critical:** Plugins must be initialized in this exact order in `main.ts`:

1. **i18n** - Internationalization must load first
2. **Pinia** - State management depends on i18n
3. **Router** - Routing needs state access
4. **Vuetify** - UI framework needs router
5. **VueFire** - Firebase integration
6. **Apollo** - GraphQL client (provided, not `.use()`)

### Custom Plugins

**`plugins/pinia-firestore.ts`** - PiniaFireswap

- Extends Pinia with Firestore bindings
- Adds reactive sync methods to stores

**`plugins/store-initializer.ts`**

- Marks initialization states
- Coordinates store setup timing

**`plugins/firebase.ts`**

- Firebase app configuration
- Auth instance export
- Firestore instance export

**`plugins/apollo.ts`**

- Apollo Client configuration
- GraphQL endpoint setup
- Cache configuration

**`plugins/i18n.ts`**

- Vue I18n setup
- Translation loading
- Locale management

**`plugins/vuetify.ts`**

- Vuetify configuration
- Theme customization
- Material Design icons

---

## Testing Strategy

### Unit Testing (Vitest)

**Test Files:** `**/__tests__/`
**Coverage Areas:**

- Composables logic
- Store actions and getters
- Utility functions

**Example Test Locations:**

- `composables/__tests__/`
- `utils/__tests__/`

### End-to-End Testing (Playwright)

**Test Files:** `e2e/*.spec.ts`
**Test Scenarios:**

- `auth.spec.ts` - Authentication flows
- `dashboard.spec.ts` - Dashboard interactions
- `tasks.spec.ts` - Task management

**Features Tested:**

- User login/logout
- Task completion
- Team collaboration
- Settings persistence

### Testing Commands

```bash
npm test              # Run unit tests (watch mode)
npm run test:run      # Run unit tests once
npm run test:coverage # Generate coverage report
npm run test:e2e      # Run E2E tests
npm run test:e2e:ui   # E2E tests with UI
```

---

## Build & Deployment

### Development Build

**Tool:** Vite dev server
**Command:** `npm run dev`
**Features:**

- Hot Module Replacement (HMR)
- Fast cold start
- Optimized dev dependencies

### Production Build

**Command:** `npm run build`
**Modes:**

- `npm run build:dev` - Development environment
- `npm run build:prod` - Production environment

**Build Process:**

1. TypeScript compilation check
2. Vite bundle optimization
3. Code splitting by route
4. Asset optimization
5. Service worker generation (PWA)

**Output:** `dist/` directory ready for static hosting

### Deployment Target

**Platform:** Firebase Hosting
**Process:**

1. Build production bundle
2. Firebase CLI deploys to hosting
3. CDN distribution globally

---

## Performance Optimizations

### Code Splitting

- Route-based lazy loading
- Dynamic component imports
- Separate vendor chunks

### Bundle Optimization

- Tree shaking via Vite
- Minification and compression
- Asset optimization (images, fonts)

### Runtime Performance

- Virtual scrolling for long lists
- Reactive dependency tracking (Vue 3)
- Computed value caching
- Memoization in heavy composables

### Caching Strategies

- Apollo Client query cache
- Firebase offline persistence
- Browser localStorage for preferences
- Service Worker caching (PWA)

---

## Security Considerations

### Authentication

- Firebase Auth tokens
- Secure session management
- Token refresh handling

### Data Access

- Firestore security rules (server-side)
- Client-side validation
- User-scoped data queries

### Privacy

- Privacy consent management (`usePrivacyConsent`)
- Analytics opt-in/out
- Streamer mode (hide sensitive data)

### XSS Protection

- Vue's automatic escaping
- Sanitized user inputs
- CSP headers (deployment level)

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/main.ts` | Application entry point, plugin initialization |
| `src/App.vue` | Root component, migration handling |
| `src/router/index.ts` | Router configuration |
| `src/router/routes.ts` | Route definitions (11 routes) |
| `src/stores/user.ts` | User preferences store (largest) |
| `src/stores/tarkov.ts` | Game data store |
| `src/stores/progress.ts` | Progress tracking store |
| `src/plugins/pinia-firestore.ts` | Custom Firestore-Pinia integration |
| `src/composables/tarkovdata.ts` | Tarkov.dev API integration |
| `src/composables/useTaskFiltering.ts` | Complex task filtering logic |
| `vite.config.ts` | Vite build configuration |

---

## Development Guidelines

### Component Guidelines

- Use Composition API `<script setup>`
- Keep components under 300 lines
- Extract complex logic to composables
- Feature-based file organization

### State Management

- Use Pinia stores for global state
- Local `ref`/`reactive` for component-only state
- Leverage VueFire for Firestore reactivity

### Code Quality

- ESLint for linting
- Prettier for formatting
- TypeScript strict mode
- Regular dependency audits

---

*This architecture supports a scalable, maintainable Vue 3 application with real-time collaboration, offline support, and comprehensive game progress tracking.*
