import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockRequest, createMockResponse } from '../../helpers/httpMocks';
import { createTestSuite, auth, admin } from '../../helpers';
import { createHandlerTest } from '../../helpers/testPatterns';

// Mock logger since we don't need to test Firebase Functions logging
vi.mock('firebase-functions/v2', () => ({
  logger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock corsConfig at module level
const setCorsHeadersMock = vi.fn();
vi.mock('../../src/config/corsConfig', () => ({
  setCorsHeaders: setCorsHeadersMock,
}));

describe('withCorsAndAuth middleware', () => {
  const suite = createTestSuite('onRequestAuth-middleware');
  beforeEach(async () => {
    // Reset Firebase emulators before each test
    await suite.beforeEach();
    vi.clearAllMocks();
  });

  afterEach(suite.afterEach);

  it('denies disallowed origin with 403', async () => {
    setCorsHeadersMock.mockReturnValue(false);
    
    const { withCorsAndAuth } = await import('../../src/middleware/onRequestAuth');
    
    const req: any = createMockRequest({
      method: 'GET',
      headers: { origin: 'http://evil.example' },
    });
    const res = createMockResponse();
    const handler = vi.fn();
    
    await withCorsAndAuth(req, res as any, handler);
    
    expect(setCorsHeadersMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('handles OPTIONS preflight with 200', async () => {
    setCorsHeadersMock.mockReturnValue(true);
    
    const { withCorsAndAuth } = await import('../../src/middleware/onRequestAuth');
    const req: any = createMockRequest({
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:5173' },
    });
    const res = createMockResponse();
    const handler = vi.fn();
    
    await withCorsAndAuth(req, res as any, handler);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is missing or invalid', async () => {
    setCorsHeadersMock.mockReturnValue(true);
    
    const { withCorsAndAuth } = await import('../../src/middleware/onRequestAuth');
    const req: any = createMockRequest({ method: 'GET', headers: {} });
    const res = createMockResponse();
    const handler = vi.fn();
    
    await withCorsAndAuth(req, res as any, handler);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: expect.any(String) });
    expect(handler).not.toHaveBeenCalled();
  });

  it('verifies token and calls handler with uid', async () => {
    setCorsHeadersMock.mockReturnValue(true);
    
    const { withCorsAndAuth } = await import('../../src/middleware/onRequestAuth');
    
    // Mock the verification to return expected UID
    // This simulates what Firebase Auth would do with a real token
    const testUid = 'user-123';
    const originalVerify = admin.auth().verifyIdToken;
    (admin.auth() as any).verifyIdToken = vi.fn().mockResolvedValue({ uid: testUid });
    
    const req: any = createMockRequest({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
    });
    const res = createMockResponse();
    const handler = vi.fn(async (_req, _res, uid: string) => {
      expect(uid).toBe(testUid);
    });
    
    try {
      await withCorsAndAuth(req, res as any, handler);
      
      expect(handler).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    } finally {
      // Always restore the original method
      (admin.auth() as any).verifyIdToken = originalVerify;
    }
  });

  it('returns 401 on Firebase token verification error', async () => {
    setCorsHeadersMock.mockReturnValue(true);
    
    const { withCorsAndAuth } = await import('../../src/middleware/onRequestAuth');
    
    // Use an invalid/malformed token - real Firebase Auth will reject it
    const req: any = createMockRequest({ 
      method: 'GET', 
      headers: { authorization: 'Bearer invalid-token-12345' } 
    });
    const res = createMockResponse();
    const handler = vi.fn();
    
    await withCorsAndAuth(req, res as any, handler);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('Firebase ID token') });
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 500 on unexpected errors', async () => {
    setCorsHeadersMock.mockReturnValue(true);
    
    // Mock admin.auth to throw an unexpected error
    const originalVerify = admin.auth().verifyIdToken;
    const mockVerifyIdToken = vi.fn().mockImplementation(() => {
      throw new Error('Unknown failure');
    });
    
    // Temporarily replace the method
    (admin.auth() as any).verifyIdToken = mockVerifyIdToken;
    
    const { withCorsAndAuth } = await import('../../src/middleware/onRequestAuth');
    
    const req: any = createMockRequest({
      method: 'GET',
      headers: { authorization: 'Bearer token' },
    });
    const res = createMockResponse();
    const handler = vi.fn();
    
    await withCorsAndAuth(req, res as any, handler);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: expect.any(String) });
    expect(handler).not.toHaveBeenCalled();
    
    // Restore original method
    (admin.auth() as any).verifyIdToken = originalVerify;
  });
});
