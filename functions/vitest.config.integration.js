import { defineConfig } from 'vitest/config';

/**
 * Integration Test Configuration
 * 
 * These tests:
 * - Use Firebase emulator (Firestore, Auth)
 * - Test full request/response cycles with Express handlers
 * - Touch real database operations (via emulator)
 * - Must run sequentially to avoid state conflicts
 * - Slower but comprehensive
 * 
 * Example: services/TeamService.test.ts uses createTestSuite + Firestore emulator
 */

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: ['./test/globalSetup.ts'],
    setupFiles: ['./test/setup.ts'],
    include: ['test/integration/**/*.{test,spec}.{js,ts}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'test/performance/**'],
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    isolate: false,
    testTimeout: 30000, // 30 seconds for emulator operations
    hookTimeout: 60000, // 60 seconds for setup/teardown

    // Force single-threaded, sequential execution to prevent emulator state conflicts
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    sequence: {
      concurrent: false,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportOnFailure: true,
      include: ['src/**/*'],
      exclude: ['node_modules/**', 'test/**', 'coverage/**', '**/*.config'],
      reportsDirectory: './coverage/integration',
    },
  },
});
