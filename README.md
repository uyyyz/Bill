# 记账本

基于 Expo SDK 57、React Native 和 SQLite 的中文本地记账应用。可记录每日收入与支出、管理分类，并查看月度及年度统计。数据只保存在设备本机；正式 Android 构建关闭系统自动备份。

## 开发

在工程目录安装依赖并启动 Expo：

```powershell
npm install
npx.cmd expo start
```

在 Expo 终端按 `a` 打开 Android 模拟器。Expo Go 中的预览数据与正式 APK 的数据相互独立。

## 验证

```powershell
node scripts/verify-ledger.cjs
npx.cmd expo lint
npx.cmd tsc --noEmit
```

`verify-ledger.cjs` 使用内存数据库核对计划中的六笔样例、跨年边界、分类历史保留和清空逻辑，不修改设备上的账本。

详细功能规则和验收步骤见 [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)。
