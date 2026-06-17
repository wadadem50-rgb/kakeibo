# 家計簿 PWA

個人用の家計簿アプリ（PWA）。iPhoneのホーム画面に追加して使う。サーバー・ログイン不要、データはiPhone内（IndexedDB）に保存される。

## 構成
- `index.html` / `styles.css` / `app.js` — アプリ本体（素のHTML/CSS/JS）
- `manifest.webmanifest` — PWA設定
- `sw.js` — Service Worker（オフライン対応）
- `icons/` — アイコン（180/192/512）

## 画面（v1）
- **入力**：日付（当日デフォルト・前日等に変更可）／支出・収入／金額／カテゴリ（選択＋直接入力で追加）／メモ
- **一覧**：月ごと・日付ごとに表示、各行を削除可
- **サマリー**：当月の収入・支出・残高、支出のカテゴリ別内訳（棒）

## Macで動作確認（localhost）
```sh
cd ~/kakeibo
python3 -m http.server 8000
```
ブラウザで http://localhost:8000 を開く。（Service WorkerはlocalhostまたはHTTPSでのみ動作）

## iPhoneで使う（GitHub Pagesに公開）
1. GitHubで新規リポジトリ（privateでも可）を作成
2. このフォルダをpush
   ```sh
   cd ~/kakeibo
   git add -A && git commit -m "家計簿PWA v1"
   git branch -M main
   git remote add origin <リポジトリのURL>
   git push -u origin main
   ```
3. リポジトリの Settings → Pages → Branch を `main` / `/(root)` にして保存
4. 数分後に発行されるURL（https://〜.github.io/リポジトリ名/）をiPhoneのSafariで開く
5. 共有ボタン → 「ホーム画面に追加」

> 更新を反映したいときは `sw.js` の `CACHE = 'kakeibo-v1'` のバージョンを上げてpushする。

## データについて
- データは端末のブラウザ内に保存される。Safariの履歴/サイトデータを消すと消える点に注意。
- バックアップ機能は未実装（必要になったら追加予定）。
