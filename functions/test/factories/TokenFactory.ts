/**
 * Token Factory - Creates test token data with realistic defaults
 * 
 * Provides fluent interface for creating tokens with custom properties
 * while maintaining realistic defaults for testing.
 */

import { faker } from '@faker-js/faker';

/**
 * Helper function to generate random number since faker.datatype.number is not available
 */
function randomInt(min: number, max: number): number {
  return Math.floor(faker.number.float({ min, max, fractionDigits: 0 }));
}

/**
 * Token data interface
 */
export interface TokenData {
  id: string;
  owner: string;
  note: string;
  permissions: string[];
  gameMode: 'pvp' | 'pve';
  calls: number;
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
}

/**
 * Token Factory class for creating test tokens
 */
export class TokenFactory {
  private static idCounter = 1;
  
  /**
   * Valid permission combinations for testing
   */
  private static readonly PERMISSION_SETS = {
    basic: ['GP'],
    extended: ['GP', 'WP'],
    full: ['GP', 'WP', 'TP'],
    admin: ['GP', 'WP', 'TP', 'ADMIN'],
  };
  
  /**
   * Create a single token with optional overrides
   */
  static create(overrides: Partial<TokenData> = {}): TokenData {
    const id = overrides.id || `test-token-${this.idCounter++}`;
    const timestamp = faker.date.past({ years: 1 });
    
    return {
      id,
      owner: overrides.owner || `user-${randomInt(1000, 9999)}`,
      note: overrides.note || faker.lorem.words(3),
      permissions: overrides.permissions || this.PERMISSION_SETS.basic,
      gameMode: overrides.gameMode || 'pvp',
      calls: overrides.calls || randomInt(0, 100),
      createdAt: overrides.createdAt || timestamp,
      lastUsed: overrides.lastUsed || faker.date.between({ from: timestamp, to: new Date() }),
      expiresAt: overrides.expiresAt || null,
      ...overrides,
    };
  }
  
  /**
   * Create multiple tokens
   */
  static createMany(count: number, overrides: Partial<TokenData> = {}): TokenData[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
  
  /**
   * Create a token with basic permissions
   */
  static createBasic(overrides: Partial<TokenData> = {}): TokenData {
    return this.create({
      permissions: this.PERMISSION_SETS.basic,
      ...overrides,
    });
  }
  
  /**
   * Create a token with extended permissions
   */
  static createExtended(overrides: Partial<TokenData> = {}): TokenData {
    return this.create({
      permissions: this.PERMISSION_SETS.extended,
      ...overrides,
    });
  }
  
  /**
   * Create a token with full permissions
   */
  static createFull(overrides: Partial<TokenData> = {}): TokenData {
    return this.create({
      permissions: this.PERMISSION_SETS.full,
      ...overrides,
    });
  }
  
  /**
   * Create a token with admin permissions
   */
  static createAdmin(overrides: Partial<TokenData> = {}): TokenData {
    return this.create({
      permissions: this.PERMISSION_SETS.admin,
      ...overrides,
    });
  }
  
  /**
   * Create a token for PvP mode
   */
  static createPvP(overrides: Partial<TokenData> = {}): TokenData {
    return this.create({
      gameMode: 'pvp',
      ...overrides,
    });
  }
  
  /**
   * Create a token for PvE mode
   */
  static createPvE(overrides: Partial<TokenData> = {}): TokenData {
    return this.create({
      gameMode: 'pve',
      ...overrides,
    });
  }
  
  /**
   * Create a token with high usage count
   */
  static createHighUsage(overrides: Partial<TokenData> = {}): TokenData {
    return this.create({
      calls: randomInt(1000, 10000),
      ...overrides,
    });
  }
  
  /**
   * Create an expired token
   */
  static createExpired(overrides: Partial<TokenData> = {}): TokenData {
    const pastDate = faker.date.past({ years: 2 });
    return this.create({
      expiresAt: pastDate,
      ...overrides,
    });
  }
  
  /**
   * Create a token for a specific user
   */
  static createForUser(userId: string, overrides: Partial<TokenData> = {}): TokenData {
    return this.create({
      owner: userId,
      ...overrides,
    });
  }
  
  /**
   * Create tokens with different permission levels
   */
  static createWithPermissionLevels(): TokenData[] {
    return [
      this.createBasic(),
      this.createExtended(),
      this.createFull(),
      this.createAdmin(),
    ];
  }
  
  /**
   * Create tokens for different game modes
   */
  static createForGameModes(): TokenData[] {
    return [
      this.createPvP(),
      this.createPvE(),
    ];
  }
  
  /**
   * Create tokens with various usage patterns
   */
  static createWithUsagePatterns(): TokenData[] {
    return [
      this.create({ calls: 0 }), // Never used
      this.create({ calls: randomInt(1, 10) }), // Light usage
      this.create({ calls: randomInt(11, 100) }), // Moderate usage
      this.createHighUsage(), // Heavy usage
    ];
  }
  
  /**
   * Create a token with custom permissions
   */
  static createWithPermissions(permissions: string[], overrides: Partial<TokenData> = {}): TokenData {
    return this.create({
      permissions,
      ...overrides,
    });
  }
  
  /**
   * Create a token builder for fluent interface
   */
  static builder(): TokenBuilder {
    return new TokenBuilder();
  }
  
  /**
   * Reset the ID counter for deterministic tests
   */
  static resetIdCounter(): void {
    this.idCounter = 1;
  }
}

/**
 * Token Builder for fluent interface
 */
export class TokenBuilder {
  private data: Partial<TokenData> = {};
  
  constructor() {
    // Set default values
    this.data = {
      permissions: TokenFactory.PERMISSION_SETS.basic,
      gameMode: 'pvp',
      calls: 0,
    };
  }
  
  withId(id: string): TokenBuilder {
    this.data.id = id;
    return this;
  }
  
  withOwner(owner: string): TokenBuilder {
    this.data.owner = owner;
    return this;
  }
  
  withNote(note: string): TokenBuilder {
    this.data.note = note;
    return this;
  }
  
  withPermissions(permissions: string[]): TokenBuilder {
    this.data.permissions = permissions;
    return this;
  }
  
  withGameMode(gameMode: 'pvp' | 'pve'): TokenBuilder {
    this.data.gameMode = gameMode;
    return this;
  }
  
  withCalls(calls: number): TokenBuilder {
    this.data.calls = calls;
    return this;
  }
  
  withCreatedAt(createdAt: Date): TokenBuilder {
    this.data.createdAt = createdAt;
    return this;
  }
  
  withLastUsed(lastUsed: Date): TokenBuilder {
    this.data.lastUsed = lastUsed;
    return this;
  }
  
  withExpiresAt(expiresAt: Date): TokenBuilder {
    this.data.expiresAt = expiresAt;
    return this;
  }
  
  withBasicPermissions(): TokenBuilder {
    return this.withPermissions(TokenFactory.PERMISSION_SETS.basic);
  }
  
  withExtendedPermissions(): TokenBuilder {
    return this.withPermissions(TokenFactory.PERMISSION_SETS.extended);
  }
  
  withFullPermissions(): TokenBuilder {
    return this.withPermissions(TokenFactory.PERMISSION_SETS.full);
  }
  
  withAdminPermissions(): TokenBuilder {
    return this.withPermissions(TokenFactory.PERMISSION_SETS.admin);
  }
  
  build(): TokenData {
    return TokenFactory.create(this.data);
  }
}

/**
 * Token presets for common test scenarios
 */
export const TokenPresets = {
  /**
   * Standard token for most tests
   */
  standard: () => TokenFactory.createBasic(),
  
  /**
   * Admin token for admin functionality tests
   */
  admin: () => TokenFactory.createAdmin(),
  
  /**
   * High-usage token for performance tests
   */
  highUsage: () => TokenFactory.createHighUsage(),
  
  /**
   * Expired token for validation tests
   */
  expired: () => TokenFactory.createExpired(),
  
  /**
   * PvP token for PvP-specific tests
   */
  pvp: () => TokenFactory.createPvP(),
  
  /**
   * PvE token for PvE-specific tests
   */
  pve: () => TokenFactory.createPvE(),
};