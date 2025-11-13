# Testing Structure Guide

## Overview

The TarkovTracker backend test suite is organized into two distinct categories:

1. **Unit Tests** - Pure logic tests with no external dependencies
2. **Integration Tests** - Tests that use Firestore emulator and HTTP handlers

This separation provides:
- ⚡ **Faster feedback** - Unit tests run in milliseconds
- 🎯 **Focused testing** - Each category tests different concerns
- 🔧 **Better CI/CD** - Can run fast unit tests on every commit
- 📊 **Clear coverage** - Separate coverage reports for each category

## Directory Structure

```
functions/test/
├── unit/                          # Pure unit tests (NO Firestore, NO HTTP)
│   ├── services/                  # Service business logic tests
│   │   └── TeamService.unit.test.ts
│   ├── middleware/                # Middleware logic tests (if pure)
│   ├── config/                    # Configuration tests
│   └── utils/                     # Utility function tests
│
├── integration/                   # Integration tests (WITH Firestore/HTTP)
│   ├── services/                  # Service integration tests
│   │   ├── TeamService.test.ts
│   │   ├── ProgressService.test.ts
│   │   └── ...
│   ├── handlers/                  # HTTP handler tests
│   │   ├── teamHandler.test.ts
│   │   └── progressHandler.test.ts
│   ├── middleware/                # Middleware integration tests
│   │   ├── auth.test.ts
│   │   └── reauth.test.ts
│   ├── api/                       # Full API integration tests
│   │   ├── token-api.test.ts
│   │   └── team-consolidated.test.ts
│   ├── edge-cases/                # Edge case scenarios
│   │   ├── boundaryConditions.test.ts
│   │   └── dataValidation.test.ts
│   └── utils/                     # Utility integration tests
│
├── helpers/                       # Shared test utilities
│   ├── index.ts                   # Barrel export
│   ├── dbTestUtils.ts             # createTestSuite helper
│   ├── emulatorSetup.ts           # Firestore emulator setup
│   ├── httpMocks.ts               # HTTP mock helpers
│   └── ...
│
├── repositories/                  # Fake implementations for unit tests
│   └── FakeTeamRepository.ts      # In-memory team repository
│
├── setup.ts                       # Global test setup (for integration)
├── globalSetup.ts                 # Emulator startup
├── vitest.config.js               # Default config (all tests)
├── vitest.config.unit.js          # Unit test config
└── vitest.config.integration.js   # Integration test config
```

## Test Categories

### Unit Tests (`test/unit/**`)

**Characteristics:**
- ❌ No Firestore emulator
- ❌ No HTTP server
- ❌ No external services
- ✅ Use fake/mock implementations
- ✅ Test business logic in isolation
- ✅ Extremely fast (1-10ms per test)
- ✅ Can run in parallel

**When to write unit tests:**
- Testing service business logic
- Validating input/output transformations
- Testing edge cases and error handling
- Algorithm correctness
- Pure functions

**Example:**
```typescript
// test/unit/services/TeamService.unit.test.ts
import { TeamService } from '../../../src/services/TeamService';
import { FakeTeamRepository } from '../../repositories/FakeTeamRepository';

describe('TeamService - Unit Tests', () => {
  let service: TeamService;
  let fakeRepo: FakeTeamRepository;

  beforeEach(() => {
    fakeRepo = new FakeTeamRepository();
    service = new TeamService(fakeRepo); // Inject fake
  });

  it('should reject team creation for user already in team', async () => {
    fakeRepo.seedSystemDoc('user-1', { team: 'existing-team' });
    
    await expect(
      service.createTeam('user-1', { maximumMembers: 10 })
    ).rejects.toThrow('User is already in a team');
  });
});
```

### Integration Tests (`test/integration/**`)

**Characteristics:**
- ✅ Uses Firestore emulator
- ✅ Tests HTTP endpoints with Express
- ✅ Uses `createTestSuite()` helper
- ✅ Full request/response cycles
- ⚠️ Slower (100-500ms per test)
- ⚠️ Must run sequentially

**When to write integration tests:**
- Testing HTTP handlers end-to-end
- Verifying Firestore transactions
- Testing authentication flows
- Multi-service interactions
- Database query correctness

**Example:**
```typescript
// test/integration/services/TeamService.test.ts
import { createTestSuite, admin } from '../../helpers';
import { TeamService } from '../../../src/services/TeamService';

describe('TeamService - Integration Tests', () => {
  const suite = createTestSuite('TeamService');
  let service: TeamService;

  beforeEach(async () => {
    await suite.beforeEach();
    service = new TeamService(); // Uses real Firestore
    
    await suite.withDatabase({
      system: { 'user-1': {} },
    });
  });

  afterEach(suite.afterEach);

  it('should create team in Firestore', async () => {
    const result = await service.createTeam('user-1', {
      password: 'secure',
      maximumMembers: 10,
    });

    // Verify in actual Firestore emulator
    const db = admin.firestore();
    const teamDoc = await db.collection('team').doc(result.team).get();
    expect(teamDoc.exists).toBe(true);
  });
});
```

## Running Tests

### All Tests (Default)

```bash
npm test
# or
npm run test

# With coverage
npm run test:coverage
```

Runs both unit and integration tests sequentially.

### Unit Tests Only (Fast!)

```bash
npm run test:unit

# Watch mode (great for development)
npm run test:watch:unit

# With coverage
npm run test:coverage:unit
```

**Speed:** ~10-50ms total for unit tests  
**Use when:** Developing new features, rapid feedback loop

### Integration Tests Only

```bash
npm run test:integration

# Watch mode
npm run test:watch:integration

# With coverage
npm run test:coverage:integration
```

**Speed:** ~5-15 seconds (emulator startup + tests)  
**Use when:** Testing full flows, before committing

## Writing New Tests

### Decision Flow

```
Does your test need Firestore?
├─ NO  → Write Unit Test
│        Location: test/unit/[category]/
│        Use: Fake repositories, mocks
│
└─ YES → Does it test HTTP handlers?
         ├─ NO  → Integration Test (Service Level)
         │        Location: test/integration/services/
         │        Use: createTestSuite + Firestore emulator
         │
         └─ YES → Integration Test (Handler Level)
                  Location: test/integration/handlers/ or test/integration/api/
                  Use: createTestSuite + supertest
```

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyService } from '../../../src/services/MyService';
import { FakeMyRepository } from '../../repositories/FakeMyRepository';

describe('MyService - Unit Tests', () => {
  let service: MyService;
  let fakeRepo: FakeMyRepository;

  beforeEach(() => {
    fakeRepo = new FakeMyRepository();
    service = new MyService(fakeRepo);
  });

  it('should do something', () => {
    // Arrange
    fakeRepo.seedData({ /* test data */ });
    
    // Act
    const result = service.myMethod();
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSuite, admin } from '../../helpers';
import { MyService } from '../../../src/services/MyService';

describe('MyService - Integration Tests', () => {
  const suite = createTestSuite('MyService');
  let service: MyService;

  beforeEach(async () => {
    await suite.beforeEach();
    service = new MyService();
    
    await suite.withDatabase({
      collection: { 'doc-id': { /* data */ } },
    });
  });

  afterEach(suite.afterEach);

  it('should do something with Firestore', async () => {
    // Act
    await service.myMethod();
    
    // Assert - verify in Firestore
    const db = admin.firestore();
    const doc = await db.collection('collection').doc('doc-id').get();
    expect(doc.exists).toBe(true);
  });
});
```

## Import Path Guidelines

### For Unit Tests

```typescript
// From test/unit/services/MyService.unit.test.ts

// Source code (up 3 levels)
import { MyService } from '../../../src/services/MyService';

// Helpers (up 2 levels)
import { createTestSuite } from '../../helpers';

// Fake repositories (up 2 levels)
import { FakeMyRepository } from '../../repositories/FakeMyRepository';
```

### For Integration Tests

```typescript
// From test/integration/services/MyService.test.ts

// Source code (up 3 levels)
import { MyService } from '../../../src/services/MyService';

// Helpers (up 2 levels)
import { createTestSuite, admin } from '../../helpers';
```

## Configuration Files

### `vitest.config.js` (Default)
- Runs both unit and integration tests
- Uses integration test settings (sequential, emulator)
- Default for `npm test`

### `vitest.config.unit.js`
- Only runs `test/unit/**/*.test.ts`
- Parallel execution enabled
- No emulator setup
- Fast feedback

### `vitest.config.integration.js`
- Only runs `test/integration/**/*.test.ts`
- Sequential execution (prevents state conflicts)
- Emulator setup via globalSetup
- Global cleanup via setup.ts

## Coverage Reports

Coverage reports are generated in separate directories:

```
functions/coverage/
├── unit/              # Unit test coverage
├── integration/       # Integration test coverage
└── lcov-report/       # Combined coverage (default npm test)
```

View coverage:
```bash
# Unit test coverage
npm run test:coverage:unit
open coverage/unit/index.html

# Integration test coverage
npm run test:coverage:integration
open coverage/integration/index.html
```

## Best Practices

### ✅ DO

- Write unit tests for business logic
- Use integration tests for database operations
- Keep unit tests fast (<10ms each)
- Use fake repositories in unit tests
- Use `createTestSuite()` in integration tests
- Seed test data explicitly in each test
- Follow existing naming conventions

### ❌ DON'T

- Mix unit and integration test concerns
- Use Firestore in unit tests
- Skip cleanup in integration tests
- Share state between tests
- Use direct Firestore calls in unit tests
- Import from `emulatorSetup` in unit tests

## Troubleshooting

### Unit tests fail with "Cannot find module"
- Check import paths - unit tests are 2 levels deep
- Verify fake repository imports use `../../repositories/`

### Integration tests timeout
- Ensure emulator is running (`npm run test:integration`)
- Check `globalSetup.ts` is configured correctly

### Tests pass individually but fail in suite
- Integration test has state dependency
- Add explicit data seeding in `beforeEach`

### Unit tests are slow
- Check if test is using Firestore (move to integration)
- Verify no network calls or file I/O

## Migration from Old Structure

Previously, tests were in the root `test/` directory mixed together. Now:

- **Before:** `test/services/TeamService.test.ts` (mixed)
- **After:** `test/integration/services/TeamService.test.ts` (integration)
- **After:** `test/unit/services/TeamService.unit.test.ts` (unit)

All imports in moved files have been updated automatically.

## Summary

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|------------------|
| **Location** | `test/unit/**` | `test/integration/**` |
| **Speed** | ⚡ 1-10ms | 🐢 100-500ms |
| **Firestore** | ❌ No (use fakes) | ✅ Yes (emulator) |
| **HTTP** | ❌ No | ✅ Yes (with supertest) |
| **Parallel** | ✅ Yes | ❌ No (sequential) |
| **Command** | `npm run test:unit` | `npm run test:integration` |
| **Use For** | Business logic | Full flows |
| **Setup** | Fake repositories | createTestSuite + emulator |

---

**Last Updated:** 2025-11-13  
**Status:** ✅ Active structure - follow these guidelines for all new tests
