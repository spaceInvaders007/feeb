// screens/UploadContentScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function UploadContentScreen() {
  const handleUpload = () => {
    alert('Here you would pick a video from device or record new content.');
  };

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-upload" size={64} color="#00CFFF" />
      <Text style={styles.title}>Upload a Video</Text>
      <Text style={styles.description}>
        Choose a video from your phone or record one to share with others.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleUpload}>
        <Text style={styles.buttonText}>Select Video</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 24,
    marginTop: 20,
    fontWeight: 'bold',
  },
  description: {
    marginTop: 12,
    textAlign: 'center',
    color: '#666',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#00CFFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
