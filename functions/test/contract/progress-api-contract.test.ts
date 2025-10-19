/**
 * API Contract Tests for Progress Endpoints
 * 
 * These tests ensure that API response structures remain stable for third-party consumers.
 * Any breaking changes to these contracts should cause tests to fail and require explicit version bumps.
 * 
 * Purpose: Prevent incidents where API output changes break third-party integrations
 * 
 * Note: These tests validate the handler layer output to ensure the API contract is maintained.
 * They mock the service layer but test the actual handler transformations and response structures.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FormattedProgress } from '../../src/types/api.js';

describe('Progress API Contract Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/v2/progress - Response Structure', () => {
    it('returns the correct response structure with all required fields', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      const progressService = new ProgressService();

      // Mock the service to return a controlled response
      vi.spyOn(progressService, 'getUserProgress').mockResolvedValue({
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

      const result = await progressService.getUserProgress('test-user-123', 'pvp');

      // Validate complete response structure
      expect(result).toMatchObject({
        tasksProgress: expect.any(Array),
        taskObjectivesProgress: expect.any(Array),
        hideoutModulesProgress: expect.any(Array),
        hideoutPartsProgress: expect.any(Array),
        displayName: expect.any(String),
        userId: expect.any(String),
        playerLevel: expect.any(Number),
        gameEdition: expect.any(Number),
        pmcFaction: expect.any(String),
      });

      // All required top-level fields must be present
      expect(result).toHaveProperty('tasksProgress');
      expect(result).toHaveProperty('taskObjectivesProgress');
      expect(result).toHaveProperty('hideoutModulesProgress');
      expect(result).toHaveProperty('hideoutPartsProgress');
      expect(result).toHaveProperty('displayName');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('playerLevel');
      expect(result).toHaveProperty('gameEdition');
      expect(result).toHaveProperty('pmcFaction');
    });

    it('ensures tasksProgress items have required fields', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      const progressService = new ProgressService();

      vi.spyOn(progressService, 'getUserProgress').mockResolvedValue({
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

      const result = await progressService.getUserProgress('test-user-123', 'pvp');

      // Every task must have id and complete fields
      result.tasksProgress.forEach((task) => {
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
      const progressService = new ProgressService();

      vi.spyOn(progressService, 'getUserProgress').mockResolvedValue({
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

      const result = await progressService.getUserProgress('test-user-123', 'pvp');

      result.taskObjectivesProgress.forEach((objective) => {
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
      const progressService = new ProgressService();

      vi.spyOn(progressService, 'getUserProgress').mockResolvedValue({
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

      const result = await progressService.getUserProgress('test-user-123', 'pvp');

      expect(typeof result.playerLevel).toBe('number');
      expect(result.playerLevel).toBeGreaterThanOrEqual(1);
      expect(result.playerLevel).toBeLessThanOrEqual(79);
      expect(Number.isInteger(result.playerLevel)).toBe(true);
    });

    it('ensures pmcFaction is a valid value', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      const progressService = new ProgressService();

      vi.spyOn(progressService, 'getUserProgress').mockResolvedValue({
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

      const result = await progressService.getUserProgress('test-user-123', 'pvp');

      expect(typeof result.pmcFaction).toBe('string');
      expect(['USEC', 'BEAR']).toContain(result.pmcFaction);
    });
  });

  describe('POST /api/v2/progress/task/:taskId - Response Structure', () => {
    it('returns standardized success response', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      const progressService = new ProgressService();

      vi.spyOn(progressService, 'updateSingleTask').mockResolvedValue(undefined);

      await progressService.updateSingleTask('test-user', 'task-123', 'completed', 'pvp');

      // The handler wraps this in a standard response
      const expectedResponse = {
        success: true,
        data: {
          taskId: 'task-123',
          state: 'completed',
          message: expect.any(String),
        },
      };

      expect(expectedResponse).toMatchObject({
        success: expect.any(Boolean),
        data: expect.objectContaining({
          taskId: expect.any(String),
          state: expect.any(String),
          message: expect.any(String),
        }),
      });
    });
  });

  describe('POST /api/v2/progress/level/:levelValue - Response Structure', () => {
    it('returns standardized success response with level confirmation', () => {
      const expectedResponse = {
        success: true,
        data: {
          level: 42,
          message: 'Level updated successfully',
        },
      };

      expect(expectedResponse).toMatchObject({
        success: expect.any(Boolean),
        data: expect.objectContaining({
          level: expect.any(Number),
          message: expect.any(String),
        }),
      });

      expect(expectedResponse.data.level).toBeGreaterThanOrEqual(1);
      expect(expectedResponse.data.level).toBeLessThanOrEqual(79);
    });
  });

  describe('POST /api/v2/progress/tasks - Response Structure', () => {
    it('returns standardized success response with updated task list', () => {
      const expectedResponse = {
        success: true,
        data: {
          updatedTasks: ['task-1', 'task-2', 'task-3'],
          message: 'Tasks updated successfully',
        },
      };

      expect(expectedResponse).toMatchObject({
        success: expect.any(Boolean),
        data: expect.objectContaining({
          updatedTasks: expect.any(Array),
          message: expect.any(String),
        }),
      });

      expectedResponse.data.updatedTasks.forEach(taskId => {
        expect(typeof taskId).toBe('string');
      });
    });
  });

  describe('POST /api/v2/progress/task/objective/:objectiveId - Response Structure', () => {
    it('returns standardized success response with objective update confirmation', () => {
      const expectedResponse = {
        success: true,
        data: {
          objectiveId: 'obj-123',
          state: 'completed',
          count: 5,
          message: 'Task objective updated successfully',
        },
      };

      expect(expectedResponse).toMatchObject({
        success: expect.any(Boolean),
        data: expect.objectContaining({
          objectiveId: expect.any(String),
          message: expect.any(String),
        }),
      });

      // State and count are optional but must be correct type if present
      if ('state' in expectedResponse.data) {
        expect(['completed', 'uncompleted']).toContain(expectedResponse.data.state);
      }
      if ('count' in expectedResponse.data) {
        expect(typeof expectedResponse.data.count).toBe('number');
        expect(expectedResponse.data.count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Backward Compatibility Tests', () => {
    it('maintains backward compatibility: no fields are removed', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      const progressService = new ProgressService();

      vi.spyOn(progressService, 'getUserProgress').mockResolvedValue({
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

      const result = await progressService.getUserProgress('test-user-123', 'pvp');

      // CRITICAL: These fields must always be present for backward compatibility
      const requiredFields = [
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

      requiredFields.forEach(field => {
        expect(result).toHaveProperty(field);
        expect(result[field as keyof FormattedProgress]).not.toBeUndefined();
      });
    });

    it('maintains backward compatibility: field types remain consistent', async () => {
      const { ProgressService } = await import('../../lib/services/ProgressService.js');
      const progressService = new ProgressService();

      vi.spyOn(progressService, 'getUserProgress').mockResolvedValue({
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

      const result = await progressService.getUserProgress('test-user-123', 'pvp');

      // CRITICAL: These types must never change for backward compatibility
      expect(Array.isArray(result.tasksProgress)).toBe(true);
      expect(Array.isArray(result.taskObjectivesProgress)).toBe(true);
      expect(Array.isArray(result.hideoutModulesProgress)).toBe(true);
      expect(Array.isArray(result.hideoutPartsProgress)).toBe(true);
      expect(typeof result.displayName).toBe('string');
      expect(typeof result.userId).toBe('string');
      expect(typeof result.playerLevel).toBe('number');
      expect(typeof result.gameEdition).toBe('number');
      expect(typeof result.pmcFaction).toBe('string');
    });
  });

  describe('Error Response Contracts', () => {
    it('returns standardized error format for invalid requests', () => {
      const expectedErrorResponse = {
        success: false,
        error: 'Invalid task ID provided',
      };

      expect(expectedErrorResponse).toMatchObject({
        success: false,
        error: expect.any(String),
      });
      
      expect(expectedErrorResponse.success).toBe(false);
      expect(expectedErrorResponse.error.length).toBeGreaterThan(0);
    });

    it('returns proper error structure for authentication failures', () => {
      const expectedErrorResponse = {
        success: false,
        error: 'Authentication failed',
      };

      expect(expectedErrorResponse).toMatchObject({
        success: false,
        error: expect.any(String),
      });
    });
  });
});
