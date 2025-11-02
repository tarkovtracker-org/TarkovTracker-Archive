# TarkovTracker Security Quick Reference

## At a Glance

**Type**: Multi-layered security using Firebase + Express.js  
**Auth**: Bearer tokens + Firebase ID tokens  
**Database**: Firestore with security rules  
**Rate Limiting**: Configurable per token/IP  
**Input Validation**: Type-safe, sanitized  

---

## Critical Security Files

| File | Purpose |
|------|---------|
| `/functions/src/middleware/auth.ts` | Bearer token validation |
| `/functions/src/middleware/abuseGuard.ts` | Rate limiting |
| `/functions/src/services/ValidationService.ts` | Input validation |
| `/firestore.rules` | Database access control |
| `/functions/src/config/corsConfig.ts` | CORS origin validation |

---

## Authentication Flow (API)

```
Client                          Backend                         Firestore
  │                               │                                │
  ├─ Authorization: Bearer <tok>→ │                                │
  │                               ├─ Validate format               │
  │                               ├─────────────────────────────→  │
  │                               │  Query 'token' collection      │
  │                         ←─────┼─────────────────────────────  │
  │                               │  Return token data             │
  │                               │  (owner, permissions, gameMode)│
  │                               │                                │
  │  ← 200 Success or error ─────┤                                │
```

---

## Three-Permission Model

- **GP** (Get Progress): Read-only access to user's own progress
- **TP** (Team Progress): Read team progress data
- **WP** (Write Progress): Modify user's own progress

Token can have any combination: `['GP']`, `['GP', 'WP']`, `['TP']`, etc.

---

## Rate Limiting Tiers

```
┌─ First Breach ──────┐
│  (Count > Threshold)│  → Log event, continue
└────────────────────┘
           ↓
┌─ Second Breach ─────┐
│  (within history)   │  → Block for WINDOW_MS
└────────────────────┘     Send 429 error
           ↓
┌─ After Block ───────┐
│  (history resets)   │  → Clear count, start again
└────────────────────┘
```

**Key Config**:
- Default window: 10 seconds
- Default threshold: 150 requests
- Default breach limit: 2 consecutive

---

## Input Validation Rules

| Input | Type | Range | Sanitization |
|-------|------|-------|--------------|
| level | integer | 1-79 | — |
| gameEdition | integer | 1-6 | — |
| pmcFaction | enum | USEC, BEAR | — |
| taskStatus | enum | completed, failed, uncompleted | — |
| displayName | string | 1-50 chars | Remove `<>"'&` |
| permissions | array | GP, TP, WP | — |

---

## Firestore Rules by Collection

### progress/{userId}
- **Create/Update**: `request.auth.uid == userId` + valid structure
- **Read**: User OR same team member
- **Delete**: User only
- **Validates**: gameMode, gameEdition, faction structure

### token/{tokenId}
- **Create**: Owner match + required fields
- **Read/Update/Delete**: Owner only
- **Protected**: owner, permissions, createdAt (immutable)

### team/{teamId}
- **Create**: Owner match + max 50 members
- **Read**: Team members only
- **Update**: Owner (members) OR member (self-remove)
- **Delete**: Owner only

---

## Error Status Codes

| Code | Meaning | When |
|------|---------|------|
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | Auth failed/missing |
| 403 | Forbidden | Permission denied |
| 404 | Not Found | Resource missing |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Unhandled exception |

---

## CORS Origins

**Blocked**:
- Sandboxed (`null`)
- File protocol (`file://`)
- Private ranges (192.168.*, 10.*, etc.) in production
- Suspicious formats

**Allowed**:
- HTTPS origins in production
- Localhost variants in development

---

## Token Management Best Practices

1. **Generate**: Use `TokenService.createToken()` (crypto.getRandomValues)
2. **Store**: Never show full token after generation
3. **Revoke**: Delete from `token` collection immediately
4. **Validate**: Checked on every request
5. **Permissions**: Start with minimal (e.g., GP only)
6. **Rotation**: Generate new token, revoke old

---

## Middleware Chain Order

```
1. CORS validation
2. Body parser
3. verifyBearer (auth)
4. abuseGuard (rate limit)
5. requirePermission (scope)
6. Input validation (handler)
7. Service + Firestore rules
8. Error handler
```

---

## Testing Auth/Validation

### Test Bearer Token
```bash
curl -H "Authorization: Bearer <token>" https://api.example.com/api/progress
```

### Test Missing Permission
```bash
# Token with only 'GP' permission trying 'WP' endpoint
curl -X POST \
  -H "Authorization: Bearer <token>" \
  https://api.example.com/api/progress/task/123 \
  -d '{"state":"completed"}'
# Response: 403 Forbidden - Missing required permission: WP
```

### Test Rate Limiting
```bash
# Rapid requests to same endpoint
for i in {1..200}; do
  curl -H "Authorization: Bearer <token>" https://api.example.com/api/progress
done
# After 150 requests: 429 Too Many Requests
```

### Test Input Validation
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  https://api.example.com/api/progress/level/999 \
  -d '{}'
# Response: 400 Bad Request - Level must be between 1 and 79
```

---

## Common Security Scenarios

### Scenario: Token Leaked
**Response**: Revoke immediately
- Delete from `token` collection
- Checked on next API request
- Attacker gets 401 Unauthorized

### Scenario: Brute Force Attack
**Response**: Rate limiter activates
- First breach: Warning logged
- Second breach: 429 response + 10s block
- Tracks per token hash OR per IP

### Scenario: Invalid Input
**Response**: Rejected at API layer
- ValidationService checks type/range
- Returns 400 Bad Request
- Firestore rules provide second layer

### Scenario: Unauthorized Data Access
**Response**: Firestore rules enforce
- Token has correct permissions
- But user tries accessing other user's data
- Firestore denies, returns 403

---

## Security Checklist for New Endpoints

- [ ] Add `requirePermission()` middleware
- [ ] Use `ValidationService` for inputs
- [ ] Check ownership in handler
- [ ] Log operations with user context
- [ ] Add to `abuseGuard.PATH_PREFIXES` if mutation
- [ ] Add Firestore rule for collection
- [ ] Write unit tests for validation
- [ ] Test with invalid data
- [ ] Verify permission checks

---

## Monitoring

**Logs to check**:
- Firebase Functions logger: auth failures, rate limit breaches
- Firestore `rateLimitEvents` collection: abuse attempts
- Error responses: stack traces in development

**Alerts** (recommend setting up):
- Multiple 401 errors from single IP
- Multiple 429 errors from token
- Firestore rule denials
- Unhandled 500 errors

---

## Environment Variables for Security

```bash
# Rate Limiting
ABUSE_GUARD_WINDOW_MS=10000          # Window size (ms)
ABUSE_GUARD_THRESHOLD=150            # Requests per window
ABUSE_GUARD_WARN_RATIO=0.8           # Warn at 80%
ABUSE_GUARD_BREACH_LIMIT=2           # Blocks after N breaches
ABUSE_GUARD_HISTORY_RESET_MS=60000   # Clear history after (ms)
ABUSE_GUARD_METHODS=POST,PUT,DELETE  # Protected methods
ABUSE_GUARD_PATH_PREFIXES=/api/progress,/api/team

# Firebase (from .env)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
# ... other Firebase config

# Development
VITE_DEV_AUTH=true|false            # Mock auth for dev
NODE_ENV=development|production
```

---

## Further Reading

- **Full Analysis**: See `SECURITY_ARCHITECTURE.md`
- **Visual Summary**: See `SECURITY_SUMMARY.txt`
- **CORS Details**: See `CORS_SECURITY.md`
- **Code**: `/functions/src/middleware/`, `/functions/src/services/`

