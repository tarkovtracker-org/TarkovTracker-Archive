# TarkovTracker Functions Testing

Test suite for Firebase Cloud Functions using Vitest and Firebase Emulator.

## Quick Start

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific file
npm test -- TokenService.test.ts

# Watch mode
npm test -- --watch
```

## Test Structure

```
test/
├── helpers/            # Test utilities and emulator setup
│   ├── emulatorSetup.ts     # Firebase emulator initialization
│   ├── dbTestUtils.ts       # Database test helpers
│   ├── httpMocks.ts         # HTTP request/response mocks
│   ├── assertionHelpers.ts  # Custom assertions
│   ├── seedData.ts          # Test data fixtures
│   └── index.ts             # Centralized exports
├── services/           # Service layer tests
├── handlers/           # HTTP handler tests
├── middleware/         # Middleware tests
├── integration/        # Integration workflow tests
├── performance/        # Performance & load tests
└── utils/             # Utility function tests
```

## Writing Tests

### Basic Pattern

```typescript
import { createTestSuite } from './helpers';

describe('MyService', () => {
  const suite = createTestSuite('MyService');

  beforeEach(suite.beforeEach);
  afterEach(suite.afterEach);

  it('should perform action', async () => {
    // Arrange - seed test data
    suite.withDatabase({
      users: {
        'user-1': { name: 'Test User', level: 5 }
      }
    });

    // Act - perform operation
    const result = await myService.doSomething('user-1');

    // Assert - verify outcome
    expect(result).toBeDefined();
  });
});
```

### Using Emulator

All tests run against Firebase Emulator for authentic behavior:

```typescript
import { admin, firestore, resetDb, seedDb } from './helpers/emulatorSetup';

// Real Firestore operations
const db = admin.firestore();
const doc = await db.collection('users').doc('user-1').get();

// Real transactions
await db.runTransaction(async (transaction) => {
  const userRef = db.collection('users').doc('user-1');
  const user = await transaction.get(userRef);
  transaction.update(userRef, { level: user.data().level + 1 });
});
```

### Common Helpers

```typescript
import {
  createMockRequest,
  createMockResponse,
  expectApiSuccess,
  expectApiError,
  expectValidToken,
  expectDocumentExists
} from './helpers';

// HTTP mocks
const req = createMockRequest({ method: 'GET', params: { id: '123' } });
const res = createMockResponse();

// Semantic assertions
expectApiSuccess(res, 200, { data: expectedData });
expectApiError(res, 404, 'Not found');
expectValidToken(tokenData);
expectDocumentExists(db, 'users/user-1');
```

## Test Categories

### Unit Tests
- Test individual functions in isolation
- Located in `services/`, `handlers/`, `middleware/`, `utils/`
- Fast execution with focused assertions

### Integration Tests
- Test complete workflows across components
- Located in `integration/`
- Use realistic scenarios with seed data

### Performance Tests
- Measure system performance under load
- Located in `performance/`
- Include benchmarks and regression detection

## Coverage Requirements

- **Statements**: 85%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 85%

## Firebase Emulator

Tests use Firebase Local Emulator Suite for authentic Firebase behavior.

### Emulator Benefits
- Real Firestore transactions and queries
- Proper FieldValue operations (increment, arrayUnion, etc.)
- True test isolation between test runs
- No mock drift issues

### Automatic Setup
Emulator starts automatically via `globalSetup.ts`. No manual configuration needed.

### Single-Threaded Execution
Tests run sequentially across files (not concurrently) to prevent emulator state conflicts. This is configured in `vitest.config.js` with `singleThread: true` and ensures deterministic test results despite slightly longer execution time. See [TESTING_GUIDE.md](./TESTING_GUIDE.md#3-single-threaded-execution) for details.

## Best Practices

1. **Use `createTestSuite()`** - Automatic cleanup and isolation
2. **Seed data with `withDatabase()`** - Scoped, declarative test data
3. **Import from `helpers/index`** - Centralized utility imports
4. **Follow AAA pattern** - Arrange-Act-Assert
5. **Test error cases** - Always test failure scenarios
6. **Keep tests focused** - One concept per test

### Do's ✅

```typescript
// ✅ Use createTestSuite for automatic cleanup
const suite = createTestSuite('MyTest');

// ✅ Use semantic assertions
expectApiSuccess(res, 200);

// ✅ Use scoped database seeding
suite.withDatabase({ users: { 'user-1': userData } });

// ✅ Test specific error messages
await expect(fn()).rejects.toThrow('Invalid token');
```

### Don'ts ❌

```typescript
// ❌ Manual mock setup (use helpers)
const mockDb = { collection: vi.fn() };

// ❌ Generic assertions
expect(result).toBeDefined();

// ❌ Hardcoded test data
const user = { id: 'abc123', name: 'Test' };

// ❌ Vague error tests
await expect(fn()).rejects.toThrow();
```

## Debugging Tests

```bash
# Run single test file
npm test -- MyService.test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Run with specific test name
npm test -- -t "should create token"

# Debug in VS Code
# Set breakpoint and use "Debug Test" CodeLens
```

## CI/CD Integration

- All tests must pass (zero tolerance)
- Coverage thresholds enforced
- Performance regression detection
- Sequential execution for reliability (single-threaded to prevent emulator conflicts)

## Troubleshooting

### Emulator Issues
```bash
# Manually start emulators
npm run emulators

# Check emulator status
curl http://localhost:8080
```

### Test Failures
1. Check emulator is running
2. Verify test isolation (no shared state)
3. Check for timing issues (use `waitFor`)
4. Review seed data setup

### Common Errors
- **"ECONNREFUSED"** - Emulator not started
- **"Document not found"** - Missing seed data
- **"Transaction conflict"** - Real concurrent access (expected behavior)

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Firebase Emulator Guide](https://firebase.google.com/docs/emulator-suite)
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Detailed testing standards

---

**Last Updated**: 2025-11-13
**Test Framework**: Vitest + Firebase Emulator (single-threaded)
**Coverage**: 85%+ maintained
