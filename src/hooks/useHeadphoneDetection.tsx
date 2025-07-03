// src/hooks/useHeadphoneDetection.ts
import React, { createContext, useContext, ReactNode } from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Platform } from 'react-native';
import ExpoHeadphoneDetectionModule from '../../modules/expo-headphone-detection/src/ExpoHeadphoneDetectionModule';

// MARK: - Types & Interfaces

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

interface UseHeadphoneDetectionOptions {
  autoStart?: boolean;
  debounceMs?: number;
  retryAttempts?: number;
  enableTelemetry?: boolean;
  cacheTimeout?: number;
  fallbackTimeout?: number;
}

interface UseHeadphoneDetectionReturn {
  // Core state
  isConnected: boolean;
  deviceType: 'wired' | 'bluetooth' | 'none';
  deviceName: string;
  confidence: number;
  
  // Status flags
  isInitialized: boolean;
  isListening: boolean;
  isDetecting: boolean;
  error: string | null;
  
  // Convenience getters
  hasHeadphones: boolean;
  isWired: boolean;
  isBluetooth: boolean;
  isHighConfidence: boolean;
  
  // Methods
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  checkHeadphones: () => Promise<HeadphoneInfo | null>;
  refreshDetection: () => Promise<void>;
  resetError: () => void;
  
  // Advanced features
  metrics: DetectionMetrics | null;
  getDetectionHistory: () => HeadphoneInfo[];
  exportTelemetry: () => any[];
  resetCircuitBreaker: () => void;
  
  // Raw data access
  rawHeadphoneInfo: HeadphoneInfo | null;
  lastDetectionTime: number | null;
}

// MARK: - Constants

const DEFAULT_OPTIONS: Required<UseHeadphoneDetectionOptions> = {
  autoStart: true,
  debounceMs: 100,
  retryAttempts: 3,
  enableTelemetry: false,
  cacheTimeout: 30000,
  fallbackTimeout: 5000,
};

const HIGH_CONFIDENCE_THRESHOLD = 0.85;
const DETECTION_HISTORY_LIMIT = 50;

// MARK: - Production Headphone Detection Hook

export function useHeadphoneDetection(
  options: UseHeadphoneDetectionOptions = {}
): UseHeadphoneDetectionReturn {
  
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  
  // MARK: - State Management
  
  const [headphoneInfo, setHeadphoneInfo] = useState<HeadphoneInfo>({
    isConnected: false,
    deviceType: 'none',
    deviceName: '',
    confidence: 0,
    timestamp: 0,
    metadata: {}
  });
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DetectionMetrics | null>(null);
  const [lastDetectionTime, setLastDetectionTime] = useState<number | null>(null);
  
  // MARK: - Refs & Internal State
  
  const isMountedRef = useRef(true);
  const subscriptionRef = useRef<any>(null);
  const errorSubscriptionRef = useRef<any>(null);
  const metricsSubscriptionRef = useRef<any>(null);
const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const detectionHistoryRef = useRef<HeadphoneInfo[]>([]);
  const telemetryRef = useRef<any[]>([]);
  const lastSuccessfulDetectionRef = useRef<HeadphoneInfo | null>(null);
  
  // MARK: - Helper Functions
  
  const addToHistory = useCallback((info: HeadphoneInfo) => {
    const history = detectionHistoryRef.current;
    history.unshift(info);
    
    // Limit history size
    if (history.length > DETECTION_HISTORY_LIMIT) {
      history.splice(DETECTION_HISTORY_LIMIT);
    }
  }, []);
  
  const addTelemetryEvent = useCallback((event: any) => {
    if (!opts.enableTelemetry) return;
    
    telemetryRef.current.unshift({
      ...event,
      hookTimestamp: Date.now(),
      platform: Platform.OS
    });
    
    // Limit telemetry size
    if (telemetryRef.current.length > 1000) {
      telemetryRef.current.splice(1000);
    }
  }, [opts.enableTelemetry]);
  
  const updateStateFromInfo = useCallback((info: HeadphoneInfo) => {
    if (!isMountedRef.current) return;
    
    setHeadphoneInfo(info);
    setLastDetectionTime(Date.now());
    setError(null);
    
    // Add to history
    addToHistory(info);
    lastSuccessfulDetectionRef.current = info;
    
    // Reset retry count on success
    retryCountRef.current = 0;
    
    addTelemetryEvent({
      type: 'detection_success',
      info,
      retryCount: retryCountRef.current
    });
  }, [addToHistory, addTelemetryEvent]);
  
  const handleError = useCallback((errorInfo: any) => {
    if (!isMountedRef.current) return;
    
    const errorMessage = typeof errorInfo === 'string' 
      ? errorInfo 
      : errorInfo?.error || errorInfo?.message || 'Detection failed';
    
    retryCountRef.current++;
    
    // Only set error state if we've exceeded retry attempts
    if (retryCountRef.current >= opts.retryAttempts) {
      setError(errorMessage);
      addTelemetryEvent({
        type: 'detection_error',
        error: errorMessage,
        retryCount: retryCountRef.current,
        finalFailure: true
      });
    } else {
      // Attempt retry with exponential backoff
      const retryDelay = Math.pow(2, retryCountRef.current) * 1000;
      setTimeout(() => {
        if (isMountedRef.current && isListening) {
          checkHeadphones();
        }
      }, retryDelay);
      
      addTelemetryEvent({
        type: 'detection_error_retry',
        error: errorMessage,
        retryCount: retryCountRef.current,
        retryDelay
      });
    }
  }, [opts.retryAttempts, isListening, addTelemetryEvent]);
  
  // MARK: - Core Detection Methods
  
  const checkHeadphones = useCallback(async (): Promise<HeadphoneInfo | null> => {
    if (!isMountedRef.current) return null;
    
    try {
      setIsDetecting(true);
      setError(null);
      
      const startTime = Date.now();
      const status = await ExpoHeadphoneDetectionModule.getCurrentStatus();
      const detectionLatency = Date.now() - startTime;
      
      if (!isMountedRef.current) return null;
      
      const processedInfo: HeadphoneInfo = {
        isConnected: status.isConnected,
        deviceType: status.deviceType as 'wired' | 'bluetooth' | 'none',
        deviceName: status.deviceName || '',
        confidence: status.confidence || 0,
        timestamp: status.timestamp || Date.now(),
        metadata: {
          ...status.metadata,
          detectionLatency,
          platform: Platform.OS,
          hookVersion: '1.0.0'
        }
      };
      
      updateStateFromInfo(processedInfo);
      
      addTelemetryEvent({
        type: 'manual_detection',
        latency: detectionLatency,
        result: processedInfo
      });
      
      return processedInfo;
    } catch (err: any) {
      console.error('❌ Headphone detection error:', err);
      
      if (isMountedRef.current) {
        handleError(err);
        
        // Return last known good state if available
        if (lastSuccessfulDetectionRef.current) {
          const staleInfo = {
            ...lastSuccessfulDetectionRef.current,
            metadata: {
              ...lastSuccessfulDetectionRef.current.metadata,
              isStale: true,
              staleReason: err.message || 'Detection failed'
            }
          };
          setHeadphoneInfo(staleInfo);
          return staleInfo;
        }
      }
      
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsDetecting(false);
      }
    }
  }, [updateStateFromInfo, handleError, addTelemetryEvent]);
  
  const debouncedStatusChange = useCallback((info: HeadphoneInfo) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      updateStateFromInfo(info);
    }, opts.debounceMs);
  }, [opts.debounceMs, updateStateFromInfo]);
  
  // MARK: - Listening Control
  
  const startListening = useCallback(async (): Promise<void> => {
    if (isListening || !isMountedRef.current) return;
    
    try {
      setError(null);
      
      // Get initial status
      await checkHeadphones();
      
      if (!isMountedRef.current) return;
      
      // Set up real-time listener
      subscriptionRef.current = ExpoHeadphoneDetectionModule.addListener(
        'headphoneStatusChanged',
        (info: HeadphoneInfo) => {
          console.log('🔄 Headphone status changed:', info);
          if (isMountedRef.current) {
            debouncedStatusChange(info);
          }
        }
      );
      
      // Set up error listener
      errorSubscriptionRef.current = ExpoHeadphoneDetectionModule.addListener(
        'detectionError',
        (errorInfo: any) => {
          console.log('❌ Detection error event:', errorInfo);
          if (isMountedRef.current) {
            handleError(errorInfo);
          }
        }
      );
      
      // Set up metrics listener
      if (opts.enableTelemetry) {
        metricsSubscriptionRef.current = ExpoHeadphoneDetectionModule.addListener(
          'performanceMetrics',
          (metricsData: any) => {
            if (isMountedRef.current) {
              setMetrics(metricsData.metrics);
              addTelemetryEvent({
                type: 'performance_metrics',
                data: metricsData
              });
            }
          }
        );
      }
      
      // Start native listening
      await ExpoHeadphoneDetectionModule.startListening();
      
      if (isMountedRef.current) {
        setIsListening(true);
        setIsInitialized(true);
        
        addTelemetryEvent({
          type: 'listening_started',
          options: opts
        });
      }
      
    } catch (err: any) {
      console.error('❌ Failed to start headphone listening:', err);
      if (isMountedRef.current) {
        handleError(err);
      }
    }
  }, [isListening, checkHeadphones, debouncedStatusChange, handleError, opts, addTelemetryEvent]);
  
  const stopListening = useCallback(async (): Promise<void> => {
    if (!isListening || !isMountedRef.current) return;
    
    try {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      // Remove listeners
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      
      if (errorSubscriptionRef.current) {
        errorSubscriptionRef.current.remove();
        errorSubscriptionRef.current = null;
      }
      
      if (metricsSubscriptionRef.current) {
        metricsSubscriptionRef.current.remove();
        metricsSubscriptionRef.current = null;
      }
      
      // Stop native listening
      await ExpoHeadphoneDetectionModule.stopListening();
      
      if (isMountedRef.current) {
        setIsListening(false);
        
        addTelemetryEvent({
          type: 'listening_stopped'
        });
      }
      
    } catch (err: any) {
      console.error('❌ Error stopping headphone listening:', err);
    }
  }, [isListening, addTelemetryEvent]);
  
  // MARK: - Advanced Methods
  
  const refreshDetection = useCallback(async (): Promise<void> => {
    // Force fresh detection by invalidating cache
    if (Platform.OS === 'web' && ExpoHeadphoneDetectionModule.invalidateCache) {
      ExpoHeadphoneDetectionModule.invalidateCache();
    }
    
    await checkHeadphones();
  }, [checkHeadphones]);
  
  const resetError = useCallback((): void => {
    setError(null);
    retryCountRef.current = 0;
    
    addTelemetryEvent({
      type: 'error_reset'
    });
  }, [addTelemetryEvent]);
  
  const resetCircuitBreaker = useCallback((): void => {
    try {
      ExpoHeadphoneDetectionModule.resetCircuitBreaker?.();
      resetError();
      
      addTelemetryEvent({
        type: 'circuit_breaker_reset'
      });
    } catch (err) {
      console.warn('Circuit breaker reset not supported:', err);
    }
  }, [resetError, addTelemetryEvent]);
  
  const getDetectionHistory = useCallback((): HeadphoneInfo[] => {
    return [...detectionHistoryRef.current];
  }, []);
  
  const exportTelemetry = useCallback((): any[] => {
    return [...telemetryRef.current];
  }, []);
  
  // MARK: - Computed Values
  
  const hasHeadphones = useMemo(() => headphoneInfo.isConnected, [headphoneInfo.isConnected]);
  const isWired = useMemo(() => headphoneInfo.deviceType === 'wired', [headphoneInfo.deviceType]);
  const isBluetooth = useMemo(() => headphoneInfo.deviceType === 'bluetooth', [headphoneInfo.deviceType]);
  const isHighConfidence = useMemo(() => (headphoneInfo.confidence || 0) >= HIGH_CONFIDENCE_THRESHOLD, [headphoneInfo.confidence]);
  
  // MARK: - Lifecycle Effects
  
  useEffect(() => {
    isMountedRef.current = true;
    
    const initializeDetection = async () => {
      if (opts.autoStart) {
        await startListening();
      }
    };
    
    initializeDetection();
    
    return () => {
      isMountedRef.current = false;
      
      // Cleanup
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
      
      if (errorSubscriptionRef.current) {
        errorSubscriptionRef.current.remove();
      }
      
      if (metricsSubscriptionRef.current) {
        metricsSubscriptionRef.current.remove();
      }
      
      // Stop listening
      ExpoHeadphoneDetectionModule.stopListening?.().catch(() => {});
    };
  }, [opts.autoStart, startListening]);
  
  // Periodic metrics update
  useEffect(() => {
    if (!opts.enableTelemetry || !isListening) return;
    
    const metricsInterval = setInterval(async () => {
      try {
        const currentMetrics = await ExpoHeadphoneDetectionModule.getDetectionMetrics?.();
        if (currentMetrics && isMountedRef.current) {
          setMetrics(currentMetrics);
        }
      } catch (err) {
        // Metrics update failed - not critical
      }
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(metricsInterval);
  }, [opts.enableTelemetry, isListening]);
  
  // MARK: - Return Hook Interface
  
  return {
    // Core state
    isConnected: headphoneInfo.isConnected,
    deviceType: headphoneInfo.deviceType,
    deviceName: headphoneInfo.deviceName,
    confidence: headphoneInfo.confidence || 0,
    
    // Status flags
    isInitialized,
    isListening,
    isDetecting,
    error,
    
    // Convenience getters
    hasHeadphones,
    isWired,
    isBluetooth,
    isHighConfidence,
    
    // Methods
    startListening,
    stopListening,
    checkHeadphones,
    refreshDetection,
    resetError,
    
    // Advanced features
    metrics,
    getDetectionHistory,
    exportTelemetry,
    resetCircuitBreaker,
    
    // Raw data access
    rawHeadphoneInfo: headphoneInfo,
    lastDetectionTime,
  };
}

// MARK: - Legacy Compatibility Export

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useHeadphoneDetection instead
 */
export const useHeadphoneDetectionLegacy = () => {
  const {
    isConnected,
    deviceType,
    deviceName,
    isInitialized,
    error,
    checkHeadphones,
    hasHeadphones,
    isWired,
    isBluetooth
  } = useHeadphoneDetection();

  return {
    isConnected,
    deviceType,
    deviceName,
    isInitialized,
    error,
    checkHeadphones,
    hasHeadphones,
    isWired,
    isBluetooth,
  };
};

// MARK: - Advanced Hook Variants

/**
 * Simplified hook for basic headphone detection
 */
export const useSimpleHeadphoneDetection = (): {
  hasHeadphones: boolean;
  deviceType: string;
  isLoading: boolean;
} => {
  const { hasHeadphones, deviceType, isDetecting, isInitialized } = useHeadphoneDetection({
    autoStart: true,
    enableTelemetry: false
  });
  
  return {
    hasHeadphones,
    deviceType,
    isLoading: isDetecting || !isInitialized
  };
};

/**
 * Hook optimized for recording scenarios
 */
export const useHeadphoneDetectionForRecording = () => {
  const detection = useHeadphoneDetection({
    autoStart: true,
    debounceMs: 50, // Faster response for recording
    retryAttempts: 5, // More retries for critical use case
    enableTelemetry: true
  });
  
  const [recordingRecommendation, setRecordingRecommendation] = useState<{
    canRecord: boolean;
    warning?: string;
    suggestion?: string;
  }>({ canRecord: true });
  
  useEffect(() => {
    const { hasHeadphones, isHighConfidence, deviceType, error } = detection;
    
    if (error) {
      setRecordingRecommendation({
        canRecord: false,
        warning: 'Unable to detect audio devices',
        suggestion: 'Check device permissions and try again'
      });
    } else if (!hasHeadphones) {
      setRecordingRecommendation({
        canRecord: true,
        warning: 'No headphones detected',
        suggestion: 'Use headphones to avoid audio feedback during recording'
      });
    } else if (!isHighConfidence) {
      setRecordingRecommendation({
        canRecord: true,
        warning: 'Audio device detection uncertain',
        suggestion: `${deviceType} device detected with low confidence`
      });
    } else {
      setRecordingRecommendation({
        canRecord: true
      });
    }
  }, [detection]);
  
  return {
    ...detection,
    recordingRecommendation
  };
};

/**
 * Hook with performance monitoring
 */
export const useHeadphoneDetectionWithMonitoring = () => {
  const detection = useHeadphoneDetection({
    enableTelemetry: true,
    autoStart: true
  });
  
  const [performanceStats, setPerformanceStats] = useState<{
    averageLatency: number;
    successRate: number;
    totalDetections: number;
    errorRate: number;
  }>({
    averageLatency: 0,
    successRate: 100,
    totalDetections: 0,
    errorRate: 0
  });
  
  useEffect(() => {
    const history = detection.getDetectionHistory();
    const telemetry = detection.exportTelemetry();
    
    if (history.length > 0) {
      const latencies = history
        .map(h => h.metadata?.detectionLatency)
        .filter(l => typeof l === 'number') as number[];
      
      const averageLatency = latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : 0;
      
      const successfulDetections = telemetry.filter(t => t.type === 'detection_success').length;
      const failedDetections = telemetry.filter(t => t.type === 'detection_error').length;
      const totalDetections = successfulDetections + failedDetections;
      
      setPerformanceStats({
        averageLatency,
        successRate: totalDetections > 0 ? (successfulDetections / totalDetections) * 100 : 100,
        totalDetections,
        errorRate: totalDetections > 0 ? (failedDetections / totalDetections) * 100 : 0
      });
    }
  }, [detection.lastDetectionTime]);
  
  return {
    ...detection,
    performanceStats
  };
};

// MARK: - Context Provider for App-wide Detection


// MARK: - Context Provider for App-wide Detection

interface HeadphoneDetectionContextValue {
  detection: UseHeadphoneDetectionReturn;
  globalSettings: {
    enableGlobalListening: boolean;
    showWarnings: boolean;
    logTelemetry: boolean;
  };
  updateGlobalSettings: (settings: Partial<HeadphoneDetectionContextValue['globalSettings']>) => void;
}

const HeadphoneDetectionContext = createContext<HeadphoneDetectionContextValue | null>(null);

interface HeadphoneDetectionProviderProps {
  children: ReactNode;
  options?: UseHeadphoneDetectionOptions;
}

export const HeadphoneDetectionProvider: React.FC<HeadphoneDetectionProviderProps> = ({
  children,
  options = {}
}) => {
  const [globalSettings, setGlobalSettings] = useState({
    enableGlobalListening: true,
    showWarnings: true,
    logTelemetry: false
  });
  
  const detection = useHeadphoneDetection({
    autoStart: globalSettings.enableGlobalListening,
    enableTelemetry: globalSettings.logTelemetry,
    ...options
  });
  
  const updateGlobalSettings = useCallback((newSettings: Partial<typeof globalSettings>) => {
    setGlobalSettings(prev => ({ ...prev, ...newSettings }));
  }, []);
  
  const contextValue = useMemo(() => ({
    detection,
    globalSettings,
    updateGlobalSettings
  }), [detection, globalSettings, updateGlobalSettings]);
  
  return (
    <HeadphoneDetectionContext.Provider value={contextValue}>
      {children}
    </HeadphoneDetectionContext.Provider>
  );
};

export const useGlobalHeadphoneDetection = (): HeadphoneDetectionContextValue => {
  const context = useContext(HeadphoneDetectionContext);
  if (!context) {
    throw new Error('useGlobalHeadphoneDetection must be used within HeadphoneDetectionProvider');
  }
  return context;
};

// MARK: - Advanced Hook Features

/**
 * Hook for background audio detection monitoring
 */
export const useBackgroundHeadphoneDetection = () => {
  const detection = useHeadphoneDetection({
    autoStart: true,
    debounceMs: 200, // Slower for background
    enableTelemetry: false,
    retryAttempts: 2
  });
  
  const [backgroundState, setBackgroundState] = useState({
    lastActiveTime: Date.now(),
    backgroundDetectionCount: 0,
    batteryOptimized: true
  });
  
  useEffect(() => {
    if (detection.isListening) {
      setBackgroundState(prev => ({
        ...prev,
        lastActiveTime: Date.now(),
        backgroundDetectionCount: prev.backgroundDetectionCount + 1
      }));
    }
  }, [detection.lastDetectionTime]);
  
  return {
    ...detection,
    backgroundState
  };
};

/**
 * Hook for accessibility-enhanced detection
 */
export const useAccessibleHeadphoneDetection = () => {
  const detection = useHeadphoneDetection({
    autoStart: true,
    enableTelemetry: false
  });
  
  const [accessibilityState, setAccessibilityState] = useState({
    announceChanges: true,
    voiceOverFriendly: true,
    hapticFeedback: false
  });
  
  useEffect(() => {
    if (accessibilityState.announceChanges && detection.isInitialized) {
      // Voice announcements for accessibility
      const message = detection.hasHeadphones
        ? `Headphones connected: ${detection.deviceName}`
        : 'No headphones detected';
      
      console.log('📢 Accessibility announcement:', message);
      // In a real implementation, this would use screen reader APIs
    }
  }, [detection.hasHeadphones, detection.deviceName, accessibilityState.announceChanges, detection.isInitialized]);
  
  return {
    ...detection,
    accessibilityState,
    updateAccessibilitySettings: setAccessibilityState
  };
};

/**
 * Hook for development and debugging
 */
export const useHeadphoneDetectionDebug = () => {
  const detection = useHeadphoneDetection({
    autoStart: true,
    enableTelemetry: true
  });
  
  const [debugInfo, setDebugInfo] = useState<{
    moduleLoaded: boolean;
    platformCapabilities: any;
    lastErrors: string[];
    performanceProfile: any;
  }>({
    moduleLoaded: false,
    platformCapabilities: null,
    lastErrors: [],
    performanceProfile: null
  });
  
  useEffect(() => {
    // Check module status
    try {
      const capabilities = ExpoHeadphoneDetectionModule.getPlatformCapabilities?.();
      setDebugInfo(prev => ({
        ...prev,
        moduleLoaded: true,
        platformCapabilities: capabilities
      }));
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        moduleLoaded: false,
        lastErrors: [...prev.lastErrors, error instanceof Error ? error.message : String(error)].slice(-5)
      }));
    }
  }, []);
  
  useEffect(() => {
    if (detection.error) {
      setDebugInfo(prev => ({
        ...prev,
        lastErrors: [...prev.lastErrors, detection.error!].slice(-5)
      }));
    }
  }, [detection.error]);
  
  const exportDebugReport = useCallback(() => {
    return {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      detection: {
        isConnected: detection.isConnected,
        deviceType: detection.deviceType,
        deviceName: detection.deviceName,
        confidence: detection.confidence,
        error: detection.error
      },
      metrics: detection.metrics,
      history: detection.getDetectionHistory(),
      telemetry: detection.exportTelemetry(),
      debug: debugInfo
    };
  }, [detection, debugInfo]);
  
  return {
    ...detection,
    debugInfo,
    exportDebugReport
  };
};

// MARK: - Testing Utilities

export const createMockHeadphoneDetection = (mockState: Partial<HeadphoneInfo> = {}): UseHeadphoneDetectionReturn => {
  const defaultState: HeadphoneInfo = {
    isConnected: false,
    deviceType: 'none',
    deviceName: '',
    confidence: 0,
    timestamp: Date.now(),
    metadata: {}
  };
  
  const state = { ...defaultState, ...mockState };
  
  return {
    isConnected: state.isConnected,
    deviceType: state.deviceType,
    deviceName: state.deviceName,
    confidence: state.confidence || 0,
    
    isInitialized: true,
    isListening: false,
    isDetecting: false,
    error: null,
    
    hasHeadphones: state.isConnected,
    isWired: state.deviceType === 'wired',
    isBluetooth: state.deviceType === 'bluetooth',
    isHighConfidence: (state.confidence || 0) >= HIGH_CONFIDENCE_THRESHOLD,
    
    startListening: async () => {},
    stopListening: async () => {},
    checkHeadphones: async () => state,
    refreshDetection: async () => {},
    resetError: () => {},
    
    metrics: null,
    getDetectionHistory: () => [state],
    exportTelemetry: () => [],
    resetCircuitBreaker: () => {},
    
    rawHeadphoneInfo: state,
    lastDetectionTime: Date.now(),
  };
};

/**
 * Test utility for simulating headphone events
 */
export const createHeadphoneDetectionTestHelper = () => {
  const eventHandlers = new Map<string, Function[]>();
  
  const simulateHeadphoneEvent = (type: 'connect' | 'disconnect', deviceInfo?: Partial<HeadphoneInfo>) => {
    const event: HeadphoneInfo = {
      isConnected: type === 'connect',
      deviceType: deviceInfo?.deviceType || 'wired',
      deviceName: deviceInfo?.deviceName || 'Test Headphones',
      confidence: deviceInfo?.confidence || 0.95,
      timestamp: Date.now(),
      metadata: {
        ...deviceInfo?.metadata,
        isSimulated: true,
        testEvent: type
      }
    };
    
    const handlers = eventHandlers.get('headphoneStatusChanged') || [];
    handlers.forEach(handler => handler(event));
  };
  
  const simulateError = (error: string) => {
    const handlers = eventHandlers.get('detectionError') || [];
    handlers.forEach(handler => handler({ error, timestamp: Date.now() }));
  };
  
  const addEventHandler = (eventName: string, handler: Function) => {
    if (!eventHandlers.has(eventName)) {
      eventHandlers.set(eventName, []);
    }
    eventHandlers.get(eventName)!.push(handler);
  };
  
  const removeEventHandler = (eventName: string, handler: Function) => {
    const handlers = eventHandlers.get(eventName) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  };
  
  return {
    simulateHeadphoneEvent,
    simulateError,
    addEventHandler,
    removeEventHandler,
    clearAllHandlers: () => eventHandlers.clear()
  };
};

/**
 * Performance testing utilities
 */
export const createPerformanceTestSuite = () => {
  const performanceTests = {
    latencyTest: async (hook: UseHeadphoneDetectionReturn, iterations = 10) => {
      const latencies: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await hook.checkHeadphones();
        const end = performance.now();
        latencies.push(end - start);
      }
      
      return {
        averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        minLatency: Math.min(...latencies),
        maxLatency: Math.max(...latencies),
        latencies
      };
    },
    
    memoryLeakTest: (hook: UseHeadphoneDetectionReturn, duration = 5000) => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      let peakMemory = initialMemory;
      
      const interval = setInterval(() => {
        hook.checkHeadphones();
        const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
        peakMemory = Math.max(peakMemory, currentMemory);
      }, 100);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          clearInterval(interval);
          const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
          resolve({
            initialMemory,
            peakMemory,
            finalMemory,
            memoryIncrease: finalMemory - initialMemory,
            peakIncrease: peakMemory - initialMemory
          });
        }, duration);
      });
    },
    
    accuracyTest: async (hook: UseHeadphoneDetectionReturn, expectedState: HeadphoneInfo) => {
      const result = await hook.checkHeadphones();
      
      if (!result) {
        return { accurate: false, reason: 'No result returned' };
      }
      
      const checks = {
        isConnected: result.isConnected === expectedState.isConnected,
        deviceType: result.deviceType === expectedState.deviceType,
        hasDeviceName: result.deviceName.length > 0 || !expectedState.isConnected,
        hasConfidence: result.confidence !== undefined && result.confidence >= 0
      };
      
      const accurate = Object.values(checks).every(Boolean);
      
      return {
        accurate,
        checks,
        result,
        expected: expectedState
      };
    }
  };
  
  return performanceTests;
};

// MARK: - Utility Functions

/**
 * Create a headphone detection instance with custom configuration
 */
export const createCustomHeadphoneDetection = (config: {
  platform?: 'ios' | 'android' | 'web';
  accuracy?: number;
  latency?: number;
  reliability?: number;
}) => {
  const options: UseHeadphoneDetectionOptions = {
    autoStart: true,
    enableTelemetry: true,
    retryAttempts: config.reliability ? Math.ceil(config.reliability * 5) : 3,
    debounceMs: config.latency ? Math.ceil((1 - config.latency) * 200) : 100,
    cacheTimeout: config.accuracy ? Math.ceil(config.accuracy * 60000) : 30000
  };
  
  return { options, config };
};

/**
 * Validate headphone detection requirements
 */
export const validateHeadphoneDetectionRequirements = () => {
  const requirements = {
    moduleAvailable: false,
    platformSupported: false,
    permissionsGranted: false,
    browserCompatible: false
  };
  
  try {
    // Check if module is available
    requirements.moduleAvailable = !!ExpoHeadphoneDetectionModule;
    
    // Check platform support
    requirements.platformSupported = ['ios', 'android', 'web'].includes(Platform.OS);
    
    // Check browser compatibility (for web)
    if (Platform.OS === 'web') {
      requirements.browserCompatible = !!(
        navigator.mediaDevices &&
        navigator.mediaDevices.enumerateDevices &&
        typeof navigator.mediaDevices.enumerateDevices === 'function'
      );
    } else {
      requirements.browserCompatible = true; // N/A for native platforms
    }
    
    // Note: Permission check would be async and platform-specific
    requirements.permissionsGranted = true; // Placeholder
    
  } catch (error) {
    console.error('Error validating requirements:', error);
  }
  
  const allRequirementsMet = Object.values(requirements).every(Boolean);
  
  return {
    requirements,
    allRequirementsMet,
    missingRequirements: Object.entries(requirements)
      .filter(([_, met]) => !met)
      .map(([req]) => req)
  };
};

/**
 * Get recommended configuration for different use cases
 */
export const getRecommendedConfiguration = (useCase: 'recording' | 'gaming' | 'general' | 'accessibility') => {
  const configurations = {
    recording: {
      autoStart: true,
      debounceMs: 50,
      retryAttempts: 5,
      enableTelemetry: true,
      cacheTimeout: 15000,
      fallbackTimeout: 3000
    },
    gaming: {
      autoStart: true,
      debounceMs: 25,
      retryAttempts: 3,
      enableTelemetry: false,
      cacheTimeout: 10000,
      fallbackTimeout: 2000
    },
    general: {
      autoStart: true,
      debounceMs: 100,
      retryAttempts: 3,
      enableTelemetry: false,
      cacheTimeout: 30000,
      fallbackTimeout: 5000
    },
    accessibility: {
      autoStart: true,
      debounceMs: 200,
      retryAttempts: 2,
      enableTelemetry: false,
      cacheTimeout: 60000,
      fallbackTimeout: 10000
    }
  };
  
  return configurations[useCase] || configurations.general;
};

// MARK: - Migration Helpers

/**
 * Helper to migrate from old headphone detection implementations
 */
export const createMigrationHelper = (legacyHook: any) => {
  console.warn('🔄 Migrating from legacy headphone detection. Consider updating to the new API.');
  
  const migrated = useHeadphoneDetection({
    autoStart: true,
    enableTelemetry: false
  });
  
  // Provide legacy-compatible interface
  return {
    // New interface (recommended)
    ...migrated,
    
    // Legacy interface (deprecated)
    isConnected: migrated.isConnected,
    deviceType: migrated.deviceType,
    deviceName: migrated.deviceName,
    isInitialized: migrated.isInitialized,
    error: migrated.error,
    checkHeadphones: migrated.checkHeadphones,
    hasHeadphones: migrated.hasHeadphones,
    isWired: migrated.isWired,
    isBluetooth: migrated.isBluetooth,
    
    // Migration utilities
    _isMigrated: true,
    _legacyWarning: () => console.warn('This is a legacy API. Please migrate to the new useHeadphoneDetection API.')
  };
};

// MARK: - Type Exports

export type {
  HeadphoneInfo,
  DetectionMetrics,
  UseHeadphoneDetectionOptions,
  UseHeadphoneDetectionReturn
};

// MARK: - Default Export

export default useHeadphoneDetection;