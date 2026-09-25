import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

import { palette } from '@/constants/ledger-theme';
import { CategoryTotal, DailyTotal, formatMoney } from '@/data/ledger';

const incomeColors = ['#276B54', '#64A481', '#A4C8A9', '#8B9F56', '#B7C67D', '#4B8D88'];
const expenseColors = ['#B5634D', '#D99272', '#E7B96E', '#9D704F', '#C67D94', '#7F89B0', '#78986A', '#BD9A72', '#AA79A4', '#609BA3', '#A9B45E', '#D38E8B', '#788E79'];

function pointOnCircle(angle: number) {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: 100 + 84 * Math.cos(radians), y: 100 + 84 * Math.sin(radians) };
}

export function CategoryPieChart({ items, total, type, onSelect }: {
  items: CategoryTotal[];
  total: number;
  type: 'income' | 'expense';
  onSelect?: (item: CategoryTotal) => void;
}) {
  const colors = type === 'income' ? incomeColors : expenseColors;
  const slices = items.map((item, index) => {
    const previous = items.slice(0, index).reduce((sum, category) => sum + category.amount_cents, 0);
    return {
      item,
      start: previous / total * 360,
      end: (previous + item.amount_cents) / total * 360,
      color: colors[index % colors.length],
    };
  });

  return (
    <View style={styles.pieContent}>
      <Svg width={200} height={200} viewBox="0 0 200 200" accessibilityLabel={`${type === 'income' ? '收入' : '支出'}分类饼图`}>
        {slices.map(({ item, start, end, color }) => {
          if (items.length === 1) return <Circle key={item.category_id} cx={100} cy={100} r={84} fill={color} onPress={() => onSelect?.(item)} />;
          const from = pointOnCircle(start);
          const to = pointOnCircle(end);
          const path = `M 100 100 L ${from.x} ${from.y} A 84 84 0 ${end - start > 180 ? 1 : 0} 1 ${to.x} ${to.y} Z`;
          return <Path key={item.category_id} d={path} fill={color} onPress={() => onSelect?.(item)} />;
        })}
      </Svg>
      <View style={styles.legend}>
        {slices.map(({ item, color }) => {
          const content = <>
            <View style={[styles.swatch, { backgroundColor: color }]} />
            <Text style={styles.legendName} numberOfLines={1}>{item.category_name}</Text>
            <Text style={styles.legendAmount}>{formatMoney(item.amount_cents)} · {(item.amount_cents / total * 100).toFixed(1)}%</Text>
            {onSelect && <Text style={styles.chevron}>›</Text>}
          </>;
          return onSelect ? (
            <Pressable key={item.category_id} accessibilityRole="button" accessibilityLabel={`查看${item.category_name}近30天支出`} onPress={() => onSelect(item)} style={styles.legendRow}>{content}</Pressable>
          ) : <View key={item.category_id} style={styles.legendRow}>{content}</View>;
        })}
      </View>
    </View>
  );
}

export function ExpenseTrendChart({ days }: { days: DailyTotal[] }) {
  const max = Math.max(0, ...days.map((day) => day.amount_cents));
  const scale = Math.max(max, 1);
  const points = days.map((day, index) => ({
    x: 8 + index * 284 / 29,
    y: 142 - day.amount_cents / scale * 128,
    amount: day.amount_cents,
  }));
  const total = days.reduce((sum, day) => sum + day.amount_cents, 0);

  return (
    <View style={styles.trendContent}>
      <View style={styles.trendSummary}>
        <View><Text style={styles.trendLabel}>30天合计</Text><Text style={styles.trendValue}>{formatMoney(total)}</Text></View>
        <View><Text style={styles.trendLabel}>单日最高</Text><Text style={styles.trendValue}>{formatMoney(max)}</Text></View>
      </View>
      <Text style={styles.axisLabel}>最高 {formatMoney(max)}</Text>
      <Svg width="100%" height={176} viewBox="0 0 300 156" accessibilityLabel="近30天每日支出折线图">
        <Line x1={8} y1={14} x2={292} y2={14} stroke={palette.line} strokeWidth={1} />
        <Line x1={8} y1={78} x2={292} y2={78} stroke={palette.line} strokeWidth={1} />
        <Line x1={8} y1={142} x2={292} y2={142} stroke={palette.line} strokeWidth={1} />
        <Polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={palette.expense} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {points.filter((point) => point.amount > 0).map((point, index) => <Circle key={index} cx={point.x} cy={point.y} r={3.5} fill={palette.expense} />)}
      </Svg>
      <View style={styles.dateAxis}>
        <Text style={styles.axisLabel}>{days[0]?.date.slice(5)}</Text>
        <Text style={styles.axisLabel}>{days[14]?.date.slice(5)}</Text>
        <Text style={styles.axisLabel}>{days[29]?.date.slice(5)}</Text>
      </View>
      {max === 0 && <Text style={styles.emptyText}>这30天没有该分类的支出</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  pieContent: { alignItems: 'center', gap: 12 },
  legend: { width: '100%', gap: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40, gap: 8 },
  swatch: { width: 13, height: 13, borderRadius: 4 },
  legendName: { flex: 1, color: palette.ink, fontSize: 14, fontWeight: '600' },
  legendAmount: { color: palette.muted, fontSize: 12 },
  chevron: { color: palette.primary, fontSize: 22, fontWeight: '700' },
  trendContent: { gap: 12 },
  trendSummary: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  trendLabel: { color: palette.muted, fontSize: 12 },
  trendValue: { color: palette.ink, fontSize: 19, fontWeight: '800' },
  axisLabel: { color: palette.muted, fontSize: 12 },
  dateAxis: { flexDirection: 'row', justifyContent: 'space-between' },
  emptyText: { color: palette.muted, fontSize: 13, textAlign: 'center' },
});
