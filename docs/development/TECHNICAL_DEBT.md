# Technical Debt

**Last Updated:** 2025-11-02
**Status:** 🟢 Active Maintenance
**Priority:** High-impact architectural improvements

---

## Overview

This document tracks active technical debt items requiring architectural refactoring. Phase 1 critical fixes (TypeScript errors, console logging, untracked files) have been completed.

**Current Focus:** Breaking down monolithic files for improved maintainability and testability.

---

## Active Items

### 1. Decompose progressUtils.ts

**Priority:** 🟠 High (Biggest Impact)
**Estimated Time:** 16-20 hours
**File:** `functions/src/progress/progressUtils.ts` (601 lines, 8+ responsibilities)

**Current Issues:**
- Single file handles: progress formatting, task invalidation, dependent task updates, game mode resolution
- Functions like `invalidateTaskRecursive` (50 lines), `checkAllRequirementsMet` (70 lines)
- Tightly coupled logic, difficult to test and maintain

**Target Structure:**


```text
functions/src/progress/
├── interfaces/
│   ├── ProgressInterfaces.ts      # All progress-related types
│   └── TaskInterfaces.ts          # Task-related types
├── formatters/
│   ├── formatProgress.ts          # formatProgress() function
│   ├── formatObjectives.ts        # formatObjective() helper
│   └── initializeBaseProgress.ts  # _initializeBaseProgress()
├── validation/
│   ├── invalidateTasks.ts         # invalidateTaskRecursive()
│   ├── checkRequirements.ts       # checkAllRequirementsMet()
│   └── updateDependentTasks.ts    # _updateDependentTasks()
├── gameModes/
│   ├── extractGameModeData.ts     # extractGameModeData()
│   └── gameModeHelpers.ts         # Game mode utilities
└── index.ts                       # Re-export everything
```

**Refactoring Approach:**
1. Extract interfaces first (2 hours)
2. Extract formatters with tests (4 hours)
3. Extract validation logic (6 hours)
4. Extract game mode handling (3 hours)
5. Create index and update imports (2 hours)
6. Test after each extraction: `cd functions && npm test progress/`

**Rollback Plan:**
- Keep original file as `progressUtils.ts.backup`
- Revert with: `git checkout HEAD^ -- progress/progressUtils.ts`

---


### 2. Refactor tarkovdataquery.ts

**Priority:** 🟠 High
**Estimated Time:** 8-10 hours
**File:** `frontend/src/utils/tarkovdataquery.ts` (663 lines, single monolithic GraphQL query)

**Current Issues:**
- One massive GraphQL query (600+ lines)
- No reusability, difficult to modify
- Fragments repeated across query


**Target Structure:**

```text
frontend/src/graphql/
├── fragments/
│   ├── itemFragments.ts      # ItemData, CategoryData
│   ├── taskFragments.ts      # TaskObjectiveBasic, TaskObjectiveItem, etc.
│   ├── mapFragments.ts       # MapPositionData, TaskZoneData
│   ├── rewardFragments.ts    # StartRewards, FinishRewards, FailConditions
│   └── traderFragments.ts    # Trader data
├── queries/
│   ├── tarkovDataQuery.ts    # Main query

│   └── index.ts              # Re-export
└── index.ts                  # Re-export all
```

**Refactoring Approach:**
1. Create directory structure (1 hour)
2. Extract fragments (4 hours)
3. Rebuild main query using fragments (2 hours)
4. Update imports, maintain backward compatibility (1 hour)

**Testing:**
- Verify GraphQL query is identical (use Apollo DevTools)
- No runtime errors
- Build passes

---

### 3. Split User Store

**Priority:** 🟡 Medium
**Estimated Time:** 12-16 hours
**File:** `frontend/src/stores/user.ts` (463 lines, 30 state properties, 27 getters, 27 actions)

**Current Issues:**
- God object anti-pattern
- Handles: UI state, team state, user preferences, tips - ALL in one place
- Over 80 total members (state + getters + actions)

**Target Structure:**

```text
frontend/src/stores/
├── user/
│   ├── userPreferences.ts    # streamerMode, language, theme
│   ├── uiSettings.ts         # views, styles, visibility toggles
│   ├── teamState.ts          # teamHide, taskTeamHideAll, etc.
│   ├── tips.ts               # tip hiding logic
│   └── index.ts              # Re-export combined store
└── user.ts                   # Main store (orchestrates others)
```

**Refactoring Approach:**
1. Extract UserPreferences (3 hours)
2. Extract UISettings (4 hours)
3. Extract TeamState (4 hours)
4. Extract Tips (2 hours)
5. Create orchestrator store using Pinia's `storeToRefs()` (3 hours)
6. Update imports (backward compatible) (1 hour)

**Testing:**
- All existing functionality works
- Build passes
- No TypeScript errors
- State persistence still works


---

### 4. Extract NeededItems.vue Components

**Priority:** 🟡 Medium
**Estimated Time:** 10-12 hours
**File:** `frontend/src/pages/NeededItems.vue` (512 lines)

**Target Structure:**

```text
frontend/src/features/neededitems/
├── NeededItemsPage.vue           # Main orchestration (200 lines)
├── components/
│   ├── NeededItemsFilters.vue    # Filter controls (100 lines)
│   ├── NeededItemsGrid.vue       # Grid display logic (100 lines)

│   └── NeededItemsList.vue       # List display logic (100 lines)
└── composables/
    ├── useNeededItemsFiltering.ts
    ├── useNeededItemsViews.ts
    └── useNeededItemsVisibility.ts
```

**Refactoring Approach:**
1. Extract composables (3 hours)
2. Extract components (6 hours)
3. Rebuild main component (2 hours)
4. Update router (backward compatible) (1 hour)

**Testing:**
- All views work (grid, list, row)
- Filters work correctly
- Search works
- Settings dialog works

---

## Code Quality Guidelines

### File Size Targets

- Vue components: < 300 lines
- TypeScript modules: < 250 lines
- GraphQL queries: Use fragments, no monolithic queries

### Single Responsibility Principle

- Each file should have one clear purpose
- Extract shared logic to composables/utilities
- Use feature-based directory organization

### Testing Requirements

- Unit tests for extracted modules
- Integration tests for refactored workflows
- Regression tests to ensure no breaking changes
- Target: 80%+ code coverage

---

## Safe Console Replacement Process

If console statements need to be replaced in the future, use this AST-based approach instead of regex/sed:

### Two-Step Safe Process

**Step 1: Contextual Audit**

```bash
# Generate report of all console.* occurrences with context
rg "console\.(log|warn|error|debug)" functions/src/ \
  --context 2 \
  --json > console-audit.json

# Human-readable format
rg "console\.(log|warn|error|debug)" functions/src/ \
  --context 2 \
  --line-number \
  --heading > console-audit.txt
```

**Step 2: AST-Based Replacement**

Use `ts-morph` or TypeScript compiler API to programmatically change only real call expressions (skip literals, comments, templates):

```typescript
// Example using ts-morph
import { Project } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: 'functions/tsconfig.json',
});

const sourceFiles = project.getSourceFiles('functions/src/**/*.ts');

for (const sourceFile of sourceFiles) {
  // Find all console.log call expressions
  const callExpressions = sourceFile.getDescendantsOfKind(
    ts.SyntaxKind.CallExpression
  );

  for (const call of callExpressions) {
    const expression = call.getExpression();
    if (expression.getText().startsWith('console.')) {
      const method = expression.getText().split('.')[1];
      // Replace with logger equivalent
      expression.replaceWithText(`functions.logger.${method}`);
    }
  }

  sourceFile.save();
}
```

**Step 3: Verification**

```bash
# Confirm zero console.* in functions/src/
rg "console\." functions/src/ --stats

# Run build
npm run build:functions

# Run tests
npm run test:functions
```

**Why This Approach:**
- ✅ Skips console in strings, comments, templates
- ✅ Only modifies actual call expressions
- ✅ Preserves code structure and formatting
- ✅ Provides detailed audit trail
- ❌ Avoids unsafe regex/sed replacements

---

## Success Metrics

### Quantitative

- Build Success Rate: 100% ✅
- TypeScript Strict Mode: Passes ✅
- Lint Errors: < 10 warnings ✅
- Test Coverage: 80%+ (in progress)
- Console Statements in functions/src: 0 ✅

### Qualitative

- Files follow single responsibility principle
- No file > 400 lines (Vue) or > 300 lines (TS)
- Clear separation of concerns
- Easy to understand and modify
- Comprehensive documentation

---

## Completed Items

See [TECHNICAL_DEBT_COMPLETED.md](./TECHNICAL_DEBT_COMPLETED.md) for historical record of resolved items.

**Phase 1 Completion Summary:**
- ✅ Fixed TypeScript build errors (vite.config.ts)
- ✅ Resolved all untracked files
- ✅ Replaced console statements in functions/src (0 remaining)
- ✅ Added centralized error handling middleware
- ✅ Improved test infrastructure and coverage tooling
- ✅ Added defensive error handling to stores

---

## Resource Estimates

### By Active Item

1. progressUtils.ts decomposition: 16-20 hours
2. tarkovdataquery.ts refactoring: 8-10 hours
3. User store splitting: 12-16 hours
4. NeededItems.vue extraction: 10-12 hours

**Total Active Debt:** 46-58 hours

### Additional Considerations

- Code review/approval: 8-12 hours (4 PRs × 2-3 hours)
- Documentation updates: 4-6 hours
- Integration testing: 2-3 hours per item

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-10-27 | Technical Debt Auditor | Initial plan created |
| 2025-10-27 | Claude Code | Completed Phase 1 critical fixes |
| 2025-11-02 | Claude Code | Streamlined to active items only, moved completed to archive |
