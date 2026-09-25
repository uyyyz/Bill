import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Component, Suspense, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { palette } from '@/constants/ledger-theme';
import { migrateDatabase } from '@/data/ledger';

export default function RootLayout() {
  return (
    <DatabaseBoundary>
      <Suspense fallback={<View style={{ flex: 1, justifyContent: 'center', backgroundColor: palette.background }}><ActivityIndicator color={palette.primary} /></View>}>
        <SQLiteProvider databaseName="ledger.db" onInit={migrateDatabase} useSuspense>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: palette.background },
              headerTintColor: palette.ink,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: palette.background },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="record" options={{ title: '记一笔', presentation: 'modal' }} />
          </Stack>
        </SQLiteProvider>
      </Suspense>
    </DatabaseBoundary>
  );
}

class DatabaseBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 18, backgroundColor: palette.background }}>
      <Text style={{ color: palette.ink, fontSize: 20, fontWeight: '700' }}>本地账本暂时无法打开</Text>
      <Text style={{ color: palette.muted, textAlign: 'center' }}>请重试；如果问题持续，数据仍保留在本机。</Text>
      <Pressable accessibilityRole="button" onPress={() => this.setState({ failed: false })} style={{ backgroundColor: palette.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>重试</Text>
      </Pressable>
    </View>;
  }
}
