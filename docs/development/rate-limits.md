# Lightweight Abuse Guard

The backend exposes a soft abuse guard that monitors high-frequency write activity on the
`/api/progress` and `/api/team` endpoints. The goal is to catch excessive or automated traffic
without slowing down legitimate realtime updates.

## How It Works

- **Scope** – Only applies to mutation verbs (`POST`, `PUT`, `PATCH`, `DELETE`) hitting the configured path prefixes. Read-only endpoints remain untouched.
- **Sliding Window** – Requests are counted per token hash (with IP fallback) inside a short time window. Counts reset automatically when the window expires.
- **Warning vs Block** – When usage crosses 80% of the window threshold a warning event is logged. A 429 response is returned only if the threshold is exceeded across multiple consecutive windows.
- **Event Logging** – Warnings are always logged via logger.warn for each warning or block. When the Firebase Admin SDK is initialized, a rate-limit event is also written to the rateLimitEvents collection in Firestore. Otherwise, only logging occurs.
- **In-Memory Counters** – Rate-limit counters are stored in-process and scoped per server instance, resetting on cold start or restart. They are not coordinated across instances, so distributed enforcement requires a shared store.

## Configuration

Environment variables allow tuning without redeploying code:

| Variable | Default | Notes |
| --- | --- | --- |
| `ABUSE_GUARD_WINDOW_MS` | `10000` | Sliding window size in milliseconds (bounds: 1s–60s). |
| `ABUSE_GUARD_THRESHOLD` | `150` | Maximum requests allowed within the window before marking a breach. |
| `ABUSE_GUARD_WARN_RATIO` | `0.8` | Fraction of the threshold that triggers near-threshold logging. |
| `ABUSE_GUARD_BREACH_LIMIT` | `2` | Consecutive breached windows required before returning HTTP 429. |
| `ABUSE_GUARD_HISTORY_RESET_MS` | `60000 ms (computed as ABUSE_GUARD_WINDOW_MS * 6)` | Time without breaches before the consecutive counter resets. |
| `ABUSE_GUARD_METHODS` | `POST,PUT,PATCH,DELETE` | HTTP verbs to monitor (comma-separated). |
| `ABUSE_GUARD_PATH_PREFIXES` | `/api/progress,/api/team` | API prefixes protected by the guard. |
| `ABUSE_GUARD_COLLECTION` | `rateLimitEvents` | Firestore collection for event documents. |

All configuration values are clamped to sensible bounds to avoid accidental disablement.

## Operational Guidance

- **Short-Term Overrides** – Raise `ABUSE_GUARD_THRESHOLD` (or shrink `PATH_PREFIXES`) for high-traffic events; revert after collecting baseline data.
- **Investigations** – Filter `rateLimitEvents` by `tokenOwner` or `cacheKey` to spot abusive patterns. The `tokenOwner` value mirrors the authenticated credential: individual tokens log the user UID, team API keys log the team document ID, and service/token-only credentials log the token document ID. Raw bearer strings are never stored, and the middleware prefers the most specific identifier (token ID > user UID > team ID). `cacheKey` uses a SHA-256 hash of the bearer token, so the raw value is never persisted.

### Alerting

Consider forwarding logger output to your observability pipeline to trigger alerts on frequent block events.

### Future Enhancements

Once baseline traffic is known, graduate to per-endpoint quotas, adaptive limits, or external rate-limiting infrastructure without replacing this guard.

### Legitimate Traffic

Legitimate realtime users should never see a 429 during normal gameplay updates. If they do, capture the event document and adjust thresholds accordingly.

## Event Schema

The rateLimitEvents document stores the following fields:
- tokenOwner (string): Mirrors the credential owner—user UID for individual tokens, team document ID for team-scoped keys, token document ID for service/token-only credentials (raw tokens are never stored).
- cacheKey (string): SHA-256 hash of the bearer token; raw tokens are never persisted.
- timestamp (Firestore Timestamp or ISO 8601): Time the event was logged.
- method (string): HTTP verb.
- path (string): Request path.
- message (string, optional): Warning or block reason.
- ip (string, optional): Client IP if available.
- userAgent (string, optional): User-Agent string if available.
