import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/ledger-theme';

type Props = {
  mode: 'month' | 'year';
  year: number;
  month: number;
  onSelect: (year: number, month?: number) => void;
  onClose: () => void;
};

export function PeriodPicker({ mode, year, month, onSelect, onClose }: Props) {
  const [shownYear, setShownYear] = useState(year);
  const [firstYear, setFirstYear] = useState(Math.floor(year / 12) * 12);
  const isMonth = mode === 'month';
  const values = isMonth ? Array.from({ length: 12 }, (_, index) => index + 1) : Array.from({ length: 12 }, (_, index) => firstYear + index);
  const columns = isMonth ? 4 : 3;
  const rows = Array.from({ length: 12 / columns }, (_, index) => values.slice(index * columns, (index + 1) * columns));

  function selectCurrent() {
    const now = new Date();
    onSelect(now.getFullYear(), isMonth ? now.getMonth() + 1 : undefined);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="关闭期间选择" />
        <View style={styles.card}>
          <Text style={styles.title}>{isMonth ? '选择月份' : '选择年份'}</Text>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel={isMonth ? '上一年' : '上一组年份'} onPress={() => isMonth ? setShownYear(shownYear - 1) : setFirstYear(firstYear - 12)} style={styles.arrowButton}><Text style={styles.arrow}>‹</Text></Pressable>
            <Text style={styles.heading}>{isMonth ? `${shownYear}年` : `${firstYear}—${firstYear + 11}年`}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={isMonth ? '下一年' : '下一组年份'} onPress={() => isMonth ? setShownYear(shownYear + 1) : setFirstYear(firstYear + 12)} style={styles.arrowButton}><Text style={styles.arrow}>›</Text></Pressable>
          </View>
          <View style={styles.grid}>
            {rows.map((row, index) => <View key={index} style={styles.gridRow}>
              {row.map((value) => {
                const selected = isMonth ? shownYear === year && value === month : value === year;
                return <Pressable key={value} accessibilityRole="button" accessibilityLabel={isMonth ? `${shownYear}年${value}月` : `${value}年`} accessibilityState={{ selected }} onPress={() => onSelect(isMonth ? shownYear : value, isMonth ? value : undefined)} style={[styles.cell, selected && styles.cellSelected]}><Text style={[styles.cellText, selected && styles.cellTextSelected]}>{value}{isMonth ? '月' : ''}</Text></Pressable>;
              })}
            </View>)}
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.action}><Text style={styles.actionText}>取消</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={selectCurrent} style={styles.action}><Text style={styles.actionText}>{isMonth ? '回到本月' : '回到今年'}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.42)', justifyContent: 'center', paddingHorizontal: 20 },
  card: { width: '100%', maxWidth: 380, alignSelf: 'center', backgroundColor: palette.surface, borderRadius: 22, padding: 20, gap: 18 },
  title: { color: palette.ink, fontSize: 18, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrowButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primarySoft, borderRadius: 12 },
  arrow: { color: palette.primary, fontSize: 26, fontWeight: '700' },
  heading: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  grid: { gap: 7 },
  gridRow: { flexDirection: 'row', gap: 7 },
  cell: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primarySoft },
  cellSelected: { backgroundColor: palette.primary },
  cellText: { color: palette.ink, fontSize: 14, fontWeight: '700' },
  cellTextSelected: { color: '#FFFFFF' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  action: { minHeight: 42, paddingHorizontal: 8, justifyContent: 'center' },
  actionText: { color: palette.primary, fontSize: 14, fontWeight: '700' },
});
