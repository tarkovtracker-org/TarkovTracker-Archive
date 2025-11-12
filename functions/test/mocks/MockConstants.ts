/**
 * Shared mock constants for consistent test data across all test files
 * This centralizes test data to ensure maintainability and consistency
 */

export const MOCK_USERS = {
  USER_1: {
    id: 'user-1',
    username: 'testuser1',
    email: 'test1@example.com'
  },
  USER_2: {
    id: 'user-2', 
    username: 'testuser2',
    email: 'test2@example.com'
  },
  USER_3: {
    id: 'user-3',
    username: 'testuser3', 
    email: 'test3@example.com'
  }
} as const;

export const MOCK_TEAMS = {
  TEAM_1: {
    id: 'team-1',
    name: 'Test Team',
    members: ['user-1', 'user-2'],
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01')
  },
  TEAM_2: {
    id: 'team-2',
    name: 'Second Team',
    members: ['user-3'],
    createdBy: 'user-3',
    createdAt: new Date('2024-01-02')
  }
} as const;

export const MOCK_TASKS = {
  TASK_ALPHA: {
    id: 'task-alpha',
    name: 'Task Alpha',
    description: 'First test task'
  },
  TASK_BETA: {
    id: 'task-beta', 
    name: 'Task Beta',
    description: 'Second test task'
  },
  TASK_GAMMA: {
    id: 'task-gamma',
    name: 'Task Gamma', 
    description: 'Third test task'
  }
} as const;

export const MOCK_TOKENS = {
  VALID_TOKEN: 'test-token-123',
  EXPIRED_TOKEN: 'expired-token-456',
  INVALID_TOKEN: 'invalid-token-789'
} as const;

export const MOCK_GAME_DATA = {
  HIDEOUT_DATA: { hideoutStations: [] },
  TASK_DATA: { tasks: [MOCK_TASKS.TASK_ALPHA, MOCK_TASKS.TASK_BETA] }
} as const;

export const MOCK_RESPONSES = {
  SUCCESS: { success: true },
  NOT_FOUND: { success: false, error: 'Not found' },
  UNAUTHORIZED: { success: false, error: 'Unauthorized' }
} as const;

export const DEFAULT_DATABASE_STATE = {
  teams: MOCK_TEAMS,
  users: MOCK_USERS,
  tokens: {},
  tarkovdata: MOCK_GAME_DATA
} as const;
