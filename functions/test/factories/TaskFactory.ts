/**
 * Task Factory - Creates test task data with realistic defaults
 * 
 * Provides fluent interface for creating tasks with custom properties
 * while maintaining realistic defaults for testing.
 */

import { faker } from '@faker-js/faker';

/**
 * Task data interface
 */
export interface TaskData {
  id: string;
  name: string;
  description: string;
  mapName: string;
  traderName: string;
  requirements: {
    level: number;
    gameEdition: number;
    tasks: string[];
    items: string[];
  };
  objectives: Record<string, TaskObjective>;
  rewards: {
    experience: number;
    items: string[];
    reputation: Record<string, number>;
  };
  type: 'quest' | 'daily' | 'weekly' | 'achievement';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  gameMode: 'pvp' | 'pve' | 'both';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Task objective data
 */
export interface TaskObjective {
  id: string;
  description: string;
  type: 'kill' | 'find' | 'collect' | 'extract' | 'deliver';
  target?: string;
  count?: number;
  location?: string;
  timeLimit?: number; // in minutes
}

/**
 * Task Factory class for creating test tasks
 */
export class TaskFactory {
  private static idCounter = 1;
  
  /**
   * Valid task types
   */
  private static readonly TASK_TYPES = {
    quest: 'quest',
    daily: 'daily',
    weekly: 'weekly',
    achievement: 'achievement',
  };
  
  /**
   * Valid difficulty levels
   */
  private static readonly DIFFICULTY_LEVELS = {
    easy: 'easy',
    medium: 'medium',
    hard: 'hard',
    extreme: 'extreme',
  };
  
  /**
   * Create a single task with optional overrides
   */
  static create(overrides: Partial<TaskData> = {}): TaskData {
    const id = overrides.id || `task-${this.idCounter++}`;
    const timestamp = faker.date.past({ years: 1 });
    
    return {
      id,
      name: overrides.name || faker.lorem.words(3),
      description: overrides.description || faker.lorem.sentences(2),
      mapName: overrides.mapName || faker.helpers.arrayElement(['Customs', 'Factory', 'Shoreline', 'Woods', 'Interchange', 'Reserve']),
      traderName: overrides.traderName || faker.helpers.arrayElement(['Prapor', 'Therapist', 'Skier', 'Peacekeeper', 'Mechanic', 'Ragman', 'Jaeger', 'Fence']),
      requirements: overrides.requirements || {
        level: faker.datatype.number({ min: 1, max: 15 }),
        gameEdition: faker.datatype.number({ min: 1, max: 6 }),
        tasks: faker.helpers.arrayElements(['task-1', 'task-2', 'task-3'], 2),
        items: faker.helpers.arrayElements(['item-1', 'item-2', 'item-3'], 3),
      },
      objectives: overrides.objectives || this.createRandomObjectives(),
      rewards: overrides.rewards || {
        experience: faker.datatype.number({ min: 100, max: 5000 }),
        items: faker.helpers.arrayElements(['reward-1', 'reward-2'], 2),
        reputation: {
          [faker.helpers.arrayElement(['Prapor', 'Therapist', 'Skier'])]: faker.datatype.number({ min: 0.1, max: 1.0 }),
        },
      },
      type: overrides.type || this.TASK_TYPES.quest,
      difficulty: overrides.difficulty || this.DIFFICULTY_LEVELS.medium,
      gameMode: overrides.gameMode || 'both',
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      createdAt: overrides.createdAt || timestamp,
      updatedAt: overrides.updatedAt || timestamp,
      ...overrides,
    };
  }
  
  /**
   * Create multiple tasks
   */
  static createMany(count: number, overrides: Partial<TaskData> = {}): TaskData[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
  
  /**
   * Create random objectives for a task
   */
  private static createRandomObjectives(): Record<string, TaskObjective> {
    const objectiveCount = faker.datatype.number({ min: 1, max: 5 });
    const objectives: Record<string, TaskObjective> = {};
    
    for (let i = 0; i < objectiveCount; i++) {
      const objective: TaskObjective = {
        id: `objective-${i}`,
        description: faker.lorem.sentence(),
        type: faker.helpers.arrayElement(['kill', 'find', 'collect', 'extract', 'deliver']),
        target: faker.lorem.word(),
        count: faker.datatype.number({ min: 1, max: 10 }),
        location: faker.lorem.words(2),
        timeLimit: faker.datatype.number({ min: 5, max: 60 }),
      };
      
      objectives[objective.id] = objective;
    }
    
    return objectives;
  }
  
  /**
   * Create a quest task
   */
  static createQuest(overrides: Partial<TaskData> = {}): TaskData {
    return this.create({
      type: this.TASK_TYPES.quest,
      ...overrides,
    });
  }
  
  /**
   * Create a daily task
   */
  static createDaily(overrides: Partial<TaskData> = {}): TaskData {
    return this.create({
      type: this.TASK_TYPES.daily,
      difficulty: this.DIFFICULTY_LEVELS.easy,
      ...overrides,
    });
  }
  
  /**
   * Create a weekly task
   */
  static createWeekly(overrides: Partial<TaskData> = {}): TaskData {
    return this.create({
      type: this.TASK_TYPES.weekly,
      difficulty: this.DIFFICULTY_LEVELS.medium,
      ...overrides,
    });
  }
  
  /**
   * Create an achievement task
   */
  static createAchievement(overrides: Partial<TaskData> = {}): TaskData {
    return this.create({
      type: this.TASK_TYPES.achievement,
      difficulty: this.DIFFICULTY_LEVELS.extreme,
      ...overrides,
    });
  }
  
  /**
   * Create an easy task
   */
  static createEasy(overrides: Partial<TaskData> = {}): TaskData {
    return this.create({
      difficulty: this.DIFFICULTY_LEVELS.easy,
      requirements: {
        level: faker.datatype.number({ min: 1, max: 5 }),
        gameEdition: faker.datatype.number({ min: 1, max: 2 }),
        tasks: faker.helpers.arrayElements(['task-1', 'task-2'], 1),
        items: faker.helpers.arrayElements(['item-1', 'item-2'], 1),
      },
      ...overrides,
    });
  }
  
  /**
   * Create a hard task
   */
  static createHard(overrides: Partial<TaskData> = {}): TaskData {
    return this.create({
      difficulty: this.DIFFICULTY_LEVELS.hard,
      requirements: {
        level: faker.datatype.number({ min: 20, max: 40 }),
        gameEdition: faker.datatype.number({ min: 3, max: 6 }),
        tasks: faker.helpers.arrayElements(['task-1', 'task-2', 'task-3'], 3),
        items: faker.helpers.arrayElements(['item-1', 'item-2', 'item-3'], 5),
      },
      ...overrides,
    });
  }
  
  /**
   * Create a PvP-only task
   */
  static createPvP(overrides: Partial<TaskData> = {}): TaskData {
    return this.create({
      gameMode: 'pvp',
      ...overrides,
    });
  }
  
  /**
   * Create a PvE-only task
   */
  static createPvE(overrides: Partial<TaskData> = {}): TaskData {
    return this.create({
      gameMode: 'pve',
      ...overrides,
    });
  }
  
  /**
   * Create tasks with different types
   */
  static createWithTypes(): TaskData[] {
    return [
      this.createQuest(),
      this.createDaily(),
      this.createWeekly(),
      this.createAchievement(),
    ];
  }
  
  /**
   * Create tasks with different difficulties
   */
  static createWithDifficulties(): TaskData[] {
    return [
      this.createEasy(),
      this.create({ difficulty: this.DIFFICULTY_LEVELS.medium }),
      this.createHard(),
      this.create({ difficulty: this.DIFFICULTY_LEVELS.extreme }),
    ];
  }
  
  /**
   * Create tasks with different game modes
   */
  static createWithGameModes(): TaskData[] {
    return [
      this.createPvP(),
      this.createPvE(),
      this.create({ gameMode: 'both' }),
    ];
  }
  
  /**
   * Create a task for specific level requirement
   */
  static createWithLevelRequirement(level: number, overrides: Partial<TaskData> = {}): TaskData {
    return this.create({
      requirements: {
        level,
        gameEdition: faker.datatype.number({ min: 1, max: 6 }),
        tasks: faker.helpers.arrayElements(['task-1', 'task-2'], 2),
        items: faker.helpers.arrayElements(['item-1', 'item-2'], 3),
      },
      ...overrides,
    });
  }
  
  /**
   * Create a task builder for fluent interface
   */
  static builder(): TaskBuilder {
    return new TaskBuilder();
  }
  
  /**
   * Reset the ID counter for deterministic tests
   */
  static resetIdCounter(): void {
    this.idCounter = 1;
  }
}

/**
 * Task Builder for fluent interface
 */
export class TaskBuilder {
  private data: Partial<TaskData> = {};
  
  constructor() {
    // Set default values
    this.data = {
      type: TaskFactory.TASK_TYPES.quest,
      difficulty: TaskFactory.DIFFICULTY_LEVELS.medium,
      gameMode: 'both',
      isActive: true,
      requirements: {
        level: 10,
        gameEdition: 1,
        tasks: [],
        items: [],
      },
      objectives: {},
      rewards: {
        experience: 1000,
        items: [],
        reputation: {},
      },
    };
  }
  
  withId(id: string): TaskBuilder {
    this.data.id = id;
    return this;
  }
  
  withName(name: string): TaskBuilder {
    this.data.name = name;
    return this;
  }
  
  withDescription(description: string): TaskBuilder {
    this.data.description = description;
    return this;
  }
  
  withMapName(mapName: string): TaskBuilder {
    this.data.mapName = mapName;
    return this;
  }
  
  withTraderName(traderName: string): TaskBuilder {
    this.data.traderName = traderName;
    return this;
  }
  
  withType(type: keyof typeof TaskFactory.TASK_TYPES): TaskBuilder {
    this.data.type = TaskFactory.TASK_TYPES[type];
    return this;
  }
  
  withDifficulty(difficulty: keyof typeof TaskFactory.DIFFICULTY_LEVELS): TaskBuilder {
    this.data.difficulty = TaskFactory.DIFFICULTY_LEVELS[difficulty];
    return this;
  }
  
  withGameMode(gameMode: 'pvp' | 'pve' | 'both'): TaskBuilder {
    this.data.gameMode = gameMode;
    return this;
  }
  
  withLevelRequirement(level: number): TaskBuilder {
    if (!this.data.requirements) this.data.requirements = {} as any;
    this.data.requirements.level = level;
    return this;
  }
  
  withGameEditionRequirement(edition: number): TaskBuilder {
    if (!this.data.requirements) this.data.requirements = {} as any;
    this.data.requirements.gameEdition = edition;
    return this;
  }
  
  withTaskRequirements(tasks: string[]): TaskBuilder {
    if (!this.data.requirements) this.data.requirements = {} as any;
    this.data.requirements.tasks = tasks;
    return this;
  }
  
  withItemRequirements(items: string[]): TaskBuilder {
    if (!this.data.requirements) this.data.requirements = {} as any;
    this.data.requirements.items = items;
    return this;
  }
  
  withObjective(objectiveId: string, objective: TaskObjective): TaskBuilder {
    if (!this.data.objectives) this.data.objectives = {};
    this.data.objectives[objectiveId] = objective;
    return this;
  }
  
  withExperienceReward(experience: number): TaskBuilder {
    if (!this.data.rewards) this.data.rewards = {} as any;
    this.data.rewards.experience = experience;
    return this;
  }
  
  withItemRewards(items: string[]): TaskBuilder {
    if (!this.data.rewards) this.data.rewards = {} as any;
    this.data.rewards.items = items;
    return this;
  }
  
  withReputationReward(trader: string, amount: number): TaskBuilder {
    if (!this.data.rewards) this.data.rewards = {} as any;
    if (!this.data.rewards.reputation) this.data.rewards.reputation = {};
    this.data.rewards.reputation[trader] = amount;
    return this;
  }
  
  withActive(isActive: boolean): TaskBuilder {
    this.data.isActive = isActive;
    return this;
  }
  
  build(): TaskData {
    return TaskFactory.create(this.data);
  }
}

/**
 * Task presets for common test scenarios
 */
export const TaskPresets = {
  /**
   * Standard task for most tests
   */
  standard: () => TaskFactory.create(),
  
  /**
   * Easy task for beginner tests
   */
  easy: () => TaskFactory.createEasy(),
  
  /**
   * Hard task for advanced tests
   */
  hard: () => TaskFactory.createHard(),
  
  /**
   * Daily task for recurring tests
   */
  daily: () => TaskFactory.createDaily(),
  
  /**
   * Weekly task for weekly challenges
   */
  weekly: () => TaskFactory.createWeekly(),
  
  /**
   * Achievement task for milestone tests
   */
  achievement: () => TaskFactory.createAchievement(),
  
  /**
   * PvP-only task
   */
  pvp: () => TaskFactory.createPvP(),
  
  /**
   * PvE-only task
   */
  pve: () => TaskFactory.createPvE(),
};