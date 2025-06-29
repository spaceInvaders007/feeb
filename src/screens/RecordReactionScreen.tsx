// screens/RecordReactionScreen.tsx
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
import { VideoView, useVideoPlayer } from "expo-video";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  PermissionStatus,
} from "expo-camera";
import type { CameraRecordingOptions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import WebCamera from "../components/WebCamera";
import * as FileSystem from "expo-file-system";
import { FeebStorage } from "../utils/FeebStorage";

const { width: screenWidth } = Dimensions.get("screen");

// Enhanced debug logger
class DebugLogger {
  static log(category: string, message: string, data?: any) {
    const timestamp = new Date().toISOString().substr(11, 12);
    console.log(
      `[${timestamp}] 🔍 [${category}] ${message}`,
      data ? JSON.stringify(data, null, 2) : ""
    );
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

  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  // Component state
  const [videoReady, setVideoReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasStartedFlow, setHasStartedFlow] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Recording refs
  const isActivelyRecordingRef = useRef(false);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webRecordingBlobRef = useRef<Blob | null>(null);
  const recordingRef = useRef<Promise<any> | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Video to react to
  const videoUri =
    route.params?.videoUri ||
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  // Expo Video player - original video should play WITH AUDIO during recording
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
    player.muted = false; // UNMUTE during recording so user can hear and react to it
  });

  // Check permissions and request if needed
  useEffect(() => {
    const checkPermissions = async () => {
      if (Platform.OS !== "web") {
        DebugLogger.log("PERMISSIONS", "Checking native permissions");
        
        if (cameraPermission?.status !== PermissionStatus.GRANTED) {
          DebugLogger.log("PERMISSIONS", "Requesting camera");
          const result = await requestCameraPermission();
          DebugLogger.log("PERMISSIONS", "Camera permission result", { granted: result.granted });
        }
        
        if (micPermission?.status !== PermissionStatus.GRANTED) {
          DebugLogger.log("PERMISSIONS", "Requesting microphone");
          const result = await requestMicPermission();
          DebugLogger.log("PERMISSIONS", "Microphone permission result", { granted: result.granted });
          setAudioEnabled(result.granted);
        } else {
          setAudioEnabled(micPermission.granted);
        }
      } else {
        DebugLogger.log("PERMISSIONS", "Web platform - permissions handled by WebCamera");
        setAudioEnabled(true); // Will be validated by WebCamera
      }
    };

    checkPermissions();
  }, [cameraPermission, micPermission, requestCameraPermission, requestMicPermission]);

  // Video ready listener
  useEffect(() => {
    const sub = player.addListener("statusChange", (status) => {
      if (status.status === "readyToPlay" && !videoReady) {
        setVideoReady(true);
        DebugLogger.log("VIDEO", "readyToPlay", {
          duration: player.duration,
          currentTime: player.currentTime,
          muted: player.muted
        });
      }
    });
    return () => sub?.remove();
  }, [player, videoReady]);

  // Start countdown when everything is ready
  useEffect(() => {
    const nativeReady = Platform.OS === "web" || 
      (cameraPermission?.granted && micPermission?.granted);
    const allReady = videoReady && cameraReady && nativeReady;

    DebugLogger.log("READINESS", "Checking readiness", {
      videoReady,
      cameraReady,
      nativeReady,
      allReady,
      hasStartedFlow,
      isRecording,
      isSaving,
      audioEnabled
    });

    if (allReady && !hasStartedFlow && !isRecording && !isSaving) {
      DebugLogger.log("FLOW", "Starting countdown");
      setHasStartedFlow(true);
      setCountdown(3); // Give user time to prepare
    }
  }, [
    videoReady,
    cameraReady,
    cameraPermission,
    micPermission,
    hasStartedFlow,
    isRecording,
    isSaving,
    audioEnabled
  ]);

  // Countdown timer
  useEffect(() => {
    if (countdown !== null) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setCountdown(null);
        startRecording();
      }
    }
  }, [countdown]);

  // Validate recorded file (mobile only)
  const validateRecordingFile = async (uri: string): Promise<boolean> => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) {
        DebugLogger.error("VALIDATION", "File doesn't exist", { uri, exists: info.exists });
        return false;
      }
      
      // Check file size if it exists
      if ('size' in info && info.size === 0) {
        DebugLogger.error("VALIDATION", "File is empty", { uri, size: info.size });
        return false;
      }
      
      const ext = uri.split(".").pop()?.toLowerCase() || "";
      const validExtensions = ["mp4", "mov", "m4v", "avi"];
      const isValidExt = validExtensions.includes(ext);
      
      DebugLogger.log("VALIDATION", "File validation", { 
        uri, 
        exists: info.exists,
        extension: ext, 
        isValid: isValidExt 
      });
      
      return isValidExt;
    } catch (error) {
      DebugLogger.error("VALIDATION", "Validation error", error);
      return false;
    }
  };

  // Start recording
  const startRecording = useCallback(async () => {
    DebugLogger.log("RECORDING", "startRecording called");
    if (isActivelyRecordingRef.current) {
      DebugLogger.log("RECORDING", "Already recording, ignoring");
      return;
    }

    try {
      isActivelyRecordingRef.current = true;
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();

      // Start video playback (WITH AUDIO so user can hear and react to it)
      player.currentTime = 0;
      player.muted = false; // Enable audio so user can hear the original video
      player.play();
      
      DebugLogger.log("RECORDING", "Video playback started", { 
        muted: player.muted, 
        currentTime: player.currentTime 
      });

      if (Platform.OS === "web") {
        DebugLogger.log("RECORDING", "Web recording - WebCamera will handle");
        // WebCamera component handles the actual recording
      } else {
        if (!cameraRef.current) {
          throw new Error("Camera not ready");
        }
        
        // Configure recording options with audio
        const recordingOptions: CameraRecordingOptions = { 
          maxDuration: 60,
          // Note: expo-camera automatically includes audio if microphone permission is granted
        };
        
        DebugLogger.log("RECORDING", "Starting native recording", { 
          options: recordingOptions,
          micPermission: micPermission?.granted,
          audioEnabled
        });
        
        recordingRef.current = cameraRef.current.recordAsync(recordingOptions);
      }

      // Schedule automatic stop based on video duration
      const videoDuration = player.duration || 15; // Default to 15 seconds
      const recordingDuration = Math.ceil(videoDuration * 1000) + 2000; // Add 2s buffer
      
      DebugLogger.log("RECORDING", "Scheduling stop", { 
        videoDuration, 
        recordingDuration: recordingDuration / 1000 
      });
      
      stopTimeoutRef.current = setTimeout(() => {
        DebugLogger.log("RECORDING", "Auto-stopping recording");
        stopRecording();
      }, recordingDuration);

    } catch (error: any) {
      DebugLogger.error("RECORDING", "Failed to start recording", error);
      isActivelyRecordingRef.current = false;
      setIsRecording(false);
      Alert.alert("Recording Error", error.message || "Failed to start recording");
    }
  }, [player, micPermission, audioEnabled]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    DebugLogger.log("RECORDING", "stopRecording called");
    if (!isActivelyRecordingRef.current) {
      DebugLogger.log("RECORDING", "Not recording, ignoring stop");
      return;
    }

    isActivelyRecordingRef.current = false;
    setIsRecording(false);
    setIsSaving(true);
    
    // Clear timeout
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    // Pause video
    player.pause();

    try {
      if (Platform.OS === "web") {
        DebugLogger.log("RECORDING", "Processing web recording");
        // Wait a moment for the blob to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (webRecordingBlobRef.current) {
          DebugLogger.log("RECORDING", "Web blob ready", { 
            size: webRecordingBlobRef.current.size,
            type: webRecordingBlobRef.current.type
          });
          await saveWebRecording(webRecordingBlobRef.current);
        } else {
          throw new Error("No web recording blob available");
        }
      } else {
        DebugLogger.log("RECORDING", "Processing native recording");
        if (cameraRef.current) {
          cameraRef.current.stopRecording();
        }
        
        if (recordingRef.current) {
          const recording = await recordingRef.current;
          DebugLogger.log("RECORDING", "Native recording completed", { 
            uri: recording?.uri,
            duration: recording?.duration
          });
          
          if (recording?.uri && await validateRecordingFile(recording.uri)) {
            await saveMobileRecording(recording);
          } else {
            throw new Error("Invalid or empty recording file");
          }
        } else {
          throw new Error("No recording reference available");
        }
      }
    } catch (error: any) {
      DebugLogger.error("RECORDING", "Failed to save recording", error);
      Alert.alert("Save Error", error.message || "Failed to save your reaction");
    } finally {
      setIsSaving(false);
      webRecordingBlobRef.current = null;
      recordingRef.current = null;
      recordingStartTimeRef.current = null;
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    }
  }, [navigation, player]);

  // Save mobile recording
  const saveMobileRecording = useCallback(async (recording: any) => {
    DebugLogger.log("SAVE", "Saving mobile recording", { uri: recording.uri });
    
    const permanentUri = await FeebStorage.saveVideoToPermanentLocation(recording.uri);
    const newFeeb = FeebStorage.createFeeb(permanentUri, videoUri);
    await FeebStorage.saveFeeb(newFeeb);
    
    DebugLogger.log("SAVE", "Mobile recording saved successfully");
    Alert.alert("Success!", "Your reaction has been saved!");
  }, [videoUri]);

  // Save web recording
  const saveWebRecording = useCallback(async (blob: Blob) => {
    DebugLogger.log("SAVE", "Saving web recording", { 
      size: blob.size, 
      type: blob.type 
    });
    
    const videoId = await FeebStorage.saveWebVideoBlob(blob);
    const newFeeb = FeebStorage.createFeeb(videoId, videoUri);
    await FeebStorage.saveFeeb(newFeeb);
    
    DebugLogger.log("SAVE", "Web recording saved successfully");
    Alert.alert("Success!", "Your reaction has been saved!");
  }, [videoUri]);

  // Handle web recording completion
  const handleWebRecordingComplete = useCallback((videoBlob: Blob) => {
    DebugLogger.log("WEB_RECORDING", "Recording complete", { 
      size: videoBlob.size,
      type: videoBlob.type
    });
    webRecordingBlobRef.current = videoBlob;
  }, []);

  // Handle camera ready
  const handleCameraReady = useCallback(() => {
    DebugLogger.log("CAMERA", "Camera ready");
    setCameraReady(true);
  }, []);

  // Manual stop recording
  const handleManualStop = useCallback(() => {
    DebugLogger.log("USER_ACTION", "Manual stop requested");
    stopRecording();
  }, [stopRecording]);

  // Check if everything is ready
  const nativeReady = Platform.OS === "web" || 
    (cameraPermission?.granted && micPermission?.granted);
  const allReady = videoReady && cameraReady && nativeReady;

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={isRecording || isSaving}
      >
        <View style={[
          styles.backButtonCircle,
          (isRecording || isSaving) && styles.disabledButton,
        ]}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.redDot} />
          <Text style={styles.recordingText}>REC</Text>
          {audioEnabled && (
            <Ionicons name="mic" size={16} color="#fff" style={{ marginLeft: 4 }} />
          )}
          <TouchableOpacity
            style={styles.manualStopButton}
            onPress={handleManualStop}
          >
            <Ionicons name="stop" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Audio status indicator */}
      {allReady && !isRecording && !isSaving && (
        <View style={styles.audioStatus}>
          <Ionicons 
            name={audioEnabled ? "mic" : "mic-off"} 
            size={16} 
            color={audioEnabled ? "#00CFFF" : "#ff6b6b"} 
          />
          <Text style={[
            styles.audioStatusText,
            { color: audioEnabled ? "#00CFFF" : "#ff6b6b" }
          ]}>
            {audioEnabled ? "Audio enabled" : "Audio disabled"}
          </Text>
        </View>
      )}

      {/* Original video (top half) */}
      <View style={styles.half}>
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          showsTimecodes={false}
        />
        <View style={styles.videoLabel}>
          <Text style={styles.labelText}>Original Video</Text>
          <Text style={styles.labelSubtext}>(Playing with audio)</Text>
        </View>
      </View>

      {/* Camera view (bottom half) */}
      <View style={styles.half}>
        {Platform.OS === "web" ? (
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
        <View style={styles.videoLabel}>
          <Text style={styles.labelText}>Your Reaction</Text>
          <Text style={styles.labelSubtext}>
            {audioEnabled ? "(With audio)" : "(Video only)"}
          </Text>
        </View>
      </View>

      {/* Loading overlay */}
      {!allReady && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#00CFFF" />
          <Text style={styles.loadingText}>
            {!videoReady && "Loading video..."}
            {videoReady && !cameraReady && "Preparing camera..."}
            {videoReady && cameraReady && !nativeReady && "Requesting permissions..."}
          </Text>
          {Platform.OS !== "web" && !micPermission?.granted && (
            <Text style={styles.permissionText}>
              Audio recording requires microphone permission
            </Text>
          )}
        </View>
      )}

      {/* Countdown overlay */}
      {countdown !== null && (
        <View style={styles.overlay}>
          <Text style={styles.countdownText}>{countdown}</Text>
          <Text style={styles.countdownSubtext}>Get ready!</Text>
        </View>
      )}

      {/* Saving overlay */}
      {isSaving && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#00CFFF" />
          <Text style={styles.loadingText}>Saving your reaction...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#000" 
  },
  
  half: { 
    flex: 1, 
    overflow: "hidden", 
    backgroundColor: "#000",
    position: "relative"
  },
  
  video: {
    flex: 1,
    width: screenWidth,
    backgroundColor: "#000",
  },

  videoLabel: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  labelText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600"
  },
  labelSubtext: {
    color: "#ccc",
    fontSize: 10
  },

  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 1000,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: { 
    opacity: 0.5 
  },

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
  recordingText: {
    color: "#ff0000",
    fontSize: 14,
    fontWeight: "bold",
  },
  manualStopButton: {
    backgroundColor: "rgba(255, 0, 0, 0.8)",
    padding: 6,
    borderRadius: 15,
    marginLeft: 8,
  },

  audioStatus: {
    position: "absolute",
    top: 100,
    right: 20,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  audioStatusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600"
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 16,
    textAlign: "center"
  },
  permissionText: {
    color: "#ff6b6b",
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32
  },
  countdownText: {
    fontSize: 120,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  countdownSubtext: {
    color: "#fff",
    fontSize: 18,
    marginTop: 16,
    textAlign: "center"
  }
});