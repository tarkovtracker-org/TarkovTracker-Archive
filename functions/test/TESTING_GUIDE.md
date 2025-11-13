# Testing Guide & Standards

Comprehensive testing standards for TarkovTracker Functions.

## Core Principles

### 1. Test Isolation
- Each test must be completely independent
- Use `createTestSuite()` for automatic cleanup
- Never share state between tests
- Reset database between tests

### 2. Deterministic Results
- Tests must produce same results every time
- No time-based assertions (use mock time)
- Clean up after each test
- Use Firebase Emulator for consistent behavior

### 3. Single-Threaded Execution
- **Tests run sequentially across files** (file-level concurrency disabled)
- **Configured in vitest.config.js**: `singleThread: true`, `concurrent: false`
- **Why**: Tests share Firebase emulator state (Firestore and Auth), which causes race conditions when run concurrently
- **Trade-off**: Tests take longer to run (~5-6s for full suite) but results are consistent and reliable
- **Future**: This may be revisited if we implement per-test database namespacing or full service mocking
- **Note**: Tests within the same file may still run concurrently unless `describe.sequential()` is used

### 4. Clear Intent
- Descriptive test names explaining what and why
- Follow Arrange-Act-Assert pattern
- One assertion per concept
- Test both success and failure paths

## Test Structure

### Basic Template

```typescript
import { createTestSuite } from './helpers';

describe('ComponentName', () => {
  const suite = createTestSuite('ComponentName');

  beforeEach(suite.beforeEach);
  afterEach(suite.afterEach);

  it('should perform expected behavior when condition is met', async () => {
    // Arrange - set up test data
    suite.withDatabase({
      collection: { 'doc-id': { field: 'value' } }
    });

    // Act - execute the operation
    const result = await component.method('doc-id');

    // Assert - verify the outcome
    expect(result).toEqual(expectedValue);
  });
});
```

### Emulator-Based Testing

```typescript
import { admin, resetDb, seedDb } from './helpers/emulatorSetup';

describe('Service with real Firestore', () => {
  const db = admin.firestore();

  beforeEach(async () => {
    await resetDb(); // Clear emulator state
  });

  it('should handle real transactions', async () => {
    // Seed initial data
    await db.collection('users').doc('user-1').set({ level: 5 });

    // Perform transaction
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc('user-1');
      const user = await transaction.get(userRef);
      transaction.update(userRef, {
        level: user.data().level + 1
      });
    });

    // Verify transaction result
    const updated = await db.collection('users').doc('user-1').get();
    expect(updated.data().level).toBe(6);
  });
});
```

## Cleanup Architecture

### Global Firestore Cleanup

All tests benefit from automatic Firestore cleanup via a global `afterEach` hook configured in `test/setup.ts`:

```typescript
// test/setup.ts
afterEach(async () => {
  await resetDb();  // Clears Firestore after each test
});
```

**Hook Lifecycle:**
1. `beforeEach` (test file) - Seeds test data, resets mocks
2. Test executes
3. `afterEach` (test file) - Custom cleanup (if needed)
4. `afterEach` (global) - **Clears Firestore** ← Automatic
5. Next test starts with clean state

### Defense-in-Depth Strategy

Multiple cleanup layers ensure test isolation:

1. **Global afterEach hook** - Catches all tests automatically
2. **createTestSuite.beforeEach** - Resets Firestore before test runs
3. **Test-specific afterEach** - Custom cleanup when needed (caches, etc.)

This prevents state leakage even if developers forget explicit cleanup.

### Cleanup Patterns

```typescript
// ✅ Pattern 1: Using createTestSuite (Recommended)
// Global cleanup handles Firestore automatically
describe('MyService', () => {
  const suite = createTestSuite('MyService');
  beforeEach(suite.beforeEach);
  afterEach(suite.afterEach);
  // No manual resetDb needed
});

// ✅ Pattern 2: Manual resetDb in beforeEach (optional but safe)
describe('DataService', () => {
  beforeEach(async () => {
    await resetDb();  // Extra safety
  });
  // Global hook still cleans up after
});

// ✅ Pattern 3: Tests with special cleanup
describe('CachedService', () => {
  afterEach(async () => {
    clearCache();  // Runs before global cleanup
  });
});
```

**Performance Note:** Global cleanup adds ~50ms per test but ensures deterministic results and reliable CI/CD.

## Test Categories

### Unit Tests
**Purpose**: Test individual functions in isolation

```typescript
describe('ValidationService', () => {
  it('should validate token format', () => {
    const valid = validationService.isValidToken('token-123');
    expect(valid).toBe(true);
  });

  it('should reject invalid format', () => {
    const valid = validationService.isValidToken('invalid');
    expect(valid).toBe(false);
  });
});
```

### Integration Tests
**Purpose**: Test component interactions and workflows

```typescript
describe('Token Creation Workflow', () => {
  it('should create token and update user record', async () => {
    // Create token
    const token = await tokenService.create('user-1', { name: 'test' });

    // Verify token created
    expect(token.id).toBeDefined();

    // Verify user record updated
    const user = await userService.get('user-1');
    expect(user.tokens).toContain(token.id);
  });
});
```

### Performance Tests
**Purpose**: Measure and validate performance characteristics

```typescript
describe('Performance Tests', () => {
  it('should handle bulk operations within time limit', async () => {
    const start = Date.now();

    await service.bulkCreate(100);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000); // 5 seconds
  });
});
```

## Assertion Patterns

### Specific vs Generic

```typescript
// ✅ Specific - Test exact behavior
expect(result.id).toBe('expected-id');
expect(mockFn).toHaveBeenCalledTimes(1);
expect(mockFn).toHaveBeenCalledWith('exact', 'args');

// ❌ Generic - Too vague
expect(result).toBeDefined();
expect(mockFn).toHaveBeenCalled();
```

### Error Testing

```typescript
// ✅ Test specific error message
await expect(service.method()).rejects.toThrow('Invalid token');

// ✅ Test error type
await expect(service.method()).rejects.toThrow(ValidationError);

// ✅ Test error properties
await expect(service.method()).rejects.toMatchObject({
  code: 'auth/invalid-token',
  message: expect.stringContaining('invalid')
});

// ❌ Too generic
await expect(service.method()).rejects.toThrow();
```

### API Response Testing

```typescript
import { expectApiSuccess, expectApiError } from './helpers';

// ✅ Use semantic helpers
expectApiSuccess(res, 200, { data: expectedData });
expectApiError(res, 404, 'Resource not found');

// ❌ Manual status checking
expect(res.status).toHaveBeenCalledWith(200);
expect(res.json).toHaveBeenCalled();
```

## Database Testing

### Seeding Data

```typescript
// ✅ Use suite.withDatabase for scoped seeding
suite.withDatabase({
  users: {
    'user-1': { name: 'Alice', level: 5 },
    'user-2': { name: 'Bob', level: 10 }
  },
  tokens: {
    'token-1': { owner: 'user-1', permissions: ['read'] }
  }
});

// ✅ Use seedDb for manual seeding
await seedDb({
  users: { 'user-1': userData }
});

// ❌ Manual document creation
await db.collection('users').doc('user-1').set(userData);
```

### Document Assertions

```typescript
import { expectDocumentExists, expectDocumentNotExists } from './helpers';

// ✅ Use assertion helpers
await expectDocumentExists(db, 'users/user-1');
await expectDocumentNotExists(db, 'users/deleted-user');

// ❌ Manual existence checking
const doc = await db.collection('users').doc('user-1').get();
expect(doc.exists).toBe(true);
```

## HTTP Testing

### Request/Response Mocks

```typescript
import { createMockRequest, createMockResponse } from './helpers';

it('should handle GET request', async () => {
  // Create mocks
  const req = createMockRequest({
    method: 'GET',
    params: { id: '123' },
    headers: { authorization: 'Bearer token-123' }
  });
  const res = createMockResponse();

  // Execute handler
  await handler(req, res);

  // Verify response
  expectApiSuccess(res, 200, { id: '123', data: expectedData });
});
```

### Middleware Testing

```typescript
describe('Auth Middleware', () => {
  it('should call next() for valid token', async () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer valid-token' }
    });
    const res = createMockResponse();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 for missing token', async () => {
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expectApiError(res, 401, 'No authorization header');
    expect(next).not.toHaveBeenCalled();
  });
});
```

## Security Testing

### Authentication Tests

```typescript
describe('Authentication', () => {
  it('should reject requests without token', async () => {
    const req = createMockRequest({ headers: {} });

    await expect(authenticatedEndpoint(req)).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining('unauthorized')
    });
  });

  it('should accept requests with valid token', async () => {
    suite.withDatabase({
      tokens: { 'valid-token': { owner: 'user-1', permissions: ['read'] } }
    });

    const req = createMockRequest({
      headers: { authorization: 'Bearer valid-token' }
    });

    const result = await authenticatedEndpoint(req);
    expect(result).toBeDefined();
  });
});
```

### Authorization Tests

```typescript
describe('Authorization', () => {
  it('should allow admin actions for admin users', async () => {
    suite.withDatabase({
      tokens: { 'admin-token': { owner: 'admin', permissions: ['admin'] } }
    });

    const req = createMockRequest({
      headers: { authorization: 'Bearer admin-token' }
    });

    await expect(adminAction(req)).resolves.toBeDefined();
  });

  it('should reject admin actions for regular users', async () => {
    suite.withDatabase({
      tokens: { 'user-token': { owner: 'user-1', permissions: ['read'] } }
    });

    const req = createMockRequest({
      headers: { authorization: 'Bearer user-token' }
    });

    await expect(adminAction(req)).rejects.toMatchObject({
      status: 403
    });
  });
});
```

## Common Patterns

### Testing Async Operations

```typescript
// ✅ Use async/await
it('should complete async operation', async () => {
  const result = await asyncOperation();
  expect(result).toBeDefined();
});

// ❌ Don't use callbacks
it('should complete', (done) => {
  asyncOperation().then(result => {
    expect(result).toBeDefined();
    done();
  });
});
```

### Testing Error Handling

```typescript
it('should handle database errors gracefully', async () => {
  // Force an error condition
  suite.withDatabase({
    users: { 'invalid-user': null } // Invalid data
  });

  await expect(service.getUser('invalid-user')).rejects.toThrow();
});
```

### Testing Side Effects

```typescript
it('should update related documents', async () => {
  await service.deleteUser('user-1');

  // Verify user deleted
  await expectDocumentNotExists(db, 'users/user-1');

  // Verify related data cleaned up
  await expectDocumentNotExists(db, 'progress/user-1');
  await expectDocumentNotExists(db, 'tokens/user-1-token');
});
```

## Test Maintenance

### Regular Reviews
- Review failing tests for relevance
- Update tests when requirements change
- Refactor complex tests for clarity
- Remove obsolete tests

### Code Quality
- Maintain 85%+ coverage
- Address flaky tests immediately
- Keep test files under 500 lines
- Extract common patterns to helpers

### Documentation
- Document complex test logic
- Explain non-obvious assertions
- Keep examples up to date
- Update this guide as patterns evolve

## Checklist

Before submitting tests:

- [ ] Tests are isolated and independent
- [ ] Uses `createTestSuite()` pattern
- [ ] Follows Arrange-Act-Assert
- [ ] Assertions are specific and meaningful
- [ ] Imports from `helpers/index`
- [ ] Error scenarios covered
- [ ] Tests pass consistently
- [ ] Documentation is clear

## Success Metrics

A healthy test suite has:
- **85%+ code coverage** for all code paths
- **<5 second** average test execution
- **Zero flaky tests** in CI/CD
- **Comprehensive security** coverage
- **Clear documentation** for all patterns

---

**Last Updated**: 2025-11-13
**For Questions**: See README.md or ask the team
