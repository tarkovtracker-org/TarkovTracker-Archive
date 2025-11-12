# Testing Standards and Best Practices

This document outlines the testing standards and best practices for the TarkovTracker Functions workspace.

## 🎯 Guiding Principles

### 1. Test Isolation
- **Each test must be independent** - no test should rely on state from another test
- **Use TestIsolationManager** for suite-wide setup and cleanup
- **Reset all mocks** between tests to prevent cross-contamination
- **Never share state** between tests unless explicitly intended

### 2. Deterministic Results
- **Tests must be deterministic** - same input should always produce same output
- **Use seeded random generators** when random data is needed
- **Avoid time-based assertions** - use mock time instead
- **Clean up after each test** - restore original state

### 3. Clear Intent
- **Descriptive test names** - explain what is being tested and why
- **Arrange-Act-Assert pattern** - clearly separate setup, execution, and verification
- **One assertion per concept** - avoid complex multi-assert tests
- **Test both happy and sad paths** - cover success and failure scenarios

## 📁 Test Organization

### Directory Structure
```
test/
├── factories/          # Test data factories
│   ├── TokenFactory.ts
│   ├── UserFactory.ts
│   └── ...
├── utils/              # Test utilities and helpers
│   ├── TestIsolation.ts
│   ├── MockHelpers.ts
│   └── ...
├── setup.js            # Global test setup and mocks
├── __mocks__/          # Module mocks
│   ├── firebase.js
│   └── ...
├── auth/               # Authentication tests
├── services/           # Service layer tests
├── middleware/         # Middleware tests
├── handlers/           # HTTP handler tests
└── integration/        # Integration tests
```

### File Naming Conventions
- **Unit tests**: `[Component].test.ts`
- **Integration tests**: `[Feature].integration.test.ts`
- **E2E tests**: `[Scenario].e2e.test.ts`
- **Performance tests**: `[Component].performance.test.ts`

## 🏗️ Test Structure Patterns

### Basic Test Template
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSuite } from '../utils/TestIsolation';

describe('ComponentName', () => {
  const testSuite = createTestSuite('ComponentName');

  it('should perform expected behavior', async () => {
    // Arrange
    testSuite.withDatabase({
      collection: {
        'test-id': { data: 'value' }
      }
    });

    // Act
    const result = await performAction();

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Factory Pattern Usage
```typescript
import { TokenFactory } from '../factories/TokenFactory';

describe('TokenService', () => {
  it('should create token with factory data', () => {
    // Arrange
    const tokenData = TokenFactory.createBasic({
      owner: 'test-user'
    });

    // Act
    const result = await tokenService.createToken(tokenData);

    // Assert
    expect(result).toMatchObject(tokenData);
  });
});
```

## 🎭 Mock Strategy

### Mock Hierarchy
1. **Global mocks** (setup.js) - Firebase, environment, shared utilities
2. **Suite mocks** (describe blocks) - Module-level mocking
3. **Test mocks** (individual tests) - Specific function mocking

### Mock Best Practices
```typescript
// ✅ Good - Use TestIsolation for temporary mocks
testSuite.withMock('collectionMock', () => ({
  get: vi.fn().mockResolvedValue({ exists: true, data: () => mockData }),
  update: vi.fn().mockResolvedValue(undefined)
}));

// ❌ Bad - Directly modifying global mocks
firestoreMock.collection = vi.fn(); // Interferes with other tests
```

### Mock Restoration
- Always restore mocks after tests
- Use `MockIsolation` for temporary mock overrides
- Let global beforeEach handle basic mock restoration

## 📊 Test Data Management

### Factory Pattern
- **Use factories** for creating test data
- **Consistent defaults** with override capabilities
- **Realistic data** that matches production schemas
- **Deterministic generation** using seeded random values

### Database State
```typescript
// ✅ Good - Use factory with seedDb
const tokenData = TokenFactory.createValidToken();
testSuite.withDatabase({
  token: {
    'test-token': tokenData
  }
});

// ❌ Bad - Hardcoded test data
const hardcodedData = {
  owner: 'user-12345',
  // Hardcoded values that might change
};
```

## 🔍 Assertion Patterns

### Specific vs Generic Assertions
```typescript
// ✅ Specific - Check exact behavior
expect(mockNext).toHaveBeenCalledTimes(1);
expect(mockRes.status).toHaveBeenCalledWith(200);

// ❌ Generic - Too broad
expect(mockNext).toHaveBeenCalled();
expect(mockRes.status).toBeDefined();
```

### Error Assertions
```typescript
// ✅ Good - Check specific error
await expect(service.method()).rejects.toThrow('Specific error message');

// ✅ Good - Check error type
await expect(service.method()).rejects.toThrow(Error);

// ❌ Bad - Too generic
await expect(service.method()).rejects.toThrow();
```

## ⚡ Performance Testing

### Performance Test Guidelines
```typescript
describe('Performance Tests', () => {
  it('should complete within time limit', async () => {
    await testSuite.assertWithin('operation', () => {
      return service.expensiveOperation();
    }, 1000); // 1 second limit
  });
});
```

### Load Testing Patterns
- Use realistic data volumes
- Measure actual performance characteristics
- Assert performance degradation limits
- Test for memory leaks in long-running operations

## 🧪 Integration Testing

### Integration Test Guidelines
- Test component interactions
- Use real database state where appropriate
- Mock external dependencies (APIs, file system)
- Test error propagation between components

### Test Data Consistency
```typescript
// ✅ Good - Ensure data consistency across systems
testSuite.withDatabase({
  users: { 'user-1': { name: 'Test User' } },
  progress: { 'user-1': { level: 5 } }
});

// Test that user creation also creates progress record
await userService.createUser('user-1');
const progress = await progressService.getUserProgress('user-1');
expect(progress.level).toBe(0); // Should be initialized
```

## 🔒 Security Testing

### Authentication Tests
```typescript
describe('Authentication', () => {
  it('should reject requests without valid token', async () => {
    // Test with no Authorization header
    await expect(authenticatedRequest()).rejects.toMatchObject({
      status: 401,
      body: { error: expect.stringContaining('unauthorized') }
    });
  });

  it('should reject requests with expired token', async () => {
    const expiredToken = TokenFactory.createExpired();
    // Test with expired token
    await expect(authenticatedRequest(expiredToken.id)).rejects.toMatchObject({
      status: 401
    });
  });
});
```

### Authorization Tests
```typescript
describe('Authorization', () => {
  it('should allow admin actions for admin users', async () => {
    const adminToken = TokenFactory.createAdmin();
    await expect(adminAction(adminToken.id)).resolves.toBeDefined();
  });

  it('should reject admin actions for basic users', async () => {
    const basicToken = TokenFactory.createBasic();
    await expect(adminAction(basicToken.id)).rejects.toMatchObject({
      status: 403
    });
  });
});
```

## 📝 Documentation

### Test Documentation
- **Document complex test logic** with inline comments
- **Explain test rationale** when behavior isn't obvious
- **Document mock behavior** for complex interactions
- **Include examples** in factory method documentation

### Test Metadata
```typescript
describe('ComponentName', () => {
  it('should handle edge case: user with expired token', async () => {
    // This test ensures that expired tokens are properly rejected
    // and that users are prompted to obtain a new token
    const expiredToken = TokenFactory.createExpired({
      owner: 'expired-user'
    });

    // Should reject with 401 and appropriate error message
    await expect(verifyToken(expiredToken.id)).rejects.toThrow(
      expect.objectContaining({
        code: 'auth/token-expired',
        message: expect.stringContaining('expired')
      })
    );
  });
});
```

## 🚀 CI/CD Integration

### Test Performance
- **Keep tests fast** - Unit tests should complete in <100ms
- **Parallel execution** - Tests should run independently
- **Resource cleanup** - No lingering processes or connections

### Test Environment
- **Consistent environment** across CI and local
- **Isolated test data** - No shared state between test runs
- **Deterministic behavior** regardless of execution environment

## 🔄 Maintenance Guidelines

### Test Maintenance
- **Review failing tests** regularly for relevance
- **Update factories** when data models change
- **Refactor complex tests** for clarity
- **Remove obsolete tests** as features change

### Code Quality
- **Maintain test coverage** thresholds
- **Address flaky tests** promptly
- **Review test complexity** regularly
- **Update documentation** as patterns evolve

## 📋 Checklist

Before submitting tests, verify:

- [ ] Test is isolated and independent
- [ ] Test follows Arrange-Act-Assert pattern
- [ ] Assertions are specific and meaningful
- [ ] Mocks are properly restored
- [ ] Test data uses factory pattern
- [ ] Error scenarios are covered
- [ ] Performance is acceptable
- [ ] Documentation is clear and helpful

## 🎯 Success Metrics

A healthy test suite should have:
- **>90% code coverage** for critical paths
- **<2 seconds** average test execution time
- **0 flaky tests** in CI/CD
- **Comprehensive coverage** of security and error scenarios
- **Clear documentation** for complex test logic

---

This document should be updated as patterns evolve and new testing challenges are discovered.