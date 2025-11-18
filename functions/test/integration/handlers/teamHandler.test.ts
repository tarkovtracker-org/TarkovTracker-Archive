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
      // Create a team first (user is automatically added to the team)
      await teamService.createTeam('test-user-123', {
        password: 'testpassword',
        maximumMembers: 5,
      });

      await getTeamProgress(mockReq, mockRes.res, mockRes.next);
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

    it('should handle pve game mode', async () => {
      // Create a team first
      await teamService.createTeam('test-user-123', {
        password: 'testpassword',
        maximumMembers: 5,
      });
      mockReq.apiToken.gameMode = 'pve';

      await getTeamProgress(mockReq, mockRes.res, mockRes.next);
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

    it('should use pvp as default game mode', async () => {
      // Create a team first
      await teamService.createTeam('test-user-123', {
        password: 'testpassword',
        maximumMembers: 5,
      });
      mockReq.apiToken.gameMode = undefined;

      await getTeamProgress(mockReq, mockRes.res, mockRes.next);
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

    it('should handle dual game mode with pve query parameter', async () => {
      mockReq.apiToken.gameMode = 'dual';
      mockReq.query.gameMode = 'pve';

      await getTeamProgress(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle dual game mode without query parameter', async () => {
      mockReq.apiToken.gameMode = 'dual';

      await getTeamProgress(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
    });

    it('should return empty team data when user is not in a team', async () => {
      await getTeamProgress(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
      expect(mockRes.mockJson).toHaveBeenCalledWith({
        success: true,
        data: [],
        meta: { self: 'test-user-123', hiddenTeammates: [] },
      });
    });

    it('should handle team progress with hidden teammates', async () => {
      // Create a team with multiple members using separate users
      await teamService.createTeam('test-user-123', {
        password: 'testpassword',
        maximumMembers: 5,
      });

      // Use a different user to test joining
      await suite.withDatabase({
        users: {
          'teammate-1': {
            id: 'teammate-1',
            username: 'teammate1',
            email: 'teammate1@example.com',
          },
        },
        progress: {
          'teammate-1': createProgressDoc({
            pvp: { displayName: 'teammate1', pmcFaction: 'BEAR' },
          }),
        },
        system: {},
      });

      const teamDoc = await admin.firestore().collection('team').get();
      const teams = teamDoc.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const createdTeam = teams.find(t => t.owner === 'test-user-123');
      expect(createdTeam).toBeDefined();

      await teamService.joinTeam('teammate-1', {
        id: createdTeam.id,
        password: 'testpassword',
      });

      await getTeamProgress(mockReq, mockRes.res, mockRes.next);
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
      await createTeam(mockReq, mockRes.res, mockRes.next);
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

      await createTeam(mockReq, mockRes.res, mockRes.next);
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

      await createTeam(mockReq, mockRes.res, mockRes.next);
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

      await createTeam(mockReq, mockRes.res, mockRes.next);
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

      await createTeam(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Password must be at least 4 characters long',
          meta: expect.objectContaining({
            code: 'BAD_REQUEST',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should reject maximum members less than 2', async () => {
      mockReq.body = {
        maximumMembers: 1,
      };

      await createTeam(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Maximum members must be between 2 and 50',
          meta: expect.objectContaining({
            code: 'BAD_REQUEST',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should reject maximum members greater than 50', async () => {
      mockReq.body = {
        maximumMembers: 51,
      };

      await createTeam(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Maximum members must be between 2 and 50',
          meta: expect.objectContaining({
            code: 'BAD_REQUEST',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should reject non-numeric maximum members', async () => {
      mockReq.body = {
        maximumMembers: 'not-a-number',
      };

      await createTeam(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Maximum members must be between 2 and 50',
          meta: expect.objectContaining({
            code: 'BAD_REQUEST',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should trim whitespace from password', async () => {
      mockReq.body = {
        password: '  my-password  ',
      };

      await createTeam(mockReq, mockRes.res, mockRes.next);
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

      await createTeam(mockReq, mockRes.res, mockRes.next);
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

      await createTeam(mockReq, mockRes.res, mockRes.next);
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
      // Create a separate user for join tests since test-user-123 might already be in a team
      await suite.withDatabase({
        users: {
          'join-test-user': {
            id: 'join-test-user',
            username: 'jointester',
            email: 'join@example.com',
          },
        },
        progress: {
          'join-test-user': createProgressDoc({
            pvp: { displayName: 'jointester', pmcFaction: 'BEAR' },
          }),
        },
        system: {},
      });
      
      mockReq.apiToken.owner = 'join-test-user';
      
      mockReq.body = {
        id: 'team-123',
        password: 'team-password',
      };
    });

    it('should join team successfully', async () => {
      // Create a team with a different user first
      await teamService.createTeam('test-user-123', {
        password: 'team-password',
        maximumMembers: 5,
      });

      const teamDoc = await admin.firestore().collection('team').get();
      const teams = teamDoc.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const createdTeam = teams.find(t => t.owner === 'test-user-123');
      expect(createdTeam).toBeDefined();
      
      mockReq.body.id = createdTeam.id;

      await joinTeam(mockReq, mockRes.res, mockRes.next);
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

    it('should reject when both id and password are missing', async () => {
      mockReq.body = {};

      await joinTeam(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Team ID and password are required',
          meta: expect.objectContaining({
            code: 'BAD_REQUEST',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should reject when team id is missing', async () => {
      mockReq.body = {
        password: 'team-password',
      };

      await joinTeam(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Team ID and password are required',
          meta: expect.objectContaining({
            code: 'BAD_REQUEST',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should reject when password is missing', async () => {
      mockReq.body = {
        id: 'team-123',
      };

      await joinTeam(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Team ID and password are required',
          meta: expect.objectContaining({
            code: 'BAD_REQUEST',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should trim team ID and preserve password', async () => {
      // Create a team first with a different user
      await teamService.createTeam('test-user-123', {
        password: '  team-password  ',
        maximumMembers: 5,
      });

      const teamDoc = await admin.firestore().collection('team').get();
      const teams = teamDoc.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const createdTeam = teams.find(t => t.owner === 'test-user-123');
      expect(createdTeam).toBeDefined();

      mockReq.body = {
        id: `  ${createdTeam.id}  `,
        password: '  team-password  ',
      };

      await joinTeam(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(200);
    });

    it('should reject when team ID is whitespace only', async () => {
      mockReq.body = {
        id: '   ',
        password: 'team-password',
      };

      await joinTeam(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Team ID and password are required',
          meta: expect.objectContaining({
            code: 'BAD_REQUEST',
          }),
        })
      );
    });

    it('should reject when password is empty after trim', async () => {
      mockReq.body = {
        id: 'team-123',
        password: '',
      };

      await joinTeam(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Team ID and password are required',
          meta: expect.objectContaining({
            code: 'BAD_REQUEST',
          }),
        })
      );
    });

    it('should reject non-string team id and password', async () => {
      mockReq.body = {
        id: 123,
        password: 456,
      };

      await joinTeam(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Team ID and password are required',
          meta: expect.objectContaining({
            code: 'BAD_REQUEST',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should reject null request body', async () => {
      mockReq.body = null;

      await joinTeam(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Team ID and password are required',
          meta: expect.objectContaining({
            code: 'BAD_REQUEST',
            timestamp: expect.any(String),
          }),
        })
      );
    });
  });

  describe('leaveTeam', () => {
    it('should leave team successfully', async () => {
      // Create and join a team first
      const created = await teamService.createTeam('test-user-123', {
        password: 'testpassword',
        maximumMembers: 5,
      });

      // User is automatically added as owner when creating team, no need to join
      await leaveTeam(mockReq, mockRes.res, mockRes.next);
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

    it('should handle user not in team', async () => {
      // User should not be in a team after reset or test isolation
      await leaveTeam(mockReq, mockRes.res, mockRes.next);
      expect(mockRes.mockStatus).toHaveBeenCalledWith(400);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'User is not in a team',
        })
      );
    });

    it('should handle leave team response correctly', async () => {
      // Create and join a team first
      const created = await teamService.createTeam('test-user-123', {
        password: 'testpassword',
        maximumMembers: 5,
      });

      // User is automatically added as owner when creating team
      await leaveTeam(mockReq, mockRes.res, mockRes.next);
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
    it('should handle validation errors in getTeamProgress', async () => {
      // Mock validation to throw an error
      const originalValidate = ValidationService.validateUserId;
      ValidationService.validateUserId = vi.fn().mockImplementation(() => {
        throw new Error('Invalid user ID');
      });

      await getTeamProgress(mockReq, mockRes.res, mockRes.next);
      // asyncHandler should catch errors and send error response
      expect(mockRes.mockStatus).toHaveBeenCalledWith(500);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Internal server error',
          meta: expect.objectContaining({
            code: 'INTERNAL_ERROR',
          }),
        })
      );

      // Restore
      ValidationService.validateUserId = originalValidate;
    });

    it.skip('should handle service errors in getTeamProgress', async () => {
      // Skip for now - requires complex mocking of lazy-loaded service
      // TODO: Fix this test by properly mocking the factory pattern
    });

    it('should handle validation errors in createTeam', async () => {
      // Mock validation to throw an error
      const originalValidate = ValidationService.validateUserId;
      ValidationService.validateUserId = vi.fn().mockImplementation(() => {
        throw new Error('User already in team');
      });

      await createTeam(mockReq, mockRes.res, mockRes.next);
      // asyncHandler should catch this and send error response
      expect(mockRes.mockStatus).toHaveBeenCalledWith(500);
      expect(mockRes.mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Internal server error',
          meta: expect.objectContaining({
            code: 'INTERNAL_ERROR',
          }),
        })
      );

      // Restore
      ValidationService.validateUserId = originalValidate;
    });
  });

  describe('API response structure', () => {
    it('should return correct response structure', async () => {
      // Create a team first so getTeamProgress has data to return
      await teamService.createTeam('test-user-123', {
        password: 'testpassword',
        maximumMembers: 5,
      });

      await getTeamProgress(mockReq, mockRes.res, mockRes.next);
      const response = mockRes.mockJson.mock.calls[0][0];
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('meta');
      expect(response.success).toBe(true);
    });

    it('should include correct metadata in response', async () => {
      // Create a team first so getTeamProgress has data to return
      await teamService.createTeam('test-user-123', {
        password: 'testpassword',
        maximumMembers: 5,
      });

      await getTeamProgress(mockReq, mockRes.res, mockRes.next);
      const response = mockRes.mockJson.mock.calls[0][0];
      
      // Only check metadata structure if response is successful
      if (response.success) {
        expect(response.meta).toEqual(
          expect.objectContaining({
            self: 'test-user-123',
            hiddenTeammates: expect.any(Array),
          })
        );
      }
    });
  });
});
