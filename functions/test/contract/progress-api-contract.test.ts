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
import type { FormattedProgress } from '../../src/types/api.ts';

type ProgressLevelResponse = {
  level: number;
  message: string;
};

type ProgressTaskResponse = {
  taskId: string;
  state: string;
  message: string;
};

type ProgressObjectiveResponse = {
  objectiveId: string;
  message: string;
  state?: string;
  count?: number;
};

type ProgressMessageResponse = {
  message: string;
};

type ProgressResponseData =
  | FormattedProgress
  | ProgressLevelResponse
  | ProgressTaskResponse
  | ProgressObjectiveResponse
  | ProgressMessageResponse;

type MockResponse = {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

// Helper to create mock Express request
const createMockRequest = (apiToken: any, params = {}, body = {}, query = {}) => ({
  apiToken,
  params,
  body,
  query,
});

// Helper to create mock Express response
const createMockResponse = (): MockResponse => {
  const res = {} as MockResponse;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

type ProgressResponse = {
  success: boolean;
  data: ProgressResponseData;
  meta: Record<string, unknown>;
};

const isFormattedProgress = (data: ProgressResponseData): data is FormattedProgress => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<FormattedProgress>;

  return (
    Array.isArray(candidate.tasksProgress) &&
    Array.isArray(candidate.taskObjectivesProgress) &&
    Array.isArray(candidate.hideoutModulesProgress) &&
    Array.isArray(candidate.hideoutPartsProgress) &&
    typeof candidate.displayName === 'string' &&
    typeof candidate.userId === 'string' &&
    typeof candidate.playerLevel === 'number' &&
    typeof candidate.gameEdition === 'number' &&
    typeof candidate.pmcFaction === 'string'
  );
};

const asFormattedProgress = (data: ProgressResponseData): FormattedProgress => {
  if (!isFormattedProgress(data)) {
    throw new Error(
      `Progress handler returned unexpected data shape for formatted progress assertions: ${JSON.stringify(data)}`
    );
  }

  return data;
};

const isProgressLevelResponse = (data: ProgressResponseData): data is ProgressLevelResponse => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<ProgressLevelResponse>;

  return typeof candidate.level === 'number' && Number.isFinite(candidate.level) && typeof candidate.message === 'string';
};

const asProgressLevelResponse = (data: ProgressResponseData): ProgressLevelResponse => {
  if (!isProgressLevelResponse(data)) {
    throw new Error(
      `Level handler returned unexpected data shape: ${JSON.stringify(data)}`
    );
  }

  return data;
};

const isProgressObjectiveResponse = (
  data: ProgressResponseData
): data is ProgressObjectiveResponse => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<ProgressObjectiveResponse>;

  return (
    typeof candidate.objectiveId === 'string' &&
    typeof candidate.message === 'string' &&
    (candidate.state === undefined || typeof candidate.state === 'string') &&
    (candidate.count === undefined || typeof candidate.count === 'number')
  );
};

const asProgressObjectiveResponse = (data: ProgressResponseData): ProgressObjectiveResponse => {
  if (!isProgressObjectiveResponse(data)) {
    throw new Error(
      `Objective handler returned unexpected data shape: ${JSON.stringify(data)}`
    );
  }

  return data;
};

const readProgressResponse = (res: MockResponse): ProgressResponse =>
  res.json.mock.calls[0][0] as ProgressResponse;

describe('Progress API Contract Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/v2/progress - Response Structure', () => {
    it('returns the correct API response structure with all required fields', async () => {
      // Mock the service layer (infrastructure)
      const { ProgressService } = await import('../../src/services/ProgressService.ts');
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
      const progressHandler = (await import('../../src/handlers/progressHandler.ts')).default;
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
      const responseData = readProgressResponse(res);
      const formattedProgress = asFormattedProgress(responseData.data);
      expect(responseData.success).toBe(true);
      expect(formattedProgress).toHaveProperty('tasksProgress');
      expect(formattedProgress).toHaveProperty('taskObjectivesProgress');
      expect(formattedProgress).toHaveProperty('hideoutModulesProgress');
      expect(formattedProgress).toHaveProperty('hideoutPartsProgress');
      expect(formattedProgress).toHaveProperty('displayName');
      expect(formattedProgress).toHaveProperty('userId');
      expect(formattedProgress).toHaveProperty('playerLevel');
      expect(formattedProgress).toHaveProperty('gameEdition');
      expect(formattedProgress).toHaveProperty('pmcFaction');
      expect(responseData.meta).toHaveProperty('self');
      expect(responseData.meta).toHaveProperty('gameMode');
    });

    it('ensures tasksProgress items have required fields', async () => {
      const { ProgressService } = await import('../../src/services/ProgressService.ts');
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

      const progressHandler = (await import('../../src/handlers/progressHandler.ts')).default;
      const req = createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' });
      const res = createMockResponse();

      await progressHandler.getPlayerProgress(req, res);

      const responseData = readProgressResponse(res);
      const formattedProgress = asFormattedProgress(responseData.data);

      // Every task must have id and complete fields
      formattedProgress.tasksProgress.forEach((task: any) => {
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
      const { ProgressService } = await import('../../src/services/ProgressService.ts');
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

      const progressHandler = (await import('../../src/handlers/progressHandler.ts')).default;
      const req = createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' });
      const res = createMockResponse();

      await progressHandler.getPlayerProgress(req, res);

      const responseData = readProgressResponse(res);
      const formattedProgress = asFormattedProgress(responseData.data);

      formattedProgress.taskObjectivesProgress.forEach((objective: any) => {
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
      const { ProgressService } = await import('../../src/services/ProgressService.ts');
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

      const progressHandler = (await import('../../src/handlers/progressHandler.ts')).default;
      const req = createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' });
      const res = createMockResponse();

      await progressHandler.getPlayerProgress(req, res);

      const responseData = readProgressResponse(res);
      const formattedProgress = asFormattedProgress(responseData.data);

      expect(typeof formattedProgress.playerLevel).toBe('number');
      expect(formattedProgress.playerLevel).toBeGreaterThanOrEqual(1);
      expect(formattedProgress.playerLevel).toBeLessThanOrEqual(79);
      expect(Number.isInteger(formattedProgress.playerLevel)).toBe(true);
    });

    it('ensures pmcFaction is a valid value', async () => {
      const { ProgressService } = await import('../../src/services/ProgressService.ts');
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

      const progressHandler = (await import('../../src/handlers/progressHandler.ts')).default;
      const req = createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' });
      const res = createMockResponse();

      await progressHandler.getPlayerProgress(req, res);

      const responseData = readProgressResponse(res);
      const formattedProgress = asFormattedProgress(responseData.data);

      expect(typeof formattedProgress.pmcFaction).toBe('string');
      expect(['USEC', 'BEAR']).toContain(formattedProgress.pmcFaction);
    });
  });

  describe('POST /api/v2/progress/task/:taskId - Response Structure', () => {
    it('returns standardized success response', async () => {
      const { ProgressService } = await import('../../src/services/ProgressService.ts');
      vi.spyOn(ProgressService.prototype, 'updateSingleTask').mockResolvedValue(undefined);

      const progressHandler = (await import('../../src/handlers/progressHandler.ts')).default;
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
      const { ProgressService } = await import('../../src/services/ProgressService.ts');
      vi.spyOn(ProgressService.prototype, 'setPlayerLevel').mockResolvedValue(undefined);

      const progressHandler = (await import('../../src/handlers/progressHandler.ts')).default;
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

      const responseData = readProgressResponse(res);
      const levelResponse = asProgressLevelResponse(responseData.data);
      expect(levelResponse.level).toBeGreaterThanOrEqual(1);
      expect(levelResponse.level).toBeLessThanOrEqual(79);
    });
  });

  describe('POST /api/v2/progress/tasks - Response Structure', () => {
    it('returns standardized success response with updated task list', async () => {
      const { ProgressService } = await import('../../src/services/ProgressService.ts');
      vi.spyOn(ProgressService.prototype, 'updateMultipleTasks').mockResolvedValue(undefined);

      const progressHandler = (await import('../../src/handlers/progressHandler.ts')).default;
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
      const { ProgressService } = await import('../../src/services/ProgressService.ts');
      vi.spyOn(ProgressService.prototype, 'updateTaskObjective').mockResolvedValue(undefined);

      const progressHandler = (await import('../../src/handlers/progressHandler.ts')).default;
      const req = createMockRequest(
        { owner: 'test-user', permissions: ['WP'] },
        { objectiveId: 'obj-123' },
        { state: 'completed', count: 5 }
      );
      const res = createMockResponse();

      await progressHandler.updateTaskObjective(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = readProgressResponse(res);
      
      expect(responseData).toMatchObject({
        success: true,
        data: expect.objectContaining({
          objectiveId: expect.any(String),
          message: expect.any(String),
        }),
      });

      const objectiveResponse = asProgressObjectiveResponse(responseData.data);
      // State and count are optional but must be correct type if present
      if ('state' in objectiveResponse) {
        expect(['completed', 'uncompleted']).toContain(objectiveResponse.state);
      }
      if ('count' in objectiveResponse) {
        expect(typeof objectiveResponse.count).toBe('number');
        expect(objectiveResponse.count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Backward Compatibility Tests', () => {
    it('maintains backward compatibility: no fields are removed', async () => {
      const { ProgressService } = await import('../../src/services/ProgressService.ts');
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

      const progressHandler = (await import('../../src/handlers/progressHandler.ts')).default;
      const req = createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' });
      const res = createMockResponse();

      await progressHandler.getPlayerProgress(req, res);

      const responseData = readProgressResponse(res);
      const formattedProgress = asFormattedProgress(responseData.data);

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
        expect(formattedProgress).toHaveProperty(field);
      });
    });

    it('maintains backward compatibility: field types remain consistent', async () => {
      const { ProgressService } = await import('../../src/services/ProgressService.ts');
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

      const progressHandler = (await import('../../src/handlers/progressHandler.ts')).default;
      const req = createMockRequest({ owner: 'test-user-123', gameMode: 'pvp' });
      const res = createMockResponse();

      await progressHandler.getPlayerProgress(req, res);

      const responseData = readProgressResponse(res);
      const formattedProgress = asFormattedProgress(responseData.data);

      // CRITICAL: Response wrapper types must never change
      expect(typeof responseData.success).toBe('boolean');
      expect(typeof responseData.data).toBe('object');
      expect(typeof responseData.meta).toBe('object');

      // CRITICAL: Data field types must never change for backward compatibility
      expect(Array.isArray(formattedProgress.tasksProgress)).toBe(true);
      expect(Array.isArray(formattedProgress.taskObjectivesProgress)).toBe(true);
      expect(Array.isArray(formattedProgress.hideoutModulesProgress)).toBe(true);
      expect(Array.isArray(formattedProgress.hideoutPartsProgress)).toBe(true);
      expect(typeof formattedProgress.displayName).toBe('string');
      expect(typeof formattedProgress.userId).toBe('string');
      expect(typeof formattedProgress.playerLevel).toBe('number');
      expect(typeof formattedProgress.gameEdition).toBe('number');
      expect(typeof formattedProgress.pmcFaction).toBe('string');
    });
  });

  describe('Error Response Contracts', () => {
    it('returns standardized error payloads when the progress service throws an ApiError', async () => {
      const { ProgressService } = await import('../../src/services/ProgressService.ts');
      const { errorHandler, errors } = await import('../../src/middleware/errorHandler.ts');
      const progressHandler = (await import('../../src/handlers/progressHandler.ts')).default;

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
      const { ProgressService } = await import('../../src/services/ProgressService.ts');
      const { errorHandler } = await import('../../src/middleware/errorHandler.ts');
      const progressHandler = (await import('../../src/handlers/progressHandler.ts')).default;

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
