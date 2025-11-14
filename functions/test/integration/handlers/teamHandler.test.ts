import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TeamService } from '../../../src/services/TeamService';
import { ValidationService } from '../../../src/services/ValidationService';
import {
  getTeamProgress,
  createTeam,
  joinTeam,
  leaveTeam,
} from '../../../src/handlers/teamHandler';
import { createTestSuite, getTarkovSeedData, createProgressDoc, admin } from '../../helpers';
import { createHandlerTest } from '../../helpers/testPatterns';

describe('handlers/teamHandler', () => {
  const suite = createTestSuite('handlers/teamHandler');
  let mockReq: any;
  let mockRes: any;
  let teamService: InstanceType<typeof TeamService>;

  beforeEach(async () => {
    await suite.beforeEach();

    // Initialize real services
    teamService = new TeamService();

    // Set up basic test data using centralized helper
    await suite.withDatabase({
      ...getTarkovSeedData(),
      users: {
        'test-user-123': {
          id: 'test-user-123',
          username: 'testuser',
          email: 'test@example.com',
        },
      },
      progress: {
        'test-user-123': createProgressDoc({
          pvp: { displayName: 'testuser', pmcFaction: 'USEC' },
        }),
      },
      system: {},
      team: {},
    });

    const tasksDoc = await admin.firestore().collection('tarkovdata').doc('tasks').get();
    const hideoutDoc = await admin.firestore().collection('tarkovdata').doc('hideout').get();
    expect(tasksDoc.exists).toBe(true);
    expect(hideoutDoc.exists).toBe(true);

    mockReq = {
      apiToken: {
        owner: 'test-user-123',
        note: 'Test token',
        permissions: ['TP'],
        gameMode: 'pvp',
        token: 'test-token-123',
      },
      query: {},
      body: {},
    };
    mockRes = createHandlerTest();
  });

  afterEach(suite.afterEach);

  describe('getTeamProgress', () => {
    it('should return team progress successfully', async () => {
      // Create a team first
      const created = await teamService.createTeam('test-user-123', {
        password: 'testpassword',
        maximumMembers: 5,
      });

      // Add user to the team
      await teamService.joinTeam('test-user-123', {
        id: created.team,
        password: created.password,
      });

      await getTeamProgress(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          meta: expect.objectContaining({
            self: 'test-user-123',
          }),
        })
      );
    });

    it('', async () => {
      mockReq.apiToken.gameMode = 'pve';

      await getTeamProgress(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          meta: expect.objectContaining({
            self: 'test-user-123',
          }),
        })
      );
    });

    it('', async () => {
      mockReq.apiToken.gameMode = undefined;

      await getTeamProgress(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          meta: expect.objectContaining({
            self: 'test-user-123',
          }),
        })
      );
    });

    it('', async () => {
      mockReq.apiToken.gameMode = 'dual';
      mockReq.query.gameMode = 'pve';

      await getTeamProgress(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
    });

    it('', async () => {
      mockReq.apiToken.gameMode = 'dual';

      await getTeamProgress(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
    });

    it('', async () => {
      await getTeamProgress(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: true,
        data: [],
        meta: { self: 'test-user-123', hiddenTeammates: [] },
      });
    });

    it('should handle team progress with hidden teammates', async () => {
      // Create a team with multiple members
      const created = await teamService.createTeam('test-user-123', {
        password: 'testpassword',
        maximumMembers: 5,
      });

      await teamService.joinTeam('test-user-123', {
        id: created.team,
        password: created.password,
      });

      await getTeamProgress(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          meta: expect.objectContaining({
            self: 'test-user-123',
          }),
        })
      );
    });
  });

  describe('createTeam', () => {
    it('should create team successfully with default settings', async () => {
      await createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            team: expect.any(String),
            password: expect.any(String),
          }),
        })
      );
    });

    it('should create team with custom password', async () => {
      mockReq.body = {
        password: 'custom-password-123',
      };

      await createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            team: expect.any(String),
            password: 'custom-password-123',
          }),
        })
      );
    });

    it('should create team with custom maximum members', async () => {
      mockReq.body = {
        maximumMembers: 25,
      };

      await createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            team: expect.any(String),
            password: expect.any(String),
          }),
        })
      );
    });

    it('should create team with both custom password and maximum members', async () => {
      mockReq.body = {
        password: 'custom-password',
        maximumMembers: 15,
      };

      await createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            team: expect.any(String),
            password: 'custom-password',
          }),
        })
      );
    });

    it('should reject password shorter than 4 characters', async () => {
      mockReq.body = {
        password: 'abc',
      };

      await createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Password must be at least 4 characters long',
      });
    });

    it('should reject maximum members less than 2', async () => {
      mockReq.body = {
        maximumMembers: 1,
      };

      await createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Maximum members must be between 2 and 50',
      });
    });

    it('should reject maximum members greater than 50', async () => {
      mockReq.body = {
        maximumMembers: 51,
      };

      await createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Maximum members must be between 2 and 50',
      });
    });

    it('should reject non-numeric maximum members', async () => {
      mockReq.body = {
        maximumMembers: 'not-a-number',
      };

      await createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Maximum members must be between 2 and 50',
      });
    });

    it('should trim whitespace from password', async () => {
      mockReq.body = {
        password: '  my-password  ',
      };

      await createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            password: 'my-password',
          }),
        })
      );
    });

    it('should handle empty request body', async () => {
      mockReq.body = {};

      await createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            team: expect.any(String),
            password: expect.any(String),
          }),
        })
      );
    });

    it('should handle null request body', async () => {
      mockReq.body = null;

      await createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            team: expect.any(String),
            password: expect.any(String),
          }),
        })
      );
    });
  });

  describe('joinTeam', () => {
    beforeEach(async () => {
      mockReq.body = {
        id: 'team-123',
        password: 'team-password',
      };
    });

    it('should join team successfully', async () => {
      // Create a team first
      const created = await teamService.createTeam('test-user-123', {
        password: 'team-password',
        maximumMembers: 5,
      });

      mockReq.body.id = created.team;

      await joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            joined: true,
          }),
        })
      );
    });

    it('', async () => {
      mockReq.body = {};

      await joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Team ID and password are required',
      });
    });

    it('', async () => {
      mockReq.body = {
        password: 'team-password',
      };

      await joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Team ID and password are required',
      });
    });

    it('', async () => {
      mockReq.body = {
        id: 'team-123',
      };

      await joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Team ID and password are required',
      });
    });

    it('should trim team ID and preserve password', async () => {
      // Create a team first
      const created = await teamService.createTeam('test-user-123', {
        password: '  team-password  ',
        maximumMembers: 5,
      });

      mockReq.body = {
        id: `  ${created.team}  `,
        password: '  team-password  ',
      };

      await joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
    });

    it('', async () => {
      mockReq.body = {
        id: '   ',
        password: 'team-password',
      };

      await joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Team ID and password cannot be empty',
      });
    });

    it('', async () => {
      mockReq.body = {
        id: 'team-123',
        password: '',
      };

      await joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Team ID and password cannot be empty',
      });
    });

    it('', async () => {
      mockReq.body = {
        id: 123,
        password: 456,
      };

      await joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
    });

    it('', async () => {
      mockReq.body = null;

      await joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Team ID and password are required',
      });
    });
  });

  describe('leaveTeam', () => {
    it('should leave team successfully', async () => {
      // Create and join a team first
      const created = await teamService.createTeam('test-user-123', {
        password: 'testpassword',
        maximumMembers: 5,
      });

      await teamService.joinTeam('test-user-123', {
        id: created.team,
        password: created.password,
      });

      await leaveTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            left: true,
          }),
        })
      );
    });

    it('', async () => {
      await leaveTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle leave team response correctly', async () => {
      // Create and join a team first
      const created = await teamService.createTeam('test-user-123', {
        password: 'testpassword',
        maximumMembers: 5,
      });

      await teamService.joinTeam('test-user-123', {
        id: created.team,
        password: created.password,
      });

      await leaveTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            left: true,
          }),
        })
      );
    });
  });

  describe('Error handling through asyncHandler', () => {
    it('', async () => {
      // Mock validation to throw an error
      const originalValidate = ValidationService.validateUserId;
      ValidationService.validateUserId = vi.fn().mockRejectedValue(new Error('Invalid user ID'));

      await getTeamProgress(mockReq, mockRes.res, vi.fn());
      // asyncHandler should catch errors and pass to next
      expect(vi.fn()).toHaveBeenCalled();

      // Restore
      ValidationService.validateUserId = originalValidate;
    });

    it('', async () => {
      // Mock team service to throw an error
      const originalGetTeamProgress = teamService.getTeamProgress;
      teamService.getTeamProgress = vi.fn().mockRejectedValue(new Error('Team not found'));

      await getTeamProgress(mockReq, mockRes.res, vi.fn());
      // asyncHandler should catch this and pass to next
      expect(vi.fn()).toHaveBeenCalled();

      // Restore
      teamService.getTeamProgress = originalGetTeamProgress;
    });

    it('', async () => {
      // Mock validation to throw an error
      const originalValidate = ValidationService.validateUserId;
      ValidationService.validateUserId = vi
        .fn()
        .mockRejectedValue(new Error('User already in team'));

      await createTeam(mockReq, mockRes.res, vi.fn());
      expect(vi.fn()).toHaveBeenCalled();

      // Restore
      ValidationService.validateUserId = originalValidate;
    });
  });

  describe('API response structure', () => {
    it('', async () => {
      await getTeamProgress(mockReq, mockRes.res, vi.fn());
      const response = mockRes.mockJson.mock.calls[0][0];
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('meta');
      expect(response.success).toBe(true);
    });

    it('', async () => {
      await getTeamProgress(mockReq, mockRes.res, vi.fn());
      const response = mockRes.mockJson.mock.calls[0][0];
      expect(response.meta).toEqual(
        expect.objectContaining({
          self: 'test-user-123',
          hiddenTeammates: expect.any(Array),
        })
      );
    });
  });
});
