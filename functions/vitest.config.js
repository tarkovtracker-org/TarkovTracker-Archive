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
      interopDefault: true, // Support for default exports in mixed ESM/CJS modules
    },
    mockReset: true, // Reset mocks between tests
    clearMocks: true, // Clear mock calls between tests
    restoreMocks: true, // Restore original implementation of mocks
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'], // Explicitly include test files
    exclude: ['**/node_modules/**', '**/dist/**'], // Explicitly exclude node_modules and dist
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportOnFailure: true,
      reportsDirectory: 'coverage',
      include: ['src/**/*'],
      exclude: ['node_modules/**', 'test/**', 'coverage/**', '**/*.config'],
      global: {
        statements: 85,
        branches: 80,
        functions: 80,
        lines: 85,
      },
    },
    testTimeout: 15000, // Increase test timeout
    hookTimeout: 15000, // Increase hook timeout
    isolate: false, // Try disabling isolation
  },
});
