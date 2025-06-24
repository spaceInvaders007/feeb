import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FeedsScreen() {
  return (
    <View style={styles.container}>
      {/* Top camera feed */}
      <View style={styles.cameraPreview}>
        <Image
          source={{ uri: 'https://placekitten.com/400/300' }}
          style={styles.cameraImage}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.muteBtn}>
          <Ionicons name="volume-mute" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bottom video feed */}
      <View style={styles.videoSection}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
          }}
          style={styles.videoImage}
          resizeMode="cover"
        />
        <TouchableOpacity style={[styles.muteBtn, { top: 10 }]}>
          <Ionicons name="volume-mute" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.sideActions}>
          <TouchableOpacity style={styles.iconWrap}>
            <Ionicons name="share-social" size={28} color="#333" />
            <Text style={styles.iconLabel}>824</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconWrap}>
            <Ionicons name="chatbubble-ellipses" size={28} color="#333" />
            <Text style={styles.iconLabel}>200</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconWrap}>
            <Ionicons name="heart" size={28} color="#E91E63" />
            <Text style={styles.iconLabel}>1.2k</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userText}>
            <Text style={{ fontWeight: 'bold' }}>Lilian Espech</Text> •{' '}
            <Text style={{ color: '#00CFFF' }}>Follow</Text>
          </Text>
          <Text style={styles.location}>Los Angeles, USA</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cameraPreview: {
    height: 160,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cameraImage: {
    width: '100%',
    height: '100%',
  },
  muteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#0008',
    padding: 6,
    borderRadius: 20,
  },
  videoSection: {
    flex: 1,
    position: 'relative',
  },
  videoImage: {
    width: '100%',
    height: '100%',
  },
  sideActions: {
    position: 'absolute',
    right: 10,
    bottom: 80,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 20,
    alignItems: 'center',
  },
  iconLabel: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
  },
  userInfo: {
    position: 'absolute',
    bottom: 20,
    left: 16,
  },
  userText: {
    color: '#000',
    fontSize: 16,
    marginBottom: 2,
  },
  location: {
    fontSize: 12,
    color: '#666',
  },
});