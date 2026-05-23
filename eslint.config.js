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
    ],
  },
]);
