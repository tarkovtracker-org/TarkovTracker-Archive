# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Prerequisites

- **Node.js 18+** - Required for all development
- **Java 11+ Runtime Environment** - Required for Firebase emulators
- **Firebase CLI** - Installed as dev dependency (`firebase-tools`)

## Development Commands

### Three Development Modes

This project supports three distinct development modes optimized for different workflows:

#### 1. `npm run dev` - Pure Frontend Development (Recommended for UI work)

- **What runs:** Vite dev server only (port 3000)
- **What doesn't run:** No Firebase emulators
- **Use for:** UI development, component work, styling, routing
- **Auth support:** Enable mock auth with `VITE_DEV_AUTH=true` in `frontend/.env.local`
- **Fastest startup** - No backend services needed

#### 2. `npm run dev:full` - Full Stack Development

- **What runs:** Vite dev server (3000) + Firebase emulators (auth, firestore, functions)
- **What doesn't run:** Hosting emulator (port 5000) - not needed during dev
- **Use for:** Team features, auth flows, API tokens, real-time sync, functions testing
- **Complete backend integration** - Tests all Firebase features

#### 3. `npm run dev:firebase` - Production Build Testing

- **What runs:** ALL Firebase emulators including hosting (port 5000)
- **What doesn't run:** Vite dev server
- **Use for:** Pre-deployment testing, build verification, production bug testing
- **Builds first:** Runs full production build before starting emulators
- **Serves:** Production-optimized code from `frontend/dist`

### Quick Reference Table

| Command | Frontend | Backend | Hosting | Use Case |
|---------|----------|---------|---------|----------|
| `npm run dev` | Vite (3000) | ❌ None | ❌ No | UI/component work |
| `npm run dev:full` | Vite (3000) | ✅ Emulators | ❌ No | Full-stack features |
| `npm run dev:firebase` | ❌ None | ✅ Emulators | ✅ Yes (5000) | Pre-deploy testing |

### Other Essential Commands

- `npm run build` - Build entire project (frontend + functions)
- `npm run lint` - Lint entire codebase
- `npm run format` - Format code with Prettier

### Frontend Development

- `npm run build:frontend` - Build frontend only
- `cd frontend && npm run type-check` - Type check frontend code

### Backend/Functions Development

- `npm run build:functions` - Build Firebase Cloud Functions
- `npm run emulators` - Start all Firebase emulators (includes hosting)
- `npm run emulators:backend` - Start backend emulators only (auth, firestore, functions)
- `npm run emulators:local` - Start emulators with local data import
- `npm run export:data` - Export emulator data to local_data directory

### Testing

- `cd frontend && npm test` - Run frontend unit tests with Vitest (watch mode)
- `cd frontend && npm run test:run` - Run frontend unit tests once
- `cd frontend && npm run test:coverage` - Run tests with coverage report
- `cd frontend && npm run test:e2e` - Run Playwright end-to-end tests
- `cd frontend && npm run test:e2e:ui` - Run E2E tests in interactive UI mode
- `cd functions && npm test` - Run backend/functions tests with Vitest

### API Documentation

- `npm run docs` - Generate API documentation (output: `docs/index.html` - open in browser to view Swagger UI)

### Deployment

- `npm run deploy:staging` - Deploy to staging preview channel
- `npm run deploy:prod` - Deploy to production environment

## Local Development Setup

### Mock Authentication for Pure Frontend Development

When using `npm run dev` (frontend only, no emulators), you can enable mock authentication to test auth-gated features without Firebase:

1. **Create/copy the environment file:**

   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

2. **Enable dev auth:**

   ```bash
   # Edit frontend/.env.local
   VITE_DEV_AUTH=true
   ```

3. **Start development:**

   ```bash
   npm run dev
   ```

You'll be automatically "logged in" as a dev user with:

- **UID:** Randomly generated, persists across reloads
- **Email:** `dev@localhost.local`
- **Display Name:** `Dev User`
- **Auth Status:** `loggedIn: true`

**Note:** This bypasses real Firebase authentication and only works in development mode. For testing real auth flows, use `npm run dev:full` with Firebase emulators.

### Port Reference

| Port | Service | When Active |
|------|---------|-------------|
| 3000 | Vite Dev Server | `npm run dev`, `npm run dev:full` |
| 4999 | Firebase Emulator UI | All emulator modes |
| 5000 | Firebase Hosting Emulator | `npm run dev:firebase`, `npm run emulators` |
| 5001 | Cloud Functions Emulator | All emulator modes |
| 5002 | Firestore Emulator | All emulator modes |
| 5003 | Realtime Database Emulator | All emulator modes |
| 8085 | Pub/Sub Emulator | All emulator modes |
| 9099 | Auth Emulator | All emulator modes |

**Access Firebase Emulator UI:** <http://localhost:4999> when any emulator mode is running

## Project Architecture

### Monorepo Structure

This is a **monorepo** with two main workspaces:

- **`/frontend`** - Vue 3 Single Page Application
- **`/functions`** - Firebase Cloud Functions (Node.js/TypeScript backend)

### Frontend Architecture (Vue 3 + Composition API)

- **Framework**: Vue 3 with Composition API and TypeScript
- **UI Framework**: Vuetify 3 (Material Design components)
- **State Management**: Pinia stores
- **Routing**: Vue Router 4
- **Build Tool**: Vite
- **GraphQL**: Apollo Client for external APIs
- **Firebase Integration**: VueFire for Firebase features
- **i18n**: Vue I18n for internationalization

### Key Frontend Patterns

- **Feature-based organization**: Components organized in `/src/features/` by domain
- **Composables pattern**: Reusable logic in `/src/composables/`
- **Store pattern**: Pinia stores for state management in `/src/stores/`
- **Page-based routing**: Main pages in `/src/pages/`

### Backend Architecture (Firebase Cloud Functions)

- **Runtime**: Node.js with TypeScript
- **API Framework**: Express.js with CORS and body parsing
- **Authentication**: Firebase Auth with custom bearer token verification
- **Database**: Firestore with transaction-based operations
- **External APIs**: GraphQL queries to Tarkov.dev API
- **Scheduled Tasks**: Firebase scheduled functions for data fetching

### Key Backend Patterns

- **Express middleware pattern**: Authentication and error handling
- **Transaction-based operations**: All team operations use Firestore transactions
- **Callable + HTTP endpoints**: Dual API approach for flexibility
- **API versioning**: `/api/` and `/api/v2/` routes for backward compatibility

### Data Flow Architecture

1. **Frontend** → Firebase Auth → **Backend API**
2. **Backend** → Firestore transactions → **Database**
3. **Scheduled Functions** → External APIs → **Firestore**
4. **Frontend** → VueFire → **Real-time Firestore updates**

### State Management Pattern

- **User State**: Individual user progress and settings
- **Team State**: Team member progress aggregation
- **Tarkov Data**: Game data from external APIs
- **Progress Tracking**: Reactive state updates across team members

### Authentication Flow

1. Firebase Auth (Google/Email providers)
2. API token generation for third-party access
3. Bearer token verification middleware
4. User context injection into requests

### Team System Architecture

- **Team Creation**: Transaction-based with unique ID generation
- **Member Management**: Array-based membership with transaction safety
- **Progress Sharing**: Real-time sync via Firestore listeners
- **Data Isolation**: Per-user collections with team aggregation

### API Integration Points

- **Tarkov.dev GraphQL API**: Game data synchronization
- **Firebase APIs**: Auth, Firestore, Cloud Functions
- **Third-party API tokens**: User-generated tokens for external access

## Development Patterns

### Component Development

- Use Vue 3 Composition API syntax
- Components in `/frontend/src/features/` organized by domain
- Shared UI components in `/frontend/src/features/ui/`
- Follow Vuetify component patterns and theming
- **Keep components under 300 lines** - decompose large files into smaller, focused components

### State Management

- Use Pinia stores for all state management
- Store files in `/frontend/src/stores/` (consolidated from previous `/composables/stores/`)
- Composables for reusable reactive logic in `/frontend/src/composables/`
- Use proper TypeScript casting for Firestore plugin extensions

### API Development

- **Handlers**: Organized in `/functions/src/handlers/` by domain (progress, team, token)  
- **Services**: Business logic extracted to `/functions/src/services/`
- **Middleware**: Authentication and error handling in `/functions/src/middleware/`
- **Types**: Shared interfaces in `/functions/src/types/`
- Use TypeScript interfaces for all data structures
- Implement both callable and HTTP endpoints for flexibility

### Database Operations

- Always use Firestore transactions for multi-document operations
- Implement proper error handling and logging
- Use typed document references and snapshots

## Code Quality Standards

### Complexity Management

- **Functions**: Keep Firebase Cloud Functions handlers focused and under 200 lines each
- **Components**: Vue components over 400 lines should be decomposed into smaller, focused components  
- **Stores**: Extract reusable state logic into shared_state.ts patterns
- **Templates**: Avoid deeply nested template structures - use composition
- **Clean Code**: Remove commented imports, unused files, and redundant abstractions

### Import Organization

- Use absolute imports with `@/` prefix
- Group imports: Vue/framework first, then local imports
- Remove unused imports regularly

### TypeScript Usage

- Cast Pinia stores properly when using plugins: `as StoreWithFireswapExt<ReturnType<typeof useStore>>`
- Avoid `any` types - use proper interfaces
- Use proper null checking for optional values
