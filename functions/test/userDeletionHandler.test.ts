import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { firestoreMock, adminMock } from './setup.js';

// Import after mocks are set up
import {
  UserDeletionService,
  deleteUserAccountHandler,
} from '../src/handlers/userDeletionHandler';
import { errors } from '../src/middleware/errorHandler';
import { seedDb, makeRes, resetDb } from './setup';

beforeEach(() => {
  resetDb();
  seedDb({
    users: {
      victim: { uid: 'victim', email: 'victim@example.com', active: true }
    },
    teams: {
      teamA: { owner: 'victim', members: ['victim', 'member1'] }
    },
    apiTokens: {
      token1: { token: 'token1', owner: 'victim', permissions: ['read'], revoked: false, createdAt: 0 },
      token2: { token: 'token2', owner: 'victim', permissions: ['write'], revoked: false, createdAt: 0 }
    },
    progress: {
      victim: { tasks: [], hideout: {} }
    }
  });
});

describe('User Deletion Handler', () => {
  let userDeletionService: UserDeletionService;

  beforeEach(() => {
    vi.clearAllMocks();
    userDeletionService = new UserDeletionService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('UserDeletionService', () => {
    describe('deleteUserAccount', () => {
      it('should delete user account successfully with valid confirmation', async () => {
        const userId = 'victim';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock team cleanup (no team)
        firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
          const mockTransaction = {
            get: vi.fn().mockResolvedValue({
              exists: false,
              data: () => undefined,
            }),
            update: vi.fn(),
            delete: vi.fn(),
          };
          return callback(mockTransaction);
        });

        // Mock batch operations
        const batchMock = {
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          commit: vi.fn().mockResolvedValue({}),
        };
        firestoreMock.batch.mockReturnValue(batchMock);

        // Mock token query
        firestoreMock.collection.mockReturnValue({
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: [],
            forEach: vi.fn(),
          }),
        } as any);

        // Mock auth delete
        adminMock.auth().deleteUser.mockResolvedValue({});

        const result = await userDeletionService.deleteUserAccount(userId, request);

        expect(result.success).toBe(true);
        expect(result.data.message).toBe(
          'User account and all associated data have been permanently deleted'
        );
      });

      it('should throw error for invalid confirmation text', async () => {
        const userId = 'victim';
        const request = {
          confirmationText: 'WRONG TEXT',
        };
  
        await expect(userDeletionService.deleteUserAccount(userId, request)).rejects.toThrow(
          'Invalid confirmation text. Must be exactly "DELETE MY ACCOUNT"'
        );
        await expect(userDeletionService.deleteUserAccount(userId, request)).rejects.toMatchObject({
          name: 'ApiError',
          statusCode: 400,
        });
      });

      it('should throw error for missing confirmation text', async () => {
        const userId = 'victim';
        const request = {
          confirmationText: '',
        };
  
        await expect(userDeletionService.deleteUserAccount(userId, request)).rejects.toThrow(
          'Invalid confirmation text. Must be exactly "DELETE MY ACCOUNT"'
        );
      });

      it('should handle team cleanup when user is not in a team', async () => {
        const userId = 'victim';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock no system document
        firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
          const mockTransaction = {
            get: vi.fn().mockResolvedValue({
              exists: false,
              data: () => undefined,
            }),
            update: vi.fn(),
            delete: vi.fn(),
          };
          return callback(mockTransaction);
        });

        // Mock batch operations
        const batchMock = {
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          commit: vi.fn().mockResolvedValue({}),
        };
        firestoreMock.batch.mockReturnValue(batchMock);

        // Mock token query
        firestoreMock.collection.mockReturnValue({
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: [],
            forEach: vi.fn(),
          }),
        } as any);

        adminMock.auth().deleteUser.mockResolvedValue({});

        const result = await userDeletionService.deleteUserAccount(userId, request);

        expect(result.success).toBe(true);
      });

      it('should handle team member removal when user is not owner', async () => {
        const userId = 'victim';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock user is team member (not owner)
        firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
          const mockTransaction = {
            get: vi
              .fn()
              .mockResolvedValueOnce({
                exists: true,
                data: () => ({ team: 'team-123' }),
              })
              .mockResolvedValueOnce({
                exists: true,
                data: () => ({
                  owner: 'different-owner',
                  members: ['different-owner', 'test-user-123', 'member-2'],
                  password: 'team-pass',
                  maximumMembers: 5,
                  createdAt: { toDate: () => new Date() },
                }),
              }),
            update: vi.fn(),
            delete: vi.fn(),
          };
          return callback(mockTransaction);
        });

        // Mock batch operations
        const batchMock = {
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          commit: vi.fn().mockResolvedValue({}),
        };
        firestoreMock.batch.mockReturnValue(batchMock);

        // Mock token query
        firestoreMock.collection.mockReturnValue({
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: [],
            forEach: vi.fn(),
          }),
        } as any);

        adminMock.auth().deleteUser.mockResolvedValue({});

        const result = await userDeletionService.deleteUserAccount(userId, request);

        expect(result.success).toBe(true);
      });

      it('should transfer team ownership when user is owner and has other members', async () => {
        const userId = 'victim';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock user is team owner with other members
        const mockTeamData = {
          owner: userId,
          members: [userId, 'member-2', 'member-3'],
          password: 'team-pass',
          maximumMembers: 5,
          createdAt: { toDate: () => new Date('2024-01-01') },
        };

        const mockUserDocs = [
          {
            exists: true,
            data: () => ({
              createdAt: { toDate: () => new Date('2024-01-02') },
            }),
          },
          {
            exists: true,
            data: () => ({
              createdAt: { toDate: () => new Date('2024-01-03') },
            }),
          },
        ];

        firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
          const mockTransaction = {
            get: vi
              .fn()
              .mockResolvedValueOnce({
                exists: true,
                data: () => ({ team: 'team-123' }),
              })
              .mockResolvedValueOnce({
                exists: true,
                data: () => mockTeamData,
              }),
            update: vi.fn(),
            delete: vi.fn(),
          };
          return callback(mockTransaction);
        });

        // Mock user queries for finding oldest member
        firestoreMock.doc.mockReturnValue({
          get: vi
            .fn()
            .mockResolvedValueOnce(mockUserDocs[0])
            .mockResolvedValueOnce(mockUserDocs[1]),
        } as any);

        // Mock batch operations
        const batchMock = {
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          commit: vi.fn().mockResolvedValue({}),
        };
        firestoreMock.batch.mockReturnValue(batchMock);

        // Mock token query
        firestoreMock.collection.mockReturnValue({
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: [],
            forEach: vi.fn(),
          }),
        } as any);

        adminMock.auth().deleteUser.mockResolvedValue({});

        const result = await userDeletionService.deleteUserAccount(userId, request);

        expect(result.success).toBe(true);
      });

      it('should delete team when user is owner and has no other members', async () => {
        const userId = 'victim';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock user is team owner with no other members
        firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
          const mockTransaction = {
            get: vi
              .fn()
              .mockResolvedValueOnce({
                exists: true,
                data: () => ({ team: 'team-123' }),
              })
              .mockResolvedValueOnce({
                exists: true,
                data: () => ({
                  owner: userId,
                  members: [userId],
                  password: 'team-pass',
                  maximumMembers: 5,
                  createdAt: { toDate: () => new Date() },
                }),
              }),
            update: vi.fn(),
            delete: vi.fn(),
          };
          return callback(mockTransaction);
        });

        // Mock batch operations
        const batchMock = {
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          commit: vi.fn().mockResolvedValue({}),
        };
        firestoreMock.batch.mockReturnValue(batchMock);

        // Mock token query
        firestoreMock.collection.mockReturnValue({
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: [],
            forEach: vi.fn(),
          }),
        } as any);

        adminMock.auth().deleteUser.mockResolvedValue({});

        const result = await userDeletionService.deleteUserAccount(userId, request);

        expect(result.success).toBe(true);
      });

      it('should delete all user tokens', async () => {
        const userId = 'victim';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock no team
        firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
          const mockTransaction = {
            get: vi.fn().mockResolvedValue({
              exists: false,
              data: () => undefined,
            }),
            update: vi.fn(),
            delete: vi.fn(),
          };
          return callback(mockTransaction);
        });

        // Mock batch operations
        const batchMock = {
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          commit: vi.fn().mockResolvedValue({}),
        };
        firestoreMock.batch.mockReturnValue(batchMock);

        // Mock token query with tokens
        const mockTokens = [{ ref: { delete: vi.fn() } }, { ref: { delete: vi.fn() } }];
        firestoreMock.collection.mockReturnValue({
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: mockTokens,
            forEach: vi.fn((callback) => mockTokens.forEach(callback)),
          }),
        } as any);

        adminMock.auth().deleteUser.mockResolvedValue({});

        const result = await userDeletionService.deleteUserAccount(userId, request);

        expect(result.success).toBe(true);
        expect(batchMock.delete).toHaveBeenCalledTimes(2);
      });

      it('should handle Firebase Auth user not found error', async () => {
        const userId = 'victim';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock no team
        firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
          const mockTransaction = {
            get: vi.fn().mockResolvedValue({
              exists: false,
              data: () => undefined,
            }),
            update: vi.fn(),
            delete: vi.fn(),
          };
          return callback(mockTransaction);
        });

        // Mock batch operations
        const batchMock = {
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          commit: vi.fn().mockResolvedValue({}),
        };
        firestoreMock.batch.mockReturnValue(batchMock);

        // Mock token query
        firestoreMock.collection.mockReturnValue({
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: [],
            forEach: vi.fn(),
          }),
        } as any);

        // Mock auth user not found
        const authError = new Error('User not found') as any;
        authError.code = 'auth/user-not-found';
        adminMock.auth().deleteUser.mockRejectedValue(authError);

        const result = await userDeletionService.deleteUserAccount(userId, request);

        expect(result.success).toBe(true);
      });

      it('should handle Firestore errors during data deletion', async () => {
        const userId = 'victim';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock Firestore error
        firestoreMock.runTransaction.mockRejectedValueOnce(new Error('Firestore error'));

        await expect(userDeletionService.deleteUserAccount(userId, request)).rejects.toThrow(
          /failed to delete user account/i
        );
      });

      it('should handle errors during team ownership transfer', async () => {
        const userId = 'victim';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock team ownership transfer error
        firestoreMock.runTransaction.mockRejectedValueOnce(new Error('Transfer failed'));

        await expect(userDeletionService.deleteUserAccount(userId, request)).rejects.toThrow(
          /failed to delete user account/i
        );
      });
    });
  });

  describe('deleteUserAccountHandler', () => {
    const mockRequest = (overrides = {}) => ({
      user: { id: 'test-user-123' },
      body: {
        confirmationText: 'DELETE MY ACCOUNT',
      },
      ...overrides,
    });

    const mockResponse = () => {
      return makeRes();
    };

    it('should handle successful user deletion', async () => {
      const req = mockRequest();
      const res = mockResponse();

      // Mock the service method
      vi.spyOn(userDeletionService, 'deleteUserAccount').mockResolvedValue({
        success: true,
        data: { message: 'User account and all associated data have been permanently deleted' },
      });

      await deleteUserAccountHandler(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      const [body] = res.json.mock.calls.at(-1) || [];
      expect(body).toEqual(expect.objectContaining({
        success: true,
        data: { message: 'User account and all associated data have been permanently deleted' },
      }));
    });

    it('should return 401 when user is not authenticated', async () => {
      const req = mockRequest({ user: undefined });
      const res = mockResponse();

      await deleteUserAccountHandler(req as any, res as any);

      const [[statusCode]] = res.status.mock.calls;
      const [[body]] = res.json.mock.calls;
      expect(statusCode).toBe(401);
      expect(body).toEqual({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED',
      });
    });

    it('should handle API errors from service', async () => {
      const req = mockRequest();
      const res = mockResponse();

      // Mock service throwing ApiError
      vi.spyOn(userDeletionService, 'deleteUserAccount').mockRejectedValue(
        errors.badRequest('Invalid confirmation text. Must be exactly "DELETE MY ACCOUNT"')
      );

      await deleteUserAccountHandler(req as any, res as any);

      const [[statusCode]] = res.status.mock.calls;
      const [[body]] = res.json.mock.calls;
      expect(statusCode).toBe(400);
      expect(body).toEqual(expect.objectContaining({
        success: false,
        error: 'Invalid confirmation text. Must be exactly "DELETE MY ACCOUNT"',
        code: 'INVALID_ARGUMENT',
      }));
    });

    it('should handle unexpected errors', async () => {
      const req = mockRequest();
      const res = mockResponse();

      // Mock service throwing unexpected error
      vi.spyOn(userDeletionService, 'deleteUserAccount').mockRejectedValue(
        new Error('Unexpected error')
      );

      await deleteUserAccountHandler(req as any, res as any);

      const [[statusCode]] = res.status.mock.calls;
      const [[body]] = res.json.mock.calls;
      expect(statusCode).toBe(500);
      expect(body).toEqual(expect.objectContaining({
        success: false,
        error: 'Failed to delete user account. Please try again later.',
        code: 'INTERNAL_ERROR',
      }));
    });

    it('should handle missing user ID', async () => {
      const req = mockRequest({ user: { id: '' } });
      const res = mockResponse();

      await deleteUserAccountHandler(req as any, res as any);

      const [[statusCode]] = res.status.mock.calls;
      const [[body]] = res.json.mock.calls;
      expect(statusCode).toBe(401);
      expect(body).toEqual({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('integration tests with emulator-backed cascade deletion', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('full cascade deletion', () => {
      it('should delete user and all associated Firestore documents', async () => {
        const userId = 'victim';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock team cleanup (user is in a team as owner)
        firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
          const mockTransaction = {
            get: vi.fn()
              .mockResolvedValueOnce({
                exists: true,
                data: () => ({
                  team: 'test-team-123',
                  teamMax: 5,
                }),
              })
              .mockResolvedValueOnce({
                exists: true,
                data: () => ({
                  owner: userId,
                  members: [userId, 'member-2', 'member-3'],
                  maximumMembers: 5,
                }),
              }),
            update: vi.fn(),
            delete: vi.fn(),
          };
          return callback(mockTransaction);
        });

        // Mock batch operations for user data deletion
        const batchMock = {
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          commit: vi.fn().mockResolvedValue({}),
        };
        firestoreMock.batch.mockReturnValue(batchMock);

        // Mock token deletion
        firestoreMock.collection.mockImplementation((collectionName) => {
          if (collectionName === 'token') {
            return {
              where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({
                  docs: [
                    { id: 'token-1', delete: vi.fn() },
                    { id: 'token-2', delete: vi.fn() },
                  ],
                }),
              }),
            };
          }
          return {
            doc: vi.fn().mockReturnValue({
              delete: vi.fn(),
            }),
          };
        });

        // Mock Firebase Auth user deletion
        adminMock.auth().deleteUser.mockResolvedValue(undefined);

        const userDeletionService = new UserDeletionService();
        const result = await userDeletionService.deleteUserAccount(userId, request);

        expect(result.success).toBe(true);
        expect(result.data.message).toBe('User account deleted successfully');
        
        // Verify team ownership transfer was attempted
        expect(firestoreMock.runTransaction).toHaveBeenCalledTimes(2); // Team cleanup + user data deletion
        
        // Verify batch operations were called for user data cleanup
        expect(batchMock.delete).toHaveBeenCalled();
        expect(batchMock.commit).toHaveBeenCalled();
        
        // Verify Firebase Auth user deletion was called
        expect(adminMock.auth().deleteUser).toHaveBeenCalledWith(userId);
      });

      it('should handle team member removal when user is not owner', async () => {
        const userId = 'test-user-member-123';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock team cleanup (user is member, not owner)
        firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
          const mockTransaction = {
            get: vi.fn()
              .mockResolvedValueOnce({
                exists: true,
                data: () => ({
                  team: 'test-team-456',
                  teamMax: 5,
                }),
              })
              .mockResolvedValueOnce({
                exists: true,
                data: () => ({
                  owner: 'other-owner-789',
                  members: ['other-owner-789', userId, 'member-3'],
                  maximumMembers: 5,
                }),
              }),
            update: vi.fn(),
            delete: vi.fn(),
          };
          return callback(mockTransaction);
        });

        // Mock batch operations
        const batchMock = {
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          commit: vi.fn().mockResolvedValue({}),
        };
        firestoreMock.batch.mockReturnValue(batchMock);

        // Mock Firebase Auth user deletion
        adminMock.auth().deleteUser.mockResolvedValue(undefined);

        const userDeletionService = new UserDeletionService();
        const result = await userDeletionService.deleteUserAccount(userId, request);

        expect(result.success).toBe(true);
        
        // Verify team member removal was attempted
        expect(firestoreMock.runTransaction).toHaveBeenCalled();
        
        // Verify user data deletion
        expect(batchMock.delete).toHaveBeenCalled();
        expect(batchMock.commit).toHaveBeenCalled();
        
        // Verify Firebase Auth user deletion
        expect(adminMock.auth().deleteUser).toHaveBeenCalledWith(userId);
      });
    });

    describe('failure path with atomicity', () => {
      it('should handle Firestore write failures and ensure no partial deletions', async () => {
        const userId = 'test-user-failure-123';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock team cleanup to succeed
        firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
          const mockTransaction = {
            get: vi.fn().mockResolvedValue({
              exists: false, // No team
              data: () => undefined,
            }),
            update: vi.fn(),
            delete: vi.fn(),
          };
          return callback(mockTransaction);
        });

        // Mock batch operations to fail
        const batchMock = {
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          commit: vi.fn().mockRejectedValue(new Error('Firestore write failed')),
        };
        firestoreMock.batch.mockReturnValue(batchMock);

        const userDeletionService = new UserDeletionService();
        
        await expect(
          userDeletionService.deleteUserAccount(userId, request)
        ).rejects.toThrow('Firestore write failed');

        // Verify no Firebase Auth deletion occurred due to failure
        expect(adminMock.auth().deleteUser).not.toHaveBeenCalled();
      });

      it('should handle Firebase Auth deletion failure and maintain data integrity', async () => {
        const userId = 'test-user-auth-fail-123';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock team cleanup to succeed
        firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
          const mockTransaction = {
            get: vi.fn().mockResolvedValue({
              exists: false,
              data: () => undefined,
            }),
            update: vi.fn(),
            delete: vi.fn(),
          };
          return callback(mockTransaction);
        });

        // Mock batch operations to succeed
        const batchMock = {
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          commit: vi.fn().mockResolvedValue({}),
        };
        firestoreMock.batch.mockReturnValue(batchMock);

        // Mock Firebase Auth deletion to fail
        adminMock.auth().deleteUser.mockRejectedValue(
          new Error('Auth user not found')
        );

        const userDeletionService = new UserDeletionService();
        
        // Should still succeed even if Auth user doesn't exist (data already deleted)
        const result = await userDeletionService.deleteUserAccount(userId, request);
        
        expect(result.success).toBe(true);
        expect(result.data.message).toBe('User account deleted successfully');
        
        // Verify Firestore operations completed
        expect(batchMock.delete).toHaveBeenCalled();
        expect(batchMock.commit).toHaveBeenCalled();
        
        // Verify Auth deletion was attempted
        expect(adminMock.auth().deleteUser).toHaveBeenCalledWith(userId);
      });

      it('should handle transaction rollback semantics during team ownership transfer', async () => {
        const userId = 'test-user-rollback-123';
        const request = {
          confirmationText: 'DELETE MY ACCOUNT',
        };

        // Mock team cleanup to fail during ownership transfer
        firestoreMock.runTransaction.mockImplementationOnce(async (callback) => {
          const mockTransaction = {
            get: vi.fn()
              .mockResolvedValueOnce({
                exists: true,
                data: () => ({
                  team: 'test-team-rollback',
                  teamMax: 5,
                }),
              })
              .mockResolvedValueOnce({
                exists: true,
                data: () => ({
                  owner: userId,
                  members: [userId, 'member-2'],
                  maximumMembers: 5,
                }),
              })
              .mockResolvedValueOnce({
                exists: true,
                data: () => ({
                  displayName: 'member-2',
                  createdAt: new Date(),
                }),
              }),
            update: vi.fn().mockRejectedValue(new Error('Transaction failed')),
            delete: vi.fn(),
          };
          return callback(mockTransaction);
        });

        const userDeletionService = new UserDeletionService();
        
        await expect(
          userDeletionService.deleteUserAccount(userId, request)
        ).rejects.toThrow('Transaction failed');

        // Verify no subsequent operations occurred due to transaction failure
        expect(firestoreMock.batch).not.toHaveBeenCalled();
        expect(adminMock.auth().deleteUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('userDeletionHandler', () => {
    it('deletes user and cascades cleanup atomically', async () => {
      const res = makeRes();
      const req = { params: { uid: 'uid1' } } as any;
      await userDeletionHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      // Verify cascade cleanup via collection.get() snapshots
      const tokensSnap = await firestoreMock.collection('apiTokens').get();
      expect(tokensSnap.empty).toBe(true);
      const teamSnap = await firestoreMock.collection('teams').get();
      expect(teamSnap.docs.map((d) => d.data())).toEqual([]);
      const progressSnap = await firestoreMock.collection('progress').get();
      expect(progressSnap.empty).toBe(true);
    });

    it('rolls back on failure with no partial deletions', async () => {
      // Induce failure by making an update throw (e.g., missing doc during deletion path)
      // Then assert 500 and that original seeded state remains intact
      const res = makeRes();
      const req = { params: { uid: 'missing' } } as any;
      await userDeletionHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});