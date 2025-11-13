/**
 * UIDGenerator - Generates unique identifiers with optional deterministic seeding for tests
 * 
 * This class provides backward compatibility with the existing uid-generator package
 * while adding support for deterministic generation in test environments.
 */
export default class UIDGenerator {
  private length: number;
  private base?: string;
  private seed?: number;
  private counter: number = 0;
  private isTestEnvironment: boolean;
  // Constants for backward compatibility
  static readonly BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  constructor(length: number, base?: string) {
    this.length = length || 128;
    this.base = base;
    
    // Detect test environment by checking common test indicators
    this.isTestEnvironment = this.detectTestEnvironment();
    
    // Initialize seed if in test environment
    if (this.isTestEnvironment) {
      this.seed = this.getSeedFromEnvironment() || Date.now();
    }
  }
  /**
   * Generate a unique identifier
   * @returns Promise<string> - The generated UID
   */
  async generate(): Promise<string> {
    if (this.isTestEnvironment && this.seed !== undefined) {
      return this.generateDeterministic();
    }
    
    // Production: use crypto for secure random generation
    return this.generateSecure();
  }
  /**
   * Detect if we're running in a test environment
   */
  private detectTestEnvironment(): boolean {
    return (
      process.env.NODE_ENV === 'test' ||
      process.env.VITEST === 'true' ||
      typeof global !== 'undefined' && (global as any).__VITEST__ ||
      // Check if we're being mocked (common in test setup)
      typeof require !== 'undefined' && require.main?.filename?.includes('vitest')
    );
  }
  /**
   * Get seed from environment variables for test consistency
   */
  private getSeedFromEnvironment(): number | undefined {
    const envSeed = process.env.UID_GENERATOR_SEED || process.env.TEST_SEED;
    return envSeed ? parseInt(envSeed, 10) : undefined;
  }
  /**
   * Generate deterministic tokens for test environments
   */
  private generateDeterministic(): string {
    if (this.seed === undefined) {
      throw new Error('Seed not initialized for deterministic generation');
    }
    // Simple seeded pseudo-random generator
    const seed = this.seed + this.counter++;
    const hash = this.hashCode(seed.toString());
    
    let result = '';
    const chars = this.base || UIDGenerator.BASE62;
    
    for (let i = 0; i < this.length; i++) {
      result += chars[Math.abs(hash + i) % chars.length];
    }
    
    return result;
  }
  /**
   * Generate cryptographically secure tokens for production
   */
  private generateSecure(): string {
    const chars = this.base || UIDGenerator.BASE62;
    let result = '';
    const array = new Uint8Array(this.length);
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require('crypto');
      const buffer = crypto.randomBytes(this.length);
      for (let i = 0; i < this.length; i++) {
        array[i] = buffer[i];
      }
    }
    
    for (let i = 0; i < array.length; i++) {
      result += chars[array[i] % chars.length];
    }
    
    return result;
  }
  /**
   * Simple string hash function for deterministic generation
   */
  private hashCode(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash;
  }
  /**
   * Set a specific seed for deterministic generation (useful for tests)
   */
  setSeed(seed: number): void {
    this.seed = seed;
    this.counter = 0;
  }
  /**
   * Get the current seed (useful for test debugging)
   */
  getSeed(): number | undefined {
    return this.seed;
  }
  /**
   * Reset the counter (useful for test isolation)
   */
  reset(): void {
    this.counter = 0;
  }
}
