# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Prerequisites

- **Node.js 18+** - Required for all development
- **Java 11+ Runtime Environment** - Required for Firebase emulators
- **Firebase CLI** - Installed as dev dependency (`firebase-tools`)

## Development Commands

### Essential Commands

- `npm run dev` - Start complete development environment (frontend + Firebase emulators)
- `npm run build` - Build entire project (frontend + functions)
- `npm run lint` - Lint entire codebase
- `npm run format` - Format code with Prettier

### Frontend Development

- `cd frontend && npm run dev` - Start frontend development server only
- `npm run build:frontend` - Build frontend only
- `cd frontend && npm run type-check` - Type check frontend code

### Backend/Functions Development

- `npm run build:functions` - Build Firebase Cloud Functions
- `npm run emulators` - Start Firebase emulators
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

- `npm run deploy:dev` - Deploy to development environment
- `npm run deploy:prod` - Deploy to production environment

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
