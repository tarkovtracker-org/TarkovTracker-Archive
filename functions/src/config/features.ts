/**
 * Centralized API feature flags configuration
 *
 * @remarks
 * All experimental and new features default to OFF for production safety.
 * Enable specific flags via environment variables in staging/development.
 */
/**
 * API feature flags interface
 *
 * @property newErrorHandling - Enhanced error handling with structured responses
 *   - Risk: Experimental - changes error response format
 *   - Enable: Set FEATURE_ERROR_HANDLING=true
 *
 * @property newProgressService - Refactored progress tracking service
 *   - Risk: Experimental - impacts task/hideout progress writes
 *   - Enable: Set FEATURE_PROGRESS_SERVICE=true
 *
 * @property newTeamService - Refactored team management service
 *   - Risk: Experimental - changes team operations and permissions
 *   - Enable: Set FEATURE_TEAM_SERVICE=true
 *
 * @property newTokenService - Refactored token management with expiration
 *   - Risk: Experimental - alters authentication token lifecycle
 *   - Enable: Set FEATURE_TOKEN_SERVICE=true
 */
export interface ApiFeatures {
  newErrorHandling: boolean;
  newProgressService: boolean;
  newTeamService: boolean;
  newTokenService: boolean;
}
/**
 * Current API features enabled in this deployment
 *
 * @remarks
 * Default: All flags OFF (false) for production safety.
 * Opt-in by setting corresponding environment variables to 'true'.
 *
 * Environment variables:
 * - FEATURE_ERROR_HANDLING=true
 * - FEATURE_PROGRESS_SERVICE=true
 * - FEATURE_TEAM_SERVICE=true
 * - FEATURE_TOKEN_SERVICE=true
 */
export const API_FEATURES: ApiFeatures = {
  newErrorHandling: process.env.FEATURE_ERROR_HANDLING === 'true',
  newProgressService: process.env.FEATURE_PROGRESS_SERVICE === 'true',
  newTeamService: process.env.FEATURE_TEAM_SERVICE === 'true',
  newTokenService: process.env.FEATURE_TOKEN_SERVICE === 'true',
};
