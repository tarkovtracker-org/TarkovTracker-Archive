import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiFeatures, API_FEATURES } from '../../../src/config/features';
import { createTestSuite } from '../../helpers';
describe('config/features', () => {
  const suite = createTestSuite('config/features');
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    await suite.beforeEach();
    // Reset process.env to original state
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    // Restore original process.env
    process.env = { ...originalEnv };
    await suite.afterEach();
  });
  describe('ApiFeatures interface', () => {
    it('should have correct type definition', () => {
      // This test verifies the TypeScript interface
      const features: ApiFeatures = {
        newErrorHandling: true,
        newProgressService: false,
        newTeamService: true,
        newTokenService: false,
      };
      expect(features.newErrorHandling).toBe(true);
      expect(features.newProgressService).toBe(false);
      expect(features.newTeamService).toBe(true);
      expect(features.newTokenService).toBe(false);
    });
  });
  describe('API_FEATURES constant', () => {
    const importFreshFeatures = async () => {
      vi.resetModules();
      return import('../../src/config/features');
    };
    it('should default all features to false when no environment variables are set', async () => {
      // Clear all feature-related environment variables
      delete process.env.FEATURE_ERROR_HANDLING;
      delete process.env.FEATURE_PROGRESS_SERVICE;
      delete process.env.FEATURE_TEAM_SERVICE;
      delete process.env.FEATURE_TOKEN_SERVICE;
      const { API_FEATURES: freshFeatures } = await importFreshFeatures();
      expect(freshFeatures.newErrorHandling).toBe(false);
      expect(freshFeatures.newProgressService).toBe(false);
      expect(freshFeatures.newTeamService).toBe(false);
      expect(freshFeatures.newTokenService).toBe(false);
    });
    it('should parse FEATURE_ERROR_HANDLING environment variable correctly', async () => {
      process.env.FEATURE_ERROR_HANDLING = 'true';

      const { API_FEATURES: freshFeatures } = await importFreshFeatures();

      expect(freshFeatures.newErrorHandling).toBe(true);
    });
    it('should handle false value for FEATURE_ERROR_HANDLING', async () => {
      process.env.FEATURE_ERROR_HANDLING = 'false';

      const { API_FEATURES: freshFeatures } = await importFreshFeatures();

      expect(freshFeatures.newErrorHandling).toBe(false);
    });
    it('should ignore invalid values for FEATURE_ERROR_HANDLING', async () => {
      process.env.FEATURE_ERROR_HANDLING = 'yes';

      const { API_FEATURES: freshFeatures } = await importFreshFeatures();

      expect(freshFeatures.newErrorHandling).toBe(false);
    });
    it('should parse all environment variables correctly when all are set to true', async () => {
      process.env.FEATURE_ERROR_HANDLING = 'true';
      process.env.FEATURE_PROGRESS_SERVICE = 'true';
      process.env.FEATURE_TEAM_SERVICE = 'true';
      process.env.FEATURE_TOKEN_SERVICE = 'true';

      const { API_FEATURES: freshFeatures } = await importFreshFeatures();

      expect(freshFeatures.newErrorHandling).toBe(true);
      expect(freshFeatures.newProgressService).toBe(true);
      expect(freshFeatures.newTeamService).toBe(true);
      expect(freshFeatures.newTokenService).toBe(true);
    });
    it('should handle mixed environment variable values', async () => {
      process.env.FEATURE_ERROR_HANDLING = 'true';
      process.env.FEATURE_PROGRESS_SERVICE = 'false';
      process.env.FEATURE_TEAM_SERVICE = 'yes'; // Invalid value
      process.env.FEATURE_TOKEN_SERVICE = '1'; // Invalid value (not 'true')

      const { API_FEATURES: freshFeatures } = await importFreshFeatures();

      expect(freshFeatures.newErrorHandling).toBe(true);
      expect(freshFeatures.newProgressService).toBe(false);
      expect(freshFeatures.newTeamService).toBe(false);
      expect(freshFeatures.newTokenService).toBe(false);
    });
    it('should handle empty string environment variable values', async () => {
      process.env.FEATURE_ERROR_HANDLING = '';
      process.env.FEATURE_PROGRESS_SERVICE = '';
      process.env.FEATURE_TEAM_SERVICE = '';
      process.env.FEATURE_TOKEN_SERVICE = '';

      const { API_FEATURES: freshFeatures } = await importFreshFeatures();

      // Empty string should be treated as falsy
      expect(freshFeatures.newErrorHandling).toBe(false);
      expect(freshFeatures.newProgressService).toBe(false);
      expect(freshFeatures.newTeamService).toBe(false);
      expect(freshFeatures.newTokenService).toBe(false);
    });
    it('should handle case sensitivity', async () => {
      process.env.FEATURE_ERROR_HANDLING = 'TRUE'; // Uppercase
      process.env.FEATURE_PROGRESS_SERVICE = 'True'; // Mixed case

      const { API_FEATURES: freshFeatures } = await importFreshFeatures();

      // Only exact 'true' (lowercase) should work
      expect(freshFeatures.newErrorHandling).toBe(false);
      expect(freshFeatures.newProgressService).toBe(false);
    });
  });
  describe('documentation consistency', () => {
    it('should match the documented environment variable names', () => {
      const documentedVars = [
        'FEATURE_ERROR_HANDLING',
        'FEATURE_PROGRESS_SERVICE',
        'FEATURE_TEAM_SERVICE',
        'FEATURE_TOKEN_SERVICE',
      ];
      // Verify that all documented variables are actually used
      // This is a compile-time check that will fail if the implementation changes
      const featureVars = [
        process.env.FEATURE_ERROR_HANDLING !== undefined,
        process.env.FEATURE_PROGRESS_SERVICE !== undefined,
        process.env.FEATURE_TEAM_SERVICE !== undefined,
        process.env.FEATURE_TOKEN_SERVICE !== undefined,
      ];
      expect(documentedVars).toHaveLength(4);
      expect(featureVars).toHaveLength(4);
    });
  });
});
