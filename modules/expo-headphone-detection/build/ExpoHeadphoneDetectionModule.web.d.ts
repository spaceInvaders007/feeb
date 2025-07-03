declare global {
    interface Navigator {
        bluetooth?: {
            getAvailabilityState?: () => Promise<any[]>;
            addEventListener?: (event: string, handler: (event: Event) => void) => void;
            removeEventListener?: (event: string, handler: (event: Event) => void) => void;
        };
    }
    interface BluetoothDevice {
        id: string;
        name?: string;
        gatt?: {
            connected: boolean;
        };
    }
}
import { EventEmitter } from 'expo-modules-core';
interface HeadphoneInfo {
    isConnected: boolean;
    deviceType: 'wired' | 'bluetooth' | 'none';
    deviceName: string;
    confidence: number;
    timestamp: number;
    metadata: Record<string, any>;
}
interface DetectionMetrics {
    detectionLatency: number;
    accuracyScore: number;
    deviceCount: number;
    errorCount: number;
    lastError: string | null;
}
declare class ExpoHeadphoneDetectionModuleWeb extends EventEmitter<{
    headphoneStatusChanged: (info: HeadphoneInfo) => void;
    detectionError: (error: any) => void;
    performanceMetrics: (data: any) => void;
}> {
    private isListening;
    private deviceChangeHandler;
    private bluetoothDeviceHandler;
    private currentDetectionPromise;
    private retryCount;
    private circuitBreakerFailureCount;
    private lastCircuitBreakerFailure;
    private isCircuitBreakerOpen;
    private lastKnownState;
    private lastDetectionResult;
    private telemetryEvents;
    private metrics;
    private deviceCache;
    private permissionState;
    private bluetoothDevice;
    private audioContext;
    private analyserNode;
    private debounceTimer;
    constructor();
    getCurrentStatus(): Promise<HeadphoneInfo>;
    private performDetectionWithFallback;
    private detectViaEnumerateDevices;
    private detectViaBluetooth;
    private detectViaAudioContext;
    private detectViaMediaQueries;
    private detectViaNavigatorProperties;
    private analyzeMediaDevice;
    private analyzeBluetoothDevice;
    private analyzeAudioCharacteristics;
    private isBluetoothAudioDevice;
    private getDeviceDisplayName;
    private getCachedResult;
    private cacheResult;
    private createEmptyHeadphoneInfo;
    private handleDetectionSuccess;
    private handleDetectionFailure;
    private shouldKeepCircuitBreakerOpen;
    private resetCircuitBreaker;
    private ensurePermissions;
    startListening(): void;
    stopListening(): void;
    private initializeModule;
    private checkInitialPermissions;
    private cleanup;
    private logTelemetry;
    private flushTelemetry;
    private generateSessionId;
    private generateEventId;
    private withTimeout;
    getDetectionMetrics(): Promise<DetectionMetrics>;
    resetCircuitBreakerPublic(): void;
    isCircuitBreakerOpenPublic(): boolean;
    getPermissionState(): string;
    getCacheInfo(): {
        size: number;
        lastUpdate: number | null;
    };
    invalidateCache(): void;
    requestPermissions(): Promise<{
        granted: boolean;
        error?: string;
    }>;
}
declare const _default: ExpoHeadphoneDetectionModuleWeb;
export default _default;
