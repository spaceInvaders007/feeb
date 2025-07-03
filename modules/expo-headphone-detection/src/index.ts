// Import the main module (which exports a class instance)
import ExpoHeadphoneDetectionModuleInstance from './ExpoHeadphoneDetectionModule';

// Import types for use in interfaces
import type { HeadphoneInfo, DetectionMetrics } from './ExpoHeadphoneDetectionModule';

// Export it as default
export default ExpoHeadphoneDetectionModuleInstance;

// Re-export only the types that exist in ExpoHeadphoneDetectionModule
export type {
  HeadphoneInfo,
  DetectionMetrics,
  HeadphoneListener
} from './ExpoHeadphoneDetectionModule';

// Define the missing types here since they're used in the hook
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
