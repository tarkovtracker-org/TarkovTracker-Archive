// Consolidated tarkovdata update tests
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSuite } from '../../helpers';

describe('Tarkov Data Updates', () => {
  const suite = createTestSuite('tarkovdata-updates');

  beforeEach(suite.beforeEach);
  afterEach(suite.afterEach);

  it('should import scheduled tarkovdata function', async () => {
    const module = await import('../src/scheduled/index.js');
    expect(module.scheduledFunctions).toBeDefined();
    expect(module.scheduledFunctions.updateTarkovData).toBeDefined();
  });

  // Note: Full integration tests covered in scheduled/index.test.ts with emulator
});
