/**
 * API Contract Tests for Team Endpoints
 * 
 * These tests ensure that team API response structures remain stable.
 * Purpose: Prevent breaking changes to team management API contracts
 * 
 * Approach: Tests the actual handler layer by calling real handler functions with mocked requests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper to create mock Express request
const createMockRequest = (apiToken: any, params = {}, body = {}, query = {}) => ({
  apiToken,
  params,
  body,
  query,
});

// Helper to create mock Express response
const createMockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('Team API Contract Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/v2/team/progress - Response Structure', () => {
    it('returns correct team progress structure', async () => {
      // Mock the TeamService - it returns {data: FormattedProgress[], meta: {self, hiddenTeammates}}
      const { TeamService } = await import('../../lib/services/TeamService.js');
      vi.spyOn(TeamService.prototype, 'getTeamProgress').mockResolvedValue({
        data: [
          {
            userId: 'user-1',
            displayName: 'Player1',
            playerLevel: 42,
            gameEdition: 3,
            pmcFaction: 'USEC',
            tasksProgress: [],
            taskObjectivesProgress: [],
            hideoutModulesProgress: [],
            hideoutPartsProgress: [],
          },
        ],
        meta: {
          self: 'user-1',
          hiddenTeammates: [],
        },
      });

      // Call the actual handler
      const teamHandler = (await import('../../lib/handlers/teamHandler.js')).default;
      const req = createMockRequest({ owner: 'user-1', team: 'team-123' });
      const res = createMockResponse();

      await teamHandler.getTeamProgress(req, res);

      // Validate the response
      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];

      expect(responseData).toMatchObject({
        success: true,
        data: expect.any(Array),
        meta: expect.objectContaining({
          self: expect.any(String),
          hiddenTeammates: expect.any(Array),
        }),
      });

      // Validate member structure - data is an array of FormattedProgress objects
      responseData.data.forEach((member: any) => {
        expect(member).toHaveProperty('userId');
        expect(member).toHaveProperty('displayName');
        expect(member).toHaveProperty('playerLevel');
        expect(member).toHaveProperty('gameEdition');
        expect(member).toHaveProperty('pmcFaction');
        expect(member).toHaveProperty('tasksProgress');
        expect(member).toHaveProperty('taskObjectivesProgress');
        expect(member).toHaveProperty('hideoutModulesProgress');
        expect(member).toHaveProperty('hideoutPartsProgress');
        
        expect(Array.isArray(member.tasksProgress)).toBe(true);
        expect(Array.isArray(member.taskObjectivesProgress)).toBe(true);
        expect(Array.isArray(member.hideoutModulesProgress)).toBe(true);
        expect(Array.isArray(member.hideoutPartsProgress)).toBe(true);
      });
    });
  });

  describe('POST /api/team/create - Response Structure', () => {
    it('returns team creation confirmation', async () => {
      const { TeamService } = await import('../../lib/services/TeamService.js');
      vi.spyOn(TeamService.prototype, 'createTeam').mockResolvedValue({
        team: 'newly-created-team-id',
        password: 'generated-password',
      });

      const teamHandler = (await import('../../lib/handlers/teamHandler.js')).default;
      const req = createMockRequest(
        { owner: 'user-1' },
        {},
        { password: 'my-password', maximumMembers: 5 }
      );
      const res = createMockResponse();

      await teamHandler.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];

      expect(responseData).toMatchObject({
        success: true,
        data: expect.objectContaining({
          team: expect.any(String),
          password: expect.any(String),
        }),
      });

      expect(responseData.data.team.length).toBeGreaterThan(0);
      expect(responseData.data.password.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('POST /api/team/join - Response Structure', () => {
    it('returns join confirmation', async () => {
      const { TeamService } = await import('../../lib/services/TeamService.js');
      vi.spyOn(TeamService.prototype, 'joinTeam').mockResolvedValue({
        joined: true,
      });

      const teamHandler = (await import('../../lib/handlers/teamHandler.js')).default;
      const req = createMockRequest(
        { owner: 'user-1' },
        {},
        { id: 'team-123', password: 'team-password' }
      );
      const res = createMockResponse();

      await teamHandler.joinTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];

      expect(responseData).toMatchObject({
        success: true,
        data: expect.objectContaining({
          joined: expect.any(Boolean),
        }),
      });

      expect(responseData.data.joined).toBe(true);
    });
  });

  describe('POST /api/team/leave - Response Structure', () => {
    it('returns leave confirmation', async () => {
      const { TeamService } = await import('../../lib/services/TeamService.js');
      vi.spyOn(TeamService.prototype, 'leaveTeam').mockResolvedValue({
        left: true,
      });

      const teamHandler = (await import('../../lib/handlers/teamHandler.js')).default;
      const req = createMockRequest({ owner: 'user-1' });
      const res = createMockResponse();

      await teamHandler.leaveTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];

      expect(responseData).toMatchObject({
        success: true,
        data: expect.objectContaining({
          left: expect.any(Boolean),
        }),
      });

      expect(responseData.data.left).toBe(true);
    });
  });

  describe('Backward Compatibility - Team Endpoints', () => {
    it('maintains team creation response fields by calling handler', async () => {
      const { TeamService } = await import('../../lib/services/TeamService.js');
      vi.spyOn(TeamService.prototype, 'createTeam').mockResolvedValue({
        teamId: 'team-123',
        password: 'secure-password',
        leader: 'user-123',
      });

      const teamHandler = (await import('../../lib/handlers/teamHandler.js')).default;
      const req = createMockRequest(
        { owner: 'user-123' },
        {},
        { name: 'MyTeam' }
      );
      const res = createMockResponse();

      await teamHandler.createTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];

      // Validate response structure
      expect(responseData).toHaveProperty('success');
      expect(responseData).toHaveProperty('data');

      // Check that team creation response has expected fields
      if (responseData.data && typeof responseData.data === 'object') {
        // Must have either 'team' or 'teamId' (backward compatibility)
        expect(
          responseData.data.hasOwnProperty('team') || 
          responseData.data.hasOwnProperty('teamId')
        ).toBe(true);

        // Must have password
        expect(responseData.data).toHaveProperty('password');
        expect(typeof responseData.data.password).toBe('string');
      }
    });

    it('maintains team progress member structure by calling handler', async () => {
      const { TeamService } = await import('../../lib/services/TeamService.js');
      vi.spyOn(TeamService.prototype, 'getTeamProgress').mockResolvedValue({
        data: [
          {
            userId: 'user-id',
            displayName: 'display-name',
            playerLevel: 42,
            gameEdition: 3,
            pmcFaction: 'USEC',
            tasksProgress: [],
            taskObjectivesProgress: [],
            hideoutModulesProgress: [],
            hideoutPartsProgress: [],
          },
        ],
        meta: {
          self: 'user-id',
          hiddenTeammates: [],
        },
      });

      const teamHandler = (await import('../../lib/handlers/teamHandler.js')).default;
      const req = createMockRequest({ owner: 'user-id' });
      const res = createMockResponse();

      await teamHandler.getTeamProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];

      // Data should be an array of members
      expect(Array.isArray(responseData.data)).toBe(true);

      // Each member should have required fields
      responseData.data.forEach((member: any) => {
        const requiredFields = [
          'userId',
          'displayName',
          'playerLevel',
          'gameEdition',
          'pmcFaction',
          'tasksProgress',
          'taskObjectivesProgress',
          'hideoutModulesProgress',
          'hideoutPartsProgress',
        ];

        requiredFields.forEach(field => {
          expect(member).toHaveProperty(field);
        });

        // Verify types for array fields
        expect(Array.isArray(member.tasksProgress)).toBe(true);
        expect(Array.isArray(member.taskObjectivesProgress)).toBe(true);
        expect(Array.isArray(member.hideoutModulesProgress)).toBe(true);
        expect(Array.isArray(member.hideoutPartsProgress)).toBe(true);

        // Verify types for scalar fields
        expect(typeof member.userId).toBe('string');
        expect(typeof member.displayName).toBe('string');
        expect(typeof member.playerLevel).toBe('number');
        expect(typeof member.gameEdition).toBe('number');
        expect(typeof member.pmcFaction).toBe('string');
      });
    });
  });
});
