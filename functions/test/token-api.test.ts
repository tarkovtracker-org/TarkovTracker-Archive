import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedDb, resetDb, firestore, admin } from './helpers/emulatorSetup';
import { _createTokenLogic } from '../src/token/create';
import { revokeTokenHandler } from '../src/token/revoke';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';

// Define the CreateTokenData interface locally since it's not exported
interface CreateTokenData {
  note: string;
  permissions: string[];
  gameMode?: 'pvp' | 'pve' | 'dual';
}

describe('Token API', () => {
  beforeEach(async () => {
    await resetDb();
    // Seed test data
    await seedDb({
      users: {
        userA: { uid: 'userA', email: 'u@example.com', active: true },
      },
      system: {},
      token: {},
    });
  });

  describe('Token Creation', () => {
    it('should create a token with valid inputs', async () => {
      const data: CreateTokenData = {
        note: 'Test API Token',
        permissions: ['read', 'write'],
      };
      const context: CallableRequest<CreateTokenData> = {
        auth: { uid: 'userA' } as any,
        data,
        rawRequest: null as any,
        acceptsStreaming: false,
      };

      const result = await _createTokenLogic(context);

      expect(result).toHaveProperty('token');
      expect(typeof result.token).toBe('string');

      // Verify token was created in Firestore
      const db = firestore();
      const tokenDoc = await db.collection('token').doc(result.token).get();
      expect(tokenDoc.exists).toBe(true);
      expect(tokenDoc.data()?.note).toBe(data.note);
      expect(tokenDoc.data()?.permissions).toEqual(data.permissions);
      expect(tokenDoc.data()?.owner).toBe('userA');

      // Verify token was added to user's system document
      const systemDoc = await db.collection('system').doc('userA').get();
      expect(systemDoc.exists).toBe(true);
      expect(systemDoc.data()?.tokens).toContain(result.token);
    });

    it('should reject creation without authentication', async () => {
      const data: CreateTokenData = {
        note: 'Test API Token',
        permissions: ['read'],
      };
      const context: CallableRequest<CreateTokenData> = {
        auth: undefined,
        data,
        rawRequest: null as any,
        acceptsStreaming: false,
      };

      await expect(_createTokenLogic(context)).rejects.toThrow(HttpsError);
      await expect(_createTokenLogic(context)).rejects.toThrow('authenticated');
    });

    it('should reject creation with invalid parameters', async () => {
      const baseContext: CallableRequest<CreateTokenData> = {
        auth: { uid: 'userA' } as any,
        rawRequest: null as any,
        acceptsStreaming: false,
        data: { note: '', permissions: [] },
      };

      // Test missing note
      await expect(
        _createTokenLogic({
          ...baseContext,
          data: { permissions: ['read'] } as CreateTokenData,
        })
      ).rejects.toThrow(HttpsError);

      // Test missing permissions
      await expect(
        _createTokenLogic({
          ...baseContext,
          data: { note: 'test' } as CreateTokenData,
        })
      ).rejects.toThrow(HttpsError);

      // Test empty permissions array
      await expect(
        _createTokenLogic({
          ...baseContext,
          data: { note: 'test', permissions: [] },
        })
      ).rejects.toThrow(HttpsError);
    });

    it('should enforce maximum token limit', async () => {
      const data: CreateTokenData = {
        note: 'Test API Token',
        permissions: ['read'],
      };
      const context: CallableRequest<CreateTokenData> = {
        auth: { uid: 'userA' } as any,
        data,
        rawRequest: null as any,
        acceptsStreaming: false,
      };

      // Create system document with 5 tokens (max limit)
      const db = firestore();
      await db
        .collection('system')
        .doc('userA')
        .set({
          tokens: ['token1', 'token2', 'token3', 'token4', 'token5'],
        });

      await expect(_createTokenLogic(context)).rejects.toThrow(HttpsError);
      await expect(_createTokenLogic(context)).rejects.toThrow('maximum number of tokens');
    });
  });

  describe('Token Revocation', () => {
    it('should revoke existing token', async () => {
      // First create a token
      const createData: CreateTokenData = {
        note: 'Test API Token',
        permissions: ['read'],
      };
      const mockAuth = { uid: 'userA' };
      const createContext: CallableRequest<CreateTokenData> = {
        auth: mockAuth as any,
        data: createData,
        rawRequest: null as any,
        acceptsStreaming: false,
      };
      const createResult = await _createTokenLogic(createContext);
      const tokenId = createResult.token;

      // Mock the auth verification for the revoke handler
      const originalVerifyIdToken = admin.auth().verifyIdToken;
      admin.auth().verifyIdToken = vi.fn().mockResolvedValue(mockAuth);

      // Now revoke it using mock request/response
      const mockReq = {
        method: 'POST',
        body: { data: { token: tokenId } },
        headers: { authorization: 'Bearer test-token' },
        get: (header: string) => (header === 'authorization' ? 'Bearer test-token' : undefined),
      };
      let statusCode: number = 0;
      let responseData: any;
      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (data: any) => {
          responseData = data;
          return mockRes;
        },
        set: (_header: string, _value: string) => {
          return mockRes;
        },
        end: () => {},
        headersSent: false,
      };

      await revokeTokenHandler(mockReq as any, mockRes as any);

      // Restore original auth function
      admin.auth().verifyIdToken = originalVerifyIdToken;

      // Verify the response
      expect(statusCode).toBe(200);
      expect(responseData.revoked).toBe(true);

      // Verify token was deleted from Firestore
      const db = firestore();
      const tokenDoc = await db.collection('token').doc(tokenId).get();
      expect(tokenDoc.exists).toBe(false);

      // Verify token was removed from user's system document
      const systemDoc = await db.collection('system').doc('userA').get();
      expect(systemDoc.data()?.tokens).not.toContain(tokenId);
    });

    it('should handle non-existent token', async () => {
      // Mock the auth verification
      const mockAuth = { uid: 'userA' };
      const originalVerifyIdToken = admin.auth().verifyIdToken;
      admin.auth().verifyIdToken = vi.fn().mockResolvedValue(mockAuth);

      const mockReq = {
        method: 'POST',
        body: { data: { token: 'non-existent-token' } },
        headers: { authorization: 'Bearer test-token' },
        get: (header: string) => (header === 'authorization' ? 'Bearer test-token' : undefined),
      };
      let statusCode: number = 0;
      let responseData: any;
      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (data: any) => {
          responseData = data;
          return mockRes;
        },
        set: (_header: string, _value: string) => {
          return mockRes;
        },
        end: () => {},
        headersSent: false,
      };

      await revokeTokenHandler(mockReq as any, mockRes as any);

      // Restore original auth function
      admin.auth().verifyIdToken = originalVerifyIdToken;

      // The handler should respond with error but not throw
      expect(statusCode).toBe(404);
      expect(responseData.error).toBe('Token not found.');
    });

    it('should reject revocation without token parameter', async () => {
      // Mock the auth verification
      const mockAuth = { uid: 'userA' };
      const originalVerifyIdToken = admin.auth().verifyIdToken;
      admin.auth().verifyIdToken = vi.fn().mockResolvedValue(mockAuth);

      const mockReq = {
        method: 'POST',
        body: { data: {} },
        headers: { authorization: 'Bearer test-token' },
        get: (header: string) => (header === 'authorization' ? 'Bearer test-token' : undefined),
      };
      let statusCode: number = 0;
      let responseData: any;
      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (data: any) => {
          responseData = data;
          return mockRes;
        },
        set: (_header: string, _value: string) => {
          return mockRes;
        },
        end: () => {},
        headersSent: false,
      };

      await revokeTokenHandler(mockReq as any, mockRes as any);

      // Restore original auth function
      admin.auth().verifyIdToken = originalVerifyIdToken;

      // The handler should respond with error but not throw
      expect(statusCode).toBe(400);
      expect(responseData.error).toBe('Invalid request parameters.');
    });
  });
});
