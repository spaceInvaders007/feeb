// screens/ProfileScreen.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;
const SPACING = 8;
const COLUMN_COUNT = 2;
const ITEM_SIZE = (screenWidth - SPACING * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

// replace this with your real user/avatar data
const user = {
  avatarUri: "https://randomuser.me/api/portraits/women/44.jpg",
  name: "Lindsey Horan",
  handle: "@linHoran",
  followers: "87k",
  following: "42k",
  likes: "12.3k",
};

// dummy grid data
const sampleFeebs = [
  { id: "f1", uri: "https://placekitten.com/300/300" },
  { id: "f2", uri: "https://placekitten.com/301/301" },
  { id: "f3", uri: "https://placekitten.com/302/302" },
  { id: "f4", uri: "https://placekitten.com/303/303" },
];
const sampleContents = [
  { id: "c1", uri: "https://placekitten.com/304/304" },
  { id: "c2", uri: "https://placekitten.com/305/305" },
  { id: "c3", uri: "https://placekitten.com/306/306" },
  { id: "c4", uri: "https://placekitten.com/307/307" },
];

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<"Feebs" | "Contents">("Feebs");
  const data = activeTab === "Feebs" ? sampleFeebs : sampleContents;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>My profile</Text>
      {/* YOUR AVATAR */}
      <Image source={{ uri: user.avatarUri }} style={styles.avatar} />
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.handle}>{user.handle}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user.followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user.following}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user.likes}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.editButton}>
        <Text style={styles.editButtonText}>Edit profile</Text>
        <Ionicons name="pencil" size={20} color="#00CFFF" />
      </TouchableOpacity>

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

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      numColumns={COLUMN_COUNT}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={renderHeader}
      renderItem={({ item }) => (
        <View style={styles.gridItem}>
          <Image source={{ uri: item.uri }} style={styles.gridImage} />
          <View style={styles.playIcon}>
            <Ionicons name="play-circle" size={24} color="white" />
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: SPACING,
    backgroundColor: "#fff",
  },
  headerContainer: {
    padding: SPACING,
    paddingBottom: SPACING * 2,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
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
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: SPACING / 2,
  },
  tabButton: { flex: 1, alignItems: "center", paddingVertical: 8 },
  tabText: { fontSize: 16, color: "#888" },
  tabTextActive: { color: "#000", fontWeight: "700" },
  dividerRow: {
    flexDirection: "row",
    height: 2,
    marginBottom: SPACING * 1.5,
  },
  divider: { flex: 1, backgroundColor: "transparent" },
  dividerActive: { backgroundColor: "#000" },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: SPACING / 2,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  gridImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  playIcon: {
    position: "absolute",
    top: 8,
    right: 8,
  },
});
