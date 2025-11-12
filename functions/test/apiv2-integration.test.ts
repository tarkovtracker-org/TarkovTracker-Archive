import { vi, describe, it, expect, beforeEach } from 'vitest';
import { resetDb, seedDb, admin, firestore } from './helpers/emulatorSetup';

interface MockRequest {
  method: string;
  headers: Record<string, string>;
  apiToken?: {
    permissions: string[];
    owner: string;
  };
  query: Record<string, any>;
  params?: Record<string, any>;
  body?: Record<string, any>;
}

interface MockResponse {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

describe('API v2 Integration Tests', () => {
  beforeEach(async () => {
    await resetDb();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('Auth Middleware', () => {
    it('attaches token info and calls next on success', async () => {
      const { TokenService } = await import('../src/services/TokenService');
      vi.spyOn(TokenService.prototype, 'validateToken').mockResolvedValue({
        permissions: ['GP', 'WP'],
        owner: 'test-user',
        token: 'valid-token',
        note: 'integration test',
      });

      const { verifyBearer } = await import('../src/middleware/auth');

      const req: MockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' },
        query: {}, // Added missing property
      };

      const res: MockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();
      verifyBearer(req as any, res as any, next);
      expect(TokenService.prototype.validateToken).toHaveBeenCalledWith('Bearer valid-token');
      expect(req.apiToken).toEqual(
        expect.objectContaining({ owner: 'test-user', permissions: ['GP', 'WP'] })
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('responds with 401 when validation fails', async () => {
      const { TokenService } = await import('../src/services/TokenService');
      vi.spyOn(TokenService.prototype, 'validateToken').mockRejectedValue(
        new Error('Authentication failed')
      );

      const { verifyBearer } = await import('../src/middleware/auth');

      const req: MockRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer invalid-token' },
        query: {}, // Added missing property
      };

      const res: MockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      const next = vi.fn();

      verifyBearer(req as any, res as any, next);

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
      // Seed test data in emulator
      await seedDb({
        users: {
          'test-user': {
            uid: 'test-user',
            displayName: 'Test User',
            level: 42,
            gameMode: 'pvp',
          },
        },
      });

      const { ProgressService } = await import('../src/services/ProgressService');
      const progressService = new ProgressService(admin.firestore());
      const progressHandler = (await import('../src/handlers/progressHandler')).default;

      const req: MockRequest = {
        apiToken: { permissions: ['GP'], owner: 'test-user' },
        query: {},
        method: 'GET',
        headers: {},
      };

      const res: MockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      progressHandler.getPlayerProgress(req as any, res as any, vi.fn());

      // Verify the service was called and response was sent
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // Check that the response contains expected structure
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.meta).toEqual(
        expect.objectContaining({
          self: 'test-user',
          gameMode: 'pvp',
        })
      );
    });

    it('updates a task when user has write permission', async () => {
      // Seed test data in emulator
      await seedDb({
        users: {
          'test-user': {
            uid: 'test-user',
            displayName: 'Test User',
            level: 42,
            gameMode: 'pvp',
          },
        },
        tasks: {
          'task-123': {
            id: 'task-123',
            name: 'Test Task',
            state: 'uncompleted',
          },
        },
      });

      const { ProgressService } = await import('../src/services/ProgressService');
      const progressService = new ProgressService(admin.firestore());
      const progressHandler = (await import('../src/handlers/progressHandler')).default;

      const req: MockRequest = {
        apiToken: { permissions: ['WP'], owner: 'test-user' },
        params: { taskId: 'task-123' },
        body: { state: 'completed' },
        query: {},
        method: 'POST',
        headers: {},
      };

      const res: MockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      progressHandler.updateSingleTask(req as any, res as any, vi.fn());

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
      const module = await import('../src/index');
      expect(typeof module.api).toBe('function');
    });
  });
});
