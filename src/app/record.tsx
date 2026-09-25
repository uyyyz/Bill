import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ledger-ui';
import { palette } from '@/constants/ledger-theme';
import { addDays, Category, deleteEntry, EntryType, getEntry, listCategories, parseMoney, saveEntry, today } from '@/data/ledger';

export default function RecordScreen() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const db = useSQLiteContext();
  const [type, setType] = useState<EntryType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(params.date ?? today());
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([listCategories(db, undefined, true), params.id ? getEntry(db, params.id) : Promise.resolve(null)])
      .then(([items, entry]) => {
        if (!active) return;
        setCategories(items);
        if (entry) {
          setType(entry.type);
          setAmount((entry.amount_cents / 100).toFixed(2));
          setDate(entry.entry_date);
          setCategoryId(entry.category_id);
          setNote(entry.note);
        } else {
          setCategoryId(items.find((item) => item.type === 'expense' && item.is_active)?.id ?? '');
        }
        setLoading(false);
      })
      .catch(() => { if (active) { setError('记录读取失败，请稍后重试'); setLoading(false); } });
    return () => { active = false; };
  }, [db, params.id]);

  function changeType(next: EntryType) {
    setType(next);
    setCategoryId(categories.find((item) => item.type === next && item.is_active)?.id ?? '');
    setShowAll(false);
    setError('');
  }

  async function save() {
    const cents = parseMoney(amount);
    if (cents === null) { setError('请输入大于 0 的金额，最多保留两位小数'); return; }
    setSaving(true);
    setError('');
    try {
      await saveEntry(db, { id: params.id, type, amount_cents: cents, entry_date: date, category_id: categoryId, note });
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!params.id) return;
    Alert.alert('删除这笔记录？', '删除后无法恢复，相关统计会重新计算。', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        try { await deleteEntry(db, params.id!); router.back(); }
        catch { setError('删除失败，请重试'); }
      } },
    ]);
  }

  const available = categories.filter((item) => item.type === type && (item.is_active || item.id === categoryId));
  const visible = showAll ? available : available.slice(0, 5);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: params.id ? '编辑记录' : '记一笔' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? <ActivityIndicator color={palette.primary} /> : <>
          <View style={styles.switcher}>
            {(['expense', 'income'] as const).map((item) => (
              <Pressable key={item} accessibilityRole="button" onPress={() => changeType(item)} style={[styles.switch, type === item && styles.switchActive]}>
                <Text style={[styles.switchText, type === item && styles.switchTextActive]}>{item === 'expense' ? '支出' : '收入'}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>金额</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>¥</Text>
              <TextInput style={styles.amountInput} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#A9B2AC" accessibilityLabel="金额" />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>日期</Text>
            <View style={styles.dateRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="前一天" onPress={() => setDate(addDays(date, -1))} style={styles.dateButton}><Text style={styles.dateButtonText}>‹</Text></Pressable>
              <TextInput style={styles.dateInput} value={date} onChangeText={setDate} placeholder="年-月-日" keyboardType="numbers-and-punctuation" accessibilityLabel="日期" />
              <Pressable accessibilityRole="button" accessibilityLabel="后一天" onPress={() => setDate(addDays(date, 1))} style={styles.dateButton}><Text style={styles.dateButtonText}>›</Text></Pressable>
            </View>
            <Text style={styles.hint}>格式：2026-09-25；也可以点两侧切换日期</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>分类</Text>
            <View style={styles.chips}>
              {visible.map((item) => (
                <Pressable key={item.id} accessibilityRole="button" onPress={() => setCategoryId(item.id)} style={[styles.chip, categoryId === item.id && styles.chipActive]}>
                  <Text style={[styles.chipText, categoryId === item.id && styles.chipTextActive]}>{item.name}{item.is_active ? '' : '（已停用）'}</Text>
                </Pressable>
              ))}
              {available.length > 5 && <Pressable accessibilityRole="button" onPress={() => setShowAll(!showAll)} style={styles.more}><Text style={styles.moreText}>{showAll ? '收起' : '更多'}</Text></Pressable>}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>备注（选填）</Text>
            <TextInput style={styles.noteInput} value={note} onChangeText={setNote} placeholder="写点什么，方便以后回看" placeholderTextColor="#A9B2AC" multiline maxLength={200} accessibilityLabel="备注" />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton title={saving ? '保存中…' : params.id ? '保存修改' : '保存记录'} onPress={() => { if (!saving) void save(); }} />
          {params.id ? <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.deleteButton}><Text style={styles.deleteText}>删除这笔记录</Text></Pressable> : null}
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, paddingBottom: 48, gap: 18 },
  switcher: { flexDirection: 'row', backgroundColor: palette.primarySoft, padding: 5, borderRadius: 16 },
  switch: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  switchActive: { backgroundColor: palette.surface },
  switchText: { color: palette.muted, fontSize: 16, fontWeight: '700' },
  switchTextActive: { color: palette.primary },
  field: { backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 18, padding: 18, gap: 12 },
  label: { color: palette.ink, fontSize: 15, fontWeight: '700' },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: palette.line },
  currency: { color: palette.ink, fontSize: 28, fontWeight: '800' },
  amountInput: { flex: 1, color: palette.ink, fontSize: 32, fontWeight: '700', paddingVertical: 8, marginLeft: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateButton: { backgroundColor: palette.primarySoft, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateButtonText: { color: palette.primary, fontSize: 26, fontWeight: '700' },
  dateInput: { flex: 1, textAlign: 'center', color: palette.ink, fontSize: 16, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: palette.line, minHeight: 42 },
  hint: { color: palette.muted, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: palette.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 },
  chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  chipText: { color: palette.ink, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  more: { paddingHorizontal: 13, paddingVertical: 10 },
  moreText: { color: palette.primary, fontSize: 14, fontWeight: '700' },
  noteInput: { color: palette.ink, fontSize: 15, minHeight: 64, textAlignVertical: 'top' },
  error: { color: palette.expense, fontSize: 14, lineHeight: 20 },
  deleteButton: { alignItems: 'center', padding: 14 },
  deleteText: { color: palette.expense, fontSize: 15, fontWeight: '700' },
});
