# Story 1.1: Implement and Test `useFirestoreTarkovItems()` Composable

Status: Ready for Review

## Story

As a developer,
I want to implement and thoroughly test the `useFirestoreTarkovItems()` composable,
so that it reliably reads item data from Firestore and provides a consistent interface.

## Acceptance Criteria

1. The `useFirestoreTarkovItems()` composable is implemented as described in `performance-fix-implementation-plan.md`
2. Unit tests are created for the composable to ensure its functionality and data integrity
3. The composable successfully retrieves item data from the Firestore `items` collection
4. The composable utilizes VueFire for reactive data binding
5. The composable implements a singleton pattern to prevent duplicate loads

## Tasks / Subtasks

- [x] Create `useFirestoreTarkovItems()` composable (AC: 1, 3, 4, 5)
  - [x] Create file at `/frontend/src/composables/api/useFirestoreTarkovData.ts`
  - [x] Implement VueFire `useDocument()` integration for `/tarkovData/items`
  - [x] Implement singleton pattern to prevent duplicate listeners
  - [x] Export reactive `items` data with proper TypeScript typing
- [x] Write comprehensive unit tests (AC: 2)
  - [x] Create test file at `/frontend/src/composables/api/__tests__/useFirestoreTarkovData.spec.ts`
  - [x] Test successful data retrieval from Firestore
  - [x] Test singleton pattern (multiple calls return same instance)
  - [x] Test reactive data binding
  - [x] Test error handling for missing/malformed data
- [x] Verify implementation against all acceptance criteria (AC: 1-5)
  - [x] Run unit tests and confirm 100% pass rate (8/8 passed)
  - [x] Verify no duplicate Firestore listeners created (singleton pattern tested)
  - [x] Confirm TypeScript compilation succeeds (vue-tsc passed)

## Dev Notes

### Architecture Patterns

**Composable Pattern** [Source: architecture.md#Composable Pattern]

```typescript
export function useExample() {
  const data = ref<DataType | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function loadData() {
    loading.value = true;
    try {
      data.value = await fetchData();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, error, loadData };
}
```

**VueFire Document Binding** [Source: architecture.md#VueFire Patterns]

```typescript
import { useDocument } from 'vuefire';
import { doc } from 'firebase/firestore';

export const useExampleStore = defineStore('example', () => {
  const docRef = doc(firestore, 'collection', 'docId');
  const data = useDocument(docRef);

  return { data };
});
```

**Singleton Pattern Implementation**

- Use module-level variable to store single instance
- Return existing instance on subsequent calls
- Ensure proper cleanup on unmount

### Data Model

**Firestore Collection Path**: `/tarkovData/items`

**Expected Document Structure** [Source: architecture.md#Tarkov Data Collections]:

```typescript
{
  items: array of item objects
}
```

### Project Structure Notes

**File Location**: `/frontend/src/composables/api/useFirestoreTarkovData.ts`

- Follows existing pattern: composables organized by category (api, firebase, tasks, data, utils)
- New `/composables/api/` directory for API integration composables (Epic 1)

**Test Location**: `/frontend/src/composables/api/__tests__/useFirestoreTarkovData.spec.ts`

- Co-located testing pattern [Source: architecture.md#Testing]
- Uses Vitest framework

### Testing Standards

**Frontend Unit Tests** [Source: architecture.md#Frontend Unit Tests (Vitest)]

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

describe('ExampleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize with default state', () => {
    // test implementation
  });
});
```

### References

- [Source: docs/epics.md#Story 1.1]
- [Source: docs/architecture.md#Epic 1: Frontend Performance Overhaul]
- [Source: docs/architecture.md#Composable Pattern]
- [Source: docs/architecture.md#VueFire Patterns]
- [Source: docs/architecture.md#Testing Patterns]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

- Implementation followed architecture.md ADR-002 (Pinia + VueFire for State Management)
- Used single-document cache pattern per ADR-001 (Firestore Single-Document Caching)
- Fixed scoping issue with `stopWatch` variable by declaring it before watch callback

### Completion Notes List

**Implementation Summary:**

- Successfully implemented `useFirestoreTarkovItems()` composable using VueFire's `useDocument()` for single-document reactive binding
- Corrected collection path from `/items` to `/tarkovData/items` per architecture specification
- Implemented robust singleton pattern with module-level state management
- Created comprehensive test suite with 8 test cases covering all acceptance criteria
- All tests passing (8/8) with full coverage of success paths, error handling, and edge cases
- TypeScript compilation successful with no errors

**Key Design Decisions:**

- Used `useDocument<{ items: unknown[] }>()` instead of `useCollection()` to match single-document cache architecture
- Implemented null-safe watcher declaration to prevent TDZ errors
- Module-level singleton state ensures single Firestore listener across component lifecycle
- Proper error handling for missing data, malformed documents, and initialization failures

### File List

**Created:**

- `/frontend/src/composables/api/useFirestoreTarkovData.ts` - Main composable implementation
- `/frontend/src/composables/api/__tests__/useFirestoreTarkovData.spec.ts` - Unit test suite

**Modified:**

- `/docs/stories/story-1.1.md` - Story progress tracking

### Change Log

**2025-10-22 - Story 1.1 Implementation Complete**

- ✅ Implemented `useFirestoreTarkovItems()` composable with VueFire integration
- ✅ Created comprehensive unit test suite (8 tests, 100% pass rate)
- ✅ Verified TypeScript compilation
- ✅ All acceptance criteria met (AC 1-5)
- 📍 Ready for integration in Story 1.2 (Feature flag integration)

**2025-10-23 - Story 1.1 Recovered After Data Loss**

- ✅ Restored implementation files from conversation history
- ✅ Verified all tests still passing (8/8)
- ✅ Ready to commit to git
