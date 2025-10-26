# Branch Strategy & Workflow Guide

This guide explains how we manage branches in the TarkovTracker repository to avoid merge conflicts, minimize technical debt, and ship features quickly.

## Table of Contents

- [Branch Structure](#branch-structure)
- [The Problem We're Solving](#the-problem-were-solving)
- [Recommended Workflows](#recommended-workflows)
- [Common Scenarios](#common-scenarios)
- [Best Practices](#best-practices)
- [Emergency Procedures](#emergency-procedures)

## Branch Structure

```
main (production)
  └── staging (integration/testing)
       └── feature/* (short-lived features)
       └── fix/* (bug fixes)
       └── deps/* (dependency updates)
```

### Branch Descriptions

| Branch | Purpose | Lifetime | Deploy Target |
|--------|---------|----------|---------------|
| `main` | Production code | Permanent | Production (tarkovtracker.org) |
| `staging` | Integration & testing | Permanent | Staging preview channel |
| `feature/*` | New features | < 1 week | Not deployed |
| `fix/*` | Bug fixes | < 2 days | Not deployed |
| `deps/*` | Dependency updates | < 3 days | Not deployed |

## The Problem We're Solving

### Anti-Pattern: Long-Lived Feature Branches

```
staging ─────o─────o─────o─────o
              \           \
feature/A      o───o───o───o (3 weeks old)
                \
feature/B        o───o───o (2 weeks old)
                  \
feature/C          o───o (1 week old)

Result: When merging, you get conflicts like:
- feature/A and feature/B both modified swagger.ts differently
- feature/C has old dependencies
- Nightmare merge hell 😱
```

### Solution: Short-Lived Branches + Feature Flags

```
staging ─o─o─o─o─o─o─o─o
          └┬─┘ └┬─┘ └┬─┘
         feat1 feat2 feat3
         (2 days each)

Result: Small, manageable merges 🎉
```

## Recommended Workflows

### Workflow 1: Small Feature Branches (Recommended for Most Work)

**Best for:** Bug fixes, small features, refactoring

```bash
# 1. Create branch from staging
git checkout staging
git pull origin staging
git checkout -b feature/add-trader-filters

# 2. Make changes (aim to finish in 1-3 days)
# ... code, test, commit ...

# 3. Keep branch updated (do this daily!)
git fetch origin
git merge origin/staging  # Or: git rebase origin/staging

# 4. Push and create PR
git push origin feature/add-trader-filters
# Create PR to staging via GitHub

# 5. After PR is merged, delete branch
git checkout staging
git pull origin staging
git branch -d feature/add-trader-filters
```

**Rules:**
- ✅ Merge to `staging` within 3 days
- ✅ Update from `staging` daily
- ✅ Delete branch after merge

### Workflow 2: Large Features with Feature Flags

**Best for:** Multi-week features, experimental work, breaking changes

```bash
# 1. Break feature into small increments
# Example: New map renderer
# - Step 1: Add feature flag system (1 day)
# - Step 2: Scaffold new renderer behind flag (2 days)
# - Step 3: Implement rendering logic (2 days)
# - Step 4: Add zoom/pan controls (2 days)
# - Step 5: Remove old renderer, delete flag (1 day)

# 2. For Step 1 - Add feature flag
git checkout -b feature/map-renderer-step1-flag

# In frontend/src/config/featureFlags.ts:
export const featureFlags = {
  newMapRenderer: envBool(import.meta.env.VITE_FEATURE_NEW_MAP_RENDERER),
};

# In .env.local (your machine only):
VITE_FEATURE_NEW_MAP_RENDERER=true

git commit -m "feat: add feature flag for new map renderer"
git push origin feature/map-renderer-step1-flag
# Create PR, merge quickly

# 3. For Step 2 - Scaffold behind flag
git checkout staging && git pull
git checkout -b feature/map-renderer-step2-scaffold

# In MapViewer.vue:
if (featureFlags.newMapRenderer) {
  return <NewMapRenderer />
} else {
  return <OldMapRenderer />
}

git commit -m "feat: scaffold new map renderer (behind flag)"
# Merge to staging - new code is there but not active in production!

# 4. Continue with steps 3, 4, 5...
# Each step is merged to staging within days
# Feature gradually takes shape
# When ready, flip flag to true in production

# 5. Final step - Remove flag
git checkout -b feature/map-renderer-step5-cleanup
# Remove flag check, remove old renderer
git commit -m "feat: complete map renderer migration, remove flag"
```

**Benefits:**
- ✅ Merge to staging daily/weekly
- ✅ No merge conflicts (everyone has latest code)
- ✅ Feature can be tested in staging before production
- ✅ Easy rollback (just flip flag back)

### Workflow 3: Dependency Updates

**Best for:** Weekly dependency maintenance

```bash
# 1. Create dedicated branch
git checkout staging
git pull origin staging
git checkout -b deps/weekly-updates-2025-10

# 2. Update dependencies
npm run update  # or taze -r

# 3. Test thoroughly
npm run build
npm run test:frontend
npm run lint

# 4. Commit and merge quickly
git commit -m "chore: update dependencies (week of Oct 26)"
git push origin deps/weekly-updates-2025-10
# Create PR, merge to staging

# 5. Monitor staging for issues

# 6. If stable after 24hrs, merge to main
```

## Common Scenarios

### Scenario 1: "I need to work on a feature for 2 weeks"

❌ **Don't do this:**
```bash
git checkout -b feature/big-feature
# ... 2 weeks of work ...
# Now staging has diverged massively
git merge staging  # CONFLICT HELL
```

✅ **Do this instead:**
```bash
# Break into smaller pieces with feature flags

# Week 1, Day 1-2: Add feature flag
git checkout -b feature/big-feature-part1
# Add flag, merge

# Week 1, Day 3-5: Add data layer
git checkout -b feature/big-feature-part2
# Add composables/stores behind flag, merge

# Week 2, Day 1-3: Add UI
git checkout -b feature/big-feature-part3
# Add components behind flag, merge

# Week 2, Day 4-5: Polish and enable
git checkout -b feature/big-feature-part4
# Final touches, flip flag, remove old code
```

### Scenario 2: "My branch has conflicts with staging"

```bash
# Option A: Merge staging into your branch (recommended)
git checkout your-feature-branch
git fetch origin
git merge origin/staging
# Resolve conflicts
git commit
git push

# Option B: Rebase onto staging (advanced, cleaner history)
git checkout your-feature-branch
git fetch origin
git rebase origin/staging
# Resolve conflicts as they appear
git push --force-with-lease
```

### Scenario 3: "I have 3 feature branches that are all outdated"

This is the situation you just experienced! Here's how to prevent it:

❌ **What happened:**
- `feature/bmm-api-docs` - 3 weeks old
- `feature/perf-first-load` - 2 weeks old
- `deps/baseline-updates` - 1 week old
- All diverged from `staging` independently
- Merge conflicts everywhere

✅ **Prevention strategy:**

```bash
# Daily sync ritual (do this every morning)
for branch in feature/bmm-api-docs feature/perf-first-load deps/baseline-updates; do
  git checkout $branch
  git merge origin/staging
  git push
done

# Or better: merge each to staging as soon as possible
# Use feature flags to hide incomplete work
```

### Scenario 4: "Hot fix needed in production"

```bash
# 1. Create fix branch from main
git checkout main
git pull origin main
git checkout -b fix/critical-bug

# 2. Fix the bug (minimal changes)
# ... fix ...

# 3. Merge to main AND staging
git checkout main
git merge fix/critical-bug
git push origin main

git checkout staging
git merge fix/critical-bug
git push origin staging

# 4. Deploy
npm run deploy:prod
```

## Best Practices

### 1. Keep Branches Fresh

```bash
# Add this to your daily routine
git fetch origin
git checkout staging
git pull origin staging
git checkout your-feature-branch
git merge staging
```

### 2. Commit Message Format

Use conventional commits for automatic changelog generation:

```
feat: add new map renderer
fix: resolve authentication timeout
chore: update dependencies
docs: add branch strategy guide
refactor: simplify useTaskData composable
perf: optimize map rendering
test: add tests for team management
```

### 3. PR Guidelines

- ✅ Keep PRs small (< 500 lines changed)
- ✅ One feature per PR
- ✅ Update branch before requesting review
- ✅ Add screenshots for UI changes
- ✅ Link to related issues

### 4. Code Review Checklist

- [ ] Branch is up to date with staging
- [ ] Tests pass locally
- [ ] Build succeeds
- [ ] No linting errors
- [ ] Feature works in emulators
- [ ] Feature flag used for incomplete work
- [ ] Breaking changes documented

### 5. Release Strategy

```
staging → (weekly) → main → production
```

1. **Monday-Friday:** Merge features to `staging`
2. **Friday afternoon:** Freeze `staging`, test thoroughly
3. **Monday morning:** If stable, merge `staging` to `main`
4. **Monday afternoon:** Deploy `main` to production

## Emergency Procedures

### "I accidentally committed to staging directly"

```bash
# Undo last commit but keep changes
git reset HEAD~1

# Create proper feature branch
git checkout -b feature/my-changes

# Commit properly
git commit -m "feat: my changes"

# Push new branch
git push origin feature/my-changes

# Fix staging
git checkout staging
git reset --hard origin/staging
git push --force
```

### "My PR has too many conflicts"

```bash
# Option 1: Abort and recreate
git checkout staging
git pull origin staging
git branch -D my-old-branch
git checkout -b my-new-branch
# Manually re-apply your changes
# This is often faster than resolving complex conflicts

# Option 2: Accept all theirs, then re-apply
git checkout my-branch
git merge staging --strategy-option theirs
# Now manually fix what broke
```

### "Build broke on staging"

```bash
# 1. Identify the breaking commit
git log staging --oneline -10

# 2. Revert it
git revert <commit-hash>
git push origin staging

# 3. Fix in a new branch
git checkout -b fix/broken-build
# ... fix ...
git push origin fix/broken-build
# Create PR
```

## Feature Flags Reference

See [frontend/src/config/featureFlags.ts](../../frontend/src/config/featureFlags.ts) for implementation details.

**When to use:**
- ✅ Feature needs > 3 days to complete
- ✅ Feature is experimental
- ✅ Feature has external dependencies
- ✅ Feature needs gradual rollout

**When NOT to use:**
- ❌ Simple bug fixes
- ❌ Documentation changes
- ❌ Dependency updates
- ❌ Refactoring (unless risky)

## Tools & Automation

### Useful Git Aliases

Add to your `~/.gitconfig`:

```ini
[alias]
  # Update current branch from staging
  sync = !git fetch origin && git merge origin/staging

  # List branches that are merged to staging
  merged = branch --merged staging

  # Delete branches merged to staging
  cleanup = !git branch --merged staging | grep -v "staging\\|main" | xargs git branch -d

  # Quick feature branch creation
  feat = "!f() { git checkout staging && git pull && git checkout -b feature/$1; }; f"

  # Quick fix branch creation
  hotfix = "!f() { git checkout main && git pull && git checkout -b fix/$1; }; f"
```

Usage:
```bash
git sync           # Update current branch from staging
git merged         # See what can be cleaned up
git cleanup        # Delete merged branches
git feat map-zoom  # Create feature/map-zoom from staging
git hotfix auth    # Create fix/auth from main
```

### GitHub Actions (Future Enhancement)

Ideas for automation:

```yaml
# .github/workflows/branch-health.yml
name: Branch Health Check

on:
  schedule:
    - cron: '0 9 * * MON'  # Every Monday 9am

jobs:
  check-stale-branches:
    runs-on: ubuntu-latest
    steps:
      - name: Find stale branches
        # List branches > 7 days old
        # Comment on PRs: "This branch is stale, please update"
```

## Summary

**The Golden Rules:**

1. 🚀 **Merge early, merge often** - Don't let branches live > 1 week
2. 🎌 **Use feature flags** - Ship incomplete code safely
3. 🔄 **Sync daily** - Update your branch from staging every day
4. ✂️ **Keep PRs small** - Smaller = faster review = faster merge
5. 🧹 **Clean up** - Delete merged branches immediately

**Remember:** The goal is not perfect code on the first try. The goal is steady, continuous progress with minimal conflicts.

---

**Questions?** Ask in GitHub Discussions or create an issue.
