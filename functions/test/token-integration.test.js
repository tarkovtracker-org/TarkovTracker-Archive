import { vi, describe, it, expect, beforeEach } from 'vitest';

const createHttpResponse = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.set = vi.fn().mockReturnValue(res);
  res.header = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  res.getHeader = vi.fn();
  res.on = vi.fn();
  res.end = vi.fn();
  return res;
};

describe('Token callable/HTTP wrappers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('revokeToken rejects non-POST methods with 405', async () => {
    const { revokeToken } = await import('../lib/token/revoke.js');
    const req = {
      method: 'GET',
      headers: {},
    };
    const res = createHttpResponse();

    await revokeToken(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
  });

  it('revokeToken returns 401 when authorization header is missing', async () => {
    const { revokeToken } = await import('../lib/token/revoke.js');
    const req = {
      method: 'POST',
      headers: {},
      body: {},
    };
    const res = createHttpResponse();

    await revokeToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' });
  });

  // Additional behaviours (success path) are covered by service-level tests in token/create.test.ts
});
