# Architecture Documentation

High-level architecture guidance for TarkovTracker. This directory
captures the system boundaries, security posture, and performance
expectations that developers and reviewers need to understand the
current platform state.

## Key references

- `ARCHITECTURE_INDEX.md` — entry point to each architecture topic.
- `CORS_SECURITY.md` — origin validation policy for the Firebase API.
- `FIRESTORE_ITEMS_SCHEMA_V2.md` — how the Tarkov data cache is sharded.
- `performance-fix-implementation-plan.md` — current roadmap for caching the
  Tarkov.dev data in Firestore.
- `SECURITY_QUICK_REFERENCE.md`, `SECURITY_SUMMARY.txt`, `SECURITY_ARCHITECTURE.md`
  — layered security docs with increasing fidelity.

## How to use this section

- Update these files when the architecture, tooling, or deployed pattern changes.
- Keep prose focused on decisions and references rather than tutorials.
- Link to code locations (`functions/`, `frontend/`, `firestore.rules`) whenever you
  describe a behavior so readers can verify what keeps the system safe or fast.
