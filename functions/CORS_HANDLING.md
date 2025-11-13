# Centralized CORS Handling for Cloud Functions

## Overview

This project uses a centralized CORS handling system to ensure consistent, secure origin validation across all HTTP endpoints. All CORS logic is implemented once and reused through middleware and wrapper functions.

## Architecture

### Core Components

1. **`corsConfig.ts`** - Origin validation rules and whitelist
2. **`corsWrapper.ts`** - Reusable middleware and wrappers
3. **Endpoint handlers** - Use wrappers, no inline CORS logic

### Key Principles

- ✅ **Single source of truth** for CORS rules
- ✅ **No inline CORS code** in handlers
- ✅ **Whitelist-based validation** in development
- ✅ **Pattern-based validation** in production
- ✅ **Preflight handling** automated
- ✅ **Consistent headers** across all endpoints

## Configuration (`corsConfig.ts`)

### Allowed Origins

```typescript
// Development
if (process.env.NODE_ENV !== 'production') {
  return [
    'http://localhost:5173',
    'http://localhost:5000',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5000',
  ];
}

// Production - empty array triggers pattern-based validation
return [];
```

### Validation Logic

The `validateOrigin()` function enforces security rules:

**Blocked Patterns:**
- `null` origins
- `file://` URLs
- `javascript:` URLs
- `data:` URLs
- Localhost/private IPs (in production only)
- URLs with username/password
- Invalid protocols
- Malformed URLs

**Allowed Patterns:**
- Valid HTTP/HTTPS origins
- Origins in the whitelist (if configured)
- Localhost in development

### CORS Headers

**Static Allowlist (never reflects client input):**

```typescript
const ALLOW_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-App-Version',
  'Accept',
  'Origin',
];

const ALLOW_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS'
];
```

## Usage

### For Express Applications (`app.ts`)

Use `corsMiddleware` as Express middleware:

```typescript
import { corsMiddleware } from './middleware/corsWrapper';

app.use(corsMiddleware);
```

**Behavior:**
1. Validates origin and sets CORS headers
2. Returns 403 for invalid origins
3. Responds with 204 for OPTIONS preflight
4. Passes valid requests to next middleware

### For Firebase Functions (onRequest)

Use `withCorsHandling` to wrap your handler:

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { withCorsHandling } from './middleware/corsWrapper';

const myHandler = async (req, res) => {
  res.json({ message: 'Hello' });
};

export const myFunction = onRequest(
  { memory: '256MiB' },
  withCorsHandling(myHandler)
);
```

**Behavior:**
1. Validates origin before handler runs
2. Sets appropriate CORS headers
3. Handles OPTIONS preflight
4. Rejects invalid origins with 403
5. Calls handler only for valid requests

### For Authenticated Endpoints

Use `withCorsAndAuthentication` for endpoints requiring Bearer tokens:

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { withCorsAndAuthentication } from './middleware/corsWrapper';

const myHandler = async (req, res, uid) => {
  // uid is already verified
  res.json({ userId: uid, message: 'Hello' });
};

export const myFunction = onRequest(
  { memory: '256MiB' },
  withCorsAndAuthentication(myHandler)
);
```

**Behavior:**
1. Validates origin (CORS check)
2. Extracts Bearer token from Authorization header
3. Verifies token with Firebase Admin
4. Calls handler with authenticated `uid`
5. Returns 401 for missing/invalid tokens

## Migration Guide

### Before (Inline CORS Handling)

```typescript
export const api = onRequest(
  { memory: '256MiB' },
  async (req, res) => {
    // Manual CORS handling (DON'T DO THIS)
    const { setCorsHeaders } = await import('./config/corsConfig');
    if (!setCorsHeaders(req, res)) {
      res.status(403).send('Origin not allowed');
      return;
    }
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    // Actual handler logic
    const app = await getApiApp();
    return app(req, res);
  }
);
```

### After (Centralized CORS)

```typescript
import { withCorsHandling } from './middleware/corsWrapper';

export const api = onRequest(
  { memory: '256MiB' },
  withCorsHandling(async (req, res) => {
    // CORS already handled by wrapper
    const app = await getApiApp();
    return app(req, res);
  })
);
```

## Testing CORS

### Unit Tests

Test CORS behavior with mocks:

```typescript
import { corsMiddleware } from './middleware/corsWrapper';

it('should set CORS headers for valid origin', () => {
  const req = { method: 'GET', headers: { origin: 'http://localhost:3000' } };
  const res = { set: vi.fn(), status: vi.fn().mockReturnThis() };
  const next = vi.fn();
  
  corsMiddleware(req, res, next);
  
  expect(res.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
  expect(next).toHaveBeenCalled();
});

it('should reject invalid origin', () => {
  const req = { method: 'GET', headers: { origin: 'https://evil.com' } };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  
  corsMiddleware(req, res, next);
  
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});
```

### Integration Tests

Test with supertest:

```typescript
import request from 'supertest';
import { getApiApp } from './app';

it('should handle OPTIONS preflight', async () => {
  const app = await getApiApp();
  
  const response = await request(app)
    .options('/api/progress')
    .set('Origin', 'http://localhost:3000')
    .set('Access-Control-Request-Method', 'GET');
  
  expect(response.status).toBe(204);
  expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  expect(response.headers['access-control-allow-methods']).toContain('GET');
});

it('should set CORS headers on actual requests', async () => {
  const app = await getApiApp();
  
  const response = await request(app)
    .get('/api/health')
    .set('Origin', 'http://localhost:3000');
  
  expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
});
```

## Security Considerations

### Why Not Use Firebase's Auto-CORS?

Firebase Functions can automatically handle CORS with `cors: true` in function config. However:

❌ **Too Permissive** - Reflects any origin  
❌ **No Validation** - No security checks  
❌ **No Control** - Can't customize behavior  
❌ **Less Secure** - Accepts dangerous patterns  

### Why Our Approach Is Better

✅ **Whitelist-Based** - Only allow known origins  
✅ **Pattern Validation** - Block dangerous formats  
✅ **Consistent** - Same logic everywhere  
✅ **Testable** - Easy to verify behavior  
✅ **Auditable** - Single place to review  

### Bearer Token Security

Bearer tokens don't suffer from CSRF attacks like cookies because:
- Not automatically sent by browsers
- Must be explicitly included in requests
- Can't be triggered by cross-origin forms

However, we still validate origins to:
- Prevent confusion attacks
- Block malicious origins
- Enable credential-based requests in future
- Follow security best practices

## Common Patterns

### Pattern 1: Simple HTTP Function

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { withCorsHandling } from './middleware/corsWrapper';

export const myFunction = onRequest(
  { memory: '256MiB' },
  withCorsHandling(async (req, res) => {
    res.json({ message: 'Hello' });
  })
);
```

### Pattern 2: Authenticated Function

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { withCorsAndAuthentication } from './middleware/corsWrapper';

export const myFunction = onRequest(
  { memory: '256MiB' },
  withCorsAndAuthentication(async (req, res, uid) => {
    // uid is verified
    res.json({ userId: uid });
  })
);
```

### Pattern 3: Express App

```typescript
import express from 'express';
import { corsMiddleware } from './middleware/corsWrapper';

const app = express();

// Apply CORS to all routes
app.use(corsMiddleware);

// Define routes
app.get('/api/test', (req, res) => {
  res.json({ success: true });
});
```

## Troubleshooting

### Issue: CORS errors in development

**Solution:** Ensure your dev origin is in the whitelist:

```typescript
// corsConfig.ts
if (process.env.NODE_ENV !== 'production') {
  return [
    'http://localhost:3000',  // Add your port
    // ...other dev origins
  ];
}
```

### Issue: OPTIONS preflight fails

**Symptoms:**
- Browser sends OPTIONS request
- Gets 403 or 500 response
- Actual request never sent

**Solution:**
- Verify `corsMiddleware` is applied BEFORE route handlers
- Check that wrapper functions are used correctly
- Ensure no middleware blocks OPTIONS

### Issue: CORS headers missing

**Symptoms:**
- Request succeeds but browser blocks response
- No `Access-Control-Allow-Origin` header

**Solution:**
- Verify `withCorsHandling` wraps the handler
- Check that `corsMiddleware` is applied to Express app
- Ensure no middleware overwrites headers

### Issue: "Origin not allowed" in production

**Symptoms:**
- Works in development
- Fails in production

**Solution:**
- Check that origin matches pattern validation rules
- Verify origin uses HTTPS (not HTTP)
- Ensure origin is a valid URL format

## Best Practices

### ✅ DO

- Use `corsMiddleware` for Express apps
- Use `withCorsHandling` for Firebase Functions
- Use `withCorsAndAuthentication` for auth endpoints
- Test CORS behavior with both valid and invalid origins
- Keep origin whitelist minimal in development
- Use pattern validation in production

### ❌ DON'T

- Manually set CORS headers in handlers
- Use `cors: true` in Firebase Function config
- Reflect `Access-Control-Request-Headers` header
- Allow `*` origin with credentials
- Skip CORS validation for "internal" endpoints
- Hardcode origins in handler code

## File Reference

| File | Purpose |
|------|---------|
| `src/config/corsConfig.ts` | Origin validation rules and whitelist |
| `src/middleware/corsWrapper.ts` | Reusable middleware and wrappers |
| `src/index.ts` | Main HTTP function with CORS wrapper |
| `src/app/app.ts` | Express app with CORS middleware |
| `test/integration/middleware/corsWrapper.test.ts` | CORS wrapper tests |
| `test/integration/config/corsConfig.test.ts` | CORS config tests |

## Summary

✅ **Centralized** - One place for all CORS logic  
✅ **Consistent** - Same behavior everywhere  
✅ **Secure** - Validates origins, blocks dangerous patterns  
✅ **Testable** - Easy to verify and audit  
✅ **Maintainable** - Simple to update and extend  

For questions or issues, see the troubleshooting section or review the test files for examples.

---

**Last Updated:** 2025-11-13  
**Status:** ✅ Active - Use these patterns for all new endpoints
