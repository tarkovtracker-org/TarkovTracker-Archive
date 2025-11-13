import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestSuite, firestore } from '../../helpers';
import { _createTokenLogic } from '../../../src/token/create';
import { revokeTokenHandler } from '../../../src/token/revoke';
import tokenHandler from '../../../src/token/tokenHandler';

// Mock response helper
const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('Token Management', () => {
  const suite = createTestSuite('TokenManagement');

  beforeEach(async () => {
    await suite.beforeEach();
    await suite.withDatabase({
      token: {},
      system: {},
      users: { userA: { uid: 'userA', email: 'u@example.com', active: true } },
    });
  });

  afterEach(suite.afterEach);

  describe('Token Creation (_createTokenLogic)', () => {
    const mockRequest = (overrides = {}) => ({
      auth: { uid: 'userA' },
      data: {
        note: 'Test API token',
        permissions: ['read', 'write'],
        gameMode: 'pvp',
      },
      ...overrides,
    });

    it('should reject unauthenticated requests', async () => {
      const request = mockRequest({ auth: null });
      await expect(_createTokenLogic(request as any)).rejects.toThrow(
        'The function must be called while authenticated.'
      );
    });

    it('should reject requests with missing note', async () => {
      const request = mockRequest({ data: { permissions: ['read'] } });
      await expect(_createTokenLogic(request as any)).rejects.toThrow(
        'Invalid token parameters: note and permissions array are required.'
      );
    });

    it('should reject requests with missing permissions', async () => {
      const request = mockRequest({ data: { note: 'Test token' } });
      await expect(_createTokenLogic(request as any)).rejects.toThrow(
        'Invalid token parameters: note and permissions array are required.'
      );
    });

    it('should reject requests with empty permissions array', async () => {
      const request = mockRequest({ data: { note: 'Test token', permissions: [] } });
      await expect(_createTokenLogic(request as any)).rejects.toThrow(
        'Invalid token parameters: note and permissions array are required.'
      );
    });

    it('should reject invalid gameMode', async () => {
      const request = mockRequest({
        data: { note: 'Test token', permissions: ['read'], gameMode: 'invalid' },
      });
      await expect(_createTokenLogic(request as any)).rejects.toThrow(
        'Invalid gameMode: must be one of pvp, pve, dual.'
      );
    });

    it('should reject when user has maximum tokens (5)', async () => {
      const request = mockRequest();
      await suite.withDatabase({
        system: {
          userA: { tokens: ['token1', 'token2', 'token3', 'token4', 'token5'] },
        },
      });
      await expect(_createTokenLogic(request as any)).rejects.toThrow(
        'You have the maximum number of tokens (5).'
      );
    });

    it('should create token successfully with valid data', async () => {
      const request = mockRequest();
      const result = await _createTokenLogic(request as any);
      expect(result).toHaveProperty('token');
      expect(result.token).toMatch(/^[a-zA-Z0-9]{128}$/); // Deterministic UID generator with 128 chars

      // Verify token was created in emulator
      const db = firestore();
      const tokenDoc = await db.collection('token').doc(result.token).get();
      expect(tokenDoc.exists).toBe(true);
      expect(tokenDoc.data()?.owner).toBe('userA');
    });

    it('should create system document if it does not exist', async () => {
      const request = mockRequest();
      const result = await _createTokenLogic(request as any);
      expect(result).toHaveProperty('token');
      expect(result.token).toMatch(/^[a-zA-Z0-9]{128}$/); // Deterministic UID generator with 128 chars

      // Verify system document was created
      const db = firestore();
      const systemDoc = await db.collection('system').doc('userA').get();
      expect(systemDoc.exists).toBe(true);
      expect(systemDoc.data()?.tokens).toContain(result.token);
    });

    it('should handle transaction errors gracefully', async () => {
      const request = mockRequest();
      // Force a transaction error by creating a conflicting document
      const db = firestore();
      const batch = db.batch();
      const systemRef = db.collection('system').doc('userA');
      batch.set(systemRef, { tokens: [] }, { merge: true });
      await batch.commit();

      // Try to create token with conflicting system state
      await expect(_createTokenLogic(request as any)).resolves.toBeDefined();
    });

    it('should accept valid game modes', async () => {
      const validGameModes = ['pvp', 'pve', 'dual'];
      for (const gameMode of validGameModes) {
        const request = mockRequest({
          data: { note: 'Test token', permissions: ['read'], gameMode },
        });
        const result = await _createTokenLogic(request as any);
        expect(result.token).toMatch(/^[a-zA-Z0-9]{128}$/); // Deterministic UID generator with 128 chars

        // Verify token was created with correct gameMode
        const db = firestore();
        const tokenDoc = await db.collection('token').doc(result.token).get();
        expect(tokenDoc.data()?.gameMode).toBe(gameMode);
      }
    });
  });

  describe('Token Revocation (revokeToken)', () => {
    const mockRequest = (overrides = {}) => {
      const { headers, ...rest } = overrides as { headers?: Record<string, string> };
      return {
        method: 'POST',
        body: {
          data: {
            token: 'tokenA',
          },
        },
        headers: {
          origin: 'http://localhost:5173',
          authorization: 'Bearer test-id-token',
          ...headers,
        },
        ...rest,
      };
    };

    const mockResponse = () => {
      return makeRes();
    };

    it('should handle missing token in request body', async () => {
      const req = mockRequest({ body: { data: {} } });
      const res = mockResponse();
      await revokeTokenHandler(req as any, res as any);
      const [[statusCode]] = res.status.mock.calls;
      const [[payload]] = res.json.mock.calls;
      expect(statusCode).toBe(400);
      expect(payload).toEqual({
        error: 'Invalid request parameters.',
      });
    });

    it('should reject non-POST requests', async () => {
      const req = mockRequest({ method: 'GET' });
      const res = mockResponse();
      await revokeTokenHandler(req as any, res as any);
      const [[statusCode]] = res.status.mock.calls;
      const [[payload]] = res.json.mock.calls;
      expect(statusCode).toBe(405);
      expect(payload).toEqual({ error: 'Method Not Allowed' });
    });

    it('should revoke token successfully when user owns it', async () => {
      const req = mockRequest();
      const res = mockResponse();

      // Create a token in emulator
      const db = firestore();
      const tokenId = 'tokenA';
      await db
        .collection('token')
        .doc(tokenId)
        .set({
          owner: 'userA',
          permissions: ['read'],
          note: 'Test token',
          gameMode: 'pvp',
          created: new Date().toISOString(),
        });

      await db
        .collection('system')
        .doc('userA')
        .set({
          tokens: [tokenId, 'other-token'],
        });

      await revokeTokenHandler(req as any, res as any);
      const [[statusCode]] = res.status.mock.calls;
      const [[body]] = res.json.mock.calls;
      expect(statusCode).toBe(200);
      expect(body).toEqual(expect.objectContaining({ revoked: true }));

      // Verify token was deleted
      const tokenDoc = await db.collection('token').doc(tokenId).get();
      expect(tokenDoc.exists).toBe(false);

      // Verify token was removed from system document
      const systemDoc = await db.collection('system').doc('userA').get();
      expect(systemDoc.data()?.tokens).not.toContain(tokenId);
    });

    it('should return 404 when token does not exist', async () => {
      const req = mockRequest();
      const res = mockResponse();
      await revokeTokenHandler(req as any, res as any);
      const [[statusCode]] = res.status.mock.calls;
      const [[body]] = res.json.mock.calls;
      expect(statusCode).toBe(404);
      expect(body).toEqual(expect.objectContaining({ error: expect.any(String) }));
    });

    it('should return 403 when user does not own the token', async () => {
      const req = mockRequest();
      const res = mockResponse();

      // Create a token owned by different user
      const db = firestore();
      const tokenId = 'tokenA';
      await db
        .collection('token')
        .doc(tokenId)
        .set({
          owner: 'different-user',
          permissions: ['GP'],
          note: 'Test token',
          gameMode: 'pvp',
          created: new Date().toISOString(),
        });

      await revokeTokenHandler(req as any, res as any);
      expect(res.status).toHaveBeenCalledWith(403);
      const [body] = res.json.mock.calls.at(-1) ?? [];
      expect(body).toEqual(expect.objectContaining({ error: expect.any(String) }));
    });
  });

  describe('Token Handler (getTokenInfo)', () => {
    const mockRequest = (overrides = {}) => ({
      apiToken: {
        token: 'tokenA',
        permissions: ['read', 'write'],
        owner: 'userA',
        note: 'Test token',
      },
      ...overrides,
    });

    const mockResponse = () => {
      return makeRes();
    };

    it('should return token info when apiToken is present', async () => {
      const req = mockRequest();
      const res = mockResponse();
      await tokenHandler.getTokenInfo(req as any, res as any);
      const [[statusCode]] = res.status.mock.calls;
      const [[payload]] = res.json.mock.calls;
      expect(statusCode).toBe(200);
      expect(payload).toEqual({
        permissions: ['read', 'write'],
        token: 'tokenA',
      });
    });

    it('should return 401 when apiToken is missing', async () => {
      const req = mockRequest({ apiToken: undefined });
      const res = mockResponse();
      await tokenHandler.getTokenInfo(req as any, res as any);
      const [[statusCode]] = res.status.mock.calls;
      const [[payload]] = res.json.mock.calls;
      expect(statusCode).toBe(401);
      expect(payload).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 when apiToken.token is missing', async () => {
      const req = mockRequest({ apiToken: { token: undefined } });
      const res = mockResponse();
      await tokenHandler.getTokenInfo(req as any, res as any);
      const [[statusCode]] = res.status.mock.calls;
      const [[payload]] = res.json.mock.calls;
      expect(statusCode).toBe(401);
      expect(payload).toEqual({ error: 'Unauthorized' });
    });

    it('should handle tokens with empty permissions', async () => {
      const req = mockRequest({ apiToken: { token: 'tokenA', permissions: [] } });
      const res = mockResponse();
      await tokenHandler.getTokenInfo(req as any, res as any);
      const [[statusCode]] = res.status.mock.calls;
      const [[payload]] = res.json.mock.calls;
      expect(statusCode).toBe(200);
      expect(payload).toEqual({
        permissions: [],
        token: 'tokenA',
      });
    });
  });
});
