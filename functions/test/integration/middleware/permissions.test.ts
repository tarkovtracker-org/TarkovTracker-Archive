import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requirePermission } from '../../../src/middleware/permissions';
import { ApiToken } from '../../../src/types/api';
import { createTestSuite } from '../../helpers';
describe('middleware/permissions', () => {
  const suite = createTestSuite('middleware/permissions');
  let mockReq: any;
  let mockRes: any;
  let mockNext: NextFunction;
  beforeEach(async () => {
    await suite.beforeEach();
    mockReq = {
      method: 'GET',
      apiToken: {
        owner: 'test-user-123',
        note: 'Test token',
        permissions: ['GP', 'WP'],
        token: 'test-token-123',
      },
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });
  afterEach(suite.afterEach);
  describe('requirePermission middleware', () => {
    it('should allow requests with valid permission', () => {
      const middleware = requirePermission('GP');

      middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
    it('should allow requests with different valid permission', () => {
      const middleware = requirePermission('WP');

      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
    it('should deny requests without required permission', () => {
      const middleware = requirePermission('ADMIN');

      middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required permission: ADMIN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    it('should deny requests when token permissions is not an array', () => {
      mockReq.apiToken.permissions = 'not-an-array';

      const middleware = requirePermission('GP');

      middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required permission: GP',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    it('should deny requests when token permissions is null', () => {
      mockReq.apiToken.permissions = null;

      const middleware = requirePermission('GP');

      middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required permission: GP',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    it('should deny requests when token permissions is undefined', () => {
      delete mockReq.apiToken.permissions;

      const middleware = requirePermission('GP');

      middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required permission: GP',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    it('should deny requests when token is missing entirely', () => {
      delete mockReq.apiToken;

      const middleware = requirePermission('GP');

      middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    it('should allow OPTIONS requests to pass through', () => {
      mockReq.method = 'OPTIONS';
      const middleware = requirePermission('GP');

      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
    it('should work with empty permissions array', () => {
      mockReq.apiToken.permissions = [];

      const middleware = requirePermission('GP');

      middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required permission: GP',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    it('should work with multiple permissions and find the required one', () => {
      mockReq.apiToken.permissions = ['READ', 'WRITE', 'ADMIN', 'DELETE'];

      const middleware = requirePermission('ADMIN');

      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
    it('should be case sensitive when checking permissions', () => {
      mockReq.apiToken.permissions = ['gp', 'wp']; // lowercase

      const middleware = requirePermission('GP'); // uppercase

      middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required permission: GP',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    it('should work correctly with different HTTP methods (non-OPTIONS)', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

      methods.forEach((method) => {
        mockReq.method = method;
        const middleware = requirePermission('GP');

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });
    it('should handle edge case with token.permissions containing non-string values', () => {
      mockReq.apiToken.permissions = ['GP', null, undefined, 123];

      const middleware = requirePermission('GP');

      middleware(mockReq, mockRes, mockNext);
      // Should find 'GP' in the array and allow
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
    it('should handle token with minimal required fields', () => {
      mockReq.apiToken = {
        owner: 'test-user-123',
        permissions: ['GP'],
      };

      const middleware = requirePermission('GP');

      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
    it('should provide clear error messages for missing permission', () => {
      mockReq.apiToken.permissions = ['READ', 'WRITE'];

      const middleware = requirePermission('DELETE');

      middleware(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required permission: DELETE',
      });
    });
    it('should not modify the original request object', () => {
      const originalToken = { ...mockReq.apiToken };
      const middleware = requirePermission('GP');

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.apiToken).toEqual(originalToken);
    });
    it('should handle permission strings with special characters', () => {
      mockReq.apiToken.permissions = ['GP', 'WRITE_TASK', 'ADMIN_PANEL'];

      const middleware = requirePermission('ADMIN_PANEL');

      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
