# TarkovTracker - Documentation Index

**Project:** TarkovTracker
**Type:** Monorepo with 2 parts (Frontend + Backend)
**Generated:** 2025-10-21
**Scan Level:** Quick
**Status:** Active Development

---

## Quick Reference

### Frontend (Vue 3 SPA)

- **Tech Stack:** Vue 3 + Vite + Vuetify + Pinia + Firebase
- **Entry Point:** `frontend/src/main.ts`
- **Root Path:** `/frontend/`
- **Components:** ~72 Vue components across 11 feature modules
- **Architecture Pattern:** Feature-based modular architecture

### Backend (Firebase Cloud Functions)

- **Tech Stack:** Node.js 22 + Express + Firebase Admin
- **Entry Point:** `functions/src/index.ts`
- **Root Path:** `/functions/`
- **API Handlers:** 4 main modules (progress, team, token, userDeletion)
- **Architecture Pattern:** Express middleware with serverless functions

---

## Generated Documentation

### Core Documentation

- **[Project Overview](./bmm-project-overview.md)** - Executive summary, tech stack, and project classification
- **[Source Tree Analysis](./bmm-source-tree.md)** - Annotated directory structure and critical paths

### Architecture Documentation

- **[Architecture - Frontend](./bmm-architecture-frontend.md)**
- **[Architecture - Backend](./bmm-architecture-backend.md)**
- **[Integration Architecture](./bmm-integration-architecture.md)** _(To be generated)_

### Technical Documentation

- **[API Contracts](./bmm-api-contracts.md)**
- **[Data Models](./bmm-data-models.md)** _(To be generated)_
- **[Component Inventory](./bmm-component-inventory.md)** _(To be generated)_

### Development Documentation

- **[Development Guide](./bmm-development-guide.md)** _(To be generated)_
- **[Deployment Guide](./bmm-deployment-guide.md)** _(To be generated)_

## Deep-Dive Documentation

Detailed exhaustive analysis of specific areas:

- **[Maps Feature Deep-Dive](./deep-dive-maps.md)** - Comprehensive analysis of interactive map visualization system (3 components, ~340 LOC core, d3.js SVG rendering, coordinate transformations) - Generated 2025-01-21

---

## Existing Project Documentation

### Root Level

- **[README.md](../README.md)** - Main project introduction and getting started guide
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines and development workflow
- **[CLAUDE.md](../CLAUDE.md)** - Instructions for AI assistants working with this codebase
- **[SECURITY.md](../SECURITY.md)** - Security policy and vulnerability reporting
- **[LICENSE.md](../LICENSE.md)** - MIT License
- **[CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)** - Community code of conduct
- **[CHANGELOG.md](../CHANGELOG.md)** - Project changelog
- **[AGENTS.md](../AGENTS.md)** - Agent system documentation
- **[SUPPORT.md](../SUPPORT.md)** - Support and help resources

### Frontend Specific

- **[frontend/README.md](../frontend/README.md)** - Frontend setup and architecture
- **[frontend/TESTING.md](../frontend/TESTING.md)** - Frontend testing guide and strategies

### Backend Specific

- **[functions/README.md](../functions/README.md)** - Backend API documentation
- **[functions/test/README.md](../functions/test/README.md)** - Backend testing documentation

### Technical Reports

- **[REPORTS/README.md](../REPORTS/README.md)** - Reports index
- **[REPORTS/DEPENDENCY_UPGRADE_STRATEGY.md](../REPORTS/DEPENDENCY_UPGRADE_STRATEGY.md)** - Dependency management strategy
- **[REPORTS/TOKEN_INACTIVITY_EXPIRATION_GUIDE.md](../REPORTS/TOKEN_INACTIVITY_EXPIRATION_GUIDE.md)** - Token expiration guide
- **[REPORTS/APOLLO_CLIENT_V4_UPGRADE_GUIDE.md](../REPORTS/APOLLO_CLIENT_V4_UPGRADE_GUIDE.md)** - Apollo Client upgrade guide
- **[REPORTS/DEPENDENCY_UPGRADE_QUICK_START.md](../REPORTS/DEPENDENCY_UPGRADE_QUICK_START.md)** - Quick start for dependency upgrades
- **[REPORTS/ACTION_ITEMS.md](../REPORTS/ACTION_ITEMS.md)** - Tracked action items

### Operational Documentation

- **[docs/operations/rate-limits.md](./operations/rate-limits.md)** - API rate limiting documentation
- **[docs/ci/e2e-testing-strategy.md](./ci/e2e-testing-strategy.md)** - End-to-end testing strategy

---

## Getting Started

### For New Developers

1. **Start Here:** Read [README.md](../README.md) for prerequisites and setup
2. **Understand the Structure:** Review [Source Tree Analysis](./bmm-source-tree.md)
3. **Review Architecture:** Check [Project Overview](./bmm-project-overview.md) for tech stack
4. **Contributing:** Read [CONTRIBUTING.md](../CONTRIBUTING.md) before making changes
5. **AI Assistance:** Review [CLAUDE.md](../CLAUDE.md) for AI development guidelines

### For AI Assistants

1. **Primary Context:** Start with [bmm-project-overview.md](./bmm-project-overview.md)
2. **Navigation:** Use [bmm-source-tree.md](./bmm-source-tree.md) to locate files
3. **Development Rules:** Follow guidelines in [CLAUDE.md](../CLAUDE.md)
4. **Architecture Patterns:** Review architecture docs when generated

### Quick Development Commands

```bash
# Setup
npm install                          # Install all dependencies

# Development
npm run dev                          # Start frontend + backend emulators
cd frontend && npm run dev           # Frontend only
npm run emulators                    # Backend only

# Testing
cd frontend && npm test              # Frontend unit tests
cd frontend && npm run test:e2e      # E2E tests
cd functions && npm test             # Backend tests

# Building
npm run build                        # Build both workspaces
npm run build:frontend               # Frontend only
npm run build:functions              # Backend only

# Documentation
npm run docs                         # Generate API docs (Swagger UI)

# Code Quality
npm run lint                         # Lint all code
npm run format                       # Format all code
```

---

## Project Structure at a Glance

```
TarkovTracker/
├── frontend/              # Vue 3 SPA
│   ├── src/
│   │   ├── features/      # 11 feature modules
│   │   ├── composables/   # Reusable logic
│   │   ├── stores/        # Pinia state (6 stores)
│   │   ├── pages/         # Route pages (11 pages)
│   │   └── ...
│   └── e2e/               # Playwright tests
│
├── functions/             # Firebase Cloud Functions
│   ├── src/
│   │   ├── handlers/      # API endpoints (4 handlers)
│   │   ├── services/      # Business logic
│   │   └── ...
│   └── swaggerui/         # API documentation
│
├── docs/                  # Documentation
├── REPORTS/               # Technical reports
└── .github/workflows/     # CI/CD pipelines
```

---

## Integration Overview

**Frontend ↔ Backend:**

- REST API calls from frontend to Express endpoints on Cloud Functions
- Firebase Auth tokens for authentication
- API routes: `/api/` and `/api/v2/`

**Frontend ↔ Firebase:**

- Direct Firestore access for real-time data
- VueFire for reactive Firestore bindings
- Firebase Auth SDK for user authentication

**Backend ↔ External APIs:**

- GraphQL queries to Tarkov.dev API for game data
- Firebase Admin SDK for server-side Firestore access

---

## Workflow Status

**Current Phase:** 0-Documentation (In Progress)
**Workflow Status:** [bmm-workflow-status.md](./bmm-workflow-status.md)

**Next Steps:**

1. Complete remaining documentation (architecture, API contracts, etc.)
2. Proceed to Phase 1: Analysis (optional brainstorming/research)
3. Proceed to Phase 2: Planning (PRD and technical specifications)

---

## Notes

This documentation index serves as the **primary entry point** for understanding the TarkovTracker codebase. All generated documentation follows the BMM (Business Modeling Methodology) naming convention with the `bmm-` prefix.

Documents marked with _(To be generated)_ can be created by re-running the document-project workflow with specific focus areas or by selecting them during the documentation validation step.

---

**Documentation Generated By:** BMM document-project workflow
**Last Updated:** 2025-01-21
**Deep-Dives:** 1
**Maintained By:** TarkovTracker community
**Website:** <https://tarkovtracker.org>
