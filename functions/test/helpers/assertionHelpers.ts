/**
 * Domain-specific assertion helpers
 * Provides clear, reusable test assertions for TarkovTracker
 *
 * These helpers provide:
 * - Semantic assertions with clear intent
 * - Consistent error messages
 * - Domain-specific validation
 * - Better test readability
 *
 * @example
 * ```typescript
 * import { expectApiSuccess, expectValidToken } from './helpers/assertionHelpers';
 *
 * expectApiSuccess(res, { userId: 'user-1' });
 * expectValidToken(tokenData.token);
 * ```
 */

import { expect } from 'vitest';
import { TOKEN_FORMAT } from '../constants';
import type { MockResponse } from './httpMocks';

/**
 * Assert API success response structure
 *
 * Validates:
 * - Status code is 200
 * - Response body exists
 * - Optional: body matches expected data
 *
 * @param response - Mock response object
 * @param expectedData - Optional data to match against response body
 *
 * @example
 * ```typescript
 * const res = createMockResponse();
 * res.status(200).json({ userId: 'user-1', name: 'Test User' });
 *
 * expectApiSuccess(res, { userId: 'user-1' });
 * ```
 */
export const expectApiSuccess = (response: MockResponse | any, expectedData?: any) => {
  expect(response.statusCode).toBe(200);
  expect(response.body).toBeDefined();

  if (expectedData) {
    expect(response.body).toMatchObject(expectedData);
  }
};

/**
 * Assert API error response structure
 *
 * Validates:
 * - Status code matches expected
 * - Response body exists
 * - success field is false
 * - error field exists
 * - Optional: error message matches pattern
 *
 * @param response - Mock response object
 * @param expectedStatus - Expected HTTP status code
 * @param expectedMessage - Optional message string or regex to match
 *
 * @example
 * ```typescript
 * expectApiError(res, 401, 'Invalid token');
 * expectApiError(res, 403, /permission/i);
 * ```
 */
export const expectApiError = (
  response: MockResponse | any,
  expectedStatus: number,
  expectedMessage?: string | RegExp
) => {
  expect(response.statusCode).toBe(expectedStatus);
  expect(response.body).toBeDefined();
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();

  if (expectedMessage) {
    if (typeof expectedMessage === 'string') {
      expect(response.body.error).toContain(expectedMessage);
    } else {
      expect(response.body.error).toMatch(expectedMessage);
    }
  }
};

/**
 * Assert token format is valid
 *
 * Validates:
 * - Token is defined
 * - Token matches base64url format (alphanumeric + underscore + hyphen)
 * - Token length is exactly 64 characters (48 bytes randomBytes)
 *
 * @param token - Token string to validate
 *
 * @example
 * ```typescript
 * expectValidToken('fmoAGsWKcdxGfxs8sG4Fx_2qENu_IaTAvNF4PawUMvLfJSFHRwHu_cOgdCcmaJBy');
 * ```
 */
export const expectValidToken = (token: string) => {
  expect(token).toBeDefined();
  expect(token).toMatch(TOKEN_FORMAT);
  expect(token.length).toBe(64); // 48 bytes randomBytes -> 64 chars base64url
};

/**
 * Assert token has required properties
 *
 * Validates:
 * - Token data is defined
 * - Has owner field
 * - Has permissions array
 * - Has token field
 *
 * Note: Does NOT validate token string format - use expectValidToken separately
 * for that. This allows testing with mock token IDs in tests.
 *
 * @param tokenData - Token data object
 * @param validateFormat - Optional: validate token string format (default: false)
 *
 * @example
 * ```typescript
 * expectTokenStructure({
 *   owner: 'user-1',
 *   permissions: ['GP', 'WP'],
 *   token: 'test-token-123'
 * });
 * ```
 */
export const expectTokenStructure = (tokenData: any, validateFormat: boolean = false) => {
  expect(tokenData).toBeDefined();
  expect(tokenData.owner).toBeDefined();
  expect(tokenData.permissions).toBeInstanceOf(Array);
  expect(tokenData.token).toBeDefined();

  if (validateFormat) {
    expectValidToken(tokenData.token);
  }
};

/**
 * Assert Firestore document exists with expected data
 *
 * @param docSnapshot - Firestore document snapshot
 * @param expectedData - Optional data to match
 *
 * @example
 * ```typescript
 * expectDocumentExists(snapshot, { userId: 'user-1', active: true });
 * ```
 */
export const expectDocumentExists = (docSnapshot: any, expectedData?: Record<string, any>) => {
  expect(docSnapshot.exists).toBe(true);

  if (expectedData) {
    const actualData = docSnapshot.data();
    expect(actualData).toMatchObject(expectedData);
  }
};

/**
 * Assert Firestore document does not exist
 *
 * @param docSnapshot - Firestore document snapshot
 *
 * @example
 * ```typescript
 * expectDocumentNotExists(snapshot);
 * ```
 */
export const expectDocumentNotExists = (docSnapshot: any) => {
  expect(docSnapshot.exists).toBe(false);
};

/**
 * Assert mock was called with matching arguments
 *
 * @param mock - Vitest mock function
 * @param expectedArgs - Expected arguments array
 * @param callIndex - Which call to check (default: 0)
 *
 * @example
 * ```typescript
 * expectMockCalledWith(myMock, ['arg1', 'arg2'], 0);
 * ```
 */
export const expectMockCalledWith = (mock: any, expectedArgs: any[], callIndex: number = 0) => {
  expect(mock).toHaveBeenCalled();
  const actualArgs = mock.mock.calls[callIndex];
  expect(actualArgs).toEqual(expectedArgs);
};

/**
 * Assert mock was called at least once with matching arguments
 *
 * @param mock - Vitest mock function
 * @param matcher - Function to match call arguments
 *
 * @example
 * ```typescript
 * expectMockCalledWithMatching(myMock, (args) => args[0] === 'test');
 * ```
 */
export const expectMockCalledWithMatching = (mock: any, matcher: (args: any[]) => boolean) => {
  expect(mock).toHaveBeenCalled();
  const matchingCall = mock.mock.calls.find(matcher);
  expect(matchingCall).toBeDefined();
};

/**
 * Assert performance timing is within threshold
 *
 * Validates timing and warns if approaching threshold.
 * Useful for performance regression tests.
 *
 * @param duration - Actual duration in milliseconds
 * @param threshold - Maximum allowed duration in milliseconds
 * @param operation - Description of operation (for logging)
 *
 * @example
 * ```typescript
 * const start = Date.now();
 * await service.operation();
 * const duration = Date.now() - start;
 *
 * expectPerformance(duration, 100, 'Token creation');
 * ```
 */
export const expectPerformance = (duration: number, threshold: number, operation: string) => {
  expect(duration).toBeLessThan(threshold);

  // Warn if approaching threshold (80%)
  if (duration > threshold * 0.8) {
    console.warn(`⚠️  ${operation} took ${duration}ms (threshold: ${threshold}ms)`);
  }
};

/**
 * Assert array contains items matching predicate
 *
 * @param array - Array to search
 * @param predicate - Function to match items
 * @param message - Optional error message
 *
 * @example
 * ```typescript
 * expectArrayContainsMatching(
 *   tokens,
 *   (token) => token.owner === 'user-1',
 *   'Should contain token for user-1'
 * );
 * ```
 */
export const expectArrayContainsMatching = <T>(
  array: T[],
  predicate: (item: T) => boolean,
  message?: string
) => {
  const matchingItem = array.find(predicate);
  expect(matchingItem).toBeDefined();

  if (!matchingItem && message) {
    throw new Error(message);
  }
};

/**
 * Assert progress data structure is valid
 *
 * @param progressData - Progress data object
 *
 * @example
 * ```typescript
 * expectProgressStructure({
 *   userId: 'user-1',
 *   taskId: 'task-1',
 *   completed: true
 * });
 * ```
 */
export const expectProgressStructure = (progressData: any) => {
  expect(progressData).toBeDefined();
  expect(progressData.userId).toBeDefined();
  expect(progressData.taskId).toBeDefined();
  expect(typeof progressData.completed).toBe('boolean');
};

/**
 * Assert team data structure is valid
 *
 * @param teamData - Team data object
 *
 * @example
 * ```typescript
 * expectTeamStructure({
 *   id: 'team-1',
 *   members: ['user-1', 'user-2']
 * });
 * ```
 */
export const expectTeamStructure = (teamData: any) => {
  expect(teamData).toBeDefined();
  expect(teamData.id).toBeDefined();
  expect(teamData.members).toBeInstanceOf(Array);
};

/**
 * Assert user data structure is valid
 *
 * @param userData - User data object
 *
 * @example
 * ```typescript
 * expectUserStructure({
 *   uid: 'user-1'
 * });
 * ```
 */
export const expectUserStructure = (userData: any) => {
  expect(userData).toBeDefined();
  expect(userData.uid).toBeDefined();
};

/**
 * Assert that a value is within a range
 *
 * @param value - Value to check
 * @param min - Minimum (inclusive)
 * @param max - Maximum (inclusive)
 * @param label - Optional label for error message
 *
 * @example
 * ```typescript
 * expectInRange(count, 0, 10, 'User count');
 * ```
 */
export const expectInRange = (value: number, min: number, max: number, label?: string) => {
  const message = label ? `${label} should be between ${min} and ${max}` : undefined;
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);

  if (message && (value < min || value > max)) {
    throw new Error(message);
  }
};

/**
 * Assert that a timestamp is recent (within last N milliseconds)
 *
 * @param timestamp - Timestamp to check (Date, number, or Firestore Timestamp)
 * @param maxAgeMs - Maximum age in milliseconds (default: 5000)
 *
 * @example
 * ```typescript
 * expectRecentTimestamp(tokenData.createdAt, 1000);
 * ```
 */
export const expectRecentTimestamp = (timestamp: any, maxAgeMs: number = 5000) => {
  let timestampMs: number;

  if (timestamp instanceof Date) {
    timestampMs = timestamp.getTime();
  } else if (typeof timestamp === 'number') {
    timestampMs = timestamp;
  } else if (timestamp && typeof timestamp.toDate === 'function') {
    timestampMs = timestamp.toDate().getTime();
  } else {
    throw new Error('Invalid timestamp format');
  }

  const now = Date.now();
  const age = now - timestampMs;

  expect(age).toBeLessThan(maxAgeMs);
  expect(age).toBeGreaterThanOrEqual(0);
};

/**
 * Assert that two objects have the same keys
 *
 * @param obj1 - First object
 * @param obj2 - Second object
 *
 * @example
 * ```typescript
 * expectSameKeys(actual, expected);
 * ```
 */
export const expectSameKeys = (obj1: any, obj2: any) => {
  const keys1 = Object.keys(obj1).sort();
  const keys2 = Object.keys(obj2).sort();
  expect(keys1).toEqual(keys2);
};

/**
 * Assert that an error has expected properties
 *
 * @param error - Error object
 * @param expectedStatus - Expected status code
 * @param expectedMessage - Optional message string or regex
 *
 * @example
 * ```typescript
 * try {
 *   await operation();
 * } catch (error) {
 *   expectErrorWithStatus(error, 401, 'Unauthorized');
 * }
 * ```
 */
export const expectErrorWithStatus = (
  error: any,
  expectedStatus: number,
  expectedMessage?: string | RegExp
) => {
  expect(error).toBeDefined();
  expect(error.statusCode || error.status).toBe(expectedStatus);

  if (expectedMessage) {
    if (typeof expectedMessage === 'string') {
      expect(error.message).toContain(expectedMessage);
    } else {
      expect(error.message).toMatch(expectedMessage);
    }
  }
};
