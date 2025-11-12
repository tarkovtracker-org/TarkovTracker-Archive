/**
 * Team Factory - Creates test team data with realistic defaults
 * 
 * Provides fluent interface for creating teams with custom properties
 * while maintaining realistic defaults for testing.
 */

import { faker } from '@faker-js/faker';

/**
 * Team data interface
 */
export interface TeamData {
  id: string;
  name: string;
  description?: string;
  owner: string;
  members: string[];
  createdAt: Date;
  settings: {
    allowMemberProgress: boolean;
    requireApproval: boolean;
    maxMembers: number;
    isPublic: boolean;
  };
  inviteCode?: string;
  tags?: string[];
}

/**
 * Team Factory class for creating test teams
 */
export class TeamFactory {
  private static idCounter = 1;
  
  /**
   * Create a single team with optional overrides
   */
  static create(overrides: Partial<TeamData> = {}): TeamData {
    const id = overrides.id || `team-${this.idCounter++}`;
    const timestamp = faker.date.past({ years: 1 });
    const owner = overrides.owner || `user-${faker.datatype.number({ min: 1000, max: 9999 })}`;
    
    return {
      id,
      name: overrides.name || faker.company.name(),
      description: overrides.description || faker.lorem.sentences(2),
      owner,
      members: overrides.members || [owner],
      createdAt: overrides.createdAt || timestamp,
      settings: overrides.settings || {
        allowMemberProgress: faker.datatype.boolean(),
        requireApproval: faker.datatype.boolean(),
        maxMembers: faker.datatype.number({ min: 2, max: 10 }),
        isPublic: faker.datatype.boolean(),
      },
      inviteCode: overrides.inviteCode || faker.random.alphaNumeric(8),
      tags: overrides.tags || faker.helpers.arrayElements(['pvp', 'pve', 'hardcore', 'casual', 'weekly'], 2),
      ...overrides,
    };
  }
  
  /**
   * Create multiple teams
   */
  static createMany(count: number, overrides: Partial<TeamData> = {}): TeamData[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
  
  /**
   * Create a team with a single member (owner only)
   */
  static createSolo(overrides: Partial<TeamData> = {}): TeamData {
    const owner = overrides.owner || `user-${faker.datatype.number({ min: 1000, max: 9999 })}`;
    return this.create({
      owner,
      members: [owner],
      ...overrides,
    });
  }
  
  /**
   * Create a team with multiple members
   */
  static createWithMembers(memberCount: number, overrides: Partial<TeamData> = {}): TeamData {
    const owner = overrides.owner || `user-${faker.datatype.number({ min: 1000, max: 9999 })}`;
    const members = Array.from({ length: memberCount - 1 }, () => 
      `user-${faker.datatype.number({ min: 1000, max: 9999 })}`
    );
    
    return this.create({
      owner,
      members: [owner, ...members],
      ...overrides,
    });
  }
  
  /**
   * Create a full team (max members)
   */
  static createFull(overrides: Partial<TeamData> = {}): TeamData {
    return this.create({
      settings: {
        allowMemberProgress: true,
        requireApproval: false,
        maxMembers: 10,
        isPublic: false,
      },
      ...overrides,
    });
  }
  
  /**
   * Create a public team
   */
  static createPublic(overrides: Partial<TeamData> = {}): TeamData {
    return this.create({
      settings: {
        allowMemberProgress: true,
        requireApproval: false,
        maxMembers: faker.datatype.number({ min: 5, max: 10 }),
        isPublic: true,
      },
      ...overrides,
    });
  }
  
  /**
   * Create a private team
   */
  static createPrivate(overrides: Partial<TeamData> = {}): TeamData {
    return this.create({
      settings: {
        allowMemberProgress: false,
        requireApproval: true,
        maxMembers: faker.datatype.number({ min: 2, max: 5 }),
        isPublic: false,
      },
      ...overrides,
    });
  }
  
  /**
   * Create a team that requires approval
   */
  static createWithApproval(overrides: Partial<TeamData> = {}): TeamData {
    return this.create({
      settings: {
        allowMemberProgress: false,
        requireApproval: true,
        maxMembers: faker.datatype.number({ min: 3, max: 8 }),
        isPublic: false,
      },
      ...overrides,
    });
  }
  
  /**
   * Create a team for a specific owner
   */
  static createForOwner(ownerId: string, overrides: Partial<TeamData> = {}): TeamData {
    return this.create({
      owner: ownerId,
      members: [ownerId],
      ...overrides,
    });
  }
  
  /**
   * Create teams with different member counts
   */
  static createWithMemberCounts(): TeamData[] {
    return [
      this.createSolo(),           // 1 member
      this.createWithMembers(3),   // 3 members
      this.createWithMembers(5),   // 5 members
      this.createWithMembers(10),  // 10 members (full)
    ];
  }
  
  /**
   * Create teams with different privacy settings
   */
  static createWithPrivacySettings(): TeamData[] {
    return [
      this.createPublic(),   // Public team
      this.createPrivate(),  // Private team
    ];
  }
  
  /**
   * Create a team with specific settings
   */
  static createWithSettings(settings: Partial<TeamData['settings']>, overrides: Partial<TeamData> = {}): TeamData {
    return this.create({
      settings: {
        allowMemberProgress: faker.datatype.boolean(),
        requireApproval: faker.datatype.boolean(),
        maxMembers: faker.datatype.number({ min: 2, max: 10 }),
        isPublic: faker.datatype.boolean(),
        ...settings,
      },
      ...overrides,
    });
  }
  
  /**
   * Create a team builder for fluent interface
   */
  static builder(): TeamBuilder {
    return new TeamBuilder();
  }
  
  /**
   * Reset the ID counter for deterministic tests
   */
  static resetIdCounter(): void {
    this.idCounter = 1;
  }
}

/**
 * Team Builder for fluent interface
 */
export class TeamBuilder {
  private data: Partial<TeamData> = {};
  
  constructor() {
    // Set default values
    this.data = {
      members: [],
      settings: {
        allowMemberProgress: true,
        requireApproval: false,
        maxMembers: 10,
        isPublic: false,
      },
    };
  }
  
  withId(id: string): TeamBuilder {
    this.data.id = id;
    return this;
  }
  
  withName(name: string): TeamBuilder {
    this.data.name = name;
    return this;
  }
  
  withDescription(description: string): TeamBuilder {
    this.data.description = description;
    return this;
  }
  
  withOwner(owner: string): TeamBuilder {
    this.data.owner = owner;
    return this;
  }
  
  withMembers(members: string[]): TeamBuilder {
    this.data.members = members;
    return this;
  }
  
  withMember(memberId: string): TeamBuilder {
    if (!this.data.members) this.data.members = [];
    this.data.members.push(memberId);
    return this;
  }
  
  withCreatedAt(createdAt: Date): TeamBuilder {
    this.data.createdAt = createdAt;
    return this;
  }
  
  withSettings(settings: Partial<TeamData['settings']>): TeamBuilder {
    this.data.settings = { ...this.data.settings, ...settings };
    return this;
  }
  
  withAllowMemberProgress(allow: boolean): TeamBuilder {
    if (!this.data.settings) this.data.settings = {} as any;
    this.data.settings.allowMemberProgress = allow;
    return this;
  }
  
  withRequireApproval(require: boolean): TeamBuilder {
    if (!this.data.settings) this.data.settings = {} as any;
    this.data.settings.requireApproval = require;
    return this;
  }
  
  withMaxMembers(max: number): TeamBuilder {
    if (!this.data.settings) this.data.settings = {} as any;
    this.data.settings.maxMembers = max;
    return this;
  }
  
  withPublic(isPublic: boolean): TeamBuilder {
    if (!this.data.settings) this.data.settings = {} as any;
    this.data.settings.isPublic = isPublic;
    return this;
  }
  
  withInviteCode(code: string): TeamBuilder {
    this.data.inviteCode = code;
    return this;
  }
  
  withTags(tags: string[]): TeamBuilder {
    this.data.tags = tags;
    return this;
  }
  
  withTag(tag: string): TeamBuilder {
    if (!this.data.tags) this.data.tags = [];
    this.data.tags.push(tag);
    return this;
  }
  
  build(): TeamData {
    return TeamFactory.create(this.data);
  }
}

/**
 * Team presets for common test scenarios
 */
export const TeamPresets = {
  /**
   * Standard team for most tests
   */
  standard: () => TeamFactory.create(),
  
  /**
   * Solo team (owner only)
   */
  solo: () => TeamFactory.createSolo(),
  
  /**
   * Full team (10 members)
   */
  full: () => TeamFactory.createFull(),
  
  /**
   * Public team
   */
  public: () => TeamFactory.createPublic(),
  
  /**
   * Private team
   */
  private: () => TeamFactory.createPrivate(),
  
  /**
   * Team requiring approval
   */
  requiresApproval: () => TeamFactory.createWithApproval(),
  
  /**
   * Small team (3 members)
   */
  small: () => TeamFactory.createWithMembers(3),
  
  /**
   * Medium team (5 members)
   */
  medium: () => TeamFactory.createWithMembers(5),
};