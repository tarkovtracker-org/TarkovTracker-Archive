# Firestore Items Schema V2

The Tarkov item catalog is cached in Firestore to avoid hitting
`api.tarkov.dev` on every client load. Version 2 splits the cache into a small
metadata document plus sharded item payloads so we never exceed the 1 MiB write
limit.

## Data layout

- **Metadata document:** `/tarkovData/items`
  - `schemaVersion: 2`
  - `sharded: true`
  - `shardCount`, `shardIds`, `updatedAt`, `source`
- **Shard documents:** `/tarkovData/items/shards/{shardId}`
  - `data`: array of item objects
  - `updatedAt`: server timestamp
  - Shard IDs are zero-padded (e.g., `000`, `001`) to keep ordering predictable.
  - Each shard stays well below the 1 MiB limit (`~700 KB` target) by chunking the
    dataset with a simple size heuristic in `functions/src/scheduled/index.ts`.

## Backend duties (see `functions/src/scheduled/index.ts`)

- `fetchWithRetry()` pulls tasks, hideout modules, and item data from `https://api.tarkov.dev/graphql`.
- Item shards are batched (`BATCH_SIZE = 500`), written, then stale shards are deleted in chunks.
- After shard writes succeed, the metadata document is updated inside a transaction.
- Errors during shard writes trigger cleanup, so partial writes don’t leave inconsistent state.

## Frontend consumption

- `useFirestoreTarkovItems()` (in `frontend/src/composables/api/useFirestoreTarkovData.ts`)
  listens to the shards subcollection via VueFire, aggregates the arrays, and exposes
  a singleton cache to replace the previous GraphQL-based flow.
- Other collections (`tarkovData/tasks`, `tarkovData/hideout`, etc.) are still stored in
  root documents and should be read via their Firestore paths or future read helpers.

## Operational notes

- Always consume Tarkov data via `useFirestoreTarkovItems()` or a similar helper so you
  get the in-memory cache and shard aggregation.
- If the scheduling job changes (frequency, fields, GraphQL query), update this guide
  and note the new Firestore paths to avoid regressions.
