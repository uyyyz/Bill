import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, Page, PageHeading } from '@/components/ledger-ui';
import { CategoryPieChart, ExpenseTrendChart } from '@/components/stat-charts';
import { palette } from '@/constants/ledger-theme';
import { addDays, CategoryTotal, DailyTotal, formatMoney, getCategoryDailyExpenses, getCategoryTotals, getTotals, getYearMonths, MonthTotal, today, Totals } from '@/data/ledger';

type Mode = 'month' | 'year';
type CategoryView = 'bars' | 'pie';

export default function StatsScreen() {
  const db = useSQLiteContext();
  const now = new Date();
  const [mode, setMode] = useState<Mode>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [totals, setTotals] = useState<Totals>({ income_cents: 0, expense_cents: 0 });
  const [incomeCategories, setIncomeCategories] = useState<CategoryTotal[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryTotal[]>([]);
  const [months, setMonths] = useState<MonthTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryView, setCategoryView] = useState<CategoryView>('bars');
  const [selectedTrend, setSelectedTrend] = useState<{ category: CategoryTotal; endDate: string } | null>(null);
  const [trendDays, setTrendDays] = useState<DailyTotal[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState('');
  const trendRequest = useRef(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    const from = mode === 'month' ? `${year}-${String(month).padStart(2, '0')}-01` : `${year}-01-01`;
    const nextDate = mode === 'month' ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
    const to = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`;
    Promise.all([
      getTotals(db, from, to),
      mode === 'month' ? getCategoryTotals(db, 'income', from, to) : Promise.resolve([]),
      mode === 'month' ? getCategoryTotals(db, 'expense', from, to) : Promise.resolve([]),
      mode === 'year' ? getYearMonths(db, year) : Promise.resolve([]),
    ]).then(([nextTotals, nextIncomeCategories, nextExpenseCategories, nextMonths]) => {
      if (active) { setTotals(nextTotals); setIncomeCategories(nextIncomeCategories); setExpenseCategories(nextExpenseCategories); setMonths(nextMonths); setError(''); setLoading(false); }
    }).catch(() => { if (active) { setError('统计读取失败，请切换期间后重试'); setLoading(false); } });
    return () => { active = false; };
  }, [db, mode, year, month]));

  function shift(delta: number) {
    if (mode === 'year') { setYear((current) => current + delta); return; }
    const date = new Date(year, month - 1 + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
  }

  function openExpenseTrend(category: CategoryTotal) {
    const last = new Date(year, month, 0);
    const lastDate = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
    const current = today();
    const endDate = current.startsWith(`${year}-${String(month).padStart(2, '0')}-`) ? current : lastDate;
    const request = ++trendRequest.current;
    setSelectedTrend({ category, endDate });
    setTrendDays([]);
    setTrendLoading(true);
    setTrendError('');
    getCategoryDailyExpenses(db, category.category_id, endDate)
      .then((days) => { if (trendRequest.current === request) { setTrendDays(days); setTrendLoading(false); } })
      .catch(() => { if (trendRequest.current === request) { setTrendError('趋势读取失败，请重试'); setTrendLoading(false); } });
  }

  function closeExpenseTrend() {
    trendRequest.current += 1;
    setSelectedTrend(null);
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
        {mode === 'month' ? <>
          <View style={styles.categoryHeader}>
            <Text style={styles.cardTitle}>分类统计</Text>
            <Pressable accessibilityRole="button" onPress={() => setCategoryView(categoryView === 'bars' ? 'pie' : 'bars')} style={styles.viewButton}>
              <Text style={styles.viewButtonText}>{categoryView === 'bars' ? '切换饼图' : '切换条形明细'}</Text>
            </Pressable>
          </View>
          {([
            { type: 'income' as const, title: '收入分类', items: incomeCategories, total: totals.income_cents },
            { type: 'expense' as const, title: '支出分类', items: expenseCategories, total: totals.expense_cents },
          ]).map(({ type, title, items, total }) => (
            <View key={type} style={styles.card}>
              <View style={styles.cardTitleRow}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardTotal}>{formatMoney(total)}</Text></View>
              {items.length === 0 ? <Text style={styles.emptyText}>本月暂无{type === 'income' ? '收入' : '支出'}</Text> : categoryView === 'pie' ?
                <CategoryPieChart items={items} total={total} type={type} onSelect={type === 'expense' ? openExpenseTrend : undefined} /> :
                items.map((item) => {
                  const fraction = item.amount_cents / total;
                  const content = <>
                    <View style={styles.rowTop}>
                      <Text style={styles.rowLabel} numberOfLines={1}>{item.category_name}</Text>
                      <Text style={styles.rowValue}>{formatMoney(item.amount_cents)} · {(fraction * 100).toFixed(1)}%{type === 'expense' ? '  ›' : ''}</Text>
                    </View>
                    <View style={styles.track}><View style={[type === 'income' ? styles.incomeFill : styles.expenseFill, { width: `${Math.max(1, fraction * 100)}%` }]} /></View>
                  </>;
                  return type === 'expense' ?
                    <Pressable key={item.category_id} accessibilityRole="button" accessibilityLabel={`查看${item.category_name}近30天支出`} onPress={() => openExpenseTrend(item)} style={styles.categoryRow}>{content}</Pressable> :
                    <View key={item.category_id} style={styles.categoryRow}>{content}</View>;
                })}
              {type === 'expense' && items.length > 0 && <Text style={styles.categoryHint}>点击支出分类，查看近30天的每日开销</Text>}
            </View>
          ))}
        </> : !hasData ? <View style={styles.card}><EmptyState symbol="≡" title="这一期暂无记录" description="记下收支后，这里会显示真实统计。" /></View> :
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
      <Modal visible={selectedTrend !== null} transparent animationType="fade" onRequestClose={closeExpenseTrend}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeExpenseTrend} accessibilityLabel="关闭趋势图" />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeading}><Text style={styles.modalTitle}>{selectedTrend?.category.category_name} · 近30天支出</Text><Text style={styles.modalRange}>{selectedTrend ? `${addDays(selectedTrend.endDate, -29)} 至 ${selectedTrend.endDate}` : ''}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="关闭趋势图" onPress={closeExpenseTrend} style={styles.modalClose}><Text style={styles.modalCloseText}>×</Text></Pressable>
            </View>
            {trendLoading ? <ActivityIndicator color={palette.expense} /> : trendError ? <Text style={styles.error}>{trendError}</Text> : <ExpenseTrendChart days={trendDays} />}
          </View>
        </View>
      </Modal>
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
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewButton: { backgroundColor: palette.primarySoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  viewButtonText: { color: palette.primary, fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: palette.surface, borderRadius: 22, borderWidth: 1, borderColor: palette.line, padding: 20, gap: 15 },
  cardTitle: { color: palette.ink, fontSize: 18, fontWeight: '700' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTotal: { color: palette.muted, fontSize: 14, fontWeight: '700' },
  emptyText: { color: palette.muted, fontSize: 14 },
  categoryRow: { gap: 8, paddingVertical: 8 },
  categoryHint: { color: palette.muted, fontSize: 12 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.42)', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: { width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: palette.surface, borderRadius: 22, padding: 20, gap: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  modalHeading: { flex: 1, gap: 5 },
  modalTitle: { color: palette.ink, fontSize: 18, fontWeight: '800' },
  modalRange: { color: palette.muted, fontSize: 12 },
  modalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { color: palette.muted, fontSize: 28 },
  error: { color: palette.expense, fontSize: 14 },
});
