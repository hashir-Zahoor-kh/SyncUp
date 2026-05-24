const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettierConfig = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  ...expoConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
    },
  },
  // Data-fetching files legitimately call setState from useEffect
  // (async fetch → set state on result). The React Compiler's
  // set-state-in-effect rule is too strict for this well-established pattern.
  // Applies to: context providers and screen-level invite flow screens.
  {
    files: ['src/contexts/**/*.tsx', 'app/(app)/invite.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  prettierConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'build/**',
      'ios/**',
      'android/**',
      'babel.config.js',
      'eslint.config.js',
      'jest.config.js',
      'detox.config.js',
      'e2e/jest.config.js',
      'scripts/**',
      'supabase/functions/**',
      'public/**',
    ],
  },
]);
