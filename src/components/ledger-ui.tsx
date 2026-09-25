import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/constants/ledger-theme';

export function Page({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function EmptyState({ symbol, title, description }: { symbol: string; title: string; description: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptySymbol}><Text style={styles.emptySymbolText}>{symbol}</Text></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  page: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 112, gap: 22 },
  heading: { gap: 7 },
  eyebrow: { color: palette.primary, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  title: { color: palette.ink, fontSize: 30, fontWeight: '800' },
  description: { color: palette.muted, fontSize: 14, lineHeight: 21 },
  button: { minHeight: 54, borderRadius: 16, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  pressed: { opacity: 0.82 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  empty: { minHeight: 250, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 9 },
  emptySymbol: { width: 68, height: 68, borderRadius: 22, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  emptySymbolText: { color: palette.primary, fontSize: 32, fontWeight: '600' },
  emptyTitle: { color: palette.ink, fontSize: 18, fontWeight: '700' },
  emptyDescription: { color: palette.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
