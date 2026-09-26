# 牢大账本

基于 Expo、React Native 和 SQLite 的本地记账应用，支持 Android。

## 功能

- 记录收入和支出，自定义分类；可从相册选择或拍摄最多 5 张照片，留存借还款等凭证。
- 点击日期打开日历，快速查看或补记指定日期的账目。
- 按月、按年查看统计；月统计支持收入与支出分类、条形图与饼图切换，点击分类可查看近 30 天的收支折线图。
- 账目和照片仅保存在本机；Android 自动备份已关闭。

## 下载 Android APK

[下载牢大账本 1.0.2 APK](https://expo.dev/artifacts/eas/boaaogaG26UyqIx5JXHHlbfKwSi4dwzLbXxqSA08AYw.apk) · [查看 EAS 构建记录](https://expo.dev/accounts/yuzu_ki/projects/ledger-app/builds/9791d2d7-0a3b-45fc-9e39-f24ef430db3e)

包名：`com.personal.ledgerapp`。Expo EAS 标示此构建产物保留至 **2026-10-10 04:04 UTC**；下载链接过期后需要重新构建。

## 本地开发

在本工程目录运行：

```powershell
npm install
npx.cmd expo start
```

Expo Go 中的预览数据与正式 APK 的数据相互独立。运行检查：

```powershell
node scripts/verify-ledger.cjs
npx.cmd expo lint
npx.cmd tsc --noEmit
```

使用 Expo EAS 云端构建 APK：

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest build --platform android --profile preview
```
