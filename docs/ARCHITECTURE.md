# Architecture Documentation

> **Audience:** Architects, senior developers  
> **Purpose:** System design, caching strategy, and performance optimization

## Contents
- [Overview](#overview)
- [Data Caching Strategy](#data-caching-strategy)
- [Firestore Items Schema V2](#firestore-items-schema-v2)
- [Performance Optimization Plan](#performance-optimization-plan)

---

## Overview

TarkovTracker uses a Firebase-powered stack with Vue 3 frontend and Cloud Functions backend. Key architectural decisions prioritize:

- **Firestore-first data access** – Cache Tarkov.dev catalog locally to eliminate heavy GraphQL calls on every page load
- **Sharded document strategy** – Work within Firestore's 1 MiB document limit by splitting large datasets
- **Scheduled refresh** – Backend jobs keep cached data fresh every 6 hours
- **Security by default** – Layered authentication, permissions, and validation (see [SECURITY.md](./SECURITY.md))

---

## Data Caching Strategy

The Firestore cache eliminates the need to query `https://api.tarkov.dev/graphql` on every load. This dramatically improves first-load performance and reduces external API dependencies.

### Backend Responsibilities

**Scheduled Job** (`functions/src/scheduled/index.ts`):
- Fetches tasks, hideout modules, and items from Tarkov.dev every 6 hours
- Writes to `/tarkovData/{tasks,hideout,traders}` collections
- Shards large datasets (items) to respect Firestore limits
- Uses transactions to ensure atomic updates
- Cleans up stale shards automatically

**Error Handling:**
- Failed shard writes trigger cleanup to prevent partial data
- Metadata document updated only after all shards succeed
- Logging captures sync failures for monitoring

### Frontend Consumption

**Composables:**
- `useFirestoreTarkovItems()` – Aggregates sharded items into a single in-memory collection
- `useFirestoreTasks()`, `useFirestoreHideout()` – Direct VueFire bindings to cached collections

**Benefits:**
- Single fetch per session (VueFire listeners stay active)
- No GraphQL blocking on critical paths
- Immediate reactivity when cache updates

---

## Firestore Items Schema V2

### Metadata Document

Path: `/tarkovData/items`

```typescript
{
  schemaVersion: 2,
  sharded: true,
  shardCount: number,
  shardIds: string[],      // e.g., ["000", "001", "002"]
  updatedAt: Timestamp,
  source: "tarkov.dev"
}
```

### Shard Documents

Path: `/tarkovData/items/shards/{shardId}`

```typescript
{
  data: ItemObject[],      // Max ~700 KB per shard
  updatedAt: Timestamp
}
```

**Sharding Strategy:**
- Batches of 500 items per write (configurable `BATCH_SIZE`)
- Zero-padded shard IDs (000, 001, ...) for predictable ordering
- Target ~700 KB per shard (safety margin under 1 MiB limit)

**Write Flow:**
1. Fetch items from Tarkov.dev GraphQL
2. Chunk into batches of 500
3. Write each batch to numbered shard
4. Delete any orphaned shards from previous runs
5. Update metadata document in transaction

---

## Performance Optimization Plan

### Goal

Achieve **FCP ≤ 2.5s, LCP ≤ 3.0s, TBT ≤ 200ms** on Lighthouse Mobile by eliminating GraphQL blocking and reducing layout shifts.

### Current State

**Problems:**
- Heavy GraphQL queries block initial render (5+ seconds)
- `/tasks` page renders 482 cards causing CLS ~0.694
- Large bundle sizes (Firebase + Vuetify + GraphQL)
- Font loading causes layout shifts

**Baseline Metrics:**
- FCP: 5.8s, LCP: 5.8s, TTI: 7.0s
- CLS: 0.694 (mostly from task cards + footer shifts)
- Initial JS payload: >300 KB gzip

### Completed Optimizations

✅ **Font Stability**
- Preload `@mdi/font` and `Share Tech Mono` with `as="font" crossorigin`
- Use `display=optional` to prevent blocking

✅ **Task Card Containment**
- Added `min-height` to reserve space
- CSS `contain: layout style paint` prevents reflows
- Reduced CLS from 0.694 → 0.08

✅ **Skeleton Loaders**
- Fixed-height skeletons during initial load
- Prevents layout shifts while data loads

### Remaining Work

**1. Complete Firestore Migration**
- Replace all `useTarkovApi()` GraphQL calls with Firestore helpers
- Target composables: task filters, hideout views, needed items
- Keep GraphQL behind feature flag for rollback

**2. Remove Unused Code**
- Delete `executeGraphQL()` and query files once migration complete
- Remove unused GraphQL dependencies
- Update bundle analysis to verify size reduction

**3. Monitoring & Validation**
- Add Firestore read duration telemetry
- Set up Lighthouse CI to track regression
- Monitor Firestore quota usage
- A/B test new flow vs legacy GraphQL

### Success Metrics

**Target Performance:**
- FCP: ≤ 2.5s (50% improvement)
- LCP: ≤ 3.0s (48% improvement)
- CLS: ≤ 0.1 (87% improvement)
- TBT: ≤ 200ms
- Initial JS: ≤ 250 KB gzip

**Firestore Efficiency:**
- Cache refresh: 6-hour cadence
- Read costs: ≤ 10 reads per user session (via listener reuse)
- Manual refresh option for time-sensitive data

### Risks & Mitigation

**Data Staleness:**
- 6-hour refresh may lag real-time changes
- Mitigation: Add manual refresh control, show "last updated" timestamp

**Firestore Costs:**
- Multiple listeners could increase read costs
- Mitigation: Reuse listeners, monitor quota dashboard, add read budgets

**Rollback Strategy:**
- Keep GraphQL flow behind `VITE_USE_GRAPHQL_FALLBACK` flag
- Monitor error rates and latency for 1 week post-launch
- Revert if performance degrades or costs spike

---

## Related Documentation

- [SECURITY.md](./SECURITY.md) – Authentication, permissions, validation, CORS
- [DEVELOPMENT.md](./DEVELOPMENT.md) – Development workflows, testing, deployment
- [TECHNICAL_DEBT.md](./development/TECHNICAL_DEBT.md) – Ongoing refactoring priorities
