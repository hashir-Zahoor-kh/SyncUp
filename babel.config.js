module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ...(isProduction ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] : []),
      // Reanimated plugin must be last; skip in test env (requires react-native-worklets)
      ...(!isTest ? ['react-native-reanimated/plugin'] : []),
    ],
  };
};
