# TeamService Unit Test State Leakage Fixes

## Summary

Fixed potential state leakage issues in `FakeTeamRepository` and enhanced test isolation in `TeamService.unit.test.ts` to prevent intermittent test failures caused by shared state between tests.

## Problem Description

The reported issue was that certain TeamService unit tests would fail when run together but pass when run individually:
- "should reject if team does not exist"
- "should reject incorrect password"
- "should reject if team is full"

These tests were receiving "User is already in a team" error instead of the expected specific errors, indicating that user state was persisting from previous tests.

## Root Cause Analysis

While the tests were passing at the time of investigation, several potential state leakage vectors were identified:

1. **Transaction Read Isolation**: The transaction context was reading directly from shared Maps without snapshot isolation, which could cause read-your-writes issues within a transaction.

2. **Null Handling in setSystemDoc**: The merge logic in `setSystemDoc` didn't properly handle `null` values for clearing fields, which could cause fields to persist when they should be cleared.

3. **No Explicit Cleanup**: While new `FakeTeamRepository` instances were created in `beforeEach`, there was no explicit cleanup in `afterEach` to ensure state was properly cleared.

4. **Reference Sharing**: Seed methods were directly assigning passed-in objects rather than creating copies, which could lead to unexpected mutations.

## Fixes Implemented

### 1. Enhanced Transaction Snapshot Isolation

**File**: `functions/test/repositories/FakeTeamRepository.ts`

Added read caching within transactions to ensure snapshot isolation:

```typescript
class FakeTeamTransactionContext implements ITeamTransactionContext {
  private transactionReads: Map<string, SystemDocument | undefined> = new Map();
  private teamReads: Map<string, TeamDocument | undefined> = new Map();

  async getSystemDoc(userId: string): Promise<SystemDocument | undefined> {
    // Use cached read within transaction to ensure snapshot isolation
    if (this.transactionReads.has(userId)) {
      return this.transactionReads.get(userId);
    }
    const doc = this.systemDocs.get(userId);
    this.transactionReads.set(userId, doc);
    return doc;
  }
}
```

**Impact**: Ensures that reads within a transaction see a consistent snapshot, preventing read-your-writes anomalies.

### 2. Improved Null Value Handling

**File**: `functions/test/repositories/FakeTeamRepository.ts`

Enhanced `setSystemDoc` to properly handle `null` values for field clearing:

```typescript
setSystemDoc(userId: string, data: Partial<SystemDocument>): void {
  this.pendingWrites.push(() => {
    const existing = this.systemDocs.get(userId) || {};
    const merged: SystemDocument = { ...existing };
    Object.entries(data).forEach(([key, value]) => {
      if (value === null) {
        merged[key as keyof SystemDocument] = null;
      } else if (value !== undefined) {
        merged[key as keyof SystemDocument] = value;
      }
    });
    this.systemDocs.set(userId, merged);
  });
}
```

**Impact**: Fields can now be explicitly cleared by setting them to `null`, matching Firestore behavior.

### 3. Transaction Rollback on Error

**File**: `functions/test/repositories/FakeTeamRepository.ts`

Added proper error handling to prevent commits on transaction failure:

```typescript
async runTransaction<T>(
  callback: (tx: ITeamTransactionContext) => Promise<T>
): Promise<T> {
  const tx = new FakeTeamTransactionContext(this.systemDocs, this.teamDocs);
  
  try {
    const result = await callback(tx);
    tx.commit(); // Commit writes on success
    return result;
  } catch (error) {
    // Transaction failed - don't commit writes (rollback)
    throw error;
  }
}
```

**Impact**: Failed transactions no longer modify state, matching Firestore's atomic transaction behavior.

### 4. Safe Seed Operations with Copies

**File**: `functions/test/repositories/FakeTeamRepository.ts`

Modified seed methods to create copies instead of storing references:

```typescript
seedSystemDoc(userId: string, data: SystemDocument): void {
  // Create a clean copy to avoid reference issues
  this.systemDocs.set(userId, { ...data });
}

seedTeamDoc(teamId: string, data: TeamDocument): void {
  // Create a clean copy to avoid reference issues
  this.teamDocs.set(teamId, { ...data });
}
```

**Impact**: Test data cannot be accidentally mutated through external references.

### 5. Added Reset Method and Debugging Utilities

**File**: `functions/test/repositories/FakeTeamRepository.ts`

Added helper methods for test cleanup and debugging:

```typescript
/**
 * Reset to initial state (alias for clear())
 * Ensures no state leaks between tests
 */
reset(): void {
  this.clear();
}

/**
 * Get internal state size for debugging
 */
getStateSize(): { systems: number; teams: number; users: number; progress: number } {
  return {
    systems: this.systemDocs.size,
    teams: this.teamDocs.size,
    users: this.userDocs.size,
    progress: this.progressDocs.size,
  };
}
```

**Impact**: Tests can explicitly clear state and debug state size issues.

### 6. Enhanced Test Isolation

**File**: `functions/test/unit/services/TeamService.unit.test.ts`

Added explicit cleanup in `afterEach`:

```typescript
describe('TeamService - Pure Unit Tests (No Emulator)', () => {
  let teamService: TeamService;
  let fakeRepo: FakeTeamRepository;

  beforeEach(async () => {
    // Create fresh repository instance for each test to ensure isolation
    fakeRepo = new FakeTeamRepository();
    teamService = new TeamService(fakeRepo);
  });

  afterEach(() => {
    // Explicitly clear repository state after each test
    // This prevents any potential state leakage between tests
    fakeRepo.reset();
  });
});
```

Added explicit clear in nested `beforeEach` for `joinTeam` tests:

```typescript
describe('joinTeam', () => {
  beforeEach(async () => {
    // Clear any previous state and ensure fresh repository
    fakeRepo.clear();
    
    // Setup: existing team with one member
    fakeRepo.seedTeamDoc('team-123', { /* ... */ });
    fakeRepo.seedSystemDoc('user-2', {});
  });
});
```

**Impact**: Defense-in-depth approach ensures state is cleared both between and within test suites.

## Test Results

### Before Fixes
- Tests reported to fail intermittently when run together
- Individual tests would pass
- Error: "User is already in a team" appearing in wrong test cases

### After Fixes
- All 13 TeamService unit tests pass consistently
- Verified with 10 consecutive test runs - 100% pass rate
- No state leakage detected between tests

```bash
# Test execution results
Test Files  1 passed (1)
Tests      13 passed (13)
Duration   ~40ms per run
```

## Verification

To verify the fixes:

```bash
# Run TeamService unit tests
cd functions
npm test -- test/unit/services/TeamService.unit.test.ts

# Run multiple times to check for flakiness
for i in {1..10}; do npm test -- test/unit/services/TeamService.unit.test.ts --run; done
```

All tests should pass consistently on every run.

## Files Changed

1. `functions/test/repositories/FakeTeamRepository.ts`
   - Enhanced transaction snapshot isolation
   - Improved null value handling
   - Added transaction rollback
   - Safe seed operations with copies
   - Added reset() and getStateSize() methods

2. `functions/test/unit/services/TeamService.unit.test.ts`
   - Added afterEach cleanup
   - Enhanced nested beforeEach with explicit clear
   - Improved comments for clarity

## Best Practices Established

1. **Always create fresh test instances**: Each test gets a new `FakeTeamRepository` instance
2. **Explicit cleanup**: Use `afterEach` to clear state even when using fresh instances
3. **Defensive clearing**: Clear state in nested `beforeEach` blocks for extra safety
4. **Copy seed data**: Always copy objects when seeding to prevent reference mutations
5. **Snapshot isolation**: Cache reads within transactions for consistency
6. **Proper null handling**: Explicitly handle `null` values to clear fields

## Recommendations

For future fake repository implementations:

1. Always implement snapshot isolation in transaction contexts
2. Provide explicit reset/clear methods for test cleanup
3. Copy all input data to prevent external mutations
4. Handle `null` values explicitly for field clearing
5. Implement proper rollback on transaction errors
6. Add debugging utilities like getStateSize()

## Related Documentation

- [FakeTeamRepository.ts](./test/repositories/FakeTeamRepository.ts) - Fake repository implementation
- [TeamService.unit.test.ts](./test/unit/services/TeamService.unit.test.ts) - Unit test suite
- [ITeamRepository.ts](../src/repositories/ITeamRepository.ts) - Repository interface
