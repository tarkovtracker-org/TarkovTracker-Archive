# E2E Testing Strategy

## Overview

End-to-end (E2E) tests using Playwright are configured to run strategically to balance coverage with CI performance.

## Current Configuration

### When E2E Tests Run

- ✅ **On push to `master` branch** - Full validation before production
- ✅ **On push to `develop` branch** - Full validation for staging
- ❌ **NOT on Pull Requests** - Skipped to speed up PR workflow

### Why Skip E2E on PRs?

E2E tests were taking **13+ minutes per PR** due to:
- Testing across 5 browsers (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)
- Serial execution with 1 worker
- Multiple retry attempts
- Hardcoded wait times in tests

This slowed down the development cycle significantly. Since:
- Unit tests and build tests catch most issues
- E2E tests use mocked auth/API (not true end-to-end)
- PRs are reviewed before merging anyway
- E2E still runs on master/develop before production

**Result:** PRs now complete in ~2-3 minutes instead of 13+ minutes.

## Optimizations Applied

### 1. Conditional Execution
```yaml
if: github.event_name == 'push' && (github.ref == 'refs/heads/master' || github.ref == 'refs/heads/develop')
```

### 2. Playwright Configuration
- **Browsers:** Only Chromium by default (4 others commented out)
- **Workers:** Parallel execution with 2 workers on CI
- **Retries:** Reduced from 2 to 1
- **Impact:** ~5x faster when E2E does run

## Running E2E Tests Locally

### Quick Test (Chromium only)
```bash
cd frontend
npm run test:e2e
```

### Cross-Browser Testing
Uncomment additional browsers in `frontend/playwright.config.ts`:
```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },  // Uncomment
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },     // Uncomment
  // etc.
]
```

Then run:
```bash
npm run test:e2e
```

## Future Improvements

Consider for future optimization:

1. **Replace `waitForTimeout` with proper assertions**
   - Current: 18 hardcoded waits (2 seconds each)
   - Better: Use Playwright's built-in waiters (`waitForSelector`, etc.)

2. **Mock External Dependencies**
   - Improve Firebase/API mocking for faster, more reliable tests
   - Remove need for actual network calls

3. **Visual Regression Testing**
   - Add screenshot comparison for UI changes
   - Catch visual bugs automatically

4. **Performance Budgets**
   - Add Lighthouse CI integration
   - Fail on performance regressions

## Testing Philosophy

**Fast Feedback Loop:**
- Unit tests (seconds) → Catch logic bugs
- Build tests (minutes) → Catch integration issues  
- E2E tests (minutes) → Catch UX/flow issues on main branches
- Manual testing → Catch edge cases during review

This layered approach provides coverage without slowing down development.
