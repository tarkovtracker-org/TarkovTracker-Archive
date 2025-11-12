/**
 * Progress Factory - Creates test progress data with realistic defaults
 * 
 * Provides fluent interface for creating progress data with custom properties
 * while maintaining realistic defaults for testing.
 */

import { faker } from '@faker-js/faker';

/**
 * Progress data interface
 */
export interface ProgressData {
  userId: string;
  currentGameMode: 'pvp' | 'pve';
  pvp: {
    taskCompletions: Record<string, TaskCompletion>;
    taskObjectives: Record<string, Record<string, TaskObjective>>;
    hideoutModules: Record<string, HideoutModule>;
    hideoutParts: Record<string, HideoutPart>;
  };
  pve: {
    taskCompletions: Record<string, TaskCompletion>;
    taskObjectives: Record<string, Record<string, TaskObjective>>;
    hideoutModules: Record<string, HideoutModule>;
    hideoutParts: Record<string, HideoutPart>;
  };
  lastUpdated: Date;
}

/**
 * Task completion data
 */
export interface TaskCompletion {
  complete: boolean;
  failed?: boolean;
  timestamp: number;
  completeTime?: number;
}

/**
 * Task objective data
 */
export interface TaskObjective {
  complete: boolean;
  timestamp: number;
}

/**
 * Hideout module data
 */
export interface HideoutModule {
  level: number;
  complete: boolean;
  timestamp: number;
}

/**
 * Hideout part data
 */
export interface HideoutPart {
  found: boolean;
  timestamp: number;
}

/**
 * Progress Factory class for creating test progress data
 */
export class ProgressFactory {
  private static idCounter = 1;
  
  /**
   * Create a single progress data with optional overrides
   */
  static create(overrides: Partial<ProgressData> = {}): ProgressData {
    const userId = overrides.userId || `user-${this.idCounter++}`;
    const timestamp = faker.date.past({ years: 1 });
    
    return {
      userId,
      currentGameMode: overrides.currentGameMode || 'pvp',
      pvp: overrides.pvp || this.createGameModeData(),
      pve: overrides.pve || this.createGameModeData(),
      lastUpdated: overrides.lastUpdated || timestamp,
      ...overrides,
    };
  }
  
  /**
   * Create multiple progress data
   */
  static createMany(count: number, overrides: Partial<ProgressData> = {}): ProgressData[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
  
  /**
   * Create game mode data structure
   */
  private static createGameModeData(): ProgressData['pvp'] {
    return {
      taskCompletions: {},
      taskObjectives: {},
      hideoutModules: {},
      hideoutParts: {},
    };
  }
  
  /**
   * Create progress for a specific user
   */
  static createForUser(userId: string, overrides: Partial<ProgressData> = {}): ProgressData {
    return this.create({
      userId,
      ...overrides,
    });
  }
  
  /**
   * Create progress with specific game mode
   */
  static createWithGameMode(gameMode: 'pvp' | 'pve', overrides: Partial<ProgressData> = {}): ProgressData {
    return this.create({
      currentGameMode: gameMode,
      ...overrides,
    });
  }
  
  /**
   * Create progress with completed tasks
   */
  static createWithCompletedTasks(taskIds: string[], overrides: Partial<ProgressData> = {}): ProgressData {
    const gameModeData = this.createGameModeData();
    
    taskIds.forEach(taskId => {
      gameModeData.taskCompletions[taskId] = {
        complete: true,
        timestamp: faker.date.past({ years: 1 }).getTime(),
      };
    });
    
    return this.create({
      pvp: gameModeData,
      pve: gameModeData,
      ...overrides,
    });
  }
  
  /**
   * Create progress with failed tasks
   */
  static createWithFailedTasks(taskIds: string[], overrides: Partial<ProgressData> = {}): ProgressData {
    const gameModeData = this.createGameModeData();
    
    taskIds.forEach(taskId => {
      gameModeData.taskCompletions[taskId] = {
        complete: true,
        failed: true,
        timestamp: faker.date.past({ years: 1 }).getTime(),
      };
    });
    
    return this.create({
      pvp: gameModeData,
      pve: gameModeData,
      ...overrides,
    });
  }
  
  /**
   * Create progress with task objectives
   */
  static createWithTaskObjectives(
    taskObjectives: Record<string, string[]>,
    overrides: Partial<ProgressData> = {}
  ): ProgressData {
    const gameModeData = this.createGameModeData();
    
    Object.entries(taskObjectives).forEach(([taskId, objectiveIds]) => {
      gameModeData.taskObjectives[taskId] = {};
      objectiveIds.forEach(objectiveId => {
        gameModeData.taskObjectives[taskId][objectiveId] = {
          complete: faker.datatype.boolean(),
          timestamp: faker.date.past({ years: 1 }).getTime(),
        };
      });
    });
    
    return this.create({
      pvp: gameModeData,
      pve: gameModeData,
      ...overrides,
    });
  }
  
  /**
   * Create progress with hideout modules
   */
  static createWithHideoutModules(
    modules: Record<string, number>,
    overrides: Partial<ProgressData> = {}
  ): ProgressData {
    const gameModeData = this.createGameModeData();
    
    Object.entries(modules).forEach(([moduleId, level]) => {
      gameModeData.hideoutModules[moduleId] = {
        level: Math.max(1, Math.min(3, level)),
        complete: level >= 3,
        timestamp: faker.date.past({ years: 1 }).getTime(),
      };
    });
    
    return this.create({
      pvp: gameModeData,
      pve: gameModeData,
      ...overrides,
    });
  }
  
  /**
   * Create progress with hideout parts
   */
  static createWithHideoutParts(
    parts: string[],
    overrides: Partial<ProgressData> = {}
  ): ProgressData {
    const gameModeData = this.createGameModeData();
    
    parts.forEach(partId => {
      gameModeData.hideoutParts[partId] = {
        found: faker.datatype.boolean(),
        timestamp: faker.date.past({ years: 1 }).getTime(),
      };
    });
    
    return this.create({
      pvp: gameModeData,
      pve: gameModeData,
      ...overrides,
    });
  }
  
  /**
   * Create progress with mixed completion states
   */
  static createWithMixedProgress(overrides: Partial<ProgressData> = {}): ProgressData {
    const gameModeData = this.createGameModeData();
    
    // Add some completed tasks
    for (let i = 0; i < 5; i++) {
      const taskId = `completed-task-${i}`;
      gameModeData.taskCompletions[taskId] = {
        complete: true,
        timestamp: faker.date.past({ years: 1 }).getTime(),
      };
    }
    
    // Add some failed tasks
    for (let i = 0; i < 2; i++) {
      const taskId = `failed-task-${i}`;
      gameModeData.taskCompletions[taskId] = {
        complete: true,
        failed: true,
        timestamp: faker.date.past({ years: 1 }).getTime(),
      };
    }
    
    // Add some task objectives
    const objectivesTaskId = 'objectives-task';
    gameModeData.taskObjectives[objectivesTaskId] = {};
    for (let i = 0; i < 3; i++) {
      gameModeData.taskObjectives[objectivesTaskId][`objective-${i}`] = {
        complete: faker.datatype.boolean(),
        timestamp: faker.date.past({ years: 1 }).getTime(),
      };
    }
    
    return this.create({
      pvp: gameModeData,
      pve: gameModeData,
      ...overrides,
    });
  }
  
  /**
   * Create empty progress (no completions)
   */
  static createEmpty(overrides: Partial<ProgressData> = {}): ProgressData {
    return this.create({
      pvp: this.createGameModeData(),
      pve: this.createGameModeData(),
      ...overrides,
    });
  }
  
  /**
   * Create progress builder for fluent interface
   */
  static builder(): ProgressBuilder {
    return new ProgressBuilder();
  }
  
  /**
   * Reset the ID counter for deterministic tests
   */
  static resetIdCounter(): void {
    this.idCounter = 1;
  }
}

/**
 * Progress Builder for fluent interface
 */
export class ProgressBuilder {
  private data: Partial<ProgressData> = {};
  
  constructor() {
    // Set default values
    this.data = {
      currentGameMode: 'pvp',
      pvp: ProgressFactory.prototype.createGameModeData(),
      pve: ProgressFactory.prototype.createGameModeData(),
    };
  }
  
  withUserId(userId: string): ProgressBuilder {
    this.data.userId = userId;
    return this;
  }
  
  withGameMode(gameMode: 'pvp' | 'pve'): ProgressBuilder {
    this.data.currentGameMode = gameMode;
    return this;
  }
  
  withPvPData(pvpData: Partial<ProgressData['pvp']>): ProgressBuilder {
    this.data.pvp = { ...this.data.pvp, ...pvpData };
    return this;
  }
  
  withPvEData(pveData: Partial<ProgressData['pve']>): ProgressBuilder {
    this.data.pve = { ...this.data.pve, ...pveData };
    return this;
  }
  
  withCompletedTask(taskId: string, timestamp?: number): ProgressBuilder {
    if (!this.data.pvp) this.data.pvp = {};
    if (!this.data.pvp.taskCompletions) this.data.pvp.taskCompletions = {};
    
    this.data.pvp.taskCompletions[taskId] = {
      complete: true,
      timestamp: timestamp || faker.date.past({ years: 1 }).getTime(),
    };
    
    return this;
  }
  
  withFailedTask(taskId: string, timestamp?: number): ProgressBuilder {
    if (!this.data.pvp) this.data.pvp = {};
    if (!this.data.pvp.taskCompletions) this.data.pvp.taskCompletions = {};
    
    this.data.pvp.taskCompletions[taskId] = {
      complete: true,
      failed: true,
      timestamp: timestamp || faker.date.past({ years: 1 }).getTime(),
    };
    
    return this;
  }
  
  withTaskObjective(taskId: string, objectiveId: string, complete: boolean): ProgressBuilder {
    if (!this.data.pvp) this.data.pvp = {};
    if (!this.data.pvp.taskObjectives) this.data.pvp.taskObjectives = {};
    if (!this.data.pvp.taskObjectives[taskId]) this.data.pvp.taskObjectives[taskId] = {};
    
    this.data.pvp.taskObjectives[taskId][objectiveId] = {
      complete,
      timestamp: faker.date.past({ years: 1 }).getTime(),
    };
    
    return this;
  }
  
  withHideoutModule(moduleId: string, level: number): ProgressBuilder {
    if (!this.data.pvp) this.data.pvp = {};
    if (!this.data.pvp.hideoutModules) this.data.pvp.hideoutModules = {};
    
    this.data.pvp.hideoutModules[moduleId] = {
      level: Math.max(1, Math.min(3, level)),
      complete: level >= 3,
      timestamp: faker.date.past({ years: 1 }).getTime(),
    };
    
    return this;
  }
  
  withHideoutPart(partId: string, found: boolean): ProgressBuilder {
    if (!this.data.pvp) this.data.pvp = {};
    if (!this.data.pvp.hideoutParts) this.data.pvp.hideoutParts = {};
    
    this.data.pvp.hideoutParts[partId] = {
      found,
      timestamp: faker.date.past({ years: 1 }).getTime(),
    };
    
    return this;
  }
  
  withLastUpdated(lastUpdated: Date): ProgressBuilder {
    this.data.lastUpdated = lastUpdated;
    return this;
  }
  
  build(): ProgressData {
    return ProgressFactory.create(this.data);
  }
}

/**
 * Progress presets for common test scenarios
 */
export const ProgressPresets = {
  /**
   * Standard progress for most tests
   */
  standard: () => ProgressFactory.create(),
  
  /**
   * Empty progress (no completions)
   */
  empty: () => ProgressFactory.createEmpty(),
  
  /**
   * Progress with some completed tasks
   */
  withCompletions: () => ProgressFactory.createWithCompletedTasks(['task-1', 'task-2', 'task-3']),
  
  /**
   * Progress with failed tasks
   */
  withFailures: () => ProgressFactory.createWithFailedTasks(['task-4', 'task-5']),
  
  /**
   * Progress with mixed completion states
   */
  mixed: () => ProgressFactory.createWithMixedProgress(),
  
  /**
   * PvP progress
   */
  pvp: () => ProgressFactory.createWithGameMode('pvp'),
  
  /**
   * PvE progress
   */
  pve: () => ProgressFactory.createWithGameMode('pve'),
};