# Technical Debt Remediation Plan

**Created:** 2025-10-27
**Priority:** Critical → High → Medium → Low
**Estimated Total Time:** 120-150 hours (6-8 weeks)
**Current Status:** 🟡 Planning Phase

---

## Executive Summary

The Tarkov Tracker codebase has **38 distinct technical debt items** across frontend (Vue 3) and backend (Firebase Functions). This plan prioritizes **build-breaking issues first**, then **architectural refactoring** for long-term maintainability.

**Current Blockers:**
- TypeScript compilation error in vite.config.ts (build fails)
- 406 console.log statements in production code
- 6 untracked files in incomplete state

---

## Phase 1: Critical Fixes (Week 1-2) 🚨
*Goal: Get builds working and eliminate security risks*

### ✅ Task 1.1: Fix TypeScript Build Error
**Priority:** 🔴 Critical (BLOCKS EVERYTHING)
**Estimated Time:** 2 hours
**Status:** ⏳ Pending

**Issue:**
```
frontend/vite.config.ts(235,3): error TS2769: No overload matches this call.
Type 'string' is not assignable to type '"pre" | "post" | undefined'
```

**Root Cause:**
```typescript
// Line 235 - INCORRECT
enforce: string

// Should be:
enforce: 'pre' | 'post' | undefined
```

**Steps:**
1. [ ] Open `frontend/vite.config.ts`
2. [ ] Locate line 235 (transform function plugin definition)
3. [ ] Change `enforce: string` to `enforce: 'pre' | 'post' | undefined`
4. [ ] Test: `cd frontend && npm run type-check`
5. [ ] Test: `npm run build:frontend`
6. [ ] Verify: No TypeScript errors

**Rollback Plan:** Git revert if build breaks

---

### ✅ Task 1.2: Resolve Untracked Files
**Priority:** 🔴 Critical
**Estimated Time:** 4-6 hours
**Status:** ⏳ Pending

**Untracked Files:**
```
?? frontend/src/utils/errorHandler.ts
?? functions/openapi/
?? functions/src/app/
?? functions/src/openapi/openapi.ts
?? functions/src/scheduled/
?? functions/src/utils/helpers.ts
```

**Decision Matrix:**

| File/Directory | Action | Reason |
|---------------|--------|--------|
| `frontend/src/utils/errorHandler.ts` | ✅ Commit | Complete, useful utility |
| `functions/openapi/` | ✅ Commit | OpenAPI generation support |
| `functions/src/app/` | ⚠️ Review | Check if needed or dead code |
| `functions/src/openapi/openapi.ts` | ✅ Commit | OpenAPI generation |
| `functions/src/scheduled/` | ⚠️ Review | Check scheduled tasks |
| `functions/src/utils/helpers.ts` | ⚠️ Review | Check if duplicate of existing helpers |

**Steps:**
1. [ ] Review each untracked file for completeness
2. [ ] Run: `git add <files-to-commit>`
3. [ ] Run: `git commit -m "feat: add error handling and OpenAPI generation utilities"`
4. [ ] For incomplete files: Move to `docs/INCOMPLETE.md` for later

**Rollback Plan:** None (these are new files)

---

### ✅ Task 1.3: Replace Console Logging with Proper Logger
**Priority:** 🔴 Critical (Security/Performance)
**Estimated Time:** 6-8 hours
**Status:** ⏳ Pending

**Issue:** 406 console.log statements across 110 files (potential data leaks)

**Strategy:**
- Use `functions.logger` for Firebase Functions
- Use custom logger for frontend

**Affected Files (Top 10):**
```
functions/src/middleware/abuseGuard.ts (3 instances)
functions/src/middleware/auth.ts (1 instance)
functions/src/middleware/reauth.ts (2 instances)
functions/src/services/ProgressService.ts (8 instances)
functions/src/services/TeamService.ts (5 instances)
functions/src/services/TokenService.ts (8 instances)
functions/src/handlers/progressHandler.ts (5 instances)
functions/src/handlers/teamHandler.ts (4 instances)
functions/src/handlers/userDeletionHandler.ts (7 instances)
functions/src/handlers/tokenHandler.ts (1 instance)
```

**Steps:**
1. [ ] **Frontend:** Ensure `logger` utility is available
   - [ ] Check `frontend/src/utils/logger.ts`
   - [ ] If missing, create with console.log wrapping

2. [ ] **Backend:** Replace in batches
   - [ ] Batch 1: All middleware files (6 files, ~12 instances)
   - [ ] Batch 2: All service files (3 files, ~21 instances)
   - [ ] Batch 3: All handler files (4 files, ~17 instances)

**Automated Script:**
```bash
# Manual - Better to do by hand to check context
find functions/src -name "*.ts" -exec grep -l "console\." {} \;
```

**Manual Replacement Pattern:**
```typescript
// BEFORE
console.log('User logged in', userId);
console.error('Failed to fetch', error);

// AFTER (Functions)
functions.logger.info('User logged in', { userId });
functions.logger.error('Failed to fetch', { error });

// AFTER (Frontend)
logger.info('User logged in', { userId });
logger.error('Failed to fetch', { error });
```

**Verification:**
- [ ] Search for remaining `console\.` statements
- [ ] Should find 0 in `functions/src/`
- [ ] Build: `npm run build:functions`

---

### ✅ Task 1.4: Centralize Error Handling
**Priority:** 🔴 Critical (Consistency)
**Estimated Time:** 10-12 hours
**Status:** ⏳ Pending

**Issue:** 46 try-catch blocks scattered across 15 files with inconsistent error handling

**Current Pattern (Bad):**
```typescript
try {
  const result = await doSomething();
  res.json(result);
} catch (error) {
  console.error(error);
  res.status(500).json({ error: 'Server error' });
}
```

**Target Pattern (Good):**
```typescript
const result = await doSomething();
res.json(result);

// Global error handler catches and formats
```

**Steps:**
1. [ ] **Create error handling middleware:**
   - [ ] `functions/src/middleware/errorHandler.ts` (already exists - enhance it)
   - [ ] Standardize error response format
   - [ ] Add correlation IDs

2. [ ] **Update handlers to use middleware:**
   - [ ] Update `progressHandler.ts`
   - [ ] Update `teamHandler.ts`
   - [ ] Update `tokenHandler.ts`
   - [ ] Update `userDeletionHandler.ts`

3. [ ] **Remove duplicate try-catch blocks:**
   - [ ] Remove try-catch from handler functions
   - [ ] Keep try-catch only for truly exceptional cases (DB connection failure, etc.)

**Error Response Format:**
```typescript
{
  success: false,
  error: {
    code: 'PROGRESS_FETCH_FAILED',
    message: 'Failed to fetch user progress',
    correlationId: 'req_123456',
    timestamp: '2025-10-27T10:00:00Z'
  }
}
```

**Verification:**
- [ ] All handlers use centralized error handling
- [ ] Try-catch blocks reduced by 50%+
- [ ] All errors have correlation IDs

---

## Phase 2: Architectural Refactoring (Week 3-6) 🏗️
*Goal: Break down monolithic files for maintainability*

### ✅ Task 2.1: Decompose progressUtils.ts
**Priority:** 🟠 High (Biggest Impact)
**Estimated Time:** 16-20 hours
**Status:** ⏳ Pending
**File:** `functions/src/progress/progressUtils.ts` (601 lines, 8+ responsibilities)

**Current Issues:**
- Single file handles: progress formatting, task invalidation, dependent task updates, game mode resolution
- Functions like `invalidateTaskRecursive` (50 lines), `checkAllRequirementsMet` (70 lines)
- Tightly coupled logic, hard to test, impossible to maintain

**Target Structure:**
```
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

**Refactoring Steps:**

#### Step 2.1.1: Create Directory & Interfaces (2 hours)
1. [ ] Create directory structure
2. [ ] Extract all interfaces to `interfaces/ProgressInterfaces.ts`:
   - [ ] `ObjectiveItem`
   - [ ] `RawObjectiveData`
   - [ ] `UserProgressData`
   - [ ] `FormattedProgress`
   - [ ] `ProgressUpdate`
   - [ ] All other progress-related types
3. [ ] Extract task interfaces to `interfaces/TaskInterfaces.ts`:
   - [ ] `TaskRequirement`
   - [ ] `TaskObjective`
   - [ ] `Task`
   - [ ] `TaskData`

#### Step 2.1.2: Extract Formatters (4 hours)
1. [ ] `formatters/formatObjectives.ts`:
   - [ ] Move `formatObjective()` function
   - [ ] Keep all objective formatting logic
   - [ ] Add comprehensive tests

2. [ ] `formatters/initializeBaseProgress.ts`:
   - [ ] Move `_initializeBaseProgress()` (rename to `initializeBaseProgress`)
   - [ ] Move `getGameEditionFromData()` helper
   - [ ] Keep game edition logic

3. [ ] `formatters/formatProgress.ts`:
   - [ ] Move `formatProgress()` function
   - [ ] Call other formatter modules
   - [ ] Orchestrate the formatting workflow

**Test after each extraction:**
```bash
cd functions && npm test progress/formatters
```

#### Step 2.1.3: Extract Validation Logic (6 hours)
1. [ ] `validation/invalidateTasks.ts`:
   - [ ] Move `invalidateTaskRecursive()` function
   - [ ] Move `_invalidateTasks()` function
   - [ ] Keep all task invalidation rules

2. [ ] `validation/checkRequirements.ts`:
   - [ ] Move `checkAllRequirementsMet()` function
   - [ ] Keep requirement checking logic

3. [ ] `validation/updateDependentTasks.ts`:
   - [ ] Move `_updateDependentTasks()` function
   - [ ] Move `_updateAlternativeTasks()` function
   - [ ] Keep dependent/alternative task logic

**Integration:**
- [ ] `validation/index.ts` exports all validation functions

#### Step 2.1.4: Extract Game Mode Handling (3 hours)
1. [ ] `gameModes/extractGameModeData.ts`:
   - [ ] Move `extractGameModeData()` function
   - [ ] Move `ProgressDataStructure` interface

2. [ ] `gameModes/gameModeHelpers.ts`:
   - [ ] Create helpers for PvP/PvE/Dual mode logic
   - [ ] Extract game mode-specific behavior

#### Step 2.1.5: Create Index & Update Imports (2 hours)
1. [ ] `progress/index.ts`:
   - [ ] Re-export all public functions
   - [ ] Maintain backward compatibility

2. [ ] **Update all imports in existing code:**
   - [ ] `handlers/progressHandler.ts`
   - [ ] Any other files using progressUtils

3. [ ] **Delete original file:**
   - [ ] Remove `functions/src/progress/progressUtils.ts`

**Testing Strategy:**
- [ ] Unit tests for each module
- [ ] Integration tests for formatProgress workflow
- [ ] Regression tests: Ensure all existing functionality works
- [ ] Performance tests: Ensure no degradation

**Rollback Plan:**
- Keep original file in `functions/src/progress/progressUtils.ts.backup`
- Can revert with: `git checkout HEAD^ -- progress/progressUtils.ts`

---

### ✅ Task 2.2: Refactor tarkovdataquery.ts
**Priority:** 🟠 High
**Estimated Time:** 8-10 hours
**Status:** ⏳ Pending
**File:** `frontend/src/utils/tarkovdataquery.ts` (662 lines, single monolithic GraphQL)

**Current Issue:**
- One massive GraphQL query (600+ lines)
- No reusability, hard to modify
- Fragments repeated across query

**Target Structure:**
```
frontend/src/graphql/
├── fragments/
│   ├── itemFragments.ts      # ItemData, CategoryData
│   ├── taskFragments.ts      # TaskObjectiveBasic, TaskObjectiveItem, etc.
│   ├── mapFragments.ts       # MapPositionData, TaskZoneData
│   ├── rewardFragments.ts    # StartRewards, FinishRewards, FailConditions
│   └── traderFragments.ts    # Trader data
├── queries/
│   ├── tarkovDataQuery.ts    # Main query
│   ├── tasksQuery.ts         # Tasks-only query (if needed)
│   └── mapsQuery.ts          # Maps-only query (if needed)
└── index.ts                  # Re-export
```

**Refactoring Steps:**

#### Step 2.2.1: Create Directory Structure (1 hour)
1. [ ] Create `frontend/src/graphql/` directory
2. [ ] Create subdirectories: `fragments/`, `queries/`

#### Step 2.2.2: Extract Fragments (4 hours)
1. [ ] `fragments/itemFragments.ts`:
   - [ ] Extract `ItemData` fragment
   - [ ] Extract `CategoryData` fragment
   - [ ] Include item-related nested fragments

2. [ ] `fragments/taskFragments.ts`:
   - [ ] Extract all `TaskObjective*` fragments
   - [ ] Extract `TaskZoneData` fragment
   - [ ] Include task requirement fragments

3. [ ] `fragments/mapFragments.ts`:
   - [ ] Extract `MapPositionData` fragment
   - [ ] Extract `MapWithPositionsData` fragment
   - [ ] Include map-related fragments

4. [ ] `fragments/rewardFragments.ts`:
   - [ ] Extract `startRewards` fragment
   - [ ] Extract `finishRewards` fragment
   - [ ] Extract `failureOutcome` fragment
   - [ ] Extract `neededKeys` fragment

#### Step 2.2.3: Rebuild Main Query (2 hours)
1. [ ] `queries/tarkovDataQuery.ts`:
   - [ ] Import all fragments
   - [ ] Rebuild main query using fragment composition
   - [ ] Maintains exact same query structure

#### Step 2.2.4: Update Imports & Delete Original (1 hour)
1. [ ] Update `tarkovdataquery.ts`:
   - [ ] Import from `../graphql/queries/tarkovDataQuery`
   - [ ] Re-export the query
   - [ ] Keep same export name for backward compatibility

2. [ ] Search for other files importing this:
   - [ ] Update imports to use new path

3. [ ] Delete original or keep as thin wrapper

**Testing:**
- [ ] Verify GraphQL query is identical (use Apollo DevTools)
- [ ] No runtime errors
- [ ] Build passes

---

### ✅ Task 2.3: Split User Store
**Priority:** 🟠 High
**Estimated Time:** 12-16 hours
**Status:** ⏳ Pending
**File:** `frontend/src/stores/user.ts` (460 lines, 30 state properties, 27 getters, 27 actions)

**Current Issues:**
- God object anti-pattern
- Handles: UI state, team state, user preferences, tips - ALL in one place
- Over 80 total members (state + getters + actions)

**Target Structure:**
```
frontend/src/stores/
├── user/
│   ├── userPreferences.ts    # streamerMode, language, theme
│   ├── uiSettings.ts         # views, styles, visibility toggles
│   ├── teamState.ts          # teamHide, taskTeamHideAll, etc.
│   ├── tips.ts               # tip hiding logic
│   └── index.ts              # Re-export combined store
├── user.ts                   # Main store (orchestrates others)
└── types.ts                  # User-related types
```

**Decomposition Plan:**

#### Step 2.3.1: Extract UserPreferences (3 hours)
**Current State (user.ts lines 9-12):**
```typescript
streamerMode: boolean;  // Move to userPreferences.ts
```

**New File: `user/userPreferences.ts`**
- [ ] `streamerMode` state
- [ ] `setStreamerMode()` action
- [ ] `getStreamerMode()` getter

#### Step 2.3.2: Extract UISettings (4 hours)
**Current State (user.ts lines 18-28):**
```typescript
taskPrimaryView: string | null;
taskMapView: string | null;
taskTraderView: string | null;
taskSecondaryView: string | null;
taskUserView: string | null;
neededTypeView: string | null;
neededitemsStyle: string | null;
hideoutPrimaryView?: string | null;
```

**New File: `user/uiSettings.ts`**
- [ ] All view-related state
- [ ] All set*View() actions
- [ ] All get*View() getters

#### Step 2.3.3: Extract TeamState (4 hours)
**Current State (user.ts lines 12-17):**
```typescript
teamHide: Record<string, boolean>;
taskTeamHideAll: boolean;
itemsTeamHideAll: boolean;
itemsTeamHideNonFIR: boolean;
itemsTeamHideHideout: boolean;
mapTeamHideAll: boolean;
```

**New File: `user/teamState.ts`**
- [ ] All teamHide state
- [ ] All set*TeamHide*() actions
- [ ] All team-related getters

#### Step 2.3.4: Extract Tips (2 hours)
**Current State (user.ts lines 9-10):**
```typescript
allTipsHidden: boolean;
hideTips: Record<string, boolean>;
```

**New File: `user/tips.ts`**
- [ ] Tip hiding state
- [ ] `hideTip()` action
- [ ] `unhideTips()` action
- [ ] `enableHideAllTips()` action
- [ ] `showTip()` getter
- [ ] `hiddenTipCount()` getter
- [ ] `hideAllTips()` getter

#### Step 2.3.5: Create Orchestrator Store (3 hours)
**New File: `user.ts` (at root)**
- [ ] Import all sub-stores
- [ ] Combine state using Pinia's `storeToRefs()`
- [ ] Re-export all state, getters, actions
- [ ] Maintain exact same API as before

**Example:**
```typescript
import { storeToRefs } from 'pinia';
import { useUserPreferencesStore } from './user/userPreferences';
import { useUISettingsStore } from './user/uiSettings';
// ... other imports

export const useUserStore = defineStore('user', () => {
  const preferences = useUserPreferencesStore();
  const ui = useUISettingsStore();
  // ... other stores

  const { streamerMode } = storeToRefs(preferences);
  const { taskPrimaryView } = storeToRefs(ui);

  return {
    // Spread all state
    ...preferences.$state,
    ...ui.$state,
    // Spread all getters
    ...preferences.$ getters,
    ...ui.$getters,
    // Spread all actions
    ...preferences.$actions,
    ...ui.$actions,
  };
});
```

#### Step 2.3.6: Update All Imports (1 hour)
1. [ ] Search for files importing `user.ts`:
   ```bash
   grep -r "from.*stores/user" frontend/src/
   ```
2. [ ] No changes needed (backward compatible)
3. [ ] Update type imports if needed

**Testing:**
- [ ] All existing functionality works
- [ ] Build passes
- [ ] No TypeScript errors
- [ ] State persistence still works

---

### ✅ Task 2.4: Extract NeededItems.vue Components
**Priority:** 🟠 High
**Estimated Time:** 10-12 hours
**Status:** ⏳ Pending
**File:** `frontend/src/pages/NeededItems.vue` (512 lines)

**Target Structure:**
```
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

**Refactoring Steps:**

#### Step 2.4.1: Extract Composables (3 hours)
1. [ ] `composables/useNeededItemsFiltering.ts`:
   - [ ] Extract filter logic from main component
   - [ ] `itemFilterNameText` reactive ref
   - [ ] `clearItemFilterNameText()` function

2. [ ] `composables/useNeededItemsViews.ts`:
   - [ ] Extract view management
   - [ ] `neededViews` array
   - [ ] `activeNeededView` reactive ref

3. [ ] `composables/useNeededItemsVisibility.ts`:
   - [ ] Extract visibility logic
   - [ ] `hideFIR`, `itemsHideAll`, etc.

#### Step 2.4.2: Extract Components (6 hours)
1. [ ] `components/NeededItemsFilters.vue`:
   - [ ] Move filter controls (lines 26-150)
   - [ ] Props: v-model for filters
   - [ ] Emits: update events

2. [ ] `components/NeededItemsGrid.vue`:
   - [ ] Move grid display logic
   - [ ] Props: items, filter settings
   - [ ] Emits: item-click events

3. [ ] `components/NeededItemsList.vue`:
   - [ ] Move list display logic
   - [ ] Props: items, filter settings
   - [ ] Emits: item-click events

#### Step 2.4.3: Rebuild Main Component (2 hours)
1. [ ] `NeededItemsPage.vue`:
   - [ ] Use all composables
   - [ ] Include all sub-components
   - [ ] Orchestrate data flow
   - [ ] Reduce from 512 lines to ~200 lines

#### Step 2.4.4: Update Router (1 hour)
1. [ ] No changes needed (same path)
2. [ ] Update route component reference

**Testing:**
- [ ] All views work (grid, list, row)
- [ ] Filters work correctly
- [ ] Search works
- [ ] Settings dialog works

---

## Phase 3: Type Safety (Week 6) ✅
*Goal: Eliminate all `any` types and strict TypeScript compliance*

### ✅ Task 3.1: Fix TarkovMap.vue Type Issues
**Priority:** 🟠 High
**Estimated Time:** 3-4 hours
**Status:** ⏳ Pending
**File:** `frontend/src/features/maps/TarkovMap.vue`

**Current Issues (4 instances of `any`):**
```typescript
// Line 145
let zoomBehavior: any = null;

// Line 603
.filter((event: any) => { ... })

// Line 611
.on('zoom', (event: any) => { ... })
```

**Fix Strategy:**
1. [ ] Install D3 types: `npm install @types/d3 @types/d3-zoom`
2. [ ] Import proper types:
   ```typescript
   import { zoom as d3Zoom, ZoomBehavior } from 'd3-zoom';
   import type { D3ZoomEvent } from 'd3-zoom';
   ```
3. [ ] Fix type declarations:
   ```typescript
   let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null;

   .filter((event: D3ZoomEvent<SVGSVGElement, unknown>) => { ... })
   .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => { ... })
   ```
4. [ ] Enable strict TypeScript checks:
   ```bash
   cd frontend && npx vue-tsc --noEmit --strict
   ```

**Testing:**
- [ ] No TypeScript errors
- [ ] D3 zoom still works
- [ ] Map renders correctly

---

### ✅ Task 3.2: Add Missing Type Definitions
**Priority:** 🟡 Medium
**Estimated Time:** 4-6 hours
**Status:** ⏳ Pending

**Files:**
- `functions/src/utils/helpers.ts`
- `functions/src/openapi/openapi.ts`

**Steps:**
1. [ ] Review untracked files for type completeness
2. [ ] Add TypeScript interfaces where missing
3. [ ] Export types for reuse
4. [ ] Fix any compilation errors

---

## Phase 4: Code Quality & Patterns (Week 7-8) ✅
*Goal: Improve maintainability and consistency*

### ✅ Task 4.1: Extract Handler Duplication
**Priority:** 🟡 Medium
**Estimated Time:** 6-8 hours
**Status:** ⏳ Pending

**Common Patterns in Handlers:**
- Lazy service initialization pattern
- Game mode resolution logic
- Error response formatting

**Target Structure:**
```
functions/src/common/
├── middleware/
│   ├── gameModeResolver.ts       # Extract game mode logic
│   ├── firebaseServiceFactory.ts # Lazy service init
│   └── standardizedResponses.ts  # Response formatting
└── types/
    └── handlerTypes.ts           # Common handler types
```

**Steps:**
1. [ ] Identify duplication patterns
2. [ ] Extract to middleware
3. [ ] Update all handlers
4. [ ] Remove duplicate code

---

### ✅ Task 4.2: Simplify State Management
**Priority:** 🟡 Medium
**Estimated Time:** 6-8 hours
**Status:** ⏳ Pending

**Issue:** `user.ts` has redundant getters

**Current Pattern:**
```typescript
state: { streamerMode: boolean }
getter: getStreamerMode() { return this.streamerMode }
```

**Simplified Pattern:**
```typescript
state: { streamerMode: boolean }
// No getter needed - use streamerMode directly
```

**Steps:**
1. [ ] Identify redundant getters
2. [ ] Remove getters
3. [ ] Update template references
4. [ ] Simplify state initialization with defaults

---

### ✅ Task 4.3: Address TODOs
**Priority:** 🟡 Low
**Estimated Time:** 2-3 hours
**Status:** ⏳ Pending

**Current TODOs:** 34 across codebase

**Strategy:**
- [ ] Review each TODO
- [ ] Fix if quick (< 15 min)
- [ ] Create GitHub issue if longer
- [ ] Add to backlog

---

## Phase 5: Testing & Documentation (Week 8) ✅
*Goal: Ensure refactored code is well-tested*

### ✅ Task 5.1: Add Unit Tests
**Priority:** 🟡 Medium
**Estimated Time:** 16-20 hours
**Status:** ⏳ Pending

**Focus Areas:**
- `progress/formatters/*` - Test all formatters
- `progress/validation/*` - Test all validation
- Composables in frontend
- Vue components

**Target Coverage:** 80%+

---

## Quick Wins Checklist ✅
*Can be completed in < 1 hour each*

- [ ] **Fix vite.config.ts** - 15 min
  - [ ] Open `frontend/vite.config.ts`
  - [ ] Line 235: Change `enforce: string` to `enforce: 'pre' | 'post' | undefined`
  - [ ] Test: `cd frontend && npm run type-check`

- [ ] **Remove console.log statements** - 30 min
  ```bash
  find functions/src -name "*.ts" -exec sed -i 's/console\.log/functions.logger.log/g' {} \;
  find functions/src -name "*.ts" -exec sed -i 's/console\.error/functions.logger.error/g' {} \;
  ```

- [ ] **Delete blank lines** - 15 min
  ```bash
  npm run format
  ```

- [ ] **Fix CSS selectors** - 5 min
  ```bash
  # Find and replace a:any-link with a.any-link
  grep -r "a:any-link" frontend/src/ --files-with-matches
  ```

---

## Success Metrics

### Quantitative
- [ ] Build Success Rate: 100% (currently failing)
- [ ] TypeScript Strict Mode: Passes
- [ ] Lint Errors: < 10 warnings
- [ ] Test Coverage: 80%+
- [ ] Console Statements: 0 in production code

### Qualitative
- [ ] Files follow single responsibility principle
- [ ] No file > 400 lines (Vue) or > 300 lines (TS)
- [ ] Clear separation of concerns
- [ ] Easy to understand and modify
- [ ] Comprehensive documentation

---

## Risk Management

### High-Risk Refactoring
**File:** `progressUtils.ts`

**Risks:**
1. Breaking existing functionality
2. Performance regression
3. Circular dependency issues

**Mitigation:**
- [ ] Comprehensive test suite before refactoring
- [ ] Keep backup of original file
- [ ] Refactor incrementally (one module at a time)
- [ ] Test after each module extraction
- [ ] Benchmark critical paths

### Build Risk
**File:** `vite.config.ts`

**Mitigation:**
- [ ] Git revert available
- [ ] Test thoroughly after each change
- [ ] Have rollback script ready

---

## Resource Estimates

### By Phase
- **Phase 1 (Critical):** 22-28 hours
- **Phase 2 (Architecture):** 46-58 hours
- **Phase 3 (Type Safety):** 7-10 hours
- **Phase 4 (Code Quality):** 14-19 hours
- **Phase 5 (Testing):** 16-20 hours
- **Total:** 105-135 hours

### By File (Top 5)
1. `progressUtils.ts` - 16-20 hours
2. `user.ts` store - 12-16 hours
3. `NeededItems.vue` - 10-12 hours
4. `tarkovdataquery.ts` - 8-10 hours
5. Error handling - 10-12 hours

---

## Rollback Procedures

### If Build Breaks
```bash
# Revert vite.config.ts changes
git checkout HEAD -- frontend/vite.config.ts

# Revert any uncommitted changes
git reset --hard HEAD
```

### If progressUtils Refactoring Breaks
```bash
# Restore original file
git checkout HEAD^ -- functions/src/progress/progressUtils.ts

# Continue development on old version
# Try again later with smaller chunks
```

### If Store Refactoring Breaks
```bash
# Revert user store changes
git checkout HEAD -- frontend/src/stores/user.ts

# Check if composables still exist, delete if needed
rm -rf frontend/src/stores/user/
```

---

## Related Documentation

- [API Contracts](../bmm-api-contracts.md)
- [Backend Architecture](../bmm-architecture-backend.md)
- [Source Tree Structure](../bmm-source-tree.md)

---

## Change Log

| Date | Author | Change | Phase |
|------|--------|--------|-------|
| 2025-10-27 | Technical Debt Auditor | Initial plan created | - |
| 2025-10-27 | Claude Code | Fixed TypeScript compilation error in vite.config.ts | Phase 1 |
| 2025-10-27 | Claude Code | Removed console.error from helpers.ts (replaced with functions.logger) | Phase 1 |
| 2025-10-27 | Claude Code | Verified: No console statements in Firebase Function handlers | Phase 1 |

---

## Notes

- This plan is iterative - adjust based on discoveries
- Some tasks can run in parallel (e.g., console.log removal + error handler)
- Test after each major change
- Keep commits small and focused
- Document any deviations from this plan

---

**END OF PLAN**
