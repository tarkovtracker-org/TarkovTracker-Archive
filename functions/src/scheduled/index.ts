// Firebase scheduled functions for data synchronization
import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import admin from 'firebase-admin';
import { request, gql } from 'graphql-request';

const TARKOV_DEV_GRAPHQL_ENDPOINT = 'https://api.tarkov.dev/graphql';

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

    // Update tasks
    try {
      const tasksResponse = await request(TARKOV_DEV_GRAPHQL_ENDPOINT, UPDATE_TASKS_QUERY);
      const tasksRef = db.collection('tarkovData').doc('tasks');
      batch.set(tasksRef, {
        data: tasksResponse.tasks,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        source: 'tarkov.dev',
      });
      logger.info(`Updated ${tasksResponse.tasks?.length || 0} tasks`);
    } catch (error) {
      logger.error('Failed to update tasks:', error);
    }

    // Update hideout data
    try {
      const hideoutResponse = await request(TARKOV_DEV_GRAPHQL_ENDPOINT, UPDATE_HIDEOUT_QUERY);
      const hideoutRef = db.collection('tarkovData').doc('hideout');
      batch.set(hideoutRef, {
        data: hideoutResponse.hideoutStations,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        source: 'tarkov.dev',
      });
      logger.info(`Updated ${hideoutResponse.hideoutStations?.length || 0} hideout modules`);
    } catch (error) {
      logger.error('Failed to update hideout data:', error);
    }

    // Update items
    try {
      const itemsResponse = await request(TARKOV_DEV_GRAPHQL_ENDPOINT, UPDATE_ITEMS_QUERY);
      const itemsRef = db.collection('tarkovData').doc('items');
      batch.set(itemsRef, {
        data: itemsResponse.items,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        source: 'tarkov.dev',
      });
      logger.info(`Updated ${itemsResponse.items?.length || 0} items`);
    } catch (error) {
      logger.error('Failed to update items:', error);
    }

    await batch.commit();
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

    const inactiveTokens = await db
      .collection('apiTokens')
      .where('lastUsed', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .where('isActive', '==', true)
      .get();

    if (inactiveTokens.empty) {
      logger.info('No inactive tokens found');
      return;
    }

    const batch = db.batch();
    inactiveTokens.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isActive: false,
        status: 'expired',
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    logger.info(`Expired ${inactiveTokens.size} inactive tokens`);
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
