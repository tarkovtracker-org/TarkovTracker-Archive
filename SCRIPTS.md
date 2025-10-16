# TarkovTracker Scripts Guide

This is a monorepo with two main workspaces: `frontend` and `functions`. Scripts are organized to avoid confusion and provide clear entry points from the root.

## Dependency Management Scripts

### Upgrade Automation

- **`./scripts/snapshot.sh`** - Create pre-upgrade snapshot with git tags and baselines
- **`./scripts/batch-update.sh <batch-number>`** - Execute batch dependency updates (1-5)
- **`./scripts/health-check.sh`** - Post-upgrade health verification
- **`./scripts/migrate-firebase-exists.sh`** - Migrate Firestore `.exists` property to method

**Quick Start:** See [DEPENDENCY_UPGRADE_QUICK_START.md](./DEPENDENCY_UPGRADE_QUICK_START.md)

**Full Strategy:** See [DEPENDENCY_UPGRADE_STRATEGY.md](./DEPENDENCY_UPGRADE_STRATEGY.md)

### Manual Dependency Checks

- **`npm outdated`** - Check for outdated packages
- **`npm audit`** - Check for security vulnerabilities
- **`npm run deps`** - Interactive dependency upgrade tool (uses taze)

## Quick Reference

### Development

```bash
npm run dev         # Start frontend + functions emulators
npm run emulators   # Start emulators with local data (backend only)
```

### Building

```bash
npm run build            # Build everything (frontend + functions)
npm run build:functions  # Build functions only
npm run build:frontend   # Build frontend only
```

### API Documentation

```bash
npm run docs             # Build functions + generate docs + show viewing instructions
```

### Deployment

```bash
npm run deploy:dev       # Deploy to development environment
npm run deploy:prod      # Deploy to production environment
```

## Detailed Scripts

### Development Scripts

#### `npm run dev`

- **Purpose**: Full development setup
- **Process**: Starts frontend dev server + Firebase emulators concurrently
- **Best for**: Daily development workflow

#### `npm run emulators`

- **Purpose**: Start Firebase emulators with local data (backend only)
- **Process**: Builds functions + starts emulators with imported data
- **Best for**: Backend development or testing with existing test data

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
- **Output**: `docs/openapi.json` and `docs/openapi.js`
- **Best for**: Complete documentation workflow

### Deployment Scripts

#### `npm run deploy:dev`

- **Purpose**: Deploy to development environment
- **Process**: Switch to dev Firebase project → Build functions → Generate docs → Build frontend for dev → Deploy
- **Best for**: Development releases

#### `npm run deploy:prod`

- **Purpose**: Deploy to production environment
- **Process**: Switch to prod Firebase project → Build functions → Generate docs → Build frontend for prod → Deploy
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

## Workspace Structure

```bash
TarkovTracker/
├── package.json          # Root scripts (use these!)
├── frontend/
│   └── package.json      # Frontend-specific scripts
├── functions/
│   └── package.json      # Functions-specific scripts
└── docs/                 # Generated API documentation
    ├── index.html        # Swagger UI
    ├── openapi.json      # OpenAPI specification
    └── openapi.js        # Browser-ready OpenAPI
```

## Best Practices

1. **Use root scripts** - Run scripts from the root directory using the scripts in the root `package.json`
2. **Don't run workspace scripts directly** - Unless you're doing workspace-specific development
3. **Build before docs** - Always build functions before generating documentation
4. **Test locally first** - Use `npm run dev` or `npm run emulators:local` before deploying
5. **Check formatting** - Run `npm run format:check` before commits

## Common Workflows

### 1. Daily Development

```bash
npm run dev  # Starts everything you need
```

### 2. API Development

```bash
npm run build:functions  # Build functions
npm run docs             # Generate and view API docs
```

### 3. Pre-deployment

```bash
npm run lint            # Check code quality
npm run format:check    # Check formatting
npm run build           # Build everything
```

### 4. Deploy to Development

```bash
npm run deploy:dev      # One command deployment
```

### 5. Deploy to Production

```bash
npm run deploy:prod     # One command deployment
```
