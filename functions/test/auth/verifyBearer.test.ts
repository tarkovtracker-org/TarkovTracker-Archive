import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { verifyBearer } from '../../src/auth/verifyBearer';
import { createTestSuite, firestore } from '../helpers';

// Mock logger from firebase-functions since we don't need to test it
vi.mock('firebase-functions/v2', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
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
    await db.collection('tokens').doc('valid-token').set(tokenData);

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

  it('should handle token data being undefined', async () => {
    // Create a token document with no data
    const db = firestore();
    await db.collection('tokens').doc('undefined-token').create({});

    // Mock get method to return exists: true but data: undefined
    const originalDocGet = db.collection('tokens').doc().get;
    db.collection('tokens').doc('undefined-token').get = vi.fn().mockResolvedValue({
      exists: true,
      data: () => undefined,
    });

    // Act
    mockReq.get.mockReturnValue('Bearer undefined-token');
    await verifyBearer(mockReq, mockRes, mockNext);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Internal server error reading token data.',
    });
    expect(mockNext).not.toHaveBeenCalled();

    // Cleanup
    db.collection('tokens').doc('undefined-token').get = originalDocGet;
  });

  it('should handle Firestore errors gracefully', async () => {
    // Mock get method to throw an error
    const db = firestore();
    const originalDocGet = db.collection('tokens').doc().get;
    db.collection('tokens').doc('error-token').get = vi
      .fn()
      .mockRejectedValue(new Error('Firestore error'));

    // Act
    mockReq.get.mockReturnValue('Bearer error-token');
    await verifyBearer(mockReq, mockRes, mockNext);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Internal server error during authentication.',
    });
    expect(mockNext).not.toHaveBeenCalled();

    // Cleanup
    db.collection('tokens').doc('error-token').get = originalDocGet;
  });
});
