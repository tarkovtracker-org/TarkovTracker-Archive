/**
 * Token Data Builder - Fluent builder for creating test token data
 * Replaces verbose inline token data with clear, reusable patterns
 *
 * @example
 * ```typescript
 * // Simple token with defaults
 * const token = new TokenDataBuilder().build();
 *
 * // Token with specific owner and permissions
 * const token = new TokenDataBuilder()
 *   .withOwner('user-123')
 *   .withPermissions(['GP', 'WP'])
 *   .build();
 *
 * // Expired token
 * const token = new TokenDataBuilder().expired().build();
 *
 * // Legacy token without modern fields
 * const token = new TokenDataBuilder().legacy().build();
 * ```
 */

/**
 * Token data structure matching Firestore TokenDocument
 */
export interface TokenData {
  owner: string;
  note: string;
  permissions: string[];
  gameMode: string;
  calls: number;
  createdAt: { toDate: () => Date };
  revoked?: boolean;
  isActive?: boolean;
  status?: 'active' | 'expired' | 'revoked';
  lastUsed?: { toDate: () => Date };
  expiredAt?: { toDate: () => Date };
}

/**
 * Fluent builder for creating test token data
 */
export class TokenDataBuilder {
  private data: TokenData;

  constructor() {
    // Set sensible defaults
    this.data = {
      owner: 'test-user',
      note: 'Test token',
      permissions: ['GP'],
      gameMode: 'pvp',
      calls: 0,
      createdAt: { toDate: () => new Date() },
      isActive: true,
      status: 'active',
      lastUsed: { toDate: () => new Date() },
    };
  }

  /**
   * Set the token owner
   */
  withOwner(owner: string): this {
    this.data.owner = owner;
    return this;
  }

  /**
   * Set the token note/description
   */
  withNote(note: string): this {
    this.data.note = note;
    return this;
  }

  /**
   * Set the token permissions
   */
  withPermissions(permissions: string[]): this {
    this.data.permissions = permissions;
    return this;
  }

  /**
   * Set the game mode
   */
  withGameMode(gameMode: 'pvp' | 'pve'): this {
    this.data.gameMode = gameMode;
    return this;
  }

  /**
   * Set the call count
   */
  withCalls(calls: number): this {
    this.data.calls = calls;
    return this;
  }

  /**
   * Set the creation timestamp
   */
  withCreatedAt(date: Date): this {
    this.data.createdAt = { toDate: () => date };
    return this;
  }

  /**
   * Set the last used timestamp
   */
  withLastUsed(date: Date): this {
    this.data.lastUsed = { toDate: () => date };
    return this;
  }

  /**
   * Create an expired token
   * Sets isActive=false, status='expired', and expiredAt timestamp
   */
  expired(daysAgo: number = 15): this {
    const now = new Date();
    const expiredDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const createdDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    this.data.isActive = false;
    this.data.status = 'expired';
    this.data.expiredAt = { toDate: () => expiredDate };
    this.data.createdAt = { toDate: () => createdDate };
    this.data.lastUsed = { toDate: () => createdDate };

    return this;
  }

  /**
   * Create a revoked token
   * Sets isActive=false, status='revoked', and revoked=true
   */
  revoked(): this {
    this.data.isActive = false;
    this.data.status = 'revoked';
    this.data.revoked = true;
    return this;
  }

  /**
   * Create a legacy token without modern expiration fields
   * Removes isActive, status, lastUsed, and expiredAt fields
   */
  legacy(): this {
    delete this.data.isActive;
    delete this.data.status;
    delete this.data.lastUsed;
    delete this.data.expiredAt;
    return this;
  }

  /**
   * Create an active token with recent usage
   */
  active(): this {
    this.data.isActive = true;
    this.data.status = 'active';
    this.data.lastUsed = { toDate: () => new Date() };
    return this;
  }

  /**
   * Create a token for PvE game mode
   */
  pve(): this {
    this.data.gameMode = 'pve';
    return this;
  }

  /**
   * Create a token for PvP game mode (default)
   */
  pvp(): this {
    this.data.gameMode = 'pvp';
    return this;
  }

  /**
   * Add multiple permissions at once
   */
  withMultiplePermissions(...permissions: string[]): this {
    this.data.permissions = permissions;
    return this;
  }

  /**
   * Build the final token data object
   * Returns a copy to prevent mutations
   */
  build(): TokenData {
    return { ...this.data };
  }

  /**
   * Build with a specific token ID for use with suite.withDatabase
   * Returns an object suitable for direct use in seedDb
   *
   * @param tokenId - The token ID to use as the document key
   * @returns Object with tokenId as key and token data as value
   */
  buildWithId(tokenId: string): Record<string, TokenData> {
    return {
      [tokenId]: this.build(),
    };
  }

  /**
   * Static factory method for quick creation
   * Useful for simple test scenarios
   */
  static basic(owner: string = 'test-user'): TokenData {
    return new TokenDataBuilder().withOwner(owner).build();
  }

  /**
   * Static factory for expired tokens
   */
  static expired(owner: string = 'test-user', daysAgo: number = 15): TokenData {
    return new TokenDataBuilder().withOwner(owner).expired(daysAgo).build();
  }

  /**
   * Static factory for revoked tokens
   */
  static revoked(owner: string = 'test-user'): TokenData {
    return new TokenDataBuilder().withOwner(owner).revoked().build();
  }

  /**
   * Static factory for legacy tokens
   */
  static legacy(owner: string = 'test-user'): TokenData {
    return new TokenDataBuilder().withOwner(owner).legacy().build();
  }
}

/**
 * Convenience functions for common token scenarios
 */
export const createBasicToken = (owner: string = 'test-user'): TokenData =>
  TokenDataBuilder.basic(owner);

export const createExpiredToken = (owner: string = 'test-user', daysAgo: number = 15): TokenData =>
  TokenDataBuilder.expired(owner, daysAgo);

export const createRevokedToken = (owner: string = 'test-user'): TokenData =>
  TokenDataBuilder.revoked(owner);

export const createLegacyToken = (owner: string = 'test-user'): TokenData =>
  TokenDataBuilder.legacy(owner);
