import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressService } from '../../src/services/ProgressService.js';
import { firestoreMock, seedDb } from '../setup.js';

import { getHideoutData, getTaskData } from '../../src/utils/dataLoaders.js';
import { formatProgress, updateTaskState } from '../../src/progress/progressUtils.js';

vi.mock('../../src/utils/dataLoaders.js', () => ({
  getHideoutData: vi.fn(),
  getTaskData: vi.fn(),
}));

vi.mock('../../src/progress/progressUtils.js', () => ({
  formatProgress: vi.fn(),
  updateTaskState: vi.fn(),
}));

describe('ProgressService', () => {
  const service = new ProgressService();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns formatted progress data', async () => {
    seedDb({
      progress: {
        'user-1': {
          currentGameMode: 'pvp',
          legacy: true,
        },
      },
    });

    const formatted = { displayName: 'Player', tasksProgress: [] } as any;
    vi.mocked(getHideoutData).mockResolvedValue({ hideoutStations: [] });
    vi.mocked(getTaskData).mockResolvedValue({ tasks: [] });
    vi.mocked(formatProgress).mockReturnValue(formatted);

    const result = await service.getUserProgress('user-1', 'pvp');

    const progressCollectionIndex = firestoreMock.collection.mock.calls.findIndex(
      ([name]) => name === 'progress'
    );
    const progressCollection =
      firestoreMock.collection.mock.results[progressCollectionIndex]?.value;
    expect(progressCollection?.doc).toHaveBeenCalledWith('user-1');
    expect(formatProgress).toHaveBeenCalledWith(
      { currentGameMode: 'pvp', legacy: true },
      'user-1',
      { hideoutStations: [] },
      { tasks: [] },
      'pvp'
    );
    expect(result).toBe(formatted);
  });

  it('throws when essential game data is missing', async () => {
    const firestoreDoc = mockDoc({});
    firestoreMock.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(firestoreDoc) } as any);

    vi.mocked(getHideoutData).mockResolvedValue(null);
    vi.mocked(getTaskData).mockResolvedValue(undefined);

    await expect(service.getUserProgress('user-2')).rejects.toHaveProperty(
      'message',
      'Failed to load essential game data'
    );
  });

  it('updates a single task and handles dependency updates', async () => {
    const transactionUpdate = vi.fn();
    firestoreMock.runTransaction.mockImplementation(async (callback) => {
      const transaction = { update: transactionUpdate } as any;
      await callback(transaction);
    });

    seedDb({
      progress: {
        'user-3': { taskCompletions: {} },
      },
    });

    vi.mocked(getTaskData).mockResolvedValue({ tasks: [] });
    vi.mocked(updateTaskState).mockResolvedValue(undefined);

    await service.updateSingleTask('user-3', 'task-alpha', 'completed', 'pvp');

    expect(firestoreMock.runTransaction).toHaveBeenCalledTimes(1);
    expect(transactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining('progress/user-3') }),
      expect.objectContaining({ [`pvp.taskCompletions.task-alpha.complete`]: true })
    );
    expect(updateTaskState).toHaveBeenCalledWith('task-alpha', 'completed', 'user-3', {
      tasks: [],
    });
  });

  it('swallows dependency errors after updating a task', async () => {
    firestoreMock.runTransaction.mockImplementation(async (callback) => {
      const transaction = { update: vi.fn() } as any;
      await callback(transaction);
    });

    seedDb({
      progress: {
        'user-4': { taskCompletions: {} },
      },
    });

    vi.mocked(getTaskData).mockResolvedValue({ tasks: [] });
    vi.mocked(updateTaskState).mockRejectedValue(new Error('dependency failure'));

    await expect(
      service.updateSingleTask('user-4', 'task-beta', 'failed', 'pvp')
    ).resolves.toBeUndefined();
  });
});
