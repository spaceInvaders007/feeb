export interface HeadphoneInfo {
  isConnected: boolean;
  deviceType: 'wired' | 'bluetooth' | 'none';
  deviceName: string;
}

export interface HeadphoneListener {
  remove(): void;
}

// Create a functional headphone detection manager
const createHeadphoneDetectionManager = () => {
  let listeners: ((info: HeadphoneInfo) => void)[] = [];
  
  const getCurrentStatus = async (): Promise<HeadphoneInfo> => {
    // Web implementation for now
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        
        const headphoneKeywords = ['headphone', 'bluetooth', 'airpods', 'beats', 'wireless'];
        
        const connectedDevice = audioOutputs.find(device => {
          const label = device.label.toLowerCase();
          return headphoneKeywords.some(keyword => label.includes(keyword)) ||
                 (device.deviceId !== 'default' && device.deviceId !== 'communications' && label);
        });
        
        const hasHeadphones = !!connectedDevice;
        
        const deviceType = connectedDevice?.label.toLowerCase().includes('bluetooth') || 
                          connectedDevice?.label.toLowerCase().includes('wireless') || 
                          connectedDevice?.label.toLowerCase().includes('airpods') ? 'bluetooth' : 
                          hasHeadphones ? 'wired' : 'none';
        
        return {
          isConnected: hasHeadphones,
          deviceType: deviceType as 'wired' | 'bluetooth' | 'none',
          deviceName: connectedDevice?.label || ''
        };
      } catch (error) {
        console.log('Headphone detection error:', error);
      }
    }
    
    return {
      isConnected: false,
      deviceType: 'none',
      deviceName: ''
    };
  };

  const addListener = (eventName: string, listener: (info: HeadphoneInfo) => void): HeadphoneListener => {
    listeners.push(listener);
    return {
      remove: () => {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  };

  const removeAllListeners = (): void => {
    listeners = [];
  };

  const handleDeviceChange = async () => {
    const status = await getCurrentStatus();
    listeners.forEach(listener => listener(status));
  };

  const startListening = (): void => {
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }
  };

  const stopListening = (): void => {
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    }
  };

  return {
    getCurrentStatus,
    addListener,
    removeAllListeners,
    startListening,
    stopListening
  };
};

// Export the singleton instance
export default createHeadphoneDetectionManager();