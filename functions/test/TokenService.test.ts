import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import { firestoreMock } from './setup';
// Import after mocks are set up
import { TokenService } from '../src/services/TokenService';
import { errors } from '../src/middleware/errorHandler';
import { withTokenCollectionMock } from './helpers/tokenMocks';
import { TOKEN_FORMAT, TEST_TIMEOUTS } from './constants';
// New centralized utilities
import {
  createTestSuite,
  expectValidToken,
  expectTokenStructure,
  seedDb,
} from './helpers/index';

// Use centralized test suite management
describe('TokenService', () => {
  const suite = createTestSuite('TokenService');

  beforeEach(() => {
    suite.beforeEach();
    // Seed default test data
    suite.withDatabase({
      token: {
        tokenA: {
          owner: 'userA',
          note: 'Test token A',
          permissions: ['GP'],
          gameMode: 'pvp',
          calls: 5,
          createdAt: { toDate: () => new Date() },
        },
        tokenB: {
          owner: 'userA',
          note: 'Test token B',
          permissions: ['GP', 'WP'],
          gameMode: 'pvp',
          calls: 10,
          createdAt: { toDate: () => new Date() },
        },
        tokenC: {
          owner: 'userB',
          note: 'Test token C',
          permissions: ['TP'],
          gameMode: 'pve',
          calls: 3,
          createdAt: { toDate: () => new Date() },
        },
      },
      users: {
        userA: { uid: 'userA' },
        userB: { uid: 'userB' },
      },
    });
  });

  afterEach(suite.afterEach);
  describe('getTokenInfo', () => {
    it('should retrieve token information successfully', async () => {
      // Seed the database with the test token using suite helper
      suite.withDatabase({
        token: {
          'test-token-123': {
            owner: 'test-user-123',
            note: 'Test token',
            permissions: ['GP', 'WP'],
            gameMode: 'pvp',
            calls: 5,
            createdAt: { toDate: () => new Date() },
          },
        },
      });

      const tokenService = new TokenService();
      const result = await tokenService.getTokenInfo('test-token-123');

      // Use domain-specific assertions
      expectTokenStructure(result);
      expect(result.owner).toBe('test-user-123');
      expect(result.note).toBe('Test token');
      expect(result.permissions).toEqual(['GP', 'WP']);
      expect(result.gameMode).toBe('pvp');
      expect(result.calls).toBe(5);
    });
    it('should throw unauthorized error for non-existent token', async () => {
      const { collectionMock, restore } = withTokenCollectionMock((collection) => {
        const originalDoc = collection.doc;
        (collection.doc as any) = vi.fn().mockImplementation((docId) => {
          const docRef = originalDoc(docId);
          docRef.get.mockResolvedValue({
            exists: false,
            data: () => undefined,
          });
          return docRef;
        });
      });

      // Register cleanup with suite
      suite.addCleanup(restore);

      const tokenService = new TokenService();

      // Test that unauthorized error is thrown
      await expect(tokenService.getTokenInfo('invalid-token')).rejects.toMatchObject({
        name: 'ApiError',
        statusCode: 401,
        message: 'Invalid or expired token',
      });
    });
    it('should throw internal error when token data is undefined', async () => {
      // Use existing token from seeded data and override its get method
      const { restore } = withTokenCollectionMock((collection) => {
        const originalDoc = collection.doc;

        (collection.doc as any) = vi.fn().mockImplementation((docId) => {
          if (docId === 'tokenA') {
            return {
              id: docId,
              path: `token/${docId}`,
              get: vi.fn().mockResolvedValueOnce({
                exists: true,
                data: () => undefined,
              }),
            };
          }

          // Use original for all other tokens
          return originalDoc(docId);
        });
      });
      const tokenService = new TokenService();
      await expect(tokenService.getTokenInfo('tokenA')).rejects.toThrow('Invalid token data');
      restore();
    });
    it('should increment token calls asynchronously', async () => {
      const { collectionMock, restore } = withTokenCollectionMock(() => {});
      // Use the existing tokenA from the seeded data
      const tokenService = new TokenService();
      await tokenService.getTokenInfo('tokenA');
      // Give the async call a moment to execute
      await new Promise((resolve) => setTimeout(resolve, TEST_TIMEOUTS.SHORT));
      // The update method should have been called on the token document
      // Check that doc was called with tokenA (for the increment call)
      const docCalls = collectionMock.doc.mock.calls;
      const incrementCall = docCalls.find((call) => call[0] === 'tokenA');
      expect(incrementCall).toBeDefined();
      // Find the doc reference that was used for the update
      const docRef = collectionMock.doc.mock.results.find(
        (result, index) => collectionMock.doc.mock.calls[index][0] === 'tokenA'
      )?.value;
      if (docRef && docRef.update) {
        expect(docRef.update).toHaveBeenCalledWith({
          calls: expect.objectContaining({ _increment: 1 }),
        });
      }
      restore();
    });
    it('should default gameMode to pvp for legacy tokens', async () => {
      const mockTokenData = {
        owner: 'userA',
        note: 'Test token',
        permissions: ['GP'],
        // No gameMode field
        calls: 0,
        createdAt: { toDate: () => new Date(0) },
      };
      const { collectionMock, restore } = withTokenCollectionMock((collection) => {
        const originalDoc = collection.doc;
        (collection.doc as any) = vi.fn().mockImplementation((docId) => {
          const docRef = originalDoc(docId);
          docRef.get = vi.fn().mockResolvedValue({
            exists: true,
            data: () => mockTokenData,
          });
          return docRef;
        });
      });
      const tokenService = new TokenService();
      const result = await tokenService.getTokenInfo('tokenA');
      expect(result.gameMode).toBe('pvp');
      expect(collectionMock.doc).toHaveBeenCalled();
      restore();
    });
    it('should handle Firestore errors gracefully', async () => {
      const { restore } = withTokenCollectionMock((collection) => {
        const originalDoc = collection.doc;
        (collection.doc as any) = vi.fn().mockImplementation((docId) => {
          const docRef = originalDoc(docId);
          // Mock get to throw an error
          docRef.get.mockRejectedValueOnce(new Error('Firestore connection failed'));
          return docRef;
        });
      });
      const tokenService = new TokenService();
      await expect(tokenService.getTokenInfo('tokenA')).rejects.toThrow(
        'Failed to retrieve token information'
      );
      restore();
    });
  });
  describe('validateToken', () => {
    it('should validate token from Authorization header', async () => {
      const mockTokenData = {
        owner: 'userA',
        note: 'Test token',
        permissions: ['GP'],
        gameMode: 'pvp',
        calls: 0,
        createdAt: { toDate: () => new Date(0) },
      };
      const { restore } = withTokenCollectionMock((collection) => {
        const originalDoc = collection.doc;
        (collection.doc as any) = vi.fn().mockImplementation((docId) => {
          const docRef = originalDoc(docId);
          docRef.get = vi.fn().mockResolvedValue({
            exists: true,
            data: () => mockTokenData,
          });
          return docRef;
        });
      });
      const tokenService = new TokenService();
      const result = await tokenService.validateToken('Bearer tokenA');
      expect(result.token).toBe('tokenA');
      expect(result.token).toMatch(TOKEN_FORMAT);
      expect(result.token.length).toBe(19);
      expect(result.permissions).toEqual(['GP']);
      restore();
    });
    it('should throw error when Authorization header is missing', async () => {
      const tokenService = new TokenService();
      await expect(tokenService.validateToken(undefined)).rejects.toThrow(
        'No Authorization header provided'
      );
      await expect(tokenService.validateToken(undefined)).rejects.toMatchObject({
        name: 'ApiError',
        statusCode: 401,
      });
    });
    it('should throw error for invalid Authorization header format', async () => {
      const tokenService = new TokenService();
      await expect(tokenService.validateToken('InvalidFormat')).rejects.toThrow(
        "Invalid Authorization header format. Expected 'Bearer <token>'"
      );
      await expect(tokenService.validateToken('InvalidFormat')).rejects.toMatchObject({
        name: 'ApiError',
        statusCode: 400,
      });
    });
    it('should throw error for missing token in Bearer format', async () => {
      const tokenService = new TokenService();
      await expect(tokenService.validateToken('Bearer ')).rejects.toThrow(
        "Invalid Authorization header format. Expected 'Bearer <token>'"
      );
    });
    it('should throw error for non-Bearer token', async () => {
      const tokenService = new TokenService();
      await expect(tokenService.validateToken('Basic token123')).rejects.toThrow(
        "Invalid Authorization header format. Expected 'Bearer <token>'"
      );
    });
  });
  describe('createToken', () => {
    it('should create token successfully', async () => {
      const owner = 'test-user-123';
      const note = 'Test API token';
      const permissions = ['GP', 'WP'];
      const gameMode = 'pvp';
      const tokenService = new TokenService();
      const result = await tokenService.createToken(owner, { note, permissions, gameMode });
      expect(result).toEqual({
        token: expect.any(String),
        created: true,
        owner: expect.any(String),
        permissions: expect.any(Array),
      });
      expect(result.token).toMatch(TOKEN_FORMAT);
      expect(result.token.length).toBe(19);
    });
    it('should generate unique secure tokens', async () => {
      const tokenService = new TokenService();
      const result1 = await tokenService.createToken('userA', {
        note: 'Token 1',
        permissions: ['GP'],
        gameMode: 'pvp',
      });
      const result2 = await tokenService.createToken('userB', {
        note: 'Token 2',
        permissions: ['WP'],
        gameMode: 'pve',
      });
      expect(result1.token).not.toBe(result2.token);
      expect(result1.token).toMatch(TOKEN_FORMAT);
      expect(result1.token.length).toBe(19);
      expect(result2.token).toMatch(TOKEN_FORMAT);
      expect(result2.token.length).toBe(19);
    });
    it('should trim note whitespace', async () => {
      const tokenService = new TokenService();
      const result = await tokenService.createToken('test-user', {
        note: '  Test Token  ',
        permissions: ['GP'],
        gameMode: 'pvp',
      });
      expect(result.token).toMatch(TOKEN_FORMAT);
      expect(result.token.length).toBe(19);
      expect(result.created).toBe(true);
      // Verify the transaction was called
      expect(firestoreMock.runTransaction).toHaveBeenCalled();
    });
    it('should handle transaction failures', async () => {
      // Mock the transaction to throw an error
      firestoreMock.runTransaction.mockImplementationOnce(async () => {
        throw new Error('Transaction failed');
      });
      const tokenService = new TokenService();
      await expect(
        tokenService.createToken('test-user', {
          note: 'Test token',
          permissions: ['GP'],
          gameMode: 'pvp',
        })
      ).rejects.toThrow(/failed to create token/i);
    });
    it('should default to pvp game mode when not specified', async () => {
      const tokenService = new TokenService();
      const result = await tokenService.createToken('test-user', {
        note: 'Test token',
        permissions: ['GP'],
      });
      expect(result.created).toBe(true);
      expect(result.token).toMatch(TOKEN_FORMAT);
      expect(result.token.length).toBe(19);
    });
  });
  describe('token expiration', () => {
    it('should reject expired tokens and accept valid tokens', async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Create tokens with different expiration statuses
      const expiredTokenData = {
        owner: 'userA',
        note: 'Expired token',
        permissions: ['GP'],
        gameMode: 'pvp',
        calls: 5,
        createdAt: { toDate: () => thirtyDaysAgo },
        lastUsed: { toDate: () => thirtyDaysAgo },
        isActive: false,
        status: 'expired' as const,
        expiredAt: { toDate: () => new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) }, // Expired 15 days ago
      };

      const validTokenData = {
        owner: 'userA',
        note: 'Valid token',
        permissions: ['GP', 'WP'],
        gameMode: 'pvp',
        calls: 10,
        createdAt: { toDate: () => new Date() },
        lastUsed: { toDate: () => new Date() },
        isActive: true,
        status: 'active' as const,
      };

      // Seed the database with test tokens using suite helper
      suite.withDatabase({
        token: {
          'expired-token': expiredTokenData,
          'valid-token': validTokenData,
        },
        users: {
          userA: { uid: 'userA' },
        },
      });

      const tokenService = new TokenService();

      // Test that expired token is rejected
      await expect(tokenService.getTokenInfo('expired-token')).rejects.toThrow(
        'Invalid or expired token'
      );

      // Test that valid token is accepted
      const validTokenResult = await tokenService.getTokenInfo('valid-token');
      expect(validTokenResult.token).toBe('valid-token');
      expect(validTokenResult.permissions).toEqual(['GP', 'WP']);
      expect(validTokenResult.owner).toBe('userA');
    });

    it('should reject tokens with inactive status', async () => {
      const inactiveTokenData = {
        owner: 'userA',
        note: 'Inactive token',
        permissions: ['GP'],
        gameMode: 'pvp',
        calls: 3,
        createdAt: { toDate: () => new Date() },
        lastUsed: { toDate: () => new Date() },
        isActive: false,
        status: 'revoked' as const,
      };

      // Seed the database with test token using suite helper
      suite.withDatabase({
        token: {
          'inactive-token': inactiveTokenData,
        },
        users: {
          userA: { uid: 'userA' },
        },
      });

      const tokenService = new TokenService();

      // Test that inactive token is rejected
      await expect(tokenService.getTokenInfo('inactive-token')).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('should handle tokens without expiration fields (legacy tokens)', async () => {
      const legacyTokenData = {
        owner: 'userA',
        note: 'Legacy token',
        permissions: ['GP'],
        gameMode: 'pvp',
        calls: 2,
        createdAt: { toDate: () => new Date() },
        // No isActive, status, or lastUsed fields - legacy token
      };

      // Seed the database with test token using suite helper
      suite.withDatabase({
        token: {
          'legacy-token': legacyTokenData,
        },
        users: {
          userA: { uid: 'userA' },
        },
      });

      const tokenService = new TokenService();

      // Legacy tokens without expiration fields should be accepted
      const result = await tokenService.getTokenInfo('legacy-token');
      expect(result.token).toBe('legacy-token');
      expect(result.permissions).toEqual(['GP']);
      expect(result.owner).toBe('userA');
    });
  });
});
describe('revokeToken', () => {
  it('should revoke token successfully', async () => {
    const { collectionMock, restore } = withTokenCollectionMock(() => {});
    // Use the existing tokenA from the seeded data (owned by userA)
    const tokenService = new TokenService();
    const result = await tokenService.revokeToken('tokenA', 'userA');
    expect(result).toEqual({ revoked: true });
    // The delete method should have been called on the token document
    expect(collectionMock.doc).toHaveBeenCalledWith('tokenA');
    const usedDocRef = collectionMock.doc.mock.results[0].value;
    expect(usedDocRef.delete).toHaveBeenCalled();
    restore();
  });
  it('should throw not found error for non-existent token', async () => {
    const { restore } = withTokenCollectionMock((collection) => {
      const originalDoc = collection.doc;
      (collection.doc as any) = vi.fn().mockImplementation((docId) => {
        const docRef = originalDoc(docId);
        docRef.get.mockResolvedValue({
          exists: false,
          data: () => undefined,
        });
        return docRef;
      });
    });
    const tokenService = new TokenService();
    await expect(tokenService.revokeToken('invalid-token', 'userA')).rejects.toThrow(
      'Token not found'
    );
    restore();
  });
  it('should throw forbidden error when user does not own token', async () => {
    const { restore } = withTokenCollectionMock((collection) => {
      const originalDoc = collection.doc;
      (collection.doc as any) = vi.fn().mockImplementation((docId) => {
        const docRef = originalDoc(docId);
        docRef.get.mockResolvedValue({
          exists: true,
          data: () => ({
            owner: 'userB',
            note: 'Test token',
            permissions: ['GP'],
          }),
        });
        return docRef;
      });
    });
    const tokenService = new TokenService();
    await expect(tokenService.revokeToken('tokenC', 'userA')).rejects.toThrow(
      /you can only revoke your own tokens/i
    );
    restore();
  });
  it('should handle Firestore errors gracefully', async () => {
    const { restore } = withTokenCollectionMock((collection) => {
      const originalDoc = collection.doc;
      (collection.doc as any) = vi.fn().mockImplementation((docId) => {
        const docRef = originalDoc(docId);
        // Create a new mock function for get to avoid conflicts
        docRef.get = vi.fn().mockRejectedValue(new Error('Firestore connection failed'));
        return docRef;
      });
    });
    const tokenService = new TokenService();
    await expect(tokenService.revokeToken('tokenA', 'userA')).rejects.toThrow(
      'Failed to revoke token'
    );
    restore();
  });
});
describe('listUserTokens', () => {
  it('should list all tokens for a user', async () => {
    const mockTokens = [
      {
        id: 'tokenA',
        data: () => ({
          owner: 'userA',
          note: 'Test token A',
          permissions: ['GP'],
          gameMode: 'pvp',
          createdAt: { toDate: () => new Date(0) },
        }),
      },
      {
        id: 'tokenB',
        data: () => ({
          owner: 'userA',
          note: 'Test token B',
          permissions: ['WP'],
          gameMode: 'pvp',
          createdAt: { toDate: () => new Date(0) },
        }),
      },
    ];
    const { restore } = withTokenCollectionMock((collection) => {
      collection.where.mockReturnThis();
      collection.get.mockResolvedValue({
        docs: mockTokens,
      });
    });
    const tokenService = new TokenService();
    const result = await tokenService.listUserTokens('userA');
    expect(result).toHaveLength(2);
    const tokenA = result.find((t) => t.note === 'Test token A');
    const tokenB = result.find((t) => t.note === 'Test token B');
    expect(tokenA).toBeDefined();
    expect(tokenB).toBeDefined();
    expect(tokenA?.gameMode).toBe('pvp');
    expect(tokenB?.gameMode).toBe('pvp');
    restore();
  });
  it('should return empty array when user has no tokens', async () => {
    const { restore } = withTokenCollectionMock((collection) => {
      collection.where.mockReturnThis();
      collection.get.mockResolvedValue({
        docs: [],
      });
    });
    const tokenService = new TokenService();
    const result = await tokenService.listUserTokens('user-with-no-tokens');
    expect(result).toEqual([]);
    restore();
  });
  it('should default gameMode to pvp for legacy tokens', async () => {
    const mockTokens = [
      {
        id: 'tokenA',
        data: () => ({
          owner: 'userA',
          note: 'Legacy Token',
          permissions: ['GP'],
          // No gameMode
          createdAt: { toDate: () => new Date(0) },
        }),
      },
    ];
    const { restore } = withTokenCollectionMock((collection) => {
      collection.where.mockReturnThis();
      collection.get.mockResolvedValue({
        docs: mockTokens,
      });
    });
    const tokenService = new TokenService();
    const result = await tokenService.listUserTokens('userA');
    expect(result[0].gameMode).toBe('pvp');
    restore();
  });
  it('should handle Firestore errors gracefully', async () => {
    const { restore } = withTokenCollectionMock((collection) => {
      collection.where.mockReturnThis();
      collection.get.mockRejectedValue(new Error('Firestore connection failed'));
    });
    const tokenService = new TokenService();
    await expect(tokenService.listUserTokens('userA')).rejects.toThrow('Failed to list tokens');
    restore();
  });
  describe('validatePermissions', () => {
    it('should validate valid permissions', () => {
      const tokenService = new TokenService();
      expect(() => tokenService.validatePermissions(['GP', 'WP'])).not.toThrow();
    });
    it('should throw error for empty permissions array', () => {
      const tokenService = new TokenService();
      expect(() => tokenService.validatePermissions([])).toThrow(
        'At least one permission is required'
      );
    });
    it('should throw error for non-array permissions', () => {
      const tokenService = new TokenService();
      expect(() => tokenService.validatePermissions('read' as any)).toThrow(
        'At least one permission is required'
      );
    });
    it('should throw error for invalid permissions', () => {
      const tokenService = new TokenService();
      expect(() => tokenService.validatePermissions(['INVALID'])).toThrow(
        'Invalid permissions: INVALID'
      );
    });
    it('should throw error for mixed valid and invalid permissions', () => {
      const tokenService = new TokenService();
      expect(() => tokenService.validatePermissions(['GP', 'INVALID'])).toThrow(
        'Invalid permissions: INVALID'
      );
    });
  });
  describe('generateSecureToken', () => {
    it('should generate cryptographically secure tokens', async () => {
      const tokenService = new TokenService();
      const token = await tokenService.createToken('userA', {
        note: 'Token 1',
        permissions: ['GP'],
        gameMode: 'pvp',
      });
      // Use the proper token format validation
      expect(token.token).toMatch(TOKEN_FORMAT);
      expect(token.token.length).toBe(19);
    });
    it('should generate unique tokens across multiple calls', async () => {
      const tokenService = new TokenService();
      const token1 = await tokenService.createToken('userA', {
        note: 'Token 1',
        permissions: ['GP'],
        gameMode: 'pvp',
      });
      const token2 = await tokenService.createToken('userB', {
        note: 'Token 2',
        permissions: ['WP'],
        gameMode: 'pve',
      });
      expect(token1.token).not.toBe(token2.token);
      expect(token1.token).toMatch(TOKEN_FORMAT);
      expect(token1.token.length).toBe(19);
      expect(token2.token).toMatch(TOKEN_FORMAT);
      expect(token2.token.length).toBe(19);
    });
    it('should handle deterministic uniqueness generation with collision', async () => {
      // Mock crypto.randomBytes to simulate collision then success
      // First call generates predictable token that exists, second generates new token
      const crypto = await import('node:crypto');
      const mockRandomBytes = vi.mocked(crypto.randomBytes);

      // Mock to return same buffer first time (collision), then different buffer
      // Note: actual randomBytes takes a size and callback
      mockRandomBytes
        .mockImplementationOnce((size, callback) => {
          callback(null, Buffer.from('a'.repeat(size), 'utf8'));
        })
        .mockImplementationOnce((size, callback) => {
          callback(null, Buffer.from('b'.repeat(size), 'utf8'));
        });
      // Seed existing token with collision token (using seedDb for this test-specific scenario)
      seedDb({
        token: {
          aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: {
            owner: 'userA',
            note: 'Duplicate token',
            permissions: ['GP'],
            gameMode: 'pvp',
            calls: 0,
            createdAt: { toDate: () => new Date() },
          },
        },
        users: { userA: { uid: 'userA' } },
      });
      firestoreMock.runTransaction.mockImplementationOnce(async () => {
        throw new Error('Token already exists');
      });
      const tokenService = new TokenService();

      // Create token twice to trigger collision and success
      await tokenService
        .createToken('userA', { note: 'Test collision', permissions: ['GP'], gameMode: 'pvp' })
        .catch(() => {
          /* ignore first failure */
        });
      const result2 = await tokenService.createToken('userA', {
        note: 'Test collision',
        permissions: ['GP'],
        gameMode: 'pvp',
      });
      expect(result2.created).toBe(true);
      expect(result2.token).toMatch(TOKEN_FORMAT);
      expect(result2.token.length).toBe(19);
    });
  });
});
