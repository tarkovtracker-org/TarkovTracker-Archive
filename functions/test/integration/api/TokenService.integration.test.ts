import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { admin, createTestSuite } from './helpers';
import { TokenService } from '../../../src/services/TokenService';

const DEFAULT_SEED = {
  token: {
    tokenA: {
      owner: 'userA',
      note: 'Test token A',
      permissions: ['GP'],
      gameMode: 'pvp',
      calls: 5,
      createdAt: new Date(),
    },
    tokenB: {
      owner: 'userA',
      note: 'Test token B',
      permissions: ['GP', 'WP'],
      gameMode: 'pvp',
      calls: 10,
      createdAt: new Date(),
    },
    tokenC: {
      owner: 'userB',
      note: 'Test token C',
      permissions: ['TP'],
      gameMode: 'pve',
      calls: 3,
      createdAt: new Date(),
    },
  },
  users: {
    userA: { uid: 'userA' },
    userB: { uid: 'userB' },
  },
};

describe('TokenService integration tests with emulator-backed Firestore operations', () => {
  const suite = createTestSuite('TokenService-integration');

  beforeEach(async () => {
    await suite.beforeEach();
    await suite.withDatabase(DEFAULT_SEED);
    vi.clearAllMocks();
  });

  afterEach(suite.afterEach);

  describe('token creation with specific scopes', () => {
    it('creates token with specific scopes and persists to Firestore', async () => {
      const tokenService = new TokenService();

      const result = await tokenService.createToken(
        'test-user-123',
        {
          note: 'Test token with specific scopes',
          permissions: ['GP', 'WP', 'TP'],
          gameMode: 'pve',
        }
      );

      expect(result.token).toMatch(/^[a-zA-Z0-9-_]{10,}$/);
      expect(result.owner).toBe('test-user-123');
      expect(result.permissions).toEqual(['GP', 'WP', 'TP']);

      const stored = await admin.firestore().collection('token').doc(result.token).get();
      expect(stored.exists).toBe(true);
      expect(stored.data()).toEqual(
        expect.objectContaining({
          owner: 'test-user-123',
          note: 'Test token with specific scopes',
          permissions: ['GP', 'WP', 'TP'],
          gameMode: 'pve',
          calls: 0,
        })
      );
    });

    it('rejects invalid permission requests before hitting Firestore', async () => {
      const tokenService = new TokenService();

      await expect(
        tokenService.createToken('test-user-123', {
          note: 'Test token',
          permissions: ['INVALID_PERMISSION'],
          gameMode: 'pvp',
        })
      ).rejects.toThrow('Invalid permissions: INVALID_PERMISSION');
    });
  });

  describe('validation of revoked tokens', () => {
    it('rejects revoked token with proper error code', async () => {
      await suite.withDatabase({
        token: {
          'revoked-token-123': {
            owner: 'test-user-123',
            note: 'Revoked token',
            permissions: ['GP'],
            gameMode: 'pvp',
            calls: 5,
            revoked: true,
            createdAt: new Date(),
          },
        },
      });

      const tokenService = new TokenService();
      await expect(tokenService.getTokenInfo('revoked-token-123')).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('rejects revoked token validation through validateToken()', async () => {
      await suite.withDatabase({
        token: {
          abc: {
            owner: 'uid1',
            permissions: ['GP'],
            revoked: true,
            note: 'token1',
            gameMode: 'pvp',
            createdAt: new Date(),
          },
        },
      });

      const tokenService = new TokenService();
      await expect(tokenService.validateToken('Bearer abc')).rejects.toThrow(
        'Invalid or expired token'
      );
    });
  });

  describe('error handling and atomicity', () => {
    it('propagates Firestore transaction failures', async () => {
      const db = admin.firestore();
      const runTransactionSpy = vi
        .spyOn(db, 'runTransaction')
        .mockRejectedValue(new Error('Transaction failed'));

      const tokenService = new TokenService();
      await expect(
        tokenService.createToken('test-user-123', {
          note: 'Test token',
          permissions: ['GP'],
          gameMode: 'pvp',
        })
      ).rejects.toThrow('Failed to create token');

      runTransactionSpy.mockRestore();
    });

    it('ensures atomic token creation operations when collisions occur', async () => {
      const collisionId = 'collision-token';
      await suite.withDatabase({
        token: {
          [collisionId]: {
            owner: 'existing-user',
            permissions: ['GP'],
            note: 'Existing token',
            gameMode: 'pvp',
            createdAt: new Date(),
          },
        },
      });
      const secureTokenSpy = vi
        .spyOn(TokenService.prototype as any, 'generateSecureToken')
        .mockReturnValue(collisionId);

      const tokenService = new TokenService();
      await expect(
        tokenService.createToken('test-user-123', {
          note: 'Test token',
          permissions: ['GP'],
          gameMode: 'pvp',
        })
      ).rejects.toThrow('Failed to create token');

      secureTokenSpy.mockRestore();
    });
  });
});
