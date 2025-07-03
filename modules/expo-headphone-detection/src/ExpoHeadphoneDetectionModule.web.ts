// modules/expo-headphone-detection/src/ExpoHeadphoneDetectionModule.web.ts

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

// Basic web implementation for testing
class ExpoHeadphoneDetectionModuleWeb extends EventEmitter {
  
  async getCurrentStatus(): Promise<HeadphoneInfo> {
    return {
      isConnected: false,
      deviceType: 'none',
      deviceName: '',
      confidence: 0,
      timestamp: Date.now(),
      metadata: { platform: 'web', method: 'basic' }
    };
  }
  
  async startListening(): Promise<void> {
    console.log('🌐 Web: Starting headphone detection...');
  }
  
  async stopListening(): Promise<void> {
    console.log('🌐 Web: Stopping headphone detection...');
  }
  
  async getDetectionMetrics(): Promise<DetectionMetrics> {
    return {
      detectionLatency: 0,
      accuracyScore: 0,
      deviceCount: 0,
      errorCount: 0,
      lastError: null
    };
  }
  
  resetCircuitBreaker(): void {
    console.log('🌐 Web: Circuit breaker reset');
  }
  
  isCircuitBreakerOpenPublic(): boolean {
    return false;
  }
  
  getPermissionState(): string {
    return 'unknown';
  }
  
  async requestPermissions(): Promise<{ granted: boolean; error?: string }> {
    return { granted: true };
  }
  
  invalidateCache(): void {
    console.log('🌐 Web: Cache invalidated');
  }
  
  getCacheInfo(): { size: number; lastUpdate: number | null } {
    return { size: 0, lastUpdate: null };
  }
}

export default new ExpoHeadphoneDetectionModuleWeb();
