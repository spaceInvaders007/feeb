import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { VideoView, useVideoPlayer } from 'expo-video';
import { CameraView, useCameraPermissions } from "expo-camera";
import type { CameraRecordingOptions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { FeebStorage } from "../utils/FeebStorage";
import WebCamera from "../components/WebCamera";
import * as FileSystem from 'expo-file-system';

const { width: screenWidth } = Dimensions.get("screen");

// Debug logger utility
class DebugLogger {
  static log(category: string, message: string, data?: any) {
    const timestamp = new Date().toISOString().substr(11, 12);
    console.log(`[${timestamp}] 🔍 [${category}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  static error(category: string, message: string, error?: any) {
    const timestamp = new Date().toISOString().substr(11, 12);
    console.error(`[${timestamp}] ❌ [${category}] ${message}`, error);
  }
}

export default function RecordReactionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const cameraRef = useRef<CameraView>(null);

  // States
  const [permission, requestPermission] = useCameraPermissions();
  const [videoReady, setVideoReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasStartedFlow, setHasStartedFlow] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Recording refs
  const isActivelyRecordingRef = useRef(false);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const webRecordingBlobRef = useRef<Blob | null>(null);
  const recordingRef = useRef<Promise<any> | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  const videoUri = route.params?.videoUri ?? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
    player.muted = false;
  });

  // Enhanced debug logging
  useEffect(() => {
    DebugLogger.log('COMPONENT', 'Render state', {
      videoReady,
      cameraReady,
      isRecording,
      hasStartedFlow,
      isSaving,
      platform: Platform.OS
    });
  });

  // Hide header and setup permissions
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    
    if (Platform.OS !== 'web') {
      if (!permission) {
        DebugLogger.log('PERMISSIONS', 'Permission object is null');
      } else if (!permission.granted) {
        DebugLogger.log('PERMISSIONS', 'Camera permission not granted, requesting...');
        requestPermission();
      } else {
        DebugLogger.log('PERMISSIONS', 'Camera permission granted');
        setCameraReady(true);
      }
    } else {
      DebugLogger.log('PERMISSIONS', 'Web platform, skipping camera permissions');
    }
  }, [permission, navigation]);

  // Video ready listener
  useEffect(() => {
    const subscription = player.addListener('statusChange', (status) => {
      DebugLogger.log('VIDEO', 'Status change', status);
      
      if (status.status === 'readyToPlay' && !videoReady) {
        DebugLogger.log('VIDEO', 'Video ready', {
          duration: player.duration,
          currentTime: player.currentTime
        });
        setVideoReady(true);
      }
    });

    return () => subscription?.remove();
  }, [player, videoReady]);

  // Start countdown when both are ready
  useEffect(() => {
    const isReady = videoReady && cameraReady;
    const shouldStart = isReady && !hasStartedFlow && !isRecording && !isSaving;

    DebugLogger.log('FLOW', 'Flow check', {
      isReady,
      shouldStart,
      videoReady,
      cameraReady,
      hasStartedFlow,
      isRecording,
      isSaving
    });

    if (shouldStart) {
      DebugLogger.log('FLOW', 'Starting countdown');
      setHasStartedFlow(true);
      setCountdown(2);
    }
  }, [videoReady, cameraReady, hasStartedFlow, isRecording, isSaving]);

  // Countdown timer
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      DebugLogger.log('COUNTDOWN', `Countdown: ${countdown}`);
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      DebugLogger.log('COUNTDOWN', 'Countdown finished, starting recording');
      setCountdown(null);
      startRecording();
    }
  }, [countdown]);

  // Validate recording file
  const validateRecordingFile = async (uri: string): Promise<boolean> => {
    try {
      DebugLogger.log('VALIDATION', 'Validating recording file', { uri });
      
      const fileInfo = await FileSystem.getInfoAsync(uri);
      DebugLogger.log('VALIDATION', 'File info', fileInfo);
      
      if (!fileInfo.exists) {
        DebugLogger.error('VALIDATION', 'File does not exist');
        return false;
      }

      if (fileInfo.size === 0) {
        DebugLogger.error('VALIDATION', 'File is empty');
        return false;
      }

      // Check file extension
      const extension = uri.split('.').pop()?.toLowerCase() || '';
      const isVideo = ['mp4', 'mov', 'm4v', 'avi'].includes(extension);
      const isPhoto = ['jpg', 'jpeg', 'png', 'gif'].includes(extension);

      DebugLogger.log('VALIDATION', 'File type analysis', {
        extension,
        isVideo,
        isPhoto,
        size: fileInfo.size
      });

      if (isPhoto) {
        DebugLogger.error('VALIDATION', '🚨 CRITICAL: Camera recorded a PHOTO instead of VIDEO!');
        Alert.alert('❌ Recording Issue', 'Camera captured a photo instead of video!');
        return false;
      }

      if (!isVideo) {
        DebugLogger.error('VALIDATION', 'Unknown file type');
        return false;
      }

      DebugLogger.log('VALIDATION', '✅ Video file validation passed');
      return true;

    } catch (error) {
      DebugLogger.error('VALIDATION', 'File validation error', error);
      return false;
    }
  };

  // Start recording - ENHANCED DEBUG VERSION
  const startRecording = useCallback(async () => {
    DebugLogger.log('RECORDING', 'START RECORDING CALLED');

    if (isActivelyRecordingRef.current) {
      DebugLogger.log('RECORDING', 'Already recording, aborting');
      return;
    }

    try {
      isActivelyRecordingRef.current = true;
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      
      DebugLogger.log('RECORDING', 'Recording state set, starting video playback');
      
      // Start video playback
      player.currentTime = 0;
      player.play();
      
      DebugLogger.log('RECORDING', 'Video playback started');

      // Start camera recording based on platform
      if (Platform.OS === 'web') {
        DebugLogger.log('RECORDING', 'Web platform - WebCamera should handle recording');
      } else {
        DebugLogger.log('RECORDING', 'Mobile platform - starting camera recording');
        
        if (!cameraRef.current) {
          throw new Error('Camera ref is null');
        }

        // Enhanced recording options
        const recordingOptions: CameraRecordingOptions = {
          maxDuration: 60, // Longer duration for testing
        };

        DebugLogger.log('RECORDING', 'Calling recordAsync with options', recordingOptions);
        
        // Start recording
        const recordingPromise = cameraRef.current.recordAsync(recordingOptions);
        recordingRef.current = recordingPromise;
        
        DebugLogger.log('RECORDING', 'recordAsync called, promise created');
        
        // Set up promise handlers for debugging
        recordingPromise
          .then((result) => {
            DebugLogger.log('RECORDING', 'Recording promise resolved', result);
          })
          .catch((error) => {
            DebugLogger.error('RECORDING', 'Recording promise rejected', error);
          });
      }

      // Set stop timeout
      const duration = player.duration;
      const timeoutMs = duration > 0 ? Math.ceil(duration * 1000) + 2000 : 15000; // Extra time for debugging
      
      DebugLogger.log('RECORDING', 'Setting stop timeout', {
        videoDuration: duration,
        timeoutMs
      });
      
      stopTimeoutRef.current = setTimeout(() => {
        DebugLogger.log('RECORDING', 'Timeout fired - calling stopRecording');
        stopRecording();
      }, timeoutMs);

    } catch (error: any) {
      DebugLogger.error('RECORDING', 'Failed to start recording', error);
      isActivelyRecordingRef.current = false;
      setIsRecording(false);
      Alert.alert('Recording Error', `Failed to start recording: ${error?.message || 'Unknown error'}`);
    }
  }, [player]);

  // Stop recording - ENHANCED DEBUG VERSION
  const stopRecording = useCallback(async () => {
    DebugLogger.log('RECORDING', 'STOP RECORDING CALLED');

    if (!isActivelyRecordingRef.current) {
      DebugLogger.log('RECORDING', 'Not actively recording, aborting stop');
      return;
    }

    const recordingDuration = recordingStartTimeRef.current ? 
      Date.now() - recordingStartTimeRef.current : 0;

    DebugLogger.log('RECORDING', 'Stopping recording', {
      recordingDuration: `${recordingDuration}ms`
    });

    try {
      isActivelyRecordingRef.current = false;
      setIsRecording(false);
      setIsSaving(true);

      // Clear timeout
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }

      // Stop and save recording based on platform
      if (Platform.OS === 'web') {
        DebugLogger.log('RECORDING', 'Web platform - handling web recording');
        
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!webRecordingBlobRef.current && attempts < maxAttempts) {
          DebugLogger.log('RECORDING', `Waiting for web blob, attempt ${attempts + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (webRecordingBlobRef.current) {
          DebugLogger.log('RECORDING', 'Web blob available', {
            size: webRecordingBlobRef.current.size,
            type: webRecordingBlobRef.current.type
          });
          await saveWebRecording(webRecordingBlobRef.current);
        } else {
          DebugLogger.error('RECORDING', 'No web blob available after waiting');
          Alert.alert("Error", "No recording available");
        }
      } else {
        DebugLogger.log('RECORDING', 'Mobile platform - stopping camera recording');
        
        // Stop the camera recording
        if (cameraRef.current) {
          DebugLogger.log('RECORDING', 'Calling stopRecording on camera');
          cameraRef.current.stopRecording();
        }
        
        // Wait for recording to complete
        if (recordingRef.current) {
          DebugLogger.log('RECORDING', 'Waiting for recording promise to resolve');
          
          try {
            const recording = await recordingRef.current;
            DebugLogger.log('RECORDING', 'Recording promise resolved', {
              recording,
              uri: recording?.uri,
              type: typeof recording
            });
            
            if (recording && recording.uri) {
              // Validate the recording file
              const isValid = await validateRecordingFile(recording.uri);
              
              if (isValid) {
                await saveMobileRecording(recording);
              } else {
                Alert.alert("Recording Issue", "The recorded file appears to be invalid or is a photo instead of video.");
              }
            } else {
              DebugLogger.error('RECORDING', 'Invalid recording result');
              Alert.alert("Error", "Recording failed - no video file created");
            }
          } catch (recordingError: any) {
            DebugLogger.error('RECORDING', 'Error waiting for recording', recordingError);
            Alert.alert("Error", `Recording failed: ${recordingError?.message || 'Unknown error'}`);
          }
        } else {
          DebugLogger.error('RECORDING', 'No recording promise available');
          Alert.alert("Error", "No recording was started");
        }
      }

    } catch (error: any) {
      DebugLogger.error('RECORDING', 'Error stopping recording', error);
      Alert.alert('Error', `Failed to save recording: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
      webRecordingBlobRef.current = null;
      recordingRef.current = null;
      recordingStartTimeRef.current = null;
      
      setTimeout(() => {
        navigation.goBack();
      }, 2000); // Longer delay for debugging
    }
  }, [navigation]);

  // Manual stop for testing
  const manualStop = useCallback(() => {
    DebugLogger.log('RECORDING', 'Manual stop pressed');
    stopRecording();
  }, [stopRecording]);

  // Camera ready handler
  const handleCameraReady = useCallback(() => {
    DebugLogger.log('CAMERA', 'Camera ready callback fired');
    setCameraReady(true);
  }, []);

  // Web recording complete handler
  const handleWebRecordingComplete = useCallback((videoBlob: Blob) => {
    DebugLogger.log('WEB_RECORDING', 'Web recording completed', {
      size: videoBlob.size,
      type: videoBlob.type
    });
    webRecordingBlobRef.current = videoBlob;
  }, []);

  // Save web recording
  const saveWebRecording = useCallback(async (blob: Blob) => {
    try {
      DebugLogger.log('SAVE', 'Saving web recording', {
        size: blob.size,
        type: blob.type
      });
      
      const permanentUri = await FeebStorage.saveWebVideoBlob(blob);
      const newFeeb = FeebStorage.createFeeb(permanentUri, videoUri);
      await FeebStorage.saveFeeb(newFeeb);
      
      DebugLogger.log('SAVE', 'Web recording saved successfully', { permanentUri });
      Alert.alert("Success!", "Your reaction has been saved!");
      
    } catch (error: any) {
      DebugLogger.error('SAVE', 'Error saving web recording', error);
      throw error;
    }
  }, [videoUri]);

  // Save mobile recording
  const saveMobileRecording = useCallback(async (recording: any) => {
    try {
      DebugLogger.log('SAVE', 'Saving mobile recording', {
        uri: recording.uri,
        recording
      });
      
      const permanentUri = await FeebStorage.saveVideoToPermanentLocation(recording.uri);
      const newFeeb = FeebStorage.createFeeb(permanentUri, videoUri);
      await FeebStorage.saveFeeb(newFeeb);
      
      DebugLogger.log('SAVE', 'Mobile recording saved successfully', { permanentUri });
      Alert.alert("Success!", "Your reaction has been saved!");
      
    } catch (error: any) {
      DebugLogger.error('SAVE', 'Error saving mobile recording', error);
      throw error;
    }
  }, [videoUri]);

  // Permission check
  if (Platform.OS !== 'web' && !permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera" size={48} color="#666" />
        <Text style={styles.permissionText}>Camera permission required</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAllReady = videoReady && cameraReady;

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={isRecording || isSaving}
      >
        <View style={[styles.backButtonCircle, (isRecording || isSaving) && styles.disabledButton]}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.redDot} />
          <Text style={styles.recordingText}>REC</Text>
          <TouchableOpacity style={styles.manualStopButton} onPress={manualStop}>
            <Ionicons name="stop" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Video */}
      <View style={styles.half}>
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          showsTimecodes={false}
        />
      </View>

      {/* Camera */}
      <View style={styles.half}>
        {Platform.OS === 'web' ? (
          <WebCamera
            isRecording={isRecording}
            onCameraReady={handleCameraReady}
            onRecordingComplete={handleWebRecordingComplete}
          />
        ) : (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing="front"
            mode="video"
            videoQuality="720p"
            onCameraReady={handleCameraReady}
          />
        )}
      </View>

      {/* Loading */}
      {!isAllReady && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#00CFFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Countdown */}
      {countdown !== null && (
        <View style={styles.overlay}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}

      {/* Saving */}
      {isSaving && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#00CFFF" />
          <Text style={styles.loadingText}>Saving your feeb...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  half: { flex: 1, overflow: "hidden", backgroundColor: "#000" },
  video: { flex: 1, width: screenWidth, backgroundColor: "#000" },
  backButton: { position: "absolute", top: 50, left: 20, zIndex: 1000 },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: { opacity: 0.5 },

  recordingIndicator: { 
    position: "absolute", 
    top: 50, 
    right: 20, 
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  redDot: { 
    width: 16, 
    height: 16, 
    borderRadius: 8, 
    backgroundColor: "#ff0000",
    marginRight: 8,
  },
  recordingText: { color: "#ff0000", fontSize: 14, fontWeight: "bold", marginRight: 8 },
  manualStopButton: { backgroundColor: "rgba(255, 0, 0, 0.8)", padding: 6, borderRadius: 15 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingText: { color: "#fff", marginTop: 16, fontSize: 16 },
  countdownText: { fontSize: 120, color: "#fff", fontWeight: "bold", textAlign: "center" },

  permissionContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  permissionText: { 
    marginTop: 12, 
    color: "#888", 
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: "#00CFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});