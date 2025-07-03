// modules/expo-headphone-detection/src/ExpoHeadphoneDetectionModule.ts

import { Platform } from 'react-native';
import { NativeModulesProxy, EventEmitter } from 'expo-modules-core';

// MARK: - Type Definitions

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

// MARK: - Native Module Interface

interface ExpoHeadphoneDetectionModuleType {
  // Core detection methods
  getCurrentStatus(): Promise<HeadphoneInfo>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  
  // Advanced features - Make return types optional/nullable
  getDetectionMetrics?(): Promise<DetectionMetrics | null>;
  resetCircuitBreaker?(): Promise<void>;
  isCircuitBreakerOpen?(): boolean;
  
  // Web-specific methods - Make return types nullable
  getPermissionState?(): string | null;
  requestPermissions?(): Promise<{ granted: boolean; error?: string }>;
  invalidateCache?(): void;
  getCacheInfo?(): { size: number; lastUpdate: number | null } | null;
  
  // Event emitter methods
  addListener(eventName: string, listener: (event: any) => void): HeadphoneListener;
  removeAllListeners(eventName?: string): void;
}

// MARK: - Platform-Specific Module Loading

class ExpoHeadphoneDetectionModule extends EventEmitter implements ExpoHeadphoneDetectionModuleType {
  private nativeModule: any;
  private webModule: any;
  private isWebModuleLoaded = false;
  
  constructor() {
    super();
    
    if (Platform.OS === 'web') {
      // Load web module asynchronously
      this.loadWebModule();
    } else {
      // Load native module
      this.nativeModule = NativeModulesProxy.ExpoHeadphoneDetection;
      
      if (!this.nativeModule) {
        console.warn(
          'ExpoHeadphoneDetection native module is not available. ' +
          'Make sure you have rebuilt your app with expo-dev-client after installing the module.'
        );
      }
    }
  }
  
  private async loadWebModule() {
    if (this.isWebModuleLoaded) {
      return;
    }
    
    try {
      const webModuleImport = await import('./ExpoHeadphoneDetectionModule.web.js');
      this.webModule = webModuleImport.default;
      this.isWebModuleLoaded = true;
    } catch (error) {
      console.error('Failed to load web module:', error);
      throw new Error('Web headphone detection module is not available');
    }
  }
  
  private async getActiveModule() {
    if (Platform.OS === 'web') {
      if (!this.isWebModuleLoaded) {
        await this.loadWebModule();
      }
      if (!this.webModule) {
        throw new Error('Web module not loaded. Please ensure proper initialization.');
      }
      return this.webModule;
    } else {
      if (!this.nativeModule) {
        throw new Error('Native module not available. Please check your development build.');
      }
      return this.nativeModule;
    }
  }
  
  // MARK: - Core Detection Methods
  
  async getCurrentStatus(): Promise<HeadphoneInfo> {
    try {
      const module = await this.getActiveModule();
      const result = await module.getCurrentStatus();
      
      // Ensure consistent return format across platforms
      return {
        isConnected: Boolean(result.isConnected),
        deviceType: result.deviceType || 'none',
        deviceName: result.deviceName || '',
        confidence: typeof result.confidence === 'number' ? result.confidence : 0,
        timestamp: typeof result.timestamp === 'number' ? result.timestamp : Date.now(),
        metadata: result.metadata || {}
      };
    } catch (error) {
      console.error('getCurrentStatus failed:', error);
      throw this.normalizeError(error);
    }
  }
  
  async startListening(): Promise<void> {
    try {
      const module = await this.getActiveModule();
      await module.startListening();
    } catch (error) {
      console.error('startListening failed:', error);
      throw this.normalizeError(error);
    }
  }
  
  async stopListening(): Promise<void> {
    try {
      const module = await this.getActiveModule();
      await module.stopListening();
    } catch (error) {
      console.error('stopListening failed:', error);
      throw this.normalizeError(error);
    }
  }
  
  // MARK: - Advanced Features
  
  async getDetectionMetrics(): Promise<DetectionMetrics | null> {
    try {
      const module = await this.getActiveModule();
      
      if (!module.getDetectionMetrics) {
        console.warn('getDetectionMetrics not supported on this platform');
        return null;
      }
      
      const metrics = await module.getDetectionMetrics();
      
      return {
        detectionLatency: typeof metrics.detectionLatency === 'number' ? metrics.detectionLatency : 0,
        accuracyScore: typeof metrics.accuracyScore === 'number' ? metrics.accuracyScore : 0,
        deviceCount: typeof metrics.deviceCount === 'number' ? metrics.deviceCount : 0,
        errorCount: typeof metrics.errorCount === 'number' ? metrics.errorCount : 0,
        lastError: metrics.lastError || null
      };
    } catch (error) {
      console.error('getDetectionMetrics failed:', error);
      return null;
    }
  }
  
  async resetCircuitBreaker(): Promise<void> {
    try {
      const module = await this.getActiveModule();
      
      if (!module.resetCircuitBreaker) {
        console.warn('resetCircuitBreaker not supported on this platform');
        return;
      }
      
      if (typeof module.resetCircuitBreaker === 'function') {
        await module.resetCircuitBreaker();
      } else {
        module.resetCircuitBreaker();
      }
    } catch (error) {
      console.error('resetCircuitBreaker failed:', error);
      throw this.normalizeError(error);
    }
  }
  
  isCircuitBreakerOpen(): boolean {
    try {
      if (Platform.OS === 'web' && this.webModule) {
        return Boolean(this.webModule.isCircuitBreakerOpenPublic?.());
      } else if (this.nativeModule) {
        return Boolean(this.nativeModule.isCircuitBreakerOpen?.());
      }
      return false;
    } catch (error) {
      console.error('isCircuitBreakerOpen failed:', error);
      return false;
    }
  }
  
  // MARK: - Web-Specific Methods
  
  getPermissionState(): string | null {
    if (Platform.OS !== 'web') {
      return null;
    }
    
    try {
      if (this.webModule && this.webModule.getPermissionState) {
        return this.webModule.getPermissionState();
      }
      return 'unknown';
    } catch (error) {
      console.error('getPermissionState failed:', error);
      return 'unknown';
    }
  }
  
  async requestPermissions(): Promise<{ granted: boolean; error?: string }> {
    if (Platform.OS !== 'web') {
      return { granted: true };
    }
    
    try {
      const module = await this.getActiveModule();
      
      if (!module.requestPermissions) {
        return { granted: false, error: 'Permission request not supported' };
      }
      
      const result = await module.requestPermissions();
      return {
        granted: Boolean(result.granted),
        error: result.error
      };
    } catch (error) {
      console.error('requestPermissions failed:', error);
      return { 
        granted: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }
  
  invalidateCache(): void {
    if (Platform.OS !== 'web') {
      return;
    }
    
    try {
      if (this.webModule && this.webModule.invalidateCache) {
        this.webModule.invalidateCache();
      }
    } catch (error) {
      console.error('invalidateCache failed:', error);
    }
  }
  
  getCacheInfo(): { size: number; lastUpdate: number | null } | null {
    if (Platform.OS !== 'web') {
      return null;
    }
    
    try {
      if (this.webModule && this.webModule.getCacheInfo) {
        const info = this.webModule.getCacheInfo();
        return {
          size: typeof info.size === 'number' ? info.size : 0,
          lastUpdate: typeof info.lastUpdate === 'number' ? info.lastUpdate : null
        };
      }
      return null;
    } catch (error) {
      console.error('getCacheInfo failed:', error);
      return null;
    }
  }
  
  // MARK: - Event Management
  
  addListener(eventName: string, listener: (event: any) => void): HeadphoneListener {
    try {
      if (Platform.OS === 'web' && this.webModule) {
        // Web module extends EventEmitter directly
        const subscription = this.webModule.addListener(eventName, listener);
        return {
          remove: () => subscription.remove()
        };
      } else if (this.nativeModule) {
        // Native module through Expo modules
        const subscription = this.nativeModule.addListener(eventName, listener);
        return {
          remove: () => {
            if (subscription && subscription.remove) {
              subscription.remove();
            }
          }
        };
      }
      
      // Fallback - return a no-op listener to prevent crashes
      return {
        remove: () => {}
      };
    } catch (error) {
      console.error('addListener failed:', error);
      // Return a no-op listener to prevent crashes
      return {
        remove: () => {}
      };
    }
  }
  
  removeAllListeners(eventName?: string): void {
    try {
      if (Platform.OS === 'web' && this.webModule && this.webModule.removeAllListeners) {
        this.webModule.removeAllListeners(eventName);
      } else if (this.nativeModule && this.nativeModule.removeAllListeners) {
        this.nativeModule.removeAllListeners(eventName);
      }
    } catch (error) {
      console.error('removeAllListeners failed:', error);
    }
  }
  
  // MARK: - Error Handling
  
  private normalizeError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'string') {
      return new Error(error);
    }
    
    if (error && typeof error === 'object') {
      const message = error.message || error.code || 'Unknown error';
      const normalizedError = new Error(message);
      
      // Preserve additional error properties
      if (error.code) {
        (normalizedError as any).code = error.code;
      }
      
      if (error.userInfo) {
        (normalizedError as any).userInfo = error.userInfo;
      }
      
      return normalizedError;
    }
    
    return new Error('Unknown error occurred');
  }
  
  // MARK: - Platform Capabilities
  
  getPlatformCapabilities(): {
    supportsRealTimeDetection: boolean;
    supportsBluetooth: boolean;
    supportsMetrics: boolean;
    supportsCircuitBreaker: boolean;
    supportsPermissionCheck: boolean;
    supportsCache: boolean;
    platform: string;
  } {
    return {
      supportsRealTimeDetection: true,
      supportsBluetooth: Platform.OS !== 'web',
      supportsMetrics: true,
      supportsCircuitBreaker: true,
      supportsPermissionCheck: Platform.OS === 'web',
      supportsCache: Platform.OS === 'web',
      platform: Platform.OS
    };
  }
  
  // MARK: - Health Check
  
  async performHealthCheck(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
    platformInfo: any;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Test basic functionality
      await this.getCurrentStatus();
    } catch (error) {
      issues.push('Basic detection failed');
      recommendations.push('Check device permissions and module installation');
    }
    
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      issues.push('Circuit breaker is open');
      recommendations.push('Reset circuit breaker or wait for automatic recovery');
    }
    
    // Check metrics
    const metrics = await this.getDetectionMetrics();
    if (metrics) {
      if (metrics.errorCount > 10) {
        issues.push('High error count detected');
        recommendations.push('Review device compatibility and permissions');
      }
      
      if (metrics.detectionLatency > 1000) {
        issues.push('High detection latency');
        recommendations.push('Consider device performance optimization');
      }
      
      if (metrics.accuracyScore < 0.8) {
        issues.push('Low detection accuracy');
        recommendations.push('Check device compatibility and update detection algorithms');
      }
    }
    
    // Platform-specific checks
    if (Platform.OS === 'web') {
      const permissionState = this.getPermissionState();
      if (permissionState === 'denied') {
        issues.push('Microphone permissions denied');
        recommendations.push('Request user to grant microphone permissions');
      }
      
      const cacheInfo = this.getCacheInfo();
      if (cacheInfo && cacheInfo.size === 0) {
        issues.push('Cache is empty');
        recommendations.push('Perform initial detection to populate cache');
      }
    }
    
    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations,
      platformInfo: {
        platform: Platform.OS,
        capabilities: this.getPlatformCapabilities(),
        moduleVersion: '1.0.0',
        timestamp: Date.now()
      }
    };
  }
  
  // MARK: - Debug Information
  
  getDebugInfo(): {
    platform: string;
    moduleLoaded: boolean;
    capabilities: any;
    lastError: string | null;
    timestamp: number;
  } {
    let moduleLoaded = false;
    let lastError: string | null = null;
    
    try {
      if (Platform.OS === 'web') {
        moduleLoaded = this.isWebModuleLoaded && !!this.webModule;
      } else {
        moduleLoaded = !!this.nativeModule;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    
    return {
      platform: Platform.OS,
      moduleLoaded,
      capabilities: this.getPlatformCapabilities(),
      lastError,
      timestamp: Date.now()
    };
  }
}

// MARK: - Singleton Export

const ExpoHeadphoneDetectionModuleInstance = new ExpoHeadphoneDetectionModule();

// Ensure proper cleanup on app termination
if (Platform.OS !== 'web') {
  const AppState = require('react-native').AppState;
  
  let appStateSubscription: any = null;
  
  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App is going to background, stop listening to save battery
      ExpoHeadphoneDetectionModuleInstance.stopListening().catch(() => {});
    } else if (nextAppState === 'active') {
      // App is coming to foreground, restart listening
      ExpoHeadphoneDetectionModuleInstance.startListening().catch(() => {});
    }
  };
  
  // Set up app state listener
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  
  // Cleanup function for development
  if (__DEV__) {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0] && args[0].includes('ExpoHeadphoneDetection')) {
        // Enhanced error logging for development
        console.group('🎧 Headphone Detection Error');
        originalConsoleError(...args);
        console.log('Debug Info:', ExpoHeadphoneDetectionModuleInstance.getDebugInfo());
        console.groupEnd();
      } else {
        originalConsoleError(...args);
      }
    };
  }
}

export default ExpoHeadphoneDetectionModuleInstance;