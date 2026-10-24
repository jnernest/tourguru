import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';

import { GuideProvider } from '../guide/GuideContext';
import { colors } from '../ui/theme';

const icon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
  };

export default function RootLayout() {
  return (
    <GuideProvider>
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
        <Tabs.Screen name="index" options={{ title: 'Guide', tabBarIcon: icon('🎧') }} />
        <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: icon('🗺') }} />
        <Tabs.Screen name="diary" options={{ title: 'Diary', tabBarIcon: icon('📔') }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('⚙') }} />
      </Tabs>
      <StatusBar style="dark" />
    </GuideProvider>
  );
}
