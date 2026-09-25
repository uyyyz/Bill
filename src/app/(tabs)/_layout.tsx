import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { palette } from '@/constants/ledger-theme';

function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 19, fontWeight: '800' }}>{glyph}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.line, height: 64, paddingTop: 5 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', paddingBottom: 5 },
      }}>
      <Tabs.Screen name="index" options={{ title: '账本', tabBarIcon: ({ color }) => <TabIcon glyph="账" color={color} /> }} />
      <Tabs.Screen name="stats" options={{ title: '统计', tabBarIcon: ({ color }) => <TabIcon glyph="统" color={color} /> }} />
      <Tabs.Screen name="categories" options={{ title: '分类', tabBarIcon: ({ color }) => <TabIcon glyph="类" color={color} /> }} />
    </Tabs>
  );
}
