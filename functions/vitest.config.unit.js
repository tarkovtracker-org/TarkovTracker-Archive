import { defineConfig } from 'vitest/config';

/**
 * Pure Unit Test Configuration
 *
 * These tests:
 * - Do NOT touch Firestore or any Firebase services
 * - Use fake/mock implementations instead of real database
 * - Run extremely fast (milliseconds)
 * - Can run in parallel
 * - Perfect for watch mode and rapid feedback
 *
 * Example: services/TeamService.unit.test.ts uses FakeTeamRepository
 */

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // No global setup needed - unit tests don't use emulator
    include: ['test/unit/**/*.{test,spec}.{js,ts}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,

    // Unit tests can run in parallel - no shared state!
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false, // Allow parallel execution
      },
    },
    sequence: {
      concurrent: true, // Enable concurrent test execution
    },

    testTimeout: 5000, // 5 seconds - unit tests should be fast
    hookTimeout: 5000,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportOnFailure: true,
      include: ['src/**/*'],
      exclude: ['node_modules/**', 'test/**', 'coverage/**', '**/*.config'],
      reportsDirectory: './coverage/unit',
    },
  },
});
