/**
 * Centralized HTTP mocking utilities
 * Replaces: mockResponse(), createHttpResponse(), createResponse(), mockRequest(), createRequest()
 *
 * This provides a single, consistent implementation for all test HTTP mocking needs.
 * All methods are type-safe and fully featured to prevent false positives.
 */

import { vi, type Mock } from 'vitest';

/**
 * Mock Request interface supporting Express and Firebase Functions patterns
 */
export interface MockRequest {
  method: string;
  headers: Record<string, string>;
  body: Record<string, any>;
  params: Record<string, any>;
  query: Record<string, any>;
  get: Mock<(name: string) => string | undefined>;
  user?: { id: string; uid?: string };
  apiToken?: {
    permissions: string[];
    token: string;
    owner: string;
    note?: string;
  };
  auth?: { uid: string };
  data?: Record<string, any>;
  baseUrl?: string;
  path?: string;
}

/**
 * Mock Response interface with full Express-like chaining
 */
export interface MockResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
  status: Mock<(code: number) => MockResponse>;
  json: Mock<(data: any) => MockResponse>;
  send: Mock<(data?: any) => MockResponse>;
  set: Mock<(key: string | Record<string, string>, value?: string) => MockResponse>;
  header: Mock<(key: string, value: string) => MockResponse>;
  setHeader: Mock<(key: string, value: string) => MockResponse>;
  getHeader: Mock<(key: string) => string | undefined>;
  end: Mock<() => void>;
}

/**
 * Creates a complete mock response object with all Express-like methods
 *
 * @returns Fully featured MockResponse with chaining support
 */
export const createMockResponse = (): MockResponse => {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
  } as MockResponse;

  // Chainable status method
  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });

  // Chainable json method (stores body and returns response)
  res.json = vi.fn().mockImplementation((data: any) => {
    res.body = data;
    return res;
  });

  // Chainable send method (similar to json but for non-JSON responses)
  res.send = vi.fn().mockImplementation((data?: any) => {
    res.body = data;
    return res;
  });

  // Chainable set method (supports object or key/value)
  res.set = vi
    .fn()
    .mockImplementation((keyOrObj: string | Record<string, string>, value?: string) => {
      if (typeof keyOrObj === 'string' && value) {
        res.headers[keyOrObj] = value;
      } else if (typeof keyOrObj === 'object') {
        Object.assign(res.headers, keyOrObj);
      }
      return res;
    });

  // Chainable header method (alias for set)
  res.header = vi.fn().mockImplementation((key: string, value: string) => {
    res.headers[key] = value;
    return res;
  });

  // Chainable setHeader method (another alias)
  res.setHeader = vi.fn().mockImplementation((key: string, value: string) => {
    res.headers[key] = value;
    return res;
  });

  // Get header method for retrieval
  res.getHeader = vi.fn().mockImplementation((key: string) => res.headers[key]);

  // End method for response completion
  res.end = vi.fn();

  return res;
};

/**
 * Creates a mock request object with flexible configuration
 *
 * @param overrides - Partial properties to override defaults
 * @returns Configured MockRequest object
 */
export const createMockRequest = (overrides: Partial<MockRequest> = {}): MockRequest => {
  const defaultHeaders = overrides.headers || {};

  return {
    method: 'GET',
    headers: defaultHeaders,
    body: {},
    params: {},
    query: {},
    get: vi.fn((name: string) => defaultHeaders[name.toLowerCase()]),
    ...overrides,
  };
};

/**
 * Creates an authenticated request with Bearer token and user info
 *
 * @param userId - The user ID to authenticate
 * @param permissions - Array of permissions for the token
 * @param overrides - Additional request properties to override
 * @returns MockRequest with authentication pre-configured
 */
export const createAuthenticatedRequest = (
  userId: string,
  permissions: string[] = ['GP'],
  overrides: Partial<MockRequest> = {}
): MockRequest => {
  return createMockRequest({
    headers: { authorization: `Bearer test-token-${userId}` },
    user: { id: userId, uid: userId },
    apiToken: {
      owner: userId,
      permissions,
      token: `test-token-${userId}`,
    },
    auth: { uid: userId },
    ...overrides,
  });
};

/**
 * Creates a mock response with Express-style mockReturnThis behavior
 * Alternative implementation for tests expecting that specific pattern
 *
 * @returns MockResponse with mockReturnThis chaining
 */
export const createMockResponseReturnThis = (): MockResponse => {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
  } as MockResponse;

  res.status = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  res.send = vi.fn().mockReturnThis();
  res.set = vi.fn().mockReturnThis();
  res.header = vi.fn().mockReturnThis();
  res.setHeader = vi.fn().mockReturnThis();
  res.getHeader = vi.fn();
  res.end = vi.fn();

  return res;
};

/**
 * Helper to create both request and response for common patterns
 *
 * @param userId - Optional user ID for authenticated requests
 * @param requestOverrides - Additional request properties
 * @param responseOverrides - Additional response properties
 * @returns Object with both req and res
 */
export const createMockReqRes = (
  userId?: string,
  requestOverrides: Partial<MockRequest> = {},
  responseOverrides: Partial<MockResponse> = {}
) => {
  const req = userId
    ? createAuthenticatedRequest(userId, [], requestOverrides)
    : createMockRequest(requestOverrides);

  const res = {
    ...createMockResponse(),
    ...responseOverrides,
  };

  return { req, res };
};
