import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSuite } from '../../helpers';

describe('Functions Index (entry point)', () => {
  const suite = createTestSuite('functions/index');

  beforeEach(suite.beforeEach);
  afterEach(suite.afterEach);

  it('should export legacy token functions', async () => {
    const indexModule = await import('../../../src/index.js');

    expect(indexModule.createToken).toBeDefined();
    expect(indexModule.revokeToken).toBeDefined();
  });

  it('should export scheduled functions', async () => {
    const indexModule = await import('../../../src/index.js');

    expect(indexModule.updateTarkovData).toBeDefined();
    expect(indexModule.expireInactiveTokens).toBeDefined();
  });

  it('should export main HTTP API function', async () => {
    const indexModule = await import('../../../src/index.js');

    expect(indexModule.api).toBeDefined();
    expect(indexModule.rawApp).toBeDefined();
    expect(typeof indexModule.rawApp).toBe('function');
  });

  it('should export service classes', async () => {
    const indexModule = await import('../../../src/index.js');

    expect(indexModule.ProgressService).toBeDefined();
    expect(indexModule.ValidationService).toBeDefined();
  });
});
