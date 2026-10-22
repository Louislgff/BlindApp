import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors, fonts } from '../../src/theme';

// Trois onglets, Reveal au centre et ouvert par défaut : l'app se vit au rythme des sessions.
export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line, height: 84, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 0.4 },
      }}
    >
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: ({ color }) => <Feather name="message-square" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="index"
        options={{ title: 'Reveal', tabBarIcon: ({ color }) => <Feather name="target" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: 'Profil', tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} /> }}
      />
    </Tabs>
  );
}
