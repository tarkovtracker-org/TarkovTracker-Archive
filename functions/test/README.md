# TarkovTracker Functions Testing Guide

This directory contains tests for the Firebase Cloud Functions in the TarkovTracker application.

## 📚 Documentation

For comprehensive testing guidelines, architecture, and best practices, see the **[test documentation](./docs/)**:

- **[Main Documentation](./docs/README.md)** - Overview and getting started
- **[Best Practices](./docs/BEST_PRACTICES.md)** - Testing guidelines and standards
- **[Architecture](./docs/ARCHITECTURE.md)** - Test design and patterns
- **[Maintenance](./docs/MAINTENANCE.md)** - Troubleshooting and upkeep
- **[Documentation Index](./docs/INDEX.md)** - Complete reference guide

## Test Structure

```
test/
├── docs/                    # Test documentation (NEW)
│   ├── README.md           # Main test documentation
│   ├── BEST_PRACTICES.md   # Testing best practices
│   ├── ARCHITECTURE.md     # Test architecture
│   ├── MAINTENANCE.md      # Maintenance guidelines
│   └── INDEX.md            # Documentation index
├── utils/                   # Test utilities and helpers (NEW)
│   ├── testHelpers.ts      # Common test setup/teardown
│   └── assertionHelpers.ts # Custom assertion helpers
├── factories/               # Test data factories (NEW)
│   ├── index.ts            # Factory exports
│   ├── TokenFactory.ts     # Token data factory
│   ├── UserFactory.ts      # User data factory
│   ├── TeamFactory.ts      # Team data factory
│   ├── ProgressFactory.ts  # Progress data factory
│   ├── TaskFactory.ts      # Task data factory
│   └── TestDataBuilder.ts  # Comprehensive test data builder
├── examples/                # Best practice examples (NEW)
│   └── TokenService.bestPractices.test.ts
├── integration/             # Integration tests
│   ├── tokenWorkflow.test.ts
│   └── userLifecycle.test.ts
├── performance/             # Performance tests
│   ├── loadTests.test.ts
│   ├── performanceUtils.ts
│   ├── progressPerformance.test.ts
│   ├── teamPerformance.test.ts
│   ├── tokenPerformance.test.ts
│   └── README.md
├── edge-cases/              # Edge case tests
│   ├── boundaryConditions.test.ts
│   ├── dataValidation.test.ts
│   ├── errorRecovery.test.ts
│   ├── unusualInputs.test.ts
│   └── README.md
├── services/                # Service layer tests
├── handlers/                # HTTP handler tests
├── middleware/              # Middleware tests
├── utils/                   # Utility function tests
├── mocks.js                 # Global mocks
├── setup.js                 # Test setup
└── tsconfig.json           # TypeScript config for tests
```

## Testing Approach

We use [Vitest](https://vitest.dev/) as our testing framework, which provides a modern, fast testing experience similar to Jest.

### Types of Tests

1. **Unit Tests**: For isolated testing of function logic without external dependencies.
2. **Integration Tests**: For testing function logic with mocked Firebase services.
3. **Performance Tests**: For measuring system performance under load.
4. **Edge Case Tests**: For testing boundary conditions and unusual inputs.

## 🛠️ Test Utilities

The test suite includes comprehensive utilities and helpers:

- **[Test Helpers](./utils/testHelpers.ts)** - Common setup, teardown, and execution helpers
- **[Assertion Helpers](./utils/assertionHelpers.ts)** - Custom matchers and assertion utilities
- **[Data Factories](./factories/)** - Fluent factories for creating test data
- **[Test Examples](./examples/)** - Complete examples following best practices

## 🏃 Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:edge-cases

# Run performance tests
npm run test:performance:all
```

## 📊 Coverage Requirements

- **Statements**: 85%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 85%

## 🎯 Test Categories

### Unit Tests
- Test individual functions and methods in isolation
- Located in `services/`, `handlers/`, `middleware/`, and `utils/` directories
- Fast execution with comprehensive mocking

### Integration Tests
- Test complete workflows and component interactions
- Located in `integration/` directory
- Use realistic test scenarios with data factories

### Performance Tests
- Measure system performance under load
- Located in `performance/` directory
- Include benchmarks and regression detection

### Edge Case Tests
- Test boundary conditions and unusual inputs
- Located in `edge-cases/` directory
- Focus on error handling and recovery

## 🏗️ Test Architecture

The test suite follows a layered architecture:

1. **Test Data Layer** - Factories and builders for creating test data
2. **Mock Layer** - Firebase and external service mocks
3. **Utility Layer** - Common test helpers and assertions
4. **Test Layer** - Actual test implementations organized by category

For detailed architecture information, see [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## 📝 Writing New Tests

When writing new tests, follow these guidelines:

1. **Use the AAA Pattern**: Arrange-Act-Assert
2. **Leverage Data Factories**: Use factories for consistent test data
3. **Follow Naming Conventions**: Descriptive test names that explain the scenario
4. **Include Documentation**: Add JSDoc comments explaining complex scenarios
5. **Test Error Cases**: Always test error scenarios and edge cases
6. **Use Assertion Helpers**: Leverage custom assertion helpers for readability

For complete guidelines, see [BEST_PRACTICES.md](./docs/BEST_PRACTICES.md).

## 🔧 Test Data Management

Use the provided factories for creating test data:

```typescript
// Create individual entities
const user = UserFactory.create({ level: 25 });
const token = TokenFactory.createExtended({ owner: user.uid });
const team = TeamFactory.createWithMembers(5);

// Use presets for common scenarios
const testData = TestDataPresets.experiencedUser();

// Use builder for complex scenarios
const scenario = new TestDataBuilder()
  .withUser(UserFactory.createExperienced())
  .withTeam(TeamFactory.createFull())
  .withToken(TokenFactory.createAdmin())
  .build();
```

## 🐛 Debugging Tests

For debugging tips and troubleshooting, see [MAINTENANCE.md](./docs/MAINTENANCE.md).

## 📈 Performance Testing

Performance tests are located in the `performance/` directory and include:

- Load testing for API endpoints
- Database operation benchmarks
- Memory usage monitoring
- Regression detection

For performance testing guidelines, see [performance/README.md](./performance/README.md).

## 🔄 CI/CD Integration

The test suite is integrated with CI/CD pipelines:

- All tests must pass (100% success rate)
- Coverage thresholds must be met
- Performance regressions are detected
- Test flakiness is monitored

## 🤝 Contributing

When contributing to the test suite:

1. Follow the established patterns and conventions
2. Update documentation for new test categories
3. Ensure coverage thresholds are maintained
4. Add performance tests for new features
5. Include edge case testing for new functionality

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for general contribution guidelines.

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Firebase Testing Guide](https://firebase.google.com/docs/functions/unit-testing)
- [Test Documentation Index](./docs/INDEX.md) - Complete reference

---

**Last Updated**: 2025-11-11  
**Maintained by**: TarkovTracker Development Team