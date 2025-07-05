import { DetectionMetrics, HeadphoneInfo } from 'expo-headphone-detection';

// Remove the circular import at the top!
export { default } from '../modules/expo-headphone-detection/build/index';

export type {
  HeadphoneInfo,
  DetectionMetrics,
  HeadphoneListener
} from '../modules/expo-headphone-detection/build/index';

// Define the custom hook types locally
export interface UseHeadphoneDetectionOptions {
  autoStart?: boolean;
  debounceMs?: number;
  retryAttempts?: number;
  enableTelemetry?: boolean;
  cacheTimeout?: number;
  fallbackTimeout?: number;
}

export interface UseHeadphoneDetectionReturn {
  isConnected: boolean;
  deviceType: 'wired' | 'bluetooth' | 'none';
  deviceName: string;
  confidence: number;
  isInitialized: boolean;
  isListening: boolean;
  isDetecting: boolean;
  error: string | null;
  hasHeadphones: boolean;
  isWired: boolean;
  isBluetooth: boolean;
  isHighConfidence: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  checkHeadphones: () => Promise<HeadphoneInfo | null>;
  refreshDetection: () => Promise<void>;
  resetError: () => void;
  metrics: DetectionMetrics | null;
  getDetectionHistory: () => HeadphoneInfo[];
  exportTelemetry: () => any[];
  resetCircuitBreaker: () => void;
  rawHeadphoneInfo: HeadphoneInfo | null;
  lastDetectionTime: number | null;
}