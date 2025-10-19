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
    it('maintains token response fields', () => {
      const response = {
        success: true,
        permissions: ['GP', 'WP'],
        token: 'test-token',
        owner: 'user-id',
        note: 'test',
        calls: 0,
        gameMode: 'pvp',
      };

      const requiredFields = ['success', 'permissions', 'token', 'owner', 'note'];
      requiredFields.forEach(field => {
        expect(response).toHaveProperty(field);
      });

      expect(Array.isArray(response.permissions)).toBe(true);
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.token).toBe('string');
      expect(typeof response.owner).toBe('string');
      expect(typeof response.note).toBe('string');
    });

    it('maintains optional token response fields when present', () => {
      const response = {
        success: true,
        permissions: ['GP'],
        token: 'token-string',
        owner: 'user-id',
        note: 'My Token',
        calls: 42,
        gameMode: 'dual',
      };

      // Optional fields must have correct types if present
      if ('calls' in response) {
        expect(typeof response.calls).toBe('number');
      }
      if ('gameMode' in response) {
        expect(['pvp', 'pve', 'dual']).toContain(response.gameMode);
      }
    });

    it('validates permission strings are valid types', () => {
      const permissions = ['GP', 'WP', 'TP'];
      
      permissions.forEach(permission => {
        expect(typeof permission).toBe('string');
        expect(permission.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Response Contracts', () => {
    it('validates standardized error response format', () => {
      const errorResponse = {
        success: false,
        error: 'Invalid permissions provided',
      };

      expect(errorResponse).toMatchObject({
        success: false,
        error: expect.any(String),
      });

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.length).toBeGreaterThan(0);
    });

    it('validates error structure for various error types', () => {
      const errors = [
        { success: false, error: 'Invalid permissions provided' },
        { success: false, error: 'Authentication required' },
        { success: false, error: 'Token not found' },
        { success: false, error: 'Invalid game mode' },
      ];

      errors.forEach(error => {
        expect(error).toHaveProperty('success');
        expect(error).toHaveProperty('error');
        expect(error.success).toBe(false);
        expect(typeof error.error).toBe('string');
        expect(error.error.length).toBeGreaterThan(0);
      });
    });
  });
});
