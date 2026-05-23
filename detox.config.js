/** @type {import('detox').DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.sim.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/SyncUp.app',
      build:
        'xcodebuild -workspace ios/SyncUp.xcworkspace -scheme SyncUp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'ios.sim.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/SyncUp.app',
      build:
        'xcodebuild -workspace ios/SyncUp.xcworkspace -scheme SyncUp -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 16',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.sim.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.sim.release',
    },
  },
};
