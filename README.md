# 車站資產自動提醒手機 App（PWA）

## 使用方式
1. 將整包檔案部署到 HTTPS 網站（例如 GitHub Pages、Netlify、Vercel、公司內部 HTTPS）。
2. 用手機 Chrome / Safari 開啟 `index.html`。
3. 點選「啟用手機通知」。
4. Android Chrome 可點「安裝App」或瀏覽器選單「加入主畫面」。iPhone Safari 可用分享選單「加入主畫面」。

## 功能
- 多資產管理：車輛、發電機、通訊設備、消防設備、一般設備。
- 保養提醒：依「數值週期（km/hr/次）」與「天數週期」判斷。
- 手機通知：App 開啟時每 60 秒自動檢查。
- CSV 匯出備份。
- 離線可開啟（PWA 快取）。

## 重要限制
瀏覽器版 PWA 若要「完全不用開 App 也定時推播」，需要後端排程，例如 Google Apps Script + LINE 推播。此版本先提供手機可安裝與開啟後自動提醒。

## 建議下一步
如需真正背景自動提醒：將資料同步到 Google Sheet，再用 Apps Script 每日排程傳 LINE。
