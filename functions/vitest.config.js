import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const sharedIndexPath = fileURLToPath(new URL('../packages/shared/index.js', import.meta.url));
const sharedConstantsPath = fileURLToPath(new URL('../packages/shared/constants/', import.meta.url));
export default defineConfig({
  resolve: {
    alias: {
      '@tarkov-tracker/shared': sharedIndexPath,
      '@tarkov-tracker/shared/constants': sharedConstantsPath,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup'],
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
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'test/**', 'coverage/**', '**/*.config'],
    },
    testTimeout: 15000, // Increase test timeout
    hookTimeout: 15000, // Increase hook timeout
    isolate: false, // Try disabling isolation
  },
});
