"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const withExpoHeadphoneDetection = (config) => {
    return config;
};
exports.default = (0, config_plugins_1.createRunOncePlugin)(withExpoHeadphoneDetection, 'expo-headphone-detection', '1.0.0');
