import { defineConfig } from 'vitest/config';

/**
 * Default Test Configuration (All Tests)
 *
 * Runs both unit and integration tests together.
 * Use this for comprehensive testing before commits.
 *
 * For faster feedback:
 * - Unit only: npm run test:unit
 * - Integration only: npm run test:integration
 *
 * This config uses integration test settings (sequential, with emulator)
 * since it includes integration tests.
 */

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: ['./test/globalSetup.ts'],
    setupFiles: ['./test/setup.ts'],
    // Include both unit and integration tests
    include: ['test/unit/**/*.{test,spec}.{js,ts}', 'test/integration/**/*.{test,spec}.{js,ts}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'test/performance/**'],
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    isolate: false,
    testTimeout: 30000, // 30 seconds for emulator operations
    hookTimeout: 60000, // 60 seconds for setup/teardown

    // Force single-threaded, sequential execution (needed for integration tests)
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    minWorkers: 1,
    maxWorkers: 1,
    maxConcurrency: 1,
    sequence: {
      concurrent: false,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportOnFailure: true,
      include: ['src/**/*'],
      exclude: ['node_modules/**', 'test/**', 'coverage/**', '**/*.config'],
      all: true,
      thresholds: {
        // Global thresholds removed to focus on specific modules
        // Will be configured per-file in CI
      },
    },
  },
});
