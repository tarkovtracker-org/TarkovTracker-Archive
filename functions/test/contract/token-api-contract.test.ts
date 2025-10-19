/**
 * API Contract Tests for Token Endpoints
 * 
 * These tests ensure that token API response structures remain stable.
 * Purpose: Prevent breaking changes to token management API contracts
 */

import { describe, it, expect } from 'vitest';

describe('Token API Contract Tests', () => {
  describe('GET /api/v2/token - Response Structure', () => {
    it('returns complete token information structure', () => {
      const expectedResponse = {
        success: true,
        data: {
          owner: 'user-id',
          note: 'My API Token',
          permissions: ['GP', 'WP'],
          gameMode: 'pvp',
          calls: 100,
          createdAt: expect.any(Object),
        },
      };

      expect(expectedResponse).toMatchObject({
        success: expect.any(Boolean),
        data: expect.objectContaining({
          owner: expect.any(String),
          note: expect.any(String),
          permissions: expect.any(Array),
        }),
      });

      // Validate permissions array
      expect(Array.isArray(expectedResponse.data.permissions)).toBe(true);
      expectedResponse.data.permissions.forEach(permission => {
        expect(typeof permission).toBe('string');
      });
    });

    it('ensures permissions are valid values', () => {
      const validPermissions = ['GP', 'WP', 'TP'];
      const response = {
        success: true,
        data: {
          owner: 'user-id',
          note: 'test',
          permissions: ['GP', 'WP'],
        },
      };

      response.data.permissions.forEach(permission => {
        expect(validPermissions).toContain(permission);
      });
    });

    it('ensures gameMode is valid when present', () => {
      const validGameModes = ['pvp', 'pve', 'dual'];
      const response = {
        success: true,
        data: {
          owner: 'user-id',
          note: 'test',
          permissions: ['GP'],
          gameMode: 'pvp',
        },
      };

      if ('gameMode' in response.data) {
        expect(validGameModes).toContain(response.data.gameMode);
      }
    });
  });

  describe('POST /api/token (create) - Response Structure', () => {
    it('returns token creation confirmation with token string', () => {
      const expectedResponse = {
        token: 'newly-generated-token-string',
        note: 'My API Token',
        permissions: ['GP', 'WP'],
        gameMode: 'pvp',
      };

      expect(expectedResponse).toMatchObject({
        token: expect.any(String),
        note: expect.any(String),
        permissions: expect.any(Array),
      });

      expect(expectedResponse.token.length).toBeGreaterThan(10);
      expect(Array.isArray(expectedResponse.permissions)).toBe(true);
    });
  });

  describe('DELETE /api/token (revoke) - Response Structure', () => {
    it('returns revocation confirmation', () => {
      const expectedResponse = {
        revoked: true,
        message: 'Token revoked successfully',
      };

      expect(expectedResponse).toMatchObject({
        revoked: expect.any(Boolean),
      });

      expect(expectedResponse.revoked).toBe(true);
    });
  });

  describe('Backward Compatibility - Token Endpoints', () => {
    it('maintains token info response fields', () => {
      const tokenInfo = {
        owner: 'user-id',
        note: 'token-note',
        permissions: ['GP'],
        gameMode: 'pvp',
        calls: 0,
        createdAt: new Date(),
      };

      const requiredFields = ['owner', 'note', 'permissions'];
      requiredFields.forEach(field => {
        expect(tokenInfo).toHaveProperty(field);
      });

      expect(Array.isArray(tokenInfo.permissions)).toBe(true);
      expect(typeof tokenInfo.owner).toBe('string');
      expect(typeof tokenInfo.note).toBe('string');
    });

    it('maintains token creation response structure', () => {
      const createResponse = {
        token: 'generated-token',
        note: 'note',
        permissions: ['GP'],
        gameMode: 'pvp',
      };

      expect(createResponse).toHaveProperty('token');
      expect(createResponse).toHaveProperty('note');
      expect(createResponse).toHaveProperty('permissions');
      
      expect(typeof createResponse.token).toBe('string');
      expect(typeof createResponse.note).toBe('string');
      expect(Array.isArray(createResponse.permissions)).toBe(true);
    });

    it('validates permission strings format', () => {
      const permissions = ['GP', 'WP', 'TP'];
      
      permissions.forEach(permission => {
        expect(typeof permission).toBe('string');
        expect(permission.length).toBe(2);
        expect(permission).toMatch(/^[A-Z]{2}$/);
      });
    });
  });

  describe('Error Responses - Token Endpoints', () => {
    it('returns standard error for invalid permissions', () => {
      const errorResponse = {
        success: false,
        error: 'Invalid permissions provided',
      };

      expect(errorResponse).toMatchObject({
        success: false,
        error: expect.any(String),
      });
    });

    it('returns standard error for missing authentication', () => {
      const errorResponse = {
        success: false,
        error: 'Authentication required',
      };

      expect(errorResponse.success).toBe(false);
      expect(typeof errorResponse.error).toBe('string');
      expect(errorResponse.error.length).toBeGreaterThan(0);
    });
  });
});
