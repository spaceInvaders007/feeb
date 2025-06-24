import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import FeedsScreen from '../screens/FeedsScreen';
import ContentsScreen from '../screens/ContentsScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreateFeebScreen from '../screens/CreateFeebScreen';
import UploadContentScreen from '../screens/UploadContentScreen';
import RecordReactionScreen from '../screens/RecordReactionScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Create a placeholder component instead of inline function
function UploadPlaceholder() {
  return null;
}

function MainTabs({ navigation }: any) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: any;
          if (route.name === 'Feebs') iconName = 'shield';
          else if (route.name === 'Contents') iconName = 'film';
          else if (route.name === 'Chats') iconName = 'chatbubble';
          else if (route.name === 'Profile') iconName = 'person';
          else if (route.name === 'Upload') iconName = 'add-circle';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00CFFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Feebs" component={FeedsScreen} />
      <Tab.Screen name="Contents" component={ContentsScreen} />
      <Tab.Screen
        name="Upload"
        component={UploadPlaceholder}
        options={{
          tabBarIcon: ({ size }) => (
            <Ionicons
              name="add-circle"
              size={size + 8}
              color="#00CFFF"
              style={{ marginTop: -10 }}
            />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('UploadContent');
          },
        })}
      />
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="CreateFeeb" component={CreateFeebScreen} options={{ presentation: 'modal', title: 'Record Reaction' }} />
        <Stack.Screen name="UploadContent" component={UploadContentScreen} options={{ title: 'Upload Video' }} />
        <Stack.Screen name="RecordReaction" component={RecordReactionScreen} options={{ title: 'React to Video' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}