import { describe, it, expect } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';

// Mock types for testing
interface MockCallableRequest {
  auth: { uid: string } | null;
  data: {
    note?: string;
    permissions?: string[];
    gameMode?: unknown;
  };
}

// Simple validation function to test the gameMode validation logic
function validateGameMode(gameMode: unknown): void {
  if (gameMode === undefined || gameMode === null) {
    return; // Allow undefined/null (will default to 'pvp')
  }

  const validGameModes = ['pvp', 'pve', 'dual'] as const;
  const validGameModeSet = new Set(validGameModes);
  if (typeof gameMode !== 'string' || !validGameModeSet.has(gameMode)) {
    throw new HttpsError(
      'invalid-argument',
      `Invalid gameMode: must be one of ${validGameModes.join(', ')}.`
    );
  }
}

function validateTokenRequest(request: MockCallableRequest): void {
  // Check authentication
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  // Check required fields
  if (
    request.data.note == null ||
    !request.data.permissions ||
    !(request.data.permissions.length > 0)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid token parameters: note and permissions array are required.'
    );
  }

  // Validate gameMode
  validateGameMode(request.data.gameMode);
}

describe('Token Creation - gameMode Validation', () => {
  describe('gameMode validation', () => {
    it('should accept valid gameMode values', () => {
      const validGameModes = ['pvp', 'pve', 'dual'];

      for (const gameMode of validGameModes) {
        expect(() => validateGameMode(gameMode)).not.toThrow();
      }
    });

    it('should reject invalid gameMode values', () => {
      const invalidGameModes = ['invalid', 'test', 'wrong', '', 123, [], {}];

      for (const gameMode of invalidGameModes) {
        expect(() => validateGameMode(gameMode)).toThrow(HttpsError);
        
        try {
          validateGameMode(gameMode);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpsError);
          expect((error as HttpsError).code).toBe('invalid-argument');
          expect((error as HttpsError).message).toContain('Invalid gameMode');
        }
      }
    });

    it('should allow undefined and null gameMode values', () => {
      expect(() => validateGameMode(undefined)).not.toThrow();
      expect(() => validateGameMode(null)).not.toThrow();
    });
  });

  describe('full request validation', () => {
    it('should validate complete valid requests', () => {
      const validRequest: MockCallableRequest = {
        auth: { uid: 'test-user-123' },
        data: {
          note: 'Test token',
          permissions: ['read:progress'],
          gameMode: 'pvp',
        },
      };

      expect(() => validateTokenRequest(validRequest)).not.toThrow();
    });

    it('should require authentication', () => {
      const invalidRequest: MockCallableRequest = {
        auth: null,
        data: {
          note: 'Test token',
          permissions: ['read:progress'],
          gameMode: 'pvp',
        },
      };

      expect(() => validateTokenRequest(invalidRequest)).toThrow(HttpsError);
      
      try {
        validateTokenRequest(invalidRequest);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe('unauthenticated');
      }
    });

    it('should require note and permissions', () => {
      const invalidRequest: MockCallableRequest = {
        auth: { uid: 'test-user-123' },
        data: {
          gameMode: 'pvp',
        },
      };

      expect(() => validateTokenRequest(invalidRequest)).toThrow(HttpsError);
      
      try {
        validateTokenRequest(invalidRequest);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe('invalid-argument');
        expect((error as HttpsError).message).toContain('note and permissions array are required');
      }
    });

    it('should reject invalid gameMode in full request', () => {
      const invalidRequest: MockCallableRequest = {
        auth: { uid: 'test-user-123' },
        data: {
          note: 'Test token',
          permissions: ['read:progress'],
          gameMode: 'invalid-mode',
        },
      };

      expect(() => validateTokenRequest(invalidRequest)).toThrow(HttpsError);
      
      try {
        validateTokenRequest(invalidRequest);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe('invalid-argument');
        expect((error as HttpsError).message).toContain('Invalid gameMode');
      }
    });

    it('should accept request without gameMode (defaults to pvp)', () => {
      const validRequest: MockCallableRequest = {
        auth: { uid: 'test-user-123' },
        data: {
          note: 'Test token',
          permissions: ['read:progress'],
          // No gameMode provided
        },
      };

      expect(() => validateTokenRequest(validRequest)).not.toThrow();
    });
  });
});
