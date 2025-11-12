import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TeamService } from '../../src/services/TeamService';
import { ValidationService } from '../../src/services/ValidationService';
import { getTeamProgress, createTeam, joinTeam, leaveTeam } from '../../src/handlers/teamHandler';
import { resetDb, seedDb } from '../helpers/emulatorSetup';
import { createHandlerTest } from '../helpers/testPatterns';

describe('handlers/teamHandler', () => {
  let mockReq: any;
  let mockRes: any;
  let teamService: InstanceType<typeof TeamService>;

  beforeEach(async () => {
    await resetDb();

    // Initialize real services
    teamService = new TeamService();

    // Set up basic test data
    await seedDb({
      users: {
        'test-user-123': {
          id: 'test-user-123',
          username: 'testuser',
          email: 'test@example.com',
        },
      },
      system: {},
      team: {},
      tarkovdata: {
        tasks: { tasks: [] },
        hideout: {},
      },
    });

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

      getTeamProgress(mockReq, mockRes.res, vi.fn());
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

    it('should use token gameMode when available', () => {
      mockReq.apiToken.gameMode = 'pve';

      getTeamProgress(mockReq, mockRes.res, vi.fn());
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

    it('should default to pvp when token gameMode is not set', () => {
      mockReq.apiToken.gameMode = undefined;

      getTeamProgress(mockReq, mockRes.res, vi.fn());
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

    it('should use query parameter for dual mode tokens', () => {
      mockReq.apiToken.gameMode = 'dual';
      mockReq.query.gameMode = 'pve';

      getTeamProgress(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
    });

    it('should default to pvp for dual mode tokens without query parameter', () => {
      mockReq.apiToken.gameMode = 'dual';

      getTeamProgress(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle empty team progress data', () => {
      getTeamProgress(mockReq, mockRes.res, vi.fn());
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

      getTeamProgress(mockReq, mockRes.res, vi.fn());
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
    it('should create team successfully with default settings', () => {
      createTeam(mockReq, mockRes.res, vi.fn());
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

    it('should create team with custom password', () => {
      mockReq.body = {
        password: 'custom-password-123',
      };

      createTeam(mockReq, mockRes.res, vi.fn());
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

    it('should create team with custom maximum members', () => {
      mockReq.body = {
        maximumMembers: 25,
      };

      createTeam(mockReq, mockRes.res, vi.fn());
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

    it('should create team with both custom password and maximum members', () => {
      mockReq.body = {
        password: 'custom-password',
        maximumMembers: 15,
      };

      createTeam(mockReq, mockRes.res, vi.fn());
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

    it('should reject password shorter than 4 characters', () => {
      mockReq.body = {
        password: 'abc',
      };

      createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Password must be at least 4 characters long',
      });
    });

    it('should reject maximum members less than 2', () => {
      mockReq.body = {
        maximumMembers: 1,
      };

      createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Maximum members must be between 2 and 50',
      });
    });

    it('should reject maximum members greater than 50', () => {
      mockReq.body = {
        maximumMembers: 51,
      };

      createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Maximum members must be between 2 and 50',
      });
    });

    it('should reject non-numeric maximum members', () => {
      mockReq.body = {
        maximumMembers: 'not-a-number',
      };

      createTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Maximum members must be between 2 and 50',
      });
    });

    it('should trim whitespace from password', () => {
      mockReq.body = {
        password: '  my-password  ',
      };

      createTeam(mockReq, mockRes.res, vi.fn());
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

    it('should handle empty request body', () => {
      mockReq.body = {};

      createTeam(mockReq, mockRes.res, vi.fn());
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

    it('should handle null request body', () => {
      mockReq.body = null;

      createTeam(mockReq, mockRes.res, vi.fn());
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
    beforeEach(() => {
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

      joinTeam(mockReq, mockRes.res, vi.fn());
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

    it('should require team ID and password', () => {
      mockReq.body = {};

      joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Team ID and password are required',
      });
    });

    it('should require team ID', () => {
      mockReq.body = {
        password: 'team-password',
      };

      joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Team ID and password are required',
      });
    });

    it('should require password', () => {
      mockReq.body = {
        id: 'team-123',
      };

      joinTeam(mockReq, mockRes.res, vi.fn());
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

      joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
    });

    it('should reject empty team ID after trimming', () => {
      mockReq.body = {
        id: '   ',
        password: 'team-password',
      };

      joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Team ID and password cannot be empty',
      });
    });

    it('should reject empty password', () => {
      mockReq.body = {
        id: 'team-123',
        password: '',
      };

      joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Team ID and password cannot be empty',
      });
    });

    it('should convert team ID and password to strings', () => {
      mockReq.body = {
        id: 123,
        password: 456,
      };

      joinTeam(mockReq, mockRes.res, vi.fn());
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
    });

    it('should handle null body', () => {
      mockReq.body = null;

      joinTeam(mockReq, mockRes.res, vi.fn());
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

      leaveTeam(mockReq, mockRes.res, vi.fn());
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

    it('should call TeamService.leaveTeam with correct user ID', () => {
      leaveTeam(mockReq, mockRes.res, vi.fn());
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

      leaveTeam(mockReq, mockRes.res, vi.fn());
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
    it('should handle validation errors gracefully', () => {
      // Mock validation to throw an error
      const originalValidate = ValidationService.validateUserId;
      ValidationService.validateUserId = vi.fn().mockRejectedValue(new Error('Invalid user ID'));

      getTeamProgress(mockReq, mockRes.res, vi.fn());
      // asyncHandler should catch errors and pass to next
      expect(vi.fn()).toHaveBeenCalled();

      // Restore
      ValidationService.validateUserId = originalValidate;
    });

    it('should handle team service errors', () => {
      // Mock team service to throw an error
      const originalGetTeamProgress = teamService.getTeamProgress;
      teamService.getTeamProgress = vi.fn().mockRejectedValue(new Error('Team not found'));

      getTeamProgress(mockReq, mockRes.res, vi.fn());
      // asyncHandler should catch this and pass to next
      expect(vi.fn()).toHaveBeenCalled();

      // Restore
      teamService.getTeamProgress = originalGetTeamProgress;
    });

    it('should handle validation errors in createTeam', () => {
      // Mock validation to throw an error
      const originalValidate = ValidationService.validateUserId;
      ValidationService.validateUserId = vi
        .fn()
        .mockRejectedValue(new Error('User already in team'));

      createTeam(mockReq, mockRes.res, vi.fn());
      expect(vi.fn()).toHaveBeenCalled();

      // Restore
      ValidationService.validateUserId = originalValidate;
    });
  });

  describe('API response structure', () => {
    it('should return consistent API response format', () => {
      getTeamProgress(mockReq, mockRes.res, vi.fn());
      const response = mockRes.mockJson.mock.calls[0][0];
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('meta');
      expect(response.success).toBe(true);
    });

    it('should include meta information in team progress response', () => {
      getTeamProgress(mockReq, mockRes.res, vi.fn());
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
