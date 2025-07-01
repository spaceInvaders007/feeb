import { useState, useEffect, useCallback, useRef } from 'react';

interface HeadphoneInfo {
  isConnected: boolean;
  deviceType: 'wired' | 'bluetooth' | 'none';
  deviceName: string;
}

export const useHeadphoneDetection = () => {
  const [headphoneInfo, setHeadphoneInfo] = useState<HeadphoneInfo>({
    isConnected: false,
    deviceType: 'none',
    deviceName: ''
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to track subscription to prevent memory leaks
  const subscriptionRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  const checkHeadphones = useCallback(async () => {
    try {
      const status = await HeadphoneDetection.getCurrentStatus();
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setHeadphoneInfo(status);
        setError(null);
      }
      
      console.log('🎧 Headphone status:', status);
      return status;
    } catch (err: any) {
      console.error('❌ Headphone detection error:', err);
      
      if (isMountedRef.current) {
        setError(err.message || 'Failed to detect headphones');
      }
      return null;
    }
  }, []);

  // Initialize detection on mount
  useEffect(() => {
    isMountedRef.current = true;

    const initializeDetection = async () => {
      try {
        // Get initial status
        await checkHeadphones();
        
        // Set up real-time listener
        subscriptionRef.current = HeadphoneDetection.addListener(
          'headphoneStatusChanged', 
          (info: HeadphoneInfo) => {
            console.log('🔄 Headphone status changed:', info);
            if (isMountedRef.current) {
              setHeadphoneInfo(info);
            }
          }
        );
        
        // Start listening for device changes
        HeadphoneDetection.startListening();
        
        if (isMountedRef.current) {
          setIsInitialized(true);
        }
      } catch (err: any) {
        console.error('❌ Failed to initialize headphone detection:', err);
        if (isMountedRef.current) {
          setError(err.message || 'Initialization failed');
        }
      }
    };

    initializeDetection();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      
      HeadphoneDetection.stopListening();
    };
  }, [checkHeadphones]);

  // Return hook interface
  return {
    // Individual properties
    isConnected: headphoneInfo.isConnected,
    deviceType: headphoneInfo.deviceType,
    deviceName: headphoneInfo.deviceName,
    
    // Status properties
    isInitialized,
    error,
    
    // Methods
    checkHeadphones,
    
    // Convenience getters
    hasHeadphones: headphoneInfo.isConnected,
    isWired: headphoneInfo.deviceType === 'wired',
    isBluetooth: headphoneInfo.deviceType === 'bluetooth',
  };
};