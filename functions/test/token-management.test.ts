import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { firestoreMock } from './setup.js';

// Import after mocks are set up
import { _createTokenLogic } from '../src/token/create.js';
import { revokeToken } from '../src/token/revoke.js';
import tokenHandler from '../src/token/tokenHandler.js';
import { seedDb, makeRes, resetDb } from './setup';

beforeEach(() => {
  resetDb();
  seedDb({
    apiTokens: {},
    users: { userA: { uid: 'userA', email: 'u@example.com', active: true } }
  });
});

describe('Token Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset Firestore mock to default state for each test
    firestoreMock.runTransaction.mockImplementation(async (callback) => {
      const transaction = {
        get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      };
      return callback(transaction);
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

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

      // Mock system doc with 5 existing tokens
      firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ tokens: ['token1', 'token2', 'token3', 'token4', 'token5'] }),
          }),
          set: vi.fn(),
          update: vi.fn(),
        };
        return callback(mockTransaction);
      });

      await expect(_createTokenLogic(request as any)).rejects.toThrow(
        'You have the maximum number of tokens (5).'
      );
    });

    it('should create token successfully with valid data', async () => {
      const request = mockRequest();

      firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ tokens: [] }),
          }),
          set: vi.fn(),
          update: vi.fn(),
        };
        return callback(mockTransaction);
      });

      const result = await _createTokenLogic(request as any);

      expect(result).toHaveProperty('token');
      expect(result.token).toBe('uuid-1'); // From setup.js deterministic mock
    });

    it('should create system document if it does not exist', async () => {
      const request = mockRequest();

      firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: false,
            data: () => undefined,
          }),
          set: vi.fn(),
          update: vi.fn(),
        };
        return callback(mockTransaction);
      });

      const result = await _createTokenLogic(request as any);

      expect(result).toHaveProperty('token');
      expect(result.token).toBe('uuid-1'); // From setup.js deterministic mock
    });

    it('should handle transaction errors gracefully', async () => {
      const request = mockRequest();

      firestoreMock.runTransaction.mockRejectedValueOnce(new Error('Transaction failed'));

      await expect(_createTokenLogic(request as any)).rejects.toThrow(
        'An unexpected error occurred during token creation.'
      );
    });

    it('should accept valid game modes', async () => {
      const validGameModes = ['pvp', 'pve', 'dual'];

      for (const gameMode of validGameModes) {
        const request = mockRequest({
          data: { note: 'Test token', permissions: ['read'], gameMode },
        });

        firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
          const mockTransaction = {
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ tokens: [] }),
            }),
            set: vi.fn(),
            update: vi.fn(),
          };
          return callback(mockTransaction);
        });

        const result = await _createTokenLogic(request as any);
        expect(result.token).toBe('uuid-1'); // From setup.js deterministic mock
      }
    });
  });

  describe('Token Revocation (revokeToken)', () => {
    const mockRequest = (overrides = {}) => ({
      method: 'POST',
      body: {
        data: {
          token: 'tokenA',
        },
      },
      ...overrides,
    });

    const mockResponse = () => {
      return makeRes();
    };

    it('should handle missing token in request body', async () => {
      const req = mockRequest({ body: { data: {} } });
      const res = mockResponse();

      await revokeToken(req as any, res as any);

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

      await revokeToken(req as any, res as any);

      const [[statusCode]] = res.status.mock.calls;
      const [[payload]] = res.json.mock.calls;
      expect(statusCode).toBe(405);
      expect(payload).toEqual({ error: 'Method Not Allowed' });
    });

    it('should revoke token successfully when user owns it', async () => {
      const req = mockRequest();
      const res = mockResponse();

      // Mock successful transaction
      firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
        const mockTransaction = {
          get: vi
            .fn()
            .mockResolvedValueOnce({
              exists: true,
              data: () => ({ owner: 'userA', permissions: ['read'] }),
            })
            .mockResolvedValueOnce({
              exists: true,
              data: () => ({ tokens: ['tokenA', 'other-token'] }),
            }),
          delete: vi.fn(),
          update: vi.fn(),
        };
        return callback(mockTransaction);
      });

      await revokeToken(req as any, res as any);

      const [[statusCode]] = res.status.mock.calls;
      const [[body]] = res.json.mock.calls;
      expect(statusCode).toBe(200);
      expect(body).toEqual(expect.objectContaining({ revoked: true }));
    });

    it('should return 404 when token does not exist', async () => {
      const req = mockRequest();
      const res = mockResponse();

      firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: false,
            data: () => undefined,
          }),
          delete: vi.fn(),
          update: vi.fn(),
        };
        return callback(mockTransaction);
      });

      await revokeToken(req as any, res as any);

      const [[statusCode]] = res.status.mock.calls;
      const [[body]] = res.json.mock.calls;
      expect(statusCode).toBe(404);
      expect(body).toEqual(expect.objectContaining({ error: expect.any(String) }));
    });

    it('should return 403 when user does not own the token', async () => {
      const req = mockRequest();
      const res = mockResponse();

      firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ owner: 'different-user', permissions: ['GP'] }),
          }),
          delete: vi.fn(),
          update: vi.fn(),
        };
        return callback(mockTransaction);
      });

      await revokeToken(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      const [body] = res.json.mock.calls.at(-1) || [];
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
      const req = mockRequest({ apiToken: { permissions: [] } });
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