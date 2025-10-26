# TarkovTracker - Project Overview

**Generated:** 2025-10-21
**Scan Level:** Quick
**Documentation Version:** 1.0

## Executive Summary

TarkovTracker is a community-maintained web application for planning and tracking Escape From Tarkov game progression. The application provides task tracking, hideout upgrade monitoring, and item requirement management with real-time team collaboration features.

## Project Classification

- **Repository Type:** Monorepo
- **Architecture Style:** Full-stack web application with serverless backend
- **Primary Language:** TypeScript
- **Deployment Model:** Firebase Hosting + Cloud Functions

## Repository Structure

This is a **monorepo** containing two distinct parts:

### Part 1: Frontend (Vue 3 SPA)

- **Path:** `/frontend/`
- **Type:** Web Application
- **Framework:** Vue 3 with Composition API
- **Build Tool:** Vite
- **UI Framework:** Vuetify 3 (Material Design)
- **State Management:** Pinia
- **Source Files:** ~163 TypeScript/Vue files
- **Components:** ~72 Vue components across 11 feature modules

### Part 2: Backend (Firebase Cloud Functions)

- **Path:** `/functions/`
- **Type:** Serverless Backend API
- **Runtime:** Node.js 22
- **Framework:** Express.js
- **Platform:** Firebase Cloud Functions
- **Source Files:** ~23 TypeScript files
- **API Handlers:** 4 main handler modules

## Technology Stack Summary

### Frontend Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | Vue.js | 3.5+ | Reactive UI framework |
| Build Tool | Vite | Latest | Fast development and bundling |
| UI Library | Vuetify | 3.10+ | Material Design components |
| State | Pinia | 3.0+ | State management |
| Routing | Vue Router | 4.6+ | Client-side routing |
| Firebase | Firebase SDK | 11.10+ | Authentication & Firestore |
| Firebase | VueFire | 3.2+ | Vue Firebase integration |
| GraphQL | Apollo Client | 3.14+ | External API integration |
| i18n | Vue I18n | 11.1+ | Internationalization |
| Testing | Vitest | Latest | Unit testing |
| E2E Testing | Playwright | 1.56+ | End-to-end testing |
| TypeScript | TypeScript | 5.9+ | Type safety |

### Backend Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Runtime | Node.js | 22 | JavaScript runtime |
| Framework | Express | 5.1+ | HTTP server framework |
| Platform | Firebase Functions | 6.5+ | Serverless functions |
| Admin SDK | Firebase Admin | 13.5+ | Server-side Firebase |
| API Client | GraphQL Request | 7.2+ | External API calls |
| Body Parsing | body-parser | 2.2+ | Request parsing |
| CORS | cors | 2.8+ | Cross-origin requests |
| Documentation | Swagger JSDoc | 6.2+ | API documentation |
| Testing | Vitest | 3.2+ | Unit testing |
| TypeScript | TypeScript | 5.9+ | Type safety |

### Infrastructure & Tooling

| Category | Technology | Purpose |
|----------|-----------|---------|
| Database | Cloud Firestore | NoSQL document database |
| Authentication | Firebase Auth | User authentication |
| Hosting | Firebase Hosting | Static site hosting |
| CI/CD | GitHub Actions | Automated workflows |
| Package Manager | npm workspaces | Monorepo management |
| Linting | ESLint | Code quality |
| Formatting | Prettier | Code formatting |

## Feature Modules

### Frontend Features

The frontend is organized into 11 feature-based modules:

1. **auth** - User authentication and session management
2. **dashboard** - Main dashboard and progress overview
3. **drawer** - Navigation drawer component
4. **game** - Game-specific functionality
5. **hideout** - Hideout upgrade tracking
6. **layout** - Application layout components
7. **maps** - Map-related features
8. **neededitems** - Required items tracking
9. **settings** - User settings and preferences
10. **tasks** - Task and quest tracking
11. **team** - Team collaboration features
12. **ui** - Shared UI components

### Backend API Handlers

The backend provides 4 main API handler modules:

1. **progressHandler** - User progress tracking and updates
2. **teamHandler** - Team creation and management
3. **tokenHandler** - API token generation and management
4. **userDeletionHandler** - User account deletion

## Development Workflow

### Prerequisites

- Node.js 18+ or 22+ (see package.json engines)
- Java 11+ (for Firebase emulators)
- Firebase CLI (installed as dev dependency)

### Key Commands

```bash
# Development
npm run dev                  # Start frontend + Firebase emulators
cd frontend && npm run dev   # Frontend only
npm run emulators           # Backend emulators only

# Building
npm run build               # Build both workspaces
npm run build:frontend      # Build frontend only
npm run build:functions     # Build backend only

# Testing
cd frontend && npm test     # Frontend unit tests
cd frontend && npm run test:e2e  # E2E tests with Playwright
cd functions && npm test    # Backend unit tests

# Documentation
npm run docs                # Generate API docs (Swagger UI)

# Deployment
npm run deploy:dev          # Deploy to development
npm run deploy:prod         # Deploy to production
```

## CI/CD Pipelines

GitHub Actions workflows configured:

- **api-docs-deployment.yml** - API documentation deployment
- **frontend-tests.yml** - Frontend test automation
- **dependency-audit.yml** - Security and dependency checks
- **quality-gates.yml** - Code quality enforcement
- **claude-code-review.yml** - AI-assisted code review
- **stale.yml** - Stale issue management

## External Integrations

### Tarkov.dev GraphQL API

The application integrates with the Tarkov.dev GraphQL API for game data:

- Task definitions
- Item information
- Hideout requirements
- Map data

### Firebase Services

- **Authentication:** Google and Email/Password providers
- **Firestore:** Real-time database for user data and team state
- **Cloud Functions:** Serverless backend API
- **Hosting:** Frontend static site hosting

## Project Status

This is a community fork maintained at `tarkovtracker.org` while the original project at `tarkovtracker.io` is maintained by the original author. The codebase is actively developed with regular dependency updates and security patches.

## Documentation Inventory

**Existing Documentation:**

- Main README.md - Project introduction and setup
- CONTRIBUTING.md - Contribution guidelines
- CLAUDE.md - AI assistant instructions
- frontend/README.md - Frontend-specific docs
- frontend/TESTING.md - Testing documentation
- functions/README.md - Backend-specific docs
- REPORTS/ - Technical reports and upgrade guides
- docs/operations/ - Operational documentation
- docs/ci/ - CI/CD documentation

## Next Steps

For detailed information about specific aspects of the project, see:

- [Architecture Documentation](./bmm-architecture-frontend.md) _(To be generated)_
- [Architecture Documentation](./bmm-architecture-backend.md) _(To be generated)_
- [API Contracts](./bmm-api-contracts.md) _(To be generated)_
- [Component Inventory](./bmm-component-inventory.md) _(To be generated)_
- [Source Tree Analysis](./bmm-source-tree.md) _(To be generated)_
- [Development Guide](./bmm-development-guide.md) _(To be generated)_
- [Integration Architecture](./bmm-integration-architecture.md) _(To be generated)_

---

_This documentation was generated by the BMM (Business Modeling Methodology) document-project workflow._
