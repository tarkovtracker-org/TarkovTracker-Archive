# OpenAPI Sync Check - Quick Reference

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

## 📚 Full Documentation

- **Complete Guide:** `docs/OPENAPI_SYNC.md`
- **Implementation:** `OPENAPI_SYNC_CHECK_SUMMARY.md`
- **Contributing:** `CONTRIBUTING.md`

## 🔗 Related Scripts

| Script | Use Case |
|--------|----------|
| `npm run docs` | Local development |
| `npm run docs:generate` | Pre-commit |
| `npm run docs:check` | Validation |

---

**Remember:** OpenAPI docs are code. Treat them like source files that must be kept in sync!
