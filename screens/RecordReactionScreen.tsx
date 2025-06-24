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

const { width: screenWidth } = Dimensions.get("screen");

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

  // Refs - simplified approach
  const isActivelyRecordingRef = useRef(false);
  const recordingRef = useRef<Promise<any> | null>(null);
  const webRecordingBlobRef = useRef<Blob | null>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const videoUri = route.params?.videoUri ?? "https://samplelib.com/lib/preview/mp4/sample-5s.mp4";

  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
    player.muted = false;
  });

  // Super detailed logging
  const logEverything = useCallback((action: string) => {
    console.log(`🔍 [${action}] COMPLETE STATE:`, {
      timestamp: Date.now(),
      // React states
      isRecording,
      videoReady,
      cameraReady,
      countdown,
      hasStartedFlow,
      isSaving,
      // Refs
      isActivelyRecordingRef: isActivelyRecordingRef.current,
      hasRecordingRef: !!recordingRef.current,
      hasWebBlob: !!webRecordingBlobRef.current,
      hasStopTimeout: !!stopTimeoutRef.current,
      // Player
      playerDuration: player?.duration || 0,
      playerCurrentTime: player?.currentTime || 0,
    });
  }, [isRecording, videoReady, cameraReady, countdown, hasStartedFlow, isSaving, player]);

  // Track every render
  useEffect(() => {
    logEverything("RENDER");
  });

  // Hide header
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    if (Platform.OS !== 'web' && !permission?.granted) {
      requestPermission();
    }
  }, [permission, navigation]);

  // Video ready listener - MINIMAL
  useEffect(() => {
    const subscription = player.addListener('statusChange', (status) => {
      if (status.status === 'readyToPlay' && !videoReady) {
        console.log("📺 Video ready, duration:", player.duration);
        setVideoReady(true);
        logEverything("VIDEO_READY");
      }
    });

    return () => subscription?.remove();
  }, [player, videoReady, logEverything]);

  // Countdown logic - ISOLATED
  useEffect(() => {
    const isReady = videoReady && cameraReady;
    const shouldStart = isReady && !hasStartedFlow && !isRecording && !isSaving;

    if (shouldStart) {
      console.log("✅ Starting countdown");
      setHasStartedFlow(true);
      setCountdown(2);
      logEverything("COUNTDOWN_START");
    }
  }, [videoReady, cameraReady, hasStartedFlow, isRecording, isSaving, logEverything]);

  // Countdown timer - ISOLATED
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      console.log(`⏱️ Countdown: ${countdown}`);
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      console.log("🎬 Countdown finished, starting recording");
      setCountdown(null);
      logEverything("COUNTDOWN_FINISHED");
      startRecording();
    }
  }, [countdown, logEverything]);

  // Start recording - SUPER SIMPLE
  const startRecording = useCallback(() => {
    console.log("🎥 START RECORDING CALLED");
    logEverything("START_RECORDING_BEGIN");

    if (isActivelyRecordingRef.current) {
      console.log("Already recording, abort");
      return;
    }

    // Set states
    isActivelyRecordingRef.current = true;
    setIsRecording(true);
    
    logEverything("START_RECORDING_STATES_SET");

    // Start video
    player.currentTime = 0;
    player.play();
    console.log("▶️ Video started");

    // Set stop timeout
    const duration = player.duration;
    const timeoutMs = duration > 0 ? Math.ceil(duration * 1000) + 500 : 8000;
    
    console.log(`⏰ Setting timeout for ${timeoutMs}ms`);
    stopTimeoutRef.current = setTimeout(() => {
      console.log("⏰ TIMEOUT FIRED - calling stopRecording");
      logEverything("TIMEOUT_FIRED");
      stopRecording();
    }, timeoutMs);

    logEverything("START_RECORDING_COMPLETE");
  }, [player, logEverything]);

  // Stop recording - BULLETPROOF
  const stopRecording = useCallback(() => {
    console.log("🛑 STOP RECORDING CALLED");
    logEverything("STOP_RECORDING_CALLED");

    if (!isActivelyRecordingRef.current) {
      console.log("🛑 NOT ACTIVELY RECORDING - ABORTING");
      logEverything("STOP_RECORDING_ABORTED");
      return;
    }

    console.log("🛑 PROCEEDING WITH STOP");
    isActivelyRecordingRef.current = false;
    setIsRecording(false);
    setIsSaving(true);

    // Clear timeout
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    logEverything("STOP_RECORDING_PROCESSING");

    // Simulate processing and save
    setTimeout(async () => {
      try {
        // Check for web blob
        if (Platform.OS === 'web') {
          console.log("🌐 Checking for web blob...");
          let attempts = 0;
          while (!webRecordingBlobRef.current && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          
          if (webRecordingBlobRef.current) {
            console.log("✅ Web blob available:", webRecordingBlobRef.current.size);
            
            // Save the feeb
            const permanentUri = await FeebStorage.saveWebVideoBlob(webRecordingBlobRef.current);
            const newFeeb = FeebStorage.createFeeb(permanentUri, videoUri);
            await FeebStorage.saveFeeb(newFeeb);
            
            Alert.alert("Success!", "Your feeb has been saved!");
            logEverything("SAVE_SUCCESS");
          } else {
            console.log("❌ No web blob available");
            Alert.alert("Error", "No recording available");
            logEverything("SAVE_ERROR_NO_BLOB");
          }
        }
      } catch (error) {
        console.error("❌ Save error:", error);
        Alert.alert("Error", "Failed to save feeb");
        logEverything("SAVE_ERROR");
      } finally {
        setIsSaving(false);
        webRecordingBlobRef.current = null;
        
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
    }, 1000);
  }, [navigation, videoUri, logEverything]);

  // Manual stop for testing
  const manualStop = useCallback(() => {
    console.log("🛑 MANUAL STOP PRESSED");
    logEverything("MANUAL_STOP");
    stopRecording();
  }, [stopRecording, logEverything]);

  // Camera ready
  const handleCameraReady = useCallback(() => {
    console.log("📹 Camera ready");
    setCameraReady(true);
    logEverything("CAMERA_READY");
  }, [logEverything]);

  // Web recording complete
  const handleWebRecordingComplete = useCallback((videoBlob: Blob) => {
    console.log("🎬 Web recording completed:", videoBlob.size, "bytes");
    webRecordingBlobRef.current = videoBlob;
    logEverything("WEB_RECORDING_COMPLETE");
  }, [logEverything]);

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

      {/* Debug info */}
      <View style={styles.debugOverlay}>
        <Text style={styles.debugText}>
          Recording: {isRecording ? 'TRUE' : 'FALSE'} | 
          Ref: {isActivelyRecordingRef.current ? 'TRUE' : 'FALSE'} | 
          Timeout: {stopTimeoutRef.current ? 'SET' : 'NONE'}
        </Text>
      </View>
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

  debugOverlay: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    padding: 10,
    borderRadius: 8,
    zIndex: 1001,
  },
  debugText: { color: "#fff", fontSize: 12, textAlign: "center" },

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