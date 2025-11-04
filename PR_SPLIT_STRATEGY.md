# PR #111 Split Strategy

**Total commits in integration branch**: 187 commits  
**Current situation**: Massive PR with tangled dependencies causing review/merge difficulty

## Strategy: Create 4-5 Focused PRs

This plan cherry-picks safe, independent commits into smaller PRs that can be reviewed and merged sequentially.

---

## 🟢 **PR Split 1: Documentation & Chore Updates** (SAFEST - Merge First)
**Branch**: `chore/docs-and-tooling-updates`  
**Risk Level**: ✅ **Very Low** - No functional changes  
**Files Affected**: Documentation, configs, workflows  
**Estimated Review Time**: 30 minutes

### Commits to Cherry-Pick (in order):
```bash
# Documentation updates (no code changes)
2059b70  # docs: streamline technical debt documentation
8ac5037  # docs: update action item verification steps in README
db7f9d3  # docs: update links in user guides index for accuracy
b447b3b  # docs: update documentation dates for accuracy
9a72277  # docs: update token regeneration route to use abuseGuard middleware
353313f  # docs: update API documentation reference from Swagger to Scalar UI
2dc3c75  # docs: update scripts section in README
2a0b022  # docs: enhance mermaid diagram for branch strategy
6fdc7f1  # docs: reorganize documentation into structured hierarchy
0ebfd22  # docs: enhance dependency upgrade strategy
f7950ed  # docs: add comprehensive branch strategy guides
cf40705  # docs: update development docs and translations
704b1a4  # docs: add cache verification gate
af51544  # docs: reorganize rate limit guidance

# Chore updates (configs, .gitignore, workflows)
ce4953c  # chore: update .gitignore AI Assistant files
f5d6c21  # chore: update .gitignore BMAD framework
36a1484  # chore: merge Firebase workflows from main
9cf8f55  # chore: remove redundant deployment workflows
54d1046  # chore: enhance Firebase staging deployment workflow
5e46c88  # chore: remove obsolete directories (#71)
1522a77  # chore: update markdownlint configuration
d49fa24  # chore: remove unused apollo.config.cjs
3db2fe6  # chore: update eslint and typescript-eslint dependencies

# Style/formatting (no logic changes)
5113922  # style: apply prettier formatting to utils
efab263  # chore: apply code formatting to remaining files
```

**Benefits**:
- Clean up documentation debt
- Update configs and workflows
- Zero risk to production code
- Makes subsequent PRs easier to review

---

## 🟡 **PR Split 2: Bug Fixes & UI Polish** (Low Risk - Merge Second)
**Branch**: `fix/ui-and-bug-fixes`  
**Risk Level**: ⚠️ **Low** - Isolated bug fixes  
**Dependencies**: None  
**Estimated Review Time**: 45 minutes

### Commits to Cherry-Pick:
```bash
# UI/Component fixes
dc8a2b3  # fix: move v-else directive in TaskCardList (#127)
12fc62c  # fix: correct misleading MDI font loading comment
9689e24  # fix: simplify preload link cleanup
6801dcc  # fix: tighten background preload typing
c6b7984  # fix: decouple vue lint rules

# Build/config fixes
405fe16  # fix: ensure checkout in API docs workflow
d9e9bf4  # fix: update docs:generate script path
031ea05  # fix: add missing checks permission for Firebase PR
254489f  # fix: improve Firebase PR preview deployment
967c597  # fix: resolve PR preview deployment errors
c3ec307  # fix: add missing logger utility

# Store/state fixes
d630264  # fix(user-store): correct default state and itemsTeamHideNonFIR
7a01b10  # Fix saving state property name inconsistency (#128)
7e35d9c  # Remove redundant null check in scheduleTaskProcessing (#125)
```

**Benefits**:
- Fixes real bugs
- Improves UI polish
- Independent of major features
- Can be tested in isolation

---

## 🟠 **PR Split 3: Infrastructure Refactoring** (Medium Risk - Merge Third)
**Branch**: `refactor/infrastructure-improvements`  
**Risk Level**: ⚠️⚠️ **Medium** - Structural changes but no new features  
**Dependencies**: PR Split 1 & 2 should be merged first  
**Estimated Review Time**: 90 minutes

### Commits to Cherry-Pick:
```bash
# Shared utilities and lazy loading
76c81a8  # refactor(functions): extract lazy init factory
50110f3  # refactor(errors): make async error handler generic
1e091ec  # refactor(auth): centralize dev auth detection

# CORS and security improvements
0ae358f  # fix(cors): stop reflecting headers; use static allowlist
e6fb89c  # fix(utils): gate sessionStorage fallback to dev

# Firebase optimizations
e23ce1c  # fix(firebase): optimize cache strategy for static assets
723d1dd  # chore(hosting): fix cache headers for favicons/fonts
cb00e19  # chore(lint): fix flat ESLint ignores

# Dev tooling improvements
316b1da  # feat: implement data sanitization for localStorage
c790d07  # fix(migration): preserve local state under dev auth
ebb2b74  # fix(settings): reset cached QR on token change
```

**Benefits**:
- Improves code architecture
- No new user-facing features
- Sets foundation for future work
- Enhances developer experience

---

## 🔴 **PR Split 4: Scheduled Functions & Data Management** (High Risk - Merge Fourth)
**Branch**: `feat/scheduled-functions-and-data`  
**Risk Level**: ⚠️⚠️⚠️ **High** - New backend features  
**Dependencies**: PR Split 3 must be merged (needs lazy init, utilities)  
**Estimated Review Time**: 2 hours

### Commits to Cherry-Pick:
```bash
# Scheduled functions infrastructure
56f29ae  # fix(functions): shard Firestore items under tarkovData/items
efdab6a  # fix(graphql): use GraphQL print for query serialization
a5cd555  # feat(lruCache): implement LRU cache with eviction
8d2ded8  # feat(health-check): add post-upgrade health check script

# Firestore improvements
328cdf0  # chore(firestore): add composite indexes for tokens
8fc7bb9  # docs(tokens): align rate limiter naming/imports
cda837e  # fix(error-handler): enforce function type for user ID provider
72a2ac8  # docs(rate-limits): update event schema section
81299f3  # docs(rate-limits): clarify tokenOwner field

# Feature flags
cad0c1f  # chore(features): document flags and default off
```

**Benefits**:
- Isolated backend changes
- Can be feature-flagged
- Tested independently
- Clear rollback path

---

## 🔴 **PR Split 5: Remaining Features** (Highest Risk - Merge Last)
**Branch**: `feat/remaining-features`  
**Risk Level**: ⚠️⚠️⚠️⚠️ **Very High** - New features and integrations  
**Dependencies**: All previous PRs merged  
**Estimated Review Time**: 3+ hours

### What Stays in Original PR #111:
- Token inactivity expiration system
- Rate limiting infrastructure
- Team management refactoring
- API authentication middleware changes
- Scalar UI migration
- Any commits not cherry-picked above

**Strategy**: 
1. After PRs 1-4 are merged, rebase this branch onto staging
2. The diff will be MUCH smaller and focused
3. Review will be easier with foundation already in place

---

## 📋 Execution Plan

### Step 1: Create PR Split 1 (NOW - Safest)
```bash
# Create new branch from main
git checkout main
git pull origin main
git checkout -b chore/docs-and-tooling-updates

# Cherry-pick documentation and chore commits (in order)
git cherry-pick 2059b70
git cherry-pick 8ac5037
git cherry-pick db7f9d3
git cherry-pick b447b3b
# ... continue with all commits from PR Split 1 list

# Push and create PR
git push origin chore/docs-and-tooling-updates
```

### Step 2: Create PR Split 2 (After PR1 is approved)
```bash
git checkout main
git pull origin main  # Will include merged PR1
git checkout -b fix/ui-and-bug-fixes

# Cherry-pick bug fix commits
# ... follow same pattern
```

### Step 3-5: Repeat for remaining splits

### Step 6: Rebase and Simplify Original PR
```bash
# After PRs 1-4 are merged to main
git checkout integration/reconcile-all-features
git rebase main  # Will drop already-merged commits
git push --force-with-lease origin integration/reconcile-all-features
```

---

## 🎯 Expected Results

**Before Split**:
- 1 massive PR with 187 commits
- Difficult to review
- High merge conflict risk
- Unclear what's safe vs. risky

**After Split**:
- PR #1: ~30 commits (docs/chore) - **MERGED** ✅
- PR #2: ~15 commits (bug fixes) - **MERGED** ✅
- PR #3: ~20 commits (refactoring) - **MERGED** ✅
- PR #4: ~15 commits (scheduled functions) - **MERGED** ✅
- PR #111 (original): ~100 commits (new features) - **UNDER REVIEW**

**Benefits**:
1. **Reduced Risk**: Each PR is testable in isolation
2. **Faster Reviews**: Smaller PRs get reviewed quickly
3. **Incremental Progress**: Merge value continuously
4. **Easier Rollback**: If something breaks, know exactly what
5. **Better Testing**: Can test each layer independently
6. **Clearer History**: Git history tells a clear story

---

## ⚠️ Important Notes

1. **Cherry-pick Order Matters**: Some commits depend on others
2. **Test Each PR**: Run `npm run build && npm test` after each cherry-pick
3. **Handle Conflicts**: Some commits may conflict - resolve carefully
4. **Update PR Descriptions**: Each new PR should explain its scope clearly
5. **Original PR #111**: Keep it open but update description to reflect what's left

---

## 🚀 Next Steps

**Immediate Action** (Choose one):

A. **Conservative Approach**: 
   - Start with PR Split 1 (docs/chore only)
   - Merge it
   - Reassess before continuing

B. **Moderate Approach**:
   - Create PR Splits 1, 2, and 3 simultaneously
   - Get all reviewed in parallel
   - Merge sequentially (1→2→3)

C. **Aggressive Approach**:
   - Create all 4 split PRs now
   - Review in parallel
   - Merge in sequence
   - Original PR #111 becomes much simpler

**Recommendation**: Start with **Option B** (Moderate Approach)
- Creates immediate progress
- Reduces risk incrementally
- Keeps momentum without overwhelming reviewers

---

## 📞 Questions to Answer

Before starting, decide:

1. **Do you want me to generate the git commands** for each cherry-pick?
2. **Should I create shell scripts** to automate the cherry-picking?
3. **Want me to identify potential conflicts** before you start?
4. **Should I update PR #111's description** to reflect the new strategy?

Let me know how you want to proceed! 🎯
