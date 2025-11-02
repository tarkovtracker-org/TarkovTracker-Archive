// Firebase scheduled functions for data synchronization
import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import admin from 'firebase-admin';
import { request, gql } from 'graphql-request';

const TARKOV_DEV_GRAPHQL_ENDPOINT = 'https://api.tarkov.dev/graphql';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// Helper function for exponential backoff retry
async function fetchWithRetry<T>(
  endpoint: string,
  query: string,
  retries: number = MAX_RETRIES,
  baseDelay: number = BASE_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await request<T>(endpoint, query);
      return result;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(
          `Request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms:`,
          error
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
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
  try {
    logger.info('Starting scheduled Tarkov data update');

    const db = admin.firestore();
    const batch = db.batch();

    // Update tasks with retry and validation
    try {
      const tasksResponse = await fetchWithRetry<TasksResponse>(
        TARKOV_DEV_GRAPHQL_ENDPOINT,
        UPDATE_TASKS_QUERY
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
        UPDATE_HIDEOUT_QUERY
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
    let itemsUpdateSuccessful = false;
    try {
      const itemsResponse = await fetchWithRetry<ItemsResponse>(
        TARKOV_DEV_GRAPHQL_ENDPOINT,
        UPDATE_ITEMS_QUERY
      );

      if (!validateItemsResponse(itemsResponse)) {
        throw new Error('Invalid items response structure');
      }

      const itemsDataCollectionRef = db.collection('tarkovData').doc('items').collection('data');
      const BATCH_SIZE = 500;
      let totalItemsWritten = 0;

      // Process items in batches to respect Firestore limits
      for (let i = 0; i < itemsResponse.items.length; i += BATCH_SIZE) {
        const itemChunk = itemsResponse.items.slice(i, i + BATCH_SIZE);
        const itemBatch = db.batch();

        itemChunk.forEach((item) => {
          const itemDocRef = itemsDataCollectionRef.doc(item.id);
          itemBatch.set(itemDocRef, item);
        });

        try {
          await itemBatch.commit();
          totalItemsWritten += itemChunk.length;
          logger.info(`Committed item chunk ${Math.floor(i / BATCH_SIZE) + 1}, wrote ${itemChunk.length} items.`);
        } catch (chunkError) {
          logger.error(`Failed to commit item chunk starting at index ${i}:`, chunkError);
          // Re-throw to stop the process and be caught by the outer catch block
          throw new Error(`Item batch write failed at index ${i}: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`);
        }
      }

      // Write the metadata document after all item chunks have been successfully written
      const itemsMetadataRef = db.collection('tarkovData').doc('items');
      const metadataBatch = db.batch();
      metadataBatch.set(itemsMetadataRef, {
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        itemCount: totalItemsWritten,
        schemaVersion: 2,
        source: 'tarkov.dev',
      });

      // Also include the tasks and hideout updates in this final batch
      metadataBatch.commit();
      
      itemsUpdateSuccessful = true;
      logger.info(`Successfully updated ${totalItemsWritten} items in subcollection and metadata document.`);
      
    } catch (error) {
      logger.error('Failed to update items:', error);
      // Continue processing other resources (tasks, hideout) if possible
    }
    
    // Commit the non-items batch (tasks, hideout) separately if items update failed
    if (!itemsUpdateSuccessful) {
      try {
        await batch.commit();
        logger.info('Committed non-items Tarkov data update.');
      } catch (batchError) {
        logger.error('Failed to commit non-items batch update to Firestore:', batchError);
        throw new Error(
          `Non-items batch commit failed: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`
        );
      }
    }

    logger.info('Completed scheduled Tarkov data update');
  } catch (error) {
    logger.error('Scheduled data update failed:', error);
    throw error;
  }
});

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
