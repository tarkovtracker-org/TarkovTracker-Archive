# TarkovTracker - Source Tree Analysis

**Generated:** 2025-10-21

## Repository Structure

```
TarkovTracker/                          # Monorepo root
├── frontend/                           # Vue 3 SPA (Part 1)
│   ├── src/
│   │   ├── composables/                # Reusable composition functions
│   │   │   ├── api/                    # API client composables
│   │   │   ├── data/                   # Data fetching composables
│   │   │   ├── firebase/               # Firebase integration composables
│   │   │   ├── tasks/                  # Task-related logic
│   │   │   ├── utils/                  # Utility composables
│   │   │   └── __tests__/              # Composable unit tests
│   │   ├── config/                     # Configuration files
│   │   ├── features/                   # Feature-based modules
│   │   │   ├── auth/                   # Authentication feature
│   │   │   ├── dashboard/              # Dashboard feature
│   │   │   ├── drawer/                 # Navigation drawer
│   │   │   ├── game/                   # Game-specific features
│   │   │   ├── hideout/                # Hideout tracking
│   │   │   ├── layout/                 # App layout components
│   │   │   ├── maps/                   # Map features
│   │   │   ├── neededitems/            # Required items tracking
│   │   │   ├── settings/               # User settings
│   │   │   ├── tasks/                  # Task tracking
│   │   │   ├── team/                   # Team collaboration
│   │   │   └── ui/                     # Shared UI components
│   │   ├── locales/                    # i18n translation files
│   │   ├── pages/                      # Route-based page components (~11 pages)
│   │   ├── plugins/                    # Vue plugins (Pinia, Vuetify, etc.)
│   │   ├── router/                     # Vue Router configuration
│   │   ├── services/                   # Business logic services
│   │   ├── stores/                     # Pinia state stores (~6 stores)
│   │   │   ├── progress/               # Progress-related stores
│   │   │   └── utils/                  # Store utilities
│   │   ├── test/                       # Test utilities
│   │   ├── types/                      # TypeScript type definitions
│   │   ├── utils/                      # Utility functions
│   │   │   └── __tests__/              # Utility tests
│   │   ├── App.vue                     # Root component
│   │   └── main.ts                     # Application entry point → Bootstrap Vue app
│   ├── e2e/                            # Playwright E2E tests
│   ├── public/                         # Static assets
│   ├── package.json                    # Frontend dependencies
│   ├── vite.config.ts                  # Vite build configuration
│   ├── tsconfig.json                   # TypeScript configuration
│   └── README.md                       # Frontend documentation
│
├── functions/                          # Firebase Cloud Functions (Part 2)
│   ├── src/
│   │   ├── auth/                       # Authentication logic
│   │   ├── handlers/                   # HTTP request handlers
│   │   │   ├── progressHandler.ts      # Progress tracking endpoints
│   │   │   ├── teamHandler.ts          # Team management endpoints
│   │   │   ├── tokenHandler.ts         # API token endpoints
│   │   │   └── userDeletionHandler.ts  # User deletion endpoint
│   │   ├── middleware/                 # Express middleware
│   │   ├── openapi/                    # Swagger/OpenAPI generation
│   │   ├── progress/                   # Progress business logic
│   │   ├── services/                   # Shared services
│   │   ├── token/                      # Token generation logic
│   │   ├── types/                      # TypeScript types
│   │   ├── utils/                      # Utility functions
│   │   └── index.ts                    # Cloud Functions entry point → Bootstrap Express app
│   ├── test/                           # Backend tests
│   ├── openapi/                        # Generated OpenAPI specification
│   ├── package.json                    # Backend dependencies
│   ├── tsconfig.json                   # TypeScript configuration
│   └── README.md                       # Backend documentation
│
├── docs/                               # Project documentation
│   ├── operations/                     # Operational docs
│   │   └── rate-limits.md              # API rate limiting
│   ├── ci/                             # CI/CD documentation
│   │   └── e2e-testing-strategy.md     # E2E test strategy
│   └── bmm-*.md                        # BMM generated documentation
│
├── docs/                               # Project documentation
│   ├── REPORTS/                        # Technical reports
│   │   ├── DEPENDENCY_UPGRADE_STRATEGY.md  # Dependency management
│   │   ├── TOKEN_INACTIVITY_EXPIRATION_GUIDE.md
│   │   ├── APOLLO_CLIENT_V4_UPGRADE_GUIDE.md
│   │   └── ACTION_ITEMS.md             # Tracked action items
│   ├── operations/                     # Operational docs
│   └── development/                    # Development docs
│
├── .github/                            # GitHub configuration
│   ├── workflows/                      # CI/CD pipelines
│   │   ├── api-docs-deployment.yml     # API docs deployment
│   │   ├── frontend-tests.yml          # Frontend test automation
│   │   ├── dependency-audit.yml        # Security audits
│   │   ├── quality-gates.yml           # Code quality checks
│   │   └── claude-code-review.yml      # AI code review
│   └── ISSUE_TEMPLATE/                 # Issue templates
│
├── firebase.json                       # Firebase project configuration
├── firestore.rules                     # Firestore security rules
├── firestore.indexes.json              # Firestore index definitions
├── package.json                        # Monorepo root package → npm workspaces
├── README.md                           # Main project documentation
├── CONTRIBUTING.md                     # Contribution guidelines
├── CLAUDE.md                           # AI assistant instructions
├── SECURITY.md                         # Security policy
├── LICENSE.md                          # MIT License
└── CODE_OF_CONDUCT.md                  # Code of conduct
```

## Critical Directories

### Frontend Critical Paths

**Entry Point:**

- `frontend/src/main.ts` - Application bootstrap, initializes Vue, Pinia, Router, Firebase

**Core Application:**

- `frontend/src/App.vue` - Root component with router-view
- `frontend/src/router/` - Route definitions and navigation guards
- `frontend/src/plugins/` - Vue plugins configuration (Vuetify, Pinia, Firebase)

**Feature Modules:**

- `frontend/src/features/` - Feature-based organization (11 modules)
- Each feature contains components, composables, and feature-specific logic

**State Management:**

- `frontend/src/stores/` - Pinia stores for global state
- Integration with Firebase via VueFire plugin

**API Layer:**

- `frontend/src/composables/api/` - API client logic
- `frontend/src/composables/firebase/` - Firebase integration
- `frontend/src/services/` - Business logic services

**Testing:**

- `frontend/src/**/__tests__/` - Unit tests (Vitest)
- `frontend/e2e/` - End-to-end tests (Playwright)

### Backend Critical Paths

**Entry Point:**

- `functions/src/index.ts` - Cloud Functions export, Express app setup

**API Handlers:**

- `functions/src/handlers/` - HTTP endpoint implementations
  - Progress tracking API
  - Team management API
  - Token generation API
  - User deletion API

**Core Services:**

- `functions/src/services/` - Business logic and external API integration
- `functions/src/auth/` - Authentication and authorization
- `functions/src/middleware/` - Express middleware (CORS, auth, validation)

**Data Layer:**

- Firebase Admin SDK for Firestore access
- Transaction-based operations for data consistency

**API Documentation:**

- `functions/src/openapi/` - Swagger/OpenAPI generation
- `functions/openapi/` - Generated OpenAPI specification (consumed by Scalar UI)

## Integration Points

### Frontend → Backend

- **HTTP API Calls:** Frontend calls Express endpoints hosted on Cloud Functions
- **Authentication:** Firebase Auth tokens passed as Bearer tokens
- **Endpoints:** `/api/` and `/api/v2/` routes

### Frontend → Firebase

- **Direct Firestore Access:** Real-time listeners for user progress and team data
- **Authentication:** Firebase Auth SDK for login/logout
- **VueFire Integration:** Reactive Firestore bindings in Vue components

### Backend → External APIs

- **Tarkov.dev GraphQL API:** Fetches game data (tasks, items, hideout)
- **GraphQL Request Client:** Used for external API calls

### Frontend → External APIs

- **Apollo Client:** Direct GraphQL queries to Tarkov.dev API
- **Client-side Data Fetching:** Task definitions, item data

## Build & Deployment Flow

**Development:**

1. `npm run dev` starts both frontend (Vite dev server) and backend (Firebase emulators)
2. Frontend proxies API calls to local emulator
3. Hot module replacement for fast iteration

**Production Build:**

1. `npm run build` compiles both workspaces
2. Frontend: Vite builds optimized SPA bundle
3. Backend: TypeScript compiles to `functions/lib/`
4. API docs generated via Swagger

**Deployment:**

1. Firebase CLI deploys frontend to Firebase Hosting
2. Cloud Functions deployed to Firebase Functions
3. Firestore rules and indexes deployed
4. Separate environments: dev and production

## Testing Strategy

**Frontend Tests:**

- **Unit Tests:** Vitest for composables, utilities, stores
- **Component Tests:** Vitest with Vue Test Utils
- **E2E Tests:** Playwright for full user flows
- **Coverage:** Run via `npm run test:coverage`

**Backend Tests:**

- **Unit Tests:** Vitest for handlers and services
- **Integration Tests:** Test with Firebase emulators

**CI/CD Testing:**

- Automated frontend tests on PR
- Dependency audits
- Quality gates enforcement

---

*This source tree represents a well-organized monorepo with clear separation between frontend and backend concerns, feature-based frontend organization, and comprehensive testing infrastructure.*
