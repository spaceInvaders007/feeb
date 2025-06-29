import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface Feeb {
  id: string;
  uri: string; // Local file path or persistent data URL for web
  originalVideoUri: string; // The video they reacted to
  createdAt: string;
  thumbnail?: string; // Optional thumbnail
  isWebBlob?: boolean; // Flag to indicate if it's a web blob (now converted to data URL)
}

const FEEBS_STORAGE_KEY = 'user_feebs';
const WEB_VIDEO_STORAGE_KEY = 'web_video_data_';

export class FeebStorage {
  // Get all user's feebs
  static async getAllFeebs(): Promise<Feeb[]> {
    try {
      const feebsJson = await AsyncStorage.getItem(FEEBS_STORAGE_KEY);
      const feebs = feebsJson ? JSON.parse(feebsJson) : [];
      
      // Clean up any old blob URLs automatically
      if (Platform.OS === 'web') {
        const cleanedFeebs = feebs.filter((feeb: Feeb) => {
          if (feeb.isWebBlob && feeb.uri.startsWith('blob:')) {
            console.log('🧹 Automatically removing feeb with expired blob URL:', feeb.id);
            return false;
          }
          return true;
        });
        
        // If we removed any feebs, save the cleaned list
        if (cleanedFeebs.length !== feebs.length) {
          await AsyncStorage.setItem(FEEBS_STORAGE_KEY, JSON.stringify(cleanedFeebs));
          console.log(`🧹 Cleaned up ${feebs.length - cleanedFeebs.length} feebs with expired blob URLs`);
        }
        
        return cleanedFeebs;
      }
      
      return feebs;
    } catch (error) {
      console.error('Error loading feebs:', error);
      return [];
    }
  }

  // Save a new feeb
  static async saveFeeb(feeb: Feeb): Promise<void> {
    try {
      const existingFeebs = await this.getAllFeebs();
      const updatedFeebs = [feeb, ...existingFeebs]; // Add new feeb at the beginning
      await AsyncStorage.setItem(FEEBS_STORAGE_KEY, JSON.stringify(updatedFeebs));
      console.log('✅ Feeb saved successfully:', feeb.id);
    } catch (error) {
      console.error('Error saving feeb:', error);
      throw error;
    }
  }

  // Web-specific: Save video blob to persistent storage
  static async saveWebVideoBlob(blob: Blob): Promise<string> {
    try {
      console.log('🌐 Converting blob to persistent storage...');
      console.log('📊 Blob info:', { size: blob.size, type: blob.type });
      
      // Convert blob to data URL for persistence
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          console.log('📖 FileReader completed');
          resolve(reader.result as string);
        };
        reader.onerror = (error) => {
          console.error('❌ FileReader error:', error);
          reject(error);
        };
        reader.readAsDataURL(blob);
        console.log('📖 Starting FileReader...');
      });

      console.log('✅ Data URL created, length:', dataUrl.length);

      // Generate unique ID for this video
      const videoId = `feeb_video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆔 Generated video ID:', videoId);
      
      // Store the data URL in AsyncStorage with a unique key
      const storageKey = WEB_VIDEO_STORAGE_KEY + videoId;
      console.log('💾 Storing with key:', storageKey);
      
      // For large data URLs, we might need to chunk them
      const chunkSize = 1000000; // 1MB chunks
      if (dataUrl.length > chunkSize) {
        console.log('📦 Large data URL detected, chunking...');
        const chunks = [];
        for (let i = 0; i < dataUrl.length; i += chunkSize) {
          chunks.push(dataUrl.substring(i, i + chunkSize));
        }
        
        // Store chunk count first
        await AsyncStorage.setItem(`${storageKey}_chunks`, chunks.length.toString());
        
        // Store each chunk
        for (let i = 0; i < chunks.length; i++) {
          await AsyncStorage.setItem(`${storageKey}_chunk_${i}`, chunks[i]);
        }
        
        console.log(`💾 Stored ${chunks.length} chunks for video:`, videoId);
      } else {
        await AsyncStorage.setItem(storageKey, dataUrl);
        console.log('💾 Stored single data URL for video:', videoId);
      }
      
      console.log('💾 Web video saved to persistent storage:', videoId);
      console.log('📊 Data URL size:', Math.round(dataUrl.length / 1024), 'KB');
      
      // Return the video ID as the persistent URI
      return videoId;
    } catch (error) {
      console.error('❌ Error saving web video blob:', error);
      throw error;
    }
  }

  // Web-specific: Retrieve video data URL from storage
  static async getWebVideoDataUrl(videoId: string): Promise<string | null> {
    try {
      const storageKey = WEB_VIDEO_STORAGE_KEY + videoId;
      
      // Check if it's chunked
      const chunkCountStr = await AsyncStorage.getItem(`${storageKey}_chunks`);
      
      if (chunkCountStr) {
        // Reassemble from chunks
        const chunkCount = parseInt(chunkCountStr, 10);
        console.log(`📦 Reassembling ${chunkCount} chunks for video:`, videoId);
        
        const chunks = [];
        for (let i = 0; i < chunkCount; i++) {
          const chunk = await AsyncStorage.getItem(`${storageKey}_chunk_${i}`);
          if (chunk) {
            chunks.push(chunk);
          } else {
            console.error(`❌ Missing chunk ${i} for video:`, videoId);
            return null;
          }
        }
        
        const dataUrl = chunks.join('');
        console.log('✅ Retrieved chunked web video data URL for:', videoId);
        return dataUrl;
      } else {
        // Single data URL
        const dataUrl = await AsyncStorage.getItem(storageKey);
        if (dataUrl) {
          console.log('✅ Retrieved web video data URL for:', videoId);
          return dataUrl;
        } else {
          console.log('❌ No data URL found for video ID:', videoId);
          return null;
        }
      }
    } catch (error) {
      console.error('❌ Error retrieving web video:', error);
      return null;
    }
  }

  // Save recorded video to permanent location (platform-specific)
  static async saveVideoToPermanentLocation(tempUri: string): Promise<string> {
    if (Platform.OS === 'web') {
      // On web, this shouldn't be called anymore - use saveWebVideoBlob instead
      console.warn('⚠️ saveVideoToPermanentLocation called on web - use saveWebVideoBlob instead');
      return tempUri;
    }

    try {
      const fileName = `feeb_${Date.now()}.mp4`;
      const permanentUri = `${FileSystem.documentDirectory}feebs/${fileName}`;
      
      // Create feebs directory if it doesn't exist
      const feebsDir = `${FileSystem.documentDirectory}feebs/`;
      const dirInfo = await FileSystem.getInfoAsync(feebsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(feebsDir, { intermediates: true });
      }

      // Copy the temporary file to permanent location
      await FileSystem.copyAsync({
        from: tempUri,
        to: permanentUri,
      });

      console.log('📁 Video saved to permanent location:', permanentUri);
      return permanentUri;
    } catch (error) {
      console.error('Error saving video permanently:', error);
      throw error;
    }
  }

  // Create a new feeb record
  static createFeeb(videoUri: string, originalVideoUri: string): Feeb {
    return {
      id: `feeb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uri: videoUri,
      originalVideoUri,
      createdAt: new Date().toISOString(),
      isWebBlob: Platform.OS === 'web',
    };
  }

  // Delete a feeb (platform-specific cleanup)
  static async deleteFeeb(feebId: string): Promise<void> {
    try {
      const feebs = await this.getAllFeebs();
      const feebToDelete = feebs.find(feeb => feeb.id === feebId);
      
      if (feebToDelete) {
        // Clean up the video file/data
        if (Platform.OS === 'web') {
          // Remove from AsyncStorage if it's a web video ID
          if (feebToDelete.isWebBlob && !feebToDelete.uri.startsWith('data:') && !feebToDelete.uri.startsWith('blob:')) {
            const storageKey = WEB_VIDEO_STORAGE_KEY + feebToDelete.uri;
            
            // Check if it's chunked and clean up all chunks
            const chunkCountStr = await AsyncStorage.getItem(`${storageKey}_chunks`);
            if (chunkCountStr) {
              const chunkCount = parseInt(chunkCountStr, 10);
              console.log(`🗑️ Cleaning up ${chunkCount} chunks for video:`, feebToDelete.uri);
              
              // Remove chunk count
              await AsyncStorage.removeItem(`${storageKey}_chunks`);
              
              // Remove all chunks
              for (let i = 0; i < chunkCount; i++) {
                await AsyncStorage.removeItem(`${storageKey}_chunk_${i}`);
              }
            } else {
              // Remove single data URL
              await AsyncStorage.removeItem(storageKey);
            }
            
            console.log('🗑️ Web: Deleted video data for ID:', feebToDelete.uri);
          }
          // If it was an old blob URL, just log (already invalid anyway)
          if (feebToDelete.uri.startsWith('blob:')) {
            console.log('🗑️ Web: Old blob URL will be garbage collected');
          }
        } else {
          // Delete the actual file on mobile
          await FileSystem.deleteAsync(feebToDelete.uri, { idempotent: true });
          console.log('🗑️ Mobile: Deleted video file');
        }
      }

      // Remove from feebs list
      const updatedFeebs = feebs.filter(feeb => feeb.id !== feebId);
      await AsyncStorage.setItem(FEEBS_STORAGE_KEY, JSON.stringify(updatedFeebs));
      
    } catch (error) {
      console.error('Error deleting feeb:', error);
      throw error;
    }
  }

  // Helper: Check if a URI is a web video ID
  static isWebVideoId(uri: string): boolean {
    return Platform.OS === 'web' && !uri.startsWith('data:') && !uri.startsWith('blob:') && !uri.startsWith('http');
  }

  // Helper: Get display URI for a feeb (handles web video IDs)
  static async getFeebDisplayUri(feeb: Feeb): Promise<string> {
    if (Platform.OS === 'web' && feeb.isWebBlob) {
      // If it's an old blob URL, it's no longer valid
      if (feeb.uri.startsWith('blob:')) {
        console.log('⚠️ Old blob URL detected, cannot retrieve data:', feeb.uri);
        return ''; // Return empty string to trigger error state
      }
      
      // If it's already a data URL, return as-is
      if (feeb.uri.startsWith('data:')) {
        console.log('✅ Data URL found, returning directly');
        return feeb.uri;
      }
      
      // If it's a web video ID, retrieve the data URL
      if (this.isWebVideoId(feeb.uri)) {
        console.log('🔍 Retrieving data URL for video ID:', feeb.uri);
        const dataUrl = await this.getWebVideoDataUrl(feeb.uri);
        if (dataUrl) {
          console.log('✅ Data URL retrieved successfully');
          return dataUrl;
        } else {
          console.log('❌ Failed to retrieve data URL for video ID:', feeb.uri);
          return ''; // Return empty string to trigger error state
        }
      }
    }
    
    // For mobile or direct URIs, return as-is
    return feeb.uri;
  }

  // Utility: Clear all invalid web videos (for debugging/cleanup)
  static async clearInvalidWebVideos(): Promise<number> {
    if (Platform.OS !== 'web') {
      return 0;
    }

    try {
      const feebs = await AsyncStorage.getItem(FEEBS_STORAGE_KEY);
      const feebList: Feeb[] = feebs ? JSON.parse(feebs) : [];
      
      let deletedCount = 0;
      const validFeebs = [];
      
      for (const feeb of feebList) {
        if (feeb.isWebBlob && feeb.uri.startsWith('blob:')) {
          console.log('🧹 Removing invalid blob URL feeb:', feeb.id);
          deletedCount++;
        } else {
          validFeebs.push(feeb);
        }
      }
      
      if (deletedCount > 0) {
        await AsyncStorage.setItem(FEEBS_STORAGE_KEY, JSON.stringify(validFeebs));
        console.log(`🧹 Cleared ${deletedCount} invalid web videos`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error clearing invalid web videos:', error);
      return 0;
    }
  }
}