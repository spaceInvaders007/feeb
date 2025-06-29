import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import type { CameraRecordingOptions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

export default function FeebCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  const handleRecord = async () => {
    if (!cameraRef.current) return;

    if (isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      try {
        const recordingOptions: CameraRecordingOptions = {
          // You can add options here if needed
        };
        const video = await cameraRef.current.recordAsync(recordingOptions);
      } catch (error) {
        console.error('Recording failed:', error);
      } finally {
        setIsRecording(false);
      }
    }
  };

  if (!permission) {
    // Camera permissions are still loading
    return <Text>Loading...</Text>;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="front"
        mode="video"
      >
        <TouchableOpacity style={styles.button} onPress={handleRecord}>
          <Ionicons
            name={isRecording ? 'square' : 'videocam'}
            size={32}
            color="white"
          />
        </TouchableOpacity>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  permissionButton: {
    backgroundColor: '#00CFFF',
    padding: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#00CFFF',
    padding: 14,
    borderRadius: 40,
  },
});