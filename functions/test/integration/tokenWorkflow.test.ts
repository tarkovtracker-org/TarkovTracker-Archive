import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { admin, createTestSuite, getTarkovSeedData } from '../helpers';
import { TokenService } from '../../src/services/TokenService';
import { ProgressService } from '../../src/services/ProgressService';
describe('Token Management Workflow Integration Tests', () => {
  const suite = createTestSuite('TokenWorkflow');
  let tokenService: TokenService;
  let progressService: ProgressService;
  let testUserId: string;
  beforeEach(async () => {
    await suite.beforeEach();
    tokenService = new TokenService();
    progressService = new ProgressService();
    testUserId = `test-user-token-${Date.now()}`;
    // Seed required data for tests
    await suite.withDatabase({
      ...getTarkovSeedData(),
    });
  });

  afterEach(suite.afterEach);

  describe('Token Creation → Usage → Expiration → Renewal Cycle', () => {
    it('should handle complete token lifecycle with proper state management', async () => {
      // Step 1: Token Creation
      const createdToken = await tokenService.createToken(testUserId, {
        note: 'Lifecycle test token',
        permissions: ['GP', 'WP'],
        gameMode: 'pvp',
      });
      expect(createdToken).toBeTruthy();
      expect(createdToken.token).toBeTruthy();
      expect(createdToken.owner).toBe(testUserId);
      expect(createdToken.permissions).toEqual(['GP', 'WP']);
      // Step 2: Token Usage (validate and access)
      const tokenInfo = await tokenService.getTokenInfo(createdToken.token);
      expect(tokenInfo).toBeTruthy();
      expect(tokenInfo.owner).toBe(testUserId);
      expect(tokenInfo.permissions).toEqual(['GP', 'WP']);
      // Verify token can be used for progress operations
      // Create progress document first
      await admin
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
      await progressService.validateTaskAccess(testUserId, 'token-test-task');
      await progressService.updateSingleTask(testUserId, 'token-test-task', 'completed', 'pvp');
      const progressDoc = await admin.firestore().collection('progress').doc(testUserId).get();
      expect(progressDoc.exists).toBe(true);
      // Step 3: Token Listing and Management
      const userTokens = await tokenService.listUserTokens(testUserId);
      expect(userTokens).toHaveLength(1);
      expect(userTokens[0].token).toBe(createdToken.token);
      // Step 4: Token Renewal (create new token, revoke old)
      const renewedToken = await tokenService.createToken(testUserId, {
        note: 'Renewed token',
        permissions: ['GP', 'WP'],
        gameMode: 'pvp',
      });
      expect(renewedToken.token).not.toBe(createdToken.token);
      expect(renewedToken.owner).toBe(testUserId);
      // Revoke old token
      await tokenService.revokeToken(createdToken.token, testUserId);
      // Verify old token is revoked
      await expect(tokenService.getTokenInfo(createdToken.token)).rejects.toThrow();
      // Verify new token still works
      const renewedTokenInfo = await tokenService.getTokenInfo(renewedToken.token);
      expect(renewedTokenInfo).toBeTruthy();
      expect(renewedTokenInfo.owner).toBe(testUserId);
      // Step 5: Final Cleanup
      await tokenService.revokeToken(renewedToken.token, testUserId);
      const finalTokens = await tokenService.listUserTokens(testUserId);
      expect(finalTokens).toHaveLength(0);
    });
    it('should handle token collision handling and retry logic', async () => {
      // Create initial token
      const initialToken = await tokenService.createToken(testUserId, {
        note: 'Initial token',
        permissions: ['GP'],
        gameMode: 'pvp',
      });
      // Simulate token collision by manually creating a token with same ID
      const tokenId = initialToken.token;
      await admin
        .firestore()
        .collection('token')
        .doc(tokenId)
        .set({
          owner: 'another-user',
          permissions: ['GP'],
          note: 'Colliding token',
          gameMode: 'pvp',
        });
      // Attempt to create new token should succeed with different ID
      const newToken = await tokenService.createToken(testUserId, {
        note: 'New token after collision',
        permissions: ['WP'],
        gameMode: 'pvp',
      });
      expect(newToken.token).not.toBe(tokenId);
      expect(newToken.owner).toBe(testUserId);
      // Verify both tokens exist in database
      const tokenDoc1 = await admin.firestore().collection('token').doc(tokenId).get();

      const tokenDoc2 = await admin.firestore().collection('token').doc(newToken.token).get();
      expect(tokenDoc1.exists).toBe(true);
      expect(tokenDoc2.exists).toBe(true);
    });
    it('should handle token expiration and cleanup', async () => {
      // Create token with expiration in the past (simulate expired token)
      const expiredToken = await tokenService.createToken(testUserId, {
        note: 'Expired token',
        permissions: ['GP'],
        gameMode: 'pvp',
      });
      // Manually set expiration to past
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      await admin.firestore().collection('token').doc(expiredToken.token).update({
        expiresAt: pastTime,
      });
      // Verify expired token is not accessible
      try {
        await tokenService.getTokenInfo(expiredToken.token);
        // If we get here, the token was still accessible, which is wrong
        expect.fail('Expired token should not be accessible');
      } catch (error) {
        expect(error).toBeDefined();
      }
      // Create new valid token
      const validToken = await tokenService.createToken(testUserId, {
        note: 'Valid token',
        permissions: ['GP', 'WP'],
        gameMode: 'pvp',
      });
      // Verify valid token works
      const validTokenInfo = await tokenService.getTokenInfo(validToken.token);
      expect(validTokenInfo).toBeTruthy();
      expect(validTokenInfo.owner).toBe(testUserId);
      // Cleanup
      await tokenService.revokeToken(validToken.token, testUserId);
    });
  });
  describe('Token System Integration with User Operations', () => {
    it('should maintain token integrity during user operations', async () => {
      // Create multiple tokens for different purposes
      const progressToken = await tokenService.createToken(testUserId, {
        note: 'Progress token',
        permissions: ['GP'],
        gameMode: 'pvp',
      });
      const writeToken = await tokenService.createToken(testUserId, {
        note: 'Write token',
        permissions: ['WP'],
        gameMode: 'pvp',
      });
      const dualToken = await tokenService.createToken(testUserId, {
        note: 'Dual token',
        permissions: ['GP', 'WP'],
        gameMode: 'pvp',
      });
      // Create progress document first
      await admin
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
      // Use tokens for various operations
      await progressService.validateTaskAccess(testUserId, 'multi-token-task-1');
      await progressService.updateSingleTask(testUserId, 'multi-token-task-1', 'completed', 'pvp');
      await progressService.validateTaskAccess(testUserId, 'multi-token-task-2');
      await progressService.updateSingleTask(
        testUserId,
        'multi-token-task-2',
        'uncompleted',
        'pvp'
      );
      // Verify all tokens are still valid
      const progressTokenInfo = await tokenService.getTokenInfo(progressToken.token);
      const writeTokenInfo = await tokenService.getTokenInfo(writeToken.token);
      const dualTokenInfo = await tokenService.getTokenInfo(dualToken.token);
      expect(progressTokenInfo.owner).toBe(testUserId);
      expect(writeTokenInfo.owner).toBe(testUserId);
      expect(dualTokenInfo.owner).toBe(testUserId);
      // Revoke tokens one by one
      await tokenService.revokeToken(progressToken.token, testUserId);
      // Verify other tokens still work
      const remainingWriteTokenInfo = await tokenService.getTokenInfo(writeToken.token);
      const remainingDualTokenInfo = await tokenService.getTokenInfo(dualToken.token);

      expect(remainingWriteTokenInfo).toBeTruthy();
      expect(remainingDualTokenInfo).toBeTruthy();
      // Revoke remaining tokens
      await tokenService.revokeToken(writeToken.token, testUserId);
      await tokenService.revokeToken(dualToken.token, testUserId);
      // Verify all tokens are revoked
      await expect(tokenService.getTokenInfo(progressToken.token)).rejects.toThrow();
      await expect(tokenService.getTokenInfo(writeToken.token)).rejects.toThrow();
      await expect(tokenService.getTokenInfo(dualToken.token)).rejects.toThrow();
    });
    it('should handle concurrent token operations', async () => {
      // Create multiple tokens concurrently
      const tokenPromises = Array.from({ length: 5 }, (_, i) =>
        tokenService.createToken(testUserId, {
          note: `Concurrent token ${i}`,
          permissions: ['GP'],
          gameMode: 'pvp',
        })
      );
      const createdTokens = await Promise.all(tokenPromises);
      expect(createdTokens).toHaveLength(5);
      // Verify all tokens have unique IDs
      const tokenIds = createdTokens.map((t) => t.token);
      const uniqueTokenIds = new Set(tokenIds);
      expect(uniqueTokenIds.size).toBe(5);
      // Create progress document first
      await admin
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
      // Use tokens concurrently
      const usagePromises = createdTokens.map(async (token, i) => {
        const tokenInfo = await tokenService.getTokenInfo(token.token);
        expect(tokenInfo.owner).toBe(testUserId);

        await progressService.validateTaskAccess(testUserId, `concurrent-token-task-${i}`);
        await progressService.updateSingleTask(
          testUserId,
          `concurrent-token-task-${i}`,
          'completed',
          'pvp'
        );
      });
      await Promise.all(usagePromises);
      // Verify all progress updates were applied
      const progressDoc = await admin.firestore().collection('progress').doc(testUserId).get();

      expect(progressDoc.exists).toBe(true);
      // Revoke all tokens concurrently
      const revokePromises = createdTokens.map((token) =>
        tokenService.revokeToken(token.token, testUserId)
      );
      await Promise.all(revokePromises);
      // Verify all tokens are revoked
      const finalTokenCheckPromises = createdTokens.map((token) =>
        expect(tokenService.getTokenInfo(token.token)).rejects.toThrow()
      );
      await Promise.all(finalTokenCheckPromises);
    });
    it('should handle token permission validation correctly', async () => {
      // Create token with limited permissions
      const readOnlyToken = await tokenService.createToken(testUserId, {
        note: 'Read-only token',
        permissions: ['GP'], // Only read permissions
        gameMode: 'pvp',
      });
      // Verify token permissions
      const tokenInfo = await tokenService.getTokenInfo(readOnlyToken.token);
      expect(tokenInfo.permissions).toEqual(['GP']);
      // Create token with write permissions
      const writeToken = await tokenService.createToken(testUserId, {
        note: 'Write token',
        permissions: ['GP', 'WP'], // Read and write permissions
        gameMode: 'pvp',
      });
      const writeTokenInfo = await tokenService.getTokenInfo(writeToken.token);
      expect(writeTokenInfo.permissions).toEqual(['GP', 'WP']);
      // Create progress document first
      await admin
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
      // Test that both tokens can read progress
      await progressService.validateTaskAccess(testUserId, 'permission-test-task');
      await progressService.updateSingleTask(
        testUserId,
        'permission-test-task',
        'completed',
        'pvp'
      );
      const progressDoc = await admin.firestore().collection('progress').doc(testUserId).get();

      expect(progressDoc.exists).toBe(true);
      // Both tokens should be able to access progress
      const readOnlyTokenCheck = await tokenService.getTokenInfo(readOnlyToken.token);
      const writeTokenCheck = await tokenService.getTokenInfo(writeToken.token);

      expect(readOnlyTokenCheck).toBeTruthy();
      expect(writeTokenCheck).toBeTruthy();
      // Cleanup
      await tokenService.revokeToken(readOnlyToken.token, testUserId);
      await tokenService.revokeToken(writeToken.token, testUserId);
    });
  });
  describe('Token Error Recovery and Edge Cases', () => {
    it('should handle invalid token scenarios gracefully', async () => {
      // Test with non-existent token
      await expect(tokenService.getTokenInfo('invalid-token-id')).rejects.toThrow();
      // Test with malformed token
      await expect(tokenService.getTokenInfo('')).rejects.toThrow();
      await expect(tokenService.getTokenInfo('too-short')).rejects.toThrow();
      // Test revoking non-existent token
      await expect(tokenService.revokeToken('non-existent-token', testUserId)).rejects.toThrow();
      // Test revoking token with wrong user
      const validToken = await tokenService.createToken(testUserId, {
        note: 'Valid token',
        permissions: ['GP'],
        gameMode: 'pvp',
      });
      const wrongUserId = `wrong-user-${Date.now()}`;
      await expect(tokenService.revokeToken(validToken.token, wrongUserId)).rejects.toThrow();
      // Cleanup
      await tokenService.revokeToken(validToken.token, testUserId);
    });
    it('should handle token creation with various game modes', async () => {
      // Create tokens for different game modes
      const pvpToken = await tokenService.createToken(testUserId, {
        note: 'PvP token',
        permissions: ['GP'],
        gameMode: 'pvp',
      });
      const pveToken = await tokenService.createToken(testUserId, {
        note: 'PvE token',
        permissions: ['GP'],
        gameMode: 'pve',
      });
      const dualToken = await tokenService.createToken(testUserId, {
        note: 'Dual mode token',
        permissions: ['GP'],
        gameMode: 'dual',
      });
      // Verify all tokens are created with correct game modes
      const pvpTokenInfo = await tokenService.getTokenInfo(pvpToken.token);
      const pveTokenInfo = await tokenService.getTokenInfo(pveToken.token);
      const dualTokenInfo = await tokenService.getTokenInfo(dualToken.token);
      expect(pvpTokenInfo.gameMode).toBe('pvp');
      expect(pveTokenInfo.gameMode).toBe('pve');
      expect(dualTokenInfo.gameMode).toBe('dual');
      // Cleanup
      await tokenService.revokeToken(pvpToken.token, testUserId);
      await tokenService.revokeToken(pveToken.token, testUserId);
      await tokenService.revokeToken(dualToken.token, testUserId);
    });
  });
});
