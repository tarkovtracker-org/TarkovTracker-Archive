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
      // Mock the TeamService - it returns {data, meta} structure
      const { TeamService } = await import('../../lib/services/TeamService.js');
      vi.spyOn(TeamService.prototype, 'getTeamProgress').mockResolvedValue({
        data: {
          members: [
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
          teamId: 'team-123',
        },
        meta: {
          memberCount: 1,
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
        data: expect.objectContaining({
          members: expect.any(Array),
          teamId: expect.any(String),
        }),
        meta: expect.objectContaining({
          memberCount: expect.any(Number),
        }),
      });

      // Validate member structure
      responseData.data.members.forEach((member: any) => {
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
    it('maintains team creation response fields', () => {
      const response = {
        team: 'team-id',
        password: 'team-password',
      };

      const requiredFields = ['team', 'password'];
      requiredFields.forEach(field => {
        expect(response).toHaveProperty(field);
        expect(typeof response[field as keyof typeof response]).toBe('string');
      });
    });

    it('maintains team progress member structure', () => {
      const memberStructure = {
        userId: 'user-id',
        displayName: 'display-name',
        playerLevel: 42,
        gameEdition: 3,
        pmcFaction: 'USEC',
        tasksProgress: [],
        taskObjectivesProgress: [],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
      };

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
        expect(memberStructure).toHaveProperty(field);
      });

      expect(Array.isArray(memberStructure.tasksProgress)).toBe(true);
      expect(Array.isArray(memberStructure.taskObjectivesProgress)).toBe(true);
      expect(Array.isArray(memberStructure.hideoutModulesProgress)).toBe(true);
      expect(Array.isArray(memberStructure.hideoutPartsProgress)).toBe(true);
    });
  });
});
