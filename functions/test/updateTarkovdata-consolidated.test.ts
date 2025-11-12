// Consolidated tarkovdata update tests
import { describe, it, expect } from 'vitest';

describe('Tarkov Data Updates', () => {
  it('should import scheduled tarkovdata function', async () => {
    const module = await import('../src/scheduled/index.js');
    expect(module.scheduledFunctions).toBeDefined();
    expect(module.scheduledFunctions.updateTarkovData).toBeDefined();
  });

  // Note: Full integration tests covered in scheduled/index.test.ts with emulator
});
