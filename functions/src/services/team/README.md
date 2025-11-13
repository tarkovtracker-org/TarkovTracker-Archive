# Team Service Module Structure

## Overview

The Team Service has been refactored from a single 330-line file into focused modules, each handling a specific responsibility area. This improves maintainability, testability, and code clarity.

## Module Structure

```
services/
├── TeamService.ts          # Main aggregator (125 LOC)
└── team/
    ├── teamCore.ts         # Team creation (130 LOC)
    ├── teamMembership.ts   # Join/leave operations (180 LOC)
    ├── teamProgress.ts     # Progress fetching (100 LOC)
    └── README.md           # This file
```

## Modules

### 1. TeamService.ts (Aggregator)

**Purpose:** Maintains backward compatibility by providing the same public API.

**Responsibilities:**
- Instantiates the team repository (Firestore or fake for testing)
- Delegates to focused modules
- Re-exports types for consumers

**Usage:**
```typescript
import { TeamService } from './services/TeamService';

const service = new TeamService();
// Or with custom repository for testing:
const service = new TeamService(fakeRepository);

await service.createTeam(userId, { maximumMembers: 10 });
await service.joinTeam(userId, { id: teamId, password: 'secure' });
await service.leaveTeam(userId);
const progress = await service.getTeamProgress(userId, 'pvp');
```

### 2. teamCore.ts

**Purpose:** Core team operations and utilities.

**Responsibilities:**
- Team creation with validation
- Password generation
- Cooldown enforcement

**Key Functions:**
- `createTeam(repository, userId, data)` - Creates a new team
- `generateSecurePassword()` - Generates cryptographically secure passwords

**Validations:**
- User not already in a team
- Cooldown period after leaving team (5 minutes)

**Transactional Behavior:**
- Atomically creates team document
- Atomically updates user's system document
- Rollback on any error

### 3. teamMembership.ts

**Purpose:** Team membership lifecycle operations.

**Responsibilities:**
- Users joining teams
- Users leaving teams
- Team disbanding (when owner leaves)

**Key Functions:**
- `joinTeam(repository, userId, data)` - User joins existing team
- `leaveTeam(repository, userId)` - User leaves current team

**Join Validations:**
- User not already in a team
- Team exists
- Password is correct
- Team is not full

**Leave Behavior:**
- Regular member: Removed from team, team continues
- Owner: Team is disbanded, all members removed

**Transactional Behavior:**
- Atomic membership updates
- Atomic system document updates for all affected users
- Sets `lastLeftTeam` timestamp for cooldown

### 4. teamProgress.ts

**Purpose:** Fetching and formatting team member progress.

**Responsibilities:**
- Loading team member list
- Fetching progress for all members
- Formatting progress data
- Handling visibility settings

**Key Functions:**
- `getTeamProgress(repository, userId, gameMode)` - Gets progress for all team members

**Behavior:**
- Returns progress for all team members (if in a team)
- Returns progress for just the user (if not in a team)
- Respects `teamHide` visibility settings
- Filters out members with missing progress documents

## Architecture Principles

### 1. Dependency Injection

All modules accept `ITeamRepository` as first parameter:
```typescript
export async function createTeam(
  repository: ITeamRepository,
  userId: string,
  data: CreateTeamData
): Promise<CreateTeamResult>
```

**Benefits:**
- Easy to test with fake repositories
- No direct Firestore coupling
- Clear dependencies

### 2. Pure Functions

Modules export pure functions (not classes):
```typescript
// Easy to test
const result = await createTeam(fakeRepo, 'user-1', { maximumMembers: 10 });

// Easy to understand - no hidden state
const progress = await getTeamProgress(repo, userId, 'pvp');
```

### 3. Preserved Transactional Safety

All transaction behavior is preserved:
- Same atomicity guarantees
- Same rollback behavior
- Same error handling

### 4. Backward Compatible

The public API remains unchanged:
```typescript
// Before refactoring
const service = new TeamService();
await service.createTeam(userId, data);

// After refactoring - exactly the same!
const service = new TeamService();
await service.createTeam(userId, data);
```

## Testing Strategy

### Unit Tests

Test modules directly with fake repositories:

```typescript
import { createTeam } from './services/team/teamCore';
import { FakeTeamRepository } from '../test/repositories/FakeTeamRepository';

const repo = new FakeTeamRepository();
repo.seedSystemDoc('user-1', {});

const result = await createTeam(repo, 'user-1', { maximumMembers: 10 });
expect(result.team).toBeDefined();
```

### Integration Tests

Test through TeamService with real Firestore:

```typescript
import { TeamService } from './services/TeamService';
import { createTestSuite } from '../test/helpers';

const suite = createTestSuite('TeamService');
const service = new TeamService();

await suite.withDatabase({ system: { 'user-1': {} } });
const result = await service.createTeam('user-1', { maximumMembers: 10 });

// Verify in Firestore
const teamDoc = await admin.firestore().collection('team').doc(result.team).get();
expect(teamDoc.exists).toBe(true);
```

## Benefits of Refactoring

### Before
- Single file: 330 lines
- Mixed concerns
- Harder to test specific behaviors
- Less clear structure

### After
- Main aggregator: 125 lines
- teamCore: 130 lines
- teamMembership: 180 lines
- teamProgress: 100 lines

**Total: 535 lines (more due to documentation)**

**Benefits:**
- ✅ Clear responsibility boundaries
- ✅ Each module < 200 LOC
- ✅ Easier to understand and maintain
- ✅ Easier to test individual features
- ✅ Better documentation
- ✅ No breaking changes

## Migration Guide

### For Consumers

**No changes required!** The public API is identical:

```typescript
// All existing code continues to work
import { TeamService } from './services/TeamService';

const service = new TeamService();
await service.createTeam(userId, data);
await service.joinTeam(userId, { id: teamId, password: 'pass' });
await service.leaveTeam(userId);
const progress = await service.getTeamProgress(userId);
```

### For Test Authors

**Option 1: Keep using TeamService (integration tests)**
```typescript
import { TeamService } from '../../../src/services/TeamService';
// No changes needed
```

**Option 2: Test modules directly (unit tests)**
```typescript
import { createTeam } from '../../../src/services/team/teamCore';
import { FakeTeamRepository } from '../../repositories/FakeTeamRepository';

// More focused, faster tests
const repo = new FakeTeamRepository();
await createTeam(repo, userId, data);
```

### For Module Developers

To add new team operations:

1. **Determine the right module:**
   - Core operations (CRUD) → `teamCore.ts`
   - Membership (join/leave) → `teamMembership.ts`
   - Views/projections → `teamProgress.ts`

2. **Add function to module:**
   ```typescript
   export async function myNewOperation(
     repository: ITeamRepository,
     userId: string,
     data: MyData
   ): Promise<MyResult> {
     // Implementation
   }
   ```

3. **Add method to TeamService aggregator:**
   ```typescript
   async myNewOperation(userId: string, data: MyData): Promise<MyResult> {
     return myNewOperationImpl(this.repository, userId, data);
   }
   ```

4. **Add tests:**
   - Unit test: Test function directly with FakeTeamRepository
   - Integration test: Test through TeamService with real Firestore

## Future Enhancements

Potential improvements:

1. **Add team permissions module** (`teamPermissions.ts`)
   - Check if user can perform actions
   - Role-based access control
   - Owner vs member permissions

2. **Add team queries module** (`teamQueries.ts`)
   - Get team details
   - List members
   - Team statistics

3. **Add team validation module** (`teamValidation.ts`)
   - Team name validation
   - Password strength checks
   - Member limits

4. **Extract to separate package**
   - Could become `@tarkovtracker/team-service`
   - Reusable across projects
   - Separate testing

## Related Documentation

- [Repository Pattern](../../REPOSITORY_PATTERN.md)
- [Testing Structure](../../../test/TESTING_STRUCTURE.md)
- [API Types](../../types/api.ts)

---

**Last Updated:** 2025-11-13  
**Status:** ✅ Complete and production-ready
