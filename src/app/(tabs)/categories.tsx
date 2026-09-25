import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Page, PageHeading } from '@/components/ledger-ui';
import { palette } from '@/constants/ledger-theme';
import { addCategory, Category, clearAllData, EntryType, listCategories, moveCategory, renameCategory, setCategoryActive } from '@/data/ledger';

export default function CategoriesScreen() {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newNames, setNewNames] = useState({ expense: '', income: '' });
  const [selectedId, setSelectedId] = useState('');
  const [draftName, setDraftName] = useState('');

  const refresh = useCallback(async () => {
    const items = await listCategories(db, undefined, true);
    setCategories(items);
    setError('');
    setLoading(false);
  }, [db]);

  useFocusEffect(useCallback(() => {
    let active = true;
    listCategories(db, undefined, true).then((items) => {
      if (active) { setCategories(items); setError(''); setLoading(false); }
    }).catch(() => {
      if (active) { setError('分类读取失败，请重新打开页面'); setLoading(false); }
    });
    return () => { active = false; };
  }, [db]));

  async function perform(action: () => Promise<void>) {
    try { await action(); await refresh(); }
    catch (cause) { Alert.alert('操作未完成', cause instanceof Error ? cause.message : '请稍后重试'); }
  }

  function choose(item: Category) {
    if (selectedId === item.id) { setSelectedId(''); return; }
    setSelectedId(item.id);
    setDraftName(item.name);
  }

  function confirmStop(item: Category) {
    Alert.alert('停用分类？', `“${item.name}”将不再用于新记录。历史记录和统计会保留，之后也可恢复。`, [
      { text: '取消', style: 'cancel' },
      { text: '停用', style: 'destructive', onPress: () => { void perform(() => setCategoryActive(db, item.id, false)); } },
    ]);
  }

  function confirmClear() {
    Alert.alert('清空全部数据？', '所有收支记录和自定义分类设置都会删除，默认分类会恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '继续', style: 'destructive', onPress: () => Alert.alert('最后确认', '此操作不可撤销。确定清空全部数据吗？', [
        { text: '取消', style: 'cancel' },
        { text: '确定清空', style: 'destructive', onPress: () => { void perform(async () => { await clearAllData(db); setSelectedId(''); Alert.alert('已清空', '收支记录已删除，默认分类已恢复。'); }); } },
      ]) },
    ]);
  }

  function renderGroup(type: EntryType, title: string) {
    const items = categories.filter((item) => item.type === type);
    const active = items.filter((item) => item.is_active);
    const inactive = items.filter((item) => !item.is_active);
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={newNames[type]}
            onChangeText={(value) => setNewNames((current) => ({ ...current, [type]: value }))}
            placeholder="添加分类名称"
            placeholderTextColor="#9AA69F"
            maxLength={30}
            accessibilityLabel={`新增${title}名称`}
          />
          <ActionButton title="添加" onPress={() => void perform(async () => {
            await addCategory(db, type, newNames[type]);
            setNewNames((current) => ({ ...current, [type]: '' }));
          })} />
        </View>
        {active.map((item) => renderItem(item, items))}
        {inactive.length > 0 && <Text style={styles.subheading}>已停用</Text>}
        {inactive.map((item) => renderItem(item, items))}
      </View>
    );
  }

  function renderItem(item: Category, group: Category[]) {
    const index = group.findIndex((candidate) => candidate.id === item.id);
    const selected = selectedId === item.id;
    return (
      <View key={item.id} style={styles.item}>
        <Pressable accessibilityRole="button" onPress={() => choose(item)} style={styles.itemHead}>
          <Text style={[styles.itemName, !item.is_active && styles.inactive]} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemArrow}>{selected ? '⌃' : '⌄'}</Text>
        </Pressable>
        {selected && <View style={styles.actions}>
          <View style={styles.addRow}>
            <TextInput style={styles.input} value={draftName} onChangeText={setDraftName} maxLength={30} accessibilityLabel="修改分类名称" />
            <ActionButton title="改名" onPress={() => void perform(() => renameCategory(db, item.id, draftName))} />
          </View>
          <View style={styles.actionRow}>
            {index > 0 && <ActionButton title="上移" onPress={() => void perform(() => moveCategory(db, item.id, -1))} />}
            {index < group.length - 1 && <ActionButton title="下移" onPress={() => void perform(() => moveCategory(db, item.id, 1))} />}
            {item.is_active ? <ActionButton title="停用" danger onPress={() => confirmStop(item)} /> :
              <ActionButton title="恢复" onPress={() => void perform(() => setCategoryActive(db, item.id, true))} />}
          </View>
        </View>}
      </View>
    );
  }

  return (
    <Page>
      <PageHeading eyebrow="个性化管理" title="分类" description="添加、改名、排序或停用分类；旧记录始终保留。" />
      {loading ? <ActivityIndicator color={palette.primary} /> : error ? <Text style={styles.error}>{error}</Text> : <>
        {renderGroup('expense', '支出分类')}
        {renderGroup('income', '收入分类')}
        <View style={styles.card}>
          <Text style={styles.title}>数据管理</Text>
          <Text style={styles.clearHint}>清空后会删除全部记录与自定义分类设置，无法恢复。</Text>
          <ActionButton title="清空全部数据" danger onPress={confirmClear} />
        </View>
      </>}
    </Page>
  );
}

function ActionButton({ title, onPress, danger = false }: { title: string; onPress: () => void; danger?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.actionButton, danger && styles.dangerButton]}><Text style={[styles.actionText, danger && styles.dangerText]}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.surface, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: palette.line, gap: 4 },
  title: { color: palette.ink, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  subheading: { color: palette.muted, fontSize: 13, fontWeight: '700', marginTop: 18, marginBottom: 4 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, minWidth: 0, minHeight: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: palette.line, borderRadius: 10, color: palette.ink, fontSize: 14 },
  item: { borderTopWidth: 1, borderTopColor: palette.line },
  itemHead: { flexDirection: 'row', minHeight: 52, alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  itemName: { flex: 1, color: palette.ink, fontSize: 15, fontWeight: '600' },
  inactive: { color: palette.muted },
  itemArrow: { color: palette.muted, fontSize: 18 },
  actions: { paddingBottom: 12 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { backgroundColor: palette.primarySoft, borderRadius: 10, minHeight: 40, minWidth: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11 },
  actionText: { color: palette.primary, fontSize: 13, fontWeight: '700' },
  dangerButton: { backgroundColor: palette.expenseSoft },
  dangerText: { color: palette.expense },
  error: { color: palette.expense, fontSize: 14 },
  clearHint: { color: palette.muted, fontSize: 13, lineHeight: 20, marginBottom: 10 },
});
