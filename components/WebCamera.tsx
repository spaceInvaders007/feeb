import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';

interface WebCameraProps {
  isRecording: boolean;
  onCameraReady: () => void;
  onRecordingComplete: (videoBlob: Blob) => void;
}

export default function WebCamera({ isRecording, onCameraReady, onRecordingComplete }: WebCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStateRef = useRef<'idle' | 'starting' | 'recording' | 'stopping'>('idle');
  
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Enhanced logging
  const logState = useCallback((action: string, extra?: any) => {
    console.log(`📷 [WebCamera-${action}]`, {
      isRecording,
      recordingState: recordingStateRef.current,
      hasMediaRecorder: !!mediaRecorderRef.current,
      mediaRecorderState: mediaRecorderRef.current?.state || 'none',
      hasStream: !!streamRef.current,
      ...extra
    });
  }, [isRecording]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => {
        initializeCamera();
      }, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && hasPermission && streamRef.current && videoRef.current) {
      console.log('🔗 Setting up video element with existing stream...');
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.log);
    }
  }, [hasPermission]);

  // Enhanced recording state management
  useEffect(() => {
    if (Platform.OS === 'web' && hasPermission) {
      logState('RECORDING_PROP_CHANGED');
      
      if (isRecording && recordingStateRef.current === 'idle') {
        startRecording();
      } else if (!isRecording && recordingStateRef.current === 'recording') {
        stopRecording();
      }
    }
  }, [isRecording, hasPermission, logState]);

  const checkCameraAvailability = async () => {
    try {
      console.log('🔍 Checking camera availability...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices API not supported in this browser');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('📱 Available video devices:', videoDevices.length);
      setDebugInfo(`Found ${videoDevices.length} camera(s)`);

      if (videoDevices.length === 0) {
        throw new Error('No camera devices found on this device');
      }

      return videoDevices;
    } catch (error) {
      console.error('❌ Camera availability check failed:', error);
      throw error;
    }
  };

  const initializeCamera = async () => {
    if (isInitializing) {
      console.log('⏳ Camera initialization already in progress...');
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);
      console.log('🌐 Initializing web camera...');
      
      await checkCameraAvailability();

      const constraintOptions = [
        {
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }, 
          audio: true 
        },
        {
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }, 
          audio: true 
        },
        {
          video: true, 
          audio: true 
        },
        {
          video: true, 
          audio: false 
        }
      ];

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;

      for (let i = 0; i < constraintOptions.length; i++) {
        try {
          console.log(`🎥 Attempting camera access with configuration ${i + 1}...`);
          setDebugInfo(`Trying camera config ${i + 1}/${constraintOptions.length}`);
          stream = await navigator.mediaDevices.getUserMedia(constraintOptions[i]);
          console.log(`✅ Camera access successful with configuration ${i + 1}`);
          setDebugInfo(`Camera access successful!`);
          break;
        } catch (err) {
          lastError = err as Error;
          console.log(`❌ Configuration ${i + 1} failed:`, err);
          setDebugInfo(`Config ${i + 1} failed: ${lastError.message}`);
          continue;
        }
      }

      if (!stream) {
        throw lastError || new Error('Failed to access camera with all configurations');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        console.log('📺 Setting up video element...');
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.log);
      }

      console.log('🚀 Stream ready, triggering callback');
      setHasPermission(true);
      setDebugInfo('Camera ready!');
      onCameraReady();
    } catch (error) {
      console.error('❌ Failed to initialize camera:', error);
      setHasPermission(false);
      
      let errorMessage = 'Failed to access camera';
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found. Please connect a camera and try again.';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access and refresh the page.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is busy or unavailable. Please close other applications using the camera.';
        } else if (error.message.includes('Media devices API not supported')) {
          errorMessage = 'Camera not supported in this browser. Please use Chrome, Firefox, or Safari.';
        } else if (error.message.includes('No camera devices found')) {
          errorMessage = 'No camera detected. Please connect a camera or check your device settings.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      console.error('❌ No stream available for recording');
      return;
    }

    if (recordingStateRef.current !== 'idle') {
      console.log('⚠️ Recording not in idle state, current:', recordingStateRef.current);
      return;
    }

    try {
      recordingStateRef.current = 'starting';
      console.log('🎥 Starting web recording...');
      logState('START_RECORDING');
      
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus', 
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
      ];

      let mediaRecorder: MediaRecorder | null = null;
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          console.log(`📼 Using MIME type: ${mimeType}`);
          mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
          break;
        }
      }

      if (!mediaRecorder) {
        mediaRecorder = new MediaRecorder(streamRef.current);
        console.log('📼 Using default MediaRecorder settings');
      }

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log(`📊 Recording chunk: ${event.data.size} bytes (State: ${recordingStateRef.current})`);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('🛑 Web recording stopped');
        logState('RECORDING_STOPPED', { chunksCount: chunks.length });
        
        const videoBlob = new Blob(chunks, { type: mediaRecorder?.mimeType || 'video/webm' });
        console.log(`📁 Created video blob: ${videoBlob.size} bytes`);
        
        recordingStateRef.current = 'idle';
        onRecordingComplete(videoBlob);
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        recordingStateRef.current = 'idle';
        logState('RECORDING_ERROR', { error: event });
      };

      mediaRecorder.onstart = () => {
        console.log('✅ MediaRecorder started');
        recordingStateRef.current = 'recording';
        logState('RECORDING_STARTED');
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      console.log('🎬 MediaRecorder.start() called');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      recordingStateRef.current = 'idle';
      logState('START_RECORDING_ERROR', { error });
      setError('Failed to start recording. Please try again.');
    }
  }, [logState, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    logState('STOP_RECORDING_CALLED');
    
    if (recordingStateRef.current !== 'recording') {
      console.log('⚠️ Not in recording state, current:', recordingStateRef.current);
      return;
    }

    if (!mediaRecorderRef.current) {
      console.log('⚠️ No MediaRecorder available');
      recordingStateRef.current = 'idle';
      return;
    }

    if (mediaRecorderRef.current.state !== 'recording') {
      console.log('⚠️ MediaRecorder not in recording state:', mediaRecorderRef.current.state);
      recordingStateRef.current = 'idle';
      return;
    }

    try {
      recordingStateRef.current = 'stopping';
      console.log('🛑 Stopping web recording...');
      logState('STOPPING_RECORDING');
      
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      recordingStateRef.current = 'idle';
      logState('STOP_RECORDING_ERROR', { error });
    }
  }, [logState]);

  const cleanup = () => {
    console.log('🧹 Cleaning up camera resources...');
    
    // Stop recording if active
    if (recordingStateRef.current === 'recording' && mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.log('Error stopping recorder during cleanup:', e);
      }
    }
    
    // Clean up stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 Stopped track: ${track.kind}`);
      });
      streamRef.current = null;
    }
    
    // Reset refs
    mediaRecorderRef.current = null;
    recordingStateRef.current = 'idle';
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Camera Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.errorHint}>
          Troubleshooting tips:{'\n'}
          • Check camera permissions in browser settings{'\n'}
          • Ensure no other apps are using the camera{'\n'}
          • Try refreshing the page{'\n'}
          • Use Chrome, Firefox, or Safari for best results
        </Text>
      </View>
    );
  }

  if (isInitializing || !hasPermission) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {isInitializing ? 'Initializing camera...' : 'Waiting for camera...'}
        </Text>
        {debugInfo ? (
          <Text style={styles.debugText}>{debugInfo}</Text>
        ) : null}
        {isInitializing ? (
          <Text 
            style={styles.retryButton}
            onPress={() => {
              console.log('🔄 Manual retry triggered');
              setIsInitializing(false);
              setTimeout(() => initializeCamera(), 100);
            }}
          >
            Tap to retry
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <video
        ref={videoRef}
        style={styles.video}
        autoPlay
        muted
        playsInline
      />
      
      {/* Debug info overlay */}
      {__DEV__ && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugOverlayText}>
            Recording: {recordingStateRef.current} | 
            MediaRecorder: {mediaRecorderRef.current?.state || 'none'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as any,
  debugOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
  },
  debugOverlayText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  errorHint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'left',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  debugText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  retryButton: {
    fontSize: 16,
    color: '#00CFFF',
    textAlign: 'center',
    marginTop: 20,
    textDecorationLine: 'underline',
    cursor: 'pointer',
  } as any,
});