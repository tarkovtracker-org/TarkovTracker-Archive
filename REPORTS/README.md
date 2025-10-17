# TarkovTracker Reports & Documentation

**Last Updated:** 2025-10-15 (cleanup pass)

## Quick Navigation

### Feature Delivery

👉 **Start here:** [`ACTION_ITEMS.md`](./ACTION_ITEMS.md)

- Active P0/P1/P2 priorities
- Status, scope, and effort snapshots
- Links to supporting guides

### Dependency Upgrades

🔄 **References**

- [`DEPENDENCY_UPGRADE_QUICK_START.md`](./DEPENDENCY_UPGRADE_QUICK_START.md) — Batch workflow overview
- [`DEPENDENCY_UPGRADE_STRATEGY.md`](./DEPENDENCY_UPGRADE_STRATEGY.md) — Detailed migration sequencing
- [`APOLLO_CLIENT_V4_UPGRADE_GUIDE.md`](./APOLLO_CLIENT_V4_UPGRADE_GUIDE.md) — Apollo v3 → v4 plan (P1)

### Implementation Guides

🛠️ **Step-by-step**

- [`TOKEN_INACTIVITY_EXPIRATION_GUIDE.md`](./TOKEN_INACTIVITY_EXPIRATION_GUIDE.md) — Token inactivity enforcement (P0)
- [`APOLLO_CLIENT_V4_UPGRADE_GUIDE.md`](./APOLLO_CLIENT_V4_UPGRADE_GUIDE.md) — Shared with dependency upgrades above

### Archived Context (needs refresh)

📂 The previous architecture and modernization analyses were archived during this cleanup. Reference them only for historical context:

- `archive/2025-10-15-cleanup/ARCHITECTURE_REVIEW.md`
- `archive/2025-10-15-cleanup/DEPENDENCY_INTEGRATION_MAP.md`
- `archive/2025-10-15-cleanup/LEGACY_MODERNIZATION_REPORT.md`

Fresh versions should be regenerated after the next major refactor.

---

## Document Hierarchy

```bash
REPORTS/
├── ACTION_ITEMS.md
├── APOLLO_CLIENT_V4_UPGRADE_GUIDE.md
├── DEPENDENCY_UPGRADE_QUICK_START.md
├── DEPENDENCY_UPGRADE_STRATEGY.md
├── README.md
├── TOKEN_INACTIVITY_EXPIRATION_GUIDE.md
└── archive/
    ├── 2025-10-15/
    │   ├── README.md
    │   ├── REPORTS_VERIFICATION_STATUS.md
    │   ├── COMPREHENSIVE_REVIEW_REPORT.md
    │   └── PERFORMANCE_OPTIMIZATION_REPORT.md
    └── 2025-10-15-cleanup/
        ├── ARCHITECTURE_REVIEW.md
        ├── DEPENDENCY_INTEGRATION_MAP.md
        └── LEGACY_MODERNIZATION_REPORT.md
```

---

## Report Status & Accuracy

| Document | Status | Last Verified | Notes |
|----------|--------|---------------|-------|
| `ACTION_ITEMS.md` | ✅ Active | 2025-10-15 | P0 token expiration + index.ts split still pending |
| `TOKEN_INACTIVITY_EXPIRATION_GUIDE.md` | ✅ Current | 2025-10-15 | Implementation-ready; codebase lacks `lastUsed`/`revoked` |
| `APOLLO_CLIENT_V4_UPGRADE_GUIDE.md` | ✅ Current | 2025-10-15 | Frontend still on `@apollo/client@^3.14.0` |
| `DEPENDENCY_UPGRADE_QUICK_START.md` | ✅ Current | 2025-10-14 | Scripts (`scripts/*.sh`) exist and run |
| `DEPENDENCY_UPGRADE_STRATEGY.md` | ⚠️ Needs Refresh Soon | 2025-10-14 | Strategy still valid; rerun audit before upgrades |
| `archive/2025-10-15-cleanup/ARCHITECTURE_REVIEW.md` | ❌ Archived | 2025-10-14 | Metrics stale (TaskList.vue now 127 LOC, etc.) |
| `archive/2025-10-15-cleanup/DEPENDENCY_INTEGRATION_MAP.md` | ❌ Archived | 2025-10-14 | References removed files (legacy `progressHandler`) |
| `archive/2025-10-15-cleanup/LEGACY_MODERNIZATION_REPORT.md` | ❌ Archived | 2025-10-14 | Assumes debt already resolved; contradicts current packages |

---

## Using These Reports

- **Starting work:** Read `ACTION_ITEMS.md`, follow linked guides.
- **Planning upgrades:** Review quick start → strategy → specific guide, then update action items.
- **Architecture context:** Regenerate a new review before large refactors; archived copies exist for historical comparison only.

---

## Maintenance Checklist

Quarterly (or after large refactors):

1. Re-run dependency audit and update both upgrade docs.
2. Verify each action item against the codebase (`wc -l`, `rg`, etc.).
3. Regenerate architecture/dependency mapping reports if still needed; keep fresh copies in the root directory and move prior versions to `archive/`.

---

## Recent Cleanup (2025-10-15)

- Archived stale architecture, integration, and modernization reports.
- Confirmed the current repo still lacks:
  - Token inactivity expiration (`lastUsed` / `revoked` fields, auto-revoke logic).
  - Modularized `functions/src/index.ts` (still 917 LOC).
  - Apollo Client v4 upgrade (`frontend/package.json` still on v3).
  - Firestore index definitions (`firestore.indexes.json` empty).
- Verified `abuseGuard` middleware now provides in-function rate limiting (Action Item #6 should be revisited with new requirements before implementation).

---

## Questions?

- Development process: [`../CLAUDE.md`](../CLAUDE.md)
- Contributing guidelines: [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
- Security process: [`../SECURITY.md`](../SECURITY.md)

---

**Maintained by:** Development Team  
**Document Version:** 2.1  
**Last Updated:** 2025-10-15
