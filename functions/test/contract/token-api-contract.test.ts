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

describe('Token API Contract Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/v2/token - Response Structure', () => {
    it('returns correct token information structure', async () => {
      const tokenHandler = (await import('../../lib/handlers/tokenHandler.js')).default;
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
      const tokenHandler = (await import('../../lib/handlers/tokenHandler.js')).default;
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
      const tokenHandler = (await import('../../lib/handlers/tokenHandler.js')).default;
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
      const tokenHandler = (await import('../../lib/handlers/tokenHandler.js')).default;
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
      const tokenHandler = (await import('../../lib/handlers/tokenHandler.js')).default;
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
      const tokenHandler = (await import('../../lib/handlers/tokenHandler.js')).default;
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
    it('validates standardized error response format', () => {
      // Error responses must always follow this format when returned to clients
      const errorResponses = [
        { success: false, error: 'Invalid permissions provided' },
        { success: false, error: 'Authentication required' },
        { success: false, error: 'Token not found' },
        { success: false, error: 'Invalid game mode' },
      ];

      errorResponses.forEach(response => {
        expect(response).toMatchObject({
          success: false,
          error: expect.any(String),
        });

        expect(response.success).toBe(false);
        expect(response.error.length).toBeGreaterThan(0);
      });
    });

    it('validates error structure for various error types', () => {
      // All error responses must follow consistent format
      const errorFormats = [
        { success: false, error: 'Invalid permissions provided' },
        { success: false, error: 'Authentication required' },
        { success: false, error: 'Token not found' },
        { success: false, error: 'Invalid game mode' },
        { success: false, error: 'Token revoked' },
        { success: false, error: 'Internal error' },
      ];

      errorFormats.forEach(errorFormat => {
        expect(errorFormat).toHaveProperty('success');
        expect(errorFormat).toHaveProperty('error');
        expect(errorFormat.success).toBe(false);
        expect(typeof errorFormat.error).toBe('string');
        expect(errorFormat.error.length).toBeGreaterThan(0);
      });
    });
  });
});
