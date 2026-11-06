# クローゼットコーデ(PoC-1・Web 版)

手持ちの服を写真で登録し、天気・場面・テイストに合わせて全身コーデを自動で組むアプリです。
コーデの採点(100点満点)、好みの学習、買い足し提案もできます。

- **完全無料**: AI などの有料 API は使っていません。採点と提案はすべてルールベースです。
- **データは端末内だけ**: 服の情報は localStorage、写真は IndexedDB に保存します。外部との通信は天気予報(Open-Meteo、キー不要)だけです。

## 起動

```bash
cd closet-app
npm install
npm run web
```

ブラウザで http://localhost:8081 を開きます。スマホのブラウザからでも同じネットワーク内なら開けます。

## テスト

```bash
npm test          # domain / services の単体テスト(Jest)
npm run typecheck # TypeScript の型チェック
```

## 画面

| タブ | できること |
|---|---|
| コーデ | 天気(自動取得・手動変更)× 場面 × テイストで最大3案を提案。主役の服を固定、⭐評価・これはない・今日これ着る |
| クローゼット | 写真で登録(主な色を自動推定)、属性の編集、洗濯中/クリーニング中、着用1回あたりの単価。「手組みする」から自分でコーデを作って採点 |
| おすすめ | 場面に足りない服と、買い足すと組めるコーデが増える定番アイテム(検索キーワード付き) |
| 履歴 | 着た記録と評価したコーデ |

右上の ⚙️ から、スタイル・身長・体型・位置情報・データ削除を設定できます。

## 構成

```
src/
  domain/    採点・提案・買い足しのロジック(副作用なし・テスト対象)
    critic.ts       コーデ評価(色25/場面25/天気20/テイスト15/シルエット15)
    engine.ts       コーデ作成
    occasionRules.ts 場面ごとのルール(結婚式の白NG など)
    recommend.ts    買い足し提案
  services/  保存・写真・天気・色推定
  state/     React のストア
  app/       画面(expo-router)
```

AI に置き換えたい部分は `ItemRecognizer`(services/recognizer.ts)、`ruleEngine`(domain/engine.ts)、`ruleCritic`(domain/critic.ts)の3つで、中身を差し替えれば Claude 版にできます。

## まだやっていないこと

- PoC-2: 予定の先取り、旅行の荷造り、バックアップ
- Claude など AI への差し替え
- ネイティブアプリ(iOS/Android)での写真保存(現在は Web 版のみ対応)

設計は `docs/specs/`、実装計画は `docs/plans/` にあります。
