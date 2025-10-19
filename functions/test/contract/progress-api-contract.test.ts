/**
 * API Contract Tests for Progress Endpoints
 * 
 * These tests ensure that API response structures remain stable for third-party consumers.
 * Any breaking changes to these contracts should cause tests to fail and require explicit version bumps.
 * 
 * Purpose: Prevent incidents where API output changes break third-party integrations
 * 
 * Approach: Tests the actual handler layer by calling real handler functions with mocked requests.
 * This validates the complete API response structure including success/data/meta wrappers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper to create mock Express request
const createMockRequest = (apiToken: any, params = {}, body = {}, query = {}) => ({
  apiToken,
  params,
  body,
  query,
});

// Helper to create mock Express response
const createMockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('Progress API Contract Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/v2/progress - Response Structure', () => {
    it('returns the correct API response structure with all required fields', async () => {
      // Mock the service layer (infrastructure)
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      vi.spyOn(ProgressService.prototype, 'getUserProgress').mockResolvedValue({
        tasksProgress: [
          { id: 'task-1', complete: true, failed: false },
          { id: 'task-2', complete: false },
        ],
        taskObjectivesProgress: [
          { id: 'obj-1', complete: true, count: 5 },
        ],
        hideoutModulesProgress: [
          { id: 'hideout-1', complete: true },
        ],
        hideoutPartsProgress: [
          { id: 'part-1', complete: true, count: 3 },
        ],
        displayName: 'TestPlayer',
        userId: 'test-user-123',
        playerLevel: 42,
        gameEdition: 3,
        pmcFaction: 'USEC',
      });

      // Import and call the actual handler
      const progressHandler = (await import('../../lib/handlers/progressHandler.js')).default;
      const req = createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' });
      const res = createMockResponse();

      await progressHandler.getPlayerProgress(req, res);

      // Validate the handler was called and responded correctly
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tasksProgress: expect.any(Array),
            taskObjectivesProgress: expect.any(Array),
            hideoutModulesProgress: expect.any(Array),
            hideoutPartsProgress: expect.any(Array),
            displayName: expect.any(String),
            userId: expect.any(String),
            playerLevel: expect.any(Number),
            gameEdition: expect.any(Number),
            pmcFaction: expect.any(String),
          }),
          meta: expect.objectContaining({
            self: 'test-user-123',
            gameMode: 'pvp',
          }),
        })
      );

      // Verify the actual response data structure
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('tasksProgress');
      expect(responseData.data).toHaveProperty('taskObjectivesProgress');
      expect(responseData.data).toHaveProperty('hideoutModulesProgress');
      expect(responseData.data).toHaveProperty('hideoutPartsProgress');
      expect(responseData.data).toHaveProperty('displayName');
      expect(responseData.data).toHaveProperty('userId');
      expect(responseData.data).toHaveProperty('playerLevel');
      expect(responseData.data).toHaveProperty('gameEdition');
      expect(responseData.data).toHaveProperty('pmcFaction');
      expect(responseData.meta).toHaveProperty('self');
      expect(responseData.meta).toHaveProperty('gameMode');
    });

    it('ensures tasksProgress items have required fields', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      vi.spyOn(ProgressService.prototype, 'getUserProgress').mockResolvedValue({
        tasksProgress: [
          { id: 'task-1', complete: true, failed: false },
          { id: 'task-2', complete: false },
          { id: 'task-3', complete: true, failed: true },
        ],
        taskObjectivesProgress: [],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
        displayName: 'TestPlayer',
        userId: 'test-user-123',
        playerLevel: 42,
        gameEdition: 3,
        pmcFaction: 'USEC',
      });

      const progressHandler = (await import('../../lib/handlers/progressHandler.js')).default;
      const req = createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' });
      const res = createMockResponse();

      await progressHandler.getPlayerProgress(req, res);

      const responseData = res.json.mock.calls[0][0];
      
      // Every task must have id and complete fields
      responseData.data.tasksProgress.forEach((task: any) => {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('complete');
        expect(typeof task.id).toBe('string');
        expect(typeof task.complete).toBe('boolean');
        
        // If failed is present, it must be boolean
        if ('failed' in task) {
          expect(typeof task.failed).toBe('boolean');
        }
      });
    });

    it('ensures taskObjectivesProgress items have correct schema', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      vi.spyOn(ProgressService.prototype, 'getUserProgress').mockResolvedValue({
        tasksProgress: [],
        taskObjectivesProgress: [
          { id: 'obj-1', complete: true, count: 5 },
          { id: 'obj-2', complete: false, count: 0 },
          { id: 'obj-3', complete: true },
        ],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
        displayName: 'TestPlayer',
        userId: 'test-user-123',
        playerLevel: 42,
        gameEdition: 3,
        pmcFaction: 'USEC',
      });

      const progressHandler = (await import('../../lib/handlers/progressHandler.js')).default;
      const req = createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' });
      const res = createMockResponse();

      await progressHandler.getPlayerProgress(req, res);

      const responseData = res.json.mock.calls[0][0];

      responseData.data.taskObjectivesProgress.forEach((objective: any) => {
        expect(objective).toHaveProperty('id');
        expect(objective).toHaveProperty('complete');
        expect(typeof objective.id).toBe('string');
        expect(typeof objective.complete).toBe('boolean');
        
        // If count is present, it must be a number
        if ('count' in objective) {
          expect(typeof objective.count).toBe('number');
        }
      });
    });

    it('ensures playerLevel is a valid number', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      vi.spyOn(ProgressService.prototype, 'getUserProgress').mockResolvedValue({
        tasksProgress: [],
        taskObjectivesProgress: [],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
        displayName: 'TestPlayer',
        userId: 'test-user-123',
        playerLevel: 42,
        gameEdition: 3,
        pmcFaction: 'USEC',
      });

      const progressHandler = (await import('../../lib/handlers/progressHandler.js')).default;
      const req = createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' });
      const res = createMockResponse();

      await progressHandler.getPlayerProgress(req, res);

      const responseData = res.json.mock.calls[0][0];

      expect(typeof responseData.data.playerLevel).toBe('number');
      expect(responseData.data.playerLevel).toBeGreaterThanOrEqual(1);
      expect(responseData.data.playerLevel).toBeLessThanOrEqual(79);
      expect(Number.isInteger(responseData.data.playerLevel)).toBe(true);
    });

    it('ensures pmcFaction is a valid value', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      vi.spyOn(ProgressService.prototype, 'getUserProgress').mockResolvedValue({
        tasksProgress: [],
        taskObjectivesProgress: [],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
        displayName: 'TestPlayer',
        userId: 'test-user-123',
        playerLevel: 42,
        gameEdition: 3,
        pmcFaction: 'USEC',
      });

      const progressHandler = (await import('../../lib/handlers/progressHandler.js')).default;
      const req = createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' });
      const res = createMockResponse();

      await progressHandler.getPlayerProgress(req, res);

      const responseData = res.json.mock.calls[0][0];

      expect(typeof responseData.data.pmcFaction).toBe('string');
      expect(['USEC', 'BEAR']).toContain(responseData.data.pmcFaction);
    });
  });

  describe('POST /api/v2/progress/task/:taskId - Response Structure', () => {
    it('returns standardized success response', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      vi.spyOn(ProgressService.prototype, 'updateSingleTask').mockResolvedValue(undefined);

      const progressHandler = (await import('../../lib/handlers/progressHandler.js')).default;
      const req = createMockRequest(
        { owner: 'test-user', permissions: ['WP'] },
        { taskId: 'task-123' },
        { state: 'completed' }
      );
      const res = createMockResponse();

      await progressHandler.updateSingleTask(req, res);

      // Validate the handler response structure
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            taskId: 'task-123',
            state: 'completed',
            message: expect.any(String),
          }),
        })
      );
    });
  });

  describe('POST /api/v2/progress/level/:levelValue - Response Structure', () => {
    it('returns standardized success response with level confirmation', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      vi.spyOn(ProgressService.prototype, 'setPlayerLevel').mockResolvedValue(undefined);

      const progressHandler = (await import('../../lib/handlers/progressHandler.js')).default;
      const req = createMockRequest(
        { owner: 'test-user', permissions: ['WP'] },
        { levelValue: '42' }
      );
      const res = createMockResponse();

      await progressHandler.setPlayerLevel(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            level: expect.any(Number),
            message: expect.any(String),
          }),
        })
      );

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.level).toBeGreaterThanOrEqual(1);
      expect(responseData.data.level).toBeLessThanOrEqual(79);
    });
  });

  describe('POST /api/v2/progress/tasks - Response Structure', () => {
    it('returns standardized success response with updated task list', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      vi.spyOn(ProgressService.prototype, 'updateMultipleTasks').mockResolvedValue(undefined);

      const progressHandler = (await import('../../lib/handlers/progressHandler.js')).default;
      const req = createMockRequest(
        { owner: 'test-user', permissions: ['WP'] },
        {},
        [{ id: 'task-1', state: 'completed' }, { id: 'task-2', state: 'uncompleted' }]  // Body should be an array with id and state
      );
      const res = createMockResponse();

      await progressHandler.updateMultipleTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: expect.any(String),
          }),
        })
      );
    });
  });

  describe('POST /api/v2/progress/task/objective/:objectiveId - Response Structure', () => {
    it('returns standardized success response with objective update confirmation', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      vi.spyOn(ProgressService.prototype, 'updateTaskObjective').mockResolvedValue(undefined);

      const progressHandler = (await import('../../lib/handlers/progressHandler.js')).default;
      const req = createMockRequest(
        { owner: 'test-user', permissions: ['WP'] },
        { objectiveId: 'obj-123' },
        { state: 'completed', count: 5 }
      );
      const res = createMockResponse();

      await progressHandler.updateTaskObjective(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      
      expect(responseData).toMatchObject({
        success: true,
        data: expect.objectContaining({
          objectiveId: expect.any(String),
          message: expect.any(String),
        }),
      });

      // State and count are optional but must be correct type if present
      if ('state' in responseData.data) {
        expect(['completed', 'uncompleted']).toContain(responseData.data.state);
      }
      if ('count' in responseData.data) {
        expect(typeof responseData.data.count).toBe('number');
        expect(responseData.data.count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Backward Compatibility Tests', () => {
    it('maintains backward compatibility: no fields are removed', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      vi.spyOn(ProgressService.prototype, 'getUserProgress').mockResolvedValue({
        tasksProgress: [],
        taskObjectivesProgress: [],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
        displayName: 'TestPlayer',
        userId: 'test-user-123',
        playerLevel: 42,
        gameEdition: 3,
        pmcFaction: 'USEC',
      });

      const progressHandler = (await import('../../lib/handlers/progressHandler.js')).default;
      const req = createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' });
      const res = createMockResponse();

      await progressHandler.getPlayerProgress(req, res);

      const responseData = res.json.mock.calls[0][0];

      // CRITICAL: These fields must always be present in the API response for backward compatibility
      const requiredFields = [
        'success',
        'data',
        'meta',
      ];

      requiredFields.forEach(field => {
        expect(responseData).toHaveProperty(field);
      });

      const requiredDataFields = [
        'tasksProgress',
        'taskObjectivesProgress',
        'hideoutModulesProgress',
        'hideoutPartsProgress',
        'displayName',
        'userId',
        'playerLevel',
        'gameEdition',
        'pmcFaction',
      ];

      requiredDataFields.forEach(field => {
        expect(responseData.data).toHaveProperty(field);
      });
    });

    it('maintains backward compatibility: field types remain consistent', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      vi.spyOn(ProgressService.prototype, 'getUserProgress').mockResolvedValue({
        tasksProgress: [],
        taskObjectivesProgress: [],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
        displayName: 'TestPlayer',
        userId: 'test-user-123',
        playerLevel: 42,
        gameEdition: 3,
        pmcFaction: 'USEC',
      });

      const progressHandler = (await import('../../lib/handlers/progressHandler.js')).default;
      const req = createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' });
      const res = createMockResponse();

      await progressHandler.getPlayerProgress(req, res);

      const responseData = res.json.mock.calls[0][0];

      // CRITICAL: Response wrapper types must never change
      expect(typeof responseData.success).toBe('boolean');
      expect(typeof responseData.data).toBe('object');
      expect(typeof responseData.meta).toBe('object');

      // CRITICAL: Data field types must never change for backward compatibility
      expect(Array.isArray(responseData.data.tasksProgress)).toBe(true);
      expect(Array.isArray(responseData.data.taskObjectivesProgress)).toBe(true);
      expect(Array.isArray(responseData.data.hideoutModulesProgress)).toBe(true);
      expect(Array.isArray(responseData.data.hideoutPartsProgress)).toBe(true);
      expect(typeof responseData.data.displayName).toBe('string');
      expect(typeof responseData.data.userId).toBe('string');
      expect(typeof responseData.data.playerLevel).toBe('number');
      expect(typeof responseData.data.gameEdition).toBe('number');
      expect(typeof responseData.data.pmcFaction).toBe('string');
    });
  });

  describe('Error Response Contracts', () => {
    it('returns standardized error payloads when the progress service throws an ApiError', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      const { errorHandler, errors } = await import('../../lib/middleware/errorHandler.js');
      const progressHandler = (await import('../../lib/handlers/progressHandler.js')).default;

      vi.spyOn(ProgressService.prototype, 'getUserProgress').mockRejectedValue(
        errors.serviceUnavailable('Progress temporarily unavailable')
      );

      const req: any = {
        ...createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' }),
        method: 'GET',
        originalUrl: '/api/v2/progress',
        headers: {},
      };
      const res = createMockResponse();

      await new Promise(resolve => {
        const next = (err: unknown) => {
          errorHandler(err as Error, req, res, vi.fn());
          resolve(undefined);
        };

        progressHandler.getPlayerProgress(req, res, next);
      });

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Progress temporarily unavailable',
          meta: expect.objectContaining({
            code: 'SERVICE_UNAVAILABLE',
            timestamp: expect.any(String),
          }),
        })
      );

      const errorPayload = res.json.mock.calls[0][0];
      expect(errorPayload.success).toBe(false);
      expect(typeof errorPayload.error).toBe('string');
      expect(typeof errorPayload.meta.timestamp).toBe('string');
      expect(errorPayload.meta.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('falls back to the generic error contract for unexpected failures', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      const { errorHandler } = await import('../../lib/middleware/errorHandler.js');
      const progressHandler = (await import('../../lib/handlers/progressHandler.js')).default;

      vi.spyOn(ProgressService.prototype, 'getUserProgress').mockRejectedValue(
        new Error('Database unavailable')
      );

      const req: any = {
        ...createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' }),
        method: 'GET',
        originalUrl: '/api/v2/progress',
        headers: {},
      };
      const res = createMockResponse();

      await new Promise(resolve => {
        const next = (err: unknown) => {
          errorHandler(err as Error, req, res, vi.fn());
          resolve(undefined);
        };

        progressHandler.getPlayerProgress(req, res, next);
      });

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Internal server error',
          meta: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            timestamp: expect.any(String),
          }),
        })
      );

      const errorPayload = res.json.mock.calls[0][0];
      expect(errorPayload.success).toBe(false);
      expect(errorPayload.meta.code).toBe('INTERNAL_ERROR');
      expect(typeof errorPayload.meta.timestamp).toBe('string');
    });
  });
});
