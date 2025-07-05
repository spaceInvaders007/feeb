import { ConfigPlugin, createRunOncePlugin } from '@expo/config-plugins';

const pkg = require('../../package.json');

const withExpoHeadphoneDetection: ConfigPlugin = (config) => {
  return config;
};

export default createRunOncePlugin(withExpoHeadphoneDetection, pkg.name, pkg.version);
