// Consolidated team-related tests
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { createFirebaseFunctionsMock } from './mocks';

// Set up mocks before imports
const functionsMock = createFirebaseFunctionsMock();

const transactionMock = {
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const createDocRef = (collectionName, id) => ({
  collectionName,
  id,
  path: `${collectionName}/${id}`,
  collection: vi.fn((child) => createCollectionRef(`${collectionName}/${id}/${child}`)),
});

const createCollectionRef = (collectionName) => ({
  doc: vi.fn((id) => createDocRef(collectionName, id)),
});

const firestoreMock = {
  collection: vi.fn((name) => createCollectionRef(name)),
  runTransaction: vi.fn(async (callback) => callback(transactionMock)),
};

const FieldValueMock = {
  serverTimestamp: vi.fn().mockReturnValue('serverTimestamp'),
  arrayUnion: vi.fn((item) => `arrayUnion(${item})`),
  arrayRemove: vi.fn((item) => `arrayRemove(${item})`),
  delete: vi.fn().mockReturnValue('delete()'),
  increment: vi.fn((value) => `increment(${value})`),
};

const TimestampMock = {
  now: vi.fn(() => ({
    toMillis: () => Date.now(),
    valueOf: () => Date.now(),
  })),
  fromMillis: vi.fn((ms) => ({
    toMillis: () => ms,
    valueOf: () => ms,
  })),
};

const adminMock = {
  initializeApp: vi.fn(),
  firestore: vi.fn(() => firestoreMock),
  auth: vi.fn().mockReturnValue({
    verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-user' }),
    createCustomToken: vi.fn().mockResolvedValue('test-custom-token'),
  }),
};

adminMock.firestore.FieldValue = FieldValueMock;
adminMock.firestore.Timestamp = TimestampMock;

const TEAM_ID = 'mock-team-id';
const GENERATED_PASSWORD = 'mock-generated-password';

const mockTeamService = {
  getTeamProgress: vi.fn(),
  createTeam: vi.fn(),
  joinTeam: vi.fn(),
  leaveTeam: vi.fn(),
};

const TeamServiceConstructor = vi.fn();

class MockTeamService {
  constructor() {
    TeamServiceConstructor();
    Object.assign(this, mockTeamService);
  }
}
const createResponseMock = () => {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// Mock Firebase modules
vi.mock('firebase-admin', () => ({
  default: adminMock,
}));

vi.mock('firebase-functions', () => ({
  default: functionsMock,
}));
vi.mock('firebase-functions/v2', () => ({
  logger: functionsMock.logger,
}));
vi.mock('firebase-functions/v2/https', () => ({
  HttpsError: functionsMock.https.HttpsError,
  onCall: functionsMock.https.onCall,
  onRequest: functionsMock.https.onRequest,
}));
vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: functionsMock.schedule,
}));
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: FieldValueMock,
}));

vi.mock('uid-generator', () => ({
  default: class MockUidGenerator {
    static BASE62 = 'BASE62';
    constructor(length) {
      this.length = length;
    }
    async generate() {
      return this.length === 32 ? TEAM_ID : GENERATED_PASSWORD;
    }
  },
}));

vi.mock('../lib/services/TeamService.js', () => ({
  TeamService: MockTeamService,
}));

// Import the team functions with dynamic imports to handle ESM
let createTeamLogic;
let joinTeamLogic;
let leaveTeamLogic;

describe('Team Management', () => {
  beforeAll(async () => {
    const teamModule = await import('../lib/handlers/teamHandler.js');
    createTeamLogic = teamModule.createTeam;
    joinTeamLogic = teamModule.joinTeam;
    leaveTeamLogic = teamModule.leaveTeam;
  });

  beforeEach(() => {
    functionsMock.logger.log.mockClear();
    functionsMock.logger.info.mockClear();
    functionsMock.logger.error.mockClear();
    functionsMock.logger.warn.mockClear();
    functionsMock.logger.debug.mockClear();

    firestoreMock.collection.mockClear();
    firestoreMock.runTransaction.mockClear();

    transactionMock.get.mockReset();
    transactionMock.set.mockReset();
    transactionMock.update.mockReset();
    transactionMock.delete.mockReset();

    adminMock.firestore.mockReturnValue(firestoreMock);

    firestoreMock.runTransaction.mockImplementation(async (callback) => callback(transactionMock));

    transactionMock.get.mockImplementation(() =>
      Promise.resolve({
        exists: false,
        data: () => ({}),
      })
    );
    transactionMock.set.mockResolvedValue({});
    transactionMock.update.mockResolvedValue({});
    transactionMock.delete.mockResolvedValue({});

    Object.values(mockTeamService).forEach((mockFn) => mockFn.mockReset());
    TeamServiceConstructor.mockClear();
  });

  // Team Creation Tests
  describe('Team Creation', () => {
    it('responds with created team payload for valid requests', async () => {
      const req = {
        apiToken: { owner: 'owner-uid' },
        body: { password: '  hunter2  ', maximumMembers: 8 },
      };
      const res = createResponseMock();
      const next = vi.fn();
      const serviceResult = { team: TEAM_ID, password: GENERATED_PASSWORD };
      mockTeamService.createTeam.mockResolvedValue(serviceResult);

      await createTeamLogic(req, res, next);
      await flushPromises();

      expect(mockTeamService.createTeam).toHaveBeenCalledWith('owner-uid', {
        password: 'hunter2',
        maximumMembers: 8,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: serviceResult,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // Team Join Tests
  describe('Team Joining', () => {
    it('returns join confirmation when id and password are provided', async () => {
      const req = {
        apiToken: { owner: 'member-uid' },
        body: { id: '  TEAM-99  ', password: 'secret-pass' },
      };
      const res = createResponseMock();
      const next = vi.fn();
      const serviceResult = { joined: true };
      mockTeamService.joinTeam.mockResolvedValue(serviceResult);

      await joinTeamLogic(req, res, next);
      await flushPromises();

      expect(mockTeamService.joinTeam).toHaveBeenCalledWith('member-uid', {
        id: 'TEAM-99',
        password: 'secret-pass',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: serviceResult,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // Team Leave Tests
  describe('Team Leaving', () => {
    it('returns confirmation payload when member leaves', async () => {
      const req = {
        apiToken: { owner: 'member-uid' },
      };
      const res = createResponseMock();
      const next = vi.fn();
      const serviceResult = { left: true };
      mockTeamService.leaveTeam.mockResolvedValue(serviceResult);

      await leaveTeamLogic(req, res, next);
      await flushPromises();

      expect(mockTeamService.leaveTeam).toHaveBeenCalledWith('member-uid');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: serviceResult,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

// Clean up after all tests
afterEach(() => {
  vi.resetAllMocks();
});
