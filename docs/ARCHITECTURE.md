# Architecture Documentation

> **Audience:** Architects, senior developers  
> **Purpose:** System design, caching strategy, and performance optimization

## Contents
- [Overview](#overview)
- [Data Caching Strategy](#data-caching-strategy)
- [Firestore Items Schema](#firestore-items-schema)
- [Performance Goals](#performance-goals)

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

## Firestore Items Schema

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

## Performance Goals

### Target Metrics

**Performance:**
- FCP: ≤ 2.5s
- LCP: ≤ 3.0s  
- CLS: ≤ 0.1
- TBT: ≤ 200ms
- Initial JS: ≤ 250 KB gzip

**Firestore Efficiency:**
- Cache refresh: 6-hour cadence
- Read costs: ≤ 10 reads per user session (via listener reuse)
- Manual refresh option for time-sensitive data

### System Benefits

- **Font Stability** – Preloaded fonts prevent layout shifts
- **Task Card Containment** – CSS containment prevents reflows
- **Skeleton Loaders** – Fixed-height loaders prevent layout shifts

### Risk Management

**Data Staleness:**
- 6-hour refresh cadence with manual refresh capability
- "Last updated" timestamp displayed to users

**Firestore Costs:**
- Listener reuse minimizes read costs
- Read budgets and quota monitoring in place

**Rollback Strategy:**
- GraphQL flow available behind `VITE_USE_GRAPHQL_FALLBACK` flag
- Performance monitoring with automatic alerts

---

## Related Documentation

- [BACKEND_STRUCTURE.md](./BACKEND_STRUCTURE.md) – Backend workspace organization and patterns
- [NEW_FEATURE_TEMPLATE.md](./NEW_FEATURE_TEMPLATE.md) – Step-by-step guide for adding new features
- [SECURITY.md](./SECURITY.md) – Authentication, permissions, validation, CORS
- [DEVELOPMENT.md](./DEVELOPMENT.md) – Development workflows, testing, deployment