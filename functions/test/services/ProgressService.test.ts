import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressService } from '../../src/services/ProgressService';
import { createTestSuite, firestoreMock } from '../helpers';

// Mock modules directly in vi.mock calls to avoid hoisting issues
vi.mock('../../src/utils/dataLoaders', () => ({
  getHideoutData: vi.fn().mockResolvedValue({ hideoutStations: [] }),
  getTaskData: vi.fn().mockResolvedValue({
    tasks: [
      { id: 'task-alpha', name: 'Task Alpha' },
      { id: 'task-beta', name: 'Task Beta' },
    ],
  }),
}));

vi.mock('../../src/progress/progressUtils', () => ({
  formatProgress: vi.fn(),
  updateTaskState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/utils/factory', () => ({
  createLazy: vi.fn((init) => () => init()),
  createLazyAsync: vi.fn((init) => async () => await init()),
  createLazyFirestore: vi.fn(() => () => firestoreMock),
  createLazyAuth: vi.fn(() => () => ({ mock: true })),
  createLazyFirestoreForTests: vi.fn(() => () => firestoreMock),
}));

// Define test constants (kept separate from mocks for clarity)
const MOCK_HIDEOUT_DATA = { hideoutStations: [] };
const MOCK_TASK_DATA = {
  tasks: [
    { id: 'task-alpha', name: 'Task Alpha' },
    { id: 'task-beta', name: 'Task Beta' },
  ],
};

describe('ProgressService', () => {
  const service = new ProgressService();
  const suite = createTestSuite('ProgressService');

  beforeEach(suite.beforeEach);
  afterEach(suite.afterEach);

  beforeEach(async () => {
    const { getHideoutData, getTaskData } = await import('../../src/utils/dataLoaders');
    const { formatProgress, updateTaskState } = await import('../../src/progress/progressUtils');

    vi.resetAllMocks();

    vi.mocked(getHideoutData).mockResolvedValue(MOCK_HIDEOUT_DATA);
    vi.mocked(getTaskData).mockResolvedValue(MOCK_TASK_DATA);
    vi.mocked(formatProgress).mockReturnValue({ displayName: 'Player', tasksProgress: [] } as any);
    vi.mocked(updateTaskState).mockResolvedValue(undefined);
  });

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
      suite.withDatabase({
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

      suite.withDatabase({
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

      suite.withDatabase({
        progress: {
          'user-3': {
            currentGameMode: 'pvp',
            pvp: { taskCompletions: {} },
          },
        },
      });

      await service.updateSingleTask('user-3', 'task-alpha', 'completed', 'pvp');

      // Verify transaction was used
      expect(firestoreMock.runTransaction).toHaveBeenCalledTimes(1);

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

      suite.withDatabase({
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

      // Transaction should still complete
      expect(firestoreMock.runTransaction).toHaveBeenCalledTimes(1);
    });

    it('handles database transaction errors properly', async () => {
      suite.withDatabase({
        progress: {
          'user-5': {
            currentGameMode: 'pvp',
            pvp: { taskCompletions: {} },
          },
        },
      });

      // Simulate transaction failure
      firestoreMock.runTransaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(
        service.updateSingleTask('user-5', 'task-gamma', 'completed', 'pvp')
      ).rejects.toThrow('Failed to update task');
    });
  });

  describe('Error Handling', () => {
    it('handles concurrent task updates gracefully', async () => {
      suite.withDatabase({
        progress: {
          'user-6': {
            currentGameMode: 'pvp',
            pvp: { taskCompletions: {} },
          },
        },
      });

      // Simulate transaction conflicts - ProgressService doesn't have retry logic,
      // so it should properly handle and surface the error
      firestoreMock.runTransaction.mockRejectedValue(
        new Error('Resource busy. Retry transaction.')
      );

      // Should fail gracefully with proper error
      await expect(
        service.updateSingleTask('user-6', 'task-delta', 'completed', 'pvp')
      ).rejects.toThrow('Failed to update task');

      expect(firestoreMock.runTransaction).toHaveBeenCalledTimes(1);
    });

    it('validates task completion status properly', async () => {
      suite.withDatabase({
        progress: {
          'user-7': {
            currentGameMode: 'pvp',
            pvp: { taskCompletions: {} },
          },
        },
      });

      await service.updateSingleTask('user-7', 'task-epsilon', 'completed', 'pvp');

      // Verify the transaction update includes the correct task completion data
      expect(firestoreMock.runTransaction).toHaveBeenCalled();

      // The transaction should update the task completion status
      const transactionCallback = firestoreMock.runTransaction.mock.calls[0][0];
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ pvp: { taskCompletions: {} } }),
          ref: { path: 'progress/user-7' },
        }),
        create: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      await transactionCallback(mockTransaction);
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'progress/user-7' }),
        expect.objectContaining({
          [`pvp.taskCompletions.task-epsilon.complete`]: true,
        })
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete task update workflow', async () => {
      const { updateTaskState } = await import('../../src/progress/progressUtils');

      const userData = {
        currentGameMode: 'pvp',
        pvp: { taskCompletions: {} },
      };

      suite.withDatabase({
        progress: {
          'user-8': userData,
        },
      });

      // Simulate successful task update
      vi.mocked(updateTaskState).mockResolvedValue(undefined);

      // Update task
      await service.updateSingleTask('user-8', 'task-zeta', 'completed', 'pvp');

      // Verify transaction was executed
      expect(firestoreMock.runTransaction).toHaveBeenCalledTimes(1);

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
