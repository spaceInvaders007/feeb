import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import React, { useState } from 'react';

export default function ProfileTabs() {
  const [active, setActive] = useState<'feebs' | 'contents'>('feebs');

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.tab, active === 'feebs' && styles.active]}
        onPress={() => setActive('feebs')}
      >
        <Text style={styles.label}>Feebs</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, active === 'contents' && styles.active]}
        onPress={() => setActive('contents')}
      >
        <Text style={styles.label}>Contents</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    marginVertical: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  active: {
    borderBottomColor: '#00CFFF',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
