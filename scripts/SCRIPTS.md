# TarkovTracker Scripts Guide

> **Location**: This documentation belongs in the `/scripts/` directory
> **Purpose**: Documents all npm scripts and development workflows for the TarkovTracker monorepo

This is a monorepo with two main workspaces: `frontend` and `functions`.
Scripts are organized to avoid confusion and provide clear entry points from the root.

## Dependency Management Scripts

### Upgrade Automation

- **`npm run deps`** - Interactive dependency upgrade tool powered by taze
  (works across platforms)

**Note:** Legacy upgrade scripts (`snapshot.sh`, `health-check.sh`, `batch-update.sh`)
have been archived after completing the Firebase 12 and dependency upgrade cycle.

**Quick Start:** See [docs/REPORTS/DEPENDENCY_UPGRADE_QUICK_START.md](../docs/REPORTS/DEPENDENCY_UPGRADE_QUICK_START.md)

**Full Strategy:** See [docs/REPORTS/DEPENDENCY_UPGRADE_STRATEGY.md](../docs/REPORTS/DEPENDENCY_UPGRADE_STRATEGY.md)

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
npm run dev         # Start frontend only (Vite dev server)
npm run dev:full    # Start frontend + Firebase emulators (auth, firestore, functions)
npm run dev:firebase # Build everything + start all Firebase emulators
                  # including hosting
npm run emulators   # Build functions + start all Firebase emulators
npm run emulators:backend # Build functions + start backend emulators only
                  # (auth, firestore, functions)
npm run emulators:local # Start emulators with imported local data
```

**Automatic Cleanup:** All emulator scripts now use an intelligent wrapper that
automatically cleans up Firebase debug logs when emulators shut down
(including SIGINT/SIGTERM signals).

### Building

```bash
npm run build            # Build everything (frontend + functions)
npm run build:functions  # Build functions only
npm run build:frontend   # Build frontend only
```

### API Documentation

```bash
npm run docs:generate    # Generate OpenAPI docs and copy to frontend/public/api/
```

### Testing

```bash
npm run test             # Run all tests (functions + frontend)
npm run test:frontend    # Run frontend tests only
npm run test:functions   # Run functions tests only
```

### Deployment

```bash
npm run deploy:staging   # Deploy to staging preview channel
npm run deploy:prod      # Deploy to production environment
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

- **Purpose**: Build functions + generate docs + show viewing instructions
- **Process**: Builds functions, generates Swagger docs, and shows how to view them
- **Output**: `functions/openapi/openapi.json`
- **Best for**: Complete documentation workflow

#### `npm run docs:generate`

- **Purpose**: Generate docs and copy to frontend
- **Process**: Generates Swagger docs and copies to frontend/public/api/
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
- **Process**: Runs ESLint on entire monorepo
- **Best for**: Code quality checks

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
npm run test:functions   # Run backend tests
```

### 3. Frontend Development

```bash
npm run dev            # Start frontend dev server
npm run test:frontend  # Run frontend tests
npm run build:frontend # Build frontend only
```

### 4. Testing

```bash
npm run test           # Run all tests
npm run lint           # Check code quality
npm run format:check   # Check formatting
```

### 5. Pre-deployment

```bash
npm run test           # Run full test suite
npm run build          # Build everything
npm run lint           # Final code quality check
```

### 6. Deploy to Staging Preview

```bash
npm run deploy:staging  # One command deployment to staging channel
```

### 7. Deploy to Production

```bash
npm run deploy:prod     # One command deployment
```
