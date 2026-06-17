# 家計簿PWA 引き継ぎ資料

このファイルは、別のセッション/別の人（または将来の自分）がこのプロジェクトを引き継ぐための情報をまとめたものです。
最終更新: 2026-06-17

---

## 1. このプロジェクトは何か
- **個人用の家計簿アプリ（PWA）**。自分のiPhoneでのみ使う。一般公開はしない方針。
- ネイティブ（SwiftUI）ではなく **PWA** を採用。理由：署名の7日期限切れがない／費用ゼロ／サーバー・ログイン不要／無料ホスティングからiPhoneに「ホーム画面追加」で入れられる。
- 素のHTML/CSS/JS（フレームワーク・依存ライブラリなし）。データ保存は **IndexedDB**（端末内・オフライン動作）。

## 2. 公開URLとリポジトリ
- **公開URL**: https://wadadem50-rgb.github.io/kakeibo/
- **リポジトリ**: https://github.com/wadadem50-rgb/kakeibo （**Public**）
  - ※GitHub無料プランでは Public リポジトリでないと GitHub Pages を使えないため Public。
  - ※公開されるのは**アプリのコードのみ**。家計データはリポジトリに含まれず、iPhone内（IndexedDB）にのみ保存される。
- **GitHubアカウント**: wadadem50-rgb
- **ローカル作業フォルダ**: `~/kakeibo`

## 3. iPhoneで使う / インストール
1. iPhoneの **Safari** で公開URLを開く（Chrome等ではなくSafari）
2. 共有ボタン → **「ホーム画面に追加」** → 「追加」
3. ホーム画面のアイコンから全画面で起動。オフラインでも動作。

## 4. ファイル構成
| ファイル | 役割 |
|---|---|
| `index.html` | 画面構造（入力／一覧／サマリーの3ビュー＋下部タブ） |
| `styles.css` | 配色（落ち着いた緑系）・数字はタブ揃え（等幅）・収入=緑/支出=赤 |
| `app.js` | ロジック全部（IndexedDB操作・入力・一覧・サマリー・月切替） |
| `manifest.webmanifest` | PWA設定（standalone起動・アイコン） |
| `sw.js` | Service Worker（オフラインキャッシュ） |
| `icons/` | アイコン 180/192/512（緑地の棒グラフ） |
| `README.md` | 概要・ローカル確認・デプロイ手順 |
| `HANDOFF.md` | このファイル |

## 5. 実装済み機能（v1）
- **入力**：日付（当日デフォルト・前日等に変更可）／支出・収入切替／金額／カテゴリ（選択＋「直接入力」で新カテゴリ追加し自動保存）／メモ。記録後は日付と区分を維持して連続入力しやすい。
- **一覧**：月切替、日付ごとにグループ表示、各行を削除可。
- **サマリー**：当月の収入・支出・残高＋支出のカテゴリ別内訳（棒グラフ）。月切替対応。

### データ構造（entries ストア・1レコード）
```
{ id(自動), date:"YYYY-MM-DD", amount:数値, type:"expense"|"income",
  category:文字列, memo:文字列, createdAt:タイムスタンプ }
```
カテゴリのデフォルト値は `app.js` の `DEFAULT_CATEGORIES`。追加分は categories ストアに保存。

## 6. アプリを更新する手順
コードを編集したら：
```sh
cd ~/kakeibo
# 表示の更新を確実に反映したい場合は sw.js の CACHE = 'kakeibo-v1' のバージョン番号を上げる
git add -A
git commit -m "変更内容"
git push
```
→ 数分後に GitHub Pages に自動反映される。

## 7. ローカルで動作確認（Mac）
```sh
cd ~/kakeibo
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```
※Service WorkerはlocalhostまたはHTTPSでのみ動作する。

## 8. 開発環境メモ（この環境特有の事情）
- `gh`（GitHub CLI）は Homebrew を使わず単体バイナリを `~/.local/bin/gh` に配置。`~/.zshrc` でPATHを通済み。
- git の認証は `gh auth setup-git` 済み（HTTPS + gh の資格情報を使用）。
- 認証が切れた場合は `gh auth login --hostname github.com --git-protocol https --web` で再ログイン（ブラウザで https://github.com/login/device にコード入力）。

## 9. 注意点
- データは端末ブラウザ内（IndexedDB）にのみ存在。**Safariのサイトデータ/履歴を消すと家計データも消える**。
- **バックアップ機能は未実装**（下記TODO）。

## 10. 今後やりたいこと（TODO・優先度順の目安）
- [ ] データのバックアップ（JSON書き出し/読み込み）— データ消失対策として優先度高め
- [ ] カテゴリの並べ替え・編集・削除
- [ ] カテゴリ別内訳の円グラフ等の可視化強化
- [ ] 月をまたぐ集計・推移グラフ

> 進め方の方針：まず実際に数日使い、不満点から都度直す。欲しくなった順に機能追加する。
