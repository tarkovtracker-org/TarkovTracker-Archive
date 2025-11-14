import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSuite, admin, getTarkovSeedData, createProgressDoc } from '../../helpers/index';
import { TeamService } from '../../../src/services/TeamService';

describe('TeamService', () => {
  const suite = createTestSuite('TeamService');
  let service: InstanceType<typeof TeamService>;

  beforeEach(async () => {
    await suite.beforeEach();
    service = new TeamService();

    // Seed basic test data using centralized helper
    await suite.withDatabase({
      ...getTarkovSeedData(),
      system: {
        'user-1': { team: 'team-1' },
        'user-2': {},
        'user-3': {},
      },
      team: {
        'team-1': {
          owner: 'user-1',
          password: 'testpassword',
          maximumMembers: 5,
          members: ['user-1', 'user-2'],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      users: {
        'user-1': {
          id: 'user-1',
          username: 'testuser1',
          email: 'test1@example.com',
        },
        'user-2': {
          id: 'user-2',
          username: 'testuser2',
          email: 'test2@example.com',
        },
        'user-3': {
          id: 'user-3',
          username: 'testuser3',
          email: 'test3@example.com',
        },
      },
      progress: {
        'user-1': createProgressDoc({
          pvp: { displayName: 'testuser1' },
        }),
      },
    });
  });

  afterEach(suite.afterEach);

  describe('getTeamProgress', () => {
    it('should return team progress when team exists', async () => {
      const result = await service.getTeamProgress('user-1');
      expect(result).toBeDefined();
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.meta.self).toBe('user-1');
    });

    it('should return progress with empty team when user not in a team', async () => {
      const result = await service.getTeamProgress('nonexistent-user');
      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta.self).toBe('nonexistent-user');
    });
  });

  describe('createTeam', () => {
    it('should create a new team', async () => {
      const teamData = {
        password: 'testpassword',
        maximumMembers: 5,
      };
      const result = await service.createTeam('user-3', teamData);
      expect(result).toBeDefined();
      expect(typeof result.team).toBe('string');
      expect(typeof result.password).toBe('string');

      // Verify team was created in emulator
      const db = admin.firestore();
      const teamDoc = await db.collection('team').doc(result.team).get();
      expect(teamDoc.exists).toBe(true);
      expect(teamDoc.data()?.owner).toBe('user-3');
    });
  });

  describe('joinTeam', () => {
    it('should add user to existing team', async () => {
      // Create a team first (ensures proper state)
      const created = await service.createTeam('user-3', {
        password: 'testpassword',
        maximumMembers: 5,
      });
      const joinData = { id: created.team, password: created.password };
      const result = await service.joinTeam('user-2', joinData);
      expect(result.joined).toBe(true);

      // Verify user was added to team in emulator
      const db = admin.firestore();
      const teamDoc = await db.collection('team').doc(created.team).get();
      expect(teamDoc.exists).toBe(true);
      expect(teamDoc.data()?.members).toContain('user-2');
    });
  });

  describe('leaveTeam', () => {
    it('should remove user from team', async () => {
      const result = await service.leaveTeam('user-1');
      expect(result.left).toBe(true);

      // Verify user was removed from team in emulator
      const db = admin.firestore();
      const systemDoc = await db.collection('system').doc('user-1').get();
      expect(systemDoc.exists).toBe(true);
      // Team field is set to null when leaving (not undefined)
      expect(systemDoc.data()?.team).toBeNull();
    });
  });
});
