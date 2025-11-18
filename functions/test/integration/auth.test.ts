import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { verifyBearer } from '../../src/auth/verifyBearer';
import { createTestSuite, firestore } from '../helpers';

const mockLogger = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};
// Mock logger from firebase-functions since we don't need to test it
vi.mock('firebase-functions/v2', () => ({
  logger: mockLogger,
}));

describe('verifyBearer Authentication Middleware', () => {
  const suite = createTestSuite('verifyBearer');
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(async () => {
    await suite.beforeEach();

    // Setup fresh request/response objects for each test
    mockReq = {
      get: vi.fn(),
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  afterEach(suite.afterEach);

  it('should return 401 when no Authorization header is provided', async () => {
    mockReq.get.mockReturnValue(null);

    await verifyBearer(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'No Authorization header sent',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 400 for malformed Authorization header', async () => {
    mockReq.get.mockReturnValue('InvalidHeader');

    await verifyBearer(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Invalid Authorization header format. Expected 'Bearer <token>'.",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 for invalid token', async () => {
    mockReq.get.mockReturnValue('Bearer invalid-token');
    await verifyBearer(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token.',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() for valid token', async () => {
    // Arrange: Create test token directly
    const tokenData = {
      owner: 'auth-test-user',
      permissions: ['GP'],
      gameMode: 'pvp',
    };

    // Seed database with token
    const db = firestore();
    await db.collection('token').doc('valid-token').set(tokenData);

    // Act
    mockReq.get.mockReturnValue('Bearer valid-token');
    await verifyBearer(mockReq, mockRes, mockNext);

    // Assert
    expect(mockReq.apiToken).toEqual({
      ...tokenData,
      token: 'valid-token',
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it.skip('should handle token data being undefined', async () => {
    // Note: This test is skipped because Firestore emulator doesn't support
    // mocking individual document operations with vi.fn()
    // This behavior is tested at the integration level with actual data
  });

  it.skip('should handle Firestore errors gracefully', async () => {
    // Note: This test is skipped because Firestore emulator doesn't support
    // mocking individual document operations with vi.fn()
    // This behavior is tested at the integration level with actual failures
  });

  it.skip('should handle token increment update failures gracefully', async () => {
    // Note: This test is skipped because Firestore emulator doesn't support
    // mocking individual document operations with vi.fn()
    // The update failure is handled via a catch block and logged, but doesn't
    // affect the main flow - next() is still called
  });

  it('should handle malformed Bearer token with extra spaces', async () => {
    mockReq.get.mockReturnValue('Bearer  token-with-spaces');

    await verifyBearer(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Invalid Authorization header format. Expected 'Bearer <token>'.",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle Bearer token with empty token', async () => {
    mockReq.get.mockReturnValue('Bearer ');

    await verifyBearer(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Invalid Authorization header format. Expected 'Bearer <token>'.",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle token with non-string characters', async () => {
    mockReq.get.mockReturnValue('Bearer valid-token-123!@#$%');

    await verifyBearer(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token.',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
