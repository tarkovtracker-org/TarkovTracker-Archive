```markdown
# Centralized HTTP Authentication for Cloud Functions

## Overview

This project uses a centralized HTTP authentication system to ensure consistent bearer token verification and permission checking across all HTTP endpoints. All authentication logic is implemented once and reused through middleware and wrapper functions.

## Architecture

### Core Components

1. **`httpAuthWrapper.ts`** - Centralized authentication middleware and wrappers
2. **`TokenService.ts`** - Token validation and management
3. **Handler files** - Use wrappers, no inline auth logic

### Key Principles

- ✅ **Single source of truth** for authentication
- ✅ **No inline auth code** in handlers
- ✅ **Consistent error responses** (401/403)
- ✅ **Automated permission checking**
- ✅ **Composable with CORS** wrapper
- ✅ **Type-safe** interfaces

## Authentication Types

### 1. API Bearer Tokens

**Purpose:** API access for third-party integrations

**Storage:** Firestore `token` collection

**Format:** `Authorization: Bearer <token-string>`

**Permissions:** GP (Get Progress), WP (Write Progress), TP (Team Progress)

**Use Cases:**
- Mobile apps
- Desktop applications
- Third-party integrations
- CLI tools

### 2. Firebase ID Tokens

**Purpose:** User authentication for account management

**Format:** `Authorization: Bearer <firebase-id-token>`

**Use Cases:**
- User account deletion
- Profile management
- Settings updates

## Usage Patterns

### Pattern 1: Express App with Middleware

For the main API Express app:

```typescript
import express from 'express';
import { verifyBearerToken, requirePermission } from './middleware/httpAuthWrapper';

const app = express();

// Apply bearer token authentication to all /api routes
app.use('/api', verifyBearerToken);

// Routes automatically have access to req.apiToken
app.get('/api/progress', 
  requirePermission('GP'),  // Check specific permission
  (req, res) => {
    const userId = req.apiToken.owner;
    res.json({ userId });
  }
);
```

**Flow:**
1. `verifyBearerToken` validates token
2. Attaches `req.apiToken` and `req.user`
3. `requirePermission` checks specific permissions
4. Handler receives authenticated request

### Pattern 2: Standalone Firebase Function

For individual onRequest functions:

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { withBearerAuth } from './middleware/httpAuthWrapper';

const myHandler = async (req, res, token) => {
  // token is already validated
  const userId = token.owner;
  res.json({ userId, permissions: token.permissions });
};

export const myFunction = onRequest(
  { memory: '256MiB' },
  withBearerAuth(myHandler)
);
```

**Flow:**
1. `withBearerAuth` validates token
2. Calls handler with validated `token` object
3. Returns 401 for invalid tokens

### Pattern 3: Function with Permission Check

For functions requiring specific permissions:

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { withBearerAuthAndPermission } from './middleware/httpAuthWrapper';

const myHandler = async (req, res, token) => {
  // token is validated AND has 'GP' permission
  res.json({ data: 'progress data' });
};

export const myFunction = onRequest(
  { memory: '256MiB' },
  withBearerAuthAndPermission('GP', myHandler)
);
```

**Flow:**
1. Validates bearer token
2. Checks for 'GP' permission
3. Returns 403 if permission missing
4. Calls handler if authorized

### Pattern 4: CORS + Auth Combined

For public API endpoints with CORS:

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { withCorsAndBearerAuth } from './middleware/httpAuthWrapper';

const myHandler = async (req, res, token) => {
  res.json({ message: 'Hello', userId: token.owner });
};

export const myFunction = onRequest(
  { memory: '256MiB' },
  withCorsAndBearerAuth(myHandler)
);
```

**Flow:**
1. Validates origin (CORS)
2. Handles OPTIONS preflight
3. Validates bearer token
4. Calls handler with token

### Pattern 5: CORS + Auth + Permission

For protected public API endpoints:

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { withCorsAndBearerAuthAndPermission } from './middleware/httpAuthWrapper';

const myHandler = async (req, res, token) => {
  res.json({ data: 'protected data' });
};

export const myFunction = onRequest(
  { memory: '256MiB' },
  withCorsAndBearerAuthAndPermission('GP', myHandler)
);
```

**Flow:**
1. CORS validation
2. Bearer token validation
3. Permission check
4. Handler execution

## API Reference

### Express Middleware

#### `verifyBearerToken`

Validates API bearer tokens for Express routes.

```typescript
import { verifyBearerToken } from './middleware/httpAuthWrapper';

app.use('/api', verifyBearerToken);
```

**Behavior:**
- Extracts token from `Authorization: Bearer <token>` header
- Validates token exists in Firestore
- Checks token not revoked or expired
- Attaches `req.apiToken` and `req.user`
- Returns 401 for invalid tokens
- Allows OPTIONS without auth

**Request Enhancement:**
```typescript
interface AuthenticatedRequest extends Request {
  apiToken?: ApiToken;
  user?: {
    id: string;
    username?: string;
  };
}
```

#### `requirePermission(permission)`

Checks if authenticated token has required permission.

```typescript
import { requirePermission } from './middleware/httpAuthWrapper';

app.get('/api/progress', 
  verifyBearerToken,
  requirePermission('GP'),
  handler
);
```

**Permissions:**
- `GP` - Get Progress
- `WP` - Write Progress
- `TP` - Team Progress

**Behavior:**
- Assumes `verifyBearerToken` already ran
- Returns 401 if no token
- Returns 403 if permission missing
- Calls next() if authorized

### Firebase Function Wrappers

#### `withBearerAuth(handler)`

Wraps a Firebase onRequest handler with bearer token authentication.

```typescript
import { withBearerAuth } from './middleware/httpAuthWrapper';

const handler = async (req, res, token) => {
  res.json({ userId: token.owner });
};

export const myFunc = onRequest({}, withBearerAuth(handler));
```

**Handler Signature:**
```typescript
(req: FunctionsRequest, res: FunctionsResponse, token: ApiToken) => Promise<void>
```

#### `withBearerAuthAndPermission(permission, handler)`

Combines authentication with permission checking.

```typescript
import { withBearerAuthAndPermission } from './middleware/httpAuthWrapper';

const handler = async (req, res, token) => {
  // token has 'GP' permission
  res.json({ data: 'progress' });
};

export const myFunc = onRequest(
  {},
  withBearerAuthAndPermission('GP', handler)
);
```

#### `withCorsAndBearerAuth(handler)`

Combines CORS and authentication.

```typescript
import { withCorsAndBearerAuth } from './middleware/httpAuthWrapper';

const handler = async (req, res, token) => {
  res.json({ message: 'Hello' });
};

export const myFunc = onRequest({}, withCorsAndBearerAuth(handler));
```

#### `withCorsAndBearerAuthAndPermission(permission, handler)`

Combines CORS, authentication, and permission checking.

```typescript
import { withCorsAndBearerAuthAndPermission } from './middleware/httpAuthWrapper';

const handler = async (req, res, token) => {
  res.json({ data: 'protected' });
};

export const myFunc = onRequest(
  {},
  withCorsAndBearerAuthAndPermission('GP', handler)
);
```

## Token Structure

### ApiToken Interface

```typescript
interface ApiToken {
  token: string;           // Token string
  owner: string;           // User ID who owns the token
  permissions: string[];   // Array of permissions (GP, WP, TP)
  note: string;            // User-provided description
  gameMode: 'pvp' | 'pve' | 'dual';  // Game mode
  calls?: number;          // Usage counter
  createdAt?: Timestamp;   // Creation timestamp
  revoked?: boolean;       // Revocation flag
  isActive?: boolean;      // Active flag
  status?: 'active' | 'expired' | 'revoked';
  lastUsed?: Timestamp;    // Last usage timestamp
}
```

## Error Responses

### 401 Unauthorized

Missing or invalid token:

```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

Possible causes:
- No Authorization header
- Invalid token format
- Token not found in database
- Token revoked or expired

### 403 Forbidden

Valid token but missing permission:

```json
{
  "success": false,
  "error": "Missing required permission: GP"
}
```

Cause:
- Token exists and is valid
- But doesn't have the required permission

## Testing

### Unit Tests

Test authentication behavior with mocks:

```typescript
import { verifyBearerToken } from './middleware/httpAuthWrapper';
import { vi } from 'vitest';

// Mock TokenService
vi.mock('./services/TokenService', () => ({
  TokenService: vi.fn().mockImplementation(() => ({
    validateToken: vi.fn().mockResolvedValue({
      token: 'test-token',
      owner: 'user-123',
      permissions: ['GP', 'WP'],
    }),
  })),
}));

it('should authenticate valid token', async () => {
  const req = {
    method: 'GET',
    headers: { authorization: 'Bearer test-token' }
  };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  
  await verifyBearerToken(req, res, next);
  
  expect(req.apiToken).toBeDefined();
  expect(req.apiToken.owner).toBe('user-123');
  expect(next).toHaveBeenCalled();
});
```

### Integration Tests

Test with real TokenService:

```typescript
import request from 'supertest';
import { getApiApp } from './app';

it('should return 401 for missing token', async () => {
  const app = await getApiApp();
  
  const response = await request(app)
    .get('/api/progress');
  
  expect(response.status).toBe(401);
  expect(response.body.error).toBeDefined();
});

it('should return 403 for missing permission', async () => {
  const app = await getApiApp();
  
  // Token with only GP permission
  const response = await request(app)
    .post('/api/progress/task/123')
    .set('Authorization', 'Bearer gp-only-token');
  
  expect(response.status).toBe(403);
  expect(response.body.error).toContain('WP');
});
```

## Security Considerations

### Token Validation

✅ **Strict Format** - Only accepts `Bearer <token>` format  
✅ **Database Lookup** - Verifies token exists in Firestore  
✅ **Revocation Check** - Rejects revoked tokens  
✅ **Expiration Check** - Rejects expired tokens  
✅ **Usage Tracking** - Increments call counter  

### Permission Model

Permissions are additive:
- A token with `['GP', 'WP']` can access both GP and WP endpoints
- A token with only `['GP']` cannot access WP endpoints
- All permissions are checked on every request

### Error Information

❌ **Don't** expose internal details in error messages  
✅ **Do** return generic messages: "Invalid or expired token"  
✅ **Do** log detailed errors server-side for debugging  

## Migration Guide

### From Manual Auth to Wrapper

**Before:**
```typescript
export const myFunc = onRequest({}, async (req, res) => {
  // Manual token extraction
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  // Manual validation
  const tokenService = new TokenService();
  try {
    const token = await tokenService.validateToken(authHeader);
    
    // Manual permission check
    if (!token.permissions.includes('GP')) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    // Handler logic
    res.json({ userId: token.owner });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});
```

**After:**
```typescript
import { withBearerAuthAndPermission } from './middleware/httpAuthWrapper';

const handler = async (req, res, token) => {
  // Auth and permission already checked
  res.json({ userId: token.owner });
};

export const myFunc = onRequest(
  {},
  withBearerAuthAndPermission('GP', handler)
);
```

**Benefits:**
- 75% less code
- No error handling needed
- Consistent behavior
- Type-safe token access

## Troubleshooting

### Issue: "No Authorization header provided"

**Symptoms:**
- 401 response
- Client sent request without header

**Solution:**
```typescript
// Client must include header
fetch('/api/progress', {
  headers: {
    'Authorization': 'Bearer your-token-here'
  }
});
```

### Issue: "Invalid or expired token"

**Symptoms:**
- 401 response
- Token was valid before

**Possible Causes:**
1. Token was revoked
2. Token expired
3. Token doesn't exist in database
4. Typo in token string

**Solution:**
- Generate new token
- Check token status in Firestore
- Verify exact token string

### Issue: "Missing required permission: GP"

**Symptoms:**
- 403 response
- Token is valid

**Cause:**
- Token doesn't have required permission

**Solution:**
- Create new token with required permissions
- Or update existing token permissions

### Issue: OPTIONS requests fail

**Symptoms:**
- Preflight requests get 401

**Solution:**
- Authentication middleware automatically allows OPTIONS
- If failing, check middleware order
- CORS middleware should run before or with auth

## Best Practices

### ✅ DO

- Use Express middleware for Express apps
- Use wrappers for standalone onRequest functions
- Combine wrappers in correct order (CORS → Auth → Permission)
- Handle token in handler parameters, not headers
- Log authentication failures
- Use TypeScript types for req.apiToken
- Test both success and failure cases

### ❌ DON'T

- Manually extract bearer tokens in handlers
- Skip authentication for "internal" endpoints
- Expose internal error details to clients
- Hardcode tokens in code
- Bypass permission checks
- Use Firebase ID tokens for API access (use API tokens)
- Use API tokens for user account actions (use Firebase ID tokens)

## File Reference

| File | Purpose |
|------|---------|
| `src/middleware/httpAuthWrapper.ts` | Centralized auth wrappers |
| `src/middleware/auth.ts` | Legacy re-exports (deprecated) |
| `src/middleware/permissions.ts` | Legacy re-exports (deprecated) |
| `src/services/TokenService.ts` | Token validation logic |
| `src/app/app.ts` | Express app with auth middleware |
| `test/integration/middleware/httpAuthWrapper.test.ts` | Auth tests |

## Summary

✅ **Centralized** - One place for all auth logic  
✅ **Consistent** - Same behavior everywhere  
✅ **Type-safe** - TypeScript interfaces  
✅ **Composable** - Works with CORS and other middleware  
✅ **Testable** - Easy to mock and verify  
✅ **Maintainable** - Simple to update and extend  

For questions or issues, see the troubleshooting section or review the test files for examples.

---

**Last Updated:** 2025-11-13  
**Status:** ✅ Active - Use these patterns for all new endpoints
```
