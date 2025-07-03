// src/components/HeadphoneStatus.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Share,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useHeadphoneDetection,
  useHeadphoneDetectionForRecording,
  useHeadphoneDetectionWithMonitoring,
} from "../hooks/useHeadphoneDetection";

// MARK: - Types & Interfaces

interface HeadphoneStatusProps {
  showWarning?: boolean;
  onStatusChange?: (connected: boolean, deviceInfo?: any) => void;
  style?: any;
  variant?: "banner" | "indicator" | "card" | "minimal";
  severity?: "info" | "warning" | "error" | "success";
  autoHide?: boolean;
  autoHideDelay?: number;
  showDetails?: boolean;
  enableDiagnostics?: boolean;
  customMessages?: {
    connected?: string;
    disconnected?: string;
    detecting?: string;
    error?: string;
  };
  position?: "top" | "bottom";
  theme?: "light" | "dark" | "auto";
  animationType?: "fade" | "slide" | "bounce";
  hapticFeedback?: boolean;
  accessibility?: {
    announceChanges?: boolean;
    reducedMotion?: boolean;
  };
}

interface HeadphoneIndicatorProps {
  size?: "small" | "medium" | "large";
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  showLabel?: boolean;
  animated?: boolean;
  style?: any;
  theme?: "light" | "dark" | "auto";
  onPress?: () => void;
}

interface DiagnosticsModalProps {
  visible: boolean;
  onClose: () => void;
  detection: any;
  theme?: "light" | "dark"; // Remove 'auto' from this specific component
}

interface SmartRecordingBannerProps {
  onDismiss?: () => void;
  style?: any;
  theme?: "light" | "dark" | "auto";
  showRecommendations?: boolean;
  autoOptimize?: boolean;
}

// MARK: - Constants

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const VARIANT_STYLES = {
  banner: {
    position: "absolute" as const,
    top: Platform.OS === "web" ? 10 : 60,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  indicator: {
    position: "absolute" as const,
    top: Platform.OS === "web" ? 20 : 70,
    right: 20,
    zIndex: 1000,
  },
  card: {
    margin: 16,
    borderRadius: 12,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  minimal: {
    padding: 8,
  },
};

const SEVERITY_COLORS = {
  light: {
    info: "#007AFF",
    warning: "#FF9500",
    error: "#FF3B30",
    success: "#34C759",
  },
  dark: {
    info: "#0A84FF",
    warning: "#FF9F0A",
    error: "#FF453A",
    success: "#30D158",
  },
};

const THEMES = {
  light: {
    background: "#FFFFFF",
    surface: "#F2F2F7",
    text: "#000000",
    secondaryText: "#8E8E93",
    border: "#C6C6C8",
    shadow: "rgba(0, 0, 0, 0.1)",
  },
  dark: {
    background: "#1C1C1E",
    surface: "#2C2C2E",
    text: "#FFFFFF",
    secondaryText: "#8E8E93",
    border: "#38383A",
    shadow: "rgba(0, 0, 0, 0.3)",
  },
};

// MARK: - Utility Functions

const getTheme = (themeMode: 'light' | 'dark') => {
  return THEMES[themeMode];
};


const triggerHapticFeedback = (
  type: "light" | "medium" | "heavy" = "light"
) => {
  if (Platform.OS === "ios") {
    // Would use Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    console.log("📳 Haptic feedback:", type);
  }
};

// MARK: - Advanced Diagnostics Modal Component

const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  visible,
  onClose,
  detection,
  theme = "light",
}) => {
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "status" | "metrics" | "events" | "debug"
  >("status");
  const [isExporting, setIsExporting] = useState(false);

  const themeColors = getTheme(theme);

  useEffect(() => {
    if (visible && detection) {
      const telemetry = detection.exportTelemetry?.() || [];
      const metrics = detection.metrics;
      setTelemetryData(telemetry.slice(0, 50)); // Show last 50 events
      setMetricsData(metrics);
    }
  }, [visible, detection]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatLatency = (latency: number) => {
    return `${latency.toFixed(2)}ms`;
  };

  const exportDiagnostics = async () => {
    setIsExporting(true);
    try {
      const diagnosticsReport = {
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        detection: {
          isConnected: detection.isConnected,
          deviceType: detection.deviceType,
          deviceName: detection.deviceName,
          confidence: detection.confidence,
          error: detection.error,
          isListening: detection.isListening,
          isInitialized: detection.isInitialized,
        },
        metrics: metricsData,
        history: detection.getDetectionHistory?.() || [],
        telemetry: telemetryData,
        rawInfo: detection.rawHeadphoneInfo,
      };

      if (Platform.OS === "web") {
        // Web: Download as JSON file
        const blob = new Blob([JSON.stringify(diagnosticsReport, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `headphone-diagnostics-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Mobile: Share the report
        await Share.share({
          title: "Headphone Detection Diagnostics",
          message: JSON.stringify(diagnosticsReport, null, 2),
        });
      }
    } catch (error) {
      Alert.alert("Export Error", "Failed to export diagnostics report");
    } finally {
      setIsExporting(false);
    }
  };

  const renderTabButton = (
    tab: typeof activeTab,
    label: string,
    icon: string
  ) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        { borderBottomColor: themeColors.border },
        activeTab === tab && { borderBottomColor: SEVERITY_COLORS[theme].info },
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons
        name={icon as any}
        size={16}
        color={
          activeTab === tab
            ? SEVERITY_COLORS[theme].info
            : themeColors.secondaryText
        }
      />
      <Text
        style={[
          styles.tabButtonText,
          {
            color:
              activeTab === tab
                ? SEVERITY_COLORS[theme].info
                : themeColors.secondaryText,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderStatusTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.diagnosticsSection}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
          Current Status
        </Text>
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Text
              style={[styles.statusLabel, { color: themeColors.secondaryText }]}
            >
              Connected
            </Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color: detection.isConnected
                    ? SEVERITY_COLORS[theme].success
                    : SEVERITY_COLORS[theme].error,
                },
              ]}
            >
              {detection.isConnected ? "Yes" : "No"}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text
              style={[styles.statusLabel, { color: themeColors.secondaryText }]}
            >
              Device Type
            </Text>
            <Text style={[styles.statusValue, { color: themeColors.text }]}>
              {detection.deviceType}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text
              style={[styles.statusLabel, { color: themeColors.secondaryText }]}
            >
              Device Name
            </Text>
            <Text style={[styles.statusValue, { color: themeColors.text }]}>
              {detection.deviceName || "Unknown"}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text
              style={[styles.statusLabel, { color: themeColors.secondaryText }]}
            >
              Confidence
            </Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color:
                    detection.confidence > 0.8
                      ? SEVERITY_COLORS[theme].success
                      : SEVERITY_COLORS[theme].warning,
                },
              ]}
            >
              {(detection.confidence * 100).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text
              style={[styles.statusLabel, { color: themeColors.secondaryText }]}
            >
              Listening
            </Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color: detection.isListening
                    ? SEVERITY_COLORS[theme].success
                    : SEVERITY_COLORS[theme].warning,
                },
              ]}
            >
              {detection.isListening ? "Active" : "Inactive"}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text
              style={[styles.statusLabel, { color: themeColors.secondaryText }]}
            >
              Initialized
            </Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color: detection.isInitialized
                    ? SEVERITY_COLORS[theme].success
                    : SEVERITY_COLORS[theme].error,
                },
              ]}
            >
              {detection.isInitialized ? "Yes" : "No"}
            </Text>
          </View>
        </View>
      </View>

      {detection.error && (
        <View
          style={[
            styles.diagnosticsSection,
            { backgroundColor: "rgba(255, 59, 48, 0.1)" },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: SEVERITY_COLORS[theme].error },
            ]}
          >
            Current Error
          </Text>
          <Text
            style={[styles.errorText, { color: SEVERITY_COLORS[theme].error }]}
          >
            {detection.error}
          </Text>
        </View>
      )}
    </View>
  );

  const renderMetricsTab = () => (
    <View style={styles.tabContent}>
      {metricsData ? (
        <View style={styles.diagnosticsSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Performance Metrics
          </Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text
                style={[
                  styles.metricLabel,
                  { color: themeColors.secondaryText },
                ]}
              >
                Detection Latency
              </Text>
              <Text style={[styles.metricValue, { color: themeColors.text }]}>
                {formatLatency(metricsData.detectionLatency)}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text
                style={[
                  styles.metricLabel,
                  { color: themeColors.secondaryText },
                ]}
              >
                Accuracy Score
              </Text>
              <Text style={[styles.metricValue, { color: themeColors.text }]}>
                {(metricsData.accuracyScore * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text
                style={[
                  styles.metricLabel,
                  { color: themeColors.secondaryText },
                ]}
              >
                Device Count
              </Text>
              <Text style={[styles.metricValue, { color: themeColors.text }]}>
                {metricsData.deviceCount}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text
                style={[
                  styles.metricLabel,
                  { color: themeColors.secondaryText },
                ]}
              >
                Error Count
              </Text>
              <Text
                style={[
                  styles.metricValue,
                  {
                    color:
                      metricsData.errorCount > 0
                        ? SEVERITY_COLORS[theme].error
                        : SEVERITY_COLORS[theme].success,
                  },
                ]}
              >
                {metricsData.errorCount}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text
            style={[
              styles.emptyStateText,
              { color: themeColors.secondaryText },
            ]}
          >
            No metrics available
          </Text>
        </View>
      )}
    </View>
  );

  const renderEventsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.diagnosticsSection}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
          Recent Events ({telemetryData.length})
        </Text>
        {telemetryData.length > 0 ? (
          <ScrollView
            style={styles.eventsList}
            showsVerticalScrollIndicator={false}
          >
            {telemetryData.map((event, index) => (
              <View
                key={index}
                style={[
                  styles.eventItem,
                  { borderBottomColor: themeColors.border },
                ]}
              >
                <View style={styles.eventHeader}>
                  <Text style={[styles.eventType, { color: themeColors.text }]}>
                    {event.type}
                  </Text>
                  <Text
                    style={[
                      styles.eventTime,
                      { color: themeColors.secondaryText },
                    ]}
                  >
                    {formatTimestamp(event.hookTimestamp || event.timestamp)}
                  </Text>
                </View>
                {event.info && (
                  <Text
                    style={[
                      styles.eventDetails,
                      { color: themeColors.secondaryText },
                    ]}
                  >
                    {event.info.deviceName} ({event.info.deviceType}) -{" "}
                    {(event.info.confidence * 100).toFixed(1)}%
                  </Text>
                )}
                {event.latency && (
                  <Text
                    style={[
                      styles.eventDetails,
                      { color: themeColors.secondaryText },
                    ]}
                  >
                    Latency: {formatLatency(event.latency)}
                  </Text>
                )}
                {event.error && (
                  <Text
                    style={[
                      styles.eventDetails,
                      { color: SEVERITY_COLORS[theme].error },
                    ]}
                  >
                    Error: {event.error}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text
              style={[
                styles.emptyStateText,
                { color: themeColors.secondaryText },
              ]}
            >
              No events recorded
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderDebugTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.diagnosticsSection}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
          Debug Information
        </Text>

        {detection.rawHeadphoneInfo?.metadata && (
          <View style={styles.metadataContainer}>
            <Text style={[styles.metadataTitle, { color: themeColors.text }]}>
              Device Metadata:
            </Text>
            <ScrollView style={styles.metadataScroll}>
              <Text
                style={[
                  styles.metadataText,
                  { color: themeColors.secondaryText },
                ]}
              >
                {JSON.stringify(detection.rawHeadphoneInfo.metadata, null, 2)}
              </Text>
            </ScrollView>
          </View>
        )}

        <View style={styles.debugActions}>
          <TouchableOpacity
            style={[
              styles.debugButton,
              { backgroundColor: SEVERITY_COLORS[theme].info },
            ]}
            onPress={() => detection.refreshDetection?.()}
          >
            <Ionicons name="refresh" size={16} color="#FFF" />
            <Text style={styles.debugButtonText}>Refresh Detection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.debugButton,
              { backgroundColor: SEVERITY_COLORS[theme].warning },
            ]}
            onPress={() => detection.resetCircuitBreaker?.()}
          >
            <Ionicons name="build" size={16} color="#FFF" />
            <Text style={styles.debugButtonText}>Reset Circuit Breaker</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.debugButton,
              { backgroundColor: SEVERITY_COLORS[theme].error },
            ]}
            onPress={() => detection.resetError?.()}
          >
            <Ionicons name="alert-circle" size={16} color="#FFF" />
            <Text style={styles.debugButtonText}>Clear Error</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.diagnosticsContainer,
          { backgroundColor: themeColors.background },
        ]}
      >
        <View
          style={[
            styles.diagnosticsHeader,
            {
              backgroundColor: themeColors.surface,
              borderBottomColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.diagnosticsTitle, { color: themeColors.text }]}>
            Headphone Detection Diagnostics
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.exportButton,
                { backgroundColor: SEVERITY_COLORS[theme].info },
              ]}
              onPress={exportDiagnostics}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="download" size={16} color="#FFF" />
              )}
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons
                name="close"
                size={24}
                color={themeColors.secondaryText}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: themeColors.surface,
              borderBottomColor: themeColors.border,
            },
          ]}
        >
          {renderTabButton("status", "Status", "information-circle")}
          {renderTabButton("metrics", "Metrics", "speedometer")}
          {renderTabButton("events", "Events", "list")}
          {renderTabButton("debug", "Debug", "bug")}
        </View>

        <ScrollView style={styles.diagnosticsContent}>
          {activeTab === "status" && renderStatusTab()}
          {activeTab === "metrics" && renderMetricsTab()}
          {activeTab === "events" && renderEventsTab()}
          {activeTab === "debug" && renderDebugTab()}
        </ScrollView>
      </View>
    </Modal>
  );
};

// MARK: - Main HeadphoneStatus Component

const HeadphoneStatus: React.FC<HeadphoneStatusProps> = ({
  showWarning = true,
  onStatusChange,
  style,
  variant = "banner",
  severity = "warning",
  autoHide = false,
  autoHideDelay = 5000,
  showDetails = false,
  enableDiagnostics = false,
  customMessages = {},
  position = "top",
  theme = "light",
  animationType = "fade",
  hapticFeedback = false,
  accessibility = {},
}) => {
  const detection =
    variant === "banner" || showWarning
      ? useHeadphoneDetectionForRecording()
      : useHeadphoneDetection();

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [hasAnnounced, setHasAnnounced] = useState(false);

  const effectiveTheme = theme === "auto" ? "light" : theme;
  const themeColors = getTheme(effectiveTheme);

  const {
    hasHeadphones,
    deviceType,
    deviceName,
    isInitialized,
    error,
    confidence,
    isDetecting,
    checkHeadphones,
  } = detection;

  const recordingRecommendation =
    "recordingRecommendation" in detection
      ? (detection as any).recordingRecommendation
      : undefined;

  // MARK: - Effect Handlers

  // Notify parent of status changes
  useEffect(() => {
    if (isInitialized && onStatusChange) {
      onStatusChange(hasHeadphones, {
        deviceType,
        deviceName,
        confidence,
        recordingRecommendation:
          "recordingRecommendation" in detection
            ? recordingRecommendation
            : undefined,
      });
    }
  }, [
    hasHeadphones,
    isInitialized,
    onStatusChange,
    deviceType,
    deviceName,
    confidence,
    recordingRecommendation,
    detection,
  ]);

  // Handle haptic feedback
  useEffect(() => {
    if (hapticFeedback && isInitialized && hasAnnounced) {
      triggerHapticFeedback(hasHeadphones ? "light" : "medium");
    }
  }, [hasHeadphones, hapticFeedback, isInitialized, hasAnnounced]);

  // Handle accessibility announcements
  useEffect(() => {
    if (accessibility.announceChanges && isInitialized) {
      const message = hasHeadphones
        ? `Headphones connected: ${deviceName}`
        : "No headphones detected";

      console.log("📢 Accessibility announcement:", message);
      setHasAnnounced(true);
      // In a real implementation, this would use screen reader APIs
    }
  }, [hasHeadphones, deviceName, accessibility.announceChanges, isInitialized]);

  // Handle visibility animation
  useEffect(() => {
    const shouldShow =
      showWarning && (!hasHeadphones || error || isDetecting) && isInitialized;

    const animationConfig = {
      toValue: shouldShow ? 1 : 0,
      duration: accessibility.reducedMotion
        ? 0
        : animationType === "bounce"
          ? 500
          : 300,
      useNativeDriver: true,
    };

    if (animationType === "bounce" && shouldShow) {
      Animated.sequence([
        Animated.timing(fadeAnim, { ...animationConfig, toValue: 1.2 }),
        Animated.timing(fadeAnim, {
          ...animationConfig,
          toValue: 1,
          duration: 200,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, animationConfig).start();
    }

    // Auto-hide logic
    if (shouldShow && autoHide) {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: accessibility.reducedMotion ? 0 : 300,
          useNativeDriver: true,
        }).start();
      }, autoHideDelay);
      setAutoHideTimer(timer);
    }

    return () => {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }
    };
  }, [
    showWarning,
    hasHeadphones,
    error,
    isDetecting,
    isInitialized,
    fadeAnim,
    autoHide,
    autoHideDelay,
    autoHideTimer,
    animationType,
    accessibility.reducedMotion,
  ]);

  // MARK: - Event Handlers

  const showDetailedInfo = useCallback(() => {
    if (error) {
      Alert.alert(
        "❌ Detection Error",
        `Failed to detect headphones: ${error}`,
        [
          { text: "Retry", onPress: checkHeadphones },
          { text: "Continue anyway", style: "cancel" },
          ...(enableDiagnostics
            ? [{ text: "Diagnostics", onPress: () => setShowDiagnostics(true) }]
            : []),
        ]
      );
      return;
    }

    const baseMessage = hasHeadphones
      ? `✅ Connected: ${deviceName}\nType: ${deviceType === "bluetooth" ? "Bluetooth" : "Wired"}\nConfidence: ${(confidence * 100).toFixed(1)}%`
      : `🎧 No headphones detected.\n\nFor the best experience:\n• Use headphones to avoid audio feedback\n• Ensure your device volume is appropriate\n• Consider using wireless earbuds for mobility`;

    let message = baseMessage;

    // Add recording recommendation if available
    if ("recordingRecommendation" in detection && recordingRecommendation) {
      if (recordingRecommendation.warning) {
        message += `\n\n⚠️ ${recordingRecommendation.warning}`;
      }
      if (recordingRecommendation.suggestion) {
        message += `\n💡 ${recordingRecommendation.suggestion}`;
      }
    }

    const actions = hasHeadphones
      ? [
          { text: "OK" },
          ...(enableDiagnostics
            ? [{ text: "Diagnostics", onPress: () => setShowDiagnostics(true) }]
            : []),
        ]
      : [
          { text: "Continue anyway", style: "cancel" as const },
          { text: "Check again", onPress: checkHeadphones },
          ...(enableDiagnostics
            ? [{ text: "Diagnostics", onPress: () => setShowDiagnostics(true) }]
            : []),
        ];

    Alert.alert(
      hasHeadphones ? "Headphones Connected" : "Headphones Recommended",
      message,
      actions
    );
  }, [
    error,
    hasHeadphones,
    deviceName,
    deviceType,
    confidence,
    checkHeadphones,
    enableDiagnostics,
    detection,
    recordingRecommendation,
  ]);

  // MARK: - Render Helpers

  const getStatusIcon = () => {
    if (isDetecting) return "refresh";
    if (error) return "warning";
    if (hasHeadphones) {
      return deviceType === "bluetooth" ? "bluetooth" : "headset";
    }
    return "headset";
  };

  const getStatusColor = () => {
    if (isDetecting) return SEVERITY_COLORS[effectiveTheme].info;
    if (error) return SEVERITY_COLORS[effectiveTheme].error;
    if (hasHeadphones && confidence > 0.8)
      return SEVERITY_COLORS[effectiveTheme].success;
    if (hasHeadphones) return SEVERITY_COLORS[effectiveTheme].warning;
    return SEVERITY_COLORS[effectiveTheme][severity];
  };

  const getStatusText = () => {
    if (isDetecting) return customMessages.detecting || "Detecting...";
    if (error) return customMessages.error || "Detection failed";
    if (hasHeadphones)
      return customMessages.connected || `${deviceName} connected`;
    return customMessages.disconnected || "Headphones recommended";
  };

  const getSubText = () => {
    if (isDetecting) return "Please wait...";
    if (error) return "Tap to retry";
    if (hasHeadphones && showDetails) {
      return `${deviceType} • ${(confidence * 100).toFixed(0)}% confidence`;
    }
    if (!hasHeadphones) return "Tap for more info";
    return null;
  };

  // MARK: - Variant Renderers

  const renderBanner = () => {
    const bannerStyle = [
      VARIANT_STYLES.banner,
      position === "bottom" && { top: undefined, bottom: 20 },
      { opacity: fadeAnim },
      style,
    ];

    return (
      <Animated.View style={bannerStyle}>
        <TouchableOpacity
          style={[
            styles.banner,
            {
              borderColor: getStatusColor(),
              backgroundColor: themeColors.background,
              shadowColor: themeColors.shadow,
            },
          ]}
          onPress={showDetailedInfo}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={getStatusText()}
          accessibilityHint={getSubText() || undefined}
        >
          <View style={styles.iconContainer}>
            {isDetecting ? (
              <ActivityIndicator size="small" color={getStatusColor()} />
            ) : (
              <Ionicons
                name={getStatusIcon()}
                size={20}
                color={getStatusColor()}
              />
            )}
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.mainText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
            {getSubText() && (
              <Text
                style={[styles.subText, { color: themeColors.secondaryText }]}
              >
                {getSubText()}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              checkHeadphones();
            }}
            style={styles.refreshButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Refresh detection"
          >
            <Ionicons
              name="refresh"
              size={16}
              color={themeColors.secondaryText}
            />
          </TouchableOpacity>

          {enableDiagnostics && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setShowDiagnostics(true);
              }}
              style={styles.diagnosticsButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Open diagnostics"
            >
              <Ionicons
                name="analytics"
                size={16}
                color={themeColors.secondaryText}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderIndicator = () => {
    const indicatorStyle = [
      VARIANT_STYLES.indicator,
      { opacity: fadeAnim },
      style,
    ];

    return (
      <Animated.View style={indicatorStyle}>
        <TouchableOpacity
          style={[
            styles.indicator,
            {
              backgroundColor: getStatusColor(),
              shadowColor: themeColors.shadow,
            },
          ]}
          onPress={showDetailedInfo}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={getStatusText()}
        >
          {isDetecting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name={getStatusIcon()} size={24} color="white" />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCard = () => {
    return (
      <View
        style={[
          VARIANT_STYLES.card,
          { backgroundColor: themeColors.background },
          style,
        ]}
      >
        <TouchableOpacity
          style={[styles.card, { borderColor: getStatusColor() }]}
          onPress={showDetailedInfo}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={getStatusText()}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              {isDetecting ? (
                <ActivityIndicator size="small" color={getStatusColor()} />
              ) : (
                <Ionicons
                  name={getStatusIcon()}
                  size={28}
                  color={getStatusColor()}
                />
              )}
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
              {getSubText() && (
                <Text
                  style={[
                    styles.cardSubtitle,
                    { color: themeColors.secondaryText },
                  ]}
                >
                  {getSubText()}
                </Text>
              )}
            </View>
          </View>

          {hasHeadphones && showDetails && (
            <View style={styles.cardDetails}>
              <View style={styles.detailItem}>
                <Text
                  style={[
                    styles.detailLabel,
                    { color: themeColors.secondaryText },
                  ]}
                >
                  Device Type
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {deviceType === "bluetooth" ? "Bluetooth" : "Wired"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text
                  style={[
                    styles.detailLabel,
                    { color: themeColors.secondaryText },
                  ]}
                >
                  Confidence
                </Text>
                <Text style={[styles.detailValue, { color: themeColors.text }]}>
                  {(confidence * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          )}

          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                checkHeadphones();
              }}
              style={[styles.cardAction, { borderColor: themeColors.border }]}
            >
              <Ionicons
                name="refresh"
                size={16}
                color={themeColors.secondaryText}
              />
              <Text
                style={[
                  styles.cardActionText,
                  { color: themeColors.secondaryText },
                ]}
              >
                Refresh
              </Text>
            </TouchableOpacity>

            {enableDiagnostics && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setShowDiagnostics(true);
                }}
                style={[styles.cardAction, { borderColor: themeColors.border }]}
              >
                <Ionicons
                  name="analytics"
                  size={16}
                  color={themeColors.secondaryText}
                />
                <Text
                  style={[
                    styles.cardActionText,
                    { color: themeColors.secondaryText },
                  ]}
                >
                  Diagnostics
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMinimal = () => {
    return (
      <View style={[VARIANT_STYLES.minimal, style]}>
        <TouchableOpacity
          style={styles.minimal}
          onPress={showDetailedInfo}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={getStatusText()}
        >
          {isDetecting ? (
            <ActivityIndicator size="small" color={getStatusColor()} />
          ) : (
            <Ionicons
              name={getStatusIcon()}
              size={20}
              color={getStatusColor()}
            />
          )}
          <Text style={[styles.minimalText, { color: getStatusColor() }]}>
            {hasHeadphones ? deviceName : "No headphones"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Don't render if warning is disabled and headphones are connected
  if (!showWarning && hasHeadphones) {
    return null;
  }

  // Don't render if not initialized (unless it's an error state)
  if (!isInitialized && !error) {
    return null;
  }

  return (
    <>
      {variant === "banner" && renderBanner()}
      {variant === "indicator" && renderIndicator()}
      {variant === "card" && renderCard()}
      {variant === "minimal" && renderMinimal()}

      {/* Diagnostics Modal */}
      <DiagnosticsModal
        visible={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        detection={detection}
        theme={effectiveTheme}
      />
    </>
  );
};

// MARK: - HeadphoneIndicator Component

export const HeadphoneIndicator: React.FC<HeadphoneIndicatorProps> = ({
  size = "medium",
  position = "top-right",
  showLabel = false,
  animated = true,
  style,
  theme = "light",
  onPress,
}) => {
  const { hasHeadphones, deviceType, isDetecting } = useHeadphoneDetection();
  const [pulseAnim] = useState(() => new Animated.Value(1));

  const effectiveTheme = theme === "auto" ? "light" : theme;
  const themeColors = getTheme(effectiveTheme);

  // Pulse animation for detecting state
  useEffect(() => {
    if (animated && isDetecting) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isDetecting, animated, pulseAnim]);

  const getSize = () => {
    switch (size) {
      case "small":
        return 24;
      case "large":
        return 40;
      default:
        return 32;
    }
  };

  const getColor = () => {
    if (isDetecting) return SEVERITY_COLORS[effectiveTheme].info;
    if (hasHeadphones) return SEVERITY_COLORS[effectiveTheme].success;
    return SEVERITY_COLORS[effectiveTheme].warning;
  };

  const getIcon = () => {
    if (isDetecting) return "refresh";
    if (hasHeadphones) {
      return deviceType === "bluetooth" ? "bluetooth" : "headset";
    }
    return "headset-outline";
  };

  const getPositionStyle = () => {
    const baseSize = getSize();
    const offset = 20;

    switch (position) {
      case "top-left":
        return { position: "absolute", top: offset, left: offset };
      case "top-right":
        return { position: "absolute", top: offset, right: offset };
      case "bottom-left":
        return { position: "absolute", bottom: offset, left: offset };
      case "bottom-right":
        return { position: "absolute", bottom: offset, right: offset };
      default:
        return { position: "absolute", top: offset, right: offset };
    }
  };

  const indicatorStyle = [
    styles.headphoneIndicator,
    getPositionStyle(),
    {
      width: getSize(),
      height: getSize(),
      backgroundColor: getColor(),
      shadowColor: themeColors.shadow,
    },
    style,
  ];

  return (
    <Animated.View
      style={[indicatorStyle, { transform: [{ scale: pulseAnim }] }]}
    >
      <TouchableOpacity
        style={styles.indicatorButton}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={
          hasHeadphones ? "Headphones connected" : "No headphones detected"
        }
      >
        {isDetecting ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name={getIcon()} size={getSize() * 0.6} color="white" />
        )}
      </TouchableOpacity>

      {showLabel && (
        <View
          style={[
            styles.indicatorLabel,
            { backgroundColor: themeColors.background },
          ]}
        >
          <Text
            style={[styles.indicatorLabelText, { color: themeColors.text }]}
          >
            {hasHeadphones ? "Connected" : "No headphones"}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

// MARK: - SmartRecordingBanner Component

export const SmartRecordingBanner: React.FC<SmartRecordingBannerProps> = ({
  onDismiss,
  style,
  theme = "light",
  showRecommendations = true,
  autoOptimize = false,
}) => {
  const { hasHeadphones, deviceType, recordingRecommendation } =
    useHeadphoneDetectionForRecording();
  const [isDismissed, setIsDismissed] = useState(false);

  const effectiveTheme = theme === "auto" ? "light" : theme;
  const themeColors = getTheme(effectiveTheme);

  // Auto-optimize audio settings if enabled
  useEffect(() => {
    if (autoOptimize && hasHeadphones) {
      // In a real implementation, this would adjust audio settings
      console.log(
        "🎛️ Auto-optimizing audio settings for",
        deviceType,
        "headphones"
      );
    }
  }, [autoOptimize, hasHeadphones, deviceType]);

  if (isDismissed || !showRecommendations || !recordingRecommendation) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <View
      style={[
        styles.smartBanner,
        { backgroundColor: themeColors.surface },
        style,
      ]}
    >
      <View style={styles.smartBannerContent}>
        <View style={styles.smartBannerIcon}>
          <Ionicons
            name={
              recordingRecommendation.warning ? "warning" : "checkmark-circle"
            }
            size={24}
            color={
              recordingRecommendation.warning
                ? SEVERITY_COLORS[effectiveTheme].warning
                : SEVERITY_COLORS[effectiveTheme].success
            }
          />
        </View>

        <View style={styles.smartBannerText}>
          <Text style={[styles.smartBannerTitle, { color: themeColors.text }]}>
            Recording Optimization
          </Text>

          {recordingRecommendation.warning && (
            <Text
              style={[
                styles.smartBannerWarning,
                { color: SEVERITY_COLORS[effectiveTheme].warning },
              ]}
            >
              {recordingRecommendation.warning}
            </Text>
          )}

          {recordingRecommendation.suggestion && (
            <Text
              style={[
                styles.smartBannerSuggestion,
                { color: themeColors.secondaryText },
              ]}
            >
              💡 {recordingRecommendation.suggestion}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.smartBannerDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={themeColors.secondaryText} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// MARK: - StyleSheet

const styles = StyleSheet.create({
  // Banner styles
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  iconContainer: {
    marginRight: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  textContainer: {
    flex: 1,
  },

  mainText: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },

  subText: {
    fontSize: 12,
  },

  refreshButton: {
    padding: 8,
    marginLeft: 8,
  },

  diagnosticsButton: {
    padding: 8,
    marginLeft: 4,
  },

  // Indicator styles
  indicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Card styles
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  cardIconContainer: {
    marginRight: 12,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  cardTextContainer: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },

  cardSubtitle: {
    fontSize: 14,
  },

  cardDetails: {
    marginBottom: 12,
  },

  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  detailLabel: {
    fontSize: 14,
  },

  detailValue: {
    fontSize: 14,
    fontWeight: "500",
  },

  cardActions: {
    flexDirection: "row",
    gap: 8,
  },

  cardAction: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },

  cardActionText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Minimal styles
  minimal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  minimalText: {
    fontSize: 14,
    fontWeight: "500",
  },

  // HeadphoneIndicator styles
  headphoneIndicator: {
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },

  indicatorButton: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  indicatorLabel: {
    position: "absolute",
    top: "100%",
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  indicatorLabelText: {
    fontSize: 10,
    fontWeight: "500",
  },

  // SmartRecordingBanner styles
  smartBanner: {
    margin: 16,
    borderRadius: 12,
    padding: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  smartBannerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  smartBannerIcon: {
    marginRight: 12,
  },

  smartBannerText: {
    flex: 1,
  },

  smartBannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },

  smartBannerWarning: {
    fontSize: 12,
    marginBottom: 2,
  },

  smartBannerSuggestion: {
    fontSize: 12,
  },

  smartBannerDismiss: {
    marginLeft: 8,
  },

  // Diagnostics Modal styles
  diagnosticsContainer: {
    flex: 1,
  },

  diagnosticsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },

  diagnosticsTitle: {
    fontSize: 18,
    fontWeight: "600",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },

  exportButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },

  closeButton: {
    padding: 4,
  },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },

  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  tabButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },

  diagnosticsContent: {
    flex: 1,
  },

  tabContent: {
    padding: 16,
  },

  diagnosticsSection: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },

  statusGrid: {
    gap: 8,
  },

  statusItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },

  statusLabel: {
    fontSize: 14,
  },

  statusValue: {
    fontSize: 14,
    fontWeight: "600",
  },

  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },

  metricsGrid: {
    gap: 12,
  },

  metricItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  metricLabel: {
    fontSize: 14,
  },

  metricValue: {
    fontSize: 14,
    fontWeight: "600",
  },

  eventsList: {
    maxHeight: 300,
  },

  eventItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },

  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },

  eventType: {
    fontSize: 14,
    fontWeight: "600",
  },

  eventTime: {
    fontSize: 12,
  },

  eventDetails: {
    fontSize: 12,
    lineHeight: 16,
  },

  metadataContainer: {
    marginBottom: 16,
  },

  metadataTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },

  metadataScroll: {
    maxHeight: 150,
    borderRadius: 8,
    padding: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },

  metadataText: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  debugActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },

  debugButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },

  debugButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },

  emptyStateText: {
    fontSize: 14,
    textAlign: "center",
  },
});

export default HeadphoneStatus;
