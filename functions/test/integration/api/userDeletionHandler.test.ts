import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  UserDeletionService,
  deleteUserAccountHandler,
  __setUserDeletionService,
} from '../../../src/handlers/userDeletionHandler';
import { errors } from '../../../src/middleware/errorHandler';
import { createTestSuite, admin } from './helpers/index';

const confirmationRequest = { confirmationText: 'DELETE MY ACCOUNT' };

const BASE_DATA = {
  user: {
    victim: { uid: 'victim', email: 'victim@example.com', createdAt: new Date('2020-01-02') },
    member1: { uid: 'member1', email: 'member1@example.com', createdAt: new Date('2020-01-01') },
    member2: { uid: 'member2', email: 'member2@example.com', createdAt: new Date('2020-02-01') },
  },
  team: {
    teamA: {
      owner: 'victim',
      members: ['victim', 'member1', 'member2'],
      password: 'secret',
      maximumMembers: 5,
      createdAt: new Date('2020-01-01'),
    },
  },
  system: {
    victim: { team: 'teamA', tokens: ['token1', 'token2'] },
  },
  token: {
    token1: {
      owner: 'victim',
      note: 'token1',
      permissions: ['GP'],
      gameMode: 'pvp',
      createdAt: new Date(),
    },
    token2: {
      owner: 'victim',
      note: 'token2',
      permissions: ['WP'],
      gameMode: 'pvp',
      createdAt: new Date(),
    },
  },
  progress: {
    victim: {
      currentGameMode: 'pvp',
      pvp: { taskCompletions: {}, level: 42 },
    },
  },
};

describe('UserDeletionService (emulator-backed)', () => {
  const suite = createTestSuite('UserDeletionService');
  let service: UserDeletionService;
  let deleteUserSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await suite.beforeEach();
    await suite.withDatabase(BASE_DATA);
    const auth = admin.auth();
    deleteUserSpy = vi.spyOn(auth, 'deleteUser').mockResolvedValue(undefined as any);
    suite.addCleanup(async () => {
      deleteUserSpy.mockRestore();
    });
    service = new UserDeletionService();
  });

  afterEach(suite.afterEach);

  it('deletes user data and reassigns team ownership to oldest member', async () => {
    const result = await service.deleteUserAccount('victim', confirmationRequest);

    expect(result.success).toBe(true);
    expect(deleteUserSpy).toHaveBeenCalledWith('victim');

    const tokenSnapshot = await admin
      .firestore()
      .collection('token')
      .where('owner', '==', 'victim')
      .get();
    expect(tokenSnapshot.empty).toBe(true);

    const systemDoc = await admin.firestore().collection('system').doc('victim').get();
    expect(systemDoc.exists).toBe(false);

    const progressDoc = await admin.firestore().collection('progress').doc('victim').get();
    expect(progressDoc.exists).toBe(false);

    const teamDoc = await admin.firestore().collection('team').doc('teamA').get();
    expect(teamDoc.exists).toBe(true);
    const data = teamDoc.data();
    expect(data?.owner).toBe('member1');
    expect(data?.members).toEqual(['member1', 'member2']);
  });

  it('deletes team when owner has no remaining members', async () => {
    await suite.beforeEach();
    await suite.withDatabase({
      user: { victim: { uid: 'victim', createdAt: new Date('2020-01-01') } },
      team: {
        soloTeam: {
          owner: 'victim',
          members: ['victim'],
          password: 'secret',
          maximumMembers: 4,
          createdAt: new Date('2020-01-01'),
        },
      },
      system: { victim: { team: 'soloTeam' } },
    });

    const result = await service.deleteUserAccount('victim', confirmationRequest);
    expect(result.success).toBe(true);

    const teamDoc = await admin.firestore().collection('team').doc('soloTeam').get();
    expect(teamDoc.exists).toBe(false);
  });

  it('succeeds when user is not part of a team', async () => {
    await suite.beforeEach();
    await suite.withDatabase({
      user: { solo: { uid: 'solo' } },
      system: { solo: {} },
    });

    await expect(service.deleteUserAccount('solo', confirmationRequest)).resolves.toMatchObject({
      success: true,
    });
    expect(deleteUserSpy).toHaveBeenCalledWith('solo');
  });

  it('throws for invalid confirmation text', async () => {
    await expect(
      service.deleteUserAccount('victim', { confirmationText: 'nope' })
    ).rejects.toThrow('Invalid confirmation text');
    expect(deleteUserSpy).not.toHaveBeenCalled();
  });

  it('ignores missing Firebase Auth users', async () => {
    deleteUserSpy.mockRejectedValueOnce(
      Object.assign(new Error('missing'), { code: 'auth/user-not-found' })
    );

    const result = await service.deleteUserAccount('victim', confirmationRequest);
    expect(result.success).toBe(true);
    expect(deleteUserSpy).toHaveBeenCalled();
  });

  it('bubbles up unexpected Firebase Auth errors', async () => {
    deleteUserSpy.mockRejectedValueOnce(new Error('boom'));

    await expect(service.deleteUserAccount('victim', confirmationRequest)).rejects.toThrow(
      'Failed to delete authentication account'
    );
  });
});

describe('deleteUserAccountHandler', () => {
  afterEach(async () => {
    __setUserDeletionService();
  });

  const makeReq = (overrides: Partial<{ user?: { id: string }; body: { confirmationText: string } }> = {}) =>
    ({
      user: { id: 'victim', ...(overrides.user ?? {}) },
      body: { confirmationText: 'DELETE MY ACCOUNT', ...(overrides.body ?? {}) },
    }) as any;

  const makeRes = () => {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  };

  it('responds with 200 when the service succeeds', async () => {
    const mockService = {
      deleteUserAccount: vi.fn().mockResolvedValue({ success: true, data: { message: 'ok' } }),
    } as unknown as UserDeletionService;
    __setUserDeletionService(mockService);

    const req = makeReq();
    const res = makeRes();

    await deleteUserAccountHandler(req, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { message: 'ok' } });
  });

  it('responds with 401 when no user is provided', async () => {
    const res = makeRes();
    await deleteUserAccountHandler(makeReq({ user: undefined }), res as any);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'User not authenticated',
      code: 'UNAUTHORIZED',
    });
  });

  it('maps ApiError responses from the service', async () => {
    const mockService = {
      deleteUserAccount: vi.fn().mockRejectedValue(
        errors.badRequest('Invalid confirmation text. Must be exactly "DELETE MY ACCOUNT"')
      ),
    } as unknown as UserDeletionService;
    __setUserDeletionService(mockService);

    const res = makeRes();
    await deleteUserAccountHandler(makeReq(), res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid confirmation text. Must be exactly "DELETE MY ACCOUNT"',
      code: 'BAD_REQUEST',
    });
  });

  it('returns 500 for unexpected errors', async () => {
    const mockService = {
      deleteUserAccount: vi.fn().mockRejectedValue(new Error('boom')),
    } as unknown as UserDeletionService;
    __setUserDeletionService(mockService);

    const res = makeRes();
    await deleteUserAccountHandler(makeReq(), res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Failed to delete user account. Please try again later.',
      code: 'INTERNAL_ERROR',
    });
  });
});
