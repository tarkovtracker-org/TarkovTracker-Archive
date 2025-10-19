/**
 * API Contract Tests for Token Endpoints
 * 
 * These tests ensure that token API response structures remain stable for third-party consumers.
 * Purpose: Prevent breaking changes to token management API contracts
 * 
 * Approach: Tests the actual handler layer by calling real handler functions with mocked requests.
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

const runHandlerWithErrorPipeline = async (
  handler: (req: any, res: any, next?: (err?: unknown) => void) => unknown,
  req: any,
  res: any,
  errorHandler: (err: Error, req: any, res: any, next: (err?: unknown) => void) => void
) => {
  const next = (err?: unknown) => {
    if (err) {
      errorHandler(err as Error, req, res, vi.fn());
    }
  };

  try {
    const maybePromise = handler(req, res, next);
    if (maybePromise && typeof (maybePromise as PromiseLike<void>).then === 'function') {
      await (maybePromise as PromiseLike<void>).catch(err => {
        next(err);
      });
    }
  } catch (err) {
    next(err);
  }
};

describe('Token API Contract Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/v2/token - Response Structure', () => {
    it('returns correct token information structure', async () => {
      const tokenHandler = (await import('../../src/handlers/tokenHandler.ts')).default;
      const req = createMockRequest({
        owner: 'user-id',
        token: 'some-token',
        permissions: ['GP', 'WP'],
        note: 'test',
        gameMode: 'pvp',
      });
      const res = createMockResponse();

      await tokenHandler.getTokenInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];

      expect(responseData).toMatchObject({
        success: true,
        permissions: expect.any(Array),
        token: expect.any(String),
        owner: expect.any(String),
        note: expect.any(String),
      });
    });

    it('ensures permissions are valid values', async () => {
      const validPermissions = ['GP', 'WP'];
      const tokenHandler = (await import('../../src/handlers/tokenHandler.ts')).default;
      const req = createMockRequest({
        owner: 'user-id',
        token: 'some-token',
        permissions: ['GP', 'WP'],
        note: 'test',
      });
      const res = createMockResponse();

      await tokenHandler.getTokenInfo(req, res);

      const responseData = res.json.mock.calls[0][0];
      responseData.permissions.forEach((permission: string) => {
        expect(validPermissions).toContain(permission);
      });
    });

    it('ensures gameMode is valid when present', async () => {
      const validGameModes = ['pvp', 'pve', 'dual'];
      const tokenHandler = (await import('../../src/handlers/tokenHandler.ts')).default;
      const req = createMockRequest({
        owner: 'user-id',
        token: 'some-token',
        permissions: ['GP'],
        note: 'test',
        gameMode: 'pvp',
      });
      const res = createMockResponse();

      await tokenHandler.getTokenInfo(req, res);

      const responseData = res.json.mock.calls[0][0];
      if (responseData.gameMode) {
        expect(validGameModes).toContain(responseData.gameMode);
      }
    });
  });

  describe('Backward Compatibility - Token Endpoints', () => {
    it('maintains token response fields by calling handler', async () => {
      const tokenHandler = (await import('../../src/handlers/tokenHandler.ts')).default;
      const req = createMockRequest({
        owner: 'user-id',
        token: 'test-token',
        permissions: ['GP', 'WP'],
        note: 'test',
        calls: 0,
        gameMode: 'pvp',
      });
      const res = createMockResponse();

      await tokenHandler.getTokenInfo(req, res);

      const responseData = res.json.mock.calls[0][0];

      const requiredFields = ['success', 'permissions', 'token', 'owner', 'note'];
      requiredFields.forEach(field => {
        expect(responseData).toHaveProperty(field);
      });

      expect(Array.isArray(responseData.permissions)).toBe(true);
      expect(typeof responseData.success).toBe('boolean');
      expect(typeof responseData.token).toBe('string');
      expect(typeof responseData.owner).toBe('string');
      expect(typeof responseData.note).toBe('string');
    });

    it('maintains optional token response fields when present by calling handler', async () => {
      const tokenHandler = (await import('../../src/handlers/tokenHandler.ts')).default;
      const req = createMockRequest({
        owner: 'user-id',
        token: 'token-string',
        permissions: ['GP'],
        note: 'My Token',
        calls: 42,
        gameMode: 'dual',
      });
      const res = createMockResponse();

      await tokenHandler.getTokenInfo(req, res);

      const responseData = res.json.mock.calls[0][0];

      // Optional fields must have correct types if present
      if ('calls' in responseData) {
        expect(typeof responseData.calls).toBe('number');
      }
      if ('gameMode' in responseData) {
        expect(['pvp', 'pve', 'dual']).toContain(responseData.gameMode);
      }
    });

    it('validates permission strings are valid types by calling handler', async () => {
      // Call handler with known permissions and validate they have correct types
      const tokenHandler = (await import('../../src/handlers/tokenHandler.ts')).default;
      const req = createMockRequest({
        owner: 'user-id',
        token: 'test-token',
        permissions: ['GP', 'WP', 'TP'],
        note: 'test',
        gameMode: 'pvp',
      });
      const res = createMockResponse();

      await tokenHandler.getTokenInfo(req, res);

      const responseData = res.json.mock.calls[0][0];
      const permissions = responseData.permissions;
      
      expect(Array.isArray(permissions)).toBe(true);
      permissions.forEach((permission: string) => {
        expect(typeof permission).toBe('string');
        expect(permission.length).toBeGreaterThan(0);
        // Common permission values are 2-char codes
        expect(['GP', 'WP', 'TP']).toContain(permission);
      });
    });
  });

  describe('Error Response Contracts', () => {
    it('returns the standardized unauthorized error payload from the handler pipeline', async () => {
      const { errorHandler, errors } = await import('../../src/middleware/errorHandler.ts');
      const tokenHandler = (await import('../../src/handlers/tokenHandler.ts')).default;

      const req: any = {
        ...createMockRequest(undefined),
        method: 'GET',
        originalUrl: '/api/v2/token',
        headers: {},
      };

      const unauthorizedError = errors.unauthorized('Authentication required');
      delete req.apiToken;
      let firstAccess = true;
      Object.defineProperty(req, 'apiToken', {
        configurable: true,
        get() {
          if (firstAccess) {
            firstAccess = false;
            throw unauthorizedError;
          }
          return undefined;
        },
      });

      const res = createMockResponse();

      await runHandlerWithErrorPipeline(tokenHandler.getTokenInfo.bind(tokenHandler), req, res, errorHandler);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication required',
          meta: expect.objectContaining({
            code: 'UNAUTHORIZED',
            timestamp: expect.any(String),
          }),
        })
      );

      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(false);
      expect(payload.meta.code).toBe('UNAUTHORIZED');
      expect(typeof payload.meta.timestamp).toBe('string');
    });

    it('uses the generic error contract when unexpected errors bubble out of the handler', async () => {
      const { errorHandler } = await import('../../src/middleware/errorHandler.ts');
      const tokenHandler = (await import('../../src/handlers/tokenHandler.ts')).default;

      const req: any = {
        ...createMockRequest(undefined),
        method: 'GET',
        originalUrl: '/api/v2/token',
        headers: {},
      };

      const unexpectedError = new Error('Token decoding failure');
      delete req.apiToken;
      let firstAccess = true;
      Object.defineProperty(req, 'apiToken', {
        configurable: true,
        get() {
          if (firstAccess) {
            firstAccess = false;
            throw unexpectedError;
          }
          return undefined;
        },
      });

      const res = createMockResponse();

      await runHandlerWithErrorPipeline(tokenHandler.getTokenInfo.bind(tokenHandler), req, res, errorHandler);

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

      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(false);
      expect(payload.meta.code).toBe('INTERNAL_ERROR');
      expect(typeof payload.meta.timestamp).toBe('string');
    });
  });
});
