import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { ApiResponse, ApiToken } from '../../src/types/api';
import { ProgressService, ValidationService } from '../../src/index';
import {
  getPlayerProgress,
  setPlayerLevel,
  updateSingleTask,
  updateMultipleTasks,
  updateTaskObjective
} from '../../src/handlers/progressHandler';
import { 
  createProgressServiceMock, 
  createValidationServiceMock,
  createFirestoreLazyMock 
} from '../helpers/serviceMocks';

// Mock services with factory pattern
vi.mock('../../src/services/ProgressService', () => createProgressServiceMock());
vi.mock('../../src/services/ValidationService', () => createValidationServiceMock());
vi.mock('../../src/utils/factory', () => ({
  createLazy: createFirestoreLazyMock
}));
describe('handlers/progressHandler', () => {
  let mockReq: any;
  let mockRes: any;
  let mockProgressService: any;
  let mockValidationService: any;
  beforeEach(async () => {
    vi.clearAllMocks();
    // Use mocked services from our factory
    mockProgressService = createProgressServiceMock();
    mockValidationService = createValidationServiceMock();
    vi.mocked(ProgressService).mockImplementation(() => mockProgressService);
    vi.mocked(ValidationService).mockImplementation(() => mockValidationService);
    // Mock the factory lazy initialization
    const factoryModule = await import('../../src/utils/factory');
    vi.mocked(factoryModule.createLazy).mockReturnValue(() => mockProgressService);
    mockReq = {
      apiToken: {
        owner: 'test-user-123',
        note: 'Test token',
        permissions: ['GP', 'WP'],
        gameMode: 'pvp',
        token: 'test-token-123'
      },
      query: {},
      params: {},
      body: {}
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });
  describe('resolveGameMode', () => {
    // We need to import the resolveGameMode function directly
    // For now, let's test the behavior through the handlers
    it('should use token gameMode for single mode tokens', async () => {
      mockReq.apiToken.gameMode = 'pve';
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockProgressService.getUserProgress.mockResolvedValue({ level: 25 });
      await getPlayerProgress(mockReq, mockRes, vi.fn());
      expect(mockProgressService.getUserProgress).toHaveBeenCalledWith(
        'test-user-123',
        'pve'
      );
    });
    it('should handle dual mode tokens with query parameter', async () => {
      mockReq.apiToken.gameMode = 'dual';
      mockReq.query.gameMode = 'pve';
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockProgressService.getUserProgress.mockResolvedValue({ level: 25 });
      await getPlayerProgress(mockReq, mockRes, vi.fn());
      expect(mockProgressService.getUserProgress).toHaveBeenCalledWith(
        'test-user-123',
        'pve'
      );
    });
  });
  describe('getPlayerProgress', () => {
    it('should return player progress successfully', async () => {
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockProgressService.getUserProgress.mockResolvedValue({
        level: 25,
        experience: 15000
      });
      await getPlayerProgress(mockReq, mockRes, vi.fn());
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { level: 25, experience: 15000 },
        meta: { self: 'test-user-123', gameMode: 'pvp' }
      });
    });
    it('should use default pvp gameMode when token gameMode is undefined', async () => {
      mockReq.apiToken.gameMode = undefined;
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockProgressService.getUserProgress.mockResolvedValue({ level: 25 });
      await getPlayerProgress(mockReq, mockRes, vi.fn());
      expect(mockProgressService.getUserProgress).toHaveBeenCalledWith(
        'test-user-123',
        'pvp'
      );
    });
    it('should handle empty progress data', async () => {
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockProgressService.getUserProgress.mockResolvedValue({});
      await getPlayerProgress(mockReq, mockRes, vi.fn());
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {},
        meta: { self: 'test-user-123', gameMode: 'pvp' }
      });
    });
  });
  describe('setPlayerLevel', () => {
    beforeEach(() => {
      mockReq.params.levelValue = '30';
    });
    it('should set player level successfully', async () => {
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateLevel.mockReturnValue(30);
      mockProgressService.setPlayerLevel.mockResolvedValue(undefined);
      await setPlayerLevel(mockReq, mockRes, vi.fn());
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          level: 30,
          message: 'Level updated successfully'
        }
      });
    });
    it('should handle minimum level value', async () => {
      mockReq.params.levelValue = '1';
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateLevel.mockReturnValue(1);
      await setPlayerLevel(mockReq, mockRes, vi.fn());
      expect(mockProgressService.setPlayerLevel).toHaveBeenCalledWith(
        'test-user-123',
        1,
        'pvp'
      );
    });
    it('should handle maximum level value', async () => {
      mockReq.params.levelValue = '79';
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateLevel.mockReturnValue(79);
      await setPlayerLevel(mockReq, mockRes, vi.fn());
      expect(mockProgressService.setPlayerLevel).toHaveBeenCalledWith(
        'test-user-123',
        79,
        'pvp'
      );
    });
    it('should use custom gameMode from query for dual mode tokens', async () => {
      mockReq.apiToken.gameMode = 'dual';
      mockReq.query.gameMode = 'pve';
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateLevel.mockReturnValue(30);
      await setPlayerLevel(mockReq, mockRes, vi.fn());
      expect(mockProgressService.setPlayerLevel).toHaveBeenCalledWith(
        'test-user-123',
        30,
        'pve'
      );
    });
  });
  describe('updateSingleTask', () => {
    beforeEach(() => {
      mockReq.params.taskId = 'task-123';
      mockReq.body = { state: 'completed' };
    });
    it('should update single task successfully', async () => {
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateTaskId.mockReturnValue('task-123');
      mockValidationService.validateTaskUpdate.mockReturnValue({ state: 'completed' });
      mockProgressService.updateSingleTask.mockResolvedValue(undefined);
      await updateSingleTask(mockReq, mockRes, vi.fn());
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          taskId: 'task-123',
          state: 'completed',
          message: 'Task updated successfully'
        }
      });
    });
    it('should handle task with failed state', async () => {
      mockReq.body = { state: 'failed' };
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateTaskId.mockReturnValue('task-123');
      mockValidationService.validateTaskUpdate.mockReturnValue({ state: 'failed' });
      mockProgressService.updateSingleTask.mockResolvedValue(undefined);
      await updateSingleTask(mockReq, mockRes, vi.fn());
      expect(mockProgressService.updateSingleTask).toHaveBeenCalledWith(
        'test-user-123',
        'task-123',
        'failed',
        'pvp'
      );
    });
    it('should handle task with uncompleted state', async () => {
      mockReq.body = { state: 'uncompleted' };
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateTaskId.mockReturnValue('task-123');
      mockValidationService.validateTaskUpdate.mockReturnValue({ state: 'uncompleted' });
      mockProgressService.updateSingleTask.mockResolvedValue(undefined);
      await updateSingleTask(mockReq, mockRes, vi.fn());
      expect(mockProgressService.updateSingleTask).toHaveBeenCalledWith(
        'test-user-123',
        'task-123',
        'uncompleted',
        'pvp'
      );
    });
    it('should pass gameMode correctly to service', async () => {
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateTaskId.mockReturnValue('task-123');
      mockValidationService.validateTaskUpdate.mockReturnValue({ state: 'completed' });
      mockProgressService.updateSingleTask.mockResolvedValue(undefined);
      await updateSingleTask(mockReq, mockRes, vi.fn());
      expect(mockProgressService.updateSingleTask).toHaveBeenCalledWith(
        'test-user-123',
        'task-123',
        'completed',
        'pvp'
      );
    });
  });
  describe('updateMultipleTasks', () => {
    beforeEach(() => {
      mockReq.body = {
        'task-1': 'completed',
        'task-2': 'uncompleted',
        'task-3': 'failed'
      };
    });
    it('should update multiple tasks successfully', async () => {
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateMultipleTaskUpdate.mockReturnValue({
        'task-1': 'completed',
        'task-2': 'uncompleted',
        'task-3': 'failed'
      });
      mockProgressService.updateMultipleTasks.mockResolvedValue(undefined);
      await updateMultipleTasks(mockReq, mockRes, vi.fn());
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          updatedTasks: ['task-1', 'task-2', 'task-3'],
          message: 'Tasks updated successfully'
        }
      });
    });
    it('should handle empty task updates', async () => {
      mockReq.body = {};
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateMultipleTaskUpdate.mockReturnValue({});
      mockProgressService.updateMultipleTasks.mockResolvedValue(undefined);
      await updateMultipleTasks(mockReq, mockRes, vi.fn());
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          updatedTasks: [],
          message: 'Tasks updated successfully'
        }
      });
    });
    it('should pass task updates correctly to service', async () => {
      const taskUpdates = {
        'task-1': 'completed',
        'task-2': 'failed'
      };
      mockReq.body = taskUpdates;
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateMultipleTaskUpdate.mockReturnValue(taskUpdates);
      mockProgressService.updateMultipleTasks.mockResolvedValue(undefined);
      await updateMultipleTasks(mockReq, mockRes, vi.fn());
      expect(mockProgressService.updateMultipleTasks).toHaveBeenCalledWith(
        'test-user-123',
        taskUpdates,
        'pvp'
      );
    });
  });
  describe('updateTaskObjective', () => {
    beforeEach(() => {
      mockReq.params.objectiveId = 'objective-123';
      mockReq.body = {
        state: 'completed',
        count: 5
      };
    });
    it('should update task objective successfully', async () => {
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateObjectiveId.mockReturnValue('objective-123');
      mockValidationService.validateObjectiveUpdate.mockReturnValue({
        state: 'completed',
        count: 5
      });
      mockProgressService.updateTaskObjective.mockResolvedValue(undefined);
      await updateTaskObjective(mockReq, mockRes, vi.fn());
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          objectiveId: 'objective-123',
          state: 'completed',
          count: 5,
          message: 'Task objective updated successfully'
        }
      });
    });
    it('should handle update with only state', async () => {
      mockReq.body = { state: 'completed' };
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateObjectiveId.mockReturnValue('objective-123');
      mockValidationService.validateObjectiveUpdate.mockReturnValue({
        state: 'completed'
      });
      mockProgressService.updateTaskObjective.mockResolvedValue(undefined);
      await updateTaskObjective(mockReq, mockRes, vi.fn());
      expect(mockProgressService.updateTaskObjective).toHaveBeenCalledWith(
        'test-user-123',
        'objective-123',
        { state: 'completed' },
        'pvp'
      );
    });
    it('should handle update with only count', async () => {
      mockReq.body = { count: 10 };
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateObjectiveId.mockReturnValue('objective-123');
      mockValidationService.validateObjectiveUpdate.mockReturnValue({
        count: 10
      });
      mockProgressService.updateTaskObjective.mockResolvedValue(undefined);
      await updateTaskObjective(mockReq, mockRes, vi.fn());
      expect(mockProgressService.updateTaskObjective).toHaveBeenCalledWith(
        'test-user-123',
        'objective-123',
        { count: 10 },
        'pvp'
      );
    });
    it('should handle update with both state and count', async () => {
      const updateData = { state: 'completed', count: 15 };
      mockReq.body = updateData;
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockValidationService.validateObjectiveId.mockReturnValue('objective-123');
      mockValidationService.validateObjectiveUpdate.mockReturnValue(updateData);
      mockProgressService.updateTaskObjective.mockResolvedValue(undefined);
      await updateTaskObjective(mockReq, mockRes, vi.fn());
      expect(mockProgressService.updateTaskObjective).toHaveBeenCalledWith(
        'test-user-123',
        'objective-123',
        updateData,
        'pvp'
      );
    });
  });
  describe('Error handling through asyncHandler', () => {
    it('should handle validation errors gracefully', async () => {
      const validationError = new Error('Invalid user ID');
      mockValidationService.validateUserId.mockImplementation(() => {
        throw validationError;
      });
      await getPlayerProgress(mockReq, mockRes, vi.fn());
      // Since asyncHandler catches errors and passes them to next,
      // we need to check if next was called with the error
      expect(vi.fn()).toHaveBeenCalled(); // This will be called by asyncHandler
    });
    it('should handle progress service errors', async () => {
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      const serviceError = new Error('Database connection failed');
      mockProgressService.getUserProgress.mockRejectedValue(serviceError);
      await getPlayerProgress(mockReq, mockRes, vi.fn());
      // asyncHandler should catch this and pass to next
      expect(vi.fn()).toHaveBeenCalled();
    });
  });
  describe('API response structure', () => {
    it('should return consistent API response format', async () => {
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockProgressService.getUserProgress.mockResolvedValue({ level: 25 });
      await getPlayerProgress(mockReq, mockRes, vi.fn());
      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('meta');
      expect(response.success).toBe(true);
    });
    it('should include meta information in responses', async () => {
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockProgressService.getUserProgress.mockResolvedValue({ level: 25 });
      await getPlayerProgress(mockReq, mockRes, vi.fn());
      const response = mockRes.json.mock.calls[0][0];
      expect(response.meta).toHaveProperty('self');
      expect(response.meta).toHaveProperty('gameMode');
      expect(response.meta.self).toBe('test-user-123');
      expect(response.meta.gameMode).toBe('pvp');
    });
  });
  describe('Game mode handling', () => {
    it('should handle dual mode tokens without query parameter', async () => {
      mockReq.apiToken.gameMode = 'dual';
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockProgressService.getUserProgress.mockResolvedValue({ level: 25 });
      await getPlayerProgress(mockReq, mockRes, vi.fn());
      expect(mockProgressService.getUserProgress).toHaveBeenCalledWith(
        'test-user-123',
        'pvp' // Default when no query parameter
      );
    });
    it('should handle invalid query gameMode parameter', async () => {
      mockReq.apiToken.gameMode = 'dual';
      mockReq.query.gameMode = 'invalid';
      mockValidationService.validateUserId.mockReturnValue('test-user-123');
      mockProgressService.getUserProgress.mockResolvedValue({ level: 25 });
      await getPlayerProgress(mockReq, mockRes, vi.fn());
      expect(mockProgressService.getUserProgress).toHaveBeenCalledWith(
        'test-user-123',
        'pvp' // Should default to pvp for invalid values
      );
    });
  });
});
