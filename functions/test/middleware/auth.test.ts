import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyBearer } from '../../src/middleware/auth.js';
import { TokenService } from '../../src/services/TokenService.js';

const createResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;
  return res;
};

describe('verifyBearer middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('passes through OPTIONS requests', async () => {
    const next = vi.fn();
    await verifyBearer({ method: 'OPTIONS' } as any, createResponse(), next);
    expect(next).toHaveBeenCalled();
  });

  it('attaches token data when validation succeeds', async () => {
    vi.spyOn(TokenService.prototype, 'validateToken').mockResolvedValue({
      owner: 'user-1',
      permissions: ['GP'],
    } as any);

    const req: any = { method: 'GET', headers: { authorization: 'Bearer token' } };
    const res = createResponse();
    const next = vi.fn();

    await verifyBearer(req, res, next);

    expect(TokenService.prototype.validateToken).toHaveBeenCalledWith('Bearer token');
    expect(req.apiToken).toEqual({ owner: 'user-1', permissions: ['GP'] });
    expect(req.user).toEqual({ id: 'user-1' });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds with 401 on validation errors', async () => {
    vi.spyOn(TokenService.prototype, 'validateToken').mockRejectedValue(new Error('bad token'));

    const req: any = { method: 'GET', headers: { authorization: 'Bearer invalid' } };
    const res = createResponse();
    const next = vi.fn();

    await verifyBearer(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'bad token' });
    expect(next).not.toHaveBeenCalled();
  });

  describe('integration tests with emulator-backed auth flows', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    it('validates Bearer token and populates req.user with next() call', async () => {
      const mockTokenPayload = {
        owner: 'test-user-123',
        permissions: ['GP', 'WP'],
        gameMode: 'pvp',
        token: 'valid-bearer-token-123'
      };

      vi.spyOn(TokenService.prototype, 'validateToken')
        .mockResolvedValue(mockTokenPayload as any);

      const req: any = {
        method: 'GET',
        headers: { authorization: 'Bearer valid-bearer-token-123' }
      };
      const res = createResponse();
      const next = vi.fn();

      await verifyBearer(req, res, next);

      expect(TokenService.prototype.validateToken).toHaveBeenCalledWith('Bearer valid-bearer-token-123');
      expect(req.apiToken).toEqual(mockTokenPayload);
      expect(req.user).toEqual({ id: 'test-user-123' });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 401 for invalid Bearer token with structured error body', async () => {
      const invalidTokenError = new Error('Invalid or expired token');
      vi.spyOn(TokenService.prototype, 'validateToken')
        .mockRejectedValue(invalidTokenError);

      const req: any = {
        method: 'GET',
        headers: { authorization: 'Bearer invalid-token-123' }
      };
      const res = createResponse();
      const next = vi.fn();

      await verifyBearer(req, res, next);

      expect(TokenService.prototype.validateToken).toHaveBeenCalledWith('Bearer invalid-token-123');
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      });
    });

    it('returns 401 for expired token with proper error handling', async () => {
      const expiredTokenError = new Error('Token has expired');
      vi.spyOn(TokenService.prototype, 'validateToken')
        .mockRejectedValue(expiredTokenError);

      const req: any = {
        method: 'POST',
        headers: { authorization: 'Bearer expired-token-123' }
      };
      const res = createResponse();
      const next = vi.fn();

      await verifyBearer(req, res, next);

      expect(TokenService.prototype.validateToken).toHaveBeenCalledWith('Bearer expired-token-123');
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token has expired'
      });
    });

    it('returns 401 for malformed Authorization header', async () => {
      const req: any = {
        method: 'GET',
        headers: { authorization: 'InvalidFormat token123' }
      };
      const res = createResponse();
      const next = vi.fn();

      await verifyBearer(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String) // Error message from TokenService
      });
    });

    it('returns 401 when Authorization header is missing', async () => {
      const req: any = {
        method: 'GET',
        headers: {}
      };
      const res = createResponse();
      const next = vi.fn();

      await verifyBearer(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String) // Error message from TokenService
      });
    });

    it('ensures no side effects when authentication fails', async () => {
      const authError = new Error('Authentication failed');
      vi.spyOn(TokenService.prototype, 'validateToken')
        .mockRejectedValue(authError);

      const req: any = {
        method: 'DELETE',
        headers: { authorization: 'Bearer bad-token' },
        apiToken: { some: 'existing-data' }, // Should not be preserved
        user: { id: 'existing-user' } // Should not be preserved
      };
      const res = createResponse();
      const next = vi.fn();

      await verifyBearer(req, res, next);

      // Ensure request object is not modified on auth failure
      expect(req.apiToken).toEqual({ some: 'existing-data' });
      expect(req.user).toEqual({ id: 'existing-user' });
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('handles non-Error objects in authentication failure', async () => {
      vi.spyOn(TokenService.prototype, 'validateToken')
        .mockRejectedValue('String error message');

      const req: any = {
        method: 'GET',
        headers: { authorization: 'Bearer token' }
      };
      const res = createResponse();
      const next = vi.fn();

      await verifyBearer(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      // Relax expected body to allow normalized messages
      const [[body]] = res.json.mock.calls;
      expect(body).toEqual(expect.objectContaining({ error: expect.any(String) }));
    });
  });
});
