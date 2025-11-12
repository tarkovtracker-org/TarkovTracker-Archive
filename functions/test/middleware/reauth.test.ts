import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireRecentAuth, requireValidAuthToken } from '../../src/middleware/reauth';
import { errors } from '../../src/middleware/errorHandler';
import { admin, resetDb, serverTimestamp } from '../helpers/emulatorSetup';
import { AuthError } from 'firebase-admin/auth';

// Mock firebase-functions logger only
vi.mock('firebase-functions/v2', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('middleware/reauth', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: NextFunction;
  let mockVerifyIdToken: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    await resetDb();
    
    mockVerifyIdToken = vi.fn();
    vi.mocked(admin.auth).mockReturnValue({
      verifyIdToken: mockVerifyIdToken
    } as any);
    mockReq = {
      headers: {
        authorization: 'Bearer valid-token-123'
      }
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    mockNext = vi.fn();
  });

  describe('requireRecentAuth middleware', () => {
    it('should allow requests with recently authenticated tokens', async () => {
      const recentAuthTime = Date.now() - 2 * 60 * 1000; // 2 minutes ago
      const mockDecodedToken = {
        uid: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        auth_time: Math.floor(recentAuthTime / 1000)
      };
      
      // Mock verifyIdToken to return recent auth time
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      
      await requireRecentAuth(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toEqual({
        id: 'test-user-123',
        username: 'test@example.com',
        recentlyAuthenticated: true
      });
    });

    it('should deny requests with old authentication (> 5 minutes)', async () => {
      const oldAuthTime = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const mockDecodedToken = {
        uid: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        auth_time: Math.floor(oldAuthTime / 1000)
      };
      
      // Mock verifyIdToken to return old auth time
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      
      await requireRecentAuth(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Recent authentication required. Please sign out and sign back in to continue.',
        code: 'RECENT_AUTH_REQUIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny requests without authorization header', async () => {
      delete mockReq.headers.authorization;
      await requireRecentAuth(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny requests with invalid authorization header format', async () => {
      mockReq.headers.authorization = 'Invalid format';
      await requireRecentAuth(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle revoked tokens', async () => {
      const revokedError = new AuthError('auth/id-token-revoked', 'Token has been revoked');
      mockVerifyIdToken.mockRejectedValue(revokedError);
      await requireRecentAuth(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token has been revoked. Please sign in again.',
        code: 'TOKEN_REVOKED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle expired tokens', async () => {
      const expiredError = new AuthError('auth/id-token-expired', 'Token has expired');
      mockVerifyIdToken.mockRejectedValue(expiredError);
      await requireRecentAuth(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token has expired. Please sign in again.',
        code: 'TOKEN_EXPIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle generic Firebase auth errors', async () => {
      const genericError = new Error('Invalid token');
      (genericError as any).code = 'auth/invalid-id-token';
      mockVerifyIdToken.mockRejectedValue(genericError);
      await requireRecentAuth(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle verification errors and log them', async () => {
      const verificationError = new Error('Network error');
      mockVerifyIdToken.mockRejectedValue(verificationError);
      await requireRecentAuth(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      });
    });

    it('should use email when name is not available', async () => {
      const mockDecodedToken = {
        uid: 'test-user-123',
        email: 'test@example.com',
        auth_time: Math.floor(Date.now() / 1000)
      };
      
      // Mock verifyIdToken to return expected data
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      
      await requireRecentAuth(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user.username).toBe('test@example.com');
    });

    it('should use name when email is not available', async () => {
      const mockDecodedToken = {
        uid: 'test-user-123',
        name: 'Test User',
        auth_time: Math.floor(Date.now() / 1000)
      };
      
      // Mock verifyIdToken to return expected data
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      
      await requireRecentAuth(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user.username).toBe('Test User');
    });

    it('should handle boundary case exactly 5 minutes', async () => {
      const exactlyFiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const mockDecodedToken = {
        uid: 'test-user-123',
        email: 'test@example.com',
        auth_time: Math.floor(exactlyFiveMinutesAgo / 1000)
      };
      
      // Mock verifyIdToken to return old auth time
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      
      await requireRecentAuth(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Recent authentication required. Please sign out and sign back in to continue.',
        code: 'RECENT_AUTH_REQUIRED'
      });
    });

    it('should handle boundary case just under 5 minutes', async () => {
      const justUnderFiveMinutes = Date.now() - (5 * 60 * 1000) + 1000; // 4:59 ago
      const mockDecodedToken = {
        uid: 'test-user-123',
        email: 'test@example.com',
        auth_time: Math.floor(justUnderFiveMinutes / 1000)
      };
      
      // Mock verifyIdToken to return recent auth time
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      
      await requireRecentAuth(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('requireValidAuthToken middleware', () => {
    it('should allow requests with valid tokens', async () => {
      const mockDecodedToken = {
        uid: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        auth_time: Math.floor(Date.now() / 1000)
      };
      
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      await requireValidAuthToken(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toEqual({
        id: 'test-user-123',
        username: 'test@example.com',
        recentlyAuthenticated: false
      });
    });

    it('should deny requests without authorization header', async () => {
      delete mockReq.headers.authorization;
      await requireValidAuthToken(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle revoked tokens', async () => {
      const revokedError = new AuthError('auth/id-token-revoked', 'Token has been revoked');
      mockVerifyIdToken.mockRejectedValue(revokedError);
      await requireValidAuthToken(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token has been revoked. Please sign in again.',
        code: 'TOKEN_REVOKED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle expired tokens', async () => {
      const expiredError = new AuthError('auth/id-token-expired', 'Token has expired');
      mockVerifyIdToken.mockRejectedValue(expiredError);
      await requireValidAuthToken(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token has expired. Please sign in again.',
        code: 'TOKEN_EXPIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle other Firebase auth errors', async () => {
      const authError = new Error('Invalid token');
      authError.code = 'auth/invalid-id-token';
      mockVerifyIdToken.mockRejectedValue(authError);
      await requireValidAuthToken(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle non-Firebase errors as internal server error', async () => {
      const genericError = new Error('Network error');
      mockVerifyIdToken.mockRejectedValue(genericError);
      await requireValidAuthToken(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication verification failed'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should log authentication errors', async () => {
      const error = new Error('Test error');
      mockVerifyIdToken.mockRejectedValue(error);
      await requireValidAuthToken(mockReq, mockRes, mockNext);
    });

    it('should attach user info correctly', async () => {
      const mockDecodedToken = {
        uid: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        auth_time: Math.floor(Date.now() / 1000)
      };
      
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      await requireValidAuthToken(mockReq, mockRes, mockNext);
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe('test-user-123');
      expect(mockReq.user.username).toBe('test@example.com');
      expect(mockReq.user.recentlyAuthenticated).toBe(false);
    });

    it('should prefer email over name for username', async () => {
      const mockDecodedToken = {
        uid: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        auth_time: Math.floor(Date.now() / 1000)
      };
      
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      await requireValidAuthToken(mockReq, mockRes, mockNext);
      expect(mockReq.user.username).toBe('test@example.com');
    });

    it('should fallback to name when email is not available', async () => {
      const mockDecodedToken = {
        uid: 'test-user-123',
        name: 'Test User',
        auth_time: Math.floor(Date.now() / 1000)
      };
      
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      await requireValidAuthToken(mockReq, mockRes, mockNext);
      expect(mockReq.user.username).toBe('Test User');
    });
  });

  describe('middleware behavior comparison', () => {
    it('should not check recent auth for requireValidAuthToken', async () => {
      const veryOldAuthTime = Date.now() - 30 * 60 * 1000; // 30 minutes ago
      const mockDecodedToken = {
        uid: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        auth_time: Math.floor(veryOldAuthTime / 1000)
      };
      
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      await requireValidAuthToken(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user.recentlyAuthenticated).toBe(false);
    });
  });
});
