import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from 'expo-video';

const screenWidth = Dimensions.get("window").width;

export default function ContentsScreen() {
  const navigation = useNavigation<any>();

  const [videoStarted, setVideoStarted] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  const videoUri = "https://samplelib.com/lib/preview/mp4/sample-5s.mp4";

  // Better thumbnail URLs that are more reliable
  const thumbnailUri = thumbnailError 
    ? 'https://picsum.photos/640/360' // Fallback to Lorem Picsum
    : 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=640&h=360&fit=crop'; // Unsplash video thumbnail

  // Setup video player
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
    player.muted = false;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Contents</Text>
      <View style={styles.card}>
        <View style={styles.userRow}>
          <Image
            source={{ uri: "https://picsum.photos/100/100?random=1" }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.username}>
              Lilian Espech • <Text style={styles.follow}>Following</Text>
            </Text>
            <Text style={styles.location}>Los Angeles, USA</Text>
          </View>
          <Text style={styles.time}>1 min ago</Text>
        </View>

        {/* Thumbnail or video */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate("RecordReaction", { videoUri })}
          style={styles.videoWrapper}
        >
          {videoStarted ? (
            <VideoView
              style={styles.video}
              player={player}
              allowsFullscreen={true}
              allowsPictureInPicture={false}
              showsTimecodes={true}
            />
          ) : (
            <View style={styles.thumbnailContainer}>
              {/* Thumbnail image */}
              <Image 
                source={{ uri: thumbnailUri }} 
                style={styles.thumbnail}
                resizeMode="cover"
                onError={() => {
                  console.log('Thumbnail failed to load, trying fallback');
                  setThumbnailError(true);
                }}
                onLoad={() => {
                  console.log('Thumbnail loaded successfully');
                }}
              />
              
              {/* Overlay with play button */}
              <View style={styles.feebOverlay}>
                <View style={styles.playButton}>
                  <Ionicons name="videocam" size={36} color="white" />
                </View>
                <Text style={styles.feebText}>Tap to Feeb it</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.caption}>231 ❤️ · 76 🔁 · +41 reactions</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  card: { marginBottom: 24 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  username: { fontWeight: "bold" },
  follow: { color: "#00CFFF" },
  location: { fontSize: 12, color: "#666" },
  time: { marginLeft: "auto", fontSize: 12, color: "#aaa" },
  videoWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f0f0f0", // Light gray background as fallback
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  thumbnailContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  feebOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)", // Semi-transparent overlay
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 207, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  feebText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  caption: { marginTop: 8, fontSize: 14, color: "#444" },
});