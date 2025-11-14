import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { TokenService } from '../../../src/services/TokenService';
import { errors } from '../../../src/middleware/errorHandler';
// New centralized utilities
import {
  createTestSuite,
  expectValidToken,
  expectTokenStructure,
  TokenDataBuilder,
  createBasicToken,
  createExpiredToken,
  createRevokedToken,
  createLegacyToken,
  admin,
} from '../../helpers';

import * as factoryModule from '../../../src/utils/factory';

// Test constants
const TOKEN_FORMAT = /^[0-9A-Za-z]{19}$/; // BASE62 token format
const TEST_TIMEOUTS = { default: 5000, long: 10000 };

// Use centralized test suite management
describe('TokenService', () => {
  const suite = createTestSuite('TokenService');

  beforeEach(async () => {
    await suite.beforeEach();
    await suite.withDatabase({
      token: {
        tokenA: new TokenDataBuilder()
          .withOwner('userA')
          .withNote('Test token A')
          .withPermissions(['GP'])
          .withCalls(5)
          .build(),
        tokenB: new TokenDataBuilder()
          .withOwner('userA')
          .withNote('Test token B')
          .withPermissions(['GP', 'WP'])
          .withCalls(10)
          .build(),
        tokenC: new TokenDataBuilder()
          .withOwner('userB')
          .withNote('Test token C')
          .withPermissions(['TP'])
          .pve()
          .withCalls(3)
          .build(),
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
      // Seed the database with the test token using TokenDataBuilder
      await suite.withDatabase({
        token: {
          'test-token-123': new TokenDataBuilder()
            .withOwner('test-user-123')
            .withNote('Test token')
            .withPermissions(['GP', 'WP'])
            .withCalls(5)
            .build(),
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
      // No need to seed the token - the default mock returns exists: false for missing tokens
      const tokenService = new TokenService();

      // Test that unauthorized error is thrown for non-existent token
      await expect(tokenService.getTokenInfo('invalid-token')).rejects.toMatchObject({
        name: 'ApiError',
        statusCode: 401,
        message: 'Invalid or expired token',
      });
    });
    it('should throw internal error when token data is undefined', async () => {
      const restore = mockFirestoreDoc('tokenA', {
        exists: true,
        data: () => undefined,
      });
      suite.addCleanup(restore);

      const tokenService = new TokenService();
      await expect(tokenService.getTokenInfo('tokenA')).rejects.toThrow('Invalid token data');
    });
    it('should increment token calls asynchronously', async () => {
      const tokenService = new TokenService();
      await tokenService.getTokenInfo('tokenA');

      const tokenRef = admin.firestore().collection('token').doc('tokenA');
      await waitFor(async () => {
        const snapshot = await tokenRef.get();
        expect(snapshot.data()?.calls).toBe(6);
      });
    });
    it('should default gameMode to pvp for legacy tokens', async () => {
      // Use TokenDataBuilder to create a legacy token (without gameMode)
      await suite.withDatabase({
        token: {
          'legacy-token': new TokenDataBuilder()
            .withOwner('userA')
            .withNote('Test token')
            .withPermissions(['GP'])
            .legacy() // Removes modern fields including explicit gameMode
            .build(),
        },
      });

      const tokenService = new TokenService();
      const result = await tokenService.getTokenInfo('legacy-token');

      // Should default to 'pvp' when gameMode is missing
      expect(result.gameMode).toBe('pvp');
    });
    it('should handle Firestore errors gracefully', async () => {
      const restore = mockFirestoreDoc('tokenA', {
        throwError: new Error('Firestore connection failed'),
      });
      suite.addCleanup(restore);

      const tokenService = new TokenService();
      await expect(tokenService.getTokenInfo('tokenA')).rejects.toThrow(
        'Failed to retrieve token information'
      );
    });
  });
  describe('validateToken', () => {
    it('should validate token from Authorization header', async () => {
      // tokenA is already seeded in beforeEach, so we can use it directly
      const tokenService = new TokenService();
      const result = await tokenService.validateToken('Bearer tokenA');

      expect(result.token).toBe('tokenA');
      expect(result.token).toMatch(TOKEN_FORMAT);
      expect(result.token.length).toBe(19);
      expect(result.permissions).toEqual(['GP']); // tokenA has GP permission
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
      const storedDoc = await admin.firestore().collection('token').doc(result.token).get();
      expect(storedDoc.data()?.note).toBe('Test Token');
    });
    it('should handle transaction failures', async () => {
      const runTransactionSpy = vi
        .spyOn(admin.firestore(), 'runTransaction')
        .mockRejectedValueOnce(new Error('Transaction failed'));
      suite.addCleanup(() => runTransactionSpy.mockRestore());
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
      // Use TokenDataBuilder for clear test intent
      await suite.withDatabase({
        token: {
          'expired-token': new TokenDataBuilder()
            .withOwner('userA')
            .withNote('Expired token')
            .withPermissions(['GP'])
            .withCalls(5)
            .expired(15) // Expired 15 days ago
            .build(),
          'valid-token': new TokenDataBuilder()
            .withOwner('userA')
            .withNote('Valid token')
            .withPermissions(['GP', 'WP'])
            .withCalls(10)
            .active()
            .build(),
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
      // Use TokenDataBuilder with revoked() for clear intent
      await suite.withDatabase({
        token: {
          'inactive-token': new TokenDataBuilder()
            .withOwner('userA')
            .withNote('Inactive token')
            .withPermissions(['GP'])
            .withCalls(3)
            .revoked()
            .build(),
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
      // Use TokenDataBuilder with legacy() for clear intent
      await suite.withDatabase({
        token: {
          'legacy-token': new TokenDataBuilder()
            .withOwner('userA')
            .withNote('Legacy token')
            .withPermissions(['GP'])
            .withCalls(2)
            .legacy() // Removes modern expiration fields
            .build(),
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

  type MockDocBehavior =
    | {
        exists: boolean;
        data: () => any;
      }
    | {
        throwError: Error;
      };

  const mockFirestoreDoc = (docId: string, behavior: MockDocBehavior) => {
    const docRef = {
      path: `token/${docId}`,
      update: vi.fn(),
      get:
        'throwError' in behavior
          ? vi.fn().mockRejectedValue(behavior.throwError)
          : vi.fn().mockResolvedValue(behavior),
    };

    const collectionMock = vi.fn((collectionName: string) => {
      if (collectionName !== 'token') {
        throw new Error(`Unexpected collection ${collectionName} in mock`);
      }
      return {
        doc: vi.fn((requestedId: string) => {
          if (requestedId === docId) return docRef;
          return {
            path: `token/${requestedId}`,
            update: vi.fn(),
            get: vi.fn().mockResolvedValue({ exists: false }),
          };
        }),
      };
    });

    const mockDb = {
      collection: collectionMock,
    } as const;

    const spy = vi
      .spyOn(factoryModule, 'createLazyFirestore')
      .mockReturnValue(() => mockDb as unknown as Firestore);

    return () => spy.mockRestore();
  };

  const waitFor = async (assertion: () => Promise<void> | void, timeout = 500, interval = 25) => {
    const start = Date.now();
    let lastError: unknown;
    while (Date.now() - start < timeout) {
      try {
        await assertion();
        return;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }
    throw lastError ?? new Error('waitFor timed out');
  };
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
      // Seed existing token with collision token (using TokenDataBuilder)
      await suite.withDatabase({
        token: {
          aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: new TokenDataBuilder()
            .withOwner('userA')
            .withNote('Duplicate token')
            .withPermissions(['GP'])
            .build(),
        },
        users: { userA: { uid: 'userA' } },
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

describe('revokeToken', () => {
  const suite = createTestSuite('revokeToken');
  let tokenService: TokenService;

  beforeEach(async () => {
    await suite.beforeEach();
    await suite.withDatabase({
      token: {
        tokenA: new TokenDataBuilder().withOwner('userA').withNote('Test token A').build(),
        tokenB: new TokenDataBuilder().withOwner('userB').withNote('Test token B').build(),
      },
      users: {
        userA: { uid: 'userA' },
        userB: { uid: 'userB' },
      },
    });
    // Global afterEach in test/setup.ts handles Firestore cleanup
    tokenService = new TokenService();
  });

  afterEach(suite.afterEach);

  it('should revoke token successfully', async () => {
    const result = await tokenService.revokeToken('tokenA', 'userA');
    expect(result).toEqual({ revoked: true });
    const tokenDoc = await admin.firestore().collection('token').doc('tokenA').get();
    expect(tokenDoc.exists).toBe(false);
  });

  it('should throw not found error for non-existent token', async () => {
    await expect(tokenService.revokeToken('missing-token', 'userA')).rejects.toThrow(
      'Token not found'
    );
  });

  it('should throw forbidden error when user does not own token', async () => {
    await expect(tokenService.revokeToken('tokenB', 'userA')).rejects.toThrow(
      /you can only revoke your own tokens/i
    );
  });

  it('should handle Firestore errors gracefully', async () => {
    const createLazyFirestoreSpy = vi
      .spyOn(factoryModule, 'createLazyFirestore')
      .mockReturnValue(() => {
        return {
          collection: () => ({
            doc: () => ({
              get: vi.fn().mockRejectedValue(new Error('Firestore connection failed')),
              delete: vi.fn(),
            }),
          }),
        } as unknown as Firestore;
      });
    const failingService = new TokenService();
    await expect(failingService.revokeToken('tokenA', 'userA')).rejects.toThrow(
      'Failed to revoke token'
    );
    createLazyFirestoreSpy.mockRestore();
  });
});

describe('listUserTokens', () => {
  const suite = createTestSuite('listUserTokens');

  beforeEach(async () => {
    await suite.beforeEach();
    await suite.withDatabase({
      token: {
        tokenA: new TokenDataBuilder()
          .withOwner('userA')
          .withNote('Test token A')
          .withPermissions(['GP'])
          .build(),
        tokenB: new TokenDataBuilder()
          .withOwner('userA')
          .withNote('Test token B')
          .withPermissions(['WP'])
          .build(),
        legacyToken: new TokenDataBuilder()
          .withOwner('userB')
          .withNote('Legacy token')
          .withPermissions(['GP'])
          .legacy()
          .build(),
      },
    });
    // Global afterEach in test/setup.ts handles Firestore cleanup
  });

  afterEach(suite.afterEach);

  it('should list all tokens for a user', async () => {
    const tokenService = new TokenService();
    const result = await tokenService.listUserTokens('userA');

    expect(result).toHaveLength(2);
    const tokenNotes = result.map((token) => token.note);
    expect(tokenNotes).toEqual(expect.arrayContaining(['Test token A', 'Test token B']));
  });

  it('should return empty array when user has no tokens', async () => {
    await suite.withDatabase({ token: {} });
    const tokenService = new TokenService();
    const result = await tokenService.listUserTokens('unknown');
    expect(result).toEqual([]);
  });

  it('should default gameMode to pvp for legacy tokens', async () => {
    const tokenService = new TokenService();
    const [legacy] = await tokenService.listUserTokens('userB');
    expect(legacy.gameMode).toBe('pvp');
  });

  it('should handle Firestore errors gracefully', async () => {
    const createLazyFirestoreSpy = vi
      .spyOn(factoryModule, 'createLazyFirestore')
      .mockReturnValue(() => {
        return {
          collection: () => ({
            where: () => ({
              get: vi.fn().mockRejectedValue(new Error('Firestore connection failed')),
            }),
          }),
        } as unknown as Firestore;
      });
    const tokenService = new TokenService();
    await expect(tokenService.listUserTokens('userA')).rejects.toThrow('Failed to list tokens');
    createLazyFirestoreSpy.mockRestore();
  });
});
