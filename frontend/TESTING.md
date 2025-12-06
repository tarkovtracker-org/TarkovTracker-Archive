# Frontend Testing Guide

This guide explains the comprehensive testing setup for the TarkovTracker frontend, replacing manual clicking with automated tests.

## Overview

Our testing strategy consists of three layers:

1. **Unit Tests** (Vitest) - Test individual components and composables
2. **End-to-End Tests** (Playwright) - Test complete user workflows
3. **Build Tests** - Ensure deployable builds work correctly

## Quick Start

```bash
# Run all tests
npm run test:all

# Run unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:ui          # Unit tests UI
npm run test:e2e:ui      # E2E tests UI
```

## Unit Testing with Vitest

### Configuration

- **Config File**: `vitest.config.ts`
- **Setup File**: `src/test/setup.ts`
- **Test Pattern**: `src/**/*.{test,spec}.{js,ts,jsx,tsx}`

### Writing Unit Tests

Place test files alongside components:

```bash
src/
├── features/
│   └── auth/
│       ├── AuthButtons.vue
│       └── __tests__/
│           └── AuthButtons.test.ts
```

### Example Unit Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MyComponent from '../MyComponent.vue';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const wrapper = mount(MyComponent, {
      props: { title: 'Test' },
    });
    expect(wrapper.text()).toContain('Test');
  });
});
```

### Mocking

Common mocks are pre-configured in `src/test/setup.ts`:

- Firebase Auth & Firestore
- Apollo Client
- Vue Router
- Vuetify components

## End-to-End Testing with Playwright

### Configurations

- **Config File**: `playwright.config.ts`
- **Test Directory**: `e2e/`
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

### Test Structure

```bash
e2e/
├── auth.spec.ts       # Authentication flows
├── dashboard.spec.ts  # Main navigation
└── tasks.spec.ts      # Task management
```

### Example E2E Test

```typescript
import { test, expect } from '@playwright/test';

test('user can complete a task', async ({ page }) => {
  await page.goto('/tasks');

  // Find first incomplete task
  const task = page.locator('.task-card').first();
  await task.click();

  // Mark as complete
  const completeBtn = page.locator('[data-testid="complete-task"]');
  await completeBtn.click();

  // Verify completion
  await expect(task).toHaveClass(/completed/);
});
```

### Mocking External Services

E2E tests mock external APIs to ensure consistent results:

```typescript
await page.route('**/*firebase*', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ authenticated: true }),
  });
});
```

## Test Commands Reference

### Development

```bash
# Run unit tests once
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with UI
npm run test:ui

# Run specific test file
npx vitest src/features/auth/__tests__/AuthButtons.test.ts

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run E2E tests with UI
npm run test:e2e:ui
```

### CI/Production

```bash
# Run unit tests once
npm run test:run

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests (headless)
npm run test:e2e

# Run all tests
npm run test:all
```

## Key Test Scenarios

### Authentication Flow

- Login page displays correctly
- Google/GitHub sign-in buttons work
- Loading states show properly
- Responsive design functions
- Privacy/Terms links present

### Task Management

- Tasks load and display
- Filtering works correctly
- Task completion/status changes
- Search functionality
- Responsive behavior

### Navigation & Layout

- Main navigation works
- Drawer opens/closes
- Page routing functions
- Mobile layout adapts
- No console errors

### Error Handling

- Graceful API failure handling
- Empty state displays
- Network error recovery
- Invalid data handling

## CI/CD Integration

Tests run automatically on:

- **Push** to `master` or `develop` branches
- **Pull Requests** targeting `master` or `develop`
- **Path filtering** - only runs when frontend code changes

### GitHub Actions Workflow

The `.github/workflows/frontend-tests.yml` file defines three jobs:

1. **unit-tests** - Vitest + linting + type checking
2. **e2e-tests** - Playwright tests with artifact upload
3. **build-test** - Verify both dev and prod builds

## Best Practices

### Unit Tests

- Test component behavior, not implementation
- Mock external dependencies
- Use descriptive test names
- Test edge cases and error states
- Keep tests focused and fast
- Prefer `globalThis` for globals; mock `window`/`document` only when the code under test reads them.

### E2E Tests

- Test complete user workflows
- Use data attributes for reliable selectors
- Mock external APIs for consistency
- Test responsive behavior
- Verify accessibility basics

### General

- Run tests before committing
- Fix failing tests immediately
- Update tests when changing behavior
- Use meaningful assertions
- Document complex test setups

## Troubleshooting

### Common Issues

**Unit tests failing with Vue component errors:**

- Check that Vuetify is properly mocked in `src/test/setup.ts`
- Ensure required props are provided in test

**E2E tests timing out:**

- Increase timeout in playwright.config.ts
- Add explicit waits for dynamic content
- Check network mocking is working

**Tests pass locally but fail in CI:**

- Check environment differences
- Verify all dependencies are installed
- Review CI logs for specific errors

### Debugging

```bash
# Debug unit tests
npm run test -- --reporter=verbose

# Debug E2E tests with browser
npm run test:e2e:headed

# Run specific E2E test
npx playwright test e2e/auth.spec.ts

# Generate Playwright trace
npx playwright test --trace on
```

## Coverage Requirements

- **Unit Tests**: Aim for >80% coverage on critical components
- **E2E Tests**: Cover all major user workflows
- **Integration**: Test component interactions

## Updating Tests

When adding new features:

1. Add unit tests for new components
2. Add E2E tests for new user workflows
3. Update existing tests if behavior changes
4. Verify all tests pass before merging

When fixing bugs:

1. Write a test that reproduces the bug
2. Fix the bug
3. Verify the test now passes
4. Add regression tests if needed

## Performance Testing

While not included in this setup, consider adding:

- Lighthouse CI for performance metrics
- Bundle size analysis
- Load testing for critical paths
- Memory leak detection

## Future Enhancements

Potential additions to the testing suite:

- Visual regression testing with Percy/Chromatic
- Accessibility testing with axe-core
- API contract testing
- Cross-browser compatibility matrix
- Performance benchmarks

---

This testing setup replaces manual clicking with comprehensive automated tests that catch regressions and ensure code quality across the entire frontend application.
