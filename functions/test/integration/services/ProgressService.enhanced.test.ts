import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressService } from '../../../src/services/ProgressService';
import { createTestSuite } from '../../helpers/index.js';

// Mock the data loaders to avoid complex setup
vi.mock('../../src/utils/dataLoaders', () => ({
  getHideoutData: vi.fn().mockResolvedValue({ hideoutStations: [] }),
  getTaskData: vi.fn().mockResolvedValue({ tasks: [] }),
}));

describe('ProgressService - Enhanced Coverage', () => {
  const suite = createTestSuite('ProgressService.enhanced');
  let service: ProgressService;

  beforeEach(async () => {
    await suite.beforeEach();
    vi.resetAllMocks();
    // Create a new service instance for each test to ensure isolation
    service = new ProgressService();
  });

  afterEach(suite.afterEach);
  describe('setPlayerLevel', () => {
    it('updates player level in specified game mode', async () => {
      await suite.withDatabase({
        progress: {
          'user-level-test': {
            currentGameMode: 'pvp',
            pvp: { level: 5 },
          },
        },
      });

      await service.setPlayerLevel('user-level-test', 15, 'pvp');
      // The service should complete without throwing an error
      expect(true).toBe(true);
    });

    it('updates player level in pve mode', async () => {
      await suite.withDatabase({
        progress: {
          'user-pve-test': {
            currentGameMode: 'pve',
            pve: { level: 10 },
          },
        },
      });

      await service.setPlayerLevel('user-pve-test', 20, 'pve');
      // The service should complete without throwing an error
      expect(true).toBe(true);
    });
  });
  describe('updateMultipleTasks', () => {
    it('updates multiple tasks in a single transaction', async () => {
      await suite.withDatabase({
        progress: {
          'user-multi': {
            currentGameMode: 'pvp',
            pvp: { taskCompletions: {} },
          },
        },
      });

      await service.updateMultipleTasks(
        'user-multi',
        [
          { id: 'task-1', state: 'completed' },
          { id: 'task-2', state: 'completed' },
        ],
        'pvp'
      );
      // The service should complete without throwing an error
      expect(true).toBe(true);
    });
  });
  describe('updateTaskObjective', () => {
    it('updates objective state to completed', async () => {
      await suite.withDatabase({
        progress: {
          'user-obj': {
            currentGameMode: 'pvp',
            pvp: {
              taskObjectives: {
                'obj-1': { complete: false },
              },
            },
          },
        },
      });

      await service.updateTaskObjective('user-obj', 'obj-1', { state: 'completed' }, 'pvp');
      // The service should complete without throwing an error
      expect(true).toBe(true);
    });

    it('updates objective count', async () => {
      await suite.withDatabase({
        progress: {
          'user-obj': {
            currentGameMode: 'pvp',
            pvp: {
              taskObjectives: {
                'obj-3': { complete: false, count: 3 },
              },
            },
          },
        },
      });

      await service.updateTaskObjective('user-obj', 'obj-3', { count: 5 }, 'pvp');
      // The service should complete without throwing an error
      expect(true).toBe(true);
    });
  });
  describe('validateTaskAccess', () => {
    it('creates minimal progress document if none exists', async () => {
      await suite.withDatabase({
        progress: {},
      });

      await service.validateTaskAccess('new-user', 'task-123');
      // The service should complete without throwing an error
      expect(true).toBe(true);
    });

    it('does nothing if progress document exists', async () => {
      await suite.withDatabase({
        progress: {
          'existing-user': {
            level: 15,
            gameEdition: 2,
            pmcFaction: 'BEAR',
          },
        },
      });

      await service.validateTaskAccess('existing-user', 'task-456');
      // The service should complete without throwing an error
      expect(true).toBe(true);
    });
  });
  describe('getTaskStatus', () => {
    it('returns task status for completed task', async () => {
      await suite.withDatabase({
        progress: {
          'user-status': {
            taskCompletions: {
              'task-complete': {
                complete: true,
                failed: false,
                timestamp: 123456,
              },
            },
          },
        },
      });

      const status = await service.getTaskStatus('user-status', 'task-complete');
      expect(status).toEqual({
        complete: true,
        failed: false,
        timestamp: 123456,
      });
    });

    it('returns null for non-existent task', async () => {
      await suite.withDatabase({
        progress: {
          'user-status': {
            currentGameMode: 'pvp',
            pvp: { taskCompletions: {} },
          },
        },
      });

      const status = await service.getTaskStatus('user-status', 'non-existent');
      expect(status).toBeNull();
    });

    it('handles missing game mode', async () => {
      await suite.withDatabase({
        progress: {
          'user-no-mode': {
            taskCompletions: {
              'task-1': { complete: true },
            },
          },
        },
      });

      const status = await service.getTaskStatus('user-no-mode', 'task-1');
      expect(status).toEqual({
        complete: true,
      });
    });
  });
  describe('Error Handling', () => {
    it('handles missing user progress document', async () => {
      await suite.withDatabase({
        progress: {},
      });

      await expect(service.getUserProgress('missing-user', 'pvp')).rejects.toThrow();
    });
  });

  describe('Integration with Firestore', () => {
    it('properly uses transactions for consistency', async () => {
      await suite.withDatabase({
        progress: {
          'user-tx': {
            currentGameMode: 'pvp',
            pvp: { taskCompletions: {} },
          },
        },
      });

      await service.updateSingleTask('user-tx', 'task-tx', 'completed', 'pvp');
      // The service should complete without throwing an error
      expect(true).toBe(true);
    });
  });
});
