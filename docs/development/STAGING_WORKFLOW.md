# Staging & Production Workflow

This document explains why we use a `staging` branch as an intermediary between feature work and `main` (production), and how to use it effectively.

## Why Staging Exists

### The Problem: Direct to Production

**Before staging branch existed:**

```bash
main (production)
  └── feature/new-feature (merge directly)
      └── 💥 Bug deployed to production
      └── 💥 Breaking change affects users
      └── 💥 No testing in production-like environment
```

**Issues we experienced:**

- Features merged to `main` without adequate testing
- Production deployments with critical bugs
- No ability to test in a production-like environment
- Difficult to test multiple features together before release

### The Solution: Staging as Integration Branch

```lua
main (production - stable, deployed)
  ↑
  └── merge weekly (after testing)
      ↑
staging (integration - deployed to preview channel)
  ↑
  └── feature/a (merge daily)
  └── feature/b (merge daily)
  └── fix/c (merge immediately)
```

**Benefits:**

- ✅ Test features in production-like environment before release
- ✅ Catch integration issues between multiple features
- ✅ Quick rollback if something breaks (just don't merge to main)
- ✅ Continuous deployment to staging without affecting users
- ✅ Time to monitor and test before production release

## Branch Purposes

### `main` - Production Branch

**Purpose:** Deployed to production (tarkovtracker.org)

**Rules:**

- ⚠️ Never commit directly to `main`
- ⚠️ Never merge feature branches directly to `main`
- ✅ Only merge from `staging` after thorough testing
- ✅ Every commit on `main` should be deployable to production
- ✅ Protected branch (requires PR + passing CI)

**Deployment:**

```bash
# Only after staging has been tested for 24-48 hours
npm run deploy:prod
```

### `staging` - Integration Branch

**Purpose:** Deployed to staging preview channel for testing

**Rules:**

- ⚠️ Avoid committing directly (use feature branches)
- ✅ Merge feature branches here first
- ✅ Can contain incomplete features (use feature flags)
- ✅ Should always build successfully
- ✅ Represents "next version" of production

**Deployment:**

```bash
# Automatically deployed on push via GitHub Actions
# Or manually:
npm run deploy:staging
```

### Feature Branches

**Purpose:** Development of new features, bug fixes, refactors

**Rules:**

- ✅ Branch from `staging`
- ✅ Merge back to `staging` (NOT `main`)
- ✅ Keep up to date with `staging` daily
- ✅ Delete after merge

## Typical Development Flow

### 1. Start New Feature

```bash
# Always branch from staging
git checkout staging
git pull origin staging
git checkout -b feature/add-hideout-tracker

# Make changes
# ... code, test, commit ...

# Keep updated from staging (do this daily!)
git fetch origin
git merge origin/staging

# When ready, create PR to staging
git push origin feature/add-hideout-tracker
```

### 2. Feature Merged to Staging

```bash
# After PR approval and merge
# GitHub Actions automatically deploys to staging

# Staging URL: https://staging--tarkovtracker-org.web.app
```

### 3. Test in Staging

**Testing checklist:**

- [ ] Feature works as expected
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Works on mobile
- [ ] Doesn't break existing features
- [ ] Firebase costs are reasonable (check console)

**How long to test?**

- Small fixes: 2-4 hours
- New features: 24-48 hours
- Breaking changes: 1 week

### 4. Promote to Production

```bash
# After testing period, merge staging to main
git checkout main
git pull origin main
git merge staging --no-ff -m "chore: release $(date +%Y-%m-%d)"
git push origin main

# Deploy to production
npm run deploy:prod

# Or create a PR from staging to main for review
```

### 5. Monitor Production

- Watch Firebase console for errors
- Check user feedback
- Monitor performance metrics
- Be ready to rollback if needed

## Release Cadence

### Recommended Schedule

**Weekly releases:**

| Day | Activity |
|-----|----------|
| **Monday** | Merge staging → main (if stable)  \nDeploy to production  \nMonitor production |
| **Tuesday-Thursday** | Merge features to staging  \nTest in staging environment |
| **Friday** | Code freeze for staging  \nFinal testing of staging  \nBug fixes only |
| **Weekend** | Staging soaks, monitor for issues |

### Hotfix Process

For critical bugs in production:

```bash
# 1. Create fix branch from main
git checkout main
git pull origin main
git checkout -b fix/critical-auth-bug

# 2. Make minimal fix
# ... fix ...
git commit -m "fix: resolve authentication timeout"

# 3. Create PR to main (not staging!)
git push origin fix/critical-auth-bug

# 4. After review, merge and deploy immediately
git checkout main
git merge fix/critical-auth-bug --no-ff
git push origin main
npm run deploy:prod

# 5. Backport to staging
git checkout staging
git merge main
git push origin staging
```

## Deployment Targets

### Production (main branch)

- **URL:** <https://tarkovtracker.org>
- **Firebase Project:** tarkovtracker-org (production)
- **Deploy Command:** `npm run deploy:prod`
- **CI/CD:** GitHub Actions on push to `main`

**Environment Variables:**

```bash
# Production values (from GitHub Secrets)
VITE_FIREBASE_PROJECT_ID=tarkovtracker-org
VITE_FEATURE_FLAGS=false  # All flags OFF in production initially
```

### Staging (staging branch)

- **URL:** <https://staging--tarkovtracker-org.web.app>
- **Firebase Project:** tarkovtracker-org (staging channel)
- **Deploy Command:** `npm run deploy:staging`
- **CI/CD:** GitHub Actions on push to `staging`
- **Expires:** 7 days (auto-refreshed on new deploys)

**Environment Variables:**

```bash
# Staging values (same project, different channel)
VITE_FIREBASE_PROJECT_ID=tarkovtracker-org
VITE_FEATURE_FLAGS=true  # Test flags ON in staging
```

### Pull Request Previews (feature branches)

- **URL:** <https://pr123--tarkovtracker-org.web.app>
- **Firebase Project:** tarkovtracker-org (preview channel)
- **Deploy Command:** Automatic via GitHub Actions
- **Expires:** 7 days after PR closes

## Feature Flag Strategy in Different Environments

### Development (local)

```bash
# .env.local
VITE_FEATURE_NEW_API_DOCS=true  # Enable everything for development
VITE_FEATURE_WEBGL_MAPS=true
VITE_FEATURE_TEAM_ANALYTICS=true
```

### Staging

```bash
# .env.staging or set in Firebase Hosting config
VITE_FEATURE_NEW_API_DOCS=true  # Test new features
VITE_FEATURE_WEBGL_MAPS=true    # Test experimental features
VITE_FEATURE_TEAM_ANALYTICS=false  # Not ready yet
```

### Production

```bash
# .env.production or set in Firebase Hosting config
VITE_FEATURE_NEW_API_DOCS=true   # Stable, enabled
VITE_FEATURE_WEBGL_MAPS=false    # Not ready for production
VITE_FEATURE_TEAM_ANALYTICS=false  # Not implemented yet
```

## Rollback Procedures

### Rollback Staging

```bash
# Find last good commit
git log staging --oneline -10

# Reset staging to that commit
git checkout staging
git reset --hard <good-commit-hash>
git push --force origin staging

# Or revert specific commit
git checkout staging
git revert <bad-commit-hash>
git push origin staging
```

### Rollback Production

#### Option 1: Revert via Git (preferred)

```bash
# Identify bad commit on main
git log main --oneline -10

# Revert it (creates new commit)
git checkout main
git revert <bad-commit-hash>
git push origin main
npm run deploy:prod
```

#### Option 2: Rollback via Firebase Console (emergency)

1. Go to Firebase Console
2. Navigate to Hosting → tarkovtracker.org
3. Click "Release history"
4. Find previous working release
5. Click "Rollback"

#### Option 3: Deploy Previous Version

```bash
# Checkout previous working version
git checkout main
git reset --hard <previous-good-commit>

# Deploy (this is destructive!)
npm run deploy:prod

# Then fix main branch
git push --force origin main  # ⚠️ Dangerous!
```

## Monitoring & Debugging

### Staging Environment

**Firebase Console:**

- Functions logs: Check for errors after deployment
- Firestore: Staging uses production data (be careful!)
- Auth: Same users as production

**Testing Tools:**

- **Swagger UI:** <https://staging--tarkovtracker-org.web.app/api-docs>
- **Emulator UI:** <http://localhost:4999> (local testing)

### Production Environment

**Monitoring:**

- Firebase Console → Functions → Logs
- Firebase Console → Hosting → Usage
- Browser DevTools → Console (check for errors)

**Alerting (future):**

- Set up Firebase Monitoring
- Configure error reporting to Slack/Discord
- Monitor API response times

## Common Questions

### Q: Can I test with production data?

**A:** Yes, but be careful:

- Staging uses the same Firebase project as production
- Changes to Firestore affect real users
- Use feature flags to prevent accidental changes
- Consider using emulators for risky changes

### Q: How do I test team features?

**A:**

```bash
# Option 1: Use emulators locally
npm run dev:full  # Includes auth, firestore, functions

# Option 2: Use staging with test account
# Create a test account in staging
# Invite test users to test team
```

### Q: What if staging breaks?

**A:**

```bash
# 1. Check Firebase Functions logs
# 2. Check browser console
# 3. Roll back to previous commit
git checkout staging
git reset --hard HEAD~1
git push --force origin staging

# 4. Fix in feature branch, re-merge
```

### Q: When should I merge to main?

**A:** When ALL of these are true:

- ✅ Staging has been stable for 24+ hours
- ✅ All features tested and working
- ✅ No critical bugs reported
- ✅ Deployment is scheduled (Monday preferred)
- ✅ Team is available to monitor

### Q: Can I skip staging and merge directly to main?

**A:** Only for:

- Documentation changes (*.md files)
- GitHub Actions workflow fixes
- Emergency hotfixes (still prefer to test in staging first)

For everything else: **NO!** Always test in staging first.

## Best Practices Summary

1. **Feature Development:**
   - Branch from `staging`
   - Merge to `staging` (never directly to `main`)
   - Keep branch updated from `staging` daily

2. **Testing:**
   - Test in staging before production
   - Use feature flags for incomplete features
   - Monitor staging for 24-48 hours

3. **Releases:**
   - Weekly releases from `staging` to `main`
   - Monday deployments preferred
   - Always have team available to monitor

4. **Hotfixes:**
   - Branch from `main`
   - Merge to `main` first (after review)
   - Backport to `staging`

5. **Rollbacks:**
   - Use `git revert` (not `git reset --hard`)
   - Document reason for rollback
   - Fix in feature branch, re-merge

---

**Remember:** Staging exists to protect production. Use it! Test thoroughly!
