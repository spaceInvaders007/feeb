import { ConfigPlugin, createRunOncePlugin, withInfoPlist, withAndroidManifest } from '@expo/config-plugins';

interface PluginProps {
  microphonePermission?: string;
  bluetoothPermission?: string;
}

const withExpoHeadphoneDetection: ConfigPlugin<PluginProps> = (config, props = {}) => {
  const {
    microphonePermission = "This app uses microphone access to detect connected audio devices and provide optimal recording experience.",
    bluetoothPermission = "This app uses Bluetooth to detect wireless headphones and audio devices."
  } = props;

  config = withInfoPlist(config, (config) => {
    config.modResults.NSMicrophoneUsageDescription = microphonePermission;
    config.modResults.NSBluetoothAlwaysUsageDescription = bluetoothPermission;
    config.modResults.NSBluetoothPeripheralUsageDescription = bluetoothPermission;
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    
    const permissions = [
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.RECORD_AUDIO'
    ];

    permissions.forEach(permission => {
      if (!androidManifest.manifest['uses-permission']?.find(p => p.$['android:name'] === permission)) {
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

export default createRunOncePlugin(withExpoHeadphoneDetection, 'expo-headphone-detection', '1.0.0');
