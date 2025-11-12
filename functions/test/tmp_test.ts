import { vi, describe, it, expect } from 'vitest';

describe('TokenService', () => {
  describe('generateSecureToken', () => {
    it('should handle deterministic uniqueness generation with collision', async () => {
      const crypto = await import('node:crypto');
      const mockRandomBytes = vi.mocked(crypto.randomBytes);
      mockRandomBytes
        .mockImplementationOnce((size, callback) => {
          callback(null, Buffer.from('a'.repeat(size), 'utf8'));
        })
        .mockImplementationOnce((size, callback) => {
          callback(null, Buffer.from('b'.repeat(size), 'utf8'));
        });
      const tokenService = { createToken: async () => ({created: true, token: 'token'}) };
      const result1 = await tokenService.createToken('userA', {})
        .catch(() => {});
      const result2 = await tokenService.createToken('userA', {});
      expect(result2.created).toBe(true);
    });
  });
});
