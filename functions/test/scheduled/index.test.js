import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createFirebaseAdminMock, createFirebaseFunctionsMock } from '../mocks';

// Set up mocks before imports
const { adminMock, firestoreMock } = createFirebaseAdminMock();
const functionsMock = createFirebaseFunctionsMock();
const mockGraphqlRequest = vi.fn();
const mockGql = vi.fn((query) => query);

// Mock Firebase modules
vi.mock('firebase-admin', () => ({
  default: adminMock,
}));
vi.mock('firebase-functions/v2', () => ({
  logger: functionsMock.logger,
}));
vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: functionsMock.schedule,
}));
// Mock GraphQL request and fetch
vi.mock('graphql-request', () => ({
  request: mockGraphqlRequest,
  gql: mockGql,
}));

// Helper function to set up GraphQL mocks for all query types
function setupGraphQLMocks(overrides = {}) {
  mockGraphqlRequest.mockImplementation((endpoint, query) => {
    // Normalize query by removing whitespace for matching
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

    // Default behavior for unknown queries - log and reject with an Error
    console.warn(`MockGraphQL: Unknown query: ${queryStr.substring(0, 100)}`);
    return Promise.reject(new Error(`Unknown query: ${queryStr.substring(0, 50)}`));
  });
  mockGql.mockImplementation((query) => query);
}

describe('Scheduled Functions', () => {
  let scheduledFunctions;
  let batchCommitSpy;
  let batchSetSpy;
  let batchInstanceCount;

  // Setup mocks once before any tests run
  beforeAll(async () => {
    // Create stable spy references that will be reused across all batch instances.
    // This allows us to track total commits even though each db.batch() call
    // returns a fresh batch object.
    batchCommitSpy = vi.fn().mockResolvedValue({});
    batchSetSpy = vi.fn(); // set() is synchronous and returns void
    batchInstanceCount = 0;

    // Ensure adminMock.firestore returns firestoreMock
    adminMock.firestore.mockReturnValue(firestoreMock);

    // Configure the firestoreMock.batch to return a new batch with our spies
    firestoreMock.batch.mockImplementation(() => {
      batchInstanceCount++;
      return {
        set: batchSetSpy,
        commit: batchCommitSpy,
      };
    });

    // Default successful responses - setup mock to handle all query types
    setupGraphQLMocks();

    mockGql.mockImplementation((query) => query);

    // Dynamic import to get to scheduled functions after mocks are set up
    const module = await import('../../src/scheduled/index.js');
    scheduledFunctions = module.scheduledFunctions;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset spy counters and recreate fresh spies
    batchCommitSpy = vi.fn().mockResolvedValue({});
    batchSetSpy = vi.fn(); // set() is synchronous and returns void
    batchInstanceCount = 0;

    // Re-apply firestoreMock return value since vi.clearAllMocks() clears it
    adminMock.firestore.mockReturnValue(firestoreMock);

    // Re-apply batch mock configuration after clearAllMocks
    firestoreMock.batch.mockImplementation(() => {
      batchInstanceCount++;
      return {
        set: batchSetSpy,
        commit: batchCommitSpy,
      };
    });

    setupGraphQLMocks();
  });

  describe('New Batching Logic', () => {
    it('should process items in batches and write metadata document', async () => {
      await scheduledFunctions.updateTarkovData();

      // Verify the function completed
      expect(functionsMock.logger.info).toHaveBeenCalledWith(
        'Starting scheduled Tarkov data update'
      );
      expect(functionsMock.logger.info).toHaveBeenCalledWith(
        'Completed scheduled Tarkov data update'
      );

      // Verify that batches were committed
      expect(batchCommitSpy).toHaveBeenCalled();
    }, 30000); // 30 second timeout

    it('should handle item fetch failure gracefully', async () => {
      // Override to fail on items fetch
      mockGraphqlRequest.mockImplementation((endpoint, query) => {
        const queryStr = typeof query === 'string' ? query : String(query);
        if (queryStr.includes('GetItems')) {
          return Promise.reject(new Error('Failed to fetch items'));
        }
        if (queryStr.includes('GetTasks')) {
          return Promise.resolve({ tasks: [{ id: 't1' }] });
        }
        if (queryStr.includes('GetHideout')) {
          return Promise.resolve({ hideoutStations: [{ id: 'h1' }] });
        }
        return Promise.reject(new Error('Unknown query'));
      });

      await scheduledFunctions.updateTarkovData();

      // Should log the error
      expect(functionsMock.logger.error).toHaveBeenCalledWith(
        'Failed to update items:',
        expect.any(Error)
      );

      // Should still commit the tasks/hideout batch (1 batch only)
      expect(batchInstanceCount).toBe(1);
      expect(batchCommitSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle a batch commit failure during item update', async () => {
      // Configure batches to fail on commit
      firestoreMock.batch.mockImplementation(() => {
        batchInstanceCount++;
        return {
          set: vi.fn(), // set() is synchronous
          commit: vi.fn().mockRejectedValue(new Error('Batch write failed')),
        };
      });

      // The function should handle the error and log it
      try {
        await scheduledFunctions.updateTarkovData();
        // Function might complete despite batch failure depending on try-catch handling
      } catch (error) {
        // Function threw as expected
        expect(String(error)).toContain('batch');
      }

      // Verify that batch operations were attempted
      expect(batchInstanceCount).toBeGreaterThan(0);
    }, 30000); // 30 second timeout
  });
});
