// components/SideBySidePlayer.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Modal,
  Platform,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");

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
  isWebBlob,
}: SideBySidePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Create two players with different audio settings
  const originalPlayer = useVideoPlayer(originalVideoUri, (player) => {
    player.loop = false;
    player.muted = true; // MUTE the original video - we only want reaction audio
  });
  
  const reactionPlayer = useVideoPlayer(reactionVideoUri, (player) => {
    player.loop = false;
    player.muted = false; // UNMUTE the reaction video - this has the user's audio
  });

  // When both players are ready, capture duration from the original video
  useEffect(() => {
    const sub = originalPlayer.addListener("statusChange", (status) => {
      if (status.status === "readyToPlay" && originalPlayer.duration > 0) {
        setDuration(originalPlayer.duration);
        console.log('📏 Original video duration:', originalPlayer.duration);
      }
    });
    return () => sub.remove();
  }, [originalPlayer]);

  // Log when reaction player is ready
  useEffect(() => {
    const sub = reactionPlayer.addListener("statusChange", (status) => {
      if (status.status === "readyToPlay") {
        console.log('🎬 Reaction video ready, duration:', reactionPlayer.duration);
      }
    });
    return () => sub.remove();
  }, [reactionPlayer]);

  // Sync play/pause
  useEffect(() => {
    if (!visible) return;
    
    console.log('🎵 Audio settings:', {
      originalMuted: originalPlayer.muted,
      reactionMuted: reactionPlayer.muted,
      isPlaying
    });
    
    if (isPlaying) {
      originalPlayer.play();
      reactionPlayer.play();
      
      // For web data URLs, also control the HTML video element
      if (isWebBlob && reactionVideoUri.startsWith("data:")) {
        const videoElements = document.querySelectorAll('video[src^="data:video"]') as NodeListOf<HTMLVideoElement>;
        videoElements.forEach((video) => {
          if (video.src === reactionVideoUri) {
            video.currentTime = originalPlayer.currentTime;
            video.muted = false; // Ensure web video audio is enabled
            video.play().catch(console.error);
            console.log('🌐 Web video audio enabled, muted:', video.muted);
          }
        });
      }
    } else {
      originalPlayer.pause();
      reactionPlayer.pause();
      
      if (isWebBlob && reactionVideoUri.startsWith("data:")) {
        const videoElements = document.querySelectorAll('video[src^="data:video"]') as NodeListOf<HTMLVideoElement>;
        videoElements.forEach((video) => {
          if (video.src === reactionVideoUri) {
            video.pause();
          }
        });
      }
    }
  }, [isPlaying, visible, originalPlayer, reactionPlayer, isWebBlob, reactionVideoUri]);

  // Keep videos in sync
  useEffect(() => {
    if (!visible) return;
    
    const syncInterval = setInterval(() => {
      if (originalPlayer.playing) {
        const originalTime = originalPlayer.currentTime;
        setCurrentTime(originalTime);
        
        // Sync reaction video to original video timing
        const timeDiff = Math.abs(originalTime - reactionPlayer.currentTime);
        if (timeDiff > 0.3) { // Allow 300ms tolerance
          console.log(`⏱️ Syncing videos: original=${originalTime.toFixed(2)}s, reaction=${reactionPlayer.currentTime.toFixed(2)}s`);
          reactionPlayer.currentTime = originalTime;
          
          // Also sync web video if applicable
          if (isWebBlob && reactionVideoUri.startsWith("data:")) {
            const videoElements = document.querySelectorAll('video[src^="data:video"]') as NodeListOf<HTMLVideoElement>;
            videoElements.forEach((video) => {
              if (video.src === reactionVideoUri && Math.abs(video.currentTime - originalTime) > 0.3) {
                video.currentTime = originalTime;
              }
            });
          }
        }
      }
    }, 100);
    
    return () => clearInterval(syncInterval);
  }, [visible, originalPlayer, reactionPlayer, isWebBlob, reactionVideoUri]);

  // Reset on open
  useEffect(() => {
    if (visible) {
      console.log('🔄 Resetting player state');
      originalPlayer.currentTime = 0;
      reactionPlayer.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
      
      // Ensure correct audio settings
      originalPlayer.muted = true;
      reactionPlayer.muted = false;
      
      console.log('🎵 Reset audio settings - Original muted:', originalPlayer.muted, 'Reaction muted:', reactionPlayer.muted);
    }
  }, [visible, originalPlayer, reactionPlayer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: any) => {
    const x = e.nativeEvent.locationX;
    const containerWidth = screenWidth - 80; // Space for time labels
    const percentage = Math.min(1, Math.max(0, x / containerWidth));
    const newTime = percentage * duration;
    
    console.log('⏭️ Seeking to:', newTime.toFixed(2), 's');
    
    originalPlayer.currentTime = newTime;
    reactionPlayer.currentTime = newTime;
    setCurrentTime(newTime);
    
    // Also seek web video
    if (isWebBlob && reactionVideoUri.startsWith("data:")) {
      const videoElements = document.querySelectorAll('video[src^="data:video"]') as NodeListOf<HTMLVideoElement>;
      videoElements.forEach((video) => {
        if (video.src === reactionVideoUri) {
          video.currentTime = newTime;
        }
      });
    }
  };

  const handleRestart = () => {
    console.log('⏮️ Restarting videos');
    originalPlayer.currentTime = 0;
    reactionPlayer.currentTime = 0;
    setCurrentTime(0);
    
    if (isWebBlob && reactionVideoUri.startsWith("data:")) {
      const videoElements = document.querySelectorAll('video[src^="data:video"]') as NodeListOf<HTMLVideoElement>;
      videoElements.forEach((video) => {
        if (video.src === reactionVideoUri) {
          video.currentTime = 0;
        }
      });
    }
  };

  const handleEnd = () => {
    console.log('⏭️ Jumping to end');
    const endTime = duration;
    originalPlayer.currentTime = endTime;
    reactionPlayer.currentTime = endTime;
    setCurrentTime(endTime);
    
    if (isWebBlob && reactionVideoUri.startsWith("data:")) {
      const videoElements = document.querySelectorAll('video[src^="data:video"]') as NodeListOf<HTMLVideoElement>;
      videoElements.forEach((video) => {
        if (video.src === reactionVideoUri) {
          video.currentTime = endTime;
        }
      });
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.timestamp}>{new Date(createdAt).toLocaleString()}</Text>
            <Text style={styles.audioInfo}>🎵 Reaction audio only</Text>
          </View>
        </View>

        {/* Original video (top half) - MUTED */}
        <View style={styles.videoWrapper}>
          <VideoView 
            style={styles.video} 
            player={originalPlayer} 
            showsTimecodes={false} 
          />
          <View style={styles.videoLabel}>
            <Text style={styles.labelText}>Original (Silent)</Text>
          </View>
        </View>

        {/* Reaction video (bottom half) - WITH AUDIO */}
        <View style={styles.videoWrapper}>
          {isWebBlob && reactionVideoUri.startsWith("data:") ? (
            <video
              src={reactionVideoUri}
              style={styles.video as any}
              muted={false} // Ensure web video has audio
              onTimeUpdate={(e) => {
                const video = e.currentTarget as HTMLVideoElement;
                const timeDiff = Math.abs(originalPlayer.currentTime - video.currentTime);
                if (timeDiff > 0.3) {
                  video.currentTime = originalPlayer.currentTime;
                }
              }}
              onLoadedMetadata={(e) => {
                const video = e.currentTarget as HTMLVideoElement;
                // Check if video has audio - use a more compatible approach
                console.log('🌐 Web video loaded, checking for audio tracks');
              }}
            />
          ) : (
            <VideoView 
              style={styles.video} 
              player={reactionPlayer} 
              showsTimecodes={false} 
            />
          )}
          <View style={styles.videoLabel}>
            <Text style={styles.labelText}>Your Reaction (With Audio)</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Progress bar */}
          <View style={styles.progressRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <TouchableOpacity
              style={styles.progressBarContainer}
              activeOpacity={1}
              onPress={handleSeek}
            >
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </TouchableOpacity>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Control buttons */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity onPress={handleRestart}>
              <Ionicons name="play-back" size={28} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setIsPlaying(prev => !prev)}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={36} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleEnd}>
              <Ionicons name="play-forward" size={28} color="white" />
            </TouchableOpacity>
          </View>
          
          {/* Audio indicator */}
          <View style={styles.audioIndicator}>
            <Ionicons name="volume-high" size={16} color="#00CFFF" />
            <Text style={styles.audioIndicatorText}>Reaction audio enabled</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#000" 
  },
  
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 12, 
    backgroundColor: "#111" 
  },
  closeButton: { 
    marginRight: 16 
  },
  headerInfo: {
    flex: 1
  },
  timestamp: { 
    color: "#ccc",
    fontSize: 14
  },
  audioInfo: {
    color: "#00CFFF",
    fontSize: 12,
    marginTop: 2
  },

  videoWrapper: { 
    flex: 1, 
    backgroundColor: "#000",
    position: "relative"
  },
  video: { 
    width: "100%", 
    height: "100%" 
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

  controls: { 
    padding: 16, 
    backgroundColor: "#111" 
  },
  progressRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 12 
  },
  timeText: { 
    color: "#fff", 
    width: 40, 
    textAlign: "center",
    fontSize: 12
  },
  progressBarContainer: { 
    flex: 1,
    paddingHorizontal: 8
  },
  progressBar: { 
    height: 4, 
    backgroundColor: "#333", 
    borderRadius: 2 
  },
  progressFill: { 
    height: "100%", 
    backgroundColor: "#00CFFF",
    borderRadius: 2
  },

  buttonsRow: { 
    flexDirection: "row", 
    justifyContent: "space-around", 
    alignItems: "center",
    marginBottom: 8
  },
  
  audioIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8
  },
  audioIndicatorText: {
    color: "#00CFFF",
    fontSize: 12,
    marginLeft: 4
  }
});