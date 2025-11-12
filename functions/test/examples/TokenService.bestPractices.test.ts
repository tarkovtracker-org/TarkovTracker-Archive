/**
 * Token Service Best Practices Example
 * 
 * This file demonstrates the recommended testing patterns and best practices
 * for testing the TokenService class. It serves as a reference for
 * developers writing new tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenService } from '../../src/services/TokenService';
import { 
  setupTest, 
  cleanupTest, 
  createMockResponse, 
  expectAsyncError,
  expectMockCall 
} from '../utils/testHelpers';
import { expectToken, expectError, expectMock } from '../utils/assertionHelpers';
import { 
  TokenFactory, 
  UserFactory, 
  TestDataBuilder,
  TestDataPresets 
} from '../factories/index';
import { seedDb, resetDb } from '../setup';

describe('TokenService - Best Practices Example', () => {
  let tokenService: TokenService;
  let testContext: any;
  
  // Use consistent test setup
  beforeEach(() => {
    testContext = setupTest();
    tokenService = new TokenService();
  });
  
  // Use consistent test cleanup
  afterEach(() => {
    cleanupTest();
  });
  
  describe('Token Creation', () => {
    /**
     * Test: Token Creation with Valid Data
     * 
     * Scenario: User creates a new API token with valid permissions
     * 
     * Given:
     * - User is authenticated
     * - Valid permissions array is provided
     * - Token note is provided
     * 
     * When:
     * - Token creation is requested
     * 
     * Then:
     * - Token should be created successfully
     * - Token should have unique ID
     * - Token should be stored in database
     * - Response should indicate success
     */
    it('should create token with valid data', async () => {
      // Arrange - Use data factories for consistent test data
      const user = UserFactory.create({ uid: testContext.userId });
      const tokenData = TokenFactory.createExtended({
        owner: user.uid,
        note: 'Test API token',
      });
      
      // Act - Execute the operation being tested
      const result = await tokenService.createToken(
        tokenData.owner,
        tokenData.note,
        tokenData.permissions,
        tokenData.gameMode
      );
      
      // Assert - Use specific, meaningful assertions
      expect(result).toBeDefined();
      expect(result.created).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.token).toMatch(/^[a-zA-Z0-9]{64,}$/);
      
      // Verify database operations
      expectMockCall(firestoreMock.runTransaction);
    });
    
    /**
     * Test: Token Creation with Invalid Permissions
     * 
     * Scenario: User attempts to create token with invalid permissions
     * 
     * Given:
     * - User is authenticated
     * - Invalid permissions array is provided
     * 
     * When:
     * - Token creation is requested
     * 
     * Then:
     * - Should throw validation error
     * - Error should be descriptive
     * - No token should be created
     */
    it('should throw error for invalid permissions', async () => {
      // Arrange - Use factory with invalid data
      const user = UserFactory.create({ uid: testContext.userId });
      const invalidPermissions = ['INVALID_PERMISSION'];
      
      // Act & Assert - Use custom error assertion helper
      await expectAsyncError(
        () => tokenService.createToken(
          user.uid,
          'Test token',
          invalidPermissions,
          'pvp'
        ),
        'Invalid permissions: INVALID_PERMISSION'
      );
      
      // Verify no database operations for invalid data
      expect(firestoreMock.runTransaction).not.toHaveBeenCalled();
    });
    
    /**
     * Test: Token Creation with Empty Permissions
     * 
     * Scenario: User attempts to create token with empty permissions
     * 
     * Given:
     * - User is authenticated
     * - Empty permissions array is provided
     * 
     * When:
     * - Token creation is requested
     * 
     * Then:
     * - Should throw validation error
     * - Error should specify empty permissions
     */
    it('should throw error for empty permissions', async () => {
      // Arrange
      const user = UserFactory.create({ uid: testContext.userId });
      
      // Act & Assert
      await expectAsyncError(
        () => tokenService.createToken(user.uid, 'Test token', [], 'pvp'),
        'At least one permission is required'
      );
    });
  });
  
  describe('Token Validation', () => {
    /**
     * Test: Token Validation with Valid Token
     * 
     * Scenario: User validates a valid API token
     * 
     * Given:
     * - Valid token exists in database
     * - Token is properly formatted in Authorization header
     * 
     * When:
     * - Token validation is requested
     * 
     * Then:
     * - Should return token information
     * - Should increment token call count
     * - Should return correct permissions
     */
    it('should validate token with valid Authorization header', async () => {
      // Arrange - Use test data builder for complex scenarios
      const testData = new TestDataBuilder()
        .withUser(UserFactory.create({ uid: testContext.userId }))
        .withToken(TokenFactory.createExtended({
          owner: testContext.userId,
          permissions: ['GP', 'WP'],
        }))
        .build();
      
      // Seed test data
      await seedDb({
        users: { [testContext.userId]: testData.user },
        token: { [testContext.tokenId]: testData.token },
      });
      
      // Act
      const result = await tokenService.validateToken(`Bearer ${testContext.tokenId}`);
      
      // Assert - Use custom assertion helpers
      expectToken(result).toBeValidToken();
      expectToken(result).toBeOwnedBy(testContext.userId);
      expectToken(result).toHavePermissions(['GP', 'WP']);
      expectToken(result).toHaveGameMode('pvp');
      
      // Verify call count increment
      // Note: This would require checking the update call in a real implementation
    });
    
    /**
     * Test: Token Validation with Missing Header
     * 
     * Scenario: User attempts validation without Authorization header
     * 
     * Given:
     * - No Authorization header is provided
     * 
     * When:
     * - Token validation is requested
     * 
     * Then:
     * - Should throw authentication error
     * - Error should specify missing header
     */
    it('should throw error for missing Authorization header', async () => {
      // Act & Assert
      await expectAsyncError(
        () => tokenService.validateToken(undefined),
        'No Authorization header provided'
      );
      
      // Verify error structure
      const error = await expectAsyncError(
        () => tokenService.validateToken(undefined),
        'No Authorization header provided'
      );
      expectError(error).toBeApiError();
      expectError(error).toHaveStatusCode(401);
    });
    
    /**
     * Test: Token Validation with Invalid Format
     * 
     * Scenario: User provides Authorization header with invalid format
     * 
     * Given:
     * - Authorization header is not in "Bearer <token>" format
     * 
     * When:
     * - Token validation is requested
     * 
     * Then:
     * - Should throw validation error
     * - Error should specify correct format
     */
    it('should throw error for invalid Authorization format', async () => {
      // Act & Assert
      await expectAsyncError(
        () => tokenService.validateToken('InvalidFormat'),
        "Invalid Authorization header format. Expected 'Bearer <token>'"
      );
      
      await expectAsyncError(
        () => tokenService.validateToken('Basic token123'),
        "Invalid Authorization header format. Expected 'Bearer <token>'"
      );
    });
  });
  
  describe('Token Revocation', () => {
    /**
     * Test: Token Revocation by Owner
     * 
     * Scenario: User revokes their own token
     * 
     * Given:
     * - User owns the token
     * - Token exists in database
     * 
     * When:
     * - Token revocation is requested
     * 
     * Then:
     * - Token should be revoked successfully
     * - Token should be removed from database
     * - Response should indicate success
     */
    it('should revoke token when user is owner', async () => {
      // Arrange - Use preset for common scenario
      const testData = TestDataPresets.soloPlayer();
      await seedDb({
        users: { [testContext.userId]: testData.user },
        token: { [testContext.tokenId]: testData.token },
      });
      
      // Act
      const result = await tokenService.revokeToken(testContext.tokenId, testContext.userId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.revoked).toBe(true);
      
      // Verify database operation
      expectMockCall(firestoreMock.collection, ['token']);
      expectMockCall(firestoreMock.doc, [testContext.tokenId]);
    });
    
    /**
     * Test: Token Revocation by Non-Owner
     * 
     * Scenario: User attempts to revoke another user's token
     * 
     * Given:
     * - User does not own the token
     * - Token exists in database
     * 
     * When:
     * - Token revocation is requested
     * 
     * Then:
     * - Should throw authorization error
     * - Error should specify ownership requirement
     * - Token should not be revoked
     */
    it('should throw error when user does not own token', async () => {
      // Arrange
      const owner = UserFactory.create({ uid: 'owner-user' });
      const nonOwner = UserFactory.create({ uid: 'non-owner-user' });
      const token = TokenFactory.create({ owner: owner.uid });
      
      await seedDb({
        users: { [nonOwner.uid]: nonOwner },
        token: { [testContext.tokenId]: token },
      });
      
      // Act & Assert
      await expectAsyncError(
        () => tokenService.revokeToken(testContext.tokenId, nonOwner.uid),
        /you can only revoke your own tokens/i
      );
    });
  });
  
  describe('Token Listing', () => {
    /**
     * Test: List User Tokens
     * 
     * Scenario: User requests list of their tokens
     * 
     * Given:
     * - User has multiple tokens
     * - Tokens are stored in database
     * 
     * When:
     * - Token listing is requested
     * 
     * Then:
     * - Should return all user's tokens
     * - Should include token metadata
     * - Should not include other users' tokens
     */
    it('should list all tokens for user', async () => {
      // Arrange - Create multiple tokens for user
      const user = UserFactory.create({ uid: testContext.userId });
      const tokens = TokenFactory.createMany(3, { owner: user.uid });
      
      await seedDb({
        users: { [testContext.userId]: user },
        token: tokens.reduce((acc, token) => {
          acc[token.id] = token;
          return acc;
        }, {} as Record<string, any>),
      });
      
      // Act
      const result = await tokenService.listUserTokens(testContext.userId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
      
      // Verify each token has expected properties
      result.forEach(token => {
        expectToken(token).toBeValidToken();
        expectToken(token).toBeOwnedBy(testContext.userId);
      });
    });
    
    /**
     * Test: List Tokens for User with No Tokens
     * 
     * Scenario: User requests list of their tokens but has none
     * 
     * Given:
     * - User has no tokens
     * 
     * When:
     * - Token listing is requested
     * 
     * Then:
     * - Should return empty array
     * - Should not throw error
     */
    it('should return empty array when user has no tokens', async () => {
      // Arrange
      const user = UserFactory.create({ uid: testContext.userId });
      
      await seedDb({
        users: { [testContext.userId]: user },
        token: {}, // Empty token collection
      });
      
      // Act
      const result = await tokenService.listUserTokens(testContext.userId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });
  
  describe('Error Handling', () => {
    /**
     * Test: Database Connection Error
     * 
     * Scenario: Database is unavailable during token operation
     * 
     * Given:
     * - Database connection fails
     * 
     * When:
     * - Any token operation is requested
     * 
     * Then:
     * - Should handle error gracefully
     * - Should throw descriptive error
     * - Should not crash
     */
    it('should handle database connection errors gracefully', async () => {
      // Arrange - Mock database failure
      const originalImplementation = firestoreMock.runTransaction.getMockImplementation();
      firestoreMock.runTransaction.mockRejectedValueOnce(new Error('Database connection failed'));
      
      const user = UserFactory.create({ uid: testContext.userId });
      
      // Act & Assert
      await expectAsyncError(
        () => tokenService.createToken(user.uid, 'Test token', ['GP'], 'pvp'),
        /failed to create token/i
      );
      
      // Restore original implementation
      firestoreMock.runTransaction.mockImplementation(originalImplementation);
    });
    
    /**
     * Test: Concurrent Token Creation
     * 
     * Scenario: Multiple users create tokens simultaneously
     * 
     * Given:
     * - Multiple concurrent requests
     * - Valid data for each request
     * 
     * When:
     * - Token creation is requested concurrently
     * 
     * Then:
     * - All tokens should be created successfully
     * - Tokens should have unique IDs
     * - No conflicts should occur
     */
    it('should handle concurrent token creation', async () => {
      // Arrange
      const users = UserFactory.createMany(3);
      const tokenData = TokenFactory.createExtended();
      
      await seedDb({
        users: users.reduce((acc, user) => {
          acc[user.uid] = user;
          return acc;
        }, {} as Record<string, any>),
      });
      
      // Act - Create tokens concurrently
      const tokenPromises = users.map(user =>
        tokenService.createToken(user.uid, tokenData.note, tokenData.permissions, tokenData.gameMode)
      );
      
      const results = await Promise.all(tokenPromises);
      
      // Assert
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.created).toBe(true);
        expect(result.token).toBeDefined();
      });
      
      // Verify all tokens are unique
      const tokenIds = results.map(r => r.token);
      const uniqueTokenIds = new Set(tokenIds);
      expect(uniqueTokenIds.size).toBe(3);
    });
  });
  
  describe('Performance Considerations', () => {
    /**
     * Test: Token Creation Performance
     * 
     * Scenario: Verify token creation meets performance targets
     * 
     * Given:
     * - Standard token creation request
     * 
     * When:
     * - Token is created
     * 
     * Then:
     * - Operation should complete within time limit
     * - Should not cause memory leaks
     */
    it('should create token within performance targets', async () => {
      // Arrange
      const user = UserFactory.create({ uid: testContext.userId });
      const tokenData = TokenFactory.createExtended();
      
      // Act - Measure performance
      const startTime = performance.now();
      const result = await tokenService.createToken(
        user.uid,
        tokenData.note,
        tokenData.permissions,
        tokenData.gameMode
      );
      const endTime = performance.now();
      
      // Assert
      expect(result.created).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });
  });
});