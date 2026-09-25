import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/ledger-theme';
import { today } from '@/data/ledger';

type Props = {
  date: string;
  onSelect: (date: string) => void;
  onClose: () => void;
};

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

function dateString(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function DateCalendar({ date, onSelect, onClose }: Props) {
  const [selectedYear, selectedMonth] = date.split('-').map(Number);
  const [shownMonth, setShownMonth] = useState(() => new Date(selectedYear, selectedMonth - 1, 1));

  const year = shownMonth.getFullYear();
  const month = shownMonth.getMonth() + 1;
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const currentDay = today();

  function changeMonth(offset: number) {
    setShownMonth(new Date(year, month - 1 + offset, 1));
  }

  function select(value: string) {
    onSelect(value);
    onClose();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="关闭日历" />
        <View style={styles.dialog}>
          <Text style={styles.title}>选择日期</Text>
          <View style={styles.monthRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="上个月" onPress={() => changeMonth(-1)} style={styles.monthButton}>
              <Text style={styles.monthArrow}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>{year}年{month}月</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="下个月" onPress={() => changeMonth(1)} style={styles.monthButton}>
              <Text style={styles.monthArrow}>›</Text>
            </Pressable>
          </View>
          <View>
            <View style={styles.weekRow}>
              {weekdays.map((weekday) => <Text key={weekday} style={styles.weekday}>{weekday}</Text>)}
            </View>
            {Array.from({ length: cellCount / 7 }, (_, week) => (
              <View key={`week-${week}`} style={styles.weekRow}>
                {Array.from({ length: 7 }, (_, weekday) => {
                  const day = week * 7 + weekday - firstWeekday + 1;
                  if (day < 1 || day > daysInMonth) return <View key={`blank-${weekday}`} style={styles.dayCell} />;
                  const value = dateString(year, month, day);
                  const selected = value === date;
                  const isToday = value === currentDay;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityLabel={`${year}年${month}月${day}日`}
                      accessibilityState={{ selected }}
                      onPress={() => select(value)}
                      style={[styles.dayCell, selected && styles.selectedDay, isToday && !selected && styles.todayDay]}
                    >
                      <Text style={[styles.dayText, selected && styles.selectedDayText, isToday && !selected && styles.todayDayText]}>{day}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.actionButton}><Text style={styles.actionText}>取消</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => select(currentDay)} style={styles.actionButton}><Text style={styles.actionText}>回到今天</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.42)', justifyContent: 'center', paddingHorizontal: 20 },
  dialog: { width: '100%', maxWidth: 380, alignSelf: 'center', backgroundColor: palette.surface, borderRadius: 24, padding: 20, gap: 16 },
  title: { color: palette.ink, fontSize: 20, fontWeight: '800' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  monthArrow: { color: palette.primary, fontSize: 27, fontWeight: '700' },
  monthTitle: { color: palette.ink, fontSize: 18, fontWeight: '700' },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, height: 34, textAlign: 'center', textAlignVertical: 'center', color: palette.muted, fontSize: 13, fontWeight: '700' },
  dayCell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  dayText: { color: palette.ink, fontSize: 15, fontWeight: '600' },
  selectedDay: { backgroundColor: palette.primary },
  selectedDayText: { color: '#FFFFFF', fontWeight: '800' },
  todayDay: { backgroundColor: palette.primarySoft },
  todayDayText: { color: palette.primary, fontWeight: '800' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  actionButton: { paddingHorizontal: 12, paddingVertical: 10 },
  actionText: { color: palette.primary, fontSize: 14, fontWeight: '700' },
});
