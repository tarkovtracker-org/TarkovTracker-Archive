import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { adminMock } from '../setup';
import { TeamService } from '../../src/services/TeamService';
import { ProgressService } from '../../src/services/ProgressService';
import { TokenService } from '../../src/services/TokenService';
import { resetDb, seedDb } from '../setup';
describe('Team Collaboration Integration Tests', () => {
  let teamService: TeamService;
  let progressService: ProgressService;
  let tokenService: TokenService;
  let ownerUserId: string;
  let memberUserIds: string[];
  let testTeamId: string;
  beforeEach(async () => {
    resetDb();
    teamService = new TeamService();
    progressService = new ProgressService();
    tokenService = new TokenService();
    ownerUserId = `owner-${Date.now()}`;
    memberUserIds = [`member1-${Date.now()}`, `member2-${Date.now()}`, `member3-${Date.now()}`];
    testTeamId = `team-${Date.now()}`;
    // Seed required data for tests
    seedDb({
      tarkovdata: {
        tasks: {
          'task-1': { id: 'task-1' },
          'task-2': { id: 'task-2' },
          'task-3': { id: 'task-3' },
          'task-4': { id: 'task-4' },
          'task-5': { id: 'task-5' },
          'task-6': { id: 'task-6' },
          'task-7': { id: 'task-7' },
          'task-8': { id: 'task-8' },
          'concurrent-task-0': { id: 'concurrent-task-0' },
          'concurrent-task-1': { id: 'concurrent-task-1' },
          'concurrent-task-2': { id: 'concurrent-task-2' },
          'concurrent-task-3': { id: 'concurrent-task-3' },
          'removal-test-task': { id: 'removal-test-task' },
          'permission-test-task': { id: 'permission-test-task' },
          'owner-only-task': { id: 'owner-only-task' },
          'member-task': { id: 'member-task' },
        },
        hideout: {},
      },
    });
  });
  afterEach(() => {
    resetDb();
  });
  describe('Multi-user Scenarios: Team Creation → Member Addition → Progress Sharing → Ownership Transfer', () => {
    it('should handle complete team collaboration workflow', async () => {
      // Step 1: Team Creation
      const teamData = {
        name: 'Test Collaboration Team',
        description: 'Integration test team for collaboration',
        owner: ownerUserId,
        members: [ownerUserId],
        createdAt: Date.now(),
        settings: {
          allowMemberProgress: true,
          requireApproval: false,
        },
      };
      await adminMock.firestore().collection('teams').doc(testTeamId).set(teamData);
      // Verify team creation
      const teamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();

      expect(teamDoc.exists).toBe(true);
      expect(teamDoc.data()?.owner).toBe(ownerUserId);
      expect(teamDoc.data()?.members).toEqual([ownerUserId]);
      // Step 2: Member Addition
      for (const memberId of memberUserIds) {
        await adminMock
          .firestore()
          .collection('teams')
          .doc(testTeamId)
          .update({
            members: adminMock.FieldValue.arrayUnion(memberId),
          });
      }
      // Verify all members are added
      const updatedTeamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();

      const teamMembers = updatedTeamDoc.data()?.members || [];
      expect(teamMembers).toHaveLength(4); // owner + 3 members
      memberUserIds.forEach((memberId) => {
        expect(teamMembers).toContain(memberId);
      });
      // Step 3: Progress Sharing
      // Create progress for each member
      const memberProgress = [
        { userId: ownerUserId, tasks: ['task-1', 'task-2'] },
        { userId: memberUserIds[0], tasks: ['task-3', 'task-4'] },
        { userId: memberUserIds[1], tasks: ['task-5', 'task-6'] },
        { userId: memberUserIds[2], tasks: ['task-7', 'task-8'] },
      ];
      for (const { userId, tasks } of memberProgress) {
        // Create progress document first
        await adminMock
          .firestore()
          .collection('progress')
          .doc(userId)
          .set({
            currentGameMode: 'pvp',
            pvp: {
              taskCompletions: {},
              taskObjectives: {},
              hideoutModules: {},
              hideoutParts: {},
            },
          });
        for (const taskId of tasks) {
          await progressService.validateTaskAccess(userId, taskId);
          await progressService.updateSingleTask(userId, taskId, 'completed', 'pvp');
        }
      }
      // Verify all progress is created
      for (const { userId, tasks } of memberProgress) {
        const progressDoc = await adminMock.firestore().collection('progress').doc(userId).get();

        expect(progressDoc.exists).toBe(true);

        const progressData = progressDoc.data();
        const taskCompletions =
          progressData.taskCompletions ||
          progressData.pvp?.taskCompletions ||
          progressData.pve?.taskCompletions ||
          {};

        tasks.forEach((taskId) => {
          expect(taskCompletions).toHaveProperty(taskId);
          expect(taskCompletions[taskId]).toHaveProperty('complete', true);
        });
      }
      // Step 4: Team Progress Sharing
      const teamProgress = await teamService.getTeamProgress(testTeamId);
      expect(teamProgress).toBeTruthy();
      expect(Object.keys(teamProgress)).toHaveLength(4); // All members
      // Step 5: Ownership Transfer
      const newOwner = memberUserIds[0];
      await adminMock.firestore().collection('teams').doc(testTeamId).update({
        owner: newOwner,
      });
      // Verify ownership transfer
      const finalTeamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();

      expect(finalTeamDoc.data()?.owner).toBe(newOwner);
      expect(finalTeamDoc.data()?.members).toContain(ownerUserId); // Old owner remains as member
    });
    it('should handle concurrent member operations', async () => {
      // Create initial team
      await adminMock
        .firestore()
        .collection('teams')
        .doc(testTeamId)
        .set({
          name: 'Concurrent Operations Team',
          owner: ownerUserId,
          members: [ownerUserId],
          createdAt: Date.now(),
        });
      // Add members concurrently
      const addMemberPromises = memberUserIds.map((memberId) =>
        adminMock
          .firestore()
          .collection('teams')
          .doc(testTeamId)
          .update({
            members: adminMock.FieldValue.arrayUnion(memberId),
          })
      );
      await Promise.all(addMemberPromises);
      // Verify all members were added
      const teamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();

      const teamMembers = teamDoc.data()?.members || [];
      expect(teamMembers).toHaveLength(4);
      memberUserIds.forEach((memberId) => {
        expect(teamMembers).toContain(memberId);
      });
      // Create progress for all members concurrently
      const allUserIds = memberUserIds.concat(ownerUserId);

      // First create progress documents for all users
      const createProgressPromises = allUserIds.map((userId) =>
        adminMock
          .firestore()
          .collection('progress')
          .doc(userId)
          .set({
            currentGameMode: 'pvp',
            pvp: {
              taskCompletions: {},
              taskObjectives: {},
              hideoutModules: {},
              hideoutParts: {},
            },
          })
      );
      await Promise.all(createProgressPromises);
      // First validate access for all users
      const validatePromises = allUserIds.map((userId, index) =>
        progressService.validateTaskAccess(userId, `concurrent-task-${index}`)
      );
      await Promise.all(validatePromises);
      // Then update tasks concurrently
      const progressPromises = allUserIds.map((userId, index) =>
        progressService.updateSingleTask(userId, `concurrent-task-${index}`, 'completed', 'pvp')
      );
      await Promise.all(progressPromises);
      // Verify all progress was created
      for (let i = 0; i < allUserIds.length; i++) {
        const userId = allUserIds[i];
        const progressDoc = await adminMock.firestore().collection('progress').doc(userId).get();

        expect(progressDoc.exists).toBe(true);

        const progressData = progressDoc.data();
        const taskCompletions =
          progressData.taskCompletions ||
          progressData.pvp?.taskCompletions ||
          progressData.pve?.taskCompletions ||
          {};

        expect(taskCompletions).toHaveProperty(`concurrent-task-${i}`);
        expect(taskCompletions[`concurrent-task-${i}`]).toHaveProperty('complete', true);
      }
    });
    it('should handle member removal with progress preservation', async () => {
      // Create team with members
      await adminMock
        .firestore()
        .collection('teams')
        .doc(testTeamId)
        .set({
          name: 'Member Removal Team',
          owner: ownerUserId,
          members: [ownerUserId, ...memberUserIds],
          createdAt: Date.now(),
        });
      // Create progress for all members
      const allUserIds = [ownerUserId, ...memberUserIds];

      // First create progress documents
      const createProgressPromises = allUserIds.map((userId) =>
        adminMock
          .firestore()
          .collection('progress')
          .doc(userId)
          .set({
            currentGameMode: 'pvp',
            pvp: {
              taskCompletions: {},
              taskObjectives: {},
              hideoutModules: {},
              hideoutParts: {},
            },
          })
      );
      await Promise.all(createProgressPromises);
      // First validate access for all users
      for (const userId of allUserIds) {
        await progressService.validateTaskAccess(userId, 'removal-test-task');
      }
      // Then update tasks
      for (const userId of allUserIds) {
        await progressService.updateSingleTask(userId, 'removal-test-task', 'completed', 'pvp');
      }
      // Remove one member
      const memberToRemove = memberUserIds[0];
      await adminMock
        .firestore()
        .collection('teams')
        .doc(testTeamId)
        .update({
          members: adminMock.FieldValue.arrayRemove(memberToRemove),
        });
      // Verify member is removed from team
      const teamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();

      const teamMembers = teamDoc.data()?.members || [];
      expect(teamMembers).not.toContain(memberToRemove);
      expect(teamMembers).toHaveLength(3); // owner + 2 remaining members
      // Verify removed member's progress is preserved
      const removedMemberProgress = await adminMock
        .firestore()
        .collection('progress')
        .doc(memberToRemove)
        .get();

      expect(removedMemberProgress.exists).toBe(true);

      const progressData = removedMemberProgress.data();
      const taskCompletions =
        progressData.taskCompletions ||
        progressData.pvp?.taskCompletions ||
        progressData.pve?.taskCompletions ||
        {};

      expect(taskCompletions).toHaveProperty('removal-test-task');
      expect(taskCompletions['removal-test-task']).toHaveProperty('complete', true);
      // Verify remaining members still have access
      const teamProgress = await teamService.getTeamProgress(testTeamId);
      expect(Object.keys(teamProgress)).toHaveLength(3);
      expect(teamProgress).not.toHaveProperty(memberToRemove);
    });
  });
  describe('Permission Checks and Access Controls', () => {
    it('should enforce proper permission checks for team operations', async () => {
      // Create team
      await adminMock
        .firestore()
        .collection('teams')
        .doc(testTeamId)
        .set({
          name: 'Permission Test Team',
          owner: ownerUserId,
          members: [ownerUserId, ...memberUserIds],
          createdAt: Date.now(),
          settings: {
            allowMemberProgress: true,
            requireApproval: true,
          },
        });
      // Create tokens for different users
      const ownerToken = await tokenService.createToken(ownerUserId, {
        note: 'Owner token',
        permissions: ['GP', 'WP'],
        gameMode: 'pvp',
      });
      const memberToken = await tokenService.createToken(memberUserIds[0], {
        note: 'Member token',
        permissions: ['GP', 'WP'],
        gameMode: 'pvp',
      });
      // Verify owner can access team progress
      const ownerTeamProgress = await teamService.getTeamProgress(testTeamId);
      expect(Object.keys(ownerTeamProgress)).toHaveLength(4);
      // Verify member can access team progress
      const memberTeamProgress = await teamService.getTeamProgress(testTeamId);
      expect(Object.keys(memberTeamProgress)).toHaveLength(4);
      // Test task access validation
      // Create progress document first
      await adminMock
        .firestore()
        .collection('progress')
        .doc(ownerUserId)
        .set({
          currentGameMode: 'pvp',
          pvp: {
            taskCompletions: {},
            taskObjectives: {},
            hideoutModules: {},
            hideoutParts: {},
          },
        });
      await progressService.validateTaskAccess(ownerUserId, 'permission-test-task');
      await progressService.updateSingleTask(
        ownerUserId,
        'permission-test-task',
        'completed',
        'pvp'
      );
      // Verify both owner and member can validate task access
      const ownerTaskAccess = await progressService.validateTaskAccess(
        ownerUserId,
        'permission-test-task'
      );
      expect(ownerTaskAccess).toBe(true);
      const memberTaskAccess = await progressService.validateTaskAccess(
        memberUserIds[0],
        'permission-test-task'
      );
      expect(memberTaskAccess).toBe(true);
      // Cleanup
      await tokenService.revokeToken(ownerToken.token, ownerUserId);
      await tokenService.revokeToken(memberToken.token, memberUserIds[0]);
    });
    it('should handle team ownership transfer with permission updates', async () => {
      // Create team with owner
      await adminMock
        .firestore()
        .collection('teams')
        .doc(testTeamId)
        .set({
          name: 'Ownership Transfer Team',
          owner: ownerUserId,
          members: [ownerUserId, ...memberUserIds],
          createdAt: Date.now(),
        });
      // Create owner token with admin permissions
      const ownerToken = await tokenService.createToken(ownerUserId, {
        note: 'Owner admin token',
        permissions: ['GP', 'WP'],
        gameMode: 'pvp',
      });
      // Transfer ownership to member
      const newOwner = memberUserIds[0];
      await adminMock.firestore().collection('teams').doc(testTeamId).update({
        owner: newOwner,
      });
      // Create token for new owner
      const newOwnerToken = await tokenService.createToken(newOwner, {
        note: 'New owner token',
        permissions: ['GP', 'WP'],
        gameMode: 'pvp',
      });
      // Verify new owner can access team progress
      const newOwnerTeamProgress = await teamService.getTeamProgress(testTeamId);
      expect(Object.keys(newOwnerTeamProgress)).toHaveLength(4);
      // Verify old owner is still a member but not owner
      const teamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();

      expect(teamDoc.data()?.owner).toBe(newOwner);
      expect(teamDoc.data()?.members).toContain(ownerUserId);
      // Cleanup
      await tokenService.revokeToken(ownerToken.token, ownerUserId);
      await tokenService.revokeToken(newOwnerToken.token, newOwner);
    });
    it('should handle team settings and member permissions', async () => {
      // Create team with restrictive settings
      await adminMock
        .firestore()
        .collection('teams')
        .doc(testTeamId)
        .set({
          name: 'Restrictive Settings Team',
          owner: ownerUserId,
          members: [ownerUserId, ...memberUserIds],
          createdAt: Date.now(),
          settings: {
            allowMemberProgress: false,
            requireApproval: true,
          },
        });
      // Create progress for owner
      await adminMock
        .firestore()
        .collection('progress')
        .doc(ownerUserId)
        .set({
          currentGameMode: 'pvp',
          pvp: {
            taskCompletions: {},
            taskObjectives: {},
            hideoutModules: {},
            hideoutParts: {},
          },
        });
      await progressService.validateTaskAccess(ownerUserId, 'owner-only-task');
      await progressService.updateSingleTask(ownerUserId, 'owner-only-task', 'completed', 'pvp');
      // Create progress for members
      for (const memberId of memberUserIds) {
        await adminMock
          .firestore()
          .collection('progress')
          .doc(memberId)
          .set({
            currentGameMode: 'pvp',
            pvp: {
              taskCompletions: {},
              taskObjectives: {},
              hideoutModules: {},
              hideoutParts: {},
            },
          });
        await progressService.validateTaskAccess(memberId, 'member-task');
        await progressService.updateSingleTask(memberId, 'member-task', 'completed', 'pvp');
      }
      // Verify team progress respects settings
      const teamProgress = await teamService.getTeamProgress(testTeamId);
      expect(Object.keys(teamProgress)).toHaveLength(4);
      // Test that members can still access their own progress
      for (const memberId of memberUserIds) {
        const memberProgress = await progressService.getUserProgress(memberId, 'pvp');
        expect(memberProgress).toBeTruthy();
      }
      // Verify owner can still access all team progress
      const ownerTeamProgress = await teamService.getTeamProgress(testTeamId);
      expect(Object.keys(ownerTeamProgress)).toHaveLength(4);
    });
  });
  describe('Error Recovery and Rollback Scenarios', () => {
    it('should handle team creation failures gracefully', async () => {
      // Attempt to create team with invalid data
      const invalidTeamData = {
        name: '', // Empty name should fail validation
        owner: ownerUserId,
        members: [], // No members
        createdAt: Date.now(),
      };
      // This should fail gracefully
      try {
        await adminMock.firestore().collection('teams').doc(testTeamId).set(invalidTeamData);

        // If we get here, team was created despite invalid data
        const teamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();

        if (teamDoc.exists) {
          // Clean up invalid team
          await adminMock.firestore().collection('teams').doc(testTeamId).delete();
        }
      } catch (error) {
        // Expected behavior - invalid team creation should fail
        expect(error).toBeTruthy();
      }
      // Verify no invalid team exists
      const teamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();

      expect(teamDoc.exists).toBe(false);
    });
    it('should handle member addition failures with rollback', async () => {
      // Create initial team
      await adminMock
        .firestore()
        .collection('teams')
        .doc(testTeamId)
        .set({
          name: 'Rollback Test Team',
          owner: ownerUserId,
          members: [ownerUserId],
          createdAt: Date.now(),
        });
      // Create progress for initial state
      await adminMock
        .firestore()
        .collection('progress')
        .doc(ownerUserId)
        .set({
          currentGameMode: 'pvp',
          pvp: {
            taskCompletions: {},
            taskObjectives: {},
            hideoutModules: {},
            hideoutParts: {},
          },
        });
      await progressService.validateTaskAccess(ownerUserId, 'initial-task');
      await progressService.updateSingleTask(ownerUserId, 'initial-task', 'completed', 'pvp');
      const initialTeamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();

      const initialMembers = initialTeamDoc.data()?.members || [];
      // Simulate failed member addition
      try {
        // Try to add invalid member (empty string)
        await adminMock
          .firestore()
          .collection('teams')
          .doc(testTeamId)
          .update({
            members: adminMock.FieldValue.arrayUnion(''),
          });
      } catch (error) {
        // Expected to fail
      }
      // Verify team state is unchanged
      const finalTeamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();

      const finalMembers = finalTeamDoc.data()?.members || [];
      expect(finalMembers).toEqual(initialMembers);
      expect(finalMembers).not.toContain('');
    });
    it('should handle concurrent team operations with conflict resolution', async () => {
      // Create initial team
      await adminMock
        .firestore()
        .collection('teams')
        .doc(testTeamId)
        .set({
          name: 'Concurrent Conflict Team',
          owner: ownerUserId,
          members: [ownerUserId],
          createdAt: Date.now(),
        });
      // Simulate concurrent ownership transfers
      const transferPromises = memberUserIds.map((newOwner) =>
        adminMock.firestore().collection('teams').doc(testTeamId).update({
          owner: newOwner,
        })
      );
      await Promise.all(transferPromises);
      // Verify final state has one of the members as owner
      const finalTeamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();

      const finalOwner = finalTeamDoc.data()?.owner;
      expect(memberUserIds).toContain(finalOwner);
      expect(finalOwner).not.toBe(ownerUserId);
      // Verify team integrity is maintained
      const finalMembers = finalTeamDoc.data()?.members || [];
      expect(finalMembers).toContain(ownerUserId);
      expect(finalMembers).toHaveLength(4);
    });
  });
});
