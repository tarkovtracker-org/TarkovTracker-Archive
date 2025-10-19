# Contract Tests - Quick Reference

## 🚀 Quick Start

```bash
# Run all contract tests
cd functions && npm test -- test/contract --run

# Run in watch mode
cd functions && npm test -- test/contract --watch

# Run specific test file
cd functions && npm test -- test/contract/progress-api-contract.test.ts
```

## 📋 What Gets Tested

### ✅ Progress API (`/api/v2/progress`)
- Response structure (9 required fields)
- Task items schema
- Objective items schema
- Level validation (1-79)
- Faction validation (USEC/BEAR)
- Error responses

### ✅ Team API (`/api/v2/team`)
- Team progress structure
- Creation/join/leave responses
- Member data structure
- Backward compatibility

### ✅ Token API (`/api/v2/token`)
- Token info structure
- Permissions validation (GP/WP/TP)
- Game mode validation (pvp/pve/dual)
- Creation/revocation responses

## ⚠️ When Tests Fail

### Step 1: Identify the Breaking Change
```bash
# Look at the test output - it will show exactly what changed
❌ Expected field 'playerLevel' not found
❌ Expected type 'number' but got 'string'
```

### Step 2: Choose Your Path

**Option A: Fix the Code** (Recommended)
```typescript
// Restore the field
response.playerLevel = 42; // Keep it!
```

**Option B: Intentional Breaking Change**
1. Bump API version: `/api/v2` → `/api/v3`
2. Update tests with comment:
   ```typescript
   // BREAKING CHANGE v3.0.0: playerLevel renamed to level
   expect(result).toHaveProperty('level');
   ```
3. Document in CHANGELOG.md
4. Notify API consumers

## 📝 Adding Tests for New Endpoints

```typescript
describe('GET /api/v2/newEndpoint - Response Structure', () => {
  it('returns correct structure', () => {
    const response = {
      success: true,
      data: {
        field1: 'value',
        field2: 123,
      },
    };

    // Test structure
    expect(response).toMatchObject({
      success: expect.any(Boolean),
      data: expect.objectContaining({
        field1: expect.any(String),
        field2: expect.any(Number),
      }),
    });

    // Test required fields
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('data.field1');
    expect(response).toHaveProperty('data.field2');
  });
});
```

## 🎯 Common Patterns

### Validate Field Exists
```typescript
expect(response).toHaveProperty('fieldName');
```

### Validate Field Type
```typescript
expect(typeof response.fieldName).toBe('string');
expect(Array.isArray(response.items)).toBe(true);
```

### Validate Value Range
```typescript
expect(response.level).toBeGreaterThanOrEqual(1);
expect(response.level).toBeLessThanOrEqual(79);
```

### Validate Enum Values
```typescript
expect(['USEC', 'BEAR']).toContain(response.faction);
```

### Validate Array Items
```typescript
response.items.forEach(item => {
  expect(item).toHaveProperty('id');
  expect(typeof item.id).toBe('string');
});
```

## 🔍 Debugging Failed Tests

### Check Test Output
```bash
# Detailed output shows exact failure
❌ Expected response to have property 'oldField'
   - Missing: oldField
   - Found: newField
```

### Run Single Test
```bash
npm test -- test/contract/progress-api-contract.test.ts \
  -t "ensures playerLevel is a valid number"
```

### Use Watch Mode
```bash
# Tests re-run on file changes
npm test -- test/contract --watch
```

## 📚 Resources

- **Detailed Guide**: [README.md](./README.md)
- **Testing Strategy**: [../../../TESTING_STRATEGY.md](../../../TESTING_STRATEGY.md)
- **API Summary**: [../../../API_TESTING_SUMMARY.md](../../../API_TESTING_SUMMARY.md)

## 🆘 Need Help?

1. Check the [full README](./README.md)
2. Review existing test examples
3. Ask in GitHub discussions
4. Tag reviewers in your PR

## ✅ Pre-Commit Checklist

- [ ] Run contract tests: `npm test -- test/contract`
- [ ] All tests pass ✅
- [ ] If tests modified, added comment explaining why
- [ ] If breaking change, API version bumped
- [ ] Documentation updated if needed

---

**Remember**: Contract tests protect third-party integrations. Don't skip them!
