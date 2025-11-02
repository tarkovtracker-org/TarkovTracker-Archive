/* eslint-env node */
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
      'frontend/public/**',
      'docs/openapi.*',
      'functions/test/**/*.js',
      'functions/**/*.test.js',
      'functions/vitest.config.js',
      'eslint.progress-rules.cjs',
    ],
  },
  // Base configuration for all files
  js.configs.recommended,
  // TypeScript configuration
  ...tseslint.configs.recommended,
  // Vue configuration
  ...pluginVue.configs['flat/recommended'],
  // Project-specific overrides
  {
    files: ['frontend/**/*.{ts,js,vue}'],
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
        project: ['./frontend/tsconfig.eslint.json'],
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
    },
  },
  {
    files: ['functions/**/*.{ts,js}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        project: 'functions/tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'max-len': ['warn', { code: 120 }],
    },
  },
  {
    files: ['functions/test/**/*.{ts,js}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: null, // Disable project-based linting for test files
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
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
  // Apollo config (CommonJS)
  {
    files: ['apollo.config.js'],
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
    },
  },
  // Prettier must be last to override style rules
  eslintConfigPrettier,
  ...progressRules,
];
