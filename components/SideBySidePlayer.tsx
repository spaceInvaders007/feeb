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

  // Create two players
  const originalPlayer = useVideoPlayer(originalVideoUri, (player) => {
    player.loop = false;
    player.muted = false;
  });
  const reactionPlayer = useVideoPlayer(reactionVideoUri, (player) => {
    player.loop = false;
    player.muted = true;
  });

  // When both players are ready, capture duration
  useEffect(() => {
    const sub = originalPlayer.addListener("statusChange", (status) => {
      if (status.status === "readyToPlay" && originalPlayer.duration > 0) {
        setDuration(originalPlayer.duration);
      }
    });
    return () => sub.remove();
  }, [originalPlayer]);

  // Sync play/pause
  useEffect(() => {
    if (!visible) return;
    if (isPlaying) {
      originalPlayer.play();
      reactionPlayer.play();
      if (isWebBlob && reactionVideoUri.startsWith("data:")) {
        document
          .querySelectorAll('video[src^="data:video"]')
          .forEach((v: any) => {
            if (v.src === reactionVideoUri) {
              v.currentTime = originalPlayer.currentTime;
              v.play();
            }
          });
      }
    } else {
      originalPlayer.pause();
      reactionPlayer.pause();
      if (isWebBlob && reactionVideoUri.startsWith("data:")) {
        document
          .querySelectorAll('video[src^="data:video"]')
          .forEach((v: any) => {
            if (v.src === reactionVideoUri) v.pause();
          });
      }
    }
  }, [isPlaying, visible, originalPlayer, reactionPlayer]);

  // Keep our slider in sync
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      if (originalPlayer.playing) {
        const t = originalPlayer.currentTime;
        setCurrentTime(t);
        if (Math.abs(t - reactionPlayer.currentTime) > 0.2) {
          reactionPlayer.currentTime = t;
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [visible, originalPlayer, reactionPlayer]);

  // Reset on open
  useEffect(() => {
    if (visible) {
      originalPlayer.currentTime = 0;
      reactionPlayer.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [visible]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${sec}`;
  };
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.timestamp}>{new Date(createdAt).toLocaleString()}</Text>
        </View>

        {/* Two videos stacked vertically */}
        <View style={styles.videoWrapper}>
          <VideoView style={styles.video} player={originalPlayer} showsTimecodes={false} />
        </View>
        <View style={styles.videoWrapper}>
          {isWebBlob && reactionVideoUri.startsWith("data:") ? (
            <video
              src={reactionVideoUri}
              style={styles.video as any}
              muted
              onTimeUpdate={(e) => {
                const v = e.currentTarget as HTMLVideoElement;
                if (Math.abs(originalPlayer.currentTime - v.currentTime) > 0.2) {
                  v.currentTime = originalPlayer.currentTime;
                }
              }}
            />
          ) : (
            <VideoView style={styles.video} player={reactionPlayer} showsTimecodes={false} />
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.progressRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <TouchableOpacity
              style={styles.progressBarContainer}
              activeOpacity={1}
              onPress={(e) => {
                const x = e.nativeEvent.locationX;
                const w = screenWidth - 80; // leave space for time labels
                const pct = Math.min(1, Math.max(0, x / w));
                const t = pct * duration;
                originalPlayer.currentTime = t;
                reactionPlayer.currentTime = t;
                setCurrentTime(t);
              }}
            >
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </TouchableOpacity>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity onPress={() => {
              originalPlayer.currentTime = 0;
              reactionPlayer.currentTime = 0;
              setCurrentTime(0);
            }}>
              <Ionicons name="play-back" size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsPlaying((p) => !p)}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={36} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              originalPlayer.currentTime = duration;
              reactionPlayer.currentTime = duration;
              setCurrentTime(duration);
            }}>
              <Ionicons name="play-forward" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#111" },
  closeButton: { marginRight: 16 },
  timestamp: { color: "#ccc" },

  videoWrapper: { flex: 1, backgroundColor: "#000" },
  video: { width: "100%", height: "100%" },

  controls: { padding: 16, backgroundColor: "#111" },
  progressRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  timeText: { color: "#fff", width: 40, textAlign: "center" },
  progressBarContainer: { flex: 1 },
  progressBar: { height: 4, backgroundColor: "#333", borderRadius: 2 },
  progressFill: { height: "100%", backgroundColor: "#00CFFF" },

  buttonsRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
});
