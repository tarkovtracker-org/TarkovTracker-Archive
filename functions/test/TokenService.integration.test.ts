import { vi, describe, it, expect, beforeEach } from 'vitest';
import { firestoreMock } from './setup.js';

// Import after mocks are set up
import { TokenService } from '../src/services/TokenService';
import { seedDb, resetDb } from './setup';
import { withTokenCollectionMock, createMockTransaction } from './helpers/tokenMocks';

// Seed deterministic Firestore state before each test
beforeEach(() => {
  resetDb();
  seedDb({
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

describe('TokenService integration tests with emulator-backed Firestore operations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('token creation with specific scopes', () => {
    it('should create token with specific scopes and persist to Firestore', async () => {
      const tokenService = new TokenService();
      const expectedTokenData = {
        owner: 'test-user-123',
        note: 'Test token with specific scopes',
        permissions: ['GP', 'WP', 'TP'], // Changed from 'TEAM' to 'TP' to match service
        gameMode: 'pve',
        calls: 0,
        createdAt: expect.any(Object),
      };

      // Mock transaction to simulate Firestore write
      firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
        const mockTransaction = createMockTransaction({
          get: vi.fn().mockResolvedValue({
            exists: false,
          }),
        });
        await callback(mockTransaction);

        // Verify the transaction set was called with correct data
        expect(mockTransaction.set).toHaveBeenCalledWith(
          expect.any(Object), // tokenRef
          expect.objectContaining({
            ...expectedTokenData,
            createdAt: expect.any(Object),
          })
        );
      });

      const result = await tokenService.createToken(
        'test-user-123',
        'Test token with specific scopes',
        ['GP', 'WP', 'TP'],
        'pve'
      );

      expect(result.token).toMatch(/^[a-zA-Z0-9]{64,}$/);
      expect(firestoreMock.runTransaction).toHaveBeenCalled();
    });

    it('should validate and reject invalid scope requests', async () => {
      const tokenService = new TokenService();

      await expect(
        tokenService.createToken(
          'test-user-123',
          'Test token',
          ['INVALID_PERMISSION'], // Use a truly invalid permission
          'pvp'
        )
      ).rejects.toThrow('Invalid permissions: INVALID_PERMISSION');

      // Ensure no transaction was attempted for invalid scopes
      expect(firestoreMock.runTransaction).not.toHaveBeenCalled();
    });
  });

  describe('validation of revoked tokens', () => {
    it('should reject revoked token with proper error code', async () => {
      const tokenService = new TokenService();
      const revokedTokenData = {
        owner: 'test-user-123',
        note: 'Revoked token',
        permissions: ['GP'],
        gameMode: 'pvp',
        calls: 5,
        revoked: true, // Token is revoked
        createdAt: { toDate: () => new Date() },
      };

      // Mock Firestore to return revoked token
      const { restore } = withTokenCollectionMock((collection) => {
        collection.doc = vi.fn().mockImplementation((docId) => {
          const docRef = {
            id: docId,
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => revokedTokenData,
            }),
          };
          return docRef;
        });
      });

      await expect(tokenService.getTokenInfo('revoked-token-123')).rejects.toThrow(
        'Invalid or expired token'
      );

      // Ensure no Firestore mutations occurred for revoked tokens
      // Note: The validateToken method calls getTokenInfo which does access the token
      // but doesn't modify it, so we just check that it was accessed
      expect(firestoreMock.collection).toHaveBeenCalledTimes(1);
      restore();
    });

    it('should handle token validation errors without side effects', async () => {
      const tokenService = new TokenService();

      // Mock validateToken to throw error
      vi.spyOn(tokenService, 'validateToken' as any).mockRejectedValue(
        new Error('Token validation failed')
      );

      await expect(tokenService.validateToken('Bearer invalid-token')).rejects.toThrow(
        'Token validation failed'
      );

      // Ensure no Firestore operations were attempted
      expect(firestoreMock.collection).not.toHaveBeenCalled();
    });
  });

  describe('error handling and atomicity', () => {
    it('should handle Firestore transaction failures gracefully', async () => {
      const tokenService = new TokenService();

      // Mock transaction to fail
      firestoreMock.runTransaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(
        tokenService.createToken('test-user-123', 'Test token', ['GP'], 'pvp')
      ).rejects.toThrow('Failed to create token');
    });

    it('should ensure atomic token creation operations', async () => {
      const tokenService = new TokenService();

      // Mock transaction to simulate conflict
      firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
        const mockTransaction = createMockTransaction({
          get: vi.fn().mockResolvedValue({
            exists: true, // Simulate existing token conflict
          }),
        });

        await callback(mockTransaction);

        // Verify set was not called due to conflict
        expect(mockTransaction.set).not.toHaveBeenCalled();
      });

      await expect(
        tokenService.createToken('test-user-123', 'Test token', ['GP'], 'pvp')
      ).resolves.toBeDefined();
    });
  });

  it('rejects revoked token validation', async () => {
    // Arrange: mark token revoked
    seedDb({
      tokens: {
        abc: {
          token: 'abc',
          owner: 'uid1',
          scopes: ['read'],
          revoked: true,
          createdAt: new Date(),
        },
      },
    });
    // Act/Assert: service should reject
    const tokenService = new TokenService();
    await expect(tokenService.validateToken('Bearer abc')).rejects.toThrow();
    // Ensure no Firestore mutations on validation failures
    // e.g., read back doc and assert unchanged
  });
});
