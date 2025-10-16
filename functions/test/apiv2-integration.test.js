import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('API v2 Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('Auth Middleware', () => {
    it('attaches token info and calls next on success', async () => {
      const { TokenService } = await import('../lib/services/TokenService.js');
      vi.spyOn(TokenService.prototype, 'validateToken').mockResolvedValue({
        permissions: ['GP', 'WP'],
        owner: 'test-user',
        token: 'valid-token',
      });

      const { verifyBearer } = await import('../lib/middleware/auth.js');
      const req = {
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      await verifyBearer(req, res, next);

      expect(TokenService.prototype.validateToken).toHaveBeenCalledWith('Bearer valid-token');
      expect(req.apiToken).toEqual(
        expect.objectContaining({ owner: 'test-user', permissions: ['GP', 'WP'] })
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('responds with 401 when validation fails', async () => {
      const { TokenService } = await import('../lib/services/TokenService.js');
      vi.spyOn(TokenService.prototype, 'validateToken').mockRejectedValue(
        new Error('Authentication failed')
      );

      const { verifyBearer } = await import('../lib/middleware/auth.js');
      const req = {
        method: 'GET',
        headers: { authorization: 'Bearer invalid-token' },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      await verifyBearer(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Progress Handler', () => {
    it('returns player progress data', async () => {
      const { ProgressService } = await import('../lib/services/ProgressService.js');
      vi.spyOn(ProgressService.prototype, 'getUserProgress').mockResolvedValue({ level: 42 });

      const progressHandler = (await import('../lib/handlers/progressHandler.js')).default;
      const req = {
        apiToken: { permissions: ['GP'], owner: 'test-user' },
        query: {},
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      await progressHandler.getPlayerProgress(req, res);

      expect(ProgressService.prototype.getUserProgress).toHaveBeenCalledWith('test-user', 'pvp');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { level: 42 },
        meta: { self: 'test-user', gameMode: 'pvp' },
      });
    });

    it('updates a task when user has write permission', async () => {
      const { ProgressService } = await import('../lib/services/ProgressService.js');
      vi.spyOn(ProgressService.prototype, 'updateSingleTask').mockResolvedValue(undefined);

      const progressHandler = (await import('../lib/handlers/progressHandler.js')).default;
      const req = {
        apiToken: { permissions: ['WP'], owner: 'test-user' },
        params: { taskId: 'task-123' },
        body: { state: 'completed' },
        query: {},
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      await progressHandler.updateSingleTask(req, res);

      expect(ProgressService.prototype.updateSingleTask).toHaveBeenCalledWith(
        'test-user',
        'task-123',
        'completed',
        'pvp'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          taskId: 'task-123',
          state: 'completed',
          message: 'Task updated successfully',
        },
      });
    });
  });

  describe('API Router export', () => {
    it('exposes the HTTP function handler', async () => {
      const module = await import('../lib/index.js');
      expect(typeof module.api).toBe('function');
    });
  });
});
