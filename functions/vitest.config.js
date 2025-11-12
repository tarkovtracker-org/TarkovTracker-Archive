import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: ['./test/globalSetup.ts'],
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'test/performance/**'],
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    isolate: false,
    testTimeout: 30000, // 30 seconds for emulator operations
    hookTimeout: 60000, // 60 seconds for setup/teardown
    // Allow skipping global setup for certain tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportOnFailure: true,
      include: ['src/**/*'],
      exclude: ['node_modules/**', 'test/**', 'coverage/**', '**/*.config'],
      all: true,
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 80,
        lines: 85,
      },
    },
  },
});
