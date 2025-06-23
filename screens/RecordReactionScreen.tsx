import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Dimensions,
  Platform,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { CameraRecordingOptions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

const { width: screenWidth } = Dimensions.get("screen");

export default function RecordReactionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const videoRef = useRef<Video>(null);
  const cameraRef = useRef<CameraView>(null);

  // Permission + ready states
  const [permission, requestPermission] = useCameraPermissions();
  const [videoReady, setVideoReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // Countdown & recording states
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasStartedFlow, setHasStartedFlow] = useState(false); // Prevent countdown loops

  // Recording control
  const recordingRef = useRef<Promise<any> | null>(null);

  const videoUri =
    route.params?.videoUri ??
    "https://samplelib.com/lib/preview/mp4/sample-5s.mp4";

  console.log("🔄 Component render - States:", {
    videoReady,
    cameraReady,
    countdown,
    isRecording,
    hasStartedFlow
  });

  // Hide header and request permission
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    if (!permission?.granted) requestPermission();
  }, [permission, navigation]);

  // Start countdown ONLY when both ready AND not started yet
  useEffect(() => {
    if (videoReady && cameraReady && !hasStartedFlow) {
      console.log("✅ Both ready, starting countdown");
      setHasStartedFlow(true); // Prevent multiple countdowns
      setCountdown(2);
    }
  }, [videoReady, cameraReady, hasStartedFlow]);

  // Countdown timer mechanism
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      console.log(`⏱️ Countdown: ${countdown}`);
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      console.log("🎬 Countdown finished, starting recording");
      setCountdown(null);
      startRecording();
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Start recording and video playback
  const startRecording = async () => {
    if (!cameraRef.current || !videoRef.current) {
      console.log("❌ Camera or video ref not available");
      return;
    }

    console.log("🎥 Starting recording...");
    setIsRecording(true);

    try {
      // Start camera recording (Promise won't resolve until stopRecording is called)
      const options: CameraRecordingOptions = {};
      recordingRef.current = cameraRef.current.recordAsync(options);
      console.log("📹 Camera recording started");

      // Set up video playback monitoring BEFORE starting playback
      const playbackStatusHandler = (status: AVPlaybackStatus) => {
        console.log("📺 Video status:", {
          isLoaded: status.isLoaded,
          isPlaying: status.isLoaded ? status.isPlaying : false,
          positionMillis: status.isLoaded ? status.positionMillis : 0,
          durationMillis: status.isLoaded ? status.durationMillis : 0,
          didJustFinish: status.isLoaded ? status.didJustFinish : false
        });

        if (status.isLoaded && status.didJustFinish) {
          console.log("🏁 Video finished, stopping recording");
          stopRecording();
        }
      };

      videoRef.current.setOnPlaybackStatusUpdate(playbackStatusHandler);

      // Reset video position and start playback
      await videoRef.current.setPositionAsync(0);
      await videoRef.current.playAsync();
      console.log("▶️ Video playback started");

    } catch (err) {
      console.error("❌ Error starting recording:", err);
      setIsRecording(false);
      setHasStartedFlow(false); // Reset to allow retry
    }
  };

  // Stop recording when video ends
  const stopRecording = async () => {
    if (!cameraRef.current || !recordingRef.current) {
      console.log("❌ No active recording to stop");
      return;
    }

    console.log("🛑 Stopping recording...");
    
    try {
      // Stop the camera recording
      cameraRef.current.stopRecording();
      
      // Wait for the recording Promise to resolve
      const recording = await recordingRef.current;
      console.log("✅ Recording saved to:", recording.uri);

      // Clean up
      if (videoRef.current) {
        videoRef.current.setOnPlaybackStatusUpdate(null);
      }
      recordingRef.current = null;

    } catch (err) {
      console.error("❌ Error stopping recording:", err);
    } finally {
      setIsRecording(false);
      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    }
  };

  // Web-specific video ready handler
  const handleVideoReady = (videoData: any) => {
    console.log("📺 Video ready for display");
    // Fix for web positioning issue
    if (Platform.OS === 'web' && videoData?.srcElement?.style) {
      videoData.srcElement.style.position = "initial";
      videoData.srcElement.style.width = "100%";
      videoData.srcElement.style.height = "100%";
      videoData.srcElement.style.objectFit = "contain";
    }
    setVideoReady(true);
  };

  const handleCameraReady = () => {
    console.log("📹 Camera ready");
    setCameraReady(true);
  };

  // UI while waiting on permission
  if (!permission?.granted) {
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
      >
        <View style={styles.backButtonCircle}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.redDot} />
        </View>
      )}

      {/* Top half: Video */}
      <View style={styles.half}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={false}
          shouldPlay={false} // Don't auto-play
          isLooping={false}
          isMuted={false}
          style={styles.video}
          videoStyle={
            Platform.OS === "web" ? styles.webVideoStyle : undefined
          }
          onReadyForDisplay={handleVideoReady}
        />
      </View>

      {/* Bottom half: Camera */}
      <View style={styles.half}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="front"
          mode="video"
          onCameraReady={handleCameraReady}
        />
      </View>

      {/* Loading spinner until both ready */}
      {!isAllReady && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#00CFFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Countdown overlay */}
      {countdown !== null && (
        <View style={styles.overlay}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  half: { flex: 1, overflow: "hidden", backgroundColor: "#000" },

  backButton: { position: "absolute", top: 50, left: 20, zIndex: 1000 },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  video: { flex: 1, width: screenWidth, backgroundColor: "#000" },
  webVideoStyle: {
    objectFit: "contain",
    width: "100%",
    height: "100%",
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
  },
  countdownText: { 
    fontSize: 120, 
    color: "#fff", 
    fontWeight: "bold",
    textAlign: "center",
  },

  recordingIndicator: { position: "absolute", top: 50, right: 20, zIndex: 1000 },
  redDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#ff0000" },

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