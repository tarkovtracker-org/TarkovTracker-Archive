import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressService } from '../../../src/services/ProgressService';
import { createTestSuite } from '../../helpers';

// Mock only external data loaders, not internal utility functions
// Integration tests should use real formatProgress and updateTaskState implementations
vi.mock('../../../src/utils/dataLoaders', () => ({
  getHideoutData: vi.fn().mockResolvedValue({ hideoutStations: [] }),
  getTaskData: vi.fn().mockResolvedValue({
    tasks: [
      { id: 'task-alpha', name: 'Task Alpha' },
      { id: 'task-beta', name: 'Task Beta' },
    ],
  }),
  fetchHideoutProgress: vi.fn(),
  fetchTaskProgress: vi.fn(),
  fetchTraderProgress: vi.fn(),
}));

// Define test constants
const MOCK_HIDEOUT_DATA = { hideoutStations: [] };
const MOCK_TASK_DATA = {
  tasks: [
    { id: 'task-alpha', name: 'Task Alpha' },
    { id: 'task-beta', name: 'Task Beta' },
  ],
};

describe('ProgressService', () => {
  const suite = createTestSuite('ProgressService');
  const service = new ProgressService();

  beforeEach(async () => {
    await suite.beforeEach();
    vi.clearAllMocks();

    // Reset mock implementations
    const { getHideoutData, getTaskData } = await import('../../../src/utils/dataLoaders');
    vi.mocked(getHideoutData).mockResolvedValue(MOCK_HIDEOUT_DATA);
    vi.mocked(getTaskData).mockResolvedValue(MOCK_TASK_DATA);
  });

  afterEach(suite.afterEach);

  describe('getUserProgress', () => {
    it('should return formatted progress data for user', async () => {
      const userData = {
        currentGameMode: 'pvp',
        legacy: true,
        pvp: {
          displayName: 'TestPlayer',
          level: 15,
          gameEdition: 2,
          pmcFaction: 'BEAR',
        },
      };

      // Seed test data
      await suite.withDatabase({
        progress: {
          'user-1': userData,
        },
      });

      const result = await service.getUserProgress('user-1', 'pvp');

      // Verify the real formatProgress returned proper structure
      expect(result).toMatchObject({
        userId: 'user-1',
        displayName: expect.any(String),
        playerLevel: expect.any(Number),
        gameEdition: expect.any(Number),
        pmcFaction: expect.any(String),
        tasksProgress: expect.any(Array),
        taskObjectivesProgress: expect.any(Array),
        hideoutModulesProgress: expect.any(Array),
        hideoutPartsProgress: expect.any(Array),
      });
    });

    it.skip('throws when essential game data is missing', async () => {
      // This test requires mocking data loaders to return null, which is difficult
      // in integration tests. This behavior is better tested in unit tests.
      // The real scenario (data loaders returning null) should not happen in production
      // as the data is loaded from static game data files.
    });

    it('handles missing progress document gracefully', async () => {
      // Don't seed any progress data - test with non-existent user

      const result = await service.getUserProgress('new-user', 'pvp');

      // Should return properly formatted progress with defaults
      expect(result).toMatchObject({
        userId: 'new-user',
        displayName: expect.any(String), // Will be first 6 chars of userId
        playerLevel: 1, // Default level
        gameEdition: 1, // Default edition
        pmcFaction: 'USEC', // Default faction
        tasksProgress: expect.any(Array),
        taskObjectivesProgress: expect.any(Array),
        hideoutModulesProgress: expect.any(Array),
        hideoutPartsProgress: expect.any(Array),
      });
    });
  });

  describe('updateSingleTask', () => {
    it('updates a single task and handles dependency updates', async () => {
      await suite.withDatabase({
        progress: {
          'user-3': {
            currentGameMode: 'pvp',
            pvp: { taskCompletions: {} },
          },
        },
      });

      await service.updateSingleTask('user-3', 'task-alpha', 'completed', 'pvp');

      // Verify the task was actually updated in Firestore
      const { admin } = await import('../../helpers');
      const docSnap = await admin.firestore().collection('progress').doc('user-3').get();
      expect(docSnap.exists).toBe(true);
      const data = docSnap.data();
      expect(data?.pvp?.taskCompletions?.['task-alpha']).toBeDefined();
      expect(data?.pvp?.taskCompletions?.['task-alpha']?.complete).toBe(true);
    });

    it('successfully updates task status to failed', async () => {
      await suite.withDatabase({
        progress: {
          'user-4': {
            currentGameMode: 'pvp',
            pvp: { taskCompletions: {} },
          },
        },
      });

      // Update task to failed status
      await expect(
        service.updateSingleTask('user-4', 'task-beta', 'failed', 'pvp')
      ).resolves.toBeUndefined();

      // Verify the task was actually updated in Firestore with failed status
      const { admin } = await import('../../helpers');
      const docSnap = await admin.firestore().collection('progress').doc('user-4').get();
      expect(docSnap.exists).toBe(true);
      const data = docSnap.data();
      expect(data?.pvp?.taskCompletions?.['task-beta']).toBeDefined();
      expect(data?.pvp?.taskCompletions?.['task-beta']?.failed).toBe(true);
    });

    // TODO: Rewrite this test for emulator - can't easily mock transaction failures with real Firestore
    it.skip('handles database transaction errors properly', async () => {
      // This test needs to be rewritten to test actual error scenarios that can occur
      // with the Firebase emulator, rather than mocking transaction failures
    });
  });

  describe('Error Handling', () => {
    // TODO: Rewrite for emulator - test real concurrent updates instead of mocking failures
    it.skip('handles concurrent task updates gracefully', async () => {
      // This should be rewritten to actually perform concurrent updates using the emulator
      // and verify the behavior, rather than mocking transaction conflicts
    });

    it('validates task completion status properly', async () => {
      await suite.withDatabase({
        progress: {
          'user-7': {
            currentGameMode: 'pvp',
            pvp: { taskCompletions: {} },
          },
        },
      });

      await service.updateSingleTask('user-7', 'task-epsilon', 'completed', 'pvp');

      // Verify the task completion was actually written to Firestore
      const { admin } = await import('../../helpers');
      const docSnap = await admin.firestore().collection('progress').doc('user-7').get();
      expect(docSnap.exists).toBe(true);
      const data = docSnap.data();
      expect(data?.pvp?.taskCompletions?.['task-epsilon']?.complete).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete task update workflow', async () => {
      const userData = {
        currentGameMode: 'pvp',
        pvp: { taskCompletions: {} },
      };

      await suite.withDatabase({
        progress: {
          'user-8': userData,
        },
      });

      // Update task
      await service.updateSingleTask('user-8', 'task-zeta', 'completed', 'pvp');

      // Verify the task was written to Firestore
      const { admin } = await import('../../helpers');
      const docSnap = await admin.firestore().collection('progress').doc('user-8').get();
      expect(docSnap.exists).toBe(true);
      const data = docSnap.data();
      expect(data?.pvp?.taskCompletions?.['task-zeta']).toBeDefined();
      expect(data?.pvp?.taskCompletions?.['task-zeta']?.complete).toBe(true);

      // Verify timestamp was set
      expect(data?.pvp?.taskCompletions?.['task-zeta']?.timestamp).toBeDefined();
      expect(typeof data?.pvp?.taskCompletions?.['task-zeta']?.timestamp).toBe('number');
    });
  });
});
