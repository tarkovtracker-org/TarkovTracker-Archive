# Performance Fix Implementation Plan

The long-term goal is to avoid direct calls to `https://api.tarkov.dev/graphql` from
the client and instead reuse the daily Firestore cache that the backend sync job builds.
This keeps page loads sub-second and lets Firebase CDN cache the data.

## Current state

- **Backend:** `functions/src/scheduled/index.ts` already fetches tasks, hideout data,
  and items every six hours, writes `tarkovData/{tasks,hideout}` documents, and
  sharded item caches under `/tarkovData/items/shards`.
- **Items cache:** `useFirestoreTarkovItems()` aggregates the shards via VueFire
  and exposes an in-memory singleton (`frontend/src/composables/api/useFirestoreTarkovData.ts`).
- **Remaining GraphQL surface:** `useTarkovApi.ts` still calls `executeGraphQL()` for
  tasks, hideout modules, traders, player levels, and language metadata on every load.

## Next steps

1. **Phase 1 – Firestore read helpers for remaining datasets**
   - Write helpers that read `/tarkovData/tasks`, `/hideout`, `/traders`, `/playerLevels`
     and normalize the response shape.
   - Mirror the caching + hydration patterns used by `useFirestoreTarkovItems()` so
     data is cached in memory and refreshed once per reload.
   - Keep the existing GraphQL implementation as a fallback until Firestore reads are stable.

2. **Phase 2 – Migrate UI data flows**
   - Replace `useTarkovApi()` usages with the Firestore-backed helpers so components
     and composables stop initiating GraphQL requests.
   - Remove unused GraphQL query files once the frontend no longer imports them.
   - Ensure language and metadata queries still run (or migrate them into Firestore).

3. **Phase 3 – Cleanup + metrics**
   - Delete `executeGraphQL()` (and related query helpers) once zero callers remain.
   - Remove any GraphQL-specific dependencies and update documentation.
   - Add timing/telemetry to compare Firestore reads versus the old GraphQL path
     (e.g., log load time in `useFirestoreTarkovItems()` or `useFirestore*` helpers).

## Success metrics

- Page load (data-ready) time stays under 1 second for the landing screens.
- No frontend requests reach `https://api.tarkov.dev/graphql` in production builds.
- Firestore read counts stay within budget (watch `Analytics → Firestore Usage`).
- Bundle size shrinks because GraphQL helpers and `fetch` logic are removed.

## Risks

- **Data staleness:** The scheduled job runs every six hours. Add a manual refresh
  control or timestamp indicator where freshness matters.
- **Firestore read cost:** Monitor read counts per day; cache results locally and batch
  Firestore listens to avoid repeated work.
- **Backward compatibility:** Use feature flags when switching routes from GraphQL to
  Firestore so you can roll back quickly if a dataset is malformed.
