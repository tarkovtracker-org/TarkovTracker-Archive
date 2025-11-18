import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup'],
    pool: 'threads',
    deps: {
      optimizer: {
        ssr: {
          include: ['**/*.ts'],
        },
      },
      interopDefault: true,
    },
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    include: ['test/performance/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportOnFailure: true,
      reportsDirectory: 'coverage/performance',
      include: ['src/**/*'],
      exclude: ['node_modules/**', 'test/**', 'coverage/**', '**/*.config'],
      global: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },
    testTimeout: 60000, // 60 seconds for performance tests
    hookTimeout: 30000, // 30 seconds for hooks
    isolate: false, // Disable isolation for performance tests
    bail: 0, // Don't bail on first failure for performance tests
    retry: 1, // Allow one retry for flaky performance tests
    reporter: ['verbose', 'json'], // Detailed reporting for performance tests
    outputFile: {
      json: 'test-results/performance-results.json',
    },
    // Performance-specific settings
    logHeapUsage: true,
    allowOnly: false, // Disallow .only in performance tests
    watch: false, // Default to no watch for performance tests
  },
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.PERFORMANCE_TEST': '"true"',
  },
});
