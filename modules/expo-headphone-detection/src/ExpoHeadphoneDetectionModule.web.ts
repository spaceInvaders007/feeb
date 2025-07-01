// 3. Fixed modules/expo-headphone-detection/src/ExpoHeadphoneDetectionModule.web.ts
import { EventEmitter } from 'expo-modules-core';

interface HeadphoneInfo {
  isConnected: boolean;
  deviceType: 'wired' | 'bluetooth' | 'none';
  deviceName: string;
}

class ExpoHeadphoneDetectionModuleWeb extends EventEmitter {
  private deviceChangeHandler: (() => Promise<void>) | null = null;

  async getCurrentStatus(): Promise<HeadphoneInfo> {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        return { isConnected: false, deviceType: 'none', deviceName: '' };
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      console.log('🔊 Available audio devices:', audioOutputs);

      // Common headphone brands and keywords  
      const headphoneKeywords = [
        'headphone', 'headset', 'bluetooth', 'wireless',
        'airpods', 'beats', 'sony', 'bose', 'sennheiser',
        'audio-technica', 'skull', 'jbl', 'plantronics'
      ];

      let connectedDevice = null;
      let deviceType: 'wired' | 'bluetooth' | 'none' = 'none';

      for (const device of audioOutputs) {
        const label = device.label.toLowerCase();
        
        // Check for headphone keywords
        const hasKeyword = headphoneKeywords.some(keyword => 
          label.includes(keyword)
        );
        
        // Check if it's not the default speaker
        const isNotDefault = device.deviceId !== 'default' && 
                           device.deviceId !== 'communications' &&
                           label && label !== '';
        
        if (hasKeyword || isNotDefault) {
          connectedDevice = device;
          
          // Determine device type
          if (label.includes('bluetooth') || label.includes('wireless') || 
              label.includes('airpods') || label.includes('beats')) {
            deviceType = 'bluetooth';
          } else {
            deviceType = 'wired';
          }
          break;
        }
      }

      const result: HeadphoneInfo = {
        isConnected: !!connectedDevice,
        deviceType: deviceType,
        deviceName: connectedDevice?.label || ''
      };

      console.log('🎧 Headphone detection result:', result);
      return result;
    } catch (error) {
      console.error('❌ Web headphone detection error:', error);
      return { isConnected: false, deviceType: 'none', deviceName: '' };
    }
  }

  startListening(): void {
    if (navigator.mediaDevices?.addEventListener && !this.deviceChangeHandler) {
      this.deviceChangeHandler = async () => {
        const status = await this.getCurrentStatus();
        this.emit('headphoneStatusChanged', status);
      };
      navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
    }
  }

  stopListening(): void {
    if (navigator.mediaDevices?.removeEventListener && this.deviceChangeHandler) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
      this.deviceChangeHandler = null;
    }
  }
}

export default new ExpoHeadphoneDetectionModuleWeb();
