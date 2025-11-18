// Firebase scheduled functions for data synchronization
import { logger } from '../logger.js';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { request, gql } from 'graphql-request';
import admin from 'firebase-admin';
import { createLazyFirestore } from '../utils/factory.js';
import type {
  QueryDocumentSnapshot,
  // Removed unused imports DocumentSnapshot, QuerySnapshot
  DocumentReference,
  Transaction,
} from 'firebase-admin/firestore';
import type {
  ApiToken,
  BackoffStrategy,
  DelayScheduler,
  HideoutResponse,
  Item,
  ItemsResponse,
  Shard,
  TasksResponse,
} from './types.js';
const TARKOV_DEV_GRAPHQL_ENDPOINT = 'https://api.tarkov.dev/graphql';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const defaultBackoff: BackoffStrategy = (attempt) => BASE_DELAY_MS * Math.pow(2, attempt - 1);
const defaultDelay: DelayScheduler = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
async function fetchWithRetry<T>(
  endpoint: string,
  query: string,
  options: {
    maxAttempts?: number;
    backoff?: BackoffStrategy;
    delay?: DelayScheduler;
  } = {}
): Promise<T> {
  const { maxAttempts = MAX_RETRIES, backoff = defaultBackoff, delay = defaultDelay } = options;
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await request<T>(endpoint, query);
      return result;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        const delayMs = backoff(attempt - 1);
        logger.warn(
          `Request failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms:`,
          error
        );
        await delay(delayMs);
      }
    }
  }
  throw lastError ?? new Error('Fetch failed after retries');
}
function validateTasksResponse(response: unknown): response is TasksResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'tasks' in response &&
    Array.isArray((response as { tasks: unknown }).tasks)
  );
}
function validateHideoutResponse(response: unknown): response is HideoutResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'hideoutStations' in response &&
    Array.isArray((response as { hideoutStations: unknown }).hideoutStations)
  );
}
function validateItemsResponse(response: unknown): response is ItemsResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'items' in response &&
    Array.isArray((response as { items: unknown }).items)
  );
}
const UPDATE_TASKS_QUERY = gql`
  query GetTasks {
    tasks {
      id
      name
      normalizedName
      factionName
      kappaRequired
      lightkeeperRequired
      minPlayerLevel
      experience
      taskImageLink
      wikiLink
      availableDelaySecondsMin
      availableDelaySecondsMax
      restartable
      descriptionMessageId
      startMessageId
      successMessageId
      failMessageId
      map {
        id
        name
        normalizedName
      }
      trader {
        id
        name
        normalizedName
        imageLink
      }
      # task requirements omitted for now (schema churn)
      objectives {
        __typename
        id
        type
        description
        optional
        maps {
          id
          name
          normalizedName
        }
        ... on TaskObjectiveItem {
          items {
            id
            name
            shortName
            image512pxLink
            baseImageLink
            backgroundColor
          }
          count
          foundInRaid
          zones {
            id
            map {
              id
              name
            }
            position {
              x
              y
            }
          }
        }
        ... on TaskObjectiveMark {
          markerItem {
            id
            name
            shortName
            image512pxLink
            baseImageLink
            backgroundColor
          }
          zones {
            id
            map {
              id
              name
            }
            position {
              x
              y
            }
          }
        }
        ... on TaskObjectiveShoot {
          count
          shotType
          targetNames
          zoneNames
          zones {
            id
            map {
              id
              name
            }
            position {
              x
              y
            }
          }
        }
      }
      finishRewards {
        items {
          count
          item {
            id
            name
            shortName
            image512pxLink
            baseImageLink
            backgroundColor
          }
        }
        traderStanding {
          trader {
            id
            name
          }
          standing
        }
      }
    }
  }
`;
const UPDATE_HIDEOUT_QUERY = gql`
  query GetHideoutModules {
    hideoutStations {
      id
      name
      normalizedName
      levels {
        id
        level
        description
        constructionTime
        itemRequirements {
          id
          count
          item {
            id
            name
            shortName
          }
        }
        stationLevelRequirements {
          id
          station {
            id
            name
          }
          level
        }
        skillRequirements {
          id
          name
          level
        }
        traderRequirements {
          id
          trader {
            id
            name
          }
          value
        }
      }
    }
  }
`;
const UPDATE_ITEMS_QUERY = gql`
  query GetItems {
    items {
      id
      name
      shortName
      description
      width
      height
      types
      backgroundColor
      iconLink
      image512pxLink
      baseImageLink
    }
  }
`;
const updateTarkovDataImpl = onSchedule('every 6 hours', async () => {
  await updateTarkovDataImplInternal({});
});
async function updateTarkovDataImplInternal(
  options: {
    backoff?: BackoffStrategy;
    delay?: DelayScheduler;
    maxAttempts?: number;
  } = {}
) {
  try {
    const getDb = createLazyFirestore();
    const db = getDb();
    logger.info('Starting scheduled Tarkov data update');
    const batch = db.batch();
    try {
      const tasksResponse = await fetchWithRetry<TasksResponse>(
        TARKOV_DEV_GRAPHQL_ENDPOINT,
        UPDATE_TASKS_QUERY,
        options
      );
      if (!validateTasksResponse(tasksResponse)) {
        throw new Error('Invalid tasks response structure');
      }
      // Shard tasks to stay under the 1MB document limit
      const tasksRef = db.collection('tarkovData').doc('tasks');
      const tasksShardsCollectionRef = tasksRef.collection('shards');
      const existingTaskShardDocs = await tasksShardsCollectionRef.listDocuments();
      // Remove old shards
      existingTaskShardDocs.forEach((docRef) => batch.delete(docRef));
      const TASK_SHARD_TARGET_MAX = 700_000;
      const taskShards: Shard[] = [];
      let currentTaskShard: any[] = [];
      let currentTaskShardSize = 0;
      let taskShardIndex = 0;
      const approxSize = (obj: unknown): number => {
        try {
          return Buffer.byteLength(JSON.stringify(obj), 'utf8');
        } catch {
          return JSON.stringify(obj).length;
        }
      };
      for (const task of tasksResponse.tasks) {
        const size = approxSize(task);
        if (currentTaskShardSize + size > TASK_SHARD_TARGET_MAX && currentTaskShard.length > 0) {
          taskShards.push({
            data: [...currentTaskShard],
            index: taskShardIndex.toString().padStart(3, '0'),
            size: currentTaskShardSize,
          });
          currentTaskShard = [];
          currentTaskShardSize = 0;
          taskShardIndex++;
        }
        currentTaskShard.push(task);
        currentTaskShardSize += size;
      }
      if (currentTaskShard.length > 0) {
        taskShards.push({
          data: [...currentTaskShard],
          index: taskShardIndex.toString().padStart(3, '0'),
          size: currentTaskShardSize,
        });
      }
      taskShards.forEach((shard) => {
        const shardRef = tasksShardsCollectionRef.doc(shard.index);
        batch.set(shardRef, {
          data: shard.data,
          gameMode: 'regular',
          index: shard.index,
          size: shard.size,
        });
      });
      // Keep a lightweight metadata document
      batch.set(tasksRef, {
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        source: 'tarkov.dev',
        shardCount: taskShards.length,
        count: tasksResponse.tasks.length,
      });
      logger.info(`Updated ${tasksResponse.tasks.length} tasks`);
    } catch (error) {
      logger.error('Failed to update tasks:', error);
      // Continue processing other resources
    }
    try {
      const hideoutResponse = await fetchWithRetry<HideoutResponse>(
        TARKOV_DEV_GRAPHQL_ENDPOINT,
        UPDATE_HIDEOUT_QUERY,
        options
      );
      if (!validateHideoutResponse(hideoutResponse)) {
        throw new Error('Invalid hideout response structure');
      }
      const hideoutRef = db.collection('tarkovData').doc('hideout');
      batch.set(hideoutRef, {
        data: hideoutResponse.hideoutStations,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        source: 'tarkov.dev',
      });
      logger.info(`Updated ${hideoutResponse.hideoutStations.length} hideout modules`);
    } catch (error) {
      logger.error('Failed to update hideout data:', error);
      // Continue processing other resources
    }
    try {
      const itemsResponse = await fetchWithRetry<ItemsResponse>(
        TARKOV_DEV_GRAPHQL_ENDPOINT,
        UPDATE_ITEMS_QUERY,
        options
      );
      if (!validateItemsResponse(itemsResponse)) {
        throw new Error('Invalid items response structure');
      }
      const SHARD_TARGET_MAX = 700_000; // Conservative target below 1MB limit
      const itemsShardsCollectionRef = db
        .collection('tarkovData')
        .doc('items')
        .collection('shards');
      // Helper function to approximate JSON size in bytes
      const approximateSize = (obj: unknown): number => {
        try {
          return Buffer.byteLength(JSON.stringify(obj), 'utf8');
        } catch {
          // Fallback for environments without Buffer
          return JSON.stringify(obj).length;
        }
      };
      const shards: Shard[] = [];
      let currentShard: Item[] = [];
      let currentShardSize = 0;
      let shardIndex = 0;
      for (const item of itemsResponse.items) {
        const itemSize = approximateSize(item);
        if (currentShardSize + itemSize > SHARD_TARGET_MAX && currentShard.length > 0) {
          shards.push({
            data: [...currentShard],
            index: shardIndex.toString().padStart(3, '0'),
            size: currentShardSize,
          });
          currentShard = [];
          currentShardSize = 0;
          shardIndex++;
        }
        currentShard.push(item);
        currentShardSize += itemSize;
      }
      if (currentShard.length > 0) {
        shards.push({
          data: currentShard,
          index: shardIndex.toString().padStart(3, '0'),
          size: currentShardSize,
        });
      }
      const BATCH_SIZE = 500;
      for (let i = 0; i < shards.length; i += BATCH_SIZE) {
        const shardChunk = shards.slice(i, i + BATCH_SIZE);
        const shardBatch = db.batch();
        shardChunk.forEach((shard) => {
          const shardRef = itemsShardsCollectionRef.doc(shard.index);
          shardBatch.set(shardRef, {
            data: shard.data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
        try {
          await shardBatch.commit();
          logger.info(
            `Committed shard chunk ${Math.floor(i / BATCH_SIZE) + 1}, wrote ${shardChunk.length} shards.`
          );
          // Log individual shard details for debugging
          shardChunk.forEach((shard) => {
            logger.debug(
              `Shard ${shard.index}: ${shard.data.length} items, ~${Math.round(shard.size / 1024)}KB`
            );
          });
        } catch (chunkError) {
          logger.error(`Failed to commit shard chunk starting at index ${i}:`, chunkError);
          throw new Error(
            `Shard batch write failed at index ${i}: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`
          );
        }
      }
      // Clean up stale shards - list existing shards and delete those not in current set
      try {
        const existingShardsSnapshot = await itemsShardsCollectionRef.get();
        const currentShardIds = shards.map((shard) => shard.index);
        const staleShardRefs: admin.firestore.DocumentReference[] = [];
        existingShardsSnapshot.forEach((doc: QueryDocumentSnapshot) => {
          if (!currentShardIds.includes(doc.id)) {
            staleShardRefs.push(doc.ref);
          }
        });
        if (staleShardRefs.length > 0) {
          const deleteBatchSize = 500;
          for (let i = 0; i < staleShardRefs.length; i += deleteBatchSize) {
            const deleteChunk = staleShardRefs.slice(i, i + deleteBatchSize);
            const deleteBatch = db.batch();
            deleteChunk.forEach((ref) => deleteBatch.delete(ref));
            try {
              await deleteBatch.commit();
              logger.info(`Deleted ${deleteChunk.length} stale shards`);
            } catch (deleteError) {
              logger.warn(`Failed to delete stale shard chunk: ${deleteError}`);
            }
          }
        }
      } catch (cleanupError) {
        logger.warn('Failed to cleanup stale shards:', cleanupError);
      }
      // Write parent metadata document after shards are successfully written
      const itemsMetadataRef = db.collection('tarkovData').doc('items');
      const shardIds = shards.map((shard) => shard.index);
      const deleteShardDocs = async (indexes: string[]) => {
        if (indexes.length === 0) {
          return;
        }
        const deleteBatchSize = 500;
        for (let i = 0; i < indexes.length; i += deleteBatchSize) {
          const deleteBatch = db.batch();
          const chunk = indexes.slice(i, i + deleteBatchSize);
          chunk.forEach((index) => {
            deleteBatch.delete(itemsShardsCollectionRef.doc(index));
          });
          await deleteBatch.commit();
        }
      };
      try {
        await db.runTransaction((transaction: Transaction): Promise<void> => {
          transaction.set(itemsMetadataRef, {
            sharded: true,
            shardCount: shards.length,
            shardIds,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            schemaVersion: 2,
          });
          return Promise.resolve();
        });
        logger.info(
          `Successfully sharded ${itemsResponse.items.length} items into ${shards.length} shards and updated metadata.`
        );
      } catch (metadataError) {
        logger.error('Failed to write items metadata after shards were written:', metadataError);
        try {
          await deleteShardDocs(shardIds);
          logger.info(
            'Deleted newly written shards after metadata failure to keep data consistent.'
          );
        } catch (cleanupError) {
          logger.error(
            'Failed to cleanup shards after metadata transaction failure:',
            cleanupError
          );
        }
        throw metadataError;
      }
    } catch (error) {
      logger.error('Failed to update items:', error);
      // Continue processing other resources (tasks, hideout) if possible
    }
    // Commit the non-items batch (tasks, hideout) regardless of items update status
    try {
      await batch.commit();
      logger.info('Committed non-items Tarkov data update.');
    } catch (batchError) {
      logger.error('Failed to commit non-items batch update to Firestore:', batchError);
      throw new Error(
        `Non-items batch commit failed: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`
      );
    }
    logger.info('Completed scheduled Tarkov data update');
  } catch (error) {
    logger.error('Scheduled data update failed:', error);
    throw error;
  }
}
const expireInactiveTokensImpl = onSchedule('every 24 hours', async () => {
  try {
    const getDb = createLazyFirestore();
    const db = getDb();
    logger.info('Starting inactive token expiration');
    const now = admin.firestore.Timestamp.now();
    const thirtyDaysAgo = new Date(now.toDate().getTime() - 30 * 24 * 60 * 60 * 1000);
    // Query for candidate token IDs (without data) to avoid TOCTOU race condition
    const candidateTokenRefs = await db
      .collection('token')
      .where('lastUsed', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .where('isActive', '==', true)
      .select() // Only get references, not data
      .get();
    if (candidateTokenRefs.empty) {
      logger.info('No inactive tokens found');
      return;
    }
    const tokenRefs: DocumentReference[] = candidateTokenRefs.docs.map(
      (doc: QueryDocumentSnapshot) => doc.ref
    );
    const chunkSize = 500;
    let expiredCount = 0;
    // Process tokens in chunks to avoid transaction size limits
    for (let i = 0; i < tokenRefs.length; i += chunkSize) {
      const chunk = tokenRefs.slice(i, i + chunkSize);
      try {
        const updatedInChunk = await db.runTransaction(async (transaction: Transaction) => {
          let chunkUpdates = 0;
          // Re-read and validate each document inside the transaction
          for (const docRef of chunk) {
            const freshSnapshot = await transaction.get(docRef);
            if (!freshSnapshot.exists) continue;
            const tokenData = freshSnapshot.data() as ApiToken;
            // Re-check that token is still active inside the transaction
            if (tokenData.status === 'active' && tokenData.isActive) {
              transaction.update(docRef, {
                isActive: false,
                status: 'expired' as const,
                expiredAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              chunkUpdates += 1;
            }
          }
          return chunkUpdates;
        });
        expiredCount += updatedInChunk;
      } catch (transactionError) {
        logger.error('Failed to expire tokens in transaction chunk:', transactionError);
        throw new Error(
          `Token expiration transaction failed: ${transactionError instanceof Error ? transactionError.message : 'Unknown error'}`
        );
      }
    }
    logger.info(`Expired ${expiredCount} inactive tokens`);
  } catch (error) {
    logger.error('Token expiration failed:', error);
    throw error;
  }
});
// Export scheduled functions for use in main index.ts
export const scheduledFunctions = {
  updateTarkovData: updateTarkovDataImpl,
  expireInactiveTokens: expireInactiveTokensImpl,
};
// Also export individual functions for direct import
export const updateTarkovData = updateTarkovDataImpl;
export const expireInactiveTokens = expireInactiveTokensImpl;
// Export internal implementation for testing
export { updateTarkovDataImplInternal };
