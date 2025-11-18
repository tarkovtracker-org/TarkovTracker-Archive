import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSuite, firestore } from '../../helpers';
import { TeamService } from '../../../src/services/TeamService';

describe('Team Management (Simplified)', () => {
  const suite = createTestSuite('TeamManagementSimplified');
  let teamService: TeamService;

  beforeEach(async () => {
    await suite.beforeEach();
    teamService = new TeamService();
  });

  afterEach(suite.afterEach);

  describe('Team Service Integration', () => {
    it('should create team via TeamService directly', async () => {
      // Seed a user
      await suite.withDatabase({
        users: {
          'owner-uid': { uid: 'owner-uid', email: 'owner@example.com' },
        },
      });

      // Test the service directly
      const result = await teamService.createTeam('owner-uid', {
        password: 'testPassword123',
        maximumMembers: 10,
      });

      // Verify result
      expect(result).toBeDefined();
      expect(result.team).toBeDefined();
      expect(result.password).toBeDefined();

      // Verify team was created in Firestore
      const db = firestore();
      const systemDoc = await db.collection('system').doc('owner-uid').get();
      expect(systemDoc.exists).toBe(true);
      const systemData = systemDoc.data();
      expect(systemData?.team).toBe(result.team);

      const teamDoc = await db.collection('team').doc(result.team).get();
      expect(teamDoc.exists).toBe(true);
      const teamData = teamDoc.data();
      expect(teamData?.owner).toBe('owner-uid');
      expect(teamData?.maximumMembers).toBe(10);
    });

    it('should handle join team via TeamService', async () => {
      // Seed data
      await suite.withDatabase({
        users: {
          'owner-uid': { uid: 'owner-uid', email: 'owner@example.com' },
          'member-uid': { uid: 'member-uid', email: 'member@example.com' },
        },
        teams: {
          'team-123': {
            id: 'team-123',
            owner: 'owner-uid',
            password: 'secret-pass',
            members: ['owner-uid'],
            maximumMembers: 10,
            createdAt: new Date(),
          },
        },
      });

      // Test the service directly
      const result = await teamService.joinTeam('member-uid', {
        id: 'team-123',
        password: 'secret-pass',
      });

      // Verify result
      expect(result).toBeDefined();
      expect(result.joined).toBe(true);

      // Verify user joined the team in Firestore
      const db = firestore();
      const systemDoc = await db.collection('system').doc('member-uid').get();
      expect(systemDoc.exists).toBe(true);
      const systemData = systemDoc.data();
      expect(systemData?.team).toBe('team-123');

      const teamDoc = await db.collection('team').doc('team-123').get();
      expect(teamDoc.exists).toBe(true);
      const teamData = teamDoc.data();
      expect(teamData?.members).toContain('member-uid');
    });

    it('should handle leave team via TeamService', async () => {
      // Seed data
      await suite.withDatabase({
        users: {
          'owner-uid': { uid: 'owner-uid', email: 'owner@example.com' },
          'member-uid': { uid: 'member-uid', email: 'member@example.com' },
        },
        teams: {
          'team-123': {
            id: 'team-123',
            owner: 'owner-uid',
            password: 'secret-pass',
            members: ['owner-uid', 'member-uid'],
            maximumMembers: 10,
            createdAt: new Date(),
          },
        },
        system: {
          'owner-uid': { team: 'team-123' },
          'member-uid': { team: 'team-123' },
        },
      });

      // Test the service directly
      const result = await teamService.leaveTeam('member-uid');

      // Verify result
      expect(result).toBeDefined();
      expect(result.left).toBe(true);

      // Verify user left the team in Firestore
      const db = firestore();
      const systemDoc = await db.collection('system').doc('member-uid').get();
      expect(systemDoc.exists).toBe(false);

      const teamDoc = await db.collection('team').doc('team-123').get();
      expect(teamDoc.exists).toBe(true);
      const teamData = teamDoc.data();
      expect(teamData?.members).not.toContain('member-uid');
      expect(teamData?.members).toContain('owner-uid');
    });
  });
});
