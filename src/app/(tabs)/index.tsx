import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { DateCalendar } from '@/components/date-calendar';
import { EmptyState, Page, PageHeading, PrimaryButton } from '@/components/ledger-ui';
import { palette } from '@/constants/ledger-theme';
import { addDays, formatMoney, getTotals, LedgerEntry, listEntriesByDate, today, Totals } from '@/data/ledger';

export default function LedgerScreen() {
  const db = useSQLiteContext();
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [totals, setTotals] = useState<Totals>({ income_cents: 0, expense_cents: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    Promise.all([listEntriesByDate(db, date), getTotals(db, date, addDays(date, 1))])
      .then(([items, nextTotals]) => {
        if (active) { setEntries(items); setTotals(nextTotals); setError(''); setLoading(false); }
      })
      .catch(() => { if (active) { setError('账本读取失败，请切换日期后重试'); setLoading(false); } });
    return () => { active = false; };
  }, [db, date]));

  const [year, month, day] = date.split('-').map(Number);
  const isToday = date === today();

  return (
    <Page>
      <PageHeading eyebrow="我的日常账本" title={isToday ? '今天，记一笔' : `${month}月${day}日的账本`} description="把每一笔收支记清楚，生活更有数。" />
      <View style={styles.dateNav}>
        <Pressable accessibilityRole="button" accessibilityLabel="前一天" onPress={() => setDate(addDays(date, -1))} style={styles.dateButton}><Text style={styles.dateButtonText}>‹</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`选择日期，当前${year}年${month}月${day}日`} onPress={() => setCalendarOpen(true)} style={styles.dateTrigger}>
          <Text style={styles.dateText}>{year}年{month}月{day}日 ▾</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="后一天" onPress={() => setDate(addDays(date, 1))} style={styles.dateButton}><Text style={styles.dateButtonText}>›</Text></Pressable>
        {!isToday && <Pressable accessibilityRole="button" onPress={() => setDate(today())} style={styles.todayButton}><Text style={styles.todayText}>今天</Text></Pressable>}
      </View>
      {loading ? <ActivityIndicator color={palette.primary} /> : error ? <Text style={styles.error}>{error}</Text> : <>
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>当日收入</Text>
            <Text style={[styles.summaryAmount, { color: palette.primary }]}>{formatMoney(totals.income_cents)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>当日支出</Text>
            <Text style={[styles.summaryAmount, { color: palette.expense }]}>{formatMoney(totals.expense_cents)}</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isToday ? '今日记录' : '当日记录'}</Text>
          <Text style={styles.count}>{entries.length} 笔</Text>
        </View>
        {entries.length === 0 ? <View style={styles.card}><EmptyState symbol="＋" title="这一天还没有记录" description="点下方按钮，开始记录这一天的第一笔收支。" /></View> :
          <View style={styles.card}>
            {entries.map((entry, index) => <Pressable key={entry.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/record', params: { id: entry.id } })} style={[styles.entry, index > 0 && styles.entryBorder]}>
              <View style={styles.entryIcon}><Text style={styles.entryIconText}>{entry.type === 'income' ? '收' : '支'}</Text></View>
              <View style={styles.entryDetail}>
                <Text style={styles.entryName} numberOfLines={1}>{entry.category_name}</Text>
                {entry.note ? <Text style={styles.entryNote} numberOfLines={1}>{entry.note}</Text> : null}
              </View>
              <Text style={[styles.entryAmount, { color: entry.type === 'income' ? palette.primary : palette.expense }]}>{entry.type === 'income' ? '+' : '−'}{formatMoney(entry.amount_cents)}</Text>
            </Pressable>)}
          </View>}
      </>}
      <PrimaryButton title="＋ 记一笔" onPress={() => router.push({ pathname: '/record', params: { date } })} />
      {calendarOpen && <DateCalendar date={date} onSelect={setDate} onClose={() => setCalendarOpen(false)} />}
    </Page>
  );
}

const styles = StyleSheet.create({
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dateButtonText: { color: palette.primary, fontSize: 26, fontWeight: '700' },
  dateTrigger: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 },
  dateText: { color: palette.ink, fontSize: 15, fontWeight: '700' },
  todayButton: { marginLeft: 'auto', padding: 7 },
  todayText: { color: palette.primary, fontSize: 13, fontWeight: '700' },
  summary: { flexDirection: 'row', backgroundColor: palette.surface, borderRadius: 22, paddingVertical: 24, paddingHorizontal: 20, borderWidth: 1, borderColor: palette.line },
  summaryItem: { flex: 1, gap: 9 },
  summaryLabel: { color: palette.muted, fontSize: 13 },
  summaryAmount: { fontSize: 21, fontWeight: '800' },
  divider: { width: 1, backgroundColor: palette.line, marginHorizontal: 14 },
  section: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { color: palette.ink, fontSize: 18, fontWeight: '700' },
  count: { color: palette.muted, fontSize: 13 },
  card: { backgroundColor: palette.surface, borderRadius: 22, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 15 },
  entry: { flexDirection: 'row', alignItems: 'center', minHeight: 72, gap: 12 },
  entryBorder: { borderTopWidth: 1, borderTopColor: palette.line },
  entryIcon: { width: 38, height: 38, backgroundColor: palette.primarySoft, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryIconText: { color: palette.primary, fontSize: 15, fontWeight: '700' },
  entryDetail: { flex: 1, gap: 3 },
  entryName: { color: palette.ink, fontSize: 15, fontWeight: '700' },
  entryNote: { color: palette.muted, fontSize: 12 },
  entryAmount: { fontSize: 15, fontWeight: '700' },
  error: { color: palette.expense, fontSize: 14 },
});
