import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My profile</Text>
      <Image
        source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }}
        style={styles.avatar}
      />
      <Text style={styles.name}>Lindsey Horan</Text>
      <Text style={styles.username}>@linHoran</Text>
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statValue}>87k</Text><Text style={styles.statLabel}>Followers</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>42k</Text><Text style={styles.statLabel}>Following</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>12.3k</Text><Text style={styles.statLabel}>Likes</Text></View>
      </View>
      <TouchableOpacity style={styles.editBtn}><Text style={styles.editText}>Edit profile ✏️</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
  },
  username: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
    marginHorizontal: 15,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: 'gray',
  },
  editBtn: {
    borderWidth: 1,
    borderColor: '#00CFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  editText: {
    color: '#00CFFF',
    fontWeight: '600',
  },
});
