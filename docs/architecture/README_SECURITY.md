# TarkovTracker Security Documentation

This directory captures the security model that keeps the Firebase API and
frontend-safe: authentication, authorization, validation, rate limiting, and
operational checks.

## Key documents

- `SECURITY_QUICK_REFERENCE.md` — checklist and quick lookups for everyday changes.
- `SECURITY_SUMMARY.txt` — compact text overview of the middleware chain, rate limiting,
  and validation rules.
- `SECURITY_ARCHITECTURE.md` — stopgap resource that explains the full defense-in-depth
  stack with links to the implementation.
- `CORS_SECURITY.md` — origin validation policy enforced before Express receives a
  request.

## When to read these docs

- **Frontend devs** implementing new API calls: start with the quick reference,
  verify permissions in `requirePermission`, check rate-limit triggers, then read the
  architecture doc if the change touches new bundles.
- **Security reviewers**: use the summary for a fast sanity check, then consult the
  architecture doc and Firestore rules for enforcement detail.
- **Operations**: revisit the summary and CORS doc after infrastructure changes
  (gateway, emulators, new environments) to ensure controls still match production.
