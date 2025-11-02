# TarkovTracker Security Architecture Analysis

## Executive Summary

TarkovTracker implements a **multi-layered security architecture** using Firebase as the primary infrastructure with Express.js middleware for API security. The application uses Bearer token authentication for API access, Firestore security rules for database-level access control, and comprehensive input validation at both frontend and backend layers.

---

## 1. Security Frameworks & Libraries in Use

### Backend (Functions)
- **Firebase Admin SDK** (`firebase-admin@^13.5.0`)
  - Handles Firebase authentication verification and token validation
  - Manages Firestore operations with admin privileges
  - Provides server-side auth context

- **Express.js** (`express@^5.1.0`)
  - HTTP server framework with middleware-based security patterns
  - CORS handling with origin validation
  - Body parser with size limits (1MB max)

- **Node.js Crypto** (built-in)
  - Secure random token generation using `crypto.getRandomValues()` and `crypto.randomBytes()`
  - SHA-256 hashing for rate limiting key generation

### Frontend (Vue 3 SPA)
- **Firebase JavaScript SDK** (`firebase@^12.5.0`)
  - Client-side authentication with Google and GitHub OAuth providers
  - Firestore client SDK with real-time listeners
  - Cloud Functions client integration

- **Vue 3** with Composition API
  - Reactive state management with Pinia
  - Input validation services (DataValidationService)

### Validation Libraries
- **Custom Validation Service** (ValidationService.ts)
  - Type-safe parameter validation
  - Enum-based status validation
  - Numeric range validation (levels, editions, etc.)

---

## 2. Authentication & Authorization Architecture

### 2.1 Backend API Authentication (Bearer Tokens)

**File**: `/functions/src/middleware/auth.ts`

```typescript
// Two-tier authentication system:
// 1. Bearer Token Validation
// 2. Firebase ID Token Verification (for sensitive operations)
```

#### Bearer Token Flow
1. Client sends: `Authorization: Bearer <token>`
2. Middleware validates token format and extracts token string
3. TokenService looks up token in Firestore `token` collection
4. Token data (owner, permissions, gameMode) attached to request
5. Subsequent middleware checks permissions

**Key Security Features**:
- Token stored as document ID (Firestore)
- Owner validation on every token operation
- Async call counter increment (non-blocking)
- Token revocation via document deletion
- Permissions validated as array membership

**Source**: `/functions/src/services/TokenService.ts`

#### Firebase ID Token Verification (Sensitive Operations)
Used for account deletion (`requireRecentAuth` middleware):
- Verifies Firebase ID token with revocation check
- Checks authentication recency (within 5 minutes)
- Prevents token replay after revocation

**Source**: `/functions/src/middleware/reauth.ts`

### 2.2 Frontend Authentication

**File**: `/frontend/src/plugins/firebase.ts`

- Firebase Authentication with OAuth providers (Google, GitHub)
- Auth state management in reactive `fireuser` object
- Mock auth for development (`VITE_DEV_AUTH=true`)
- Emulator support for local dev with disabled warnings
- Analytics only enabled in production with user consent

### 2.3 Authorization Patterns

#### Permission-Based Access Control
- **Permissions**: `'GP'` (Get Progress), `'TP'` (Team Progress), `'WP'` (Write Progress)
- **Middleware**: `requirePermission(permission)` factory function
- **Validation**: Array membership check on token permissions

**Routes with Permission Checks**:
```
GET  /api/progress           → requires 'GP'
GET  /api/team/progress      → requires 'TP'
POST /api/progress/level/:id → requires 'WP'
POST /api/progress/task/:id  → requires 'WP'
```

#### Role-Based Game Mode Restrictions
- Tokens have `gameMode`: `'pvp'`, `'pve'`, or `'dual'`
- Single-mode tokens enforce strict game mode
- Dual-mode tokens allow query parameter override
- Firestore rules validate game mode structure

---

## 3. Firestore Security Rules

**File**: `/firestore.rules`

### Database Collections & Access Control

#### 1. **system/{userId}** - User System Data
```
Permissions: Read/Write only by user
Usage: Store team membership, tokens array
Protection: User ID ownership check
```

#### 2. **progress/{userId}** - User Progress Data
```
Create/Update: User ID match + validUserData()
Read: User OR same team member
Delete: User ID match
Validation:
  - Must have: currentGameMode, gameEdition, pvp, pve
  - currentGameMode in ['pvp', 'pve']
  - gameEdition: 1-6
  - pmcFaction: 'USEC' or 'BEAR'
```

#### 3. **user/{userId}** - UI Preferences
```
Permissions: Read/Write only by user
Usage: Store UI settings, preferences
```

#### 4. **token/{tokenId}** - API Tokens
```
Create: User owns token + required fields present
Read: Token owner only
Update: Owner only, limited to 'calls' and 'note' fields
Delete: Owner only
Protected Fields: owner, permissions, createdAt (immutable after creation)
```

#### 5. **team/{teamId}** - Team Information
```
Create: User is owner + valid structure + max members ≤ 50
Read: Team members or owner
Update: 
  - Owner: update members/maximumMembers
  - Members: self-removal only
Delete: Owner only
Validation:
  - memberOfTeam(): Check user in members array or is owner
  - memberOfSameTeam(): Verify both users in same team via system doc
```

### Key Security Rules
1. **Owner-based access**: Most resources check `request.auth.uid == resource.data.owner`
2. **Team-based collaboration**: Members can read team progress
3. **Field-level restrictions**: Certain fields (owner, createdAt) prevent updates
4. **Size limits**: Teams capped at 50 members
5. **Structural validation**: Game data validated on write

---

## 4. API-Level Input Validation

### 4.1 Request Validation Strategy

**File**: `/functions/src/services/ValidationService.ts`

#### Type-Safe Validators
```typescript
// Task Status Validation
validateTaskStatus(status): 'completed' | 'failed' | 'uncompleted'

// Numeric Range Validation
validateLevel(level): 1-79
validateGameEdition(edition): 1-6

// String Validation
validateTaskId(id): non-empty string, trimmed
validateDisplayName(name): 1-50 chars, sanitized of HTML chars

// Permission Validation
validatePermissions(permissions): ['GP', 'TP', 'WP'] allowed
validateTaskUpdate(body): { state: TaskStatus } required

// Array Validation
validateMultipleTaskUpdate(body): Array of { id, state } with min 1 item
```

#### Request Body Validators
1. **Task Updates**: Single task with state validation
2. **Multiple Tasks**: Array validation with per-item checks
3. **Objectives**: State and count validation (count must be non-negative integer)
4. **Batch Operations**: Size limits enforced

### 4.2 Sanitization Patterns

**Display Names**:
```typescript
// Remove potentially harmful characters
sanitized.replace(/[<>"'&]/g, '')
```

**Input Trimming**:
- All string inputs trimmed
- Empty strings rejected
- Length limits enforced

### 4.3 Error Handling & Validation Responses

**File**: `/functions/src/middleware/errorHandler.ts`

```typescript
// Consistent error response format
{
  success: false,
  error: "Human-readable message",
  meta: {
    code: "ERROR_CODE",
    timestamp: "ISO-8601",
    stack: "development only",
    context: "development only"
  }
}
```

**Status Codes**:
- `400` - Bad Request (validation failures)
- `401` - Unauthorized (auth failures, missing token)
- `403` - Forbidden (permission denied, CORS blocked)
- `404` - Not Found (resource missing)
- `422` - Unprocessable Entity
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## 5. Rate Limiting & Abuse Protection

**File**: `/functions/src/middleware/abuseGuard.ts`

### Rate Limiting Strategy

#### Configuration (Environment Variables)
```
ABUSE_GUARD_WINDOW_MS: 10,000ms (1-60s range)
ABUSE_GUARD_THRESHOLD: 150 requests (20-2000 range)
ABUSE_GUARD_WARN_RATIO: 0.8 (80% threshold triggers warning)
ABUSE_GUARD_BREACH_LIMIT: 2 (consecutive breaches before blocking)
ABUSE_GUARD_HISTORY_RESET_MS: 60,000ms (resets breach history)
ABUSE_GUARD_METHODS: POST,PUT,PATCH,DELETE (protected HTTP methods)
ABUSE_GUARD_PATH_PREFIXES: /api/progress,/api/team
```

#### Throttling Mechanism
1. **Request Counting**: Tracks hits per token (hashed) or IP
2. **Warning Phase**: At 80% of threshold, emits warning event
3. **Blocking Phase**: On second consecutive breach, blocks for WINDOW_MS
4. **Logging**: All violations logged to Firestore `rateLimitEvents` collection

#### Cache Key Resolution (Priority Order)
1. **Token-based**: Hash of Bearer token (if present)
2. **IP-based**: X-Forwarded-For header or request IP
3. **Skip**: If no identifier found

#### Event Recording
- Logs to Firestore with: type, method, path, tokenOwner, blockDuration, consecutiveBreaches
- Firebase Functions logger captures real-time alerts
- Development mode: all violations logged

---

## 6. CORS & Origin Validation

**File**: `/functions/src/config/corsConfig.ts`

### Origin Validation Strategy

#### Dangerous Pattern Detection
```
1. 'null' origin (sandboxed iframes)
2. 'file:' protocol (file:// local access)
3. localhost / 127.0.0.1 (loopback, dev-only)
4. Private IP ranges: 192.168.*, 10.*, 172.16-31.*
5. Invalid protocols (non-http/https)
6. Embedded credentials in URL (username:password@)
7. Double dots in hostname (..)
```

#### Environment-Based Policy
- **Production**: All suspicious origins blocked, whitelist disabled
- **Development**: Localhost origins allowed, suspicious patterns warned

#### CORS Header Configuration
```
Access-Control-Allow-Origin: Validated origin or wildcard
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Vary: Origin (cache awareness)
```

#### Express CORS Middleware
```
credentials: false (Bearer tokens don't use cookies)
optionsSuccessStatus: 200 (handle OPTIONS preflight)
methods: GET, POST, PUT, DELETE, OPTIONS
allowedHeaders: Content-Type, Authorization, X-Requested-With
```

---

## 7. Frontend Security Patterns

### 7.1 Client-Side Input Validation

**File**: `/frontend/src/utils/DataValidationService.ts`

```typescript
// JSON Import Validation
validateImportData(jsonString):
  - Parse JSON safely
  - Check type === 'tarkovtracker-migration'
  - Verify data structure
  - Validate level is number
  - Return null on any error
```

### 7.2 Error Handling

**File**: `/frontend/src/utils/errorHandler.ts`

- Centralized error collection (up to 50 errors in memory)
- Safe error stringification (prevents circular references)
- Context-aware error tracking (component, operation)
- User ID integration for debugging
- Development-only detailed stack traces

### 7.3 Firebase Configuration

**File**: `/frontend/src/plugins/firebase.ts`

- Environment variable validation at startup
- Required env vars: apiKey, authDomain, projectId, storageBucket, etc.
- Analytics disabled by default, opt-in only in production
- Emulator support for local development
- Graceful fallback if emulators unavailable

### 7.4 API Integration

**File**: `/frontend/src/composables/api/useTarkovApi.ts`

- Bearer token sent in Authorization headers
- Cache strategy with TTL (6-hour default)
- IndexedDB for persistent caching
- Retry logic with exponential backoff
- Error recovery and fallback data

---

## 8. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Vue 3 + Firebase)                  │
│                                                                   │
│  User Input → Validation Service → API Composable                │
│                                 ↓                                 │
│                  Bearer Token (Firebase ID Token)                │
│                  Authorization: Bearer <token>                   │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
                        HTTPS/CORS Validation
                          validateOrigin()
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND (Express.js + Firebase)                 │
│                                                                   │
│  1. OPTIONS Preflight Bypass                                     │
│  2. CORS Header Validation                                       │
│  3. Body Parser (JSON, max 1MB)                                  │
│  4. verifyBearer Middleware                                      │
│     → Extract token from Authorization header                    │
│     → Query Firestore 'token' collection                         │
│     → Attach req.apiToken (owner, permissions, gameMode)        │
│  5. abuseGuard Middleware                                        │
│     → Cache key: hashed token OR IP                              │
│     → Track hits per window (default 10s)                        │
│     → Warn at 80% threshold                                      │
│     → Block on 2nd consecutive breach                            │
│  6. requirePermission Middleware                                 │
│     → Check token.permissions includes required permission      │
│  7. Route Handler (with ValidationService)                       │
│     → Validate path params, query params, body                   │
│     → Type-safe enum/range checks                                │
│     → Sanitize inputs                                            │
│  8. Service Layer (ProgressService, TeamService, etc.)           │
│     → Query Firestore collections                                │
│     → Firestore Rules enforce ownership/team checks              │
│     → Return formatted response                                  │
│  9. Error Handler Middleware                                     │
│     → Catch async errors                                         │
│     → Format error response                                      │
│     → Log with context                                           │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                     FIRESTORE DATABASE                           │
│                                                                   │
│  Collections (with security rules):                              │
│  - progress/{userId}    → Validates gameMode structure           │
│  - token/{tokenId}      → Owner-only access                      │
│  - team/{teamId}        → Team member access                     │
│  - system/{userId}      → User-only access                       │
│  - user/{userId}        → User-only access                       │
│                                                                   │
│  RateLimitEvents (optional tracking)                             │
│  - Records blocked/warned requests                               │
│  - Tracks consecutive breaches per user/IP                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Secure Coding Patterns Used

### 9.1 Token Management
- **Cryptographic Generation**: Uses `crypto.getRandomValues()` or `crypto.randomBytes()`
- **Secure Storage**: Tokens stored as Firestore doc IDs (not readable in plain text)
- **Token Versioning**: gameMode support, permissions array
- **Async Operations**: Non-blocking token call counter updates
- **Revocation**: Simple deletion, checked on every request

### 9.2 Permission Enforcement
- **Declarative**: `@requirePermission('GP')` middleware
- **Consistent**: Array membership check across all handlers
- **Typed**: Enum-like permission values
- **Auditable**: Logged with owner and context

### 9.3 Database Operations
- **Transactional**: TokenService uses `db.runTransaction()` for atomic updates
- **Async Handlers**: `asyncHandler()` wrapper catches Promise rejections
- **Error Propagation**: ApiError types bubble up properly
- **Logging**: Operation context logged with user ID, not sensitive data

### 9.4 Input Validation
- **Fail-Closed**: Invalid input returns 400 Bad Request
- **Type-Safe**: TypeScript enums for status values
- **Boundary Checking**: Range validation (level 1-79, edition 1-6)
- **Sanitization**: HTML-like chars removed from display names
- **Trimming**: All strings trimmed, empty strings rejected

### 9.5 Error Handling
- **Consistent Format**: All errors use ApiError class
- **Precise Messages**: Error codes for client-side handling
- **Debug Info**: Stack traces only in development
- **Redaction**: Token strings partially logged (first 8 chars + '...')

### 9.6 Logging Practices
- **User Context**: Logged with owner/user ID when available
- **Sensitivity Aware**: No full tokens, passwords, or secrets logged
- **Structured**: Firebase Functions logger with context objects
- **Level Appropriate**: warn for 4xx, error for 5xx

---

## 10. Key Security Strengths

1. **Multi-Layer Defense**
   - Frontend validation + backend validation + database rules
   - Different attack vectors blocked at different layers

2. **Bearer Token Security**
   - Not vulnerable to CSRF (browsers don't auto-send them)
   - Proper Authorization header format validation
   - Cryptographically secure generation

3. **Rate Limiting**
   - Configurable thresholds via environment variables
   - Per-token AND per-IP tracking
   - Progressive enforcement (warning → blocking)
   - Breach history prevents rapid abuse

4. **Firebase Ecosystem**
   - Admin SDK handles token verification securely
   - Firestore rules provide database-level access control
   - Built-in auth state management

5. **Input Validation**
   - Type-safe enums and ranges
   - Sanitization of user-facing strings
   - Array bounds checking
   - Consistent error responses

6. **Middleware Chain**
   - Clear separation of concerns
   - Composable permission checks
   - Error handler catches all async errors
   - Proper HTTP status codes

---

## 11. Data Protection Measures

### 11.1 Authentication Data
- Passwords: Managed by Firebase Authentication (hashed, salted)
- ID Tokens: Short-lived, verified with revocation check on sensitive ops
- API Tokens: Document ID (not queryable directly, owner verified)

### 11.2 User Data (Firestore)
- Progress: Encrypted at rest by Google Cloud (managed)
- Team Info: Visible only to team members
- Preferences: Private to user
- Call Counts: Incremented asynchronously (eventual consistency acceptable)

### 11.3 Logging
- Partial token hashes (first 8 chars + '...')
- Error IDs (UUID format) for client reference
- User IDs logged with operations for audit trail
- Sensitive fields (passwords) never logged

### 11.4 Transport Security
- HTTPS enforced (Firebase Hosting + Cloud Functions)
- CORS validation prevents cross-origin abuse
- Origin validation blocks private IPs in production
- Body size limits (1MB) prevent DoS via large uploads

---

## 12. Potential Security Considerations

### 12.1 Current Protections
- ✅ Bearer token validation on every request
- ✅ Rate limiting with progressive enforcement
- ✅ Firestore rules for data access control
- ✅ Input validation (types, ranges, sanitization)
- ✅ Permission-based authorization
- ✅ CORS origin validation
- ✅ Error handling with redaction

### 12.2 Defense Depth Notes
1. **If Rate Limiting Fails**: API throttling may still protect via Firebase quota
2. **If Token Leaked**: Revocation via Firestore delete, checked on each request
3. **If Auth Bypassed**: Firestore rules still enforce ownership checks
4. **If Input Validation Fails**: Firestore rules validate gameMode structure
5. **If CORS Fails**: Browser enforces same-origin policy

### 12.3 Monitoring & Alerting
- Rate limit events logged to Firestore for analysis
- Firebase Functions logger captures all security events
- Error responses include error IDs for debugging
- Development mode includes stack traces for investigation

---

## 13. Security Best Practices Implemented

1. ✅ **Least Privilege**: Users access only their own data or shared team data
2. ✅ **Defense in Depth**: Multiple validation layers (frontend, API, database)
3. ✅ **Fail Closed**: Invalid input rejected at earliest stage
4. ✅ **Secure Defaults**: Production disables suspicious origins, analytics off
5. ✅ **Audit Logging**: Operations logged with user context
6. ✅ **Error Handling**: Consistent, sanitized responses
7. ✅ **Token Management**: Secure generation, revocation, immutable creation
8. ✅ **Rate Limiting**: Configurable, progressive, with history tracking
9. ✅ **Input Sanitization**: HTML chars removed, strings trimmed
10. ✅ **Type Safety**: TypeScript enums prevent invalid values

---

## 14. Testing & Validation Coverage

### 14.1 Existing Tests
- **Auth Middleware**: `/functions/test/middleware/auth.test.ts`
- **Abuse Guard**: `/functions/test/middleware/abuseGuard.test.ts`
- **Input Validation**: `/functions/test/` suite
- **Frontend**: `/frontend/src/utils/__tests__/DataValidationUtils.spec.ts`
- **API Integration**: `/functions/test/apiv2.test.js`

### 14.2 Test Pattern
- Unit tests for middleware behavior
- Integration tests for full request flow
- Mock Firebase Admin for isolated testing
- TypeScript types ensure compile-time safety

---

## Summary

TarkovTracker implements a **robust, multi-layered security architecture** that combines:
- **Bearer token authentication** for API access
- **Firestore rules** for database-level access control
- **Input validation** at multiple stages (frontend, API, database)
- **Rate limiting** with configurable thresholds
- **CORS validation** with dangerous pattern detection
- **Permission-based authorization** with three permission levels
- **Comprehensive error handling** with proper status codes
- **Audit logging** with user context and redaction

The security model is well-suited for a collaborative game progress tracker where:
- Users have private data (their own progress)
- Users have shared data (team progress)
- Users can generate API tokens with scoped permissions
- API endpoints are protected by multiple validation layers
- Database rules enforce ownership and team constraints

