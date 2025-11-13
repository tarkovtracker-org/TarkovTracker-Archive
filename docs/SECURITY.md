# Security Controls

> **Audience:** Security reviewers, backend developers  
> **Purpose:** Authentication, authorization, validation, and security controls

Single source of truth for authentication, authorization, validation, and security middleware across TarkovTracker's Firebase API and Vue frontend.

## Contents
- [Authentication & Authorization](#authentication--authorization)
- [Firestore Security Rules](#firestore-security-rules)
- [Middleware & Validation](#middleware--validation)
- [Origin Validation](#origin-validation)
- [Frontend Security](#frontend-security)
- [Quick Reference Checklist](#quick-reference-checklist)
- [Monitoring](#monitoring)

---

## Authentication & Authorization

**Token-Based Auth:**
- API requests require `Authorization: Bearer <token>` header
- Middleware (`functions/src/middleware/auth.ts`) validates tokens against Firestore `/token/{tokenId}` collection
- Each token has immutable permissions (`GP`/`TP`/`WP` scopes)

**Permission Enforcement:**
- `requirePermission('GP' | 'TP' | 'WP')` middleware checks scopes before handler execution
- Tokens stored with owner metadata, middleware attaches `req.apiToken` for downstream use

**Reauth Guard:**
- Sensitive operations (account deletion, token rotation) require Firebase ID token reauth
- Implemented in `functions/src/middleware/reauth.ts`

---

## Firestore Security Rules

**Progress Data** (`/progress/{userId}`):
- Read: Owner or team members (via `memberOfSameTeam()` helper)
- Write: Must match `validGameModeData()` structural validation
- Subcollections inherit parent rules

**API Tokens** (`/token/{tokenId}`):
- Read/update/delete: Owner only
- Updates restricted to `calls` and `note` fields
- Permissions are immutable

**Team Data** (`/team/{teamId}`):
- Members: Max 50, owner can manage, members can self-remove
- Ownership transfer: Explicit operation, preserves team integrity

**Shared Rule Helpers:**
- `validUserData()` – User profile validation
- `validGameModeData()` – PVP/PVE progress structure
- `memberOfSameTeam()` – Team membership check

---

## Middleware & Validation

### Rate Limiting (`abuseGuard.ts`)

**Configuration:**
- Applies to: POST/PUT/PATCH/DELETE by default
- Tracks: Requests per hashed token or IP fallback
- Warning: 80% of threshold triggers log event
- Block: After breach threshold exceeded

**Environment Variables:**
```bash
ABUSE_GUARD_WINDOW_MS=10000           # Sliding window (1s-60s)
ABUSE_GUARD_THRESHOLD=150             # Max requests per window
ABUSE_GUARD_WARN_RATIO=0.8            # Warning threshold
ABUSE_GUARD_BREACH_LIMIT=2            # Consecutive breaches before 429
ABUSE_GUARD_PATH_PREFIXES=/api/progress,/api/team
ABUSE_GUARD_COLLECTION=rateLimitEvents
```

**Event Logging:**
- Warnings logged to Cloud Functions logger
- Breach events written to `rateLimitEvents` Firestore collection
- Never stores raw bearer tokens (uses SHA-256 hash)

### Input Validation (`ValidationService.ts`)

**Bounds Checking:**
- Levels: 1-79
- Editions: 1-6
- Factions: `USEC` / `BEAR`
- Task states: Predefined enum
- String sanitization: Strips dangerous characters

**Usage:**
```typescript
ValidationService.validateLevel(level);
ValidationService.validateGameEdition(edition);
ValidationService.sanitizeString(input);
```

### Error Handling (`errorHandler.ts`)

**Response Structure:**
```typescript
{
  success: boolean,
  error?: string,
  meta?: object
}
```

**Logging:**
- Development: Verbose error details
- Production: Sanitized messages, full details in Cloud Logging

---

## Origin Validation

**Implemented in:** `functions/src/config/corsConfig.ts`

**Rejection Rules:**
- `null` or `file:` origins
- Embedded credentials (`http://user:pass@example.com`)
- Private IPs in production (10.x, 172.16.x, 192.168.x)
- Invalid URL formats
- Hostnames with `..` or suspicious patterns

**Environment-Specific:**
- **Production:** Strict allowlist of production/staging domains
- **Development:** Whitelists localhost/127.0.0.1 variants

**Functions:**
- `setCorsHeaders()` – Manual header setting
- `getExpressCorsOptions()` – Express `cors` middleware config

---

## Frontend Security

**Firebase Auth:**
- Initialized with emulator support (`frontend/src/plugins/firebase.ts`)
- Mock auth available via `VITE_DEV_AUTH=true` (development only)

**Input Validation:**
- Mirrors backend validation (`DataValidationService.ts`)
- Sanitizes all inputs before API calls
- Client-side bounds checking reduces invalid requests

**API Token Handling:**
- Bearer tokens sent explicitly (no browser auto-credentials)
- Stored securely in memory or encrypted storage
- Never logged or exposed in errors

**Cache Security:**
- Firestore helpers (`useFirestoreTarkovItems()`) reuse listeners
- No sensitive data cached client-side
- Cache invalidation on auth state changes

---

## Quick Reference Checklist

**Adding New Routes:**
- ✅ Wrap with `requirePermission()` middleware
- ✅ Apply `abuseGuard` for mutations
- ✅ Use `ValidationService` for input validation
- ✅ Structure responses with `errorHandler`

**Modifying Permissions:**
- ✅ Update Firestore rules in `firestore.rules`
- ✅ Update middleware checks in `auth.ts`
- ✅ Add tests for new permission scenarios
- ✅ Document changes in this file

**Adding Middleware:**
- ✅ Register in correct order (auth → validation → rate limit → handler)
- ✅ Log failures with context (owner, path, reason)
- ✅ Update this document with new guards

**Configuration Changes:**
- ✅ Test with emulator (`npm run dev:full`)
- ✅ Validate CORS with staging preview URLs
- ✅ Update environment variable documentation
- ✅ Monitor Cloud Logging for unexpected denials

---

## Monitoring

**Key Metrics:**
- 401/403/429 response rates
- `rateLimitEvents` collection write frequency
- CORS denial logs
- Token validation failures

**Alert Thresholds:**
- Spike in 429 responses (potential attack or misconfigured threshold)
- Unusual token validation failures (potential compromise)
- Surge in CORS denials from unexpected origins

**Tools:**
- Firebase Console: Functions logs, Firestore usage
- Cloud Monitoring: Custom metrics, alerting policies
- Lighthouse CI: Security header validation

**Investigation:**
- Filter `rateLimitEvents` by `tokenOwner` or `cacheKey`
- Check `tokenOwner` field (user UID, team ID, or token ID)
- Raw tokens never logged (SHA-256 hash in `cacheKey`)

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) – System design and caching strategy
- [DEVELOPMENT.md](./DEVELOPMENT.md) – Development workflows and testing
- `firestore.rules` – Complete rule definitions
- `functions/src/config/corsConfig.ts` – CORS implementation
