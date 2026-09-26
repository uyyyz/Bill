# 牢大账本

基于 Expo SDK 57、React Native 和 SQLite 的中文本地记账应用。可记录每日收入与支出、管理分类，并查看月度及年度统计。记账时可从相册选取或拍摄最多 5 张照片，作为本地档案；编辑记录可查看、移除或补充照片。月统计可按收入、支出分类查看条形明细或饼图；点击任一分类可查看近 30 天的每日收支折线图。点击统计期间可直接选择月份或年份，点击账本或记账页的日期可从日历快速选择。数据只保存在设备本机；正式 Android 构建关闭系统自动备份。

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

`verify-ledger.cjs` 使用内存数据库核对计划中的六笔样例、跨年边界、照片关联、分类历史保留和清空逻辑，不修改设备上的账本。

## 构建 Android APK

应用显示名为“牢大账本”，应用标识为 `com.personal.ledgerapp`，版本为 1.0.2。`eas.json` 的 `preview` 配置生成可直接安装的 APK。首次构建需要先登录 Expo 账号：

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest build --platform android --profile preview
```

首次构建时按 EAS 提示关联项目并生成 Android 签名密钥。下载 APK 后还需在真机核对记账、统计、重启和清空流程。

详细功能规则和验收步骤见 [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)。
