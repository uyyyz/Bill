const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

// Run the actual data module against a disposable in-memory SQLite database.
const sourcePath = path.join(__dirname, '..', 'src', 'data', 'ledger.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = new Module(sourcePath, module);
loaded.filename = sourcePath;
loaded.paths = module.paths;
loaded._compile(compiled, sourcePath);
const ledger = loaded.exports;

const sqlite = new DatabaseSync(':memory:');
const args = (values) => values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
const db = {
  async execAsync(sql) { sqlite.exec(sql); },
  async runAsync(sql, ...values) { return sqlite.prepare(sql).run(...args(values)); },
  async getFirstAsync(sql, ...values) { return sqlite.prepare(sql).get(...args(values)) ?? null; },
  async getAllAsync(sql, ...values) { return sqlite.prepare(sql).all(...args(values)); },
  async withExclusiveTransactionAsync(callback) {
    sqlite.exec('BEGIN EXCLUSIVE');
    try {
      const result = await callback(db);
      sqlite.exec('COMMIT');
      return result;
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  },
};

async function totals(from, to, income, expense) {
  assert.deepEqual(await ledger.getTotals(db, from, to), {
    income_cents: income,
    expense_cents: expense,
  });
}

async function main() {
  await ledger.migrateDatabase(db);
  await ledger.migrateDatabase(db);
  assert.equal((await ledger.listCategories(db)).length, 18, 'defaults must not duplicate');
  const categories = await ledger.listCategories(db);
  const categoryId = (type, name) => categories.find((item) => item.type === type && item.name === name).id;
  const sample = [
    ['2026-09-01', 'income', '工资', 100000],
    ['2026-09-02', 'expense', '吃喝', 3000],
    ['2026-09-03', 'expense', '打车', 1500],
    ['2026-09-04', 'expense', '租房', 20000],
    ['2026-10-01', 'income', '兼职', 50000],
    ['2026-10-02', 'expense', '购物', 5000],
  ];
  for (const [entry_date, type, name, amount_cents] of sample) {
    await ledger.saveEntry(db, { type, amount_cents, entry_date, category_id: categoryId(type, name), note: '' });
  }

  await totals('2026-09-01', '2026-10-01', 100000, 24500);
  await totals('2026-10-01', '2026-11-01', 50000, 5000);
  await totals('2026-01-01', '2027-01-01', 150000, 29500);
  await totals('2026-11-01', '2026-12-01', 0, 0);
  assert.deepEqual((await ledger.getExpenseCategories(db, '2026-09-01', '2026-10-01')).map(({ category_name, amount_cents }) => [category_name, amount_cents]), [
    ['租房', 20000], ['吃喝', 3000], ['打车', 1500],
  ]);
  assert.deepEqual((await ledger.getCategoryTotals(db, 'income', '2026-09-01', '2026-10-01')).map(({ category_name, amount_cents }) => [category_name, amount_cents]), [
    ['工资', 100000],
  ]);
  const foodTrend = await ledger.getCategoryDailyExpenses(db, categoryId('expense', '吃喝'), '2026-09-30');
  assert.equal(foodTrend.length, 30);
  assert.deepEqual(foodTrend[0], { date: '2026-09-01', amount_cents: 0 });
  assert.deepEqual(foodTrend[1], { date: '2026-09-02', amount_cents: 3000 });
  assert.deepEqual(foodTrend[29], { date: '2026-09-30', amount_cents: 0 });
  const incomeTrend = await ledger.getCategoryDailyTotals(db, 'income', categoryId('income', '工资'), '2026-09-30');
  assert.equal(incomeTrend.length, 30);
  assert.deepEqual(incomeTrend[0], { date: '2026-09-01', amount_cents: 100000 });
  assert.equal(incomeTrend.slice(1).reduce((sum, day) => sum + day.amount_cents, 0), 0);
  const months = await ledger.getYearMonths(db, 2026);
  assert.equal(months.length, 12);
  assert.deepEqual(months[8], { month: '2026-09', income_cents: 100000, expense_cents: 24500 });
  assert.deepEqual(months[9], { month: '2026-10', income_cents: 50000, expense_cents: 5000 });

  const taxiId = categoryId('expense', '打车');
  await ledger.setCategoryActive(db, taxiId, false);
  assert.equal((await ledger.listCategories(db, 'expense')).some((item) => item.id === taxiId), false);
  assert.equal((await ledger.listEntriesByDate(db, '2026-09-03'))[0].category_name, '打车');
  await totals('2026-09-01', '2026-10-01', 100000, 24500);
  await ledger.setCategoryActive(db, taxiId, true);

  const taxiEntry = (await ledger.listEntriesByDate(db, '2026-09-03'))[0];
  await ledger.saveEntry(db, { id: taxiEntry.id, type: 'expense', amount_cents: 2000, entry_date: '2026-09-03', category_id: taxiId, note: '' });
  await totals('2026-09-01', '2026-10-01', 100000, 25000);
  await ledger.deleteEntry(db, taxiEntry.id);
  await totals('2026-09-01', '2026-10-01', 100000, 23000);

  await ledger.saveEntry(db, { type: 'expense', amount_cents: 100, entry_date: '2027-01-01', category_id: categoryId('expense', '吃喝'), note: '' });
  const crossYearTrend = await ledger.getCategoryDailyExpenses(db, categoryId('expense', '吃喝'), '2027-01-01');
  assert.deepEqual(crossYearTrend[29], { date: '2027-01-01', amount_cents: 100 });
  await totals('2026-01-01', '2027-01-01', 150000, 28000);
  await totals('2027-01-01', '2028-01-01', 0, 100);
  assert.equal(ledger.parseMoney('30.01'), 3001);
  assert.equal(ledger.parseMoney('0'), null);
  assert.equal(ledger.formatMoney(150000), '¥1,500.00');
  assert.equal(ledger.isValidDate('2026-02-29'), false);
  assert.equal(ledger.addDays('2026-12-31', 1), '2027-01-01');

  await ledger.addCategory(db, 'expense', '测试分类');
  await ledger.clearAllData(db);
  await totals('2026-01-01', '2028-01-01', 0, 0);
  const resetCategories = await ledger.listCategories(db, undefined, true);
  assert.equal(resetCategories.length, 18);
  assert.equal(resetCategories.some((item) => item.name === '测试分类'), false);
  console.log('账本数据验证通过：样例统计、跨年边界、编辑删除、分类历史和清空。');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => sqlite.close());
