# Repository Pattern Implementation

## Overview

This document describes the repository pattern introduced for Firebase Cloud Functions services to improve testability and maintainability.

## Goals

1. **Better Testability** - Test business logic without Firestore emulator
2. **Clear Separation** - Separate data access from business logic  
3. **Easy Mocking** - Simulate edge cases and transaction failures
4. **Faster Tests** - Pure unit tests run in milliseconds vs seconds

## Architecture

```
┌─────────────────────────────────────────┐
│         HTTP/Callable Handlers          │
│    (handlers/teamHandler.ts, etc.)      │
└───────────────┬─────────────────────────┘
                │
                │ Call service methods
                ▼
┌─────────────────────────────────────────┐
│      Service Layer (Business Logic)     │
│      (services/TeamService.ts)           │
│                                          │
│  - Uses ITeamRepository interface        │
│  - Contains all business rules           │
│  - No direct Firestore dependencies      │
└───────────────┬─────────────────────────┘
                │
                │ Uses repository interface
                ▼
┌─────────────────────────────────────────┐
│      Repository Interface               │
│   (repositories/ITeamRepository.ts)      │
│                                          │
│  - Defines data operations               │
│  - Transaction context abstraction       │
└───────────────┬─────────────────────────┘
                │
                │ Two implementations:
                │
      ┌─────────┴────────┐
      ▼                  ▼
┌────────────┐    ┌─────────────┐
│ Firestore  │    │    Fake     │
│Implementation│    │Implementation│
│            │    │             │
│ - Real DB  │    │ - In-memory │
│ - Prod/Test│    │ - Unit tests│
└────────────┘    └─────────────┘
```

## Key Files Created

### Repository Interfaces

**`src/repositories/ITeamRepository.ts`**
- Defines contract for team data access
- Transaction context interface
- Read/write operations for team, system, user, progress docs

**`src/repositories/IProgressRepository.ts`**
- Defines contract for progress data access
- Transaction context for progress operations
- Get/update progress documents

### Firestore Implementations

**`src/repositories/FirestoreTeamRepository.ts`**
- Production implementation using Firestore
- Wraps all Firestore API calls
- Handles transactions properly
- Used by default in services

**`src/repositories/FirestoreProgressRepository.ts`**
- Production implementation for progress data
- Encapsulates Firestore progress operations

### Fake Implementations (Testing)

**`test/repositories/FakeTeamRepository.ts`**
- In-memory implementation for unit tests
- No Firestore dependency
- Simulates transactions
- Helper methods to seed test data

### Refactored Services

**`src/services/TeamService.ts`**
- Now accepts optional `ITeamRepository` in constructor
- Defaults to `FirestoreTeamRepository` if not provided
- All Firestore operations go through repository
- Business logic unchanged

## Usage Examples

### Production Usage (Default)

```typescript
// Automatically uses FirestoreTeamRepository
const teamService = new TeamService();

// Business logic works as before
await teamService.createTeam(userId, { password: 'secure', maximumMembers: 10 });
```

### Pure Unit Testing (No Emulator)

```typescript
import { TeamService } from '../../src/services/TeamService';
import { FakeTeamRepository } from '../repositories/FakeTeamRepository';

// Create fake repository
const fakeRepo = new FakeTeamRepository();

// Inject into service
const teamService = new TeamService(fakeRepo);

// Seed test data
fakeRepo.seedSystemDoc('user-1', {});

// Test business logic
const result = await teamService.createTeam('user-1', {
  password: 'test-password',
  maximumMembers: 10,
});

// Assert using repository state
expect(await fakeRepo.getTeamDocument(result.team)).toBeDefined();
```

### Integration Testing (With Emulator)

```typescript
// Default behavior - uses real Firestore
const teamService = new TeamService();

// Connect to emulator (via createLazyFirestore in service)
await seedDb({
  system: { 'user-1': {} },
});

// Test with real Firestore
const result = await teamService.createTeam('user-1', { maximumMembers: 5 });
```

## Benefits

### 1. Fast Unit Tests

**Before (with emulator):**
- 500-1000ms per test
- Requires Firebase emulator running
- Network calls to emulator

**After (with fake repo):**
- 1-10ms per test
- No emulator needed
- Pure in-memory operations

### 2. Easy Edge Case Testing

```typescript
// Simulate transaction conflicts
fakeRepo.onTransaction(() => {
  throw new Error('Simulated conflict');
});

// Test retry logic
await expect(service.createTeam(userId, data)).rejects.toThrow();
```

### 3. Clear Separation of Concerns

- **Services** = Business logic only
- **Repositories** = Data access only
- **Tests** = Can mock either layer

### 4. Better Type Safety

- Repository interfaces define exact contracts
- TypeScript ensures correct usage
- Easier refactoring

## Migration Guide

### For New Services

1. Define repository interface in `src/repositories/I<Service>Repository.ts`
2. Implement Firestore version in `src/repositories/Firestore<Service>Repository.ts`
3. Accept repository in service constructor with default
4. Use repository methods instead of direct Firestore calls

### For Existing Services

1. Create repository interface for current Firestore operations
2. Implement Firestore-backed repository
3. Add optional repository parameter to service constructor
4. Refactor methods to use repository
5. Update tests as needed

### For Tests

**Emulator-based tests** (integration):
- No changes needed
- Service uses default Firestore repository
- Tests work as before

**Unit tests** (new):
- Create fake repository implementation
- Inject into service constructor
- Test business logic in isolation

## Testing Strategy

### Use Emulator Tests When:
- Testing full stack integration
- Verifying Firestore rules
- Testing complex transactions
- End-to-end scenarios

### Use Unit Tests When:
- Testing business logic
- Simulating edge cases
- Fast feedback loop
- CI/CD pipelines

## Example: TeamService Unit Test

See `test/services/TeamService.unit.test.ts` for complete example:
- 13 tests
- 0 Firestore dependencies
- 43ms total execution time
- Tests all business logic paths

## Future Improvements

1. **ProgressService** - Apply same pattern
2. **TokenService** - Refactor to use repository
3. **Shared Repository** - Extract common patterns
4. **Mock Helpers** - Utilities for common test scenarios
5. **Transaction Testing** - Better simulation of conflicts

## References

- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Dependency Injection](https://en.wikipedia.org/wiki/Dependency_injection)
- [Test Doubles](https://martinfowler.com/bliki/TestDouble.html)

---

**Status:** TeamService completed  
**Next:** ProgressService implementation  
**Date:** 2025-11-13
