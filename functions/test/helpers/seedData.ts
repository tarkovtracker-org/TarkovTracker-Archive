/**
 * Common Test Data Fixtures
 *
 * Pre-built test data for common scenarios.
 * Use these to quickly seed realistic test data without manual setup.
 */

import { seedDb, SeedData } from './emulatorSetup';

// ============================================================================
// USER FIXTURES
// ============================================================================

export const users = {
  user1: {
    uid: 'user-001',
    email: 'user1@example.com',
    displayName: 'Test User 1',
    emailVerified: true,
    disabled: false,
    customClaims: { role: 'user' },
  },
  user2: {
    uid: 'user-002',
    email: 'user2@example.com',
    displayName: 'Test User 2',
    emailVerified: true,
    disabled: false,
    customClaims: { role: 'user' },
  },
  user3: {
    uid: 'user-003',
    email: 'user3@example.com',
    displayName: 'Test User 3',
    emailVerified: false,
    disabled: false,
    customClaims: { role: 'user' },
  },
  admin: {
    uid: 'admin-001',
    email: 'admin@example.com',
    displayName: 'Admin User',
    emailVerified: true,
    disabled: false,
    customClaims: { role: 'admin' },
  },
};

// ============================================================================
// TOKEN FIXTURES
// ============================================================================

export const tokens = {
  token1: {
    id: 'token-001',
    owner: 'user-001',
    name: 'Development Token',
    active: true,
    createdAt: new Date('2024-01-01'),
    lastUsed: new Date('2024-01-15'),
    expiresAt: new Date('2025-01-01'),
    scopes: ['read', 'write'],
  },
  token2: {
    id: 'token-002',
    owner: 'user-001',
    name: 'Production Token',
    active: true,
    createdAt: new Date('2024-02-01'),
    lastUsed: new Date('2024-02-10'),
    expiresAt: null,
    scopes: ['read'],
  },
  token3: {
    id: 'token-003',
    owner: 'user-002',
    name: 'Inactive Token',
    active: false,
    createdAt: new Date('2023-01-01'),
    lastUsed: null,
    expiresAt: new Date('2024-01-01'),
    scopes: ['read', 'write'],
  },
  expiredToken: {
    id: 'token-expired',
    owner: 'user-003',
    name: 'Expired Token',
    active: false,
    createdAt: new Date('2023-01-01'),
    lastUsed: new Date('2023-06-01'),
    expiresAt: new Date('2023-12-31'),
    scopes: ['read'],
  },
};

// ============================================================================
// TEAM FIXTURES
// ============================================================================

export const teams = {
  team1: {
    id: 'team-001',
    name: 'Alpha Team',
    owner: 'user-001',
    members: ['user-001', 'user-002'],
    roles: {
      'user-001': 'owner',
      'user-002': 'member',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  team2: {
    id: 'team-002',
    name: 'Beta Team',
    owner: 'user-002',
    members: ['user-002', 'user-003'],
    roles: {
      'user-002': 'owner',
      'user-003': 'member',
    },
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-10'),
  },
  team3: {
    id: 'team-003',
    name: 'Solo Team',
    owner: 'user-003',
    members: ['user-003'],
    roles: {
      'user-003': 'owner',
    },
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
};

// ============================================================================
// PROGRESS FIXTURES
// ============================================================================

export const progress = {
  user1Progress: {
    uid: 'user-001',
    taskProgress: {
      'task-001': { status: 'completed', completedAt: new Date('2024-01-10') },
      'task-002': { status: 'in_progress', progress: 50 },
      'task-003': { status: 'not_started' },
    },
    hideoutProgress: {
      'hideout-001': { level: 3, upgrades: ['upgrade-1', 'upgrade-2'] },
      'hideout-002': { level: 1, upgrades: [] },
    },
    traderProgress: {
      'prapor': { level: 4, reputation: 0.35 },
      'therapist': { level: 3, reputation: 0.15 },
    },
  },
  user2Progress: {
    uid: 'user-002',
    taskProgress: {
      'task-001': { status: 'completed', completedAt: new Date('2024-02-05') },
      'task-002': { status: 'not_started' },
    },
    hideoutProgress: {
      'hideout-001': { level: 2, upgrades: ['upgrade-1'] },
    },
    traderProgress: {
      'prapor': { level: 2, reputation: 0.10 },
    },
  },
};

// ============================================================================
// TASK FIXTURES
// ============================================================================

export const tasks = {
  task1: {
    id: 'task-001',
    name: 'Debut',
    questGiver: 'Prapor',
    location: 'Factory',
    objectives: [
      {
        id: 'obj-1',
        type: 'kill',
        target: 'Scav',
        count: 3,
      },
    ],
    requirements: [],
    rewards: {
      xp: 2000,
      roubles: 5000,
    },
  },
  task2: {
    id: 'task-002',
    name: 'Knock Knock',
    questGiver: 'Therapist',
    location: 'Interchange',
    objectives: [
      {
        id: 'obj-1',
        type: 'find_item',
        item: 'Morphine',
        count: 2,
      },
    ],
    requirements: [{ taskId: 'task-001' }],
    rewards: {
      xp: 3000,
      roubles: 10000,
    },
  },
};

// ============================================================================
// SYSTEM DATA FIXTURES
// ============================================================================

export const systemData = {
  config: {
    version: '1.0.0',
    environment: 'test',
    features: {
      teams: true,
      tokens: true,
      analytics: false,
    },
  },
  statistics: {
    totalUsers: 0,
    totalTeams: 0,
    totalTokens: 0,
    lastUpdated: new Date(),
  },
};

// ============================================================================
// PRESET SEED COMBINATIONS
// ============================================================================

/**
 * Seed a minimal test environment
 * Just user1 and no other data
 */
export async function seedMinimal(): Promise<void> {
  await seedDb({
    users: { [users.user1.uid]: users.user1 },
  });
}

/**
 * Seed a complete single-user environment
 * User with tokens, progress, and tasks
 */
export async function seedSingleUser(): Promise<void> {
  await seedDb({
    users: { [users.user1.uid]: users.user1 },
    tokens: {
      [tokens.token1.id]: tokens.token1,
      [tokens.token2.id]: tokens.token2,
    },
    progress: {
      [progress.user1Progress.uid]: progress.user1Progress,
    },
    tasks: {
      [tasks.task1.id]: tasks.task1,
      [tasks.task2.id]: tasks.task2,
    },
  });
}

/**
 * Seed a multi-user environment
 * Multiple users with tokens, teams, and progress
 */
export async function seedMultiUser(): Promise<void> {
  await seedDb({
    users: {
      [users.user1.uid]: users.user1,
      [users.user2.uid]: users.user2,
      [users.user3.uid]: users.user3,
    },
    tokens: {
      [tokens.token1.id]: tokens.token1,
      [tokens.token2.id]: tokens.token2,
      [tokens.token3.id]: tokens.token3,
    },
    teams: {
      [teams.team1.id]: teams.team1,
      [teams.team2.id]: teams.team2,
    },
    progress: {
      [progress.user1Progress.uid]: progress.user1Progress,
      [progress.user2Progress.uid]: progress.user2Progress,
    },
  });
}

/**
 * Seed a complete test environment
 * Everything: users, tokens, teams, progress, tasks
 */
export async function seedComplete(): Promise<void> {
  await seedDb({
    users: {
      [users.user1.uid]: users.user1,
      [users.user2.uid]: users.user2,
      [users.user3.uid]: users.user3,
      [users.admin.uid]: users.admin,
    },
    tokens: {
      [tokens.token1.id]: tokens.token1,
      [tokens.token2.id]: tokens.token2,
      [tokens.token3.id]: tokens.token3,
      [tokens.expiredToken.id]: tokens.expiredToken,
    },
    teams: {
      [teams.team1.id]: teams.team1,
      [teams.team2.id]: teams.team2,
      [teams.team3.id]: teams.team3,
    },
    progress: {
      [progress.user1Progress.uid]: progress.user1Progress,
      [progress.user2Progress.uid]: progress.user2Progress,
    },
    tasks: {
      [tasks.task1.id]: tasks.task1,
      [tasks.task2.id]: tasks.task2,
    },
  });
}

/**
 * Seed a team collaboration environment
 * Multiple users in the same team
 */
export async function seedTeamCollaboration(): Promise<void> {
  await seedDb({
    users: {
      [users.user1.uid]: users.user1,
      [users.user2.uid]: users.user2,
    },
    teams: {
      [teams.team1.id]: teams.team1,
    },
    progress: {
      [progress.user1Progress.uid]: progress.user1Progress,
      [progress.user2Progress.uid]: progress.user2Progress,
    },
  });
}

/**
 * Seed with various token states
 * Active, inactive, and expired tokens
 */
export async function seedTokenVariations(): Promise<void> {
  await seedDb({
    users: {
      [users.user1.uid]: users.user1,
      [users.user2.uid]: users.user2,
      [users.user3.uid]: users.user3,
    },
    tokens: {
      [tokens.token1.id]: tokens.token1, // Active
      [tokens.token2.id]: tokens.token2, // Active, different scopes
      [tokens.token3.id]: tokens.token3, // Inactive
      [tokens.expiredToken.id]: tokens.expiredToken, // Expired
    },
  });
}

// ============================================================================
// CUSTOM SEED BUILDER
// ============================================================================

/**
 * Build custom seed data programmatically
 *
 * Usage:
 * ```typescript
 * const data = new SeedBuilder()
 *   .addUser(users.user1)
 *   .addToken(tokens.token1)
 *   .addTeam(teams.team1)
 *   .build();
 * await seedDb(data);
 * ```
 */
export class SeedBuilder {
  private data: SeedData = {
    users: {},
    tokens: {},
    teams: {},
    progress: {},
    tasks: {},
  };

  addUser(user: any): this {
    this.data.users![user.uid] = user;
    return this;
  }

  addUsers(...userList: any[]): this {
    for (const user of userList) {
      this.addUser(user);
    }
    return this;
  }

  addToken(token: any): this {
    this.data.tokens![token.id] = token;
    return this;
  }

  addTokens(...tokenList: any[]): this {
    for (const token of tokenList) {
      this.addToken(token);
    }
    return this;
  }

  addTeam(team: any): this {
    this.data.teams![team.id] = team;
    return this;
  }

  addTeams(...teamList: any[]): this {
    for (const team of teamList) {
      this.addTeam(team);
    }
    return this;
  }

  addProgress(progress: any): this {
    this.data.progress![progress.uid] = progress;
    return this;
  }

  addTask(task: any): this {
    this.data.tasks![task.id] = task;
    return this;
  }

  build(): SeedData {
    return this.data;
  }

  async seed(): Promise<void> {
    await seedDb(this.build());
  }
}
