import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FeebCamera from '../components/FeebCamera';

export default function CreateFeebScreen({ navigation }: any) {
  const [showCamera, setShowCamera] = useState(false);

  if (showCamera) return <FeebCamera />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record your Feeb</Text>
      <TouchableOpacity style={styles.recordButton} onPress={() => setShowCamera(true)}>
        <Ionicons name="videocam" size={36} color="white" />
      </TouchableOpacity>
      <Text style={styles.hint}>Tap to start recording your reaction</Text>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#00CFFF" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00CFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  hint: {
    color: '#aaa',
    marginBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 50,
    left: 20,
  },
  backText: {
    color: '#00CFFF',
    marginLeft: 6,
    fontWeight: '600',
  },
});
