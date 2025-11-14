/**
 * Integration tests for HTTP authentication wrapper
 *
 * Tests:
 * - verifyBearerToken Express middleware
 * - withBearerAuth for Firebase Functions
 * - withCorsAndBearerAuth combined wrapper
 * - requirePermission middleware
 * - Permission checking wrappers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import type { ApiToken } from '../../../src/types/api';
import {
  verifyBearerToken,
  requirePermission,
  withBearerAuth,
  withCorsAndBearerAuth,
  withBearerAuthAndPermission,
  type AuthenticatedRequest,
} from '../../../src/middleware/httpAuthWrapper';

// Mock TokenService
vi.mock('../../../src/services/TokenService', () => {
  return {
    TokenService: class MockTokenService {
      validateToken = vi.fn((authHeader: string | undefined) => {
        if (!authHeader) {
          throw new Error('No Authorization header provided');
        }
        if (authHeader === 'Bearer valid-token-123') {
          return Promise.resolve({
            token: 'valid-token-123',
            owner: 'user-123',
            permissions: ['GP', 'WP'],
            note: 'Test token',
            gameMode: 'pvp',
            calls: 5,
          });
        }
        if (authHeader === 'Bearer admin-token-456') {
          return Promise.resolve({
            token: 'admin-token-456',
            owner: 'admin-456',
            permissions: ['GP', 'WP', 'TP'],
            note: 'Admin token',
            gameMode: 'pvp',
            calls: 10,
          });
        }
        throw new Error('Invalid or expired token');
      });
    },
  };
});

// Mock CORS wrapper
vi.mock('../../../src/middleware/corsWrapper', () => ({
  withCorsHandling: vi.fn((handler) => handler),
}));

describe('HTTP Auth Wrapper', () => {
  describe('verifyBearerToken (Express middleware)', () => {
    let mockReq: Partial<AuthenticatedRequest>;
    let mockRes: Partial<ExpressResponse>;
    let nextFn: ReturnType<typeof vi.fn>;
    let statusFn: ReturnType<typeof vi.fn>;
    let jsonFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      statusFn = vi.fn().mockReturnThis();
      jsonFn = vi.fn().mockReturnThis();
      nextFn = vi.fn();

      mockReq = {
        method: 'GET',
        path: '/api/test',
        headers: {},
      };

      mockRes = {
        status: statusFn,
        json: jsonFn,
      };
    });

    it('should authenticate valid bearer token', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token-123' };

      await verifyBearerToken(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(mockReq.apiToken).toBeDefined();
      expect(mockReq.apiToken?.owner).toBe('user-123');
      expect(mockReq.apiToken?.permissions).toEqual(['GP', 'WP']);
      expect(mockReq.user?.id).toBe('user-123');
      expect(nextFn).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('should return 401 for missing authorization header', async () => {
      await verifyBearerToken(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: 'No Authorization header provided',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      await verifyBearerToken(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should allow OPTIONS requests without authentication', async () => {
      mockReq.method = 'OPTIONS';

      await verifyBearerToken(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission middleware', () => {
    let mockReq: Partial<AuthenticatedRequest>;
    let mockRes: Partial<ExpressResponse>;
    let nextFn: ReturnType<typeof vi.fn>;
    let statusFn: ReturnType<typeof vi.fn>;
    let jsonFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      statusFn = vi.fn().mockReturnThis();
      jsonFn = vi.fn().mockReturnThis();
      nextFn = vi.fn();

      mockReq = {
        method: 'GET',
        path: '/api/test',
        apiToken: {
          token: 'valid-token-123',
          owner: 'user-123',
          permissions: ['GP', 'WP'],
          note: 'Test token',
          gameMode: 'pvp',
          calls: 5,
        },
      };

      mockRes = {
        status: statusFn,
        json: jsonFn,
      };
    });

    it('should allow request with required permission', () => {
      const middleware = requirePermission('GP');

      middleware(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('should return 403 for missing permission', () => {
      const middleware = requirePermission('TP');

      middleware(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required permission: TP',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should return 401 if no token present', () => {
      mockReq.apiToken = undefined;
      const middleware = requirePermission('GP');

      middleware(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required.',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should allow OPTIONS requests without permission check', () => {
      mockReq.method = 'OPTIONS';
      mockReq.apiToken = undefined;
      const middleware = requirePermission('GP');

      middleware(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });
  });

  describe('withBearerAuth (Firebase Functions wrapper)', () => {
    let mockReq: Partial<ExpressRequest>;
    let mockRes: Partial<ExpressResponse>;
    let statusFn: ReturnType<typeof vi.fn>;
    let jsonFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      statusFn = vi.fn().mockReturnThis();
      jsonFn = vi.fn().mockReturnThis();

      mockReq = {
        method: 'GET',
        url: '/api/test',
        headers: {},
      };

      mockRes = {
        status: statusFn,
        json: jsonFn,
      };
    });

    it('should authenticate and call handler with token', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token-123' };
      const handlerFn = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = withBearerAuth(handlerFn);

      await wrappedHandler(mockReq as ExpressRequest, mockRes as ExpressResponse);

      expect(handlerFn).toHaveBeenCalled();
      const calledWith = handlerFn.mock.calls[0];
      expect(calledWith[2]).toMatchObject({
        owner: 'user-123',
        permissions: ['GP', 'WP'],
      });
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      const handlerFn = vi.fn();
      const wrappedHandler = withBearerAuth(handlerFn);

      await wrappedHandler(mockReq as ExpressRequest, mockRes as ExpressResponse);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      });
      expect(handlerFn).not.toHaveBeenCalled();
    });
  });

  describe('withBearerAuthAndPermission wrapper', () => {
    let mockReq: Partial<ExpressRequest>;
    let mockRes: Partial<ExpressResponse>;
    let statusFn: ReturnType<typeof vi.fn>;
    let jsonFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      statusFn = vi.fn().mockReturnThis();
      jsonFn = vi.fn().mockReturnThis();

      mockReq = {
        method: 'GET',
        url: '/api/test',
        headers: {},
      };

      mockRes = {
        status: statusFn,
        json: jsonFn,
      };
    });

    it('should call handler if permission is present', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token-123' };
      const handlerFn = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = withBearerAuthAndPermission('GP', handlerFn);

      await wrappedHandler(mockReq as ExpressRequest, mockRes as ExpressResponse);

      expect(handlerFn).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('should return 403 if permission is missing', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token-123' };
      const handlerFn = vi.fn();
      const wrappedHandler = withBearerAuthAndPermission('TP', handlerFn);

      await wrappedHandler(mockReq as ExpressRequest, mockRes as ExpressResponse);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required permission: TP',
      });
      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      const handlerFn = vi.fn();
      const wrappedHandler = withBearerAuthAndPermission('GP', handlerFn);

      await wrappedHandler(mockReq as ExpressRequest, mockRes as ExpressResponse);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(handlerFn).not.toHaveBeenCalled();
    });
  });

  describe('Token data validation', () => {
    it('should correctly extract token permissions', async () => {
      const mockReq: Partial<AuthenticatedRequest> = {
        method: 'GET',
        path: '/api/test',
        headers: { authorization: 'Bearer admin-token-456' },
      };
      const mockRes: Partial<ExpressResponse> = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const nextFn = vi.fn();

      await verifyBearerToken(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(mockReq.apiToken?.permissions).toEqual(['GP', 'WP', 'TP']);
      expect(mockReq.apiToken?.owner).toBe('admin-456');
      expect(nextFn).toHaveBeenCalled();
    });

    it('should attach user object to request', async () => {
      const mockReq: Partial<AuthenticatedRequest> = {
        method: 'GET',
        path: '/api/test',
        headers: { authorization: 'Bearer valid-token-123' },
      };
      const mockRes: Partial<ExpressResponse> = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const nextFn = vi.fn();

      await verifyBearerToken(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe('user-123');
      expect(nextFn).toHaveBeenCalled();
    });
  });
});
