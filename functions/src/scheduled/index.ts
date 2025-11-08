// Firebase scheduled functions for data synchronization
import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import admin from 'firebase-admin';
import { request, gql } from 'graphql-request';

const TARKOV_DEV_GRAPHQL_ENDPOINT = 'https://api.tarkov.dev/graphql';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// Types for dependency injection
type BackoffStrategy = (attempt: number) => number;
type DelayScheduler = (ms: number) => Promise<void>;

// Default backoff strategy - exponential backoff: 1000 * 2^(attempt - 1)
const defaultBackoff: BackoffStrategy = (attempt) => BASE_DELAY_MS * Math.pow(2, attempt - 1);

// Default delay scheduler - uses real setTimeout
const defaultDelay: DelayScheduler = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function for exponential backoff retry with dependency injection
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

  throw lastError || new Error('Fetch failed after retries');
}

// Validation helpers
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

// TypeScript interfaces for GraphQL responses

interface TaskTrader {
  name: string;
}

interface TaskRequirementTask {
  id: string;
  status: string;
}

interface TaskRequirementItem {
  id: string;
  count: number;
}

interface TaskRequirementTraderLevel {
  name: string;
  level: number;
}

interface TaskRequirements {
  level: number;
  tasks: TaskRequirementTask[];
  items: TaskRequirementItem[];
  traderLevel: TaskRequirementTraderLevel[];
}

interface ObjectiveTarget {
  id: string;
  name: string;
}

interface ObjectiveLocation {
  id: string;
  name: string;
}

interface ObjectiveCondition {
  compareMethod: string;
  conditionType: string;
  value: number;
  dynamicValues: unknown;
}

interface TaskObjective {
  id: string;
  description: string;
  type: string;
  target: ObjectiveTarget | null;
  location: ObjectiveLocation | null;
  conditions: ObjectiveCondition[];
}

interface Task {
  id: string;
  name: string;
  description: string;
  trader: TaskTrader;
  requirements: TaskRequirements;
  objectives: TaskObjective[];
}

interface TasksResponse {
  tasks: Task[];
}

interface HideoutItemRequirement {
  id: string;
  count: number;
}

interface HideoutLevelRequirement {
  type: string;
  value: number;
}

interface HideoutLevel {
  level: number;
  itemRequirements: HideoutItemRequirement[];
  requirements: HideoutLevelRequirement[];
}

interface HideoutStation {
  id: string;
  name: string;
  description: string;
  levels: HideoutLevel[];
}

interface HideoutResponse {
  hideoutStations: HideoutStation[];
}

interface ItemCategory {
  name: string;
}

interface ItemProperty {
  name: string;
  value: string;
}

interface Item {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  categories: ItemCategory[];
  types: string[];
  properties: ItemProperty[];
}

interface ItemsResponse {
  items: Item[];
}

// API Token document interface
interface ApiToken {
  lastUsed: admin.firestore.Timestamp;
  isActive: boolean;
  status: 'active' | 'expired' | 'revoked';
  expiredAt?: admin.firestore.Timestamp;
  createdAt?: admin.firestore.Timestamp;
  userId?: string;
}

// GraphQL query for updating task data
const UPDATE_TASKS_QUERY = gql`
  query GetTasks {
    tasks {
      id
      name
      description
      trader {
        name
      }
      requirements {
        level
        tasks {
          id
          status
        }
        items {
          id
          count
        }
        traderLevel {
          name
          level
        }
      }
      objectives {
        id
        description
        type
        target {
          id
          name
        }
        location {
          id
          name
        }
        conditions {
          compareMethod
          conditionType
          value
          dynamicValues
        }
      }
    }
  }
`;

// GraphQL query for updating hideout data
const UPDATE_HIDEOUT_QUERY = gql`
  query GetHideoutModules {
    hideoutStations {
      id
      name
      description
      levels {
        level
        itemRequirements {
          id
          count
        }
        requirements {
          type
          value
        }
      }
    }
  }
`;

// GraphQL query for updating items data
const UPDATE_ITEMS_QUERY = gql`
  query GetItems {
    items {
      id
      name
      description
      width
      height
      categories {
        name
      }
      types
      properties {
        name
        value
      }
    }
  }
`;

// Individual scheduled function implementations
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
    logger.info('Starting scheduled Tarkov data update');

    const db = admin.firestore();
    const batch = db.batch();

    // Update tasks with retry and validation
    try {
      const tasksResponse = await fetchWithRetry<TasksResponse>(
        TARKOV_DEV_GRAPHQL_ENDPOINT,
        UPDATE_TASKS_QUERY,
        options
      );

      if (!validateTasksResponse(tasksResponse)) {
        throw new Error('Invalid tasks response structure');
      }

      const tasksRef = db.collection('tarkovData').doc('tasks');
      batch.set(tasksRef, {
        data: tasksResponse.tasks,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        source: 'tarkov.dev',
      });
      logger.info(`Updated ${tasksResponse.tasks.length} tasks`);
    } catch (error) {
      logger.error('Failed to update tasks:', error);
      // Continue processing other resources
    }

    // Update hideout data with retry and validation
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

    // Update items with retry and validation
    try {
      const itemsResponse = await fetchWithRetry<ItemsResponse>(
        TARKOV_DEV_GRAPHQL_ENDPOINT,
        UPDATE_ITEMS_QUERY,
        options
      );

      if (!validateItemsResponse(itemsResponse)) {
        throw new Error('Invalid items response structure');
      }

      // Sharding configuration
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

      // Create shards from items data
      interface Shard {
        data: Item[];
        index: string;
        size: number;
      }
      const shards: Shard[] = [];
      let currentShard: Item[] = [];
      let currentShardSize = 0;
      let shardIndex = 0;

      for (const item of itemsResponse.items) {
        const itemSize = approximateSize(item);

        // Check if adding this item would exceed target size
        if (currentShardSize + itemSize > SHARD_TARGET_MAX && currentShard.length > 0) {
          // Save current shard and start new one
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

      // Don't forget the last shard
      if (currentShard.length > 0) {
        shards.push({
          data: currentShard,
          index: shardIndex.toString().padStart(3, '0'),
          size: currentShardSize,
        });
      }

      // Write shards in batches (respecting 500 operation limit)
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

        existingShardsSnapshot.forEach((doc) => {
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
              // Continue with other chunks - best effort cleanup
            }
          }
        }
      } catch (cleanupError) {
        logger.warn('Failed to cleanup stale shards:', cleanupError);
        // Continue with metadata update - cleanup is best effort
      }

      // Write parent metadata document after shards are successfully written
      const itemsMetadataRef = db.collection('tarkovData').doc('items');
      const shardIds = shards.map((shard) => shard.index);

      const metadataBatch = db.batch();
      metadataBatch.set(itemsMetadataRef, {
        sharded: true,
        shardCount: shards.length,
        shardIds: shardIds,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        schemaVersion: 2,
      });

      // Also include tasks and hideout updates in this final batch
      await metadataBatch.commit();

      logger.info(
        `Successfully sharded ${itemsResponse.items.length} items into ${shards.length} shards and updated metadata.`
      );
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
    logger.info('Starting inactive token expiration');
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const thirtyDaysAgo = new Date(now.toDate().getTime() - 30 * 24 * 60 * 60 * 1000);

    // Query for candidate token IDs (without data) to avoid TOCTOU race condition
    const candidateTokenRefs = await db
      .collection('apiTokens')
      .where('lastUsed', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .where('isActive', '==', true)
      .select() // Only get references, not data
      .get();

    if (candidateTokenRefs.empty) {
      logger.info('No inactive tokens found');
      return;
    }

    const tokenRefs = candidateTokenRefs.docs.map((doc) => doc.ref);
    const chunkSize = 500;
    let expiredCount = 0;

    // Process tokens in chunks to avoid transaction size limits
    for (let i = 0; i < tokenRefs.length; i += chunkSize) {
      const chunk = tokenRefs.slice(i, i + chunkSize);

      try {
        const updatedInChunk = await db.runTransaction(async (transaction) => {
          let chunkUpdates = 0;

          // Re-read and validate each document inside the transaction
          for (const docRef of chunk) {
            const freshSnapshot = await transaction.get(docRef);
            if (!freshSnapshot.exists) continue;

            const tokenData = freshSnapshot.data() as ApiToken;
            // Re-check that token is still active inside the transaction
            if (tokenData && tokenData.status === 'active' && tokenData.isActive) {
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
