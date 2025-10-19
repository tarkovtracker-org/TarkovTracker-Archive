# TarkovTracker API Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for the TarkovTracker backend API, specifically designed to prevent breaking changes to third-party integrations.

## Testing Incident Background

**Date:** [Previous Incident]
**Issue:** Changes to the progress endpoint output caused breaking changes for third-party consumers
**Impact:** API consumers experienced unexpected errors and data structure mismatches
**Root Cause:** No automated tests validating API response contracts

## Solution: Contract Testing

We've implemented a **contract testing strategy** that validates API response structures and prevents accidental breaking changes.

## Test Architecture

### Test Types

1. **Contract Tests** (`functions/test/contract/`)
   - **Purpose**: Validate API response structures remain stable
   - **Coverage**: All public API endpoints
   - **Files**:
     - `progress-api-contract.test.ts` - Progress endpoint contracts
     - `team-api-contract.test.ts` - Team endpoint contracts
     - `token-api-contract.test.ts` - Token endpoint contracts

2. **Integration Tests** (`functions/test/`)
   - **Purpose**: Test API endpoints with mocked services
   - **Coverage**: Request handling, authentication, error handling
   - **Files**: `apiv2-integration.test.js`, `token-integration.test.js`

3. **Unit Tests** (`functions/test/services/`, `functions/test/middleware/`)
   - **Purpose**: Test individual services and middleware
   - **Coverage**: Business logic, validation, utilities

### Current Test Metrics

```
✅ Total Tests: 104
✅ Passing: 102 (98% pass rate)
⚠️ Failing: 2 (unrelated to contract tests)

Contract Tests:
✅ Progress API: 13 tests
✅ Team API: 6 tests  
✅ Token API: 10 tests
Total Contract Tests: 29 tests
```

## What Contract Tests Validate

### 1. Response Structure
```typescript
// Validates required fields are present
expect(response).toHaveProperty('tasksProgress');
expect(response).toHaveProperty('playerLevel');
```

### 2. Field Types
```typescript
// Validates data types remain consistent
expect(typeof response.playerLevel).toBe('number');
expect(Array.isArray(response.tasksProgress)).toBe(true);
```

### 3. Value Constraints
```typescript
// Validates business rules
expect(response.playerLevel).toBeGreaterThanOrEqual(1);
expect(response.playerLevel).toBeLessThanOrEqual(79);
```

### 4. Backward Compatibility
```typescript
// Ensures no fields are removed
const requiredFields = ['userId', 'playerLevel', 'tasksProgress'];
requiredFields.forEach(field => {
  expect(response).toHaveProperty(field);
});
```

## Running Tests

### Run All Tests
```bash
cd functions
npm test
```

### Run Only Contract Tests
```bash
cd functions
npm test -- test/contract
```

### Run Specific Test Suite
```bash
npm test -- test/contract/progress-api-contract.test.ts
```

### Run in Watch Mode (Development)
```bash
npm test -- --watch
```

### Run with Coverage
```bash
npm test -- --coverage
```

## CI/CD Integration

### GitHub Actions Workflow

Contract tests should run automatically on:
- ✅ Every pull request
- ✅ Every push to main branch
- ✅ Before deployment to production

### Recommended Workflow Addition

Add to `.github/workflows/test.yml`:

```yaml
name: API Contract Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
          
      - name: Install dependencies
        run: |
          cd functions
          npm install
          
      - name: Build functions
        run: |
          cd functions
          npm run build
          
      - name: Run Contract Tests
        run: |
          cd functions
          npm test -- test/contract --run
          
      - name: Contract Test Failure Warning
        if: failure()
        run: |
          echo "⚠️ CONTRACT TESTS FAILED"
          echo "Breaking API changes detected!"
          echo "Please review:"
          echo "1. Are you removing/renaming fields?"
          echo "2. Are you changing field types?"
          echo "3. Do you need to bump API version?"
          exit 1
```

## Breaking Change Prevention Workflow

### When Making API Changes

1. **Before Coding**
   - Review existing contract tests
   - Understand current API contracts
   
2. **During Development**
   - Run contract tests frequently: `npm test -- test/contract --watch`
   - If tests fail, decide: Fix code OR intentionally break contract
   
3. **Before Committing**
   - Run full test suite: `npm test`
   - Ensure all contract tests pass
   
4. **During Code Review**
   - Reviewer checks contract test results
   - Any contract test changes require explanation

### When Contract Tests Fail

**Option A: Fix the Breaking Change** (Recommended)
- Restore backward compatibility
- Add new fields instead of changing existing ones
- Use optional fields for new features

**Option B: Intentional Breaking Change**
1. Bump API version (v2 → v3)
2. Update contract tests with comments explaining change
3. Document in CHANGELOG.md
4. Create migration guide for third parties
5. Announce breaking change via GitHub discussions

## API Versioning

### Current Version: v2
- Base URL: `/api/v2`
- Status: Stable
- Support: Active

### Version Bump Triggers
Create a new API version when:
- ❌ Removing required fields
- ❌ Changing field types (string → number)
- ❌ Renaming fields
- ❌ Changing array structures
- ❌ Modifying error response formats

### Safe Changes (No Version Bump)
- ✅ Adding optional fields
- ✅ Adding new endpoints
- ✅ Improving error messages (same structure)
- ✅ Performance optimizations
- ✅ Bug fixes that don't change structure

## Testing Best Practices

### For Developers

1. **Write Contract Tests First**
   - When adding new endpoints
   - Before modifying existing endpoints
   
2. **Never Skip Contract Tests**
   - They protect third-party integrations
   - They document expected behavior
   
3. **Update Tests Intentionally**
   - Document WHY contract changed
   - Include version bump information

### For Reviewers

1. **Check Contract Test Changes**
   - Any changes to contract tests = potential breaking change
   - Require explanation and version consideration
   
2. **Validate Test Coverage**
   - New endpoints must have contract tests
   - Modified endpoints must update contract tests

## Monitoring & Maintenance

### Weekly
- Review test pass rate
- Check for flaky tests
- Ensure new endpoints have tests

### Monthly
- Review contract test coverage
- Update documentation
- Assess API stability metrics

### Quarterly
- Full API contract review
- Consider deprecation timeline for old versions
- Plan for v3 features if needed

## Related Documentation

- [Contract Tests README](functions/test/contract/README.md) - Detailed contract test guide
- [Functions Testing Guide](functions/test/README.md) - General testing documentation
- [CLAUDE.md](CLAUDE.md) - Development commands and architecture

## Success Metrics

### Current State (October 2025)
- ✅ 29 contract tests implemented
- ✅ 100% contract test pass rate
- ✅ All major endpoints covered
- ✅ Documentation complete

### Goals
- 🎯 Maintain 100% contract test pass rate
- 🎯 Add contract tests for any new endpoints
- 🎯 Zero breaking changes without version bump
- 🎯 Reduce third-party integration issues to zero

## Support

For questions about testing strategy:
1. Review this document and contract test README
2. Check existing test examples
3. Open a GitHub discussion
4. Tag @backend-team in PR comments

---

**Remember**: Contract tests are the shield protecting third-party integrations. Treat them with respect!
