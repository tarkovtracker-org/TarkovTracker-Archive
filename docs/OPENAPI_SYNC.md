# OpenAPI Documentation Synchronization

## Summary

## 🎯 What Is This?

Automated CI validation that ensures OpenAPI documentation stays synchronized with backend source code. **CI fails if docs are stale.**

## 🚀 Quick Commands

```bash
# Generate OpenAPI docs (after API changes)
npm run docs:generate

# Check if docs are in sync
npm run docs:check

# Build + generate + show instructions
npm run docs
```

## 📋 When to Regenerate Docs

✅ **Always regenerate after:**
- Adding new API endpoints
- Modifying request/response shapes
- Updating `@openapi` annotations
- Changing endpoint paths or HTTP methods
- Modifying query/path parameters

## 🔄 Standard Workflow

```bash
# 1. Make API changes
vim functions/src/handlers/myHandler.ts

# 2. Update @openapi annotation
# 3. Regenerate docs
npm run docs:generate

# 4. Verify changes
git diff functions/openapi/openapi.json

# 5. Commit together
git add functions/src/handlers/myHandler.ts
git add functions/openapi/
git add frontend/public/api/
git commit -m "feat: add new endpoint"

# 6. Push
git push
```

## ❌ CI Failure Fix

```bash
# If CI says "OpenAPI documentation out of sync":

# 1. Regenerate
npm run docs:generate

# 2. Commit
git add functions/openapi/ frontend/public/api/
git commit -m "docs: update OpenAPI spec"

# 3. Push
git push
```

## 📁 Files Monitored

- `functions/openapi/openapi.json` - Generated spec
- `frontend/public/api/openapi.json` - Frontend copy

## 🛠️ How It Works

```
Developer changes API
    ↓
npm run docs:generate
    ↓
Commit code + docs together
    ↓
CI runs: npm run docs:check
    ├─ In sync? ✅ Pass
    └─ Differs? ❌ Fail
```

## ✅ Best Practices

- **Regenerate immediately** after API changes
- **Commit docs with code** in same commit
- **Run docs:check** before pushing
- **Review diffs** in pull requests

## ❌ Common Mistakes

- ❌ Forgetting to regenerate after API changes
- ❌ Committing code without docs
- ❌ Manually editing openapi.json
- ❌ Ignoring CI failures

## 🔗 Related Scripts

| Script | Use Case |
|--------|----------|
| `npm run docs` | Local development |
| `npm run docs:generate` | Pre-commit |
| `npm run docs:check` | Validation |

---

**Remember:** OpenAPI docs are code. Treat them like source files that must be kept in sync!

## Overview

TarkovTracker uses OpenAPI 3.0 to document its HTTP API endpoints. The OpenAPI specification is generated from JSDoc `@openapi` annotations in the backend handler files.

**Critical requirement:** The committed OpenAPI specification files **must always be in sync** with the backend source code.

## Why This Matters

✅ **API Documentation Accuracy** - Ensures clients have correct endpoint information  
✅ **Frontend Contract Reliability** - Vue frontend depends on accurate type definitions  
✅ **Developer Experience** - Scalar UI shows up-to-date API documentation  
✅ **Breaking Change Detection** - Git diffs reveal API contract changes  
✅ **CI/CD Safety** - Prevents deploying outdated documentation  

## Files Involved

| File | Purpose |
|------|---------|
| `functions/openapi/openapi.json` | Generated OpenAPI 3.0 specification |
| `frontend/public/api/openapi.json` | Copy served by frontend for Scalar UI |
| `functions/src/handlers/**/*.ts` | Source files with `@openapi` annotations |
| `functions/src/openapi/openapi.ts` | Generator script |
| `functions/src/openapi/components.ts` | Reusable OpenAPI component schemas |

## Generation Workflow

### Manual Generation (Local Development)

```bash
# Generate OpenAPI spec and copy to frontend
npm run docs:generate

# Or build + generate + view instructions
npm run docs
```

**When to run:**
- After adding new API endpoints
- After modifying request/response shapes
- After updating `@openapi` annotations
- After changing endpoint paths or HTTP methods
- Before committing API-related changes

### Automatic Check (CI)

The CI pipeline includes an `npm run docs:check` step that:

1. Builds the TypeScript functions
2. Generates fresh OpenAPI files
3. Compares generated files with committed versions
4. **Fails the build** if files differ

This prevents merging PRs with stale documentation.

## Developer Workflow

### Scenario 1: Adding a New Endpoint

```typescript
// functions/src/handlers/myHandler.ts

/**
 * @openapi
 * /my-endpoint:
 *   get:
 *     summary: "My new endpoint"
 *     tags:
 *       - "MyFeature"
 *     responses:
 *       200:
 *         description: "Success"
 */
export const myNewEndpoint = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    res.json({ success: true });
  }
);
```

**Required steps:**

```bash
# 1. Write your handler with @openapi annotation
# 2. Generate updated OpenAPI spec
npm run docs:generate

# 3. Review the changes
git diff functions/openapi/openapi.json

# 4. Commit both code and documentation
git add functions/src/handlers/myHandler.ts
git add functions/openapi/openapi.json
git add frontend/public/api/openapi.json
git commit -m "feat: add my-endpoint API endpoint"
```

### Scenario 2: Modifying an Existing Endpoint

```typescript
// Changed request/response shape
/**
 * @openapi
 * /progress:
 *   get:
 *     parameters:
 *       - in: query
 *         name: gameMode
 *         schema:
 *           type: string
 *           enum: [pvp, pve]  # <-- Added new enum value
 */
```

**Required steps:**

```bash
# 1. Update @openapi annotation
# 2. Regenerate documentation
npm run docs:generate

# 3. Verify changes match your intent
git diff functions/openapi/openapi.json

# 4. Commit together
git add functions/src/handlers/progressHandler.ts
git add functions/openapi/openapi.json
git add frontend/public/api/openapi.json
git commit -m "feat: add pve game mode to progress endpoint"
```

### Scenario 3: CI Check Failure

If CI fails with "OpenAPI documentation out of sync":

```bash
# On your branch, regenerate documentation
npm run docs:generate

# Check what changed
git status

# Commit the updates
git add functions/openapi/ frontend/public/api/
git commit -m "docs: update OpenAPI spec"
git push
```

## CI Integration

### GitHub Actions Workflows

The OpenAPI sync check is integrated into:

**1. `functions-tests.yml`** - Runs on every push/PR
```yaml
- name: Check OpenAPI documentation sync
  run: npm run docs:check
```

**2. `quality-gates.yml`** - Runs on every PR
```yaml
- name: Check OpenAPI documentation sync
  run: npm run docs:check
```

### How the Check Works

The `npm run docs:check` script:

1. Runs `npm run docs:generate` to produce fresh OpenAPI files
2. Executes `scripts/check-openapi-sync.ts` (via `tsx`) which:
   - Verifies files exist
   - Runs `git diff --exit-code` on both OpenAPI files
   - Exits with code 0 if files are in sync
   - Exits with code 1 if files differ (failing CI)

**Exit codes:**
- `0` - Documentation is in sync ✅
- `1` - Documentation is out of sync ❌

## Troubleshooting

### Problem: "OpenAPI documentation out of sync"

**Cause:** Backend source code changed but OpenAPI wasn't regenerated.

**Solution:**
```bash
npm run docs:generate
git add functions/openapi/ frontend/public/api/
git commit -m "docs: sync OpenAPI spec"
```

### Problem: "openapi.json has uncommitted changes"

**Cause:** You regenerated docs but forgot to commit them.

**Solution:**
```bash
git add functions/openapi/openapi.json
git add frontend/public/api/openapi.json
git commit --amend --no-edit
```

### Problem: CI passes locally but fails in GitHub Actions

**Cause:** Platform-specific file formatting differences.

**Solution:**
```bash
# Ensure you're on the same Node version as CI (22.x)
nvm use 22

# Regenerate and commit
npm run docs:generate
git add functions/openapi/ frontend/public/api/
git commit -m "docs: regenerate OpenAPI with Node 22"
```

### Problem: Build fails before OpenAPI check

**Cause:** TypeScript compilation errors prevent doc generation.

**Solution:**
```bash
# Fix TypeScript errors first
npm run build:functions

# Then regenerate docs
npm run docs:generate
```

## Best Practices

### ✅ DO

- **Always regenerate docs** after modifying API handlers
- **Review OpenAPI diffs** in PRs to catch unintended changes
- **Commit docs together** with code changes in the same commit
- **Run `docs:check`** before pushing to verify sync
- **Use detailed commit messages** for API changes (e.g., "feat: add gameMode parameter to progress endpoint")

### ❌ DON'T

- **Don't skip doc generation** assuming "it's just a comment"
- **Don't manually edit** `openapi.json` files (they're generated)
- **Don't commit code** without regenerating docs
- **Don't disable** the CI check to "fix later"
- **Don't ignore** doc sync failures in CI

## OpenAPI Annotation Examples

### Basic GET Endpoint

```typescript
/**
 * @openapi
 * /health:
 *   get:
 *     summary: "Health check endpoint"
 *     tags:
 *       - "System"
 *     responses:
 *       200:
 *         description: "Service is healthy"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 */
```

### POST with Request Body

```typescript
/**
 * @openapi
 * /team/create:
 *   post:
 *     summary: "Create a new team"
 *     tags:
 *       - "Team"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TeamCreateRequest'
 *     responses:
 *       200:
 *         description: "Team created successfully"
 */
```

### Endpoint with Query Parameters

```typescript
/**
 * @openapi
 * /progress:
 *   get:
 *     summary: "Get player progress"
 *     parameters:
 *       - in: query
 *         name: gameMode
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pvp, pve]
 *     responses:
 *       200:
 *         description: "Progress retrieved"
 */
```

## Related Documentation

- **API Contracts** - `functions/API_CONTRACTS.md` - TypeScript contract types
- **OpenAPI Components** - `functions/src/openapi/components.ts` - Reusable schemas
- **Contributing Guide** - `CONTRIBUTING.md` - General contribution workflow
- **Development Guide** - `docs/DEVELOPMENT.md` - Local development setup

## Scripts Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `npm run docs` | Build + generate + show message | After API changes (local) |
| `npm run docs:generate` | Generate and copy OpenAPI files | Before committing API changes |
| `npm run docs:check` | Generate and verify sync | Before pushing (validation) |
| `npm run openapi --workspace=functions` | Just generate (no copy) | Testing generation only |

## Maintenance

### Updating the Generator

If you need to modify the OpenAPI generator:

1. Edit `functions/src/openapi/openapi.ts`
2. Test locally: `npm run docs:generate`
3. Verify output: `cat functions/openapi/openapi.json | jq`
4. Commit both generator and output

### Adding New Component Schemas

Reusable schemas go in `functions/src/openapi/components.ts`:

```typescript
/**
 * @openapi
 * components:
 *   schemas:
 *     MyNewSchema:
 *       type: object
 *       properties:
 *         field:
 *           type: string
 */
```

Then reference in handlers:
```typescript
schema:
  $ref: '#/components/schemas/MyNewSchema'
```

## Summary

🔄 **Workflow:** Code change → `docs:generate` → Commit together  
✅ **CI Check:** Ensures docs stay in sync automatically  
📝 **Best Practice:** Regenerate docs **before** committing API changes  
🚫 **Failure:** CI fails if docs are stale - regenerate and push  

**Remember:** OpenAPI documentation is code. Treat it like any other source file that must be kept in sync.

---

**Last Updated:** 2025-11-13  
**Status:** ✅ Active - CI enforcement enabled  
**Script:** `scripts/check-openapi-sync.ts`
