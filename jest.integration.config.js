/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.integration.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    // Stub out Expo's virtual env shim (used by babel-preset-expo inline-env-vars)
    '^expo/virtual/env$': '<rootDir>/__mocks__/expo-env.js',
  },
};
