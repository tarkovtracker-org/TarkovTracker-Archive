// Consolidated team-related tests
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, type Mock } from 'vitest';
import { createTestSuite, firestore } from '../../helpers';
import { TeamService } from '../../../src/services/TeamService';

// Mock Firebase Functions (not Firebase Admin)
const mockLogger = {
  log: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};
vi.mock('firebase-functions', () => ({
  default: {
    logger: mockLogger,
  },
}));

vi.mock('firebase-functions/v2', () => ({
  logger: mockLogger,
}));

vi.mock('firebase-functions/v2/https', () => ({
  HttpsError: class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  onCall: vi.fn(),
  onRequest: vi.fn(),
}));

vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: vi.fn(),
}));

// Mock uid-generator
vi.mock('uid-generator', () => ({
  default: class MockUidGenerator {
    static BASE62 = 'BASE62';
    length: number;

    constructor(length: number) {
      this.length = length;
    }

    generate(): string {
      return this.length === 32 ? 'mock-team-id' : 'mock-generated-password';
    }
  },
}));

interface MockResponse {
  status: Mock<(code: number) => MockResponse>;
  json: Mock<(data: any) => void>;
}

const createResponseMock = (): MockResponse => {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
};

const flushPromises = () =>
  new Promise<void>((resolve) => {
    setImmediate(() => resolve());
  });

// Import the team functions with dynamic imports to handle ESM
let createTeamLogic: (req: unknown, res: unknown) => Promise<void>;
let joinTeamLogic: (req: unknown, res: unknown) => Promise<void>;

describe('Team Management', () => {
  const suite = createTestSuite('TeamManagement');
  let teamService: TeamService;

  beforeAll(async () => {
    const teamModule = await import('../../../src/handlers/teamHandler');
    createTeamLogic = teamModule.createTeam;
    joinTeamLogic = teamModule.joinTeam;
    leaveTeamLogic = teamModule.leaveTeam;
  });

  beforeEach(async () => {
    await suite.beforeEach();
    // Global afterEach in test/setup.ts handles Firestore cleanup
    // No manual database reset needed here
    teamService = new TeamService();
  });

  afterEach(suite.afterEach);

  // Team Creation Tests
  describe('Team Creation', () => {
    it('responds with created team payload for valid requests', async () => {
      // Seed a user
      await suite.withDatabase({
        users: {
          'owner-uid': { uid: 'owner-uid', email: 'owner@example.com' },
        },
      });

      // Test the service directly (handlers have asyncHandler complexity)
      const result = await teamService.createTeam('owner-uid', {
        password: 'testPassword123',
        maximumMembers: 8,
      });

      // Verify result matches expected format
      expect(result).toBeDefined();
      expect(result.team).toBeDefined();
      expect(result.password).toBeDefined();

      // Verify team was created in Firestore
      const db = firestore();
      const systemDoc = await db.collection('system').doc('owner-uid').get();
      expect(systemDoc.exists).toBe(true);
      const systemData = systemDoc.data();
      expect(systemData?.team).toBe(result.team);

      const teamDoc = await db.collection('team').doc(result.team).get();
      expect(teamDoc.exists).toBe(true);
      const teamData = teamDoc.data();
      expect(teamData?.owner).toBe('owner-uid');
      expect(teamData?.maximumMembers).toBe(8);
    });

    it('validates password length', async () => {
      await suite.withDatabase({
        users: {
          'owner-uid': { uid: 'owner-uid', email: 'owner@example.com' },
        },
      });

      const req = {
        apiToken: { owner: 'owner-uid' },
        body: { password: '123' }, // Too short
      };

      const res = createResponseMock();
      const next = vi.fn();

      await createTeamLogic(req as any, res as any, next);
      await flushPromises();

      // The asyncHandler should catch the error and pass it to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Password must be at least 4 characters long',
        })
      );
      // Response should not be called when there's an error
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('validates maximum members range', async () => {
      await suite.withDatabase({
        users: {
          'owner-uid': { uid: 'owner-uid', email: 'owner@example.com' },
        },
      });

      const req = {
        apiToken: { owner: 'owner-uid' },
        body: { maximumMembers: 1 }, // Too small
      };

      const res = createResponseMock();
      const next = vi.fn();

      await createTeamLogic(req as any, res as any, next);
      await flushPromises();

      // The asyncHandler should catch the error and pass it to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Maximum members must be between 2 and 50',
        })
      );
      // Response should not be called when there's an error
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // Team Join Tests
  describe('Team Joining', () => {
    it('returns join confirmation when id and password are provided', async () => {
      // Create a team first
      const teamId = 'test-team-id';
      await suite.withDatabase({
        users: {
          'owner-uid': { uid: 'owner-uid', email: 'owner@example.com' },
          'member-uid': { uid: 'member-uid', email: 'member@example.com' },
        },
        teams: {
          [teamId]: {
            id: teamId,
            owner: 'owner-uid',
            password: 'secret-pass',
            members: ['owner-uid'],
            maximumMembers: 10,
            createdAt: new Date(),
          },
        },
      });

      // Test the service directly
      const result = await teamService.joinTeam('member-uid', {
        id: teamId,
        password: 'secret-pass',
      });

      // Verify result
      expect(result).toBeDefined();
      expect(result.joined).toBe(true);

      // Verify user joined the team in Firestore
      const db = firestore();
      const systemDoc = await db.collection('system').doc('member-uid').get();
      expect(systemDoc.exists).toBe(true);
      const systemData = systemDoc.data();
      expect(systemData?.team).toBe(teamId);

      const teamDoc = await db.collection('team').doc(teamId).get();
      expect(teamDoc.exists).toBe(true);
      const teamData = teamDoc.data();
      expect(teamData?.members).toContain('member-uid');
    });

    it('validates required fields for joining', async () => {
      await suite.withDatabase({
        users: {
          'member-uid': { uid: 'member-uid', email: 'member@example.com' },
        },
      });

      const req = {
        apiToken: { owner: 'member-uid' },
        body: { id: '', password: 'secret-pass' }, // Empty ID
      };

      const res = createResponseMock();
      const next = vi.fn();

      await joinTeamLogic(req as any, res as any, next);
      await flushPromises();

      // The asyncHandler should catch the error and pass it to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Team ID and password are required',
        })
      );
      // Response should not be called when there's an error
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // Team Leave Tests
  describe('Team Leaving', () => {
    it('returns confirmation payload when member leaves', async () => {
      // Create a team with a member first
      const teamId = 'test-team-id';
      await suite.withDatabase({
        users: {
          'owner-uid': { uid: 'owner-uid', email: 'owner@example.com' },
          'member-uid': { uid: 'member-uid', email: 'member@example.com' },
        },
        teams: {
          [teamId]: {
            id: teamId,
            owner: 'owner-uid',
            password: 'secret-pass',
            members: ['owner-uid', 'member-uid'],
            maximumMembers: 10,
            createdAt: new Date(),
          },
        },
        system: {
          'owner-uid': { team: teamId },
          'member-uid': { team: teamId },
        },
      });

      // Test the service directly
      const result = await teamService.leaveTeam('member-uid');

      // Verify result
      expect(result).toBeDefined();
      expect(result.left).toBe(true);

      // Verify user left the team in Firestore
      const db = firestore();
      const systemDoc = await db.collection('system').doc('member-uid').get();
      expect(systemDoc.exists).toBe(false);

      const teamDoc = await db.collection('team').doc(teamId).get();
      expect(teamDoc.exists).toBe(true);
      const teamData = teamDoc.data();
      expect(teamData?.members).not.toContain('member-uid');
      expect(teamData?.members).toContain('owner-uid');
    });
  });
});
