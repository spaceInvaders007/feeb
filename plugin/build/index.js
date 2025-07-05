"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const withExpoHeadphoneDetection = (config, props = {}) => {
    const { microphonePermission = "This app uses microphone access to detect connected audio devices and provide optimal recording experience.", bluetoothPermission = "This app uses Bluetooth to detect wireless headphones and audio devices." } = props;
    config = (0, config_plugins_1.withInfoPlist)(config, (config) => {
        config.modResults.NSMicrophoneUsageDescription = microphonePermission;
        config.modResults.NSBluetoothAlwaysUsageDescription = bluetoothPermission;
        config.modResults.NSBluetoothPeripheralUsageDescription = bluetoothPermission;
        return config;
    });
    config = (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        const androidManifest = config.modResults;
        const permissions = [
            'android.permission.BLUETOOTH',
            'android.permission.BLUETOOTH_ADMIN',
            'android.permission.BLUETOOTH_CONNECT',
            'android.permission.MODIFY_AUDIO_SETTINGS',
            'android.permission.RECORD_AUDIO'
        ];
        permissions.forEach(permission => {
            var _a;
            if (!((_a = androidManifest.manifest['uses-permission']) === null || _a === void 0 ? void 0 : _a.find(p => p.$['android:name'] === permission))) {
                androidManifest.manifest['uses-permission'] = androidManifest.manifest['uses-permission'] || [];
                androidManifest.manifest['uses-permission'].push({
                    $: { 'android:name': permission }
                });
            }
        });
        return config;
    });
    return config;
};
exports.default = (0, config_plugins_1.createRunOncePlugin)(withExpoHeadphoneDetection, 'expo-headphone-detection', '1.0.0');
