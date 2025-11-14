import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
// Use centralized test utilities
import {
  createMockRequest,
  createMockResponse,
  expectApiError,
  createTestSuite,
} from '../../helpers';

describe('Token callable/HTTP wrappers', () => {
  const suite = createTestSuite('token-integration');

  beforeEach(async () => {
    await suite.beforeEach();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await suite.afterEach();
  });

  it('revokeToken rejects non-POST methods with 405', async () => {
    const { revokeToken } = await import('../../../src/token/revoke');
    const req = createMockRequest({ method: 'GET', headers: {} });
    const res = createMockResponse();
    await revokeToken(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
  });

  it('revokeToken returns 401 when authorization header is missing', async () => {
    const { revokeToken } = await import('../../../src/token/revoke');
    const req = createMockRequest({ method: 'POST', headers: {}, body: {} });
    const res = createMockResponse();
    await revokeToken(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' });
  });

  // Additional behaviours (success path) are covered by service-level tests in token/create.test.ts
});
