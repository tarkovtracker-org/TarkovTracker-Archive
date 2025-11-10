# TarkovTracker Architecture Reference

Links to the documents that describe the current architecture decisions.

## Security

- `SECURITY_ARCHITECTURE.md` — deep dive into authentication, authorization,
  validation, rate limiting, and Firestore rules.
- `SECURITY_QUICK_REFERENCE.md` — checklist-style summary for adding secure
  endpoints.
- `SECURITY_SUMMARY.txt` — text-based overview of the middleware chain and key
  controls.
- `CORS_SECURITY.md` — origin validation strategy used by the Firebase API.

## Data & Performance

- `FIRESTORE_ITEMS_SCHEMA_V2.md` — how the Tarkov item cache is sharded and kept
  lean in Firestore.
- `performance-fix-implementation-plan.md` — the current workplan for serving
  Tarkov.dev data from Firestore instead of hitting the upstream API on every
  page load.

## Pointers

- Use this index as the canonical reference when the architecture changes (new
  middleware, new caching layers, etc.).
- Keep documentation short, focused on decisions, and linked to live code. If
  the implementation moves, update these references rather than adding new
  copies elsewhere.
