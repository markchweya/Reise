import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../src/theme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Library', tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Ask Soma', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="badges"
        options={{ title: 'Badges', tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
