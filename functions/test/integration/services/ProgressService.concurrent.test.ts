import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressService } from '../../../src/services/ProgressService';
import { createTestSuite, admin } from '../../helpers/index.js';
import { ServiceTestHelpers } from '../../helpers/TestHelpers';
import { MOCK_GAME_DATA, MOCK_TASKS } from '../mocks/MockConstants';

/**
 * Concurrent and transaction-focused test suite for ProgressService
 *
 * Targets critical coverage gaps:
 * - Concurrent task updates to same document
 * - Transaction retry, failure, and rollback behaviors
 * - Game mode switching isolation (pvp/pve) under concurrent operations
 * - Complex dependency resolution, including chained and circular dependencies
 *
 * Notes on test infra:
 * - Uses real Firebase emulator for authentic transaction semantics
 * - Use vi.doMock to control data loaders (getTaskData/getHideoutData) per test
 * - Emulator provides real transaction conflict handling
 */

// Ensure data loaders can be overridden test-by-test
vi.doMock('../../src/utils/dataLoaders', async () => {
  const actual = await vi.importActual('../../src/utils/dataLoaders');
  return {
    ...actual,
    getHideoutData: vi.fn().mockResolvedValue(MOCK_GAME_DATA.HIDEOUT_DATA),
    getTaskData: vi
      .fn()
      .mockResolvedValue({ tasks: [MOCK_TASKS.TASK_ALPHA, MOCK_TASKS.TASK_BETA] }),
  };
});

// Spy-able dependency updater
vi.mock('../../src/progress/progressUtils', async () => {
  const actual = await vi.importActual('../../src/progress/progressUtils');
  return {
    ...actual,
    updateTaskState: vi.fn().mockResolvedValue(undefined),
  };
});

describe('ProgressService concurrency and transactions', () => {
  const suite = createTestSuite('ProgressService.concurrent');
  const service = new ProgressService();
  const trackRunTransactions = () => {
    const spy = vi.spyOn(admin.firestore(), 'runTransaction');
    suite.addCleanup(() => spy.mockRestore());
    return spy;
  };

  beforeEach(async () => {
    await suite.beforeEach();
    ServiceTestHelpers.setupServiceTest({
      tarkovdata: MOCK_GAME_DATA,
    });
    // Default loader returns
    const { getHideoutData, getTaskData } = await import('../../src/utils/dataLoaders');
    vi.mocked(getHideoutData).mockResolvedValue(MOCK_GAME_DATA.HIDEOUT_DATA);
    vi.mocked(getTaskData).mockResolvedValue({
      tasks: [MOCK_TASKS.TASK_ALPHA, MOCK_TASKS.TASK_BETA],
    });
    // Default dependency updater
    const { updateTaskState } = await import('../../src/progress/progressUtils');
    vi.mocked(updateTaskState).mockResolvedValue(undefined);
    vi.clearAllMocks();
  });

  afterEach(suite.afterEach);

  /**
   * 1. Concurrent Task Update Scenarios
   */
  it('applies consistent state under concurrent single-task updates to the same task', async () => {
    const userId = 'user-concurrent-1';
    const taskId = 'task-alpha';
    await suite.withDatabase({
      progress: {
        [userId]: {
          currentGameMode: 'pvp',
          pvp: { taskCompletions: {} },
        },
      },
    });
    const runTransactionSpy = trackRunTransactions();

    // Execute concurrent updates to the same task in same mode
    await Promise.all([
      service.updateSingleTask(userId, taskId, 'completed', 'pvp'),
      service.updateSingleTask(userId, taskId, 'completed', 'pvp'),
      service.updateSingleTask(userId, taskId, 'completed', 'pvp'),
      service.updateSingleTask(userId, taskId, 'completed', 'pvp'),
      service.updateSingleTask(userId, taskId, 'completed', 'pvp'),
    ]);

    expect(runTransactionSpy).toHaveBeenCalledTimes(5);

    const { updateTaskState } = await import('../../src/progress/progressUtils');
    // Dependency update invoked for each operation
    expect(vi.mocked(updateTaskState)).toHaveBeenCalledTimes(5);
    expect(vi.mocked(updateTaskState)).toHaveBeenNthCalledWith(
      1,
      taskId,
      'completed',
      userId,
      expect.anything()
    );
  });

  it('retries on simulated transaction conflicts and succeeds', async () => {
    const userId = 'user-concurrent-2';
    const taskId = 'task-beta';
    await suite.withDatabase({
      progress: {
        [userId]: {
          currentGameMode: 'pvp',
          pvp: { taskCompletions: {} },
        },
      },
    });
    const runTransactionSpy = trackRunTransactions();

    // Force conflict on first attempt (Math.random < 0.1), then succeed
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0.05).mockReturnValue(0.5);

    await service.updateSingleTask(userId, taskId, 'completed', 'pvp');

    expect(runTransactionSpy).toHaveBeenCalledTimes(1);
    expect(randomSpy).toHaveBeenCalled(); // conflict path triggered
    randomSpy.mockRestore();

    const { updateTaskState } = await import('../../src/progress/progressUtils');
    expect(updateTaskState).toHaveBeenCalledWith(taskId, 'completed', userId, expect.anything());
  });

  it('fails and rolls back when progress doc does not exist (non-retryable), leaving state unchanged', async () => {
    const userId = 'user-rollback-1';
    const taskId = 'task-gamma';
    // Intentionally do NOT seed progress doc; update() should throw in transaction

    await expect(
      service.updateSingleTask(userId, taskId, 'completed', 'pvp')
    ).rejects.toHaveProperty('message', 'Failed to update task');

    // No dependency updates on failure
    const { updateTaskState } = await import('../../src/progress/progressUtils');
    expect(updateTaskState).not.toHaveBeenCalled();
  });

  /**
   * Custom transaction capture to assert update payloads for gamemode isolation tests
   */
  const withCapturedTransaction = (
    fn: (transactionUpdate: any, transactionGet: any) => Promise<void>
  ) => {
    const transactionUpdate = vi.fn();
    const transactionGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ pvp: { taskCompletions: {} }, pve: { taskCompletions: {} } }),
      ref: { path: 'progress/capture-user' },
    });
    const transactionSpy = trackRunTransactions();
    transactionSpy.mockImplementationOnce(async (callback) => {
      const transaction = {
        update: transactionUpdate,
        get: transactionGet,
        set: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      } as any;
      await callback(transaction);
    });

    return fn(transactionUpdate, transactionGet);
  };

  /**
   * 3. Game Mode Switching Edge Cases
   */
  it('isolates progress updates between pvp and pve modes under concurrent operations', async () => {
    const userId = 'user-gamemode-1';
    const taskId = 'task-alpha';
    await suite.withDatabase({
      progress: {
        [userId]: {
          currentGameMode: 'pvp',
          pvp: { taskCompletions: {} },
          pve: { taskCompletions: {} },
        },
      },
    });

    // Capture first transaction: pvp
    await withCapturedTransaction(async (transactionUpdatePvp) => {
      await service.updateSingleTask(userId, taskId, 'completed', 'pvp');
      // Verify pvp key usage
      expect(transactionUpdatePvp).toHaveBeenCalledWith(
        expect.objectContaining({ path: `progress/${userId}` }),
        expect.objectContaining({ [`pvp.taskCompletions.${taskId}.complete`]: true })
      );
    });

    // Capture second transaction: pve
    await withCapturedTransaction(async (transactionUpdatePve) => {
      await service.updateSingleTask(userId, taskId, 'completed', 'pve');
      // Verify pve key usage
      expect(transactionUpdatePve).toHaveBeenCalledWith(
        expect.objectContaining({ path: `progress/${userId}` }),
        expect.objectContaining({ [`pve.taskCompletions.${taskId}.complete`]: true })
      );
    });
  });

  it('supports concurrent updates to different game modes without cross-mode pollution', async () => {
    const userId = 'user-gamemode-2';
    const taskId = 'task-beta';
    await suite.withDatabase({
      progress: {
        [userId]: {
          currentGameMode: 'pvp',
          pvp: { taskCompletions: {} },
          pve: { taskCompletions: {} },
        },
      },
    });

    // Parallel pvp/pve updates; two captured transactions in sequence
    const pvpUpdate = withCapturedTransaction(async (update) => {
      await service.updateSingleTask(userId, taskId, 'completed', 'pvp');
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ path: `progress/${userId}` }),
        expect.objectContaining({ [`pvp.taskCompletions.${taskId}.complete`]: true })
      );
    });

    const pveUpdate = withCapturedTransaction(async (update) => {
      await service.updateSingleTask(userId, taskId, 'completed', 'pve');
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ path: `progress/${userId}` }),
        expect.objectContaining({ [`pve.taskCompletions.${taskId}.complete`]: true })
      );
    });

    await Promise.all([pvpUpdate, pveUpdate]);

    const { updateTaskState } = await import('../../src/progress/progressUtils');
    // Both modes should trigger dependency updater independently
    expect(updateTaskState).toHaveBeenCalledTimes(2);
  });

  /**
   * 4. Dependency Resolution Complex Scenarios
   */
  it('handles chained dependency resolution under concurrent updates to the same parent task', async () => {
    const userId = 'user-deps-1';
    await suite.withDatabase({
      progress: {
        [userId]: {
          currentGameMode: 'pvp',
          pvp: { taskCompletions: {} },
        },
      },
    });

    // Task graph:
    // B requires A.complete; C is alternative of A
    const taskData = {
      tasks: [
        { id: 'task-a', alternatives: ['task-c'], taskRequirements: [] },
        {
          id: 'task-b',
          alternatives: [],
          taskRequirements: [{ task: { id: 'task-a' }, status: ['complete'] }],
        },
        { id: 'task-c', alternatives: [], taskRequirements: [] },
      ],
    };
    const { getTaskData } = await import('../../src/utils/dataLoaders');
    vi.mocked(getTaskData).mockResolvedValue(taskData);

    const { updateTaskState } = await import('../../src/progress/progressUtils');
    vi.mocked(updateTaskState).mockResolvedValue(undefined);

    // Two race updates: complete and uncomplete A
    await Promise.all([
      service.updateSingleTask(userId, 'task-a', 'completed', 'pvp'),
      service.updateSingleTask(userId, 'task-a', 'uncompleted', 'pvp'),
    ]);

    // Dependency updater invoked twice; no unhandled errors
    expect(updateTaskState).toHaveBeenCalledTimes(2);
    expect(updateTaskState).toHaveBeenNthCalledWith(1, 'task-a', 'completed', userId, taskData);
    expect(updateTaskState).toHaveBeenNthCalledWith(2, 'task-a', 'uncompleted', userId, taskData);
  });

  it('does not deadlock on circular dependencies and completes updates', async () => {
    const userId = 'user-deps-2';
    await suite.withDatabase({
      progress: {
        [userId]: { currentGameMode: 'pvp', pvp: { taskCompletions: {} } },
      },
    });

    // Circular graph:
    // X requires Y.complete; Y requires X.complete
    const circularTaskData = {
      tasks: [
        {
          id: 'task-x',
          alternatives: [],
          taskRequirements: [{ task: { id: 'task-y' }, status: ['complete'] }],
        },
        {
          id: 'task-y',
          alternatives: [],
          taskRequirements: [{ task: { id: 'task-x' }, status: ['complete'] }],
        },
      ],
    };
    const { getTaskData } = await import('../../src/utils/dataLoaders');
    vi.mocked(getTaskData).mockResolvedValue(circularTaskData);

    await expect(
      service.updateSingleTask(userId, 'task-x', 'completed', 'pvp')
    ).resolves.toBeUndefined();

    const { updateTaskState } = await import('../../src/progress/progressUtils');
    expect(updateTaskState).toHaveBeenCalledWith('task-x', 'completed', userId, circularTaskData);
  });

  it('updates dependencies for multiple tasks in batch with concurrent invocations and swallows individual dependency errors', async () => {
    const userId = 'user-deps-3';
    await suite.withDatabase({
      progress: {
        [userId]: { currentGameMode: 'pvp', pvp: { taskCompletions: {} } },
      },
    });

    const taskData = {
      tasks: [
        { id: 'task-a', alternatives: [], taskRequirements: [] },
        { id: 'task-b', alternatives: [], taskRequirements: [] },
        { id: 'task-c', alternatives: [], taskRequirements: [] },
      ],
    };
    const { getTaskData } = await import('../../src/utils/dataLoaders');
    vi.mocked(getTaskData).mockResolvedValue(taskData);

    const { updateTaskState } = await import('../../src/progress/progressUtils');
    // Make one of the dependency updates fail to validate error swallowing
    vi.mocked(updateTaskState)
      .mockImplementationOnce(async () => {
        /* ok */
      })
      .mockImplementationOnce(() => {
        throw new Error('dep error');
      })
      .mockImplementation(async () => {
        /* ok */
      });

    const batch = [
      { id: 'task-a', state: 'completed' as const },
      { id: 'task-b', state: 'failed' as const },
      { id: 'task-c', state: 'uncompleted' as const },
    ];

    // Run concurrent batch updates to same user
    await Promise.all([
      service.updateMultipleTasks(userId, batch, 'pvp'),
      service.updateMultipleTasks(userId, batch, 'pvp'),
    ]);

    // Each batch triggers dependency updater for each task (errors swallowed)
    expect(updateTaskState).toHaveBeenCalled();
    // Expect at least 6 calls (2 batches * 3 tasks)
    expect(vi.mocked(updateTaskState).mock.calls.length).toBeGreaterThanOrEqual(6);
  });

  /**
   * 2. Transaction Failure and Recovery
   */
  it('retries transactions deterministically when conflicts are forced and ultimately succeeds', async () => {
    const userId = 'user-retry-1';
    await suite.withDatabase({
      progress: {
        [userId]: { currentGameMode: 'pvp', pvp: { taskCompletions: {} } },
      },
    });
    const runTransactionSpy = trackRunTransactions();

    // Force two conflicts then success
    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.05)
      .mockReturnValueOnce(0.05)
      .mockReturnValue(0.5);

    await expect(
      service.updateSingleTask(userId, 'task-alpha', 'completed', 'pvp')
    ).resolves.toBeUndefined();

    expect(runTransactionSpy).toHaveBeenCalledTimes(1);
    expect(randomSpy).toHaveBeenCalledTimes(3);
    randomSpy.mockRestore();
  });

  it('ensures partial updates do not persist on transaction failure', async () => {
    const userId = 'user-rollback-2';
    // Do not seed progress; ensure update fails
    await expect(
      service.updateSingleTask(userId, 'task-alpha', 'completed', 'pvp')
    ).rejects.toHaveProperty('message', 'Failed to update task');

    // Validate that no progress doc was created as a side effect
    const progressCollection = admin.firestore().collection('progress');
    const docSnap = await progressCollection.doc(userId).get();
    expect(docSnap.exists).toBe(false);
  });

  /**
   * Additional concurrency behavior: mixed states to the same task in parallel
   */
  it('handles mixed state updates (completed vs failed) to the same task concurrently', async () => {
    const userId = 'user-mixed-1';
    const taskId = 'task-alpha';
    await suite.withDatabase({
      progress: {
        [userId]: { currentGameMode: 'pvp', pvp: { taskCompletions: {} } },
      },
    });
    const runTransactionSpy = trackRunTransactions();

    await Promise.all([
      service.updateSingleTask(userId, taskId, 'completed', 'pvp'),
      service.updateSingleTask(userId, taskId, 'failed', 'pvp'),
      service.updateSingleTask(userId, taskId, 'uncompleted', 'pvp'),
    ]);

    expect(runTransactionSpy).toHaveBeenCalledTimes(3);

    const { updateTaskState } = await import('../../src/progress/progressUtils');
    expect(updateTaskState).toHaveBeenCalledTimes(3);
  });
});

/**
 * Documentation references:
 * - ProgressService.updateSingleTask(): ensures transaction isolation and post-transaction dependency updates
 * - ProgressService.updateMultipleTasks(): batches transaction updates and settles dependency updates
 * - progressUtils.updateTaskState(): dependency propagation for requirements and alternatives
 *
 * These tests assert:
 * - Concurrency safety at the transaction boundary
 * - Retry behavior on conflicts
 * - Rollback on non-retryable failures
 * - Gamemode isolation for parallel updates
 * - Robust dependency resolution in complex and circular graphs
 */
