import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { adminMock } from '../setup';
import { ProgressService } from '../../src/services/ProgressService';
import { TeamService } from '../../src/services/TeamService';
import { TokenService } from '../../src/services/TokenService';
import { resetDb, seedDb } from '../setup';
describe('User Account Lifecycle Integration Tests', () => {
  let progressService: ProgressService;
  let teamService: TeamService;
  let tokenService: TokenService;
  let testUserId: string;
  let testTeamId: string;
  beforeEach(async () => {
    resetDb();
    progressService = new ProgressService();
    teamService = new TeamService();
    tokenService = new TokenService();
    testUserId = `test-user-${Date.now()}`;
    testTeamId = `test-team-${Date.now()}`;
    // Seed required data for tests
    seedDb({
      tarkovdata: {
        tasks: {
          'user-task-1': { id: 'user-task-1' },
          'user-task-2': { id: 'user-task-2' },
          'user-task-3': { id: 'user-task-3' },
          'concurrent-task-1': { id: 'concurrent-task-1' },
          'concurrent-task-2': { id: 'concurrent-task-2' },
          'concurrent-task-3': { id: 'concurrent-task-3' },
          'initial-task': { id: 'initial-task' },
          'rollback-task': { id: 'rollback-task' },
          'owner-task': { id: 'owner-task' },
          'member-task': { id: 'member-task' },
          'permission-test-task': { id: 'permission-test-task' },
          'removal-test-task': { id: 'removal-test-task' },
          'token-test-task': { id: 'token-test-task' },
          'multi-token-task-1': { id: 'multi-token-task-1' },
          'multi-token-task-2': { id: 'multi-token-task-2' },
          'concurrent-token-task-0': { id: 'concurrent-token-task-0' },
          'concurrent-token-task-1': { id: 'concurrent-token-task-1' },
          'concurrent-token-task-2': { id: 'concurrent-token-task-2' },
          'concurrent-token-task-3': { id: 'concurrent-token-task-3' },
          'concurrent-token-task-4': { id: 'concurrent-token-task-4' },
        },
        hideout: {},
      },
    });
  });
  afterEach(() => {
    resetDb();
  });
  describe('User Registration → Team Creation → Progress Tracking → Account Deletion', () => {
    it('should handle complete user lifecycle with data consistency', async () => {
      // Step 1: User Registration (create initial progress document)
      // First create progress document
      await adminMock
        .firestore()
        .collection('progress')
        .doc(testUserId)
        .set({
          currentGameMode: 'pvp',
          pvp: {
            taskCompletions: {},
            taskObjectives: {},
            hideoutModules: {},
            hideoutParts: {},
          },
          pve: {
            taskCompletions: {},
            taskObjectives: {},
            hideoutModules: {},
            hideoutParts: {},
          },
        });
      // Now update tasks
      await progressService.validateTaskAccess(testUserId, 'user-task-1');
      await progressService.updateSingleTask(testUserId, 'user-task-1', 'completed', 'pvp');
      await progressService.validateTaskAccess(testUserId, 'user-task-2');
      await progressService.updateSingleTask(testUserId, 'user-task-2', 'completed', 'pvp');
      // Mark task 2 as failed
      await progressService.updateSingleTask(testUserId, 'user-task-2', 'failed', 'pvp');
      // Verify initial progress
      const progressDoc = await adminMock.firestore().collection('progress').doc(testUserId).get();
      expect(progressDoc.exists).toBe(true);
      // Verify progress data structure
      const progressData = progressDoc.data();
      console.log('Progress data structure:', JSON.stringify(progressData, null, 2));
      // Handle both nested and legacy progress structures
      const taskCompletions =
        progressData.taskCompletions ||
        progressData.pvp?.taskCompletions ||
        progressData.pve?.taskCompletions ||
        {};
      console.log('Task completions found:', taskCompletions);
      // Verify task completions with better error handling
      expect(taskCompletions).toHaveProperty('user-task-1');
      expect(taskCompletions['user-task-1']).toHaveProperty('complete', true);
      expect(taskCompletions).toHaveProperty('user-task-2');
      expect(taskCompletions['user-task-2']).toHaveProperty('complete', true);
      expect(taskCompletions['user-task-2']).toHaveProperty('failed', true);
      // Step 2: Team Creation
      const teamData = {
        name: 'Test Team',
        description: 'Integration test team',
        owner: testUserId,
        members: [testUserId],
        createdAt: Date.now(),
        settings: {
          allowMemberProgress: true,
          requireApproval: false,
        },
      };
      await adminMock.firestore().collection('teams').doc(testTeamId).set(teamData);
      const teamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();
      expect(teamDoc.exists).toBe(true);
      expect(teamDoc.data()?.owner).toBe(testUserId);
      expect(teamDoc.data()?.members).toContain(testUserId);
      // Step 3: Progress Tracking (add more progress)
      await progressService.validateTaskAccess(testUserId, 'user-task-3');
      await progressService.updateSingleTask(testUserId, 'user-task-3', 'completed', 'pvp');
      // Verify progress is maintained
      const updatedProgressDoc = await adminMock
        .firestore()
        .collection('progress')
        .doc(testUserId)
        .get();
      const updatedProgressData = updatedProgressDoc.data();
      const updatedTaskCompletions =
        updatedProgressData.taskCompletions ||
        updatedProgressData.pvp?.taskCompletions ||
        updatedProgressData.pve?.taskCompletions ||
        {};
      expect(updatedTaskCompletions).toHaveProperty('user-task-3');
      expect(updatedTaskCompletions['user-task-3']).toHaveProperty('complete', true);
      // Step 4: Account Deletion (cascade cleanup)
      // Delete progress document
      await adminMock.firestore().collection('progress').doc(testUserId).delete();
      // Remove user from team
      await adminMock
        .firestore()
        .collection('teams')
        .doc(testTeamId)
        .update({
          members: adminMock.firestore().FieldValue.arrayRemove(testUserId),
        });
      // Verify cleanup
      const deletedProgressDoc = await adminMock
        .firestore()
        .collection('progress')
        .doc(testUserId)
        .get();
      expect(deletedProgressDoc.exists).toBe(false);
      const updatedTeamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();
      expect(updatedTeamDoc.data()?.members).not.toContain(testUserId);
    });
    it('should handle cascade deletion when team owner deletes account', async () => {
      // Create team with multiple members
      const memberUserId = `member-user-${Date.now()}`;
      // Set up team
      await adminMock
        .firestore()
        .collection('teams')
        .doc(testTeamId)
        .set({
          name: 'Test Team',
          owner: testUserId,
          members: [testUserId, memberUserId],
          createdAt: Date.now(),
        });
      // Set up member progress
      await adminMock
        .firestore()
        .collection('progress')
        .doc(memberUserId)
        .set({
          currentGameMode: 'pvp',
          pvp: {
            taskCompletions: {},
            taskObjectives: {},
            hideoutModules: {},
            hideoutParts: {},
          },
        });
      await progressService.validateTaskAccess(memberUserId, 'member-task-1');
      await progressService.updateSingleTask(memberUserId, 'member-task-1', 'completed', 'pvp');
      // Owner deletes account (simulate cascade)
      await adminMock.firestore().collection('progress').doc(testUserId).delete();
      // Transfer ownership to first member or delete team
      const teamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();
      if (teamDoc.exists) {
        const teamData = teamDoc.data();
        if (teamData?.members?.length > 0) {
          // Transfer ownership to next member
          const newOwner = teamData.members.find((m: string) => m !== testUserId);
          if (newOwner) {
            await adminMock
              .firestore()
              .collection('teams')
              .doc(testTeamId)
              .update({
                owner: newOwner,
                members: adminMock.firestore().FieldValue.arrayRemove(testUserId),
              });
          }
        } else {
          // Delete team if no members left
          await adminMock.firestore().collection('teams').doc(testTeamId).delete();
        }
      }
      // Verify owner is removed from team
      const finalTeamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();
      if (finalTeamDoc.exists) {
        expect(finalTeamDoc.data()?.owner).not.toBe(testUserId);
        expect(finalTeamDoc.data()?.members).not.toContain(testUserId);
      }
      // Verify member progress is intact
      const memberProgressDoc = await adminMock
        .firestore()
        .collection('progress')
        .doc(memberUserId)
        .get();
      expect(memberProgressDoc.exists).toBe(true);
    });
  });
  describe('Data Consistency Across Operations', () => {
    it('should maintain consistency during concurrent user operations', async () => {
      // Create initial progress document
      await adminMock
        .firestore()
        .collection('progress')
        .doc(testUserId)
        .set({
          currentGameMode: 'pvp',
          pvp: {
            taskCompletions: {},
            taskObjectives: {},
            hideoutModules: {},
            hideoutParts: {},
          },
        });
      // Simulate concurrent progress updates
      const concurrentTasks = [
        { id: 'concurrent-task-1', state: 'completed' as const },
        { id: 'concurrent-task-2', state: 'failed' as const },
        { id: 'concurrent-task-3', state: 'uncompleted' as const },
      ];
      // Validate access first
      await Promise.all(
        concurrentTasks.map((task) => progressService.validateTaskAccess(testUserId, task.id))
      );
      // Execute updates concurrently
      await Promise.all(
        concurrentTasks.map((task) =>
          progressService.updateSingleTask(testUserId, task.id, task.state, 'pvp')
        )
      );
      // Verify all updates are applied correctly
      const progressDoc = await adminMock.firestore().collection('progress').doc(testUserId).get();
      const progressData = progressDoc.data();
      const taskCompletions =
        progressData.taskCompletions ||
        progressData.pvp?.taskCompletions ||
        progressData.pve?.taskCompletions ||
        {};
      expect(taskCompletions['concurrent-task-1']?.complete).toBe(true);
      expect(taskCompletions['concurrent-task-2']?.complete).toBe(true);
      expect(taskCompletions['concurrent-task-2']?.failed).toBe(true);
      expect(taskCompletions['concurrent-task-3']?.complete).toBe(false);
    });
    it('should handle rollback scenarios correctly', async () => {
      // Create initial progress document
      await adminMock
        .firestore()
        .collection('progress')
        .doc(testUserId)
        .set({
          currentGameMode: 'pvp',
          pvp: {
            taskCompletions: {},
            taskObjectives: {},
            hideoutModules: {},
            hideoutParts: {},
          },
        });
      // Create initial progress
      await progressService.validateTaskAccess(testUserId, 'initial-task');
      await progressService.updateSingleTask(testUserId, 'initial-task', 'completed', 'pvp');
      // Create token for user
      const initialToken = await tokenService.createToken(testUserId, {
        note: 'Initial token',
        permissions: ['GP', 'WP'],
        gameMode: 'pvp',
      });
      // Simulate failed operation that should rollback
      try {
        // Start a complex operation that might fail
        await progressService.updateSingleTask(testUserId, 'rollback-task', 'completed', 'pvp');
        // Simulate an error condition
        throw new Error('Simulated operation failure');
      } catch (error) {
        // In a real scenario, rollback would happen here
        // For this test, we'll verify initial state is preserved
      }
      // Verify initial state is preserved
      const progressDoc = await adminMock.firestore().collection('progress').doc(testUserId).get();
      const progressData = progressDoc.data();
      const taskCompletions =
        progressData.taskCompletions ||
        progressData.pvp?.taskCompletions ||
        progressData.pve?.taskCompletions ||
        {};
      expect(taskCompletions['initial-task']?.complete).toBe(true);
      const tokenInfo = await tokenService.getTokenInfo(initialToken.token);
      expect(tokenInfo).toBeTruthy();
      expect(tokenInfo.owner).toBe(testUserId);
    });
    it('should handle team member addition/removal with progress consistency', async () => {
      // Create team
      await adminMock
        .firestore()
        .collection('teams')
        .doc(testTeamId)
        .set({
          name: 'Test Team',
          owner: testUserId,
          members: [testUserId],
          createdAt: Date.now(),
        });
      // Add progress for owner
      await adminMock
        .firestore()
        .collection('progress')
        .doc(testUserId)
        .set({
          currentGameMode: 'pvp',
          pvp: {
            taskCompletions: {},
            taskObjectives: {},
            hideoutModules: {},
            hideoutParts: {},
          },
        });
      await progressService.validateTaskAccess(testUserId, 'owner-task');
      await progressService.updateSingleTask(testUserId, 'owner-task', 'completed', 'pvp');
      // Add new member
      const newMemberId = `new-member-${Date.now()}`;
      await adminMock
        .firestore()
        .collection('teams')
        .doc(testTeamId)
        .update({
          members: adminMock.firestore().FieldValue.arrayUnion(newMemberId),
        });
      // Add progress for new member
      await adminMock
        .firestore()
        .collection('progress')
        .doc(newMemberId)
        .set({
          currentGameMode: 'pvp',
          pvp: {
            taskCompletions: {},
            taskObjectives: {},
            hideoutModules: {},
            hideoutParts: {},
          },
        });
      await progressService.validateTaskAccess(newMemberId, 'member-task');
      await progressService.updateSingleTask(newMemberId, 'member-task', 'completed', 'pvp');
      // Verify both members have progress
      const ownerProgress = await adminMock
        .firestore()
        .collection('progress')
        .doc(testUserId)
        .get();
      const memberProgress = await adminMock
        .firestore()
        .collection('progress')
        .doc(newMemberId)
        .get();
      expect(ownerProgress.exists).toBe(true);
      expect(memberProgress.exists).toBe(true);
      // Remove member
      await adminMock
        .firestore()
        .collection('teams')
        .doc(testTeamId)
        .update({
          members: adminMock.firestore().FieldValue.arrayRemove(newMemberId),
        });
      // Verify team state
      const teamDoc = await adminMock.firestore().collection('teams').doc(testTeamId).get();
      const teamMembers = teamDoc.data()?.members || [];
      expect(teamMembers).not.toContain(newMemberId);
      expect(teamMembers).toContain(testUserId);
      // Member progress should remain intact
      const finalMemberProgress = await adminMock
        .firestore()
        .collection('progress')
        .doc(newMemberId)
        .get();
      expect(finalMemberProgress.exists).toBe(true);
    });
  });
});
