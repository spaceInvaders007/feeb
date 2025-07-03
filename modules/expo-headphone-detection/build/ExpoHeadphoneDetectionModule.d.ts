import { EventEmitter } from 'expo-modules-core';
export interface HeadphoneInfo {
    isConnected: boolean;
    deviceType: 'wired' | 'bluetooth' | 'none';
    deviceName: string;
    confidence?: number;
    timestamp?: number;
    metadata?: Record<string, any>;
}
export interface DetectionMetrics {
    detectionLatency: number;
    accuracyScore: number;
    deviceCount: number;
    errorCount: number;
    lastError: string | null;
}
export interface HeadphoneListener {
    remove(): void;
}
interface ExpoHeadphoneDetectionModuleType {
    getCurrentStatus(): Promise<HeadphoneInfo>;
    startListening(): Promise<void>;
    stopListening(): Promise<void>;
    getDetectionMetrics?(): Promise<DetectionMetrics | null>;
    resetCircuitBreaker?(): Promise<void>;
    isCircuitBreakerOpen?(): boolean;
    getPermissionState?(): string | null;
    requestPermissions?(): Promise<{
        granted: boolean;
        error?: string;
    }>;
    invalidateCache?(): void;
    getCacheInfo?(): {
        size: number;
        lastUpdate: number | null;
    } | null;
    addListener(eventName: string, listener: (event: any) => void): HeadphoneListener;
    removeAllListeners(eventName?: string): void;
}
declare class ExpoHeadphoneDetectionModule extends EventEmitter implements ExpoHeadphoneDetectionModuleType {
    private nativeModule;
    private webModule;
    private isWebModuleLoaded;
    constructor();
    private loadWebModule;
    private getActiveModule;
    getCurrentStatus(): Promise<HeadphoneInfo>;
    startListening(): Promise<void>;
    stopListening(): Promise<void>;
    getDetectionMetrics(): Promise<DetectionMetrics | null>;
    resetCircuitBreaker(): Promise<void>;
    isCircuitBreakerOpen(): boolean;
    getPermissionState(): string | null;
    requestPermissions(): Promise<{
        granted: boolean;
        error?: string;
    }>;
    invalidateCache(): void;
    getCacheInfo(): {
        size: number;
        lastUpdate: number | null;
    } | null;
    addListener(eventName: string, listener: (event: any) => void): HeadphoneListener;
    removeAllListeners(eventName?: string): void;
    private normalizeError;
    getPlatformCapabilities(): {
        supportsRealTimeDetection: boolean;
        supportsBluetooth: boolean;
        supportsMetrics: boolean;
        supportsCircuitBreaker: boolean;
        supportsPermissionCheck: boolean;
        supportsCache: boolean;
        platform: string;
    };
    performHealthCheck(): Promise<{
        isHealthy: boolean;
        issues: string[];
        recommendations: string[];
        platformInfo: any;
    }>;
    getDebugInfo(): {
        platform: string;
        moduleLoaded: boolean;
        capabilities: any;
        lastError: string | null;
        timestamp: number;
    };
}
declare const ExpoHeadphoneDetectionModuleInstance: ExpoHeadphoneDetectionModule;
export default ExpoHeadphoneDetectionModuleInstance;
