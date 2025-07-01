import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHeadphoneDetection } from '../hooks/useHeadphoneDetection';

interface HeadphoneStatusProps {
  showWarning?: boolean;
  onStatusChange?: (connected: boolean) => void;
  style?: any;
}

const HeadphoneStatus: React.FC<HeadphoneStatusProps> = ({ 
  showWarning = true, 
  onStatusChange,
  style 
}) => {
  const {
    hasHeadphones,
    deviceType,
    deviceName,
    isInitialized,
    error,
    checkHeadphones
  } = useHeadphoneDetection();

  const [fadeAnim] = useState(() => new Animated.Value(0));

  // Notify parent of status changes
  useEffect(() => {
    if (isInitialized && onStatusChange) {
      onStatusChange(hasHeadphones);
    }
  }, [hasHeadphones, isInitialized, onStatusChange]);

  // Handle warning visibility animation
  useEffect(() => {
    const shouldShow = showWarning && !hasHeadphones && isInitialized;
    
    Animated.timing(fadeAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showWarning, hasHeadphones, isInitialized, fadeAnim]);

  // Memoize the detailed info handler
  const showDetailedInfo = useCallback(() => {
    if (error) {
      Alert.alert(
        '❌ Detection Error',
        `Failed to detect headphones: ${error}`,
        [
          { text: 'Retry', onPress: checkHeadphones },
          { text: 'Continue anyway', style: 'cancel' }
        ]
      );
      return;
    }

    const message = hasHeadphones
      ? `✅ Connected: ${deviceName}\nType: ${deviceType === 'bluetooth' ? 'Bluetooth' : 'Wired'}`
      : `🎧 No headphones detected.\n\nFor the best experience:\n• Use headphones to avoid audio feedback\n• Ensure your device volume is appropriate\n• Consider using wireless earbuds for mobility`;

    Alert.alert(
      hasHeadphones ? 'Headphones Connected' : 'Headphones Recommended',
      message,
      hasHeadphones 
        ? [{ text: 'OK' }]
        : [
            { text: 'Continue anyway', style: 'cancel' },
            { text: 'Check again', onPress: checkHeadphones }
          ]
    );
  }, [error, hasHeadphones, deviceName, deviceType, checkHeadphones]);

  // Memoize styles to prevent unnecessary re-renders
  const bannerStyle = useMemo(() => [
    styles.banner,
    error && styles.errorBanner
  ], [error]);

  const mainTextStyle = useMemo(() => [
    styles.mainText,
    error && styles.errorText
  ], [error]);

  const containerStyle = useMemo(() => [
    styles.container,
    style,
    { opacity: fadeAnim }
  ], [style, fadeAnim]);

  // Don't render if headphones are connected or warning is disabled
  if (!showWarning || hasHeadphones || !isInitialized) {
    return null;
  }

  return (
    <Animated.View style={containerStyle}>
      <TouchableOpacity
        style={bannerStyle}
        onPress={showDetailedInfo}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={error ? "warning" : "headset"}
            size={20}
            color={error ? "#FF6B6B" : "#FF9500"}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={mainTextStyle}>
            {error ? 'Detection failed' : 'Headphones recommended'}
          </Text>
          <Text style={styles.subText}>
            {error ? 'Tap to retry' : 'Tap for more info'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={checkHeadphones}
          style={styles.refreshButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="refresh" size={16} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 10 : 60,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderColor: '#FF9500',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: '#FF6B6B',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  mainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    marginBottom: 2,
  },
  errorText: {
    color: '#FF6B6B',
  },
  subText: {
    fontSize: 12,
    color: '#666',
  },
  refreshButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default HeadphoneStatus;