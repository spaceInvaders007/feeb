// 2. Fixed modules/expo-headphone-detection/src/ExpoHeadphoneDetectionModule.ts
import { NativeModulesProxy } from 'expo-modules-core';

// Define the native module interface
interface ExpoHeadphoneDetectionModuleType {
  getCurrentStatus(): Promise<{
    isConnected: boolean;
    deviceType: 'wired' | 'bluetooth' | 'none';
    deviceName: string;
  }>;
  
  startListening?(): void;
  stopListening?(): void;
}

// Import the actual native module or use web fallback
const ExpoHeadphoneDetectionModule: ExpoHeadphoneDetectionModuleType = 
  NativeModulesProxy.ExpoHeadphoneDetection ?? require('./ExpoHeadphoneDetectionModule.web').default;

export default ExpoHeadphoneDetectionModule;