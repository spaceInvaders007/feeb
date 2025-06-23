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
import { Video, ResizeMode } from "expo-av";

const screenWidth = Dimensions.get("window").width;

export default function ContentsScreen() {
  const navigation = useNavigation<any>();

  const [videoStarted, setVideoStarted] = useState(false);

  const videoUri = "https://samplelib.com/lib/preview/mp4/sample-5s.mp4";

const thumbnailUri = 'https://via.placeholder.com/640x360.png?text=Sample+Video';

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Contents</Text>
      <View style={styles.card}>
        <View style={styles.userRow}>
          <Image
            source={{ uri: "https://placekitten.com/100/100" }}
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
            <Video
              source={{ uri: videoUri }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          ) : (
            <>
              <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} />
              <View style={styles.feebOverlay}>
                <Ionicons name="videocam" size={36} color="white" />
                <Text style={styles.feebText}>Tap to Feeb it</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.caption}>231 ❤️ · 76 🔁 · +41 reactions</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
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
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
    resizeMode: ResizeMode.CONTAIN, // already correct
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  feebOverlay: {
    position: "absolute",
    top: "35%",
    left: "30%",
    alignItems: "center",
    justifyContent: "center",
  },
  feebText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  caption: { marginTop: 8, fontSize: 14, color: "#444" },
});
