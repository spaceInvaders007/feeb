import ExpoHeadphoneDetectionModuleInstance, { DetectionMetrics, HeadphoneInfo } from './ExpoHeadphoneDetectionModule';
export default ExpoHeadphoneDetectionModuleInstance;
export type { HeadphoneInfo, DetectionMetrics, HeadphoneListener } from './ExpoHeadphoneDetectionModule';
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
