import { vi, describe, it, expect, beforeEach } from 'vitest';
import { firestore } from '../helpers';
import {
  updateTarkovDataImplInternal as _updateTarkovDataImplInternal,
  expireInactiveTokensImpl,
} from '../../src/scheduled/index';
import admin from 'firebase-admin';
import type { ApiToken } from '../../src/scheduled/types';

const mockGraphqlRequest = vi.fn();
const mockGql = vi.fn((query: string) => query);

// Mock GraphQL request - external API, keep mocked
vi.mock('graphql-request', () => ({
  request: mockGraphqlRequest,
  gql: mockGql,
}));

// Mock logger for cleaner test output
const mockLogger = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};
vi.mock('firebase-functions/v2', () => ({
  logger: mockLogger,
}));

// Helper function to set up GraphQL mocks for all query types
function setupGraphQLMocks(overrides: Record<string, any> = {}): void {
  mockGraphqlRequest.mockImplementation((endpoint: string, query: any) => {
    const queryStr = typeof query === 'string' ? query : String(query);

    if (queryStr.includes('GetTasks')) {
      return Promise.resolve(overrides.tasks ?? { tasks: [{ id: 't1', name: 'Test Task' }] });
    }

    if (queryStr.includes('GetHideoutModules')) {
      return Promise.resolve(
        overrides.hideout ?? { hideoutStations: [{ id: 'h1', name: 'Test Hideout' }] }
      );
    }

    if (queryStr.includes('GetItems')) {
      const items = Array.from({ length: 1200 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
      }));
      return Promise.resolve(overrides.items ?? { items });
    }

    return Promise.reject(new Error(`Unknown query: ${queryStr.substring(0, 50)}`));
  });

  mockGql.mockImplementation((query: string) => query);
}

describe('Scheduled Functions', () => {
  let updateTarkovDataImplInternal: any;

  beforeEach(async () => {
    // Global afterEach in test/setup.ts handles Firestore cleanup
    vi.clearAllMocks();
    setupGraphQLMocks();

    // Dynamic import to get the internal implementation (bypasses onSchedule wrapper)
    const module = await import('../../src/scheduled/index');
    updateTarkovDataImplInternal = module.updateTarkovDataImplInternal;
  });

  describe('New Batching Logic', () => {
    it('should process items in batches and write to Firestore', async () => {
      await updateTarkovDataImplInternal();

      // Verify tasks were written to tarkovData/tasks document
      const tasksDoc = await firestore().collection('tarkovData').doc('tasks').get();
      expect(tasksDoc.exists).toBe(true);
      const tasksData = tasksDoc.data();
      expect(tasksData).toHaveProperty('data');
      expect(tasksData?.data).toBeInstanceOf(Array);
      expect(tasksData?.data.length).toBeGreaterThan(0);

      // Verify items were written to tarkovData/items/shards subcollection
      const itemsShardsSnapshot = await firestore()
        .collection('tarkovData')
        .doc('items')
        .collection('shards')
        .get();
      expect(itemsShardsSnapshot.docs.length).toBeGreaterThan(0);
    }, 30000);

    it('should handle item fetch failure gracefully', async () => {
      // Override to fail on items fetch
      mockGraphqlRequest.mockImplementation((endpoint: string, query: any) => {
        const queryStr = typeof query === 'string' ? query : String(query);

        if (queryStr.includes('GetItems')) {
          return Promise.reject(new Error('Failed to fetch items'));
        }

        if (queryStr.includes('GetTasks')) {
          return Promise.resolve({ tasks: [{ id: 't1', name: 'Task 1' }] });
        }

        if (queryStr.includes('GetHideout')) {
          return Promise.resolve({
            hideoutStations: [{ id: 'h1', name: 'Hideout 1' }],
          });
        }

        return Promise.reject(new Error('Unknown query'));
      });

      await updateTarkovDataImplInternal();

      // Should still have written tasks (items failed)
      const tasksDoc = await firestore().collection('tarkovData').doc('tasks').get();
      expect(tasksDoc.exists).toBe(true);

      // Items should not exist (fetch failed)
      await firestore().collection('tarkovData').doc('items').get();
      // Document may exist but shards subcollection should be empty
      const itemsShardsSnapshot = await firestore()
        .collection('tarkovData')
        .doc('items')
        .collection('shards')
        .get();
      expect(itemsShardsSnapshot.docs.length).toBe(0);
    });

    it('should write all data types successfully', async () => {
      await updateTarkovDataImplInternal();

      // Verify tasks document in tarkovData collection
      const tasksDoc = await firestore().collection('tarkovData').doc('tasks').get();
      expect(tasksDoc.exists).toBe(true);

      // Verify hideout document in tarkovData collection
      const hideoutDoc = await firestore().collection('tarkovData').doc('hideout').get();
      expect(hideoutDoc.exists).toBe(true);

      // Verify items shards subcollection
      const itemsShardsSnapshot = await firestore()
        .collection('tarkovData')
        .doc('items')
        .collection('shards')
        .get();
      expect(itemsShardsSnapshot.docs.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('expireInactiveTokens function', () => {
    beforeEach(async () => {
      // Clear any existing tokens
      const tokensRef = firestore().collection('token');
      const existingTokens = await tokensRef.get();
      const deleteBatch = firestore().batch();
      existingTokens.docs.forEach((doc) => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();
    });

    it('should expire inactive tokens older than 30 days', async () => {
      // Create test tokens
      const db = firestore();
      const thirtyDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      const tokenData: Partial<ApiToken> = {
        owner: 'test-user',
        note: 'Test token',
        permissions: ['GP'],
        isActive: true,
        status: 'active',
        lastUsed: admin.firestore.Timestamp.fromDate(thirtyDaysAgo),
      };

      await db.collection('token').doc('old-token').set(tokenData);

      await expireInactiveTokensImpl();

      const tokenDoc = await db.collection('token').doc('old-token').get();
      const data = tokenDoc.data();
      expect(data?.isActive).toBe(false);
      expect(data?.status).toBe('expired');
      expect(data?.expiredAt).toBeDefined();
    });

    it('should not expire recently used tokens', async () => {
      const db = firestore();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tokenData: Partial<ApiToken> = {
        owner: 'test-user',
        note: 'Test token',
        permissions: ['GP'],
        isActive: true,
        status: 'active',
        lastUsed: admin.firestore.Timestamp.fromDate(oneDayAgo),
      };

      await db.collection('token').doc('recent-token').set(tokenData);

      await expireInactiveTokensImpl();

      const tokenDoc = await db.collection('token').doc('recent-token').get();
      const data = tokenDoc.data();
      expect(data?.isActive).toBe(true);
      expect(data?.status).toBe('active');
    });

    it('should not expire already inactive tokens', async () => {
      const db = firestore();
      const thirtyDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      const tokenData: Partial<ApiToken> = {
        owner: 'test-user',
        note: 'Test token',
        permissions: ['GP'],
        isActive: false,
        status: 'inactive',
        lastUsed: admin.firestore.Timestamp.fromDate(thirtyDaysAgo),
      };

      await db.collection('token').doc('inactive-token').set(tokenData);

      await expireInactiveTokensImpl();

      const tokenDoc = await db.collection('token').doc('inactive-token').get();
      const data = tokenDoc.data();
      expect(data?.isActive).toBe(false);
      expect(data?.status).toBe('inactive');
      expect(data?.expiredAt).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error
      const db = firestore();
      const originalRunTransaction = db.runTransaction;
      db.runTransaction = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(expireInactiveTokensImpl()).rejects.toThrow('Database error');

      // Restore original method
      db.runTransaction = originalRunTransaction;
    });
  });

  describe('Error handling in scheduled functions', () => {
    it('should handle GraphQL network errors with retry', async () => {
      let attemptCount = 0;
      mockGraphqlRequest.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network error');
        }
        return { tasks: [{ id: 't1', name: 'Test Task' }] };
      });

      // Should succeed on third attempt
      await expect(updateTarkovDataImplInternal()).resolves.not.toThrow();

      expect(attemptCount).toBe(3);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2); // 2 retries, 2 warnings
    });

    it('should fail after max retries', async () => {
      mockGraphqlRequest.mockRejectedValue(new Error('Persistent network error'));

      await expect(updateTarkovDataImplInternal()).rejects.toThrow('Persistent network error');

      expect(mockGraphqlRequest).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should validate response structures', async () => {
      // Test invalid tasks response
      mockGraphqlRequest.mockImplementation((endpoint, query) => {
        const queryStr = typeof query === 'string' ? query : String(query);
        if (queryStr.includes('GetTasks')) {
          return Promise.resolve({ invalidStructure: 'test' });
        }
        return Promise.resolve({ hideoutStations: [] });
      });

      await expect(updateTarkovDataImplInternal()).rejects.toThrow(
        'Invalid tasks response structure'
      );
    });

    it('should handle item sharding errors', async () => {
      const db = firestore();
      const originalBatch = db.batch;
      db.batch = vi.fn().mockReturnValue({
        set: vi.fn(),
        commit: vi.fn().mockRejectedValue(new Error('Sharding failed')),
      });

      mockGraphqlRequest.mockImplementation(async (endpoint, query) => {
        const queryStr = typeof query === 'string' ? query : String(query);
        if (queryStr.includes('GetItems')) {
          return Promise.resolve({
            items: Array.from({ length: 1000 }, (_, i) => ({ id: `item-${i}` })),
          });
        }
        return Promise.resolve({ tasks: [] });
      });

      await expect(updateTarkovDataImplInternal()).rejects.toThrow();

      // Restore
      db.batch = originalBatch;
    });
  });
});
