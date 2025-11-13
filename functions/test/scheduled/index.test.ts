import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createTestSuite, firestore } from '../helpers';

const mockGraphqlRequest = vi.fn();
const mockGql = vi.fn((query: string) => query);

// Mock GraphQL request - external API, keep mocked
vi.mock('graphql-request', () => ({
  request: mockGraphqlRequest,
  gql: mockGql,
}));

// Mock logger for cleaner test output
vi.mock('firebase-functions/v2', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
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
      const itemsDoc = await firestore().collection('tarkovData').doc('items').get();
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
});
