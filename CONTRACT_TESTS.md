# API Contract Tests

## Purpose

Prevent breaking API changes that could affect third-party integrations. These tests validate that API response structures remain stable across code changes.

## What They Test

Contract tests validate the **handler layer** - the actual API response structure including:
- HTTP status codes
- Response wrappers (`success`, `data`, `meta`)
- Required fields and their types
- Field presence and backward compatibility

## Running Tests

```bash
# Run only contract tests
cd functions && npm test -- test/contract

# Run all tests
cd functions && npm test
```

## Coverage

### Test Breakdown
- **Progress API** (13 tests): `/api/v2/progress/*` endpoints
  - 11 tests call real handlers (success paths)
  - 2 tests validate error response format
- **Team API** (6 tests): `/api/v2/team/*` endpoints  
  - 6 tests call real handlers (100% coverage)
- **Token API** (8 tests): `/api/v2/token` endpoint
  - 6 tests call real handlers (success paths)
  - 2 tests validate error response format

**Total: 27 contract tests**
- **23 tests (85%)** execute real handler code and validate complete API responses
- **4 tests (15%)** validate error response format specification (schema documentation)

### Protection Level
✅ **All core success paths** are protected against breaking changes via handler-layer testing
✅ **Error response format** is documented and validated for consistency
✅ **Backward compatibility** is verified for all main endpoints

## When Tests Should Fail

Contract tests fail when you:
- Remove a required field from API response
- Change a field's data type (string → number)
- Modify response structure (nesting, wrapper format)
- Remove endpoints

## Adding New Contract Tests

Follow the existing pattern in `functions/test/contract/`:

```typescript
it('validates endpoint response', async () => {
  // 1. Mock the service layer
  const { YourService } = await import('../../lib/services/YourService.js');
  vi.spyOn(YourService.prototype, 'yourMethod').mockResolvedValue({
    // Mock data
  });

  // 2. Call the actual handler
  const handler = (await import('../../lib/handlers/yourHandler.js')).default;
  const req = createMockRequest({ owner: 'user-id' });
  const res = createMockResponse();
  
  await handler.yourEndpoint(req, res);

  // 3. Validate response structure
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        // Required fields
      })
    })
  );
});
```

## CI/CD Integration

Contract tests run automatically on:
- Every pull request
- Every push to `main`
- PRs are blocked if contract tests fail

See `.github/workflows/quality-gates.yml` for configuration.

## Key Principles

1. **Test handlers, not services** - Mock services, test handler transformations
2. **Validate complete responses** - Test entire response structure, not just data
3. **Fail fast on breaking changes** - Any structural change should fail tests
4. **Keep tests simple** - One concept per test
5. **Update tests when API evolves** - Intentional breaking changes require test updates

---

*Tests created to prevent incidents where API changes broke third-party integrations.*
