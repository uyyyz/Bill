import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, Page, PageHeading } from '@/components/ledger-ui';
import { palette } from '@/constants/ledger-theme';
import { CategoryTotal, formatMoney, getExpenseCategories, getTotals, getYearMonths, MonthTotal, Totals } from '@/data/ledger';

type Mode = 'month' | 'year';

export default function StatsScreen() {
  const db = useSQLiteContext();
  const now = new Date();
  const [mode, setMode] = useState<Mode>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [totals, setTotals] = useState<Totals>({ income_cents: 0, expense_cents: 0 });
  const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [months, setMonths] = useState<MonthTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    const from = mode === 'month' ? `${year}-${String(month).padStart(2, '0')}-01` : `${year}-01-01`;
    const nextDate = mode === 'month' ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
    const to = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`;
    Promise.all([
      getTotals(db, from, to),
      mode === 'month' ? getExpenseCategories(db, from, to) : Promise.resolve([]),
      mode === 'year' ? getYearMonths(db, year) : Promise.resolve([]),
    ]).then(([nextTotals, nextCategories, nextMonths]) => {
      if (active) { setTotals(nextTotals); setCategories(nextCategories); setMonths(nextMonths); setError(''); setLoading(false); }
    }).catch(() => { if (active) { setError('统计读取失败，请切换期间后重试'); setLoading(false); } });
    return () => { active = false; };
  }, [db, mode, year, month]));

  function shift(delta: number) {
    if (mode === 'year') { setYear((current) => current + delta); return; }
    const date = new Date(year, month - 1 + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
  }

  const hasData = totals.income_cents > 0 || totals.expense_cents > 0;
  const maxMonth = Math.max(1, ...months.map((item) => Math.max(item.income_cents, item.expense_cents)));

  return (
    <Page>
      <PageHeading eyebrow="收支概览" title="统计" description="按月、按年查看真实收支。" />
      <View style={styles.switcher}>
        {(['month', 'year'] as const).map((item) => <Pressable key={item} accessibilityRole="button" onPress={() => setMode(item)} style={[styles.switch, mode === item && styles.switchActive]}><Text style={[styles.switchText, mode === item && styles.switchTextActive]}>{item === 'month' ? '月' : '年'}</Text></Pressable>)}
      </View>
      <View style={styles.periodRow}>
        <Pressable accessibilityRole="button" onPress={() => shift(-1)} style={styles.periodButton}><Text style={styles.periodArrow}>‹</Text></Pressable>
        <Text style={styles.periodText}>{year}年{mode === 'month' ? `${month}月` : ''}</Text>
        <Pressable accessibilityRole="button" onPress={() => shift(1)} style={styles.periodButton}><Text style={styles.periodArrow}>›</Text></Pressable>
      </View>
      {loading ? <ActivityIndicator color={palette.primary} /> : error ? <Text style={styles.error}>{error}</Text> : <>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>{mode === 'month' ? '本月' : '全年'}结余</Text>
          <Text style={styles.summaryAmount}>{formatMoney(totals.income_cents - totals.expense_cents)}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryDetail}>收入  {formatMoney(totals.income_cents)}</Text>
            <Text style={styles.summaryDetail}>支出  {formatMoney(totals.expense_cents)}</Text>
          </View>
        </View>
        {!hasData ? <View style={styles.card}><EmptyState symbol="≡" title="这一期暂无记录" description="记下收支后，这里会显示真实统计。" /></View> : mode === 'month' ?
          <View style={styles.card}>
            <Text style={styles.cardTitle}>支出分类</Text>
            {categories.length === 0 ? <Text style={styles.emptyText}>本月暂无支出</Text> : categories.map((item) => {
              const fraction = totals.expense_cents > 0 ? item.amount_cents / totals.expense_cents : 0;
              return <View key={item.category_id} style={styles.categoryRow}>
                <View style={styles.rowTop}><Text style={styles.rowLabel} numberOfLines={1}>{item.category_name}</Text><Text style={styles.rowValue}>{formatMoney(item.amount_cents)} · {(fraction * 100).toFixed(1)}%</Text></View>
                <View style={styles.track}><View style={[styles.expenseFill, { width: `${Math.max(1, fraction * 100)}%` }]} /></View>
              </View>;
            })}
          </View> :
          <View style={styles.card}>
            <Text style={styles.cardTitle}>每月收支</Text>
            {months.map((item, index) => <View key={item.month} style={styles.monthRow}>
              <Text style={styles.monthName}>{index + 1}月</Text>
              <View style={styles.monthData}>
                <View style={styles.barLine}><Text style={styles.barLabel}>收</Text><View style={styles.track}><View style={[styles.incomeFill, { width: `${item.income_cents / maxMonth * 100}%` }]} /></View><Text style={styles.barValue}>{formatMoney(item.income_cents)}</Text></View>
                <View style={styles.barLine}><Text style={styles.barLabel}>支</Text><View style={styles.track}><View style={[styles.expenseFill, { width: `${item.expense_cents / maxMonth * 100}%` }]} /></View><Text style={styles.barValue}>{formatMoney(item.expense_cents)}</Text></View>
              </View>
            </View>)}
          </View>}
      </>}
    </Page>
  );
}

const styles = StyleSheet.create({
  switcher: { flexDirection: 'row', backgroundColor: palette.primarySoft, padding: 5, borderRadius: 14 },
  switch: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  switchActive: { backgroundColor: palette.surface },
  switchText: { color: palette.muted, fontSize: 15, fontWeight: '700' },
  switchTextActive: { color: palette.primary },
  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  periodArrow: { color: palette.primary, fontSize: 26, fontWeight: '700' },
  periodText: { color: palette.ink, fontSize: 18, fontWeight: '700' },
  summary: { backgroundColor: palette.primary, borderRadius: 22, padding: 24, gap: 12 },
  summaryLabel: { color: '#DDEDE3', fontSize: 14 },
  summaryAmount: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginTop: 5 },
  summaryDetail: { color: '#FFFFFF', fontSize: 13 },
  card: { backgroundColor: palette.surface, borderRadius: 22, borderWidth: 1, borderColor: palette.line, padding: 20, gap: 15 },
  cardTitle: { color: palette.ink, fontSize: 18, fontWeight: '700' },
  emptyText: { color: palette.muted, fontSize: 14 },
  categoryRow: { gap: 8, paddingVertical: 5 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  rowLabel: { flex: 1, color: palette.ink, fontSize: 14, fontWeight: '600' },
  rowValue: { color: palette.muted, fontSize: 13 },
  track: { flex: 1, height: 8, borderRadius: 8, backgroundColor: palette.primarySoft, overflow: 'hidden' },
  incomeFill: { height: '100%', backgroundColor: palette.primary, borderRadius: 8 },
  expenseFill: { height: '100%', backgroundColor: palette.expense, borderRadius: 8 },
  monthRow: { flexDirection: 'row', borderTopColor: palette.line, borderTopWidth: 1, paddingTop: 12, gap: 12 },
  monthName: { width: 33, color: palette.ink, fontSize: 14, fontWeight: '700' },
  monthData: { flex: 1, gap: 6 },
  barLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { color: palette.muted, fontSize: 11 },
  barValue: { color: palette.muted, fontSize: 11, width: 86, textAlign: 'right' },
  error: { color: palette.expense, fontSize: 14 },
});
