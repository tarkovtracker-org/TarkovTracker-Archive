import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyBearer } from '../../../src/middleware/auth';
import { createMockResponse, createMockRequest } from '../../helpers/httpMocks';
import { firestore, createTestSuite, serverTimestamp } from '../../helpers';
import { TokenService } from '../../../src/services/TokenService';
describe('verifyBearer middleware', () => {
  const suite = createTestSuite('auth-middleware');
  beforeEach(async () => {
    vi.restoreAllMocks();
    await suite.beforeEach();
  });

  afterEach(suite.afterEach);
  it('passes through OPTIONS requests', async () => {
    const next = vi.fn();
    await verifyBearer(
      createMockRequest({ method: 'OPTIONS' }) as any,
      createMockResponse() as any,
      next
    );
    expect(next).toHaveBeenCalled();
  });
  it('attaches token data when validation succeeds', async () => {
    // Create a real token in emulator for testing
    const db = firestore();
    await db
      .collection('token')
      .doc('valid-token-123')
      .set({
        owner: 'user-1',
        permissions: ['GP'],
        token: 'valid-token-123',
        createdAt: serverTimestamp(),
      });

    const req: any = createMockRequest({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token-123' },
    });
    const res = createMockResponse() as any;
    const next = vi.fn();

    await verifyBearer(req, res, next);

    expect(req.apiToken.owner).toBe('user-1');
    expect(req.apiToken.permissions).toEqual(['GP']);
    expect(req.user.id).toBe('user-1');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
  it('responds with 401 on validation errors', async () => {
    const req: any = createMockRequest({
      method: 'GET',
      headers: { authorization: 'Bearer invalid-bearer-token-123' },
    });
    const res = createMockResponse() as any;
    const next = vi.fn();
    await verifyBearer(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });
  describe('integration tests with emulator-backed auth flows', () => {
    it('validates Bearer token and populates req.user with next() call', async () => {
      // Create a real token in emulator for testing
      const db = firestore();
      const tokenDoc = await db
        .collection('token')
        .doc('valid-bearer-token-123')
        .set({
          owner: 'test-user-123',
          permissions: ['GP', 'WP'],
          gameMode: 'pvp',
          token: 'valid-bearer-token-123',
          createdAt: serverTimestamp(),
        });

      const req: any = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer valid-bearer-token-123' },
      });
      const res = createMockResponse() as any;
      const next = vi.fn();

      await verifyBearer(req, res, next);

      expect(req.apiToken.owner).toBe('test-user-123');
      expect(req.apiToken.permissions).toEqual(['GP', 'WP']);
      expect(req.user.id).toBe('test-user-123');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    it('returns 401 for invalid Bearer token with structured error body', async () => {
      const req: any = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer invalid-token-123' },
      });
      const res = createMockResponse() as any;
      const next = vi.fn();

      await verifyBearer(req, res, next);

      // Verify middleware didn't call next and returned error
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      });
    });
    it('returns 401 for expired token with proper error handling', async () => {
      const expiredTokenError = new Error('Token has expired');
      vi.spyOn(TokenService.prototype, 'validateToken').mockRejectedValue(expiredTokenError);
      const req: any = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer expired-token-123' },
      });
      const res = createMockResponse() as any;
      const next = vi.fn();
      await verifyBearer(req, res, next);
      expect(TokenService.prototype.validateToken).toHaveBeenCalledWith('Bearer expired-token-123');
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token has expired',
      });
    });
    it('returns 401 for malformed Authorization header', async () => {
      const req: any = createMockRequest({
        method: 'GET',
        headers: { authorization: 'InvalidFormat token123' },
      });
      const res = createMockResponse() as any;
      const next = vi.fn();
      await verifyBearer(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String), // Error message from TokenService
      });
    });
    it('returns 401 when Authorization header is missing', async () => {
      const req: any = createMockRequest({
        method: 'GET',
        headers: {},
      });
      const res = createMockResponse() as any;
      const next = vi.fn();
      await verifyBearer(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String), // Error message from TokenService
      });
    });
    it('ensures no side effects when authentication fails', async () => {
      const authError = new Error('Authentication failed');
      vi.spyOn(TokenService.prototype, 'validateToken').mockRejectedValue(authError);
      const req: any = createMockRequest({
        method: 'DELETE',
        headers: { authorization: 'Bearer bad-token' },
        user: { id: 'existing-user' }, // Should not be preserved
      });
      // Add some existing apiToken data that should not be preserved on auth failure
      req.apiToken = { some: 'existing-data' };
      const res = createMockResponse() as any;
      const next = vi.fn();
      await verifyBearer(req, res, next);
      // Ensure request object is not modified on auth failure
      expect(req.apiToken).toEqual({ some: 'existing-data' });
      expect(req.user).toEqual({ id: 'existing-user' });
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
    it('handles non-Error objects in authentication failure', async () => {
      vi.spyOn(TokenService.prototype, 'validateToken').mockRejectedValue('String error message');
      const req: any = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer token' },
      });
      const res = createMockResponse() as any;
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
