// File: screens/RecordReactionScreen.tsx

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
import { FeebStorage } from "../utils/FeebStorage";
import WebCamera from "../components/WebCamera";
import * as FileSystem from "expo-file-system";

const { width: screenWidth } = Dimensions.get("screen");

// Simple debug logger
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
  const [cameraPermission, requestCameraPermission] =
    useCameraPermissions();
  const [micPermission, requestMicPermission] =
    useMicrophonePermissions();

  // Component state
  const [videoReady, setVideoReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasStartedFlow, setHasStartedFlow] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Recording refs
  const isActivelyRecordingRef = useRef(false);
  // Changed from NodeJS.Timeout to ReturnType<typeof setTimeout>
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const webRecordingBlobRef = useRef<Blob | null>(null);
  const recordingRef = useRef<Promise<any> | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Video to react to
  const videoUri =
    route.params?.videoUri ||
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  // Expo Video player
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
    player.muted = false;
  });

  // Request permissions on native
  useEffect(() => {
    if (Platform.OS !== "web") {
      if (
        cameraPermission?.status !== PermissionStatus.GRANTED
      ) {
        DebugLogger.log("PERMISSIONS", "Requesting camera");
        requestCameraPermission();
      } else {
        DebugLogger.log("PERMISSIONS", "Camera granted");
      }
      if (
        micPermission?.status !== PermissionStatus.GRANTED
      ) {
        DebugLogger.log("PERMISSIONS", "Requesting mic");
        requestMicPermission();
      } else {
        DebugLogger.log("PERMISSIONS", "Mic granted");
      }
    } else {
      DebugLogger.log(
        "PERMISSIONS",
        "Web platform, skipping native perms"
      );
      setCameraReady(true);
    }
  }, [cameraPermission, micPermission]);

  // Video ready listener
  useEffect(() => {
    const sub = player.addListener("statusChange", (status) => {
      if (status.status === "readyToPlay" && !videoReady) {
        setVideoReady(true);
        DebugLogger.log("VIDEO", "readyToPlay", {
          duration: player.duration,
          currentTime: player.currentTime,
        });
      }
    });
    return () => sub?.remove();
  }, [player, videoReady]);

  // Kick off countdown once everything is ready
  useEffect(() => {
    const nativeReady =
      cameraPermission?.granted && micPermission?.granted;
    const allReady =
      videoReady &&
      (Platform.OS === "web" ? cameraReady : nativeReady);

    if (
      allReady &&
      !hasStartedFlow &&
      !isRecording &&
      !isSaving
    ) {
      DebugLogger.log("FLOW", "Starting countdown");
      setHasStartedFlow(true);
      setCountdown(2);
    }
  }, [
    videoReady,
    cameraReady,
    cameraPermission,
    micPermission,
    hasStartedFlow,
    isRecording,
    isSaving,
  ]);

  // Countdown timer
  useEffect(() => {
    if (countdown !== null) {
      if (countdown > 0) {
        const t = setTimeout(
          () => setCountdown(countdown - 1),
          1000
        );
        return () => clearTimeout(t);
      } else {
        setCountdown(null);
        startRecording();
      }
    }
  }, [countdown]);

  // Validate recorded file
  const validateRecordingFile = async (
    uri: string
  ): Promise<boolean> => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || info.size === 0) return false;
      const ext = uri.split(".").pop()?.toLowerCase() || "";
      return ["mp4", "mov", "m4v", "avi"].includes(ext);
    } catch {
      return false;
    }
  };

  // Start recording callback
  const startRecording = useCallback(async () => {
    DebugLogger.log("RECORDING", "startRecording");
    if (isActivelyRecordingRef.current) return;

    try {
      isActivelyRecordingRef.current = true;
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();

      // Play video
      player.currentTime = 0;
      player.play();

      if (Platform.OS === "web") {
        // WebCamera handles recording
      } else {
        if (!cameraRef.current) {
          throw new Error("Camera not ready");
        }
        const opts: CameraRecordingOptions = { maxDuration: 60 };
        recordingRef.current =
          cameraRef.current.recordAsync(opts);
      }

      // Schedule stop
      const durationMs =
        Math.ceil((player.duration || 15) * 1000) + 2000;
      stopTimeoutRef.current = setTimeout(
        stopRecording,
        durationMs
      );
    } catch (err: any) {
      DebugLogger.error("RECORDING", "start error", err);
      isActivelyRecordingRef.current = false;
      setIsRecording(false);
      Alert.alert("Recording Error", err.message || "");
    }
  }, [player]);

  // Stop recording callback
  const stopRecording = useCallback(async () => {
    DebugLogger.log("RECORDING", "stopRecording");
    if (!isActivelyRecordingRef.current) return;

    isActivelyRecordingRef.current = false;
    setIsRecording(false);
    setIsSaving(true);
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    try {
      if (Platform.OS === "web") {
        // wait briefly for blob
        await new Promise((r) => setTimeout(r, 1000));
        if (webRecordingBlobRef.current) {
          await saveWebRecording(webRecordingBlobRef.current);
        } else {
          throw new Error("No web blob recorded");
        }
      } else {
        cameraRef.current?.stopRecording();
        const rec = await recordingRef.current!;
        if (
          rec?.uri &&
          (await validateRecordingFile(rec.uri))
        ) {
          await saveMobileRecording(rec);
        } else {
          throw new Error("Invalid recording file");
        }
      }
    } catch (err: any) {
      DebugLogger.error("RECORDING", "stop/save error", err);
      Alert.alert("Save Error", err.message || "");
    } finally {
      setIsSaving(false);
      webRecordingBlobRef.current = null;
      recordingRef.current = null;
      recordingStartTimeRef.current = null;
      setTimeout(() => navigation.goBack(), 1000);
    }
  }, [navigation]);

  // Helpers to save
  const saveMobileRecording = useCallback(
    async (recording: any) => {
      const permanentUri =
        await FeebStorage.saveVideoToPermanentLocation(
          recording.uri
        );
      const newFeeb = FeebStorage.createFeeb(
        permanentUri,
        videoUri
      );
      await FeebStorage.saveFeeb(newFeeb);
      Alert.alert("Success!", "Your reaction has been saved!");
    },
    [videoUri]
  );
  const saveWebRecording = useCallback(
    async (blob: Blob) => {
      const id = await FeebStorage.saveWebVideoBlob(blob);
      const newFeeb = FeebStorage.createFeeb(id, videoUri);
      await FeebStorage.saveFeeb(newFeeb);
      Alert.alert("Success!", "Your reaction has been saved!");
    },
    [videoUri]
  );

  const handleWebRecordingComplete = useCallback(
    (videoBlob: Blob) => {
      webRecordingBlobRef.current = videoBlob;
    },
    []
  );
  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  const nativeReady =
    cameraPermission?.granted && micPermission?.granted;
  const allReady =
    videoReady &&
    (Platform.OS === "web" ? cameraReady : nativeReady);

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={isRecording || isSaving}
      >
        <View
          style={[
            styles.backButtonCircle,
            (isRecording || isSaving) &&
              styles.disabledButton,
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#fff"
          />
        </View>
      </TouchableOpacity>

      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.redDot} />
          <Text style={styles.recordingText}>REC</Text>
          <TouchableOpacity
            style={styles.manualStopButton}
            onPress={stopRecording}
          >
            <Ionicons
              name="stop"
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Original video */}
      <View style={styles.half}>
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          showsTimecodes={false}
        />
      </View>

      {/* Camera or WebCamera */}
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
      </View>

      {/* Overlays */}
      {!allReady && (

      <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#00CFFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      {countdown !== null && (
        <View style={styles.overlay}>
          <Text style={styles.countdownText}>
            {countdown}
          </Text>
        </View>
      )}
      {isSaving && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#00CFFF" />
          <Text style={styles.loadingText}>
            Saving your feeb...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  half: { flex: 1, overflow: "hidden", backgroundColor: "#000" },
  video: {
    flex: 1,
    width: screenWidth,
    backgroundColor: "#000",
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
  recordingText: {
    color: "#ff0000",
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 8,
  },
  manualStopButton: {
    backgroundColor: "rgba(255, 0, 0, 0.8)",
    padding: 6,
    borderRadius: 15,
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
});
