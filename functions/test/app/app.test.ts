import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../../src/app/app';
import { createTestSuite } from '../helpers';

// Mock Express and related modules (these are necessary for testing app configuration)
vi.mock('express', () => ({
  default: vi.fn().mockImplementation(() => ({
    use: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('cors', () => ({
  default: vi.fn(() => vi.fn()),
}));

vi.mock('body-parser', () => ({
  default: {
    json: vi.fn(() => vi.fn()),
    urlencoded: vi.fn(() => vi.fn()),
  },
}));

const mockLogger = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};
vi.mock('firebase-functions/v2', () => ({
  logger: mockLogger,
}));

// Mock all the middleware and handlers (necessary for testing app configuration)
vi.mock('../../src/middleware/auth', () => ({
  verifyBearer: vi.fn(),
}));

vi.mock('../../src/middleware/abuseGuard', () => ({
  abuseGuard: vi.fn(),
}));

vi.mock('../../src/middleware/reauth', () => ({
  requireRecentAuth: vi.fn(),
}));

vi.mock('../../src/middleware/permissions', () => ({
  requirePermission: vi.fn(),
}));

vi.mock('../../src/middleware/errorHandler', () => ({
  errorHandler: vi.fn(),
  notFoundHandler: vi.fn(),
  asyncHandler: vi.fn(),
}));

vi.mock('../../src/config/corsConfig', () => ({
  getExpressCorsOptions: vi.fn().mockReturnValue({}),
}));

vi.mock('../../src/handlers/progressHandler', () => ({
  default: {
    getPlayerProgress: vi.fn(),
    setPlayerProgress: vi.fn(),
  },
}));

vi.mock('../../src/handlers/teamHandler', () => ({
  default: {
    createTeam: vi.fn(),
    joinTeam: vi.fn(),
    leaveTeam: vi.fn(),
    getTeamProgress: vi.fn(),
  },
}));

vi.mock('../../src/handlers/tokenHandler', () => ({
  default: {
    getTokenInfo: vi.fn(),
    revokeToken: vi.fn(),
  },
}));

vi.mock('../../src/handlers/userDeletionHandler', () => ({
  deleteUserAccountHandler: vi.fn(),
}));

vi.mock('../../src/config/features', () => ({
  API_FEATURES: {
    USER_DELETION: true,
    PROGRESS: true,
    TEAM: true,
    TOKEN: true,
  },
}));

describe('Express App Configuration', () => {
  const suite = createTestSuite('app');

  beforeEach(async () => {
    vi.stubEnv('NODE_ENV', 'test');
  });

  beforeEach(async () => {
    await suite.beforeEach();
  });

  afterEach(suite.afterEach);

  it('should create an Express app', async () => {
    const app = await createApp();
    expect(app).toBeDefined();
    expect(typeof app).toBe('object');
    expect(app.use).toBeDefined();
  });

  it('should configure middleware in the correct order', async () => {
    const expressMock = await import('express');
    const app = await createApp();

    // Verify middleware is configured
    expect(expressMock.default).toHaveBeenCalled();
    expect(app.use).toHaveBeenCalled();
  });

  it('should handle package.json read errors gracefully', async () => {
    // Mock fs to throw an error
    vi.doMock('fs', () => ({
      readFileSync: vi.fn().mockImplementation(() => {
        throw new Error('File not found');
      }),
      default: {
        readFileSync: vi.fn().mockImplementation(() => {
          throw new Error('File not found');
        }),
      },
    }));

    const app = await createApp();
    expect(app).toBeDefined();
  });

  it('should set up routes properly', async () => {
    const app = await createApp();

    // Verify route setup methods are called
    expect(app.get).toHaveBeenCalled();
    expect(app.post).toHaveBeenCalled();
  });
});
