/**
 * Pure unit tests for TeamService using fake repository
 *
 * These tests run without Firestore emulator:
 * - Much faster execution
 * - Easy to simulate edge cases
 * - No external dependencies
 * - Ideal for CI/CD pipelines
 *
 * @vitest-env node
 * @sequential - Tests must run sequentially to maintain FakeRepository isolation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { TeamService } from '../../../src/services/TeamService';
import { FakeTeamRepository } from '../../repositories/FakeTeamRepository';

// Mock timestamp utilities for consistent testing
const mockTimestamp = {
  now: () => ({ toMillis: () => Date.now() }),
  fromMillis: (value: number) => ({ toMillis: () => value }),
};

// Mock data loaders (not needed for pure unit tests)
vi.mock('../../../src/utils/dataLoaders', () => ({
  getTaskData: vi.fn().mockResolvedValue({ task1: {} }),
  getHideoutData: vi.fn().mockResolvedValue({ hideout1: {} }),
}));

// Mock UIDGenerator for deterministic tests
vi.mock('../../../src/token/UIDGenerator', () => {
  return {
    default: class MockUIDGenerator {
      async generate(): Promise<string> {
        return 'generated-team-id-123';
      }
    },
  };
});

// Run tests sequentially to maintain FakeRepository isolation
describe.sequential('TeamService - Pure Unit Tests (No Emulator)', () => {
  let teamService: TeamService;
  let fakeRepo: FakeTeamRepository;

  beforeEach(async () => {
    // Create fresh repository instance for each test to ensure isolation
    fakeRepo = new FakeTeamRepository();
    teamService = new TeamService(fakeRepo);
  });

  afterEach(() => {
    // Explicitly clear repository state after each test
    // This prevents any potential state leakage between tests
    fakeRepo.reset();
  });

  describe('createTeam', () => {
    it('should create a team successfully', async () => {
      // Arrange - seed test data
      fakeRepo.seedSystemDoc('user-1', {});

      // Act
      const result = await teamService.createTeam('user-1', {
        password: 'secure-password',
        maximumMembers: 10,
      });

      // Assert
      expect(result).toEqual({
        team: 'generated-team-id-123',
        password: 'secure-password',
      });

      // Verify team was created
      const teamDoc = await fakeRepo.getTeamDocument('generated-team-id-123');
      expect(teamDoc).toBeDefined();
      expect(teamDoc?.owner).toBe('user-1');
      expect(teamDoc?.password).toBe('secure-password');
      expect(teamDoc?.maximumMembers).toBe(10);
      expect(teamDoc?.members).toEqual(['user-1']);

      // Verify system doc was updated
      const systemDoc = await fakeRepo.getSystemDocument('user-1');
      expect(systemDoc?.team).toBe('generated-team-id-123');
    });

    it('should reject if user is already in a team', async () => {
      // Arrange - user already in a team
      fakeRepo.seedSystemDoc('user-1', { team: 'existing-team-id' });

      // Act & Assert
      await expect(teamService.createTeam('user-1', { maximumMembers: 10 })).rejects.toThrow(
        'User is already in a team'
      );
    });

    it('should enforce cooldown period after leaving team', async () => {
      // Arrange - user left team 2 minutes ago
      const twoMinutesAgo = Timestamp.fromMillis(Date.now() - 2 * 60 * 1000);
      fakeRepo.seedSystemDoc('user-1', { lastLeftTeam: twoMinutesAgo });

      // Act & Assert
      await expect(teamService.createTeam('user-1', { maximumMembers: 10 })).rejects.toThrow(
        'You must wait 5 minutes after leaving a team'
      );
    });

    it('should allow team creation after cooldown expires', async () => {
      // Arrange - user left team 6 minutes ago (cooldown expired)
      const sixMinutesAgo = Timestamp.fromMillis(Date.now() - 6 * 60 * 1000);
      fakeRepo.seedSystemDoc('user-1', { lastLeftTeam: sixMinutesAgo });

      // Act
      const result = await teamService.createTeam('user-1', {
        password: 'new-password',
        maximumMembers: 5,
      });

      // Assert
      expect(result.team).toBe('generated-team-id-123');
      const teamDoc = await fakeRepo.getTeamDocument('generated-team-id-123');
      expect(teamDoc?.maximumMembers).toBe(5);
    });
  });

  describe('joinTeam', () => {
    beforeEach(async () => {
      // Clear any previous state and ensure fresh repository
      fakeRepo.clear();

      // Setup: existing team with one member
      fakeRepo.seedTeamDoc('team-123', {
        owner: 'owner-user',
        password: 'team-password',
        maximumMembers: 10,
        members: ['owner-user'],
        createdAt: mockTimestamp.now(),
      });
      fakeRepo.seedSystemDoc('user-2', {});
    });

    it('should allow user to join team with correct password', async () => {
      // Act
      const result = await teamService.joinTeam('user-2', {
        id: 'team-123',
        password: 'team-password',
      });

      // Assert
      expect(result.joined).toBe(true);

      // Verify user was added to team
      const teamDoc = await fakeRepo.getTeamDocument('team-123');
      expect(teamDoc?.members).toContain('user-2');
      expect(teamDoc?.members).toHaveLength(2);

      // Verify user's system doc was updated
      const systemDoc = await fakeRepo.getSystemDocument('user-2');
      expect(systemDoc?.team).toBe('team-123');
    });

    it('should reject if user is already in a team', async () => {
      // Arrange - user already in another team
      fakeRepo.seedSystemDoc('user-2', { team: 'other-team' });

      // Act & Assert
      await expect(
        teamService.joinTeam('user-2', {
          id: 'team-123',
          password: 'team-password',
        })
      ).rejects.toThrow('User is already in a team');
    });

    it('should reject if team does not exist', async () => {
      // Act & Assert
      await expect(
        teamService.joinTeam('user-2', {
          id: 'non-existent-team',
          password: 'any-password',
        })
      ).rejects.toThrow('Team does not exist');
    });

    it('should reject incorrect password', async () => {
      // Act & Assert
      await expect(
        teamService.joinTeam('user-2', {
          id: 'team-123',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Incorrect team password');
    });

    it('should reject if team is full', async () => {
      // Arrange - team is full (2/2 members)
      fakeRepo.seedTeamDoc('full-team', {
        owner: 'owner-user',
        password: 'password',
        maximumMembers: 2,
        members: ['owner-user', 'member-1'],
        createdAt: mockTimestamp.now(),
      });

      // Act & Assert
      await expect(
        teamService.joinTeam('user-2', {
          id: 'full-team',
          password: 'password',
        })
      ).rejects.toThrow('Team is full');
    });
  });

  describe('leaveTeam', () => {
    it('should allow member to leave team', async () => {
      // Arrange - team with 2 members
      fakeRepo.seedTeamDoc('team-123', {
        owner: 'owner-user',
        password: 'password',
        maximumMembers: 10,
        members: ['owner-user', 'member-1'],
        createdAt: Timestamp.now(),
      });
      fakeRepo.seedSystemDoc('member-1', { team: 'team-123' });

      // Act
      const result = await teamService.leaveTeam('member-1');

      // Assert
      expect(result.left).toBe(true);

      // Verify member was removed from team
      const teamDoc = await fakeRepo.getTeamDocument('team-123');
      expect(teamDoc?.members).not.toContain('member-1');
      expect(teamDoc?.members).toHaveLength(1);

      // Verify member's system doc was updated
      const systemDoc = await fakeRepo.getSystemDocument('member-1');
      expect(systemDoc?.team).toBeNull();
      expect(systemDoc?.lastLeftTeam).toBeDefined();
    });

    it('should disband team when owner leaves', async () => {
      // Arrange - team with owner and 2 members
      fakeRepo.seedTeamDoc('team-123', {
        owner: 'owner-user',
        password: 'password',
        maximumMembers: 10,
        members: ['owner-user', 'member-1', 'member-2'],
        createdAt: Timestamp.now(),
      });
      fakeRepo.seedSystemDoc('owner-user', { team: 'team-123' });
      fakeRepo.seedSystemDoc('member-1', { team: 'team-123' });
      fakeRepo.seedSystemDoc('member-2', { team: 'team-123' });

      // Act
      await teamService.leaveTeam('owner-user');

      // Assert - team should be deleted
      const teamDoc = await fakeRepo.getTeamDocument('team-123');
      expect(teamDoc).toBeNull();

      // Verify all members' system docs were updated
      const ownerDoc = await fakeRepo.getSystemDocument('owner-user');
      const member1Doc = await fakeRepo.getSystemDocument('member-1');
      const member2Doc = await fakeRepo.getSystemDocument('member-2');

      expect(ownerDoc?.team).toBeNull();
      expect(member1Doc?.team).toBeNull();
      expect(member2Doc?.team).toBeNull();
    });

    it('should reject if user is not in a team', async () => {
      // Arrange - user not in any team
      fakeRepo.seedSystemDoc('user-1', {});

      // Act & Assert
      await expect(teamService.leaveTeam('user-1')).rejects.toThrow('User is not in a team');
    });
  });

  describe('Transaction Atomicity', () => {
    it('should rollback on error during team creation', async () => {
      // Arrange - no cooldown issues
      fakeRepo.seedSystemDoc('user-1', {});

      // Mock UIDGenerator to throw error after being called
      const UIDGenerator = await import('../../../src/token/UIDGenerator');
      vi.spyOn(UIDGenerator.default.prototype, 'generate').mockRejectedValueOnce(
        new Error('UID generation failed')
      );

      // Act & Assert
      await expect(teamService.createTeam('user-1', { maximumMembers: 10 })).rejects.toThrow();

      // Verify no changes were made
      const systemDoc = await fakeRepo.getSystemDocument('user-1');
      expect(systemDoc?.team).toBeUndefined();
    });
  });
});
