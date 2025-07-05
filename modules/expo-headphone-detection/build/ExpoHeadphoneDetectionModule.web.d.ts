import { EventEmitter } from 'expo-modules-core';
interface HeadphoneInfo {
    isConnected: boolean;
    deviceType: 'wired' | 'bluetooth' | 'none';
    deviceName: string;
    confidence?: number;
    timestamp?: number;
    metadata?: Record<string, any>;
}
interface DetectionMetrics {
    detectionLatency: number;
    accuracyScore: number;
    deviceCount: number;
    errorCount: number;
    lastError: string | null;
}
declare class ExpoHeadphoneDetectionModuleWeb extends EventEmitter {
    getCurrentStatus(): Promise<HeadphoneInfo>;
    startListening(): Promise<void>;
    stopListening(): Promise<void>;
    getDetectionMetrics(): Promise<DetectionMetrics>;
    resetCircuitBreaker(): void;
    isCircuitBreakerOpenPublic(): boolean;
    getPermissionState(): string;
    requestPermissions(): Promise<{
        granted: boolean;
        error?: string;
    }>;
    invalidateCache(): void;
    getCacheInfo(): {
        size: number;
        lastUpdate: number | null;
    };
}
declare const _default: ExpoHeadphoneDetectionModuleWeb;
export default _default;
