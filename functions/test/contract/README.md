# API Contract Tests

## Purpose

These tests serve as **living documentation** and **breaking change detection** for the TarkovTracker API. They ensure that API responses maintain a consistent structure for third-party consumers.

## Why Contract Tests?

### The Problem
In a previous incident, changes to the progress endpoint output caused breaking changes for third-party integrations. Contract tests prevent this by:

1. **Documenting Expected API Responses**: Each test explicitly defines the expected structure
2. **Detecting Breaking Changes**: Any modification to response structures will fail tests
3. **Preventing Regressions**: Tests must be updated intentionally when making breaking changes
4. **Versioning Guidance**: Failed contract tests indicate when a new API version is needed

## Test Structure

### Contract Test Files

- **`progress-api-contract.test.ts`**: Tests for progress endpoints (`/api/v2/progress`)
- **`team-api-contract.test.ts`**: Tests for team endpoints (`/api/v2/team`)
- **`token-api-contract.test.ts`**: Tests for token endpoints (`/api/v2/token`)

### What Contract Tests Validate

#### 1. Required Fields
```typescript
// Example: Progress endpoint must always return these fields
const requiredFields = [
  'tasksProgress',
  'taskObjectivesProgress',
  'hideoutModulesProgress',
  'hideoutPartsProgress',
  'displayName',
  'userId',
  'playerLevel',
  'gameEdition',
  'pmcFaction',
];
```

#### 2. Field Types
```typescript
// Example: Field types must remain consistent
expect(typeof result.playerLevel).toBe('number');
expect(Array.isArray(result.tasksProgress)).toBe(true);
```

#### 3. Value Constraints
```typescript
// Example: Values must be within valid ranges
expect(result.playerLevel).toBeGreaterThanOrEqual(1);
expect(result.playerLevel).toBeLessThanOrEqual(79);
expect(['USEC', 'BEAR']).toContain(result.pmcFaction);
```

#### 4. Nested Structure Validation
```typescript
// Example: Array items must have consistent schemas
result.tasksProgress.forEach((task) => {
  expect(task).toHaveProperty('id');
  expect(task).toHaveProperty('complete');
  expect(typeof task.id).toBe('string');
  expect(typeof task.complete).toBe('boolean');
});
```

## Running Contract Tests

### Run All Contract Tests
```bash
cd functions
npm test -- test/contract
```

### Run Specific Contract Test Suite
```bash
npm test -- test/contract/progress-api-contract.test.ts
npm test -- test/contract/team-api-contract.test.ts
npm test -- test/contract/token-api-contract.test.ts
```

### Run in Watch Mode
```bash
npm test -- test/contract --watch
```

## When Contract Tests Fail

### ⚠️ Breaking Change Detected

If a contract test fails, it means you've introduced a **breaking change** to the API. Follow this process:

#### Step 1: Assess the Change
Ask yourself:
- Did I remove a field that third parties depend on?
- Did I change a field type (e.g., string to number)?
- Did I rename a field?
- Did I change the structure of nested objects/arrays?

#### Step 2: Choose a Path

**Option A: Fix the Breaking Change (Recommended)**
- Restore backward compatibility
- Add new fields instead of changing existing ones
- Use optional fields for new features
- Maintain old field names alongside new ones during transition

**Option B: Intentional Breaking Change**
If the breaking change is necessary:
1. **Bump API version** (e.g., `/api/v2` → `/api/v3`)
2. **Update contract tests** to reflect new structure
3. **Document in CHANGELOG** with migration guide
4. **Notify third-party consumers** via GitHub issues/announcements
5. **Maintain old version** for reasonable deprecation period

#### Step 3: Update Tests
Only after deciding on Option B, update the contract tests:

```typescript
// Before (old contract)
expect(result).toHaveProperty('oldFieldName');

// After (new contract with explicit comment)
// BREAKING CHANGE v3.0.0: oldFieldName renamed to newFieldName
expect(result).toHaveProperty('newFieldName');
```

## Best Practices

### 1. Add Tests BEFORE Modifying API
When adding new endpoints or modifying existing ones:
1. Write contract tests first
2. Implement the feature
3. Ensure tests pass
4. Lock in the contract

### 2. Never Remove Tests Silently
Removing a contract test is equivalent to saying "we no longer guarantee this field exists."
- Always document WHY a test was removed
- Include version bump information
- Add migration notes

### 3. Test Both Success and Error Cases
```typescript
// Success case
expect(response).toMatchObject({ success: true, data: {...} });

// Error case
expect(errorResponse).toMatchObject({ success: false, error: expect.any(String) });
```

### 4. Use Explicit Field Checking
```typescript
// Good: Explicitly checks for required fields
expect(result).toHaveProperty('userId');
expect(result).toHaveProperty('playerLevel');

// Bad: Only checks if result exists
expect(result).toBeDefined();
```

## Integration with CI/CD

### GitHub Actions Integration
Contract tests should run on:
- ✅ Every pull request
- ✅ Before deployment to staging
- ✅ Before deployment to production

### Example Workflow
```yaml
- name: Run Contract Tests
  run: |
    cd functions
    npm test -- test/contract --run
  if: failure()
    run: |
      echo "⚠️ CONTRACT TESTS FAILED: Breaking API changes detected!"
      echo "Review the changes and update API version if needed."
      exit 1
```

## API Versioning Strategy

### Current Version: v2
Base URL: `/api/v2`

### When to Bump Version
Create `/api/v3` when:
- Removing required fields
- Changing field types
- Renaming fields
- Changing response structure significantly
- Multiple breaking changes accumulate

### Deprecation Timeline
- **v1**: Deprecated, will be removed in Q2 2025
- **v2**: Current stable version
- **v3**: (Future) Breaking changes will trigger this

## Example: Preventing the Original Incident

### The Incident
Progress endpoint changed from:
```json
{
  "tasks": [{"id": "...", "completed": true}]
}
```

To:
```json
{
  "tasksProgress": [{"id": "...", "complete": true}]
}
```

### How Contract Tests Prevent This

```typescript
// This test would have failed:
it('maintains backward compatibility: no fields are removed', async () => {
  const result = await progressService.getUserProgress('user-id', 'pvp');
  
  // FAILS: 'tasks' field no longer exists
  expect(result).toHaveProperty('tasks');
  
  // FAILS: Field renamed from 'completed' to 'complete'
  result.tasks[0].forEach(task => {
    expect(task).toHaveProperty('completed');
  });
});
```

The test failure would have alerted developers to:
1. Either restore the old field names
2. Or intentionally version bump to v3 with migration guide

## Monitoring & Alerts

### Test Metrics to Track
- Contract test pass rate (should be 100%)
- Number of contract tests per endpoint
- Frequency of contract test updates (indicates API stability)

### Alert Conditions
- Contract test failures on main branch
- Contract tests modified without version bump
- Low contract test coverage on new endpoints

## Further Reading

- [Semantic Versioning](https://semver.org/)
- [API Versioning Best Practices](https://www.xmatters.com/api-versioning-best-practices/)
- [Contract Testing with Vitest](https://vitest.dev/guide/)

## Maintenance

These tests should be reviewed and updated:
- When adding new API endpoints
- When modifying existing endpoints
- During major version planning
- Quarterly as part of API review process

---

**Remember**: Contract tests are your shield against accidental breaking changes. Treat them with respect!
