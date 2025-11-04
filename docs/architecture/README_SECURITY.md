# TarkovTracker Security Documentation

This directory contains comprehensive security analysis and documentation for the TarkovTracker application.

## Documentation Files

### 1. [SECURITY_QUICK_REFERENCE.md](./SECURITY_QUICK_REFERENCE.md) - START HERE

**Size**: 8 KB | **Reading Time**: 10 minutes

A practical quick-start guide for developers. Contains:
- At-a-glance security overview
- Critical file locations
- Authentication flow diagram
- Three-permission model (GP, TP, WP)
- Rate-limiting tiers visualization
- Input validation rules
- Firestore rules by collection
- Error status codes
- Testing examples with curl
- Security checklist for new endpoints
- Common security scenarios

**When to use**: 
- You're implementing a new API endpoint
- You're testing security features
- You're new to the team
- You need a quick reference

---

### 2. [SECURITY_SUMMARY.txt](./SECURITY_SUMMARY.txt) - VISUAL REFERENCE

**Size**: 16 KB | **Reading Time**: 20 minutes

Formatted reference document with ASCII diagrams and tables. Contains:
- Authentication & authorization overview
- Complete middleware chain (8-layer diagram)
- Firestore security rules by collection (table)
- Rate-limiting configuration (table)
- Input validation examples (table)
- CORS origin validation rules
- Error response format
- Security best practices checklist
- Key file locations
- Key security statistics

**When to use**:
- You need to look something up quickly
- You're preparing a presentation
- You want a high-level visual overview
- You're reviewing code

---

### 3. [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md) - DEEP DIVE

**Size**: 23 KB | **Reading Time**: 45 minutes

Comprehensive technical analysis. Contains 14 sections:
1. Security frameworks & libraries
2. Authentication & authorization architecture
3. Firestore security rules (detailed)
4. API-level input validation
5. Rate-limiting & abuse protection
6. CORS & origin validation
7. Frontend security patterns
8. Data flow diagram
9. Secure coding patterns
10. Key security strengths
11. Data protection measures
12. Potential considerations
13. Best practices implemented
14. Testing & validation coverage

Plus a complete summary section.

**When to use**:
- You need to understand why something was implemented
- You're doing a security code review
- You're onboarding a new team member
- You're auditing security practices
- You're designing a new feature

---

### 4. [CORS_SECURITY.md](./CORS_SECURITY.md) - CORS DETAILS

**Size**: 1.8 KB | **Reading Time**: 5 minutes

Focused documentation on CORS configuration. Contains:
- Bearer token security context
- CORS validation logic
- Origin blocking patterns
- Environment-based policies

**When to use**:
- You're dealing with cross-origin requests
- You're understanding CORS configuration
- You're troubleshooting origin-related issues

---

## Quick Navigation

### By Role

#### API Developer

1. Read: SECURITY_QUICK_REFERENCE.md (Implementation section)
2. Reference: SECURITY_SUMMARY.txt (Middleware chain, error codes)
3. Check: SECURITY_ARCHITECTURE.md (Sections 2-4)

#### Security Auditor

1. Read: SECURITY_ARCHITECTURE.md (full)
2. Cross-reference: SECURITY_SUMMARY.txt (checklist)
3. Verify: Code files in `/functions/src/middleware/`

#### DevOps / Infrastructure

1. Read: SECURITY_QUICK_REFERENCE.md (Environment variables)
2. Reference: SECURITY_SUMMARY.txt (Rate-limiting config)
3. Check: SECURITY_ARCHITECTURE.md (Section 5)

#### New Team Member

1. Start: SECURITY_QUICK_REFERENCE.md (At a Glance)
2. Visual: SECURITY_SUMMARY.txt (Diagrams)
3. Deep dive: SECURITY_ARCHITECTURE.md (as needed)

#### Tech Lead / Architect

1. Read: SECURITY_ARCHITECTURE.md (all sections)
2. Cross-check: SECURITY_SUMMARY.txt (Summary section)
3. Reference: SECURITY_QUICK_REFERENCE.md (Checklist)

### By Task

#### Understanding Bearer Token Flow

- SECURITY_QUICK_REFERENCE.md (Authentication Flow section)
- SECURITY_ARCHITECTURE.md (Section 2.1)
- SECURITY_SUMMARY.txt (Middleware Chain diagram)

#### Adding a New API Endpoint

- SECURITY_QUICK_REFERENCE.md (Security Checklist)
- SECURITY_ARCHITECTURE.md (Section 9 - Patterns)
- SECURITY_SUMMARY.txt (Error codes, rate limiting)

#### Troubleshooting 401 / 403 / 429 Errors

- SECURITY_SUMMARY.txt (Error Response Format)
- SECURITY_QUICK_REFERENCE.md (Testing section)
- SECURITY_ARCHITECTURE.md (Middleware chain)

#### Configuring Rate Limiting

- SECURITY_QUICK_REFERENCE.md (Environment Variables)
- SECURITY_SUMMARY.txt (Rate Limiting Config table)
- SECURITY_ARCHITECTURE.md (Section 5)

#### Understanding Firestore Access Control

- SECURITY_ARCHITECTURE.md (Section 3)
- SECURITY_SUMMARY.txt (Firestore Rules table)
- Code: `/firestore.rules`

---

## Key Concepts

### Authentication Methods (2)

1. **Bearer Tokens** - API access (document ID in Firestore)
2. **Firebase ID Tokens** - Sensitive operations (account deletion)

### Authorization Levels (3)

- **GP** - Get Progress (read-only)
- **TP** - Team Progress (read team data)
- **WP** - Write Progress (modify own data)

### Middleware Layers (8)

```
1. CORS Validation
2. Body Parser (1MB limit)
3. Bearer Token Verification
4. Rate Limiting
5. Permission Checking
6. Input Validation
7. Service + Firestore Rules
8. Error Handler
```

### Rate Limiting

- Window: 10 seconds (configurable)
- Threshold: 150 requests (configurable)
- Progressive: Warning → Blocking

### Input Validation

- Types: integers, strings, enums
- Ranges: Level 1-79, Edition 1-6
- Sanitization: Remove HTML chars
- Trimming: All strings trimmed

### Firestore Collections (5)

- `progress/{userId}` - Game progress
- `token/{tokenId}` - API tokens
- `team/{teamId}` - Team info
- `system/{userId}` - System data
- `user/{userId}` - Preferences

---

## Files Referenced in Documentation

### Core Security Middleware

```
functions/src/middleware/
  ├── auth.ts                 # Bearer token validation
  ├── abuseGuard.ts           # Rate-limiting
  ├── permissions.ts          # Permission checking
  ├── reauth.ts               # Recent auth verification
  ├── errorHandler.ts         # Error handling
  └── onRequestAuth.ts        # Firebase auth wrapper
```

### Validation & Services

```
functions/src/services/
  ├── ValidationService.ts    # Input validation
  ├── TokenService.ts         # Token management
  ├── ProgressService.ts      # Progress operations
  └── TeamService.ts          # Team operations
```

### Configuration

```
functions/src/
  ├── config/corsConfig.ts    # CORS validation
  ├── config/features.ts      # Feature flags
  └── app/app.ts              # Express setup
```

### Database

```
firestore.rules              # Security rules
```

### Frontend

```
frontend/src/
  ├── plugins/firebase.ts     # Firebase init
  ├── utils/DataValidationService.ts
  ├── utils/errorHandler.ts
  └── composables/api/useTarkovApi.ts
```

---

## Best Practices Summary

- Multi-layer defense (frontend → API → database)
- Least privilege access
- Fail-closed on invalid input
- Secure token generation (crypto module)
- Configurable rate limiting
- Type-safe validation
- Consistent error handling
- Audit logging with redaction
- Transactional operations
- Token revocation support

---

## Environment Variables (Security-Related)

```bash
# Rate Limiting
ABUSE_GUARD_WINDOW_MS=10000
ABUSE_GUARD_THRESHOLD=150
ABUSE_GUARD_WARN_RATIO=0.8
ABUSE_GUARD_BREACH_LIMIT=2
ABUSE_GUARD_HISTORY_RESET_MS=60000
ABUSE_GUARD_METHODS=POST,PUT,PATCH,DELETE
ABUSE_GUARD_PATH_PREFIXES=/api/progress,/api/team
ABUSE_GUARD_COLLECTION=rateLimitEvents

# Firebase (development)
VITE_DEV_AUTH=true|false
NODE_ENV=development|production
```

---

## Monitoring & Alerts

### Logs to Monitor

- Firebase Functions logger for auth failures
- Firestore `rateLimitEvents` collection
- Error responses in development

### Recommended Alerts

- Multiple 401 errors from single IP
- Multiple 429 errors from token
- Firestore rule denials
- Unhandled 500 errors

---

## Maintenance

Keep documentation updated when:
- Adding authentication methods
- Changing rate limiting
- Modifying validation rules
- Adding/removing collections
- Updating middleware
- Changing error patterns

---

## Document History

| Date | Document | Description |
|------|----------|-------------|
| 2025-11-03 | SECURITY_ARCHITECTURE.md | Initial comprehensive analysis |
| 2025-11-03 | SECURITY_SUMMARY.txt | Visual reference with diagrams |
| 2025-11-03 | SECURITY_QUICK_REFERENCE.md | Practical developer guide |
| 2025-11-03 | README_SECURITY.md | This index and navigation guide |

---

## Questions?

Refer to the appropriate document:
- **"How do I...?"** → SECURITY_QUICK_REFERENCE.md
- **"What's the...?"** → SECURITY_SUMMARY.txt
- **"Why did they...?"** → SECURITY_ARCHITECTURE.md
- **"Show me..."** → SECURITY_SUMMARY.txt (diagrams/tables)

## External References

- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)

---

**Last Updated**: November 2, 2024  
**Status**: Complete  
**Coverage**: Authentication, Authorization, Validation, Rate Limiting, CORS, Error Handling
