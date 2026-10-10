# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 仮眠最適化アプリ (nap-optimizer)

ビジネスパーソン向けに、仮眠の条件(時間帯・場所・姿勢)と仮眠後のパフォーマンスを記録し、
自分に合う仮眠パターンを見つけるアプリ。前夜の睡眠時間から「睡眠負債」も表示する。
仕様と Phase1 の範囲は `README.md` を参照。

## 進め方の約束

- ユーザーへの説明・質問・コミットメッセージは **日本語** で書く。許可確認に出るコマンドの説明も日本語にする。
- ユーザーはコードに詳しくない前提で、専門用語は短く言い換えるか一言説明を添える。
- 大きめの機能は、実装前に「何をどう変えるか」の計画を短く見せて確認を取る。
- 区切りごとにコミットして push する(クラウド環境は消えるため、push していない変更は失われる)。

## 技術スタック

- Expo SDK 57 / React Native 0.86 / React 19 / TypeScript(strict)
- 画面遷移は expo-router(ファイルベース、`src/app/` 以下)。typedRoutes と React Compiler が有効。
- データは AsyncStorage にのみ保存。サーバー・アカウント・センサー連携はなし(単一ユーザー)。
- グラフは react-native-chart-kit。
- Expo の API は最近変わっているので、使う前に v57 のドキュメント(https://docs.expo.dev/versions/v57.0.0/)を確認する。記憶にある古い書き方を使わない。

## コマンド

```bash
npm install          # 依存関係のインストール(クラウド環境では最初に必要)
npx expo start --web # Web で起動して画面を確認
npx tsc --noEmit     # 型チェック(変更後は必ず通す)
```

- 自動テストはまだない。変更後は最低限、型チェックを通し、可能なら Web で起動して画面を確認する。
- `npm run lint`(expo lint)は ESLint の設定ファイルが無いため、実行すると設定を自動インストールしようとしてネットワークエラーになる。lint を使うなら先に設定を追加する必要がある。

## 全体の仕組み

- **画面遷移**: ルート `src/app/_layout.tsx` の Stack に、タブ `(tabs)`(ホーム・週次グラフ)と、`nap/start`・`sleep/log`(モーダル)、`nap/result` が並ぶ。
- **仮眠記録の流れ**: `nap/start` で条件を選びタイマー開始 → 終了時に `router.replace` で `nap/result` へ。仮眠データは **URL パラメータ(すべて文字列)** で渡し、`nap/result` で評価を入力して初めて `addNapLog` で保存する。保存後は `router.dismissAll()` でホームに戻る。項目を増やすときは start の params と result の受け取り・数値変換の両方を直す。
- **データ層**: `lib/storage.ts` が「キーごとに JSON 配列を丸ごと読み書き」する薄い層。`napRepository` / `sleepRepository` / `settings` がその上にあり、キーは `@nap_optimizer/...`。
- **睡眠記録**: 1 日 1 件。同じ日付で保存すると上書きされる。`sleep_hours`(手入力が優先、無ければ就寝・起床から計算)と `sleep_debt`(目標 − 実睡眠)は **保存時に計算して記録に埋め込む**。後から目標睡眠時間(`settings.ts`、既定 7 時間)を変えても過去の負債は変わらない。
- **表示側**: タブ画面は `useFocusEffect` で表示のたびに読み直す(グローバルな状態管理は無い)。週次グラフは直近 7 日分を集計し、仮眠のパフォーマンススコアは `(集中力 + (6 − 眠気)) / 2`(`(tabs)/stats.tsx`)。

## コードの書き方

- import は `@/` エイリアス(`@/components/...`、`@/lib/...`)を使う。
- 色は直書きせず `useTheme()` の値を使い、ライト/ダーク両方で見えるようにする。新しい色が必要なら `constants/theme.ts` の light と dark の両方に追加する。
- 余白は `Spacing`、文字は `ThemedText`、背景は `ThemedView` を使う。
- AsyncStorage を画面から直接触らず、`lib/*Repository.ts` を経由する。
- データ型を変えるときは `lib/types.ts` を更新し、既存の保存データ(古い形のデータ)を読んでも壊れないようにする。
- 画面の文言は日本語。日付は `YYYY-MM-DD`、時刻は `HH:MM` の文字列で保存する(`lib/date.ts` の関数を使う)。

## Phase1 でやらないこと

仮眠スポットの検索・地図、共有・SNS、プッシュ通知、睡眠センサーによる自動計測。
頼まれていない限りこれらは実装しない。
