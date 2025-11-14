/**
 * Integration tests for CORS wrapper middleware
 *
 * Tests:
 * - corsMiddleware for Express apps
 * - withCorsHandling for Firebase Functions
 * - OPTIONS preflight handling
 * - Origin validation
 * - Header setting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import {
  corsMiddleware,
  withCorsHandling,
  withCorsAndAuthentication,
} from '../../../src/middleware/corsWrapper';

// Mock setCorsHeaders from corsConfig
vi.mock('../../../src/config/corsConfig', () => ({
  setCorsHeaders: vi.fn((req: any, res: any) => {
    // Simulate successful CORS header setting
    const origin = req.headers.origin;
    if (origin === 'https://evil.com') {
      return false; // Reject this origin
    }
    res.set('Access-Control-Allow-Origin', origin || '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return true;
  }),
}));

describe('CORS Wrapper Middleware', () => {
  describe('corsMiddleware (Express)', () => {
    let mockReq: Partial<ExpressRequest>;
    let mockRes: Partial<ExpressResponse>;
    let nextFn: ReturnType<typeof vi.fn>;
    let statusFn: ReturnType<typeof vi.fn>;
    let jsonFn: ReturnType<typeof vi.fn>;
    let sendFn: ReturnType<typeof vi.fn>;
    let setFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      statusFn = vi.fn().mockReturnThis();
      jsonFn = vi.fn().mockReturnThis();
      sendFn = vi.fn().mockReturnThis();
      setFn = vi.fn().mockReturnThis();
      nextFn = vi.fn();

      mockReq = {
        method: 'GET',
        path: '/api/test',
        headers: {
          origin: 'http://localhost:3000',
        },
      };

      mockRes = {
        status: statusFn,
        json: jsonFn,
        send: sendFn,
        set: setFn,
      };
    });

    it('should set CORS headers and call next() for valid origin', () => {
      corsMiddleware(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(setFn).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
      expect(nextFn).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('should return 403 for invalid origin', () => {
      mockReq.headers = { origin: 'https://evil.com' };

      corsMiddleware(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({ error: 'Origin not allowed' });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should handle OPTIONS preflight with 204', () => {
      mockReq.method = 'OPTIONS';

      corsMiddleware(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(setFn).toHaveBeenCalled();
      expect(statusFn).toHaveBeenCalledWith(204);
      expect(sendFn).toHaveBeenCalledWith('');
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should handle requests without origin header', () => {
      mockReq.headers = {};

      corsMiddleware(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(setFn).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('withCorsHandling (Firebase Functions)', () => {
    let mockReq: Partial<ExpressRequest>;
    let mockRes: Partial<ExpressResponse>;
    let statusFn: ReturnType<typeof vi.fn>;
    let sendFn: ReturnType<typeof vi.fn>;
    let jsonFn: ReturnType<typeof vi.fn>;
    let setFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      statusFn = vi.fn().mockReturnThis();
      sendFn = vi.fn().mockReturnThis();
      jsonFn = vi.fn().mockReturnThis();
      setFn = vi.fn().mockReturnThis();

      mockReq = {
        method: 'GET',
        url: '/api/test',
        headers: {
          origin: 'http://localhost:3000',
        },
      };

      mockRes = {
        status: statusFn,
        send: sendFn,
        json: jsonFn,
        set: setFn,
      };
    });

    it('should wrap handler and set CORS headers', async () => {
      const handlerFn = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = withCorsHandling(handlerFn);

      await wrappedHandler(mockReq as ExpressRequest, mockRes as ExpressResponse);

      expect(setFn).toHaveBeenCalled();
      expect(handlerFn).toHaveBeenCalled();
    });

    it('should reject invalid origins with 403', async () => {
      mockReq.headers = { origin: 'https://evil.com' };
      const handlerFn = vi.fn();
      const wrappedHandler = withCorsHandling(handlerFn);

      await wrappedHandler(mockReq as ExpressRequest, mockRes as ExpressResponse);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(sendFn).toHaveBeenCalledWith('Origin not allowed');
      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should handle OPTIONS preflight', async () => {
      mockReq.method = 'OPTIONS';
      const handlerFn = vi.fn();
      const wrappedHandler = withCorsHandling(handlerFn);

      await wrappedHandler(mockReq as ExpressRequest, mockRes as ExpressResponse);

      expect(statusFn).toHaveBeenCalledWith(204);
      expect(sendFn).toHaveBeenCalledWith('');
      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should propagate handler errors', async () => {
      const testError = new Error('Handler error');
      const handlerFn = vi.fn().mockRejectedValue(testError);
      const wrappedHandler = withCorsHandling(handlerFn);

      await expect(
        wrappedHandler(mockReq as ExpressRequest, mockRes as ExpressResponse)
      ).rejects.toThrow('Handler error');
    });
  });

  describe('withCorsAndAuthentication', () => {
    let mockReq: Partial<ExpressRequest>;
    let mockRes: Partial<ExpressResponse>;
    let statusFn: ReturnType<typeof vi.fn>;
    let jsonFn: ReturnType<typeof vi.fn>;
    let sendFn: ReturnType<typeof vi.fn>;
    let setFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      statusFn = vi.fn().mockReturnThis();
      jsonFn = vi.fn().mockReturnThis();
      sendFn = vi.fn().mockReturnThis();
      setFn = vi.fn().mockReturnThis();

      mockReq = {
        method: 'GET',
        url: '/api/test',
        headers: {
          origin: 'http://localhost:3000',
          authorization: 'Bearer test-token-123',
        },
      };

      mockRes = {
        status: statusFn,
        json: jsonFn,
        send: sendFn,
        set: setFn,
      };

      // Mock Firebase Admin
      vi.mock('firebase-admin', async () => {
        const actual = await vi.importActual('firebase-admin');
        return {
          ...(actual as object),
          auth: () => ({
            verifyIdToken: vi.fn().mockResolvedValue({
              uid: 'test-user-123',
              email: 'test@example.com',
            }),
          }),
        };
      });
    });

    it('should handle authenticated requests', async () => {
      const handlerFn = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = withCorsAndAuthentication(handlerFn);

      await wrappedHandler(mockReq as ExpressRequest, mockRes as ExpressResponse);

      expect(setFn).toHaveBeenCalled();
      expect(handlerFn).toHaveBeenCalledWith(mockReq, mockRes, 'test-user-123');
    });

    it('should reject requests without Authorization header', async () => {
      delete mockReq.headers!.authorization;
      const handlerFn = vi.fn();
      const wrappedHandler = withCorsAndAuthentication(handlerFn);

      await wrappedHandler(mockReq as ExpressRequest, mockRes as ExpressResponse);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({
        error: 'Missing or invalid Authorization header',
      });
      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should reject malformed Authorization header', async () => {
      mockReq.headers!.authorization = 'InvalidFormat';
      const handlerFn = vi.fn();
      const wrappedHandler = withCorsAndAuthentication(handlerFn);

      await wrappedHandler(mockReq as ExpressRequest, mockRes as ExpressResponse);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({
        error: 'Missing or invalid Authorization header',
      });
      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should still enforce CORS on authenticated endpoints', async () => {
      mockReq.headers!.origin = 'https://evil.com';
      const handlerFn = vi.fn();
      const wrappedHandler = withCorsAndAuthentication(handlerFn);

      await wrappedHandler(mockReq as ExpressRequest, mockRes as ExpressResponse);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(handlerFn).not.toHaveBeenCalled();
    });
  });

  describe('CORS Header Validation', () => {
    it('should set correct headers for allowed origins', () => {
      const mockReq: Partial<ExpressRequest> = {
        method: 'GET',
        path: '/test',
        headers: { origin: 'http://localhost:5173' },
      };
      const setFn = vi.fn().mockReturnThis();
      const mockRes: Partial<ExpressResponse> = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        set: setFn,
      };
      const nextFn = vi.fn();

      corsMiddleware(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      // Verify standard CORS headers are set
      expect(setFn).toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.any(String));
      expect(setFn).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        expect.stringContaining('GET')
      );
      expect(setFn).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        expect.stringContaining('Content-Type')
      );
    });

    it('should handle preflight requests with all required headers', () => {
      const mockReq: Partial<ExpressRequest> = {
        method: 'OPTIONS',
        path: '/test',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type,authorization',
        },
      };
      const setFn = vi.fn().mockReturnThis();
      const statusFn = vi.fn().mockReturnThis();
      const sendFn = vi.fn().mockReturnThis();
      const mockRes: Partial<ExpressResponse> = {
        status: statusFn,
        send: sendFn,
        set: setFn,
      };
      const nextFn = vi.fn();

      corsMiddleware(mockReq as ExpressRequest, mockRes as ExpressResponse, nextFn);

      expect(statusFn).toHaveBeenCalledWith(204);
      expect(sendFn).toHaveBeenCalledWith('');
      expect(nextFn).not.toHaveBeenCalled();
    });
  });
});
