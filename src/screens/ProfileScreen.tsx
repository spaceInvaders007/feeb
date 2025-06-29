import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import SideBySidePlayer from "../components/SideBySidePlayer";
import { Feeb, FeebStorage } from "../utils/FeebStorage";

const screenWidth = Dimensions.get("window").width;
const SPACING = 8;
const COLUMN_COUNT = 2;
const ITEM_SIZE = (screenWidth - SPACING * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

const user = {
  avatarUri: "https://randomuser.me/api/portraits/women/44.jpg",
  name: "Lindsey Horan",
  handle: "@linHoran",
  followers: "87k",
  following: "42k",
  likes: "12.3k",
};

interface ContentItem {
  id: string;
  uri: string;
}

const sampleContents: ContentItem[] = [
  { id: "c1", uri: "https://placekitten.com/304/304" },
  { id: "c2", uri: "https://placekitten.com/305/305" },
  { id: "c3", uri: "https://placekitten.com/306/306" },
  { id: "c4", uri: "https://placekitten.com/307/307" },
];

interface FeebItemState {
  id: string;
  displayUri: string;
  loading: boolean;
  error: boolean;
}

function FullscreenVideoModal({
  visible,
  feeb,
  onClose,
}: {
  visible: boolean;
  feeb: (Feeb & { displayUri?: string }) | null;
  onClose: () => void;
}) {
  if (!visible || !feeb) return null;

  console.log("🎬 FullscreenVideoModal - Opening with:", {
    originalVideoUri: feeb.originalVideoUri,
    reactionVideoUri: feeb.displayUri || feeb.uri,
    feebId: feeb.id,
    isWebBlob: feeb.isWebBlob,
  });

  return (
    <SideBySidePlayer
      visible={visible}
      originalVideoUri={feeb.originalVideoUri}
      reactionVideoUri={feeb.displayUri || feeb.uri}
      onClose={onClose}
      feebId={feeb.id}
      createdAt={feeb.createdAt}
      isWebBlob={feeb.isWebBlob}
    />
  );
}

function FeebVideoGridItem({
  feeb,
  displayState,
  onPress,
  onLongPress,
}: {
  feeb: Feeb;
  displayState?: FeebItemState;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const isWebVideo = Platform.OS === "web" && feeb.isWebBlob;
  const displayUri = displayState?.displayUri || feeb.uri;

  if (isWebVideo && displayState?.loading) {
    return (
      <TouchableOpacity
        style={[styles.gridItem, styles.loadingItem]}
        onPress={onPress}
      >
        <Text style={styles.loadingText}>Loading...</Text>
      </TouchableOpacity>
    );
  }

  if (displayState?.error) {
    return (
      <TouchableOpacity
        style={[styles.gridItem, styles.errorItem]}
        onPress={onLongPress}
        onLongPress={onLongPress}
      >
        <Ionicons name="warning" size={24} color="#ff6b6b" />
        <Text style={styles.errorText}>Invalid Video</Text>
        <Text style={styles.errorSubtext}>Tap to delete</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <View style={styles.videoContainer}>
        {isWebVideo && displayUri.startsWith("data:") ? (
          <video
            src={displayUri}
            style={styles.gridVideoWeb as any}
            muted
            loop
            preload="metadata"
            onMouseEnter={(e) => {
              const video = e.target as HTMLVideoElement;
              video.currentTime = 0;
              video.play().catch(console.log);
            }}
            onMouseLeave={(e) => {
              const video = e.target as HTMLVideoElement;
              video.pause();
            }}
            onError={(e) => {
              console.error("Grid video error for feeb:", feeb.id, e);
            }}
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam" size={32} color="#666" />
            <Text style={styles.videoPlaceholderText}>Tap to play</Text>
          </View>
        )}
      </View>

      <View style={styles.playButtonOverlay}>
        <View style={styles.playButtonCircle}>
          <Ionicons name="play" size={20} color="white" />
        </View>
      </View>

      <View style={styles.videoInfoOverlay}>
        <View style={styles.videoTypeIcon}>
          <Ionicons name="videocam" size={16} color="white" />
        </View>
        <Text style={styles.videoDate}>
          {new Date(feeb.createdAt).toLocaleDateString()}
        </Text>
        {isWebVideo && <Text style={styles.videoPlatform}>Web</Text>}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<"Feebs" | "Contents">("Feebs");
  const [userFeebs, setUserFeebs] = useState<Feeb[]>([]);
  const [feebDisplayStates, setFeebDisplayStates] = useState<FeebItemState[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [fullscreenFeeb, setFullscreenFeeb] = useState<
    (Feeb & { displayUri?: string }) | null
  >(null);

  const debugFeebFiles = async () => {
    console.log("🔍 ======= FEEB DEBUG START =======");
    try {
      const feebs = await FeebStorage.getAllFeebs();
      console.log(`🔍 Found ${feebs.length} feebs`);
      for (let i = 0; i < feebs.length; i++) {
        const feeb = feebs[i];
        console.log(`🔍 FEEB ${i + 1}:`, {
          id: feeb.id,
          uri: feeb.uri,
          originalVideoUri: feeb.originalVideoUri,
          isWebBlob: feeb.isWebBlob,
          createdAt: feeb.createdAt,
        });
        if (Platform.OS === "web" && feeb.isWebBlob) {
          try {
            console.log("🔍 Getting display URI for web feeb...");
            const displayUri = await FeebStorage.getFeebDisplayUri(feeb);
            if (displayUri) {
              console.log("🔍 Display URI: SUCCESS");
              console.log("🔍 URI length:", displayUri.length);
            } else {
              console.log("🔍 Display URI: FAILED - empty or null");
            }
          } catch (error: any) {
            console.log(
              "🔍 Error getting display URI:",
              error?.message || error
            );
          }
        }
        console.log("🔍 -------------------------");
      }
      Alert.alert(
        "Debug Info",
        `Found ${
          (await FeebStorage.getAllFeebs()).length
        } feebs. Check console.`
      );
    } catch (error: any) {
      console.error("🔍 Error in debug:", error);
      Alert.alert("Debug Error", error?.message || "Unknown error");
    }
    console.log("🔍 ======= FEEB DEBUG END =======");
  };

  useFocusEffect(
    useCallback(() => {
      loadUserFeebs();
    }, [])
  );

  const loadUserFeebs = async () => {
    try {
      setLoading(true);
      const feebs = await FeebStorage.getAllFeebs();
      setUserFeebs(feebs);
      await loadFeebDisplayUris(feebs);
    } catch (error: any) {
      console.error("Error loading feebs:", error);
      Alert.alert("Error", error?.message || "Failed to load your feebs");
    } finally {
      setLoading(false);
    }
  };

  const loadFeebDisplayUris = async (feebs: Feeb[]) => {
    try {
      const displayStates = await Promise.all(
        feebs.map(async (feeb) => {
          const state: FeebItemState = {
            id: feeb.id,
            displayUri: feeb.uri,
            loading: false,
            error: false,
          };
          if (Platform.OS === "web" && feeb.isWebBlob) {
            state.loading = true;
            const displayUri = await FeebStorage.getFeebDisplayUri(feeb);
            state.loading = false;
            if (displayUri) {
              state.displayUri = displayUri;
            } else {
              state.error = true;
              state.displayUri = "";
            }
          }
          return state;
        })
      );
      setFeebDisplayStates(displayStates);
    } catch (error: any) {
      console.error("Error loading display URIs:", error);
      Alert.alert("Error", error?.message || "Failed to load videos");
    }
  };

  const getFeebDisplayState = (feebId: string) =>
    feebDisplayStates.find((s) => s.id === feebId);

  const handlePlayFeeb = async (feeb: Feeb) => {
    try {
      let playableUri = feeb.uri;
      if (Platform.OS === "web" && feeb.isWebBlob) {
        const st = getFeebDisplayState(feeb.id);
        playableUri =
          st?.displayUri || (await FeebStorage.getFeebDisplayUri(feeb));
      }
      if (!playableUri) {
        Alert.alert("Error", "Video could not be loaded");
        return;
      }
      setFullscreenFeeb({ ...feeb, displayUri: playableUri });
    } catch (error: any) {
      console.error("Error playing feeb:", error);
      Alert.alert("Error", error?.message || "Failed to play video");
    }
  };

  const handleDeleteFeeb = (feebId: string) =>
    Alert.alert("Delete Feeb", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await FeebStorage.deleteFeeb(feebId);
            await loadUserFeebs();
            Alert.alert("Success", "Feeb deleted");
          } catch (error: any) {
            console.error("Error deleting feeb:", error);
            Alert.alert("Error", error?.message || "Failed to delete feeb");
          }
        },
      },
    ]);

  const handleCleanupInvalidFeebs = () =>
    Alert.alert(
      "Clean Up Invalid Videos",
      "This will remove feebs that cannot be displayed. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clean Up",
          style: "destructive",
          onPress: async () => {
            try {
              const invalid = feebDisplayStates
                .filter((s) => s.error)
                .map((s) => s.id);
              for (const id of invalid) {
                await FeebStorage.deleteFeeb(id);
              }
              await loadUserFeebs();
              Alert.alert("Success", `Removed ${invalid.length} items`);
            } catch (error: any) {
              console.error("Error cleaning up:", error);
              Alert.alert("Error", error?.message || "Failed to clean up");
            }
          },
        },
      ]
    );

  const renderFeebItem = ({ item }: { item: Feeb }) => (
    <FeebVideoGridItem
      feeb={item}
      displayState={getFeebDisplayState(item.id)}
      onPress={() => handlePlayFeeb(item)}
      onLongPress={() => handleDeleteFeeb(item.id)}
    />
  );

  const renderContentItem = ({ item }: { item: ContentItem }) => (
    <View style={styles.gridItem}>
      <Image source={{ uri: item.uri }} style={styles.gridImage} />
      <View style={styles.playIcon}>
        <Ionicons name="play-circle" size={24} color="white" />
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>My profile</Text>
      <Image source={{ uri: user.avatarUri }} style={styles.avatar} />
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.handle}>{user.handle}</Text>
      <View style={styles.statsRow}>
        {[
          { label: "Followers", value: user.followers },
          { label: "Following", value: user.following },
          { label: "Feebs", value: String(userFeebs.length) },
        ].map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.editButton}>
        <Text style={styles.editButtonText}>Edit profile</Text>
        <Ionicons name="pencil" size={20} color="#00CFFF" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.debugButton} onPress={debugFeebFiles}>
        <Text style={styles.debugButtonText}>Debug Feebs</Text>
        <Ionicons name="bug" size={20} color="#FF6B6B" />
      </TouchableOpacity>
      {Platform.OS === "web" && feebDisplayStates.some((s) => s.error) && (
        <TouchableOpacity
          style={styles.cleanupButton}
          onPress={handleCleanupInvalidFeebs}
        >
          <Text style={styles.cleanupButtonText}>Clean up invalid videos</Text>
          <Ionicons name="trash" size={16} color="#ff6b6b" />
        </TouchableOpacity>
      )}
      <View style={styles.tabRow}>
        {(["Feebs", "Contents"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabButton}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
              {tab === "Feebs" && ` (${userFeebs.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.dividerRow}>
        <View
          style={[
            styles.divider,
            activeTab === "Feebs" && styles.dividerActive,
          ]}
        />
        <View
          style={[
            styles.divider,
            activeTab === "Contents" && styles.dividerActive,
          ]}
        />
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="videocam-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No feebs yet</Text>
      <Text style={styles.emptySubtitle}>
        Record your first reaction to get started!
      </Text>
    </View>
  );

  if (loading && activeTab === "Feebs") {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading your feebs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {activeTab === "Feebs" ? (
        <FlatList
          data={userFeebs}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          renderItem={renderFeebItem}
        />
      ) : (
        <FlatList
          data={sampleContents}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          renderItem={renderContentItem}
        />
      )}
      <FullscreenVideoModal
        visible={!!fullscreenFeeb}
        feeb={fullscreenFeeb}
        onClose={() => setFullscreenFeeb(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /* ... your existing styles unchanged ... */
  container: { flex: 1, backgroundColor: "#fff" },
  listContent: { padding: SPACING, backgroundColor: "#fff" },
  headerContainer: { padding: SPACING, paddingBottom: SPACING * 2 },
  title: { fontSize: 28, fontWeight: "700" },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: "center",
    marginTop: SPACING,
  },
  name: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginTop: SPACING / 2,
  },
  handle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: SPACING,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: SPACING,
  },
  stat: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "600" },
  statLabel: { fontSize: 12, color: "#aaa" },
  editButton: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00CFFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: SPACING * 2,
  },
  editButtonText: {
    color: "#00CFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  debugButton: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF6B6B",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: SPACING * 2,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },
  debugButtonText: {
    color: "#FF6B6B",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  cleanupButton: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff6b6b",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: SPACING,
  },
  cleanupButtonText: {
    color: "#ff6b6b",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 6,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: SPACING / 2,
  },
  tabButton: { flex: 1, alignItems: "center", paddingVertical: 8 },
  tabText: { fontSize: 16, color: "#888" },
  tabTextActive: { color: "#000", fontWeight: "700" },
  dividerRow: { flexDirection: "row", height: 2, marginBottom: SPACING * 1.5 },
  divider: { flex: 1, backgroundColor: "transparent" },
  dividerActive: { backgroundColor: "#000" },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: SPACING / 2,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    position: "relative",
  },
  gridImage: { width: "100%", height: "100%" },
  videoContainer: { width: "100%", height: "100%", backgroundColor: "#000" },
  gridVideoWeb: { width: "100%", height: "100%", objectFit: "cover" },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  videoPlaceholderText: { color: "#888", fontSize: 12, marginTop: 8 },
  playButtonOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  playButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 207, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoInfoOverlay: { position: "absolute", bottom: 4, left: 4, right: 4 },
  videoTypeIcon: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "rgba(0, 207, 255, 0.8)",
    borderRadius: 8,
    padding: 2,
  },
  videoDate: {
    color: "white",
    fontSize: 10,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  videoPlatform: {
    color: "white",
    fontSize: 8,
    opacity: 0.8,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  playIcon: { position: "absolute", top: 8, right: 8 },
  loadingItem: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  loadingText: { color: "#666", fontSize: 12 },
  errorItem: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffebee",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
    fontWeight: "bold",
  },
  errorSubtext: {
    color: "#d32f2f",
    fontSize: 8,
    marginTop: 2,
    textAlign: "center",
    opacity: 0.8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
  emptySubtitle: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
