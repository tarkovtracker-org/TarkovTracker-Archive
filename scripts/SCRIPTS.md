# TarkovTracker Scripts Guide

> **Location**: This documentation belongs in the `/scripts/` directory
> **Purpose**: Documents all npm scripts and development workflows for the TarkovTracker monorepo

This is a monorepo with two main workspaces: `frontend` and `functions`.
Scripts are organized to avoid confusion and provide clear entry points from the root.

## Table of Contents

- [Development Environments](#development-environments)
- [Build & Deployment](#build--deployment)
- [API Documentation](#api-documentation)
- [Testing & Quality](#testing--quality)
- [Linting & Formatting](#linting--formatting)
- [Security & Diagnostics](#security--diagnostics)
- [Maintenance Utilities](#maintenance-utilities)
- [Helper Files](#helper-files)
- [Common Workflows](#common-workflows)

## Development Environments

### Frontend-Only Development
- **`npm run dev`** - Start Vite dev server (port 3000) for UI work
  - **Best for**: Component development, styling, routing
  - **Mock auth**: Set `VITE_DEV_AUTH=true` in `frontend/.env.local`

### Full-Stack Development
- **`npm run dev:full`** - Frontend + Firebase emulators (auth, firestore, functions, pubsub)
  - **Helper**: Runs concurrently with frontend dev server
  - **Best for**: Team features, auth flows, real-time sync

### Production-Like Testing
- **`npm run dev:firebase`** - Full build + all Firebase emulators including hosting
  - **Process**: Builds everything → Starts emulators → Serves on port 5000
  - **Best for**: Pre-deployment verification

### Firebase Emulator Management
- **`npm run emulators`** - Build functions + start all Firebase emulators via wrapper
  - **Helper**: `scripts/emulator-wrapper.ts` - Provides automatic cleanup and signal handling
  - **Features**: Automatic debug log cleanup on shutdown, graceful SIGINT/SIGTERM handling
- **`npm run emulators:backend`** - Build functions + start backend emulators only via wrapper
  - **Flags**: `--only auth,firestore,functions,pubsub` (excludes hosting emulator)
  - **Helper**: Same cleanup and signal handling as full emulator script
- **`npm run emulators:local`** - Start with local data import/export via wrapper
  - **Flags**: `--import=./local_data --export-on-exit=./local_data`
  - **Helper**: Wrapper ensures cleanup even with import/export functionality
  - **Note**: Does not build functions (assumes functions already built)

## Build & Deployment

### Build Pipeline
- **`npm run build`** - Complete build pipeline
  1. Builds functions workspace
  2. Generates OpenAPI specification
  3. Builds frontend workspace
- **`npm run build:functions`** - Functions workspace only
- **`npm run build:frontend`** - Frontend workspace only

### Deployment
- **`npm run deploy:staging`** - Deploy to 7-day preview channel
  - **Process**: Build functions → Generate docs → Build frontend → Deploy
  - **Channel**: `staging` (expires in 7 days)
- **`npm run deploy:prod`** - Deploy to production
  - **Process**: Same pipeline as staging, deploys to default project

## API Documentation

### OpenAPI Generation
- **`npm run docs`** - Build functions + generate OpenAPI + viewing instructions
  - **Output**: `functions/openapi/openapi.json`
  - **View**: Scalar UI via frontend/public/api/openapi.json
- **`npm run docs:generate`** - Generate OpenAPI and copy to frontend
  - **Source**: `functions/openapi/openapi.json`
  - **Target**: `frontend/public/api/openapi.json`

### Documentation Validation
- **`npm run docs:check`** - Verify OpenAPI synchronization
  - **Helper**: `scripts/check-openapi-sync.ts`
  - **Checks**: Both generated and copied OpenAPI files
  - **Fails**: If files have uncommitted changes after generation
  - **Purpose**: Ensures API docs stay accurate with source code

## Testing & Quality

### Test Execution
- **`npm run test`** - Run all test suites (functions then frontend)
- **`npm run test:frontend`** - Frontend workspace tests only
- **`npm run test:functions`** - Functions workspace tests only
- **`npm run test:functions:patterns`** - Validate test patterns
  - **Helper**: `functions/test/scripts/validateTestPatterns.ts`
  - **Enforces**: Centralized helper usage, prevents manual resetDb/seedDb

### Coverage Reporting
- **`npm run test:coverage`** - Generate coverage for both workspaces
- **`npm run test:coverage:frontend`** - Frontend coverage only
- **`npm run test:coverage:functions`** - Functions coverage only

## Linting & Formatting

### Comprehensive Linting
- **`npm run lint`** - Complete code quality check
  - **Helper**: `scripts/lint-all.ts`
  - **Includes**: ESLint, TypeScript checking, markdownlint
  - **Features**: ESLint caching for faster reruns

### Markdown Linting
- **`npm run lint:md`** - Check markdown files for style issues
- **`npm run lint:md:fix`** - Auto-fix markdown issues
- **`npm run lint:md:json`** - Output markdown lint results as JSON

### Code Formatting
- **`npm run format`** - Format code with Prettier
  - **Scope**: Vue, JS, TS files in both workspaces
- **`npm run format:check`** - Check formatting without changes

## Security & Diagnostics

### Security Scanning
- **`npm run security:scan`** - Comprehensive vulnerability audit
  - **Helper**: `scripts/security-scan.ts`
  - **Scope**: All workspaces + root dependencies
  - **Features**: Detailed reporting, fix recommendations
  - **Fails**: On critical/high severity vulnerabilities

### Health Checks
- **`scripts/health-check.sh`** - Legacy post-upgrade validation
  - **Status**: Archived after Firebase 12 upgrade
  - **Checks**: Build, tests, lint, type-check
  - **Use**: For manual validation after major upgrades

## Maintenance Utilities

### Dependency Management
- **`npm run deps`** - Interactive dependency upgrades
  - **Tool**: `taze` (cross-platform)
  - **Features**: Major/minor/patch selection, workspace awareness

### Cleanup
- **`npm run clean`** - Remove Firebase debug files
  - **Patterns**: `firebase-export-*`, `*-debug.log`, `firebase-debug*.log`

### Map Data Sync
- **`npm run maps:sync`** - Update fallback maps from tarkov.dev
  - **Helper**: `scripts/update-maps-from-tarkovdev.ts`
  - **Purpose**: Update fallback when tarkov.dev unreachable
  - **Note**: Runtime fetching is primary; this updates backup only

## Helper Files

### Core Helpers

#### `scripts/emulator-wrapper.ts`
- **Purpose**: Intelligent Firebase emulator management
- **Features**:
  - Automatic debug log cleanup on shutdown
  - Graceful SIGINT/SIGTERM handling
  - Timeout-based process termination
  - Cross-platform compatibility

#### `scripts/lint-all.ts`
- **Purpose**: Orchestrated code quality pipeline
- **Tasks**:
  - ESLint with caching
  - TypeScript type checking (both workspaces)
  - Markdownlint integration
- **Features**: Smart failure reporting, Windows compatibility

#### `scripts/check-openapi-sync.ts`
- **Purpose**: OpenAPI documentation synchronization guard
- **Validations**:
  - File existence checks
  - Git status comparison
  - Detailed reporting with fix instructions
- **CI Integration**: Fails build when docs are out of sync

#### `scripts/security-scan.ts`
- **Purpose**: Enhanced security vulnerability reporting
- **Features**:
  - Workspace-specific scanning
  - Severity-based reporting
  - Fix availability detection
  - Actionable recommendations

#### `scripts/update-maps-from-tarkovdev.ts`
- **Purpose**: Fallback map data synchronization
- **Process**:
  - Fetches from tarkov.dev GitHub repository
  - Converts to internal format
  - Preserves existing coordinate transformations
  - Implements retry logic with exponential backoff

#### `functions/test/scripts/validateTestPatterns.ts`
- **Purpose**: Enforce test architecture patterns
- **Rules**:
  - No manual `resetDb()`/`seedDb()` calls
  - Unit tests must not import Firestore helpers
  - Centralized test utility enforcement
- **Integration**: Used by `npm run test:functions:patterns`

## Dependency Management Scripts

### Upgrade Automation

- **`npm run deps`** - Interactive dependency upgrade tool powered by taze
  (works across platforms)

**Note:** Legacy upgrade scripts (`snapshot.sh`, `health-check.sh`, `batch-update.sh`)
have been archived after completing the Firebase 12 and dependency upgrade cycle.

**Dependency Guide:** See [docs/DEVELOPMENT.md#dependency-management](../docs/DEVELOPMENT.md#dependency-management)

### Manual Dependency Checks

- **`npm outdated`** - Check for outdated packages
- **`npm audit`** - Check for security vulnerabilities

### Map Data Management

- **`npm run maps:sync`** - Update fallback maps.json from tarkov.dev (rarely needed)
  - **Note:** Maps are fetched at runtime from tarkov.dev automatically
  - This only updates the fallback file used when tarkov.dev is unreachable
  - Run occasionally to keep fallback data current

## Quick Reference

### Development

```bash
npm run dev              # Frontend only (Vite dev server)
npm run dev:full         # Frontend + Firebase emulators
npm run dev:firebase     # Full stack + hosting (port 5000)
npm run emulators        # Build functions + start all emulators (via wrapper)
npm run emulators:backend # Backend emulators only (no hosting) via wrapper
npm run emulators:local  # With local data import/export (via wrapper)
```

**Automatic Cleanup:** All emulator scripts run through `scripts/emulator-wrapper.ts` which provides automatic debug log cleanup and graceful signal handling (SIGINT/SIGTERM).

### Building & Deployment

```bash
npm run build            # Build everything (functions → docs → frontend)
npm run build:functions  # Build functions only
npm run build:frontend   # Build frontend only
npm run deploy:staging   # Deploy to 7-day preview channel
npm run deploy:prod      # Deploy to production
```

### API Documentation

```bash
npm run docs             # Build functions + generate OpenAPI + show UI info
npm run docs:generate    # Generate and copy OpenAPI to frontend
npm run docs:check       # Verify OpenAPI is in sync with source
```

### Testing & Quality

```bash
npm run test             # Run all tests (functions + frontend)
npm run test:coverage    # Generate coverage reports
npm run test:functions:patterns # Validate test patterns
npm run lint             # ESLint + TypeScript + markdownlint
npm run security:scan    # Comprehensive vulnerability audit
npm run format           # Format code with Prettier
```

## Detailed Scripts

### Development Scripts

#### `npm run dev`

- **Purpose**: Frontend-only development setup
- **Process**: Starts Vite dev server only (port 3000)
- **Best for**: UI development, component work, styling, routing
- **Note**: No Firebase backend - use mock auth with VITE_DEV_AUTH=true

#### `npm run dev:full`

- **Purpose**: Full development setup with backend
- **Process**: Starts frontend dev server + Firebase emulators (auth, firestore,
  functions) concurrently
- **Best for**: Team features, auth flows, real-time sync

#### `npm run dev:firebase`

- **Purpose**: Production build testing
- **Process**: Builds everything + starts all Firebase emulators including hosting
  (port 5000)
- **Best for**: Pre-deployment testing, build verification

#### `npm run emulators`

- **Purpose**: Start all Firebase emulators
- **Process**: Builds functions + starts all Firebase emulators
- **Best for**: Full backend testing including hosting

#### `npm run emulators:backend`

- **Purpose**: Start backend Firebase emulators only
- **Process**: Builds functions + starts auth, firestore, functions emulators
- **Best for**: Backend development without hosting

#### `npm run emulators:local`

- **Purpose**: Start emulators with local data import
- **Process**: Starts emulators with imported data from ./local_data
- **Best for**: Testing with existing test data

### Build Scripts

#### `npm run build`

- **Purpose**: Build everything
- **Process**: Builds both frontend and functions workspaces
- **Best for**: Pre-deployment verification

#### `npm run build:functions`

- **Purpose**: Build Firebase functions only
- **Process**: Compiles TypeScript to JavaScript in functions workspace
- **Best for**: API development and testing

#### `npm run build:frontend`

- **Purpose**: Build frontend only
- **Process**: Builds Vue.js frontend
- **Best for**: Frontend-only deployments

### API Documentation Scripts

#### `npm run docs`

- **Purpose**: Build functions + generate OpenAPI spec + show viewing instructions
- **Process**: Builds functions, generates OpenAPI spec (via swagger-jsdoc), and provides viewing hint for Scalar UI
- **Output**: `functions/openapi/openapi.json`
- **Best for**: Complete documentation workflow

#### `npm run docs:generate`

- **Purpose**: Generate OpenAPI spec and copy to frontend
- **Process**: Generates OpenAPI spec and copies to `frontend/public/api/openapi.json` consumed by Scalar UI
- **Output**: `frontend/public/api/openapi.json`
- **Best for**: Making API docs available in deployed frontend

### Deployment Scripts

#### `npm run deploy:staging`

- **Purpose**: Deploy to the shared Firebase preview/staging channel
- **Process**: Build functions → Generate docs → Build frontend → Deploy to
  `staging` hosting channel (7-day expiry)
- **Best for**: QA/preview releases before production

#### `npm run deploy:prod`

- **Purpose**: Deploy to production environment
- **Process**: Build functions → Generate docs → Build frontend → Deploy to the
  active default project
- **Best for**: Production releases

### Quality & Maintenance Scripts

#### `npm run lint`

- **Purpose**: Lint all code
- **Process**: Runs `scripts/lint-all.ts` (through `tsx`), which executes ESLint, TypeScript type-checking for both workspaces, and markdownlint (via npm script invocation of `npm run lint:md`)
- **Best for**: Code quality checks across JS/TS/Vue and documentation

#### `npm run format`

- **Purpose**: Format all code
- **Process**: Runs Prettier on Vue, JS, and TS files
- **Best for**: Code formatting

#### `npm run format:check`

- **Purpose**: Check code formatting
- **Best for**: CI/CD formatting verification

#### `npm run clean`

- **Purpose**: Clean up Firebase debug files
- **Best for**: Cleanup after development

#### `npm run deps`

- **Purpose**: Update dependencies
- **Process**: Uses `taze` to update package dependencies
- **Best for**: Dependency management

### Testing Scripts

#### `npm run test`

- **Purpose**: Run all tests
- **Process**: Runs functions tests then frontend tests
- **Best for**: Full test suite verification

#### `npm run test:frontend`

- **Purpose**: Run frontend tests only
- **Process**: Runs Vitest tests in frontend workspace
- **Best for**: Frontend-only development

#### `npm run test:functions`

- **Purpose**: Run functions tests only
- **Process**: Runs Vitest tests in functions workspace
- **Best for**: Backend/API development

## Workspace Structure

```bash
TarkovTracker/
├── package.json          # Root scripts (use these!)
├── frontend/
│   └── package.json      # Frontend-specific scripts
├── functions/
│   └── package.json      # Functions-specific scripts
└── functions/openapi/    # OpenAPI specification output
    └── openapi.json      # OpenAPI specification (generated)
```

## Best Practices

1. **Use root scripts** - Run scripts from the root directory using the scripts in
   the root `package.json`
1. **Don't run workspace scripts directly** - Unless you're doing workspace-specific
   development
1. **Build before docs** - Always build functions before generating documentation
1. **Test locally first** - Use `npm run dev` or `npm run emulators:local` before
   deploying
1. **Check formatting** - Run `npm run format:check` before commits

## Common Workflows

### 1. Daily Development

```bash
npm run dev            # Frontend only (UI work)
npm run dev:full       # Frontend + backend (features/auth)
npm run dev:firebase   # Full stack with hosting (production testing)
```

### 2. API Development

```bash
npm run build:functions  # Build functions
npm run docs             # Generate and view API docs
npm run docs:check       # Verify docs are in sync
npm run test:functions   # Run backend tests
```

### 3. Frontend Development

```bash
npm run dev            # Start frontend dev server
npm run test:frontend  # Run frontend tests
npm run build:frontend # Build frontend only
```

### 4. Testing & Quality Assurance

```bash
npm run test                    # Run all tests
npm run test:coverage           # Generate coverage reports
npm run test:functions:patterns # Validate test architecture
npm run lint                    # Check code quality
npm run security:scan           # Check for vulnerabilities
npm run format:check            # Check formatting
```

### 5. Pre-deployment Checklist

```bash
npm run test           # Run full test suite
npm run lint           # Final code quality check
npm run docs:check     # Ensure API docs are current
npm run security:scan  # Verify no security issues
npm run build          # Build everything
```

### 6. Deploy to Staging Preview

```bash
npm run deploy:staging  # One command deployment to staging channel
```

### 7. Deploy to Production

```bash
npm run deploy:prod     # One command deployment
```

### 8. Maintenance & Upgrades

```bash
npm run deps            # Interactive dependency upgrades
npm run maps:sync       # Update fallback map data
npm run clean           # Clean up debug files
```
