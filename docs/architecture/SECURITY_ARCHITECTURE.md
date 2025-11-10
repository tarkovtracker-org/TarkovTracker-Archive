# TarkovTracker Security Architecture

The backend serves a guarded Express API backed by Firebase while the frontend keeps
inputs valid and secrets scoped. This guide links the code-level guards that make the
layered design reliable.

## 1. Authentication & authorization

- `/functions/src/middleware/auth.ts` validates bearer tokens stored in Firestore
  (`token/{tokenId}`) and attaches `req.apiToken` (owner, permissions, gameMode).
- `requirePermission()` (`functions/src/middleware/permissions.ts`) enforces the
  three-letter scopes (`GP`, `TP`, `WP`) before handlers run.
- Sensitive operations (account deletion) also verify Firebase ID tokens via
  `/functions/src/middleware/reauth.ts`.
- Tokens live in Firestore with owners, creation metadata, and immutable permission sets.

## 2. Firestore rules (see `firestore.rules`)

- System, progress, user, token, and team collections enforce ownership and data
  structure (`validUserData()`, `validGameModeData()`).
- Team rules cap members at 50, allow owner updates, and let members remove themselves
  without handing over ownership.
- The token rules only expose sensitive fields to the owner and lock down updates to
  `calls` and `note`.
- Progress reads are permitted for the owner or team members (via `memberOfSameTeam`).

## 3. Middleware & validation

- `abuseGuard` (`functions/src/middleware/abuseGuard.ts`) enforces a configurable
  window, threshold, and double-breach block; events are logged to `rateLimitEvents`.
- `ValidationService` (`functions/src/services/ValidationService.ts`) bounds levels,
  editions, factions, task states, and sanitizes strings before handlers call Firestore.
- `errorHandler.ts` formats responses consistently with `success`, `error`, and `meta`.
- CORS is handled by `functions/src/config/corsConfig.ts`, which rejects bad origins before
  Express even sees the request.

## 4. Frontend security patterns

- Firebase auth is initialized in `frontend/src/plugins/firebase.ts` with emulator support
  and mock auth for local work (`VITE_DEV_AUTH`).
- Reputation-critical utilities live in `frontend/src/utils` (`DataValidationService.ts`,
  `errorHandler.ts`, `lruCache`, etc.) and all bundled inputs go through them.
- API tokens use the same bearer format on the client, so CFRS doesn’t automatically
  include credentials; the backend still validates origins and rate limits.
- The Firestore cache helpers (`useFirestoreTarkovItems`, future `useFirestore*` helpers)
  keep the frontend from revalidating GraphQL tokens on every load.

## 5. Monitoring & runs

- Rate-limit violations, blocked origins, and unexpected validation failures are logged
  with context to Firebase Functions logs and the `rateLimitEvents` collection.
- Environment variables (`ABUSE_GUARD_*`, `NODE_ENV`, Firebase config) control thresholds,
  CORS whitelists, and analytics behavior.
- Any new middleware, schema change, or data sync should update this document and the
  related quick-reference notes to keep the shared mental model current.
