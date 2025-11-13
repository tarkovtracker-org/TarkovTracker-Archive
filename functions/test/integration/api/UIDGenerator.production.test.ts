import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// Use centralized test utilities
import { createTestSuite } from './helpers/index';

// Test production behavior of UIDGenerator
describe('UIDGenerator Production Behavior', () => {
  const suite = createTestSuite('UIDGenerator');

  beforeEach(async () => {
    await suite.beforeEach();

    // Clear test environment variables to simulate production
    delete process.env.NODE_ENV;
    delete process.env.VITEST;
    delete process.env.UID_GENERATOR_SEED;
  });

  afterEach(async () => {
    // Restore test environment
    process.env.NODE_ENV = 'test';
    process.env.VITEST = 'true';
    process.env.UID_GENERATOR_SEED = '12345';

    await suite.afterEach();
  });
  it('should generate cryptographically secure tokens in production mode', async () => {
    // Dynamic import to avoid module caching issues
    const { default: UIDGenerator } = await import('../src/token/UIDGenerator');

    const uidgen = new UIDGenerator(128);
    const token1 = await uidgen.generate();
    const token2 = await uidgen.generate();

    // Tokens should be different
    expect(token1).not.toBe(token2);

    // Tokens should be 128 characters long
    expect(token1).toHaveLength(128);
    expect(token2).toHaveLength(128);

    // Tokens should only contain alphanumeric characters
    expect(token1).toMatch(/^[a-zA-Z0-9]{128}$/);
    expect(token2).toMatch(/^[a-zA-Z0-9]{128}$/);
  });
  it('should support BASE62 encoding for backward compatibility', async () => {
    const { default: UIDGenerator } = await import('../src/token/UIDGenerator');

    const uidgen = new UIDGenerator(32, UIDGenerator.BASE62);
    const token = await uidgen.generate();

    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[a-zA-Z0-9]{32}$/);
  });
  it('should maintain deterministic behavior in test environment', async () => {
    // Restore test environment
    process.env.NODE_ENV = 'test';
    process.env.VITEST = 'true';
    process.env.UID_GENERATOR_SEED = '99999';

    const { default: UIDGenerator } = await import('../src/token/UIDGenerator');

    const uidgen1 = new UIDGenerator(64);
    const uidgen2 = new UIDGenerator(64);

    const token1a = await uidgen1.generate();
    const token1b = await uidgen1.generate();
    const token2a = await uidgen2.generate();

    // Same seed should produce same first token
    expect(token1a).toBe(token2a);

    // Same generator should produce different tokens on subsequent calls
    expect(token1a).not.toBe(token1b);

    // Tokens should be expected length
    expect(token1a).toHaveLength(64);
    expect(token1b).toHaveLength(64);
    expect(token2a).toHaveLength(64);
  });
});
