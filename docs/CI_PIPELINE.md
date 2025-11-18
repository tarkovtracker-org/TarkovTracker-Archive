# Enforced CI/CD Pipeline Documentation

This document explains the comprehensive CI/CD pipeline that enforces quality gates for TarkovTracker.

## Pipeline Overview

The `enforced-ci.yml` workflow provides a multi-stage pipeline with strict quality enforcement:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Lint & Format │    │ Security Audit  │    │ Pre-requisite  │
│    (Fast)       │    │   (Moderate)    │    │    Checks       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐    ┌─────────────────┐
                    │ Frontend Tests  │    │Functions Tests  │
                    │ (Unit + Coverage)│    │(Unit + Coverage)│
                    └─────────────────┘    └─────────────────┘
                                 │
                    ┌─────────────────┐    ┌─────────────────┐
                    │ Build &         │    │   E2E Tests     │
                    │ Integration     │    │ (Push only)     │
                    └─────────────────┘    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Results Summary │
                    │ (PR Comments)   │
                    └─────────────────┘
```

## Pipeline Stages

### 1. Pre-requisite Checks (Parallel)

#### Lint & Format Check
- Runs ESLint across all workspaces
- Checks code formatting with Prettier
- Enforces progress store usage patterns
- **Fail-fast**: Yes

#### Security Audit
- Runs `npm audit` on all workspaces (moderate threshold)
- Checks license compliance (blocks GPL/AGPL/LGPL)
- **Fail-fast**: Yes

### 2. Testing Matrix (Parallel)

#### Frontend Tests
- **Unit Matrix**: Standard unit tests
- **Coverage Matrix**: Tests with coverage reporting
- Type checking with TypeScript
- Bundle size enforcement (max 500KB)
- **Fail-fast**: Configurable via `FAIL_FAST` env

#### Functions Tests
- **Unit Matrix**: Standard unit tests  
- **Coverage Matrix**: Tests with coverage reporting
- Type checking
- **Fail-fast**: Configurable via `FAIL_FAST` env

### 3. Integration Stage

#### Build & Integration
- Builds functions and frontend
- Validates OpenAPI documentation sync
- Generates OpenAPI specs
- **Dependencies**: All test jobs must pass

### 4. E2E Testing (Push Only)

#### E2E Tests
- Playwright end-to-end tests
- Runs only on pushes to main/develop branches
- Uploads Playwright reports on failure
- **Dependencies**: Build & integration must pass

### 5. Results Summary

#### Results Summary
- Downloads all artifacts
- Creates PR comments with status summary
- Provides overall pipeline status
- Runs even if some jobs failed (for visibility)

## Caching Strategy

- **Node modules**: Cached per workspace based on package-lock.json
- **Node.js setup**: Uses GitHub Actions built-in caching
- **Artifacts**: Coverage reports, Playwright reports, OpenAPI specs

## Fail-Fast Configuration

```yaml
env:
  FAIL_FAST: true  # Configure globally
```

- **Pre-requisite jobs**: Always fail-fast
- **Test matrices**: Configurable via environment variable
- **Integration jobs**: Wait for dependencies

## Artifacts & Reports

### Coverage Reports
- **Frontend**: `frontend-coverage` artifact
- **Functions**: `functions-coverage` artifact
- **Retention**: 30 days

### Test Reports
- **Playwright**: `playwright-report` (on failure)
- **Retention**: 30 days

### API Documentation
- **OpenAPI Spec**: `openapi-spec` artifact
- **Retention**: 30 days

## Local Parity Instructions

Run the same checks locally before pushing:

```bash
# 1. Install dependencies
npm ci

# 2. Run linting and formatting
npm run lint
npm run format:check

# 3. Run security audit
npm run security:scan

# 4. Check licenses
npx license-checker --summary

# 5. Run tests with coverage
npm run test:coverage

# 6. Build everything
npm run build

# 7. Check OpenAPI sync
npm run docs:check

# 8. (Optional) Run E2E tests locally
cd frontend && npm run test:e2e
```

### Quick Pre-push Check

```bash
# Single command to run all critical checks
npm run lint && npm run security:scan && npm run test:coverage && npm run build && npm run docs:check
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_VERSION` | `22` | Node.js version for all jobs |
| `FAIL_FAST` | `true` | Cancel matrix jobs on first failure |

## Branch Protection Rules

Recommended branch protection settings:

```yaml
# In GitHub repository settings
Required status checks:
  - Lint & Format Check
  - Security Audit
  - Frontend Tests (unit)
  - Frontend Tests (coverage)
  - Functions Tests (unit)
  - Functions Tests (coverage)
  - Build & Integration

Require branches to be up to date before merging: Yes
Require pull request reviews before merging: Yes
```

## Troubleshooting

### Common Failures

1. **Bundle Size Exceeded**
   ```bash
   # Analyze bundle locally
   cd frontend
   npm run build
   npx vite-bundle-analyzer dist/assets/index-*.js
   ```

2. **License Compliance**
   ```bash
   # Check problematic licenses
   npx license-checker --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC'
   ```

3. **Coverage Thresholds**
   ```bash
   # Check current coverage
   npm run test:coverage:frontend
   npm run test:coverage:functions
   ```

### Debugging Failed Jobs

1. Download artifacts from the workflow run
2. Check individual job logs
3. Replicate failure locally using the same commands
4. Use `act` for local GitHub Actions testing:
   ```bash
   act -j lint-and-format -P ubuntu-latest=nektos/act-environments-ubuntu:18.04
   ```

## Migration Notes

This pipeline consolidates and replaces:
- `quality-gates.yml`
- `frontend-tests.yml` 
- `functions-tests.yml`
- `dependency-audit.yml` (security portion)

The old workflows are kept for reference during transition period.
