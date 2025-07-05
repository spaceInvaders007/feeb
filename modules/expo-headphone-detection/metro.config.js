const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = mergeConfig(getDefaultConfig(__dirname), {
  resolver: {
    alias: {
      'expo-headphone-detection': path.resolve(__dirname, 'modules/expo-headphone-detection/build/index.js'),
    },
  },
});

module.exports = withNativeWind(config, { input: './global.css' });