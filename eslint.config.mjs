// eslint.config.mjs
import eslintPluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  // Global ignores
  {
    ignores: ['dist/**/*', 'coverage/**/*', 'node_modules/**/*'],
  },

  // Base recommended rules for JS
  eslintPluginJs.configs.recommended,

  // TypeScript support (parser + recommended rules)
  ...tseslint.configs.recommended,

  // Prettier integration (disables conflicting rules)
  prettier,

  // Main TypeScript files
  {
    files: ['src/**/*.ts', 'scripts/**/*.ts', '*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        // Use the workspace-wide tsconfig for ESLint so all linted files
        // are included and type-aware rules resolve correctly.
        project: ['./tsconfig.eslint.json'],
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
  },

  // Cypress files
  {
    files: ['cypress/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
  },

  // Core library files - STRICT rules (most important code)
  {
    files: ['src/lib/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        // Use the workspace tsconfig for type-aware linting on core files.
        project: ['./tsconfig.eslint.json'],
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
  },

  // Tests
  {
    files: ['test/**/*.ts', 'test/**/*.spec.ts', 'test/**/*.spec.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
    rules: {
      // Tests are allowed to use `any` liberally
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
