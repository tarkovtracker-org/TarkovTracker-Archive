// Reusable service mocks for testing
import { vi } from 'vitest';

export const createProgressServiceMock = () => ({
  getUserProgress: vi.fn(),
  setPlayerLevel: vi.fn(),
  updateSingleTask: vi.fn(),
  updateMultipleTasks: vi.fn(),
  updateTaskObjective: vi.fn(),
  getTaskStatus: vi.fn(),
});

export const createTeamServiceMock = () => ({
  getTeamProgress: vi.fn(),
  createTeam: vi.fn(),
  joinTeam: vi.fn(),
  leaveTeam: vi.fn(),
});

export const createTokenServiceMock = () => ({
  createToken: vi.fn(),
  validateToken: vi.fn(),
  getTokenInfo: vi.fn(),
  listUserTokens: vi.fn(),
  revokeToken: vi.fn(),
});

export const createValidationServiceMock = () => ({
  validateUserId: vi.fn(),
  validateLevel: vi.fn(),
  validateTaskId: vi.fn(),
  validateTaskUpdate: vi.fn(),
  validateMultipleTaskUpdate: vi.fn(),
  validateObjectiveId: vi.fn(),
  validateObjectiveUpdate: vi.fn(),
});

export const createFirestoreLazyMock = (mockService: any) => {
  return vi.fn().mockReturnValue(mockService);
};

// For ProgressService tests, we need to ensure Firestore instance is properly mocked
export const createFirestoreMock = () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  batch: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  runTransaction: vi.fn(),
  FieldValue: {
    serverTimestamp: vi.fn(),
    arrayUnion: vi.fn(),
    arrayRemove: vi.fn(),
    delete: vi.fn(),
    increment: vi.fn(),
  },
  Timestamp: {
    now: vi.fn(),
    fromDate: vi.fn(),
  },
});
