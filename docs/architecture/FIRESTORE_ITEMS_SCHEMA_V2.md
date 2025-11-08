# Firestore Items Schema V2

## Overview

To resolve failures caused by exceeding Firestore's 1 MiB document size limit, the persistence strategy for Tarkov items has been updated from a single-document model to a subcollection-based model.

This change is effective as of the next scheduled data sync.

## Schema Change

### V1 (Deprecated)

- **Path:** `tarkovData/items`
- **Structure:** A single document containing a large `data` array with all item objects.
- **Issue:** The size of the `data` array exceeded the 1 MiB limit, causing batch commits to fail.

```json
// tarkovData/items
{
  "data": [
    { "id": "item1", ... },
    { "id": "item2", ... },
    // ... many more items
  ],
  "lastUpdated": "...",
  "source": "tarkov.dev"
}
```

### V2 (Current)

- **Parent Metadata Document Path:** `tarkovData/items`
- **Parent Metadata Document Structure:** A lightweight document containing metadata about the item collection.
- **Subcollection Path:** `tarkovData/items/shards`
- **Subcollection Structure:** Items are stored in sharded documents that each contain a `data` array (≤ 700 KB) of item objects. The shard ID is a zero-padded string (e.g., `000`, `001`) to keep ordering deterministic.

```json
// tarkovData/items (Metadata Document)
{
  "schemaVersion": 2,
  "sharded": true,
  "shardCount": 12,
  "shardIds": ["000", "001", "002"],
  "updatedAt": "...",
  "source": "tarkov.dev"
}
```

```json
// tarkovData/items/shards/{shardId}
// Document ID: "000"
{
  "data": [
    { "id": "item1", "name": "Item Name" },
    { "id": "item2", "name": "Another Item" }
  ],
  "updatedAt": "..."
}

// Document ID: "001"
{
  "data": [
    { "id": "item3", "name": "Third Item" }
  ],
  "updatedAt": "..."
}
```

## Code Changes

### Backend (`functions/src/scheduled/index.ts`)

The scheduled function `updateTarkovDataImpl` was updated to:
- Fetch items from the Tarkov.dev API as before.
- Write chunked shards to the `tarkovData/items/shards` subcollection. Each shard keeps the JSON payload below Firestore's 1 MiB limit.
- Write a new metadata document to `tarkovData/items` after all shards are successfully committed.
- This prevents the entire sync from failing due to the size of a single write operation.

### Frontend (`frontend/src/composables/api/useFirestoreTarkovData.ts`)

The `useFirestoreTarkovItems` composable was updated to:
- Query the `tarkovData/items/shards` subcollection using `useCollection` from VueFire.
- Aggregate the shard `data` arrays into a single in-memory list to maintain the existing API.
- Continue to use a singleton pattern to cache the data in the application's memory.

## Stale Data Deletion (Deferred)

For the initial implementation, stale data deletion (removing items that are no longer present in the Tarkov.dev API response) has been **deferred**. The current strategy is to overwrite existing items and add new ones. This minimizes complexity and prioritizes resolving the critical write failure.

A future follow-up task is to implement a cleanup function that:
1. Reads all existing document IDs from the `tarkovData/items/shards` subcollection.
2. Compares them with the IDs from the latest Tarkov.dev API response.
3. Deletes any documents in Firestore that are not present in the new data set.
This operation should also be performed in batched chunks to respect Firestore limits.

## Migration Considerations

- This change is backward-incompatible. Any code that directly reads the `tarkovData/items` document expecting an `items` array must instead aggregate the shard documents in `tarkovData/items/shards`.
- The composable `useFirestoreTarkovItems` has been updated and should be used for all future item data access to ensure consistency.
- The `schemaVersion` field in the metadata document can be used by clients to detect the storage format and handle migrations if necessary, though the primary goal is for the composable to abstract this away.
