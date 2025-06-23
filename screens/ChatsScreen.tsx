import { View, Text, FlatList, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const chats = [
  {
    id: '1',
    name: 'Floyd Miles',
    message: 'You have to see that feeb pleaaaase open it 😂',
    time: '1 min ago',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
  },
  {
    id: '2',
    name: 'Kristin Watson',
    message: '📽️ Sent you a feeb',
    time: '8:24 p.m.',
    avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
  },
  {
    id: '3',
    name: 'Ralph Edwards',
    message: 'Ok!',
    time: '4:34 p.m.',
    avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
  },
];

export default function ChatsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Text style={styles.title}>Chats</Text>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.message}>{item.message}</Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.time}>{item.time}</Text>
              <Ionicons name="chevron-forward" size={18} color="#aaa" />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 50,
    marginBottom: 20,
    marginLeft: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  name: {
    fontWeight: '600',
    fontSize: 16,
  },
  message: {
    color: '#666',
  },
  time: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 4,
  },
  meta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});