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
- **Subcollection Path:** `tarkovData/items/data`
- **Subcollection Structure:** Each item from Tarkov.dev is stored as a separate document in this subcollection, with the document ID set to the item's stable `id`.

```json
// tarkovData/items (Metadata Document)
{
  "lastUpdated": "...",
  "itemCount": 1500,
  "schemaVersion": 2,
  "source": "tarkov.dev"
}
```

```json
// tarkovData/items/data/{itemId} (Item Documents)
// Document ID: "item1"
{
  "id": "item1",
  "name": "Item Name",
  // ... other item properties
}

// Document ID: "item2"
{
  "id": "item2",
  "name": "Another Item",
  // ... other item properties
}
```

## Code Changes

### Backend (`functions/src/scheduled/index.ts`)

The scheduled function `updateTarkovDataImpl` was updated to:
- Fetch items from the Tarkov.dev API as before.
- Write items to the `tarkovData/items/data` subcollection in chunks of 500 to respect Firestore's batch limits.
- Write a new metadata document to `tarkovData/items` after all item chunks are successfully committed.
- This prevents the entire sync from failing due to the size of a single write operation.

### Frontend (`frontend/src/composables/api/useFirestoreTarkovData.ts`)

The `useFirestoreTarkovItems` composable was updated to:
- Query the `tarkovData/items/data` subcollection using `useCollection` from VueFire.
- Aggregate the resulting documents into an array, maintaining the same public API for consuming components.
- Continue to use a singleton pattern to cache the data in the application's memory.

## Stale Data Deletion (Deferred)

For the initial implementation, stale data deletion (removing items that are no longer present in the Tarkov.dev API response) has been **deferred**. The current strategy is to overwrite existing items and add new ones. This minimizes complexity and prioritizes resolving the critical write failure.

A future follow-up task is to implement a cleanup function that:
1. Reads all existing document IDs from the `tarkovData/items/data` subcollection.
2. Compares them with the IDs from the latest Tarkov.dev API response.
3. Deletes any documents in Firestore that are not present in the new data set.
This operation should also be performed in batched chunks to respect Firestore limits.

## Migration Considerations

- This change is backward-incompatible. Any code that directly reads the `tarkovData/items` document expecting an `items` array will need to be updated to use the new subcollection pattern.
- The composable `useFirestoreTarkovItems` has been updated and should be used for all future item data access to ensure consistency.
- The `schemaVersion` field in the metadata document can be used by clients to detect the storage format and handle migrations if necessary, though the primary goal is for the composable to abstract this away.

