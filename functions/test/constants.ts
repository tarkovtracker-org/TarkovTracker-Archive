/**
 * Test constants for consistent test values and timeouts
 */

// Timeout values in milliseconds
export const TEST_TIMEOUTS = {
  SHORT: 100,
  MEDIUM: 1000,
  LONG: 5000,
  PERFORMANCE: 10000,
} as const;

// Token format validation regex
// Matches base64url format: alphanumeric + underscore + hyphen
// 48 bytes randomBytes -> 64 characters base64url
export const TOKEN_FORMAT = /^[0-9A-Za-z_-]{64}$/;

// Common test values
export const TEST_VALUES = {
  USER_ID: 'test-user-123',
  TEAM_ID: 'test-team-456',
  TOKEN_ID: 'test-token-789',
  MAX_RETRIES: 3,
} as const;

// Performance thresholds in milliseconds
export const PERFORMANCE_THRESHOLDS = {
  TOKEN_CREATE: 100,
  TOKEN_VALIDATE: 50,
  PROGRESS_UPDATE: 200,
  MAX_OPERATION: 1000,
} as const;
