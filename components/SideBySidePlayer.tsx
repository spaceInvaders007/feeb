import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SideBySidePlayerProps {
  visible: boolean;
  originalVideoUri: string;
  reactionVideoUri: string;
  onClose: () => void;
  feebId: string;
  createdAt: string;
  isWebBlob?: boolean;
}

export default function SideBySidePlayer({
  visible,
  originalVideoUri,
  reactionVideoUri,
  onClose,
  feebId,
  createdAt,
  isWebBlob
}: SideBySidePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [layout, setLayout] = useState<'side-by-side' | 'top-bottom'>('top-bottom');

  // DEBUG LOGGING - Log all props when component mounts
  useEffect(() => {
    if (visible) {
      console.log('🎬 SideBySidePlayer - Props received:', {
        visible,
        originalVideoUri,
        reactionVideoUri,
        feebId,
        createdAt,
        isWebBlob,
        platform: Platform.OS
      });
      
      console.log('🎬 SideBySidePlayer - URI Analysis:', {
        originalVideoUriLength: originalVideoUri?.length || 0,
        reactionVideoUriLength: reactionVideoUri?.length || 0,
        reactionVideoUriType: reactionVideoUri?.startsWith('data:') ? 'DATA_URL' : 
                               reactionVideoUri?.startsWith('file:') ? 'FILE_URL' : 
                               reactionVideoUri?.startsWith('http') ? 'HTTP_URL' : 'UNKNOWN',
        originalVideoUriType: originalVideoUri?.startsWith('http') ? 'HTTP_URL' : 'OTHER'
      });
    }
  }, [visible, originalVideoUri, reactionVideoUri, feebId, isWebBlob]);

  // Create video players
  const originalPlayer = useVideoPlayer(originalVideoUri, (player) => {
    player.loop = false;
    player.muted = false;
  });

  const reactionPlayer = useVideoPlayer(reactionVideoUri, (player) => {
    player.loop = false;
    player.muted = true; // Reaction is muted to avoid audio conflict
  });

  // DEBUG: Log player creation
  useEffect(() => {
    if (visible) {
      console.log('🎬 SideBySidePlayer - Players created:', {
        originalPlayerCreated: !!originalPlayer,
        reactionPlayerCreated: !!reactionPlayer
      });
    }
  }, [visible, originalPlayer, reactionPlayer]);

  // Sync players
  useEffect(() => {
    if (!visible) return;

    const syncVideos = () => {
      if (isPlaying) {
        console.log('🎬 SideBySidePlayer - Starting playback');
        originalPlayer.play();
        reactionPlayer.play();
        
        // Also control HTML video element if it exists
        if (isWebBlob && reactionVideoUri.startsWith('data:')) {
          const videoElements = document.querySelectorAll('video[src^="data:video"]');
          videoElements.forEach((video: any) => {
            if (video.src === reactionVideoUri) {
              console.log('🎬 SideBySidePlayer - Starting HTML video playback');
              video.currentTime = originalPlayer.currentTime;
              video.play().catch(console.error);
            }
          });
        }
      } else {
        console.log('🎬 SideBySidePlayer - Pausing playback');
        originalPlayer.pause();
        reactionPlayer.pause();
        
        // Also control HTML video element if it exists
        if (isWebBlob && reactionVideoUri.startsWith('data:')) {
          const videoElements = document.querySelectorAll('video[src^="data:video"]');
          videoElements.forEach((video: any) => {
            if (video.src === reactionVideoUri) {
              console.log('🎬 SideBySidePlayer - Pausing HTML video playback');
              video.pause();
            }
          });
        }
      }
    };

    syncVideos();
  }, [isPlaying, visible, originalPlayer, reactionPlayer, isWebBlob, reactionVideoUri]);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      console.log('🎬 SideBySidePlayer - Resetting players');
      originalPlayer.currentTime = 0;
      reactionPlayer.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [visible, originalPlayer, reactionPlayer]);

  // Track playback progress
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      if (originalPlayer && originalPlayer.playing) {
        setCurrentTime(originalPlayer.currentTime);
        
        // Keep videos in sync
        const timeDiff = Math.abs(originalPlayer.currentTime - reactionPlayer.currentTime);
        if (timeDiff > 0.2) { // 200ms tolerance
          reactionPlayer.currentTime = originalPlayer.currentTime;
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [visible, originalPlayer, reactionPlayer]);

  // Get duration
  useEffect(() => {
    const subscription = originalPlayer.addListener('statusChange', (status) => {
      console.log('🎬 SideBySidePlayer - Original player status:', status);
      if (status.status === 'readyToPlay' && originalPlayer.duration > 0) {
        setDuration(originalPlayer.duration);
        console.log('🎬 SideBySidePlayer - Duration set:', originalPlayer.duration);
      }
    });

    return () => subscription?.remove();
  }, [originalPlayer]);

  // DEBUG: Log reaction player status
  useEffect(() => {
    const subscription = reactionPlayer.addListener('statusChange', (status) => {
      console.log('🎬 SideBySidePlayer - Reaction player status:', status);
    });

    return () => subscription?.remove();
  }, [reactionPlayer]);

  const handlePlayPause = () => {
    console.log('🎬 SideBySidePlayer - Play/Pause clicked, current state:', isPlaying);
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (position: number) => {
    const newTime = (position / 100) * duration;
    console.log('🎬 SideBySidePlayer - Seeking to:', newTime);
    originalPlayer.currentTime = newTime;
    reactionPlayer.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleLayout = () => {
    const newLayout = layout === 'side-by-side' ? 'top-bottom' : 'side-by-side';
    console.log('🎬 SideBySidePlayer - Layout changed to:', newLayout);
    setLayout(newLayout);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Feeb Playback</Text>
            <Text style={styles.headerSubtitle}>{new Date(createdAt).toLocaleDateString()}</Text>
          </View>

          <TouchableOpacity onPress={toggleLayout} style={styles.layoutButton}>
            <Ionicons 
              name={layout === 'side-by-side' ? 'phone-portrait' : 'phone-landscape'} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        </View>

        {/* Video Container */}
        <View style={[
          styles.videoContainer,
          layout === 'side-by-side' ? styles.sideBySideLayout : styles.topBottom
        ]}>
          {/* Original Video */}
          <View style={[
            styles.videoWrapper,
            layout === 'side-by-side' ? styles.halfWidth : styles.halfHeight
          ]}>
            <Text style={styles.videoLabel}>Original Video</Text>
            <VideoView
              style={styles.video}
              player={originalPlayer}
              allowsFullscreen={false}
              allowsPictureInPicture={false}
              showsTimecodes={false}
            />
          </View>

          {/* Reaction Video */}
          <View style={[
            styles.videoWrapper,
            layout === 'side-by-side' ? styles.halfWidth : styles.halfHeight
          ]}>
            <Text style={styles.videoLabel}>Your Reaction</Text>
            {isWebBlob && reactionVideoUri.startsWith('data:') ? (
              <video
                src={reactionVideoUri}
                style={styles.video as any}
                muted={false} // Enable audio for debugging
                controls // Show controls for debugging
                autoPlay={isPlaying}
                loop={false}
                onTimeUpdate={(e) => {
                  // Sync with original if needed
                  const video = e.target as HTMLVideoElement;
                  const timeDiff = Math.abs(originalPlayer.currentTime - video.currentTime);
                  if (timeDiff > 0.2 && originalPlayer.playing) {
                    video.currentTime = originalPlayer.currentTime;
                  }
                }}
                onError={(e) => {
                  console.error('🎬 SideBySidePlayer - Reaction video error:', e);
                }}
                onLoadedData={() => {
                  console.log('🎬 SideBySidePlayer - Reaction video loaded successfully');
                }}
                onCanPlay={() => {
                  console.log('🎬 SideBySidePlayer - Reaction video can play');
                }}
                onLoadStart={() => {
                  console.log('🎬 SideBySidePlayer - Reaction video load started');
                }}
              />
            ) : (
              <VideoView
                style={styles.video}
                player={reactionPlayer}
                allowsFullscreen={false}
                allowsPictureInPicture={false}
                showsTimecodes={false}
              />
            )}
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <TouchableOpacity 
              style={styles.progressBarContainer}
              onPress={(event) => {
                const { locationX } = event.nativeEvent;
                const containerWidth = screenWidth - 120; // Account for time labels
                const position = Math.max(0, Math.min(100, (locationX / containerWidth) * 100));
                handleSeek(position);
              }}
              activeOpacity={1}
            >
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
                <View style={[styles.progressThumb, { left: `${progress}%` }]} />
              </View>
            </TouchableOpacity>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Play Controls */}
          <View style={styles.playControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => handleSeek(0)}
            >
              <Ionicons name="play-back" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayPause}
            >
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={32} 
                color="white" 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => handleSeek(100)}
            >
              <Ionicons name="play-forward" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Layout: {layout === 'side-by-side' ? 'Side by Side' : 'Top & Bottom'}
            </Text>
            {isWebBlob && (
              <Text style={styles.infoText}>Platform: Web</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#ccc',
    fontSize: 14,
  },
  layoutButton: {
    padding: 8,
  },
  videoContainer: {
    flex: 1,
    padding: 10,
  },
  sideBySideLayout: {
    flexDirection: 'row',
  },
  topBottom: {
    flexDirection: 'column',
  },
  videoWrapper: {
    position: 'relative',
    backgroundColor: '#111',
    borderRadius: 8,
    overflow: 'hidden',
    margin: 5,
  },
  halfWidth: {
    flex: 1,
  },
  halfHeight: {
    flex: 1,
  },
  videoLabel: {
    position: 'absolute',
    top: 10,
    left: 10,
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controls: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00CFFF',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    backgroundColor: '#00CFFF',
    borderRadius: 8,
    marginLeft: -8,
  },
  playControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  controlButton: {
    padding: 15,
    marginHorizontal: 20,
  },
  playButton: {
    backgroundColor: '#00CFFF',
    borderRadius: 30,
    padding: 15,
    marginHorizontal: 20,
  },
  infoContainer: {
    alignItems: 'center',
  },
  infoText: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
});