# TarkovTracker Security Quick Reference

## Layered checks to remember

- **CORS**: `validateOrigin()` (see `functions/src/config/corsConfig.ts`) blocks `null`,
  `file://`, private IPs in production, embedded credentials, and invalid URLs.
- **Auth**: `verifyBearer` (`functions/src/middleware/auth.ts`) looks up bearer tokens in
  `/token/{tokenId}` and attaches the owner + permissions to `req.apiToken`.
- **Permissions**: `requirePermission('GP'|'TP'|'WP')` ensures a token has the scope before
  any handler executes.
- **Rate limiting**: `abuseGuard` applies to POST/PUT/PATCH/DELETE paths (configurable via
  `ABUSE_GUARD_*` env vars); it warns at 80% and blocks after two breaches.
- **Validation**: `ValidationService.ts` enforces ranges for levels (1-79), editions (1-6),
  factions (`USEC`/`BEAR`), task states, display names (1-50 chars, no `<>"'&`), etc.
- **Firestore rules**: `firestore.rules` re-checks ownership, team membership, and prevents
  field tampering for `progress/`, `token/`, `team/`, etc.
- **Error handling**: `errorHandler.ts` ensures structured responses (`success`, `error`, `meta`)
  and logs only in non-production modes.

## Practical reminders

- When adding a new HTTP route, wrap it with `requirePermission()` and `abuseGuard`
  before validation logic.
- Use the `ValidationService` helpers for request bodies instead of rolling custom checks.
- Log permission or validation failures with enough context to reproduce the request.
- If an env var changes (`ABUSE_GUARD_WHATEVER`, Firebase config), update both
  `README_SECURITY.md` and this quick reference.

## Useful references

- `/functions/src/middleware` — actual middleware implementations.
- `/functions/src/services/ValidationService.ts`.
- `/firestore.rules`.
- `/frontend/src/utils/DataValidationService.ts` for shared input rules.
