/**
 * Example of maintainable service test patterns
 * This demonstrates the new standardized approach for service testing
 */

import { createTestSuite } from '../base/TestSuite';
import { ProgressService } from '../../src/services/ProgressService';
import { MOCK_USERS, MOCK_GAME_DATA } from '../mocks/MockConstants';

class ProgressServiceTestSuite {
  protected getServiceUnderTest() {
    return new ProgressService();
  }

  protected getCustomTestData() {
    return {
      tarkovdata: MOCK_GAME_DATA
    };
  }
}

// Create standardized test suite
createTestSuite('ProgressService - Maintainable Patterns', ProgressServiceTestSuite, (suite) => {
  
  // Success tests using the helper methods
  suite.createSuccessTest(
    'return formatted progress data for valid user',
    async () => {
      const service = suite.getServiceUnderTest();
      
      // Use TestHelpers for additional setup
      const { DatabaseTestHelpers } = require('../helpers/TestHelpers');
      DatabaseTestHelpers.verifyDocumentCreated(
        'progress', 
        MOCK_USERS.USER_1.id,
        { currentGameMode: 'pvp' }
      );
      
      return await service.getUserProgress(MOCK_USERS.USER_1.id, 'pvp');
    },
    { displayName: 'Test User', tasksProgress: [] }
  );

  // Error tests using standardized pattern
  suite.createErrorTest(
    'user does not exist',
    async () => {
      const service = suite.getServiceUnderTest();
      return service.getUserProgress('nonexistent-user', 'pvp');
    },
    { status: 404, message: 'User not found' }
  );

  // Custom test with consistent structure
  it('should handle multiple game modes efficiently', async () => {
    const service = suite.getServiceUnderTest();
    
    // Test both game modes
    const pvpResult = await service.getUserProgress(MOCK_USERS.USER_1.id, 'pvp');
    const pveResult = await service.getUserProgress(MOCK_USERS.USER_1.id, 'pve');
    
    expect(pvpResult).toBeDefined();
    expect(pveResult).toBeDefined();
    
    // Verify service behavior not implementation details
    expect(pvpResult.gameMode).toBe('pvp');
    expect(pveResult.gameMode).toBe('pve');
  });
});
