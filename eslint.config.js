import { fileURLToPath, URL } from 'node:url';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier';
import progressRules from './eslint.progress-rules.cjs';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
export default [
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/lib/**',
      '**/node_modules/**',
      'firebase-export-*/**',
      'functions/openapi/**',
      'bmad/**',
      'frontend/public/**',
      'frontend/playwright-report/**',
      'docs/openapi.*',
      'eslint.progress-rules.cjs',
      // Exclude these directories from ESLint processing
      '.factory/**',
      '.github/**',
      '.vscode/**',
    ],
  },
  // Base configuration for all files
  js.configs.recommended,
  // TypeScript configuration
  ...tseslint.configs.recommended,
  // Vue configuration
  ...pluginVue.configs['flat/recommended'],
  // Frontend Vue source files with typed linting
  {
    files: ['frontend/src/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: __dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn', // TODO: Fix and change to 'error'
      'no-unused-vars': 'off',
      'vue/no-unused-vars': 'off',
      'vue/no-v-html': 'error',
      'no-debugger': 'off',
      'max-len': ['warn', { code: 100 }],
      // Critical TypeScript rules for bug prevention
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/return-await': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      // General best practices
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-wrappers': 'error',
      'no-promise-executor-return': 'error',
      'prefer-promise-reject-errors': 'error',
      'dot-notation': 'error',
      'object-shorthand': 'error',
      // Style/quality rules (warnings)
      'prefer-destructuring': ['warn', { object: true, array: false }],
    },
  },
  // Frontend TypeScript source files with typed linting
  {
    files: ['frontend/src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn', // TODO: Fix and change to 'error'
      'no-unused-vars': 'off',
      'no-debugger': 'off',
      'max-len': ['warn', { code: 100 }],
    },
  },
  // Frontend config and test files (JavaScript/TypeScript without Vue parser)
  {
    files: [
      'frontend/vite.config.ts',
      'frontend/vitest.config.ts',
      'frontend/playwright.config.ts',
      'frontend/e2e/**/*.ts',
    ],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn', // TODO: Fix and change to 'error'
      'no-unused-vars': 'off',
      'no-debugger': 'off',
      'max-len': ['warn', { code: 100 }],
    },
  },
  // Functions source files
  {
    files: ['functions/src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'max-len': ['warn', { code: 120 }],
      // Critical TypeScript rules for bug prevention
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/return-await': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      // General best practices
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-wrappers': 'error',
      'no-promise-executor-return': 'error',
      'prefer-promise-reject-errors': 'error',
      'dot-notation': 'error',
      'object-shorthand': 'error',
      // Style/quality rules (warnings)
      'prefer-destructuring': ['warn', { object: true, array: false }],
    },
  },
  // Functions test files - TypeScript
  {
    files: ['functions/test/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      // Critical TypeScript rules for bug prevention
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/return-await': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      // General best practices (less strict for tests)
      'prefer-const': 'warn',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-wrappers': 'error',
      'no-promise-executor-return': 'error',
      'prefer-promise-reject-errors': 'error',
      'dot-notation': 'error',
      'object-shorthand': 'error',
    },
  },
  // Functions test files - JavaScript
  {
    files: ['functions/test/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off', // Disable undefined variable checks in test files
      '@typescript-eslint/no-unused-vars': 'off', // Disable TypeScript rules for JS files
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Root-level config files (JavaScript only, no TypeScript project linting)
  {
    files: ['*.config.js', 'eslint.config.js', 'bmad/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        project: null, // Disable project-based linting for config files
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
      'max-len': ['warn', { code: 120 }],
    },
  },
  // Node.js scripts configuration (CommonJS)
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },
  // Node.js scripts configuration (ES Modules)
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  // Frontend test files override - must be near the end to override general rules
  {
    files: [
      'frontend/src/**/*.spec.ts',
      'frontend/src/**/*.test.ts',
      'frontend/src/**/__tests__/**/*',
    ],
    rules: {
      // Disable complexity for test helpers and setups
      complexity: 'off',
      // Allow 'any' in tests for mocking/flexibility
      '@typescript-eslint/no-explicit-any': 'off',
      // Permit inline multiple components inside test files
      'vue/one-component-per-file': 'off',
      // Allow underscore-prefixed unused vars/args in tests
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Prettier must be last to override style rules
  eslintConfigPrettier,
  ...progressRules,
];
