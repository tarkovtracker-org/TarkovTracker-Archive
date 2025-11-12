/**
 * User Factory - Creates test user data with realistic defaults
 * 
 * Provides fluent interface for creating users with custom properties
 * while maintaining realistic defaults for testing.
 */

import { faker } from '@faker-js/faker';

/**
 * User data interface
 */
export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  level: number;
  gameEdition: number;
  pmcFaction: 'USEC' | 'BEAR';
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  settings?: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
}

/**
 * User Factory class for creating test users
 */
export class UserFactory {
  private static idCounter = 1;
  
  /**
   * Valid game editions
   */
  private static readonly GAME_EDITIONS = {
    standard: 1,
    left_behind: 2,
    prepare_for_escape: 3,
    edge_of_darkness: 4,
    unreheard: 5,
    arena_starter_edition: 6,
  };
  
  /**
   * Create a single user with optional overrides
   */
  static create(overrides: Partial<UserData> = {}): UserData {
    const id = overrides.uid || `user-${this.idCounter++}`;
    const timestamp = faker.date.past({ years: 2 });
    
    return {
      uid: id,
      email: overrides.email || faker.internet.email(),
      displayName: overrides.displayName || faker.name.firstName(),
      level: overrides.level || faker.datatype.number({ min: 1, max: 79 }),
      gameEdition: overrides.gameEdition || this.GAME_EDITIONS.standard,
      pmcFaction: overrides.pmcFaction || faker.helpers.arrayElement(['USEC', 'BEAR']),
      createdAt: overrides.createdAt || timestamp,
      lastLogin: overrides.lastLogin || faker.date.between(timestamp, new Date()),
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      settings: overrides.settings || {
        theme: faker.helpers.arrayElement(['light', 'dark']),
        notifications: faker.datatype.boolean(),
        language: 'en',
      },
      ...overrides,
    };
  }
  
  /**
   * Create multiple users
   */
  static createMany(count: number, overrides: Partial<UserData> = {}): UserData[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
  
  /**
   * Create a new user (level 1)
   */
  static createNew(overrides: Partial<UserData> = {}): UserData {
    return this.create({
      level: 1,
      gameEdition: this.GAME_EDITIONS.standard,
      ...overrides,
    });
  }
  
  /**
   * Create an experienced user (high level)
   */
  static createExperienced(overrides: Partial<UserData> = {}): UserData {
    return this.create({
      level: faker.datatype.number({ min: 50, max: 79 }),
      ...overrides,
    });
  }
  
  /**
   * Create a max level user
   */
  static createMaxLevel(overrides: Partial<UserData> = {}): UserData {
    return this.create({
      level: 79,
      ...overrides,
    });
  }
  
  /**
   * Create a USEC faction user
   */
  static createUSEC(overrides: Partial<UserData> = {}): UserData {
    return this.create({
      pmcFaction: 'USEC',
      ...overrides,
    });
  }
  
  /**
   * Create a BEAR faction user
   */
  static createBEAR(overrides: Partial<UserData> = {}): UserData {
    return this.create({
      pmcFaction: 'BEAR',
      ...overrides,
    });
  }
  
  /**
   * Create an inactive user
   */
  static createInactive(overrides: Partial<UserData> = {}): UserData {
    return this.create({
      isActive: false,
      lastLogin: faker.date.past({ years: 1 }),
      ...overrides,
    });
  }
  
  /**
   * Create a user with specific game edition
   */
  static createWithEdition(edition: keyof typeof UserFactory.GAME_EDITIONS, overrides: Partial<UserData> = {}): UserData {
    return this.create({
      gameEdition: UserFactory.GAME_EDITIONS[edition],
      ...overrides,
    });
  }
  
  /**
   * Create users with different levels
   */
  static createWithLevels(): UserData[] {
    return [
      this.create({ level: 1 }),   // New player
      this.create({ level: 15 }),  // Early game
      this.create({ level: 40 }),  // Mid game
      this.create({ level: 60 }),  // Late game
      this.create({ level: 79 }),  // Max level
    ];
  }
  
  /**
   * Create users with different factions
   */
  static createWithFactions(): UserData[] {
    return [
      this.createUSEC(),
      this.createBEAR(),
    ];
  }
  
  /**
   * Create users with different game editions
   */
  static createWithEditions(): UserData[] {
    return Object.entries(this.GAME_EDITIONS).map(([key, edition]) =>
      this.createWithEdition(key as keyof typeof UserFactory.GAME_EDITIONS)
    );
  }
  
  /**
   * Create a user for a specific UID
   */
  static createWithUID(uid: string, overrides: Partial<UserData> = {}): UserData {
    return this.create({
      uid,
      ...overrides,
    });
  }
  
  /**
   * Create a user with specific level
   */
  static createWithLevel(level: number, overrides: Partial<UserData> = {}): UserData {
    return this.create({
      level: Math.max(1, Math.min(79, level)),
      ...overrides,
    });
  }
  
  /**
   * Create a user builder for fluent interface
   */
  static builder(): UserBuilder {
    return new UserBuilder();
  }
  
  /**
   * Reset the ID counter for deterministic tests
   */
  static resetIdCounter(): void {
    this.idCounter = 1;
  }
}

/**
 * User Builder for fluent interface
 */
export class UserBuilder {
  private data: Partial<UserData> = {};
  
  constructor() {
    // Set default values
    this.data = {
      level: 1,
      gameEdition: UserFactory.GAME_EDITIONS.standard,
      pmcFaction: 'USEC',
      isActive: true,
      settings: {
        theme: 'light',
        notifications: true,
        language: 'en',
      },
    };
  }
  
  withUID(uid: string): UserBuilder {
    this.data.uid = uid;
    return this;
  }
  
  withEmail(email: string): UserBuilder {
    this.data.email = email;
    return this;
  }
  
  withDisplayName(displayName: string): UserBuilder {
    this.data.displayName = displayName;
    return this;
  }
  
  withLevel(level: number): UserBuilder {
    this.data.level = Math.max(1, Math.min(79, level));
    return this;
  }
  
  withGameEdition(edition: keyof typeof UserFactory.GAME_EDITIONS): UserBuilder {
    this.data.gameEdition = UserFactory.GAME_EDITIONS[edition];
    return this;
  }
  
  withUSECFaction(): UserBuilder {
    this.data.pmcFaction = 'USEC';
    return this;
  }
  
  withBEARFaction(): UserBuilder {
    this.data.pmcFaction = 'BEAR';
    return this;
  }
  
  withFaction(faction: 'USEC' | 'BEAR'): UserBuilder {
    this.data.pmcFaction = faction;
    return this;
  }
  
  withCreatedAt(createdAt: Date): UserBuilder {
    this.data.createdAt = createdAt;
    return this;
  }
  
  withLastLogin(lastLogin: Date): UserBuilder {
    this.data.lastLogin = lastLogin;
    return this;
  }
  
  withActive(isActive: boolean): UserBuilder {
    this.data.isActive = isActive;
    return this;
  }
  
  withSettings(settings: Partial<UserData['settings']>): UserBuilder {
    this.data.settings = { ...this.data.settings, ...settings };
    return this;
  }
  
  withTheme(theme: 'light' | 'dark'): UserBuilder {
    if (!this.data.settings) this.data.settings = {};
    this.data.settings.theme = theme;
    return this;
  }
  
  withNotifications(notifications: boolean): UserBuilder {
    if (!this.data.settings) this.data.settings = {};
    this.data.settings.notifications = notifications;
    return this;
  }
  
  withLanguage(language: string): UserBuilder {
    if (!this.data.settings) this.data.settings = {};
    this.data.settings.language = language;
    return this;
  }
  
  build(): UserData {
    return UserFactory.create(this.data);
  }
}

/**
 * User presets for common test scenarios
 */
export const UserPresets = {
  /**
   * Standard user for most tests
   */
  standard: () => UserFactory.create(),
  
  /**
   * New player (level 1)
   */
  newPlayer: () => UserFactory.createNew(),
  
  /**
   * Experienced player (high level)
   */
  experienced: () => UserFactory.createExperienced(),
  
  /**
   * Max level player
   */
  maxLevel: () => UserFactory.createMaxLevel(),
  
  /**
   * USEC faction player
   */
  usec: () => UserFactory.createUSEC(),
  
  /**
   * BEAR faction player
   */
  bear: () => UserFactory.createBEAR(),
  
  /**
   * Inactive user
   */
  inactive: () => UserFactory.createInactive(),
  
  /**
   * Standard edition user
   */
  standardEdition: () => UserFactory.createWithEdition('standard'),
  
  /**
   * Edge of Darkness edition user
   */
  eodEdition: () => UserFactory.createWithEdition('edge_of_darkness'),
};