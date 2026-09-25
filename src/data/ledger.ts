import type { SQLiteDatabase } from 'expo-sqlite';

export type EntryType = 'income' | 'expense';

export type Category = {
  id: string;
  name: string;
  type: EntryType;
  sort_order: number;
  is_active: number;
  is_default: number;
};

export type LedgerEntry = {
  id: string;
  type: EntryType;
  amount_cents: number;
  entry_date: string;
  category_id: string;
  category_name: string;
  note: string;
  created_at: string;
  updated_at: string;
};

export type Totals = { income_cents: number; expense_cents: number };
export type CategoryTotal = { category_id: string; category_name: string; amount_cents: number };
export type MonthTotal = { month: string; income_cents: number; expense_cents: number };

const defaults: { type: EntryType; names: string[] }[] = [
  { type: 'expense', names: ['吃喝', '购物', '租房', '打车', '日用', '水电燃气', '通讯', '医疗', '娱乐', '学习', '临时', '额外开销', '其他支出'] },
  { type: 'income', names: ['工资', '兼职', '奖金', '礼金', '其他收入'] },
];

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function seedCategories(db: SQLiteDatabase) {
  for (const group of defaults) {
    for (const [index, name] of group.names.entries()) {
      await db.runAsync(
        'INSERT INTO categories (id, name, type, sort_order, is_active, is_default) VALUES (?, ?, ?, ?, 1, 1)',
        `${group.type}-${index + 1}`, name, group.type, index,
      );
    }
  }
}

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((version?.user_version ?? 0) >= 1) return;

  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        sort_order INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
        UNIQUE (type, name)
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        entry_date TEXT NOT NULL,
        category_id TEXT NOT NULL REFERENCES categories(id),
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(entry_date);
      CREATE INDEX IF NOT EXISTS transactions_category_idx ON transactions(category_id);
    `);
    await seedCategories(tx);
    await tx.execAsync('PRAGMA user_version = 1');
  });
}

export async function listCategories(db: SQLiteDatabase, type?: EntryType, includeInactive = false) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (type) { clauses.push('type = ?'); params.push(type); }
  if (!includeInactive) clauses.push('is_active = 1');
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return db.getAllAsync<Category>(
    `SELECT * FROM categories ${where} ORDER BY type, sort_order, name`, params,
  );
}

export async function addCategory(db: SQLiteDatabase, type: EntryType, name: string) {
  const clean = name.trim();
  if (!clean) throw new Error('分类名称不能为空');
  const existing = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE type = ? AND name = ?', type, clean);
  if (existing) throw new Error('同一类型下已有此分类');
  const row = await db.getFirstAsync<{ next_order: number }>('SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_order FROM categories WHERE type = ?', type);
  await db.runAsync('INSERT INTO categories (id, name, type, sort_order, is_active, is_default) VALUES (?, ?, ?, ?, 1, 0)', id(), clean, type, row?.next_order ?? 0);
}

export async function renameCategory(db: SQLiteDatabase, categoryId: string, name: string) {
  const clean = name.trim();
  if (!clean) throw new Error('分类名称不能为空');
  const current = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', categoryId);
  if (!current) throw new Error('分类不存在');
  const duplicate = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE type = ? AND name = ? AND id != ?', current.type, clean, categoryId);
  if (duplicate) throw new Error('同一类型下已有此分类');
  await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', clean, categoryId);
}

export async function setCategoryActive(db: SQLiteDatabase, categoryId: string, active: boolean) {
  await db.runAsync('UPDATE categories SET is_active = ? WHERE id = ?', active ? 1 : 0, categoryId);
}

export async function moveCategory(db: SQLiteDatabase, categoryId: string, direction: -1 | 1) {
  const current = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', categoryId);
  if (!current) return;
  const categories = await listCategories(db, current.type, true);
  const currentIndex = categories.findIndex((category) => category.id === categoryId);
  const neighbor = categories[currentIndex + direction];
  if (!neighbor) return;
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', neighbor.sort_order, current.id);
    await tx.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', current.sort_order, neighbor.id);
  });
}

export async function listEntriesByDate(db: SQLiteDatabase, date: string) {
  return db.getAllAsync<LedgerEntry>(`
    SELECT t.*, c.name AS category_name
    FROM transactions t JOIN categories c ON c.id = t.category_id
    WHERE t.entry_date = ?
    ORDER BY t.created_at DESC, t.id DESC
  `, date);
}

export async function getEntry(db: SQLiteDatabase, entryId: string) {
  return db.getFirstAsync<LedgerEntry>(`
    SELECT t.*, c.name AS category_name
    FROM transactions t JOIN categories c ON c.id = t.category_id
    WHERE t.id = ?
  `, entryId);
}

export async function saveEntry(db: SQLiteDatabase, entry: { id?: string; type: EntryType; amount_cents: number; entry_date: string; category_id: string; note: string }) {
  if (!Number.isSafeInteger(entry.amount_cents) || entry.amount_cents <= 0) throw new Error('金额必须大于 0');
  if (!isValidDate(entry.entry_date)) throw new Error('请输入有效日期');
  const category = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', entry.category_id);
  if (!category || category.type !== entry.type) throw new Error('请选择对应类型的分类');
  if (!category.is_active && !entry.id) throw new Error('该分类已停用，请选择其他分类');
  const now = new Date().toISOString();
  if (entry.id) {
    const prior = await getEntry(db, entry.id);
    if (!prior) throw new Error('记录不存在');
    if (!category.is_active && category.id !== prior.category_id) throw new Error('该分类已停用，请选择其他分类');
    await db.runAsync('UPDATE transactions SET type = ?, amount_cents = ?, entry_date = ?, category_id = ?, note = ?, updated_at = ? WHERE id = ?', entry.type, entry.amount_cents, entry.entry_date, entry.category_id, entry.note.trim(), now, entry.id);
  } else {
    await db.runAsync('INSERT INTO transactions (id, type, amount_cents, entry_date, category_id, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', id(), entry.type, entry.amount_cents, entry.entry_date, entry.category_id, entry.note.trim(), now, now);
  }
}

export async function deleteEntry(db: SQLiteDatabase, entryId: string) {
  await db.runAsync('DELETE FROM transactions WHERE id = ?', entryId);
}

export async function getTotals(db: SQLiteDatabase, from: string, to: string): Promise<Totals> {
  const rows = await db.getAllAsync<{ type: EntryType; amount_cents: number }>(
    'SELECT type, COALESCE(SUM(amount_cents), 0) AS amount_cents FROM transactions WHERE entry_date >= ? AND entry_date < ? GROUP BY type', from, to,
  );
  return {
    income_cents: rows.find((row) => row.type === 'income')?.amount_cents ?? 0,
    expense_cents: rows.find((row) => row.type === 'expense')?.amount_cents ?? 0,
  };
}

export async function getExpenseCategories(db: SQLiteDatabase, from: string, to: string) {
  return db.getAllAsync<CategoryTotal>(`
    SELECT t.category_id, c.name AS category_name, SUM(t.amount_cents) AS amount_cents
    FROM transactions t JOIN categories c ON c.id = t.category_id
    WHERE t.type = 'expense' AND t.entry_date >= ? AND t.entry_date < ?
    GROUP BY t.category_id ORDER BY amount_cents DESC, c.name
  `, from, to);
}

export async function getYearMonths(db: SQLiteDatabase, year: number): Promise<MonthTotal[]> {
  const from = `${year}-01-01`;
  const to = `${year + 1}-01-01`;
  const rows = await db.getAllAsync<{ month: string; type: EntryType; amount_cents: number }>(`
    SELECT substr(entry_date, 1, 7) AS month, type, SUM(amount_cents) AS amount_cents
    FROM transactions WHERE entry_date >= ? AND entry_date < ?
    GROUP BY month, type
  `, from, to);
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`;
    return {
      month,
      income_cents: rows.find((row) => row.month === month && row.type === 'income')?.amount_cents ?? 0,
      expense_cents: rows.find((row) => row.month === month && row.type === 'expense')?.amount_cents ?? 0,
    };
  });
}

export async function clearAllData(db: SQLiteDatabase) {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync('DELETE FROM transactions; DELETE FROM categories;');
    await seedCategories(tx);
  });
}

export function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

export function addDays(value: string, days: number) {
  if (!isValidDate(value)) return value;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatMoney(cents: number) {
  const sign = cents < 0 ? '-' : '';
  return `${sign}¥${(Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function parseMoney(value: string) {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [yuan, fractional = ''] = trimmed.split('.');
  const cents = Number(yuan) * 100 + Number(fractional.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}
