# TarkovTracker Scripts Guide

This is a monorepo with two main workspaces: `frontend` and `functions`. Scripts are organized to avoid confusion and provide clear entry points from the root.

## Quick Reference

### Development

```bash
npm run dev              # Start frontend + functions emulators
npm run frontend         # Start frontend only
npm run emulators:local  # Start emulators with local data
```

### Building

```bash
npm run build            # Build everything (frontend + functions)
npm run build:functions  # Build functions only
npm run build:frontend   # Build frontend only
```

### API Documentation

```bash
npm run docs             # Generate OpenAPI/Swagger docs
npm run docs:generate    # Build functions + generate docs
npm run docs:serve       # Generate docs + show viewing instructions
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

#### `npm run frontend`

- **Purpose**: Frontend development only
- **Process**: Starts Vite dev server for frontend
- **Best for**: Pure frontend development

#### `npm run emulators:start`

- **Purpose**: Start Firebase emulators (clean state)
- **Best for**: Testing with fresh data

#### `npm run emulators:local`

- **Purpose**: Start Firebase emulators with local data
- **Process**: Builds functions + starts emulators with imported data
- **Best for**: Development with existing test data

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

#### `npm run build:frontend:dev`

- **Purpose**: Build frontend for development environment
- **Best for**: Development deployments

#### `npm run build:frontend:prod`

- **Purpose**: Build frontend for production environment
- **Best for**: Production deployments

### API Documentation Scripts

#### `npm run docs`

- **Purpose**: Generate API documentation
- **Process**: Delegates to functions workspace swagger script
- **Output**: `docs/openapi.json` and `docs/openapi.js`
- **Best for**: Quick doc generation

#### `npm run docs:generate`

- **Purpose**: Build functions + generate docs
- **Process**: Ensures functions are built before generating docs
- **Best for**: Ensuring docs are up-to-date with latest code

#### `npm run docs:serve`

- **Purpose**: Generate docs + viewing instructions
- **Process**: Generates docs and shows how to view them
- **Best for**: When you want to immediately view the generated docs

### Deployment Scripts

#### `npm run deploy:dev`

- **Purpose**: Deploy to development environment
- **Process**:
  1. Switch to dev Firebase project
  2. Build functions
  3. Generate API docs
  4. Build frontend for dev
  5. Deploy everything
- **Best for**: Development releases

#### `npm run deploy:prod`

- **Purpose**: Deploy to production environment
- **Process**:
  1. Switch to prod Firebase project
  2. Build functions
  3. Generate API docs
  4. Build frontend for prod
  5. Deploy everything
- **Best for**: Production releases

### Quality & Maintenance Scripts

#### `npm run lint`

- **Purpose**: Lint all code
- **Process**: Runs ESLint on entire monorepo
- **Best for**: Code quality checks

#### `npm run lint:frontend`

- **Purpose**: Lint frontend code only
- **Best for**: Frontend-specific linting

#### `npm run lint:functions`

- **Purpose**: Lint functions code only
- **Best for**: Functions-specific linting

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

#### `npm run export:data`

- **Purpose**: Export emulator data
- **Best for**: Saving test data for future use

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
npm run docs:serve       # Generate and view API docs
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
