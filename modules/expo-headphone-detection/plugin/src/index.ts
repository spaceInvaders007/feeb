import { ConfigPlugin, createRunOncePlugin } from '@expo/config-plugins';

const withExpoHeadphoneDetection: ConfigPlugin = (config) => {
  return config;
};

export default createRunOncePlugin(withExpoHeadphoneDetection, 'expo-headphone-detection', '1.0.0');
