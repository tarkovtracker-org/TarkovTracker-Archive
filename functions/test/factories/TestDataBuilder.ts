/**
 * Test Data Builder - Comprehensive builder for creating related test data
 * 
 * Provides a fluent interface for creating complete test scenarios
 * with users, teams, tokens, progress, and tasks that are
 * properly related to each other.
 */

import { createTestContext } from '../utils/testHelpers';
import { TokenFactory, TokenData } from './TokenFactory';
import { UserFactory, UserData } from './UserFactory';
import { TeamFactory, TeamData } from './TeamFactory';
import { ProgressFactory, ProgressData } from './ProgressFactory';
import { TaskFactory, TaskData } from './TaskFactory';

/**
 * Complete test data interface
 */
export interface CompleteTestData {
  context: {
    userId: string;
    teamId: string;
    tokenId: string;
    timestamp: number;
  };
  user: UserData;
  team: TeamData;
  token: TokenData;
  progress: ProgressData;
  tasks: TaskData[];
}

/**
 * Test Data Builder for creating comprehensive test scenarios
 */
export class TestDataBuilder {
  private context: any;
  private user: UserData | null = null;
  private team: TeamData | null = null;
  private token: TokenData | null = null;
  private progress: ProgressData | null = null;
  private tasks: TaskData[] = [];
  
  constructor() {
    this.context = createTestContext();
  }
  
  /**
   * Create a user for the test scenario
   */
  withUser(overrides: Partial<UserData> = {}): TestDataBuilder {
    this.user = UserFactory.create({
      uid: this.context.userId,
      ...overrides,
    });
    return this;
  }
  
  /**
   * Create a team for the test scenario
   */
  withTeam(overrides: Partial<TeamData> = {}): TestDataBuilder {
    this.team = TeamFactory.create({
      id: this.context.teamId,
      owner: this.context.userId,
      members: [this.context.userId],
      ...overrides,
    });
    return this;
  }
  
  /**
   * Create a token for the test scenario
   */
  withToken(overrides: Partial<TokenData> = {}): TestDataBuilder {
    this.token = TokenFactory.create({
      id: this.context.tokenId,
      owner: this.context.userId,
      ...overrides,
    });
    return this;
  }
  
  /**
   * Create progress for the test scenario
   */
  withProgress(overrides: Partial<ProgressData> = {}): TestDataBuilder {
    this.progress = ProgressFactory.create({
      userId: this.context.userId,
      ...overrides,
    });
    return this;
  }
  
  /**
   * Add tasks to the test scenario
   */
  withTasks(count: number = 1, overrides: Partial<TaskData> = {}): TestDataBuilder {
    this.tasks = TaskFactory.createMany(count, overrides);
    return this;
  }
  
  /**
   * Add specific tasks to the test scenario
   */
  withSpecificTasks(tasks: TaskData[]): TestDataBuilder {
    this.tasks = tasks;
    return this;
  }
  
  /**
   * Create a complete new user scenario
   */
  asNewUser(overrides: Partial<UserData> = {}): TestDataBuilder {
    return this.withUser({
      level: 1,
      gameEdition: 1,
      ...overrides,
    });
  }
  
  /**
   * Create an experienced user scenario
   */
  asExperiencedUser(overrides: Partial<UserData> = {}): TestDataBuilder {
    return this.withUser({
      level: 50,
      gameEdition: 4,
      ...overrides,
    });
  }
  
  /**
   * Create a max level user scenario
   */
  asMaxLevelUser(overrides: Partial<UserData> = {}): TestDataBuilder {
    return this.withUser({
      level: 79,
      gameEdition: 6,
      ...overrides,
    });
  }
  
  /**
   * Create a solo team scenario
   */
  withSoloTeam(overrides: Partial<TeamData> = {}): TestDataBuilder {
    return this.withTeam({
      members: [this.context.userId],
      ...overrides,
    });
  }
  
  /**
   * Create a full team scenario
   */
  withFullTeam(memberCount: number = 10, overrides: Partial<TeamData> = {}): TestDataBuilder {
    const members = Array.from({ length: memberCount - 1 }, (_, i) => 
      `user-${this.context.timestamp}-${i + 1}`
    );
    
    return this.withTeam({
      members: [this.context.userId, ...members],
      ...overrides,
    });
  }
  
  /**
   * Create a team with admin permissions
   */
  withAdminToken(overrides: Partial<TokenData> = {}): TestDataBuilder {
    return this.withToken({
      permissions: ['GP', 'WP', 'TP', 'ADMIN'],
      ...overrides,
    });
  }
  
  /**
   * Create a token with basic permissions
   */
  withBasicToken(overrides: Partial<TokenData> = {}): TestDataBuilder {
    return this.withToken({
      permissions: ['GP'],
      ...overrides,
    });
  }
  
  /**
   * Create progress with completed tasks
   */
  withCompletedProgress(taskIds: string[], overrides: Partial<ProgressData> = {}): TestDataBuilder {
    return this.withProgress({
      pvp: {
        taskCompletions: taskIds.reduce((acc, taskId) => {
          acc[taskId] = {
            complete: true,
            timestamp: Date.now(),
          };
          return acc;
        }, {} as any),
        taskObjectives: {},
        hideoutModules: {},
        hideoutParts: {},
      },
      ...overrides,
    });
  }
  
  /**
   * Create empty progress
   */
  withEmptyProgress(overrides: Partial<ProgressData> = {}): TestDataBuilder {
    return this.withProgress({
      pvp: {
        taskCompletions: {},
        taskObjectives: {},
        hideoutModules: {},
        hideoutParts: {},
      },
      ...overrides,
    });
  }
  
  /**
   * Create tasks for different difficulty levels
   */
  withMixedDifficultyTasks(overrides: Partial<TaskData> = {}): TestDataBuilder {
    this.tasks = [
      TaskFactory.createEasy({ ...overrides }),
      TaskFactory.create({ difficulty: 'medium', ...overrides }),
      TaskFactory.createHard({ ...overrides }),
    ];
    return this;
  }
  
  /**
   * Create tasks for different types
   */
  withMixedTypeTasks(overrides: Partial<TaskData> = {}): TestDataBuilder {
    this.tasks = [
      TaskFactory.createQuest({ ...overrides }),
      TaskFactory.createDaily({ ...overrides }),
      TaskFactory.createWeekly({ ...overrides }),
      TaskFactory.createAchievement({ ...overrides }),
    ];
    return this;
  }
  
  /**
   * Create a PvP-focused scenario
   */
  forPvP(overrides: any = {}): TestDataBuilder {
    return this
      .withUser({ pmcFaction: 'USEC', ...overrides.user })
      .withToken({ gameMode: 'pvp', ...overrides.token })
      .withProgress({ currentGameMode: 'pvp', ...overrides.progress })
      .withTasks(3, { gameMode: 'pvp', ...overrides.tasks });
  }
  
  /**
   * Create a PvE-focused scenario
   */
  forPvE(overrides: any = {}): TestDataBuilder {
    return this
      .withUser({ pmcFaction: 'BEAR', ...overrides.user })
      .withToken({ gameMode: 'pve', ...overrides.token })
      .withProgress({ currentGameMode: 'pve', ...overrides.progress })
      .withTasks(3, { gameMode: 'pve', ...overrides.tasks });
  }
  
  /**
   * Build the complete test data
   */
  build(): CompleteTestData {
    if (!this.user) {
      throw new Error('User data is required. Call withUser() first.');
    }
    
    return {
      context: this.context,
      user: this.user,
      team: this.team || TeamFactory.createForOwner(this.context.userId),
      token: this.token || TokenFactory.createForUser(this.context.userId),
      progress: this.progress || ProgressFactory.createForUser(this.context.userId),
      tasks: this.tasks,
    };
  }
  
  /**
   * Build minimal test data (user only)
   */
  buildMinimal(): CompleteTestData {
    if (!this.user) {
      throw new Error('User data is required. Call withUser() first.');
    }
    
    return {
      context: this.context,
      user: this.user,
      team: TeamFactory.createForOwner(this.context.userId),
      token: TokenFactory.createForUser(this.context.userId),
      progress: ProgressFactory.createForUser(this.context.userId),
      tasks: [],
    };
  }
  
  /**
   * Build team-focused test data
   */
  buildTeamScenario(): CompleteTestData {
    if (!this.user || !this.team) {
      throw new Error('User and team data are required. Call withUser() and withTeam() first.');
    }
    
    return {
      context: this.context,
      user: this.user,
      team: this.team,
      token: this.token || TokenFactory.createForUser(this.context.userId),
      progress: this.progress || ProgressFactory.createForUser(this.context.userId),
      tasks: this.tasks,
    };
  }
  
  /**
   * Build token-focused test data
   */
  buildTokenScenario(): CompleteTestData {
    if (!this.user || !this.token) {
      throw new Error('User and token data are required. Call withUser() and withToken() first.');
    }
    
    return {
      context: this.context,
      user: this.user,
      team: TeamFactory.createForOwner(this.context.userId),
      token: this.token,
      progress: this.progress || ProgressFactory.createForUser(this.context.userId),
      tasks: this.tasks,
    };
  }
  
  /**
   * Build progress-focused test data
   */
  buildProgressScenario(): CompleteTestData {
    if (!this.user || !this.progress) {
      throw new Error('User and progress data are required. Call withUser() and withProgress() first.');
    }
    
    return {
      context: this.context,
      user: this.user,
      team: TeamFactory.createForOwner(this.context.userId),
      token: this.token || TokenFactory.createForUser(this.context.userId),
      progress: this.progress,
      tasks: this.tasks,
    };
  }
}

/**
 * Test data presets for common scenarios
 */
export const TestDataPresets = {
  /**
   * New user starting out
   */
  newUser: () => new TestDataBuilder()
    .asNewUser()
    .withSoloTeam()
    .withBasicToken()
    .withEmptyProgress()
    .withTasks(3)
    .build(),
  
  /**
   * Experienced user with team
   */
  experiencedUser: () => new TestDataBuilder()
    .asExperiencedUser()
    .withFullTeam(5)
    .withAdminToken()
    .withCompletedProgress(['task-1', 'task-2', 'task-3'])
    .withMixedDifficultyTasks()
    .build(),
  
  /**
   * Solo player with progress
   */
  soloPlayer: () => new TestDataBuilder()
    .asExperiencedUser()
    .withSoloTeam()
    .withExtendedToken()
    .withCompletedProgress(['task-1', 'task-2'])
    .withTasks(5)
    .build(),
  
  /**
   * Team leader scenario
   */
  teamLeader: () => new TestDataBuilder()
    .asExperiencedUser()
    .withFullTeam(8)
    .withAdminToken()
    .withCompletedProgress(['task-1', 'task-2', 'task-3', 'task-4'])
    .withMixedTypeTasks()
    .build(),
  
  /**
   * PvP-focused player
   */
  pvpPlayer: () => new TestDataBuilder()
    .forPvP()
    .withFullTeam(6)
    .withAdminToken()
    .withCompletedProgress(['pvp-task-1', 'pvp-task-2'])
    .withTasks(5, { type: 'quest' })
    .build(),
  
  /**
   * PvE-focused player
   */
  pvePlayer: () => new TestDataBuilder()
    .forPvE()
    .withFullTeam(4)
    .withExtendedToken()
    .withCompletedProgress(['pve-task-1', 'pve-task-2'])
    .withTasks(5, { type: 'quest' })
    .build(),
  
  /**
   * Minimal test data (user only)
   */
  minimal: () => new TestDataBuilder()
    .withUser()
    .buildMinimal(),
};

/**
 * Helper to seed complete test data to database
 */
export const seedCompleteTestData = async (data: CompleteTestData): Promise<void> => {
  const { seedDb } = await import('../setup');
  
  await seedDb({
    users: { [data.context.userId]: data.user },
    teams: { [data.context.teamId]: data.team },
    token: { [data.context.tokenId]: data.token },
    progress: { [data.context.userId]: data.progress },
    tarkovdata: {
      tasks: data.tasks.reduce((acc, task) => {
        acc[task.id] = task;
        return acc;
      }, {} as Record<string, TaskData>),
    },
  });
};

/**
 * Helper to create and seed test data in one step
 */
export const createAndSeedTestData = async (
  builder: TestDataBuilder,
  buildMethod: 'build' | 'buildMinimal' | 'buildTeamScenario' | 'buildTokenScenario' | 'buildProgressScenario' = 'build'
): Promise<CompleteTestData> => {
  const data = builder[buildMethod]();
  await seedCompleteTestData(data);
  return data;
};