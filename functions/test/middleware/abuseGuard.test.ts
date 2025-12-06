import { createHash } from 'node:crypto';
import { describe, expect, it, beforeEach, afterEach, vi, type Mock } from 'vitest';

vi.mock('firebase-functions/v2', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('firebase-admin', () => ({
  __esModule: true,
  default: {
    apps: [] as unknown[],
  },
}));

const loadGuard = async () => {
  const module = await import('../../src/middleware/abuseGuard.js');
  return {
    abuseGuard: module.abuseGuard,
    logger: (await import('firebase-functions/v2')).logger,
    internals: module.__abuseGuardInternals,
  };
};

function createRequest(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    method: 'POST',
    baseUrl: '/api',
    path: '/progress/tasks',
    headers: {
      authorization: 'Bearer test-token',
    },
    originalUrl: '/api/progress/tasks',
    apiToken: {
      owner: 'user-1',
      token: 'test-token',
    },
    ip: '127.0.0.1',
    ...overrides,
  } as any;
}

function createResponse() {
  const res: any = {
    statusCode: 200,
    body: undefined as unknown,
  };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((payload: unknown) => {
    res.body = payload;
    return res;
  });
  return res;
}

describe('abuseGuard middleware', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ABUSE_GUARD_WINDOW_MS = '1000';
    process.env.ABUSE_GUARD_THRESHOLD = '3';
    process.env.ABUSE_GUARD_WARN_RATIO = '0.6';
    process.env.ABUSE_GUARD_BREACH_LIMIT = '2';
    process.env.ABUSE_GUARD_HISTORY_RESET_MS = '3000';
    process.env.ABUSE_GUARD_METHODS = 'POST';
    process.env.ABUSE_GUARD_PATH_PREFIXES = '/api/progress';
  });

  afterEach(() => {
    delete process.env.ABUSE_GUARD_WINDOW_MS;
    delete process.env.ABUSE_GUARD_THRESHOLD;
    delete process.env.ABUSE_GUARD_WARN_RATIO;
    delete process.env.ABUSE_GUARD_BREACH_LIMIT;
    delete process.env.ABUSE_GUARD_HISTORY_RESET_MS;
    delete process.env.ABUSE_GUARD_METHODS;
    delete process.env.ABUSE_GUARD_PATH_PREFIXES;
    vi.useRealTimers();
    vi.clearAllTimers();
    vi.resetModules();
  });

  it('allows requests below the threshold', async () => {
    const { abuseGuard, internals } = await loadGuard();
    const next = vi.fn();

    const config = internals?.inspectConfig();
    expect(config).toBeDefined();

    for (let i = 0; i < 3; i++) {
      const req = createRequest();
      const res = createResponse();
      abuseGuard(req, res, next);
      expect(res.status).not.toHaveBeenCalledWith(429);
    }
    const tokenKey = 'token:' + createHash('sha256').update('test-token').digest('hex');
    const cacheEntry = internals?.inspectCache(tokenKey);
    expect(cacheEntry?.count).toBeDefined();
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('logs near-threshold usage without blocking', async () => {
    const { abuseGuard, logger, internals } = await loadGuard();
    const next = vi.fn();
    const config = internals?.inspectConfig();
    expect(config).toBeDefined();
    const warnThreshold = Math.max(
      1,
      Math.floor((config?.THRESHOLD ?? 1) * (config?.WARN_RATIO ?? 1))
    );

    for (let i = 0; i < warnThreshold; i++) {
      const req = createRequest();
      const res = createResponse();
      abuseGuard(req, res, next);
    }

    const tokenKey = 'token:' + createHash('sha256').update('test-token').digest('hex');
    const cacheEntry = internals?.inspectCache(tokenKey);
    expect(cacheEntry?.warned).toBe(true);
    expect((logger.warn as unknown as Mock).mock.calls.length).toBeGreaterThan(0);
    expect(next).toHaveBeenCalledTimes(warnThreshold);
  });

  it('blocks after consecutive breaches across windows', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const { abuseGuard, internals } = await loadGuard();
    const next = vi.fn();
    const tokenKey = 'token:' + createHash('sha256').update('test-token').digest('hex');
    const config = internals?.inspectConfig();
    const breachingRequests = (config?.THRESHOLD ?? 150) + 1;

    // First window: exceed threshold once (should not block yet)
    for (let i = 0; i < breachingRequests; i++) {
      const req = createRequest();
      const res = createResponse();
      abuseGuard(req, res, next);
      expect(res.statusCode).not.toBe(429);
    }
    const historyAfterFirstWindow = internals?.inspectHistory(tokenKey);
    expect(historyAfterFirstWindow?.consecutiveBreaches).toBe(1);

    // Advance to next window
    vi.advanceTimersByTime(1100);
    vi.setSystemTime(new Date(Date.now() + 1100));

    let blocked = false;
    for (let i = 0; i < breachingRequests; i++) {
      const req = createRequest();
      const res = createResponse();
      abuseGuard(req, res, next);
      if (res.statusCode === 429) {
        blocked = true;
        break;
      }
    }

    expect(blocked).toBe(true);
    expect(next).toHaveBeenCalled();
  });
});
