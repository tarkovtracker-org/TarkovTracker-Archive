/**
 * Centralized API feature flags configuration
 */

export interface ApiFeatures {
  newErrorHandling: boolean;
  newProgressService: boolean;
  newTeamService: boolean;
  newTokenService: boolean;
}

/**
 * Current API features enabled in this deployment
 */
export const API_FEATURES: ApiFeatures = {
  newErrorHandling: process.env.FEATURE_ERROR_HANDLING !== 'false',
  newProgressService: process.env.FEATURE_PROGRESS_SERVICE !== 'false',
  newTeamService: process.env.FEATURE_TEAM_SERVICE !== 'false',
  newTokenService: process.env.FEATURE_TOKEN_SERVICE !== 'false',
};
