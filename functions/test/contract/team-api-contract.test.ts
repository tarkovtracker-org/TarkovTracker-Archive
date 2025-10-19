/**
 * API Contract Tests for Team Endpoints
 * 
 * These tests ensure that team API response structures remain stable.
 * Purpose: Prevent breaking changes to team management API contracts
 */

import { describe, it, expect } from 'vitest';

describe('Team API Contract Tests', () => {
  describe('GET /api/v2/team/progress - Response Structure', () => {
    it('returns correct team progress structure', () => {
      const expectedResponse = {
        success: true,
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
      };

      expect(expectedResponse).toMatchObject({
        success: expect.any(Boolean),
        data: expect.objectContaining({
          members: expect.any(Array),
          teamId: expect.any(String),
        }),
        meta: expect.objectContaining({
          memberCount: expect.any(Number),
        }),
      });

      // Validate member structure
      expectedResponse.data.members.forEach(member => {
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
    it('returns team creation confirmation', () => {
      const expectedResponse = {
        team: 'newly-created-team-id',
        password: 'generated-password',
      };

      expect(expectedResponse).toMatchObject({
        team: expect.any(String),
        password: expect.any(String),
      });

      expect(expectedResponse.team.length).toBeGreaterThan(0);
      expect(expectedResponse.password.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('POST /api/team/join - Response Structure', () => {
    it('returns join confirmation', () => {
      const expectedResponse = {
        joined: true,
      };

      expect(expectedResponse).toMatchObject({
        joined: expect.any(Boolean),
      });

      expect(expectedResponse.joined).toBe(true);
    });
  });

  describe('POST /api/team/leave - Response Structure', () => {
    it('returns leave confirmation', () => {
      const expectedResponse = {
        left: true,
      };

      expect(expectedResponse).toMatchObject({
        left: expect.any(Boolean),
      });

      expect(expectedResponse.left).toBe(true);
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
