// components/WebCamera.tsx
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
      console.log('🔍 Checking camera and microphone availability...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices API not supported in this browser');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      console.log('📱 Available devices:', { video: videoDevices.length, audio: audioDevices.length });
      setDebugInfo(`Found ${videoDevices.length} camera(s) and ${audioDevices.length} microphone(s)`);

      if (videoDevices.length === 0) {
        throw new Error('No camera devices found on this device');
      }

      if (audioDevices.length === 0) {
        console.warn('⚠️ No microphone found - recording will be video only');
      }

      return { videoDevices, audioDevices };
    } catch (error) {
      console.error('❌ Device availability check failed:', error);
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
      console.log('🌐 Initializing web camera with audio...');
      
      const { audioDevices } = await checkCameraAvailability();

      // Try different constraint configurations, prioritizing audio + video
      const constraintOptions = [
        {
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        },
        {
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        },
        {
          video: { facingMode: 'user' }, 
          audio: true 
        },
        {
          video: true, 
          audio: true 
        },
        // Fallback to video only if audio fails
        {
          video: true, 
          audio: false 
        }
      ];

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;
      let usedAudio = false;

      for (let i = 0; i < constraintOptions.length; i++) {
        try {
          console.log(`🎥 Attempting camera access with configuration ${i + 1}...`);
          setDebugInfo(`Trying camera config ${i + 1}/${constraintOptions.length}`);
          stream = await navigator.mediaDevices.getUserMedia(constraintOptions[i]);
          
          // Check if we got audio track
          const audioTracks = stream.getAudioTracks();
          const videoTracks = stream.getVideoTracks();
          usedAudio = audioTracks.length > 0;
          
          console.log(`✅ Camera access successful with configuration ${i + 1}`);
          console.log(`📊 Stream tracks: ${videoTracks.length} video, ${audioTracks.length} audio`);
          setDebugInfo(`Camera ready! Video: ${videoTracks.length}, Audio: ${audioTracks.length}`);
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

      // Log stream details
      stream.getTracks().forEach(track => {
        console.log(`🎵 Track: ${track.kind} - ${track.label} - enabled: ${track.enabled}`);
      });

      streamRef.current = stream;

      if (videoRef.current) {
        console.log('📺 Setting up video element...');
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.log);
      }

      console.log('🚀 Stream ready, triggering callback');
      setHasPermission(true);
      setDebugInfo(`Camera ready! ${usedAudio ? 'With audio' : 'Video only'}`);
      onCameraReady();
    } catch (error) {
      console.error('❌ Failed to initialize camera:', error);
      setHasPermission(false);
      
      let errorMessage = 'Failed to access camera and microphone';
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          errorMessage = 'Camera or microphone not found. Please check your devices.';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera and microphone access denied. Please allow access and refresh.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera or microphone is busy. Close other applications and try again.';
        } else if (error.message.includes('Media devices API not supported')) {
          errorMessage = 'Media recording not supported. Please use Chrome, Firefox, or Safari.';
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
      console.log('🎥 Starting web recording with audio...');
      logState('START_RECORDING');
      
      // Check available tracks
      const audioTracks = streamRef.current.getAudioTracks();
      const videoTracks = streamRef.current.getVideoTracks();
      console.log(`📊 Starting recording with ${videoTracks.length} video tracks and ${audioTracks.length} audio tracks`);

      // Preferred MIME types that support audio
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus', 
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
      ];

      let mediaRecorder: MediaRecorder | null = null;
      let selectedMimeType = '';

      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          console.log(`📼 Using MIME type: ${mimeType}`);
          selectedMimeType = mimeType;
          mediaRecorder = new MediaRecorder(streamRef.current, { 
            mimeType,
            audioBitsPerSecond: 128000,
            videoBitsPerSecond: 2500000
          });
          break;
        }
      }

      if (!mediaRecorder) {
        console.log('📼 Using default MediaRecorder settings');
        mediaRecorder = new MediaRecorder(streamRef.current);
        selectedMimeType = 'default';
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
        
        const videoBlob = new Blob(chunks, { type: selectedMimeType || 'video/webm' });
        console.log(`📁 Created video blob: ${videoBlob.size} bytes, type: ${videoBlob.type}`);
        
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
        logState('RECORDING_STARTED', { mimeType: selectedMimeType });
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
        <Text style={styles.errorTitle}>Camera/Microphone Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.errorHint}>
          Troubleshooting tips:{'\n'}
          • Allow camera AND microphone permissions{'\n'}
          • Close other apps using camera/microphone{'\n'}
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
          {isInitializing ? 'Initializing camera and microphone...' : 'Waiting for camera...'}
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
      {/* Audio indicator */}
      {streamRef.current && streamRef.current?.getAudioTracks().length > 0 && (
        <View style={styles.audioIndicator}>
          <Text style={styles.audioText}>🎤</Text>
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

  audioIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  audioText: {
    fontSize: 16,
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