# TarkovTracker - Epic Breakdown

**Author:** Dys
**Date:** 2025-10-22
**Project Level:** 2
**Target Scale:** 100s of concurrent users

---

## Overview

This document provides the detailed epic breakdown for TarkovTracker, expanding on the high-level epic list in the [PRD](./PRD.md).

Each epic includes:

- Expanded goal and value proposition
- Complete story breakdown with user stories
- Acceptance criteria for each story
- Story sequencing and dependencies

**Epic Sequencing Principles:**

- Epic 1 establishes foundational infrastructure and initial functionality
- Subsequent epics build progressively, each delivering significant end-to-end value
- Stories within epics are vertically sliced and sequentially ordered
- No forward dependencies - each story builds only on previous work

---

## Epic 1: Frontend Performance Overhaul

**Goal:** Dramatically improve frontend performance by replacing direct calls to the Tarkov.dev API with reads from the existing Firestore cache, as outlined in the `performance-fix-implementation-plan.md` document.

### Phase 1: Items Migration

**Story 1.1: Implement and Test `useFirestoreTarkovItems()` Composable**
- **As a developer,** I want to implement and thoroughly test the `useFirestoreTarkovItems()` composable so that it reliably reads item data from Firestore and provides a consistent interface.
- **Acceptance Criteria:**
    1. The `useFirestoreTarkovItems()` composable is implemented as described in `performance-fix-implementation-plan.md`.
    2. Unit tests are created for the composable to ensure its functionality and data integrity.
    3. The composable successfully retrieves item data from the Firestore `items` collection.
    4. The composable utilizes VueFire for reactive data binding.
    5. The composable implements a singleton pattern to prevent duplicate loads.

**Story 1.2: Integrate Firestore Composable in Parallel with Feature Flag**
- **As a developer,** I want to integrate the new `useFirestoreTarkovItems()` composable into `useTarkovApi.ts` in parallel with the existing Apollo calls, controlled by a feature flag, so that we can gradually roll out and A/B test the new data source.
- **Acceptance Criteria:**
    1. `useTarkovApi.ts` is modified to conditionally use `useFirestoreTarkovItems()` or the existing Apollo query for item data, based on a feature flag.
    2. The feature flag can be toggled to switch between data sources.
    3. The existing functionality of `useTarkovApi.ts` remains intact when using either data source.

**Story 1.3: Implement Performance Metrics for A/B Testing**
- **As a developer,** I want to implement performance timing metrics for both Apollo and Firestore data loading paths so that we can accurately compare load times and validate data consistency during A/B testing.
- **Acceptance Criteria:**
    1. Timing metrics are added to measure the load time of item data from both Apollo and Firestore sources.
    2. A mechanism is in place to log or display these performance metrics.
    3. Data consistency checks are implemented to ensure that data retrieved from both sources is identical.

### Phase 2: Tasks/Maps/Traders Migration

**Story 1.4: Extend Backend Caching for Tasks, Maps, and Traders**
- **As a developer,** I want to extend the backend scheduled function (`scheduledTarkovDataFetch`) to also cache Tasks, Maps, and Traders data from the Tarkov.dev API to Firestore.
- **Acceptance Criteria:**
    1. The `scheduledTarkovDataFetch` function is updated to fetch Tasks, Maps, and Traders data.
    2. The fetched data is stored in new Firestore collections (e.g., `tasks`, `maps`, `traders`).
    3. The scheduled function completes successfully and the data is verified in Firestore.

**Story 1.5: Update Frontend to Use Cached Tasks, Maps, and Traders Data**
- **As a developer,** I want to update the frontend to read Tasks, Maps, and Traders data from the new Firestore collections so that we can further reduce direct calls to the Tarkov.dev API.
- **Acceptance Criteria:**
    1. New composables are created to read Tasks, Maps, and Traders data from Firestore.
    2. The frontend is updated to use these new composables instead of the existing Apollo queries.
    3. The application continues to function correctly with the new data source.

### Phase 3: Cleanup & Testing

**Story 1.6: Remove Apollo Client and Dependencies**
- **As a developer,** I want to remove the Apollo client and all related dependencies and files from the project so that the codebase is clean and the bundle size is reduced.
- **Acceptance Criteria:**
    1. The `@apollo/client` dependency is removed from `package.json`.
    2. The `frontend/src/plugins/apollo.ts` file is deleted.
    3. All unused GraphQL query files (e.g., `frontend/src/utils/tarkovdataquery.ts`, `frontend/src/utils/tarkovhideoutquery.ts`) are deleted.
    4. The Apollo plugin registration is removed from `frontend/src/main.ts`.
    5. The application builds and runs correctly without the Apollo client.

**Story 1.7: Document New Data Architecture**
- **As a developer,** I want to document the new data architecture so that other developers can understand how data is fetched from Firestore and used in the application.
- **Acceptance Criteria:**
    1. A new document is created in the `/docs` folder that explains the new data architecture.
    2. The document details the Firestore data flow, the role of the backend caching function, and the usage of the new VueFire composables.
    3. The document is reviewed and approved by the project owner.

**Story 1.8: Set Up Frontend Testing Framework**
- **As a developer,** I want to set up a frontend testing framework (e.g., Vitest) so that I can write unit and component tests for the new Vue composables and components.
- **Acceptance Criteria:**
    1. A testing framework (e.g., Vitest) is installed and configured for the frontend.
    2. A sample test is created for a Vue component to demonstrate that the framework is working correctly.
    3. The `test` script in the frontend's `package.json` is updated to run the tests.
    4. Initial unit tests are written for the new Firestore composables (`useFirestoreTarkovItems()`, etc.).

---

## Story Guidelines Reference

**Story Format:**

```markdown
**Story [EPIC.N]: [Story Title]**

As a [user type],
I want [goal/desire],
So that [benefit/value].

**Acceptance Criteria:**
1. [Specific testable criterion]
2. [Another specific criterion]
3. [etc.]

**Prerequisites:** [Dependencies on previous stories, if any]
```

**Story Requirements:**

- **Vertical slices** - Complete, testable functionality delivery
- **Sequential ordering** - Logical progression within epic
- **No forward dependencies** - Only depend on previous work
- **AI-agent sized** - Completable in 2-4 hour focused session
- **Value-focused** - Integrate technical enablers into value-delivering stories

---

**For implementation:** Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown.
