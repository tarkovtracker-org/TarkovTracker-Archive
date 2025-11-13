import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressService } from '../../../src/services/ProgressService';
import { createTestSuite } from '../../helpers';

// Mock only external data loaders, not Firestore operations
vi.mock('../../src/utils/dataLoaders', () => ({
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

// Mock progress utility functions
vi.mock('../../src/progress/progressUtils', () => ({
  formatProgress: vi.fn(),
  updateTaskState: vi.fn(),
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
    const { getHideoutData, getTaskData } = await import('../../src/utils/dataLoaders');
    vi.mocked(getHideoutData).mockResolvedValue(MOCK_HIDEOUT_DATA);
    vi.mocked(getTaskData).mockResolvedValue(MOCK_TASK_DATA);
  });

  afterEach(suite.afterEach);

  describe('getUserProgress', () => {
    it('should return formatted progress data for user', async () => {
      const userData = {
        currentGameMode: 'pvp',
        legacy: true,
      };

      // Get mocked functions
      const { getHideoutData, getTaskData } = await import('../../src/utils/dataLoaders');
      const { formatProgress } = await import('../../src/progress/progressUtils');

      // Seed test data
      await suite.withDatabase({
        progress: {
          'user-1': userData,
        },
      });

      const formatted = { displayName: 'Player', tasksProgress: [] } as any;
      vi.mocked(formatProgress).mockReturnValue(formatted);

      const result = await service.getUserProgress('user-1', 'pvp');

      // Verify data loaders were called
      expect(vi.mocked(getHideoutData)).toHaveBeenCalled();
      expect(vi.mocked(getTaskData)).toHaveBeenCalled();

      // Verify formatProgress was called with correct parameters
      expect(vi.mocked(formatProgress)).toHaveBeenCalledWith(
        userData,
        'user-1',
        MOCK_HIDEOUT_DATA,
        MOCK_TASK_DATA,
        'pvp'
      );

      expect(result).toBe(formatted);
    });

    it('throws when essential game data is missing', async () => {
      const { getHideoutData, getTaskData } = await import('../../src/utils/dataLoaders');

      await suite.withDatabase({
        progress: {
          'user-2': {
            currentGameMode: 'pvp',
          },
        },
      });

      // Simulate missing game data
      vi.mocked(getHideoutData).mockResolvedValue(null);
      vi.mocked(getTaskData).mockResolvedValue(null);

      await expect(service.getUserProgress('user-2')).rejects.toHaveProperty(
        'message',
        'Failed to load essential game data'
      );
    });

    it('handles missing progress document gracefully', async () => {
      const { formatProgress } = await import('../../src/progress/progressUtils');

      // Don't seed any progress data
      const formatted = { displayName: 'New Player', tasksProgress: [] } as any;
      vi.mocked(formatProgress).mockReturnValue(formatted);

      const result = await service.getUserProgress('new-user', 'pvp');

      expect(result).toBe(formatted);
      expect(vi.mocked(formatProgress)).toHaveBeenCalledWith(
        undefined, // No progress data available
        'new-user',
        MOCK_HIDEOUT_DATA,
        MOCK_TASK_DATA,
        'pvp'
      );
    });
  });

  describe('updateSingleTask', () => {
    it('updates a single task and handles dependency updates', async () => {
      const { updateTaskState } = await import('../../src/progress/progressUtils');

      await suite.withDatabase({
        progress: {
          'user-3': {
            currentGameMode: 'pvp',
            pvp: { taskCompletions: {} },
          },
        },
      });

      await service.updateSingleTask('user-3', 'task-alpha', 'completed', 'pvp');

      // Verify dependency update was called
      expect(vi.mocked(updateTaskState)).toHaveBeenCalledWith(
        'task-alpha',
        'completed',
        'user-3',
        MOCK_TASK_DATA
      );
    });

    it('swallows dependency errors after updating a task', async () => {
      const { updateTaskState } = await import('../../src/progress/progressUtils');

      await suite.withDatabase({
        progress: {
          'user-4': {
            currentGameMode: 'pvp',
            pvp: { taskCompletions: {} },
          },
        },
      });

      // Simulate dependency update failure
      vi.mocked(updateTaskState).mockRejectedValue(new Error('dependency failure'));

      // Should still resolve successfully even with dependency error
      await expect(
        service.updateSingleTask('user-4', 'task-beta', 'failed', 'pvp')
      ).resolves.toBeUndefined();

      // Verify the task was actually updated in Firestore (transaction completed)
      const { admin } = await import('../helpers');
      const docSnap = await admin.firestore().collection('progress').doc('user-4').get();
      expect(docSnap.exists).toBe(true);
      const data = docSnap.data();
      expect(data?.pvp?.taskCompletions?.['task-beta']).toBeDefined();
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
      const { admin } = await import('../helpers');
      const docSnap = await admin.firestore().collection('progress').doc('user-7').get();
      expect(docSnap.exists).toBe(true);
      const data = docSnap.data();
      expect(data?.pvp?.taskCompletions?.['task-epsilon']?.complete).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete task update workflow', async () => {
      const { updateTaskState } = await import('../../src/progress/progressUtils');

      const userData = {
        currentGameMode: 'pvp',
        pvp: { taskCompletions: {} },
      };

      await suite.withDatabase({
        progress: {
          'user-8': userData,
        },
      });

      // Simulate successful task update
      vi.mocked(updateTaskState).mockResolvedValue(undefined);

      // Update task
      await service.updateSingleTask('user-8', 'task-zeta', 'completed', 'pvp');

      // Verify the task was written to Firestore
      const { admin } = await import('../helpers');
      const docSnap = await admin.firestore().collection('progress').doc('user-8').get();
      expect(docSnap.exists).toBe(true);
      const data = docSnap.data();
      expect(data?.pvp?.taskCompletions?.['task-zeta']).toBeDefined();

      // Verify dependencies were updated
      expect(vi.mocked(updateTaskState)).toHaveBeenCalledWith(
        'task-zeta',
        'completed',
        'user-8',
        MOCK_TASK_DATA
      );
    });
  });
});
