# 全身コーデアプリ(closet-app) 設計仕様 — PoC

- 作成日: 2026-11-06
- 状態: レビュー待ち
- 対象: PoC-1(実装対象) / PoC-2(後続、本書では概要のみ)

## 1. 目的と前提

### 目的
手持ちの服をすべてアプリに登録し、天気・場面(雨の日、雪のイベント、結婚式など)・テイスト(シック等)に合わせた全身コーデを自動で組む。足りない服は買い足し提案を出す。コーデの評価と、評価にもとづく好みの学習も行う。

### 前提(ユーザー確認済み)
- 利用者は本人のみ。ログインなし、サーバーなし、データは端末内のみ。
- PoC は **完全無料**。AI(Claude API)は使わず、ルールベースで実装する。
- 将来 Claude に差し替えられるよう、AI に置き換える部分はインターフェースで分離する。
- 既存の昼寝アプリ(リポジトリ直下)はそのまま残し、`closet-app/` に独立した Expo SDK 57 アプリを作る。
- 天気は Open-Meteo(無料・キー不要)で自動取得し、手動で上書きできる。

### PoC の成功基準
1. 実機(Expo Go)と Web プレビューで、「服を登録 → 場面とテイストを選ぶ → コーデ3案が出る → 評価する」の流れが最後まで動く。
2. 結婚式・葬儀・雪・雨の各場面で、禁止ルールに当たる服がコーデに含まれない(テストで保証する)。
3. ⭐評価と「これはない」が、次回以降の提案順位に反映される(テストで保証する)。
4. 手組みしたコーデに対し、100点満点の評価・項目別の点数・改善案(1点差し替え)が表示される。

## 2. スコープ

### PoC-1(今回実装)
- クローゼット: 写真登録、属性のタップ選択、主な色の自動推定、ブランド・購入日・価格、着用1回あたりの単価、洗濯中/クリーニング中の状態
- コーデ: 天気 × 場面 × テイストで自動提案(最大3案)、「この服を主役に」、⭐評価 / これはない / 今日これ着る
- 手組み: 自分で服を選んでコーデを保存
- コーデ評価(OutfitCritic): 100点満点、項目別の点数、コメント、1点差し替えの改善案
- おすすめ: 足りない必須アイテムの提案と、買い足しで増えるコーデ数の多い順のランキング
- 履歴: 着用記録、評価済みコーデの一覧
- 設定: スタイル(メンズ/レディース/指定なし)、身長、体型、位置情報の利用 ON/OFF、データのリセット

### PoC-2(後続、別仕様で設計)
- 予定の先取り(日付+場面を登録し、その日の予報でコーデを準備)
- 旅行の荷造り(行き先・泊数から、使い回せる最小セットを提案)
- バックアップ(写真を含めて書き出し・読み込み)

### やらないこと
- Claude などの有料 AI の呼び出し、通販 API 連携、通知、SNS 共有、複数ユーザー

## 3. アーキテクチャ

```
closet-app/
  app.json, package.json, tsconfig.json, jest.config.js
  src/
    app/                    expo-router の画面
      _layout.tsx
      (tabs)/_layout.tsx
      (tabs)/index.tsx        コーデ(メイン)
      (tabs)/closet.tsx       クローゼット
      (tabs)/recommend.tsx    おすすめ
      (tabs)/history.tsx      履歴
      item/new.tsx            服の追加
      item/[id].tsx           服の詳細・編集
      outfit/manual.tsx       手組み
      outfit/[id].tsx         コーデの詳細・評価
      settings.tsx
    components/             UI 部品(ItemCard, OutfitView, ScoreBreakdown, ChipSelect …)
    domain/                 純粋なロジック(React / Expo に依存しない)
      types.ts
      catalog.ts              カテゴリ・色・素材・テイスト・場面の定義データ
      occasionRules.ts        場面ごとのルール
      tasteProfiles.ts        テイストごとの点数表
      color.ts                色の調和・基準色への振り分け
      weather.ts              天気から求める暖かさの目標範囲・雨雪の判定
      critic.ts               OutfitCritic のルール実装
      engine.ts               OutfitEngine のルール実装
      preference.ts           好みの学習(点数の集計)
      recommend.ts            買い足し提案
    services/               外部との接続(差し替え可能)
      recognizer.ts           ItemRecognizer(PoC: 色推定のみ)
      weatherApi.ts           Open-Meteo
      storage.ts              AsyncStorage
      photos.ts               写真の縮小・保存
    state/                  リポジトリ層とフック(useItems, useOutfits …)
```

- `domain/` は副作用のない純粋な関数だけで作り、Jest で単体テストする。
- 差し替え可能なインターフェース:
  - `ItemRecognizer.recognize(photoUri) => Promise<Partial<ItemAttributes>>`
  - `OutfitEngine.suggest(ctx) => OutfitCandidate[]`
  - `OutfitCritic.evaluate(outfit, ctx) => Evaluation`
- PoC ではそれぞれルール実装の `RuleRecognizer` / `RuleEngine` / `RuleCritic` を使う。本番では Claude 実装に差し替える。

## 4. 画面

| 画面 | 内容 |
|---|---|
| コーデ(タブ・メイン) | 上部に今日〜3日先の天気(タップで手動上書き)。場面とテイストをチップで選び、任意で主役の服を指定して「コーデを組む」。結果は最大3案を横スワイプで表示。各案に全身表示(アイテム写真を縦に並べる)、総合点、理由、⭐評価 / これはない / 今日これ着る。右上から設定へ |
| クローゼット(タブ) | 写真グリッド。カテゴリで絞り込み。状態バッジ(洗濯中など)。＋で追加、右上から手組みへ |
| 服の追加・編集 | カメラ / アルバム → 縮小・保存 → 色を推定 → 属性をチップで選択 → 保存。詳細画面では着用回数と1回あたりの単価、状態の切り替え、削除 |
| 手組み | カテゴリごとに服を選ぶ → その場で評価(点数・コメント・改善案)→ 保存 |
| コーデ詳細 | 評価の内訳、改善案(ワンタップで差し替え)、⭐評価、着用記録 |
| おすすめ(タブ) | 「今の場面で足りない服」と「買い足し効果ランキング」。それぞれ理由と検索キーワード(コピー可)を表示 |
| 履歴(タブ) | 着用記録(日付順)と評価済みコーデの一覧 |
| 設定 | スタイル、身長、体型、位置情報 ON/OFF、データのリセット |

## 5. データ

保存先: 写真は `expo-file-system` でアプリ専用フォルダへ(長辺 1024px に縮小)。それ以外は AsyncStorage に JSON で保存し、キーにバージョンを付ける(`closet:v1:items` など)。

```ts
type Category = 'tops' | 'bottoms' | 'outer' | 'onepiece' | 'shoes' | 'bag' | 'accessory';
type Season = 'spring' | 'summer' | 'autumn' | 'winter';
type Taste = 'chic' | 'casual' | 'kireime' | 'street' | 'natural' | 'mode';
type Occasion = 'everyday' | 'office' | 'date' | 'rain' | 'snowEvent' | 'outdoor'
              | 'weddingGuest' | 'funeral' | 'party';
type BaseColor = 'black' | 'white' | 'gray' | 'charcoal' | 'navy' | 'beige' | 'brown'
               | 'camel' | 'khaki' | 'olive' | 'green' | 'blue' | 'lightBlue' | 'red'
               | 'burgundy' | 'pink' | 'purple' | 'yellow' | 'orange' | 'gold' | 'silver';

interface Item {
  id: string; photoUri: string; category: Category; subcategory: string;
  colors: BaseColor[];            // [メイン, サブ…]
  pattern: 'solid' | 'stripe' | 'check' | 'print';
  material: string;               // catalog の素材 ID
  seasons: Season[]; warmth: 1|2|3|4|5; formality: 1|2|3|4|5;
  volume: 'slim' | 'regular' | 'loose';   // シルエット判定用
  length?: 'short' | 'regular' | 'long';   // 丈(ボトムス・アウター・ワンピース)
  tastes: Taste[]; waterResistant: boolean; shiny: boolean;
  brand?: string; purchasedAt?: string; price?: number;
  status: 'available' | 'laundry' | 'cleaning';
  createdAt: string;
}

interface Outfit {
  id: string; itemIds: string[]; source: 'auto' | 'manual';
  occasion?: Occasion; taste?: Taste; weather?: WeatherSnapshot;
  rating?: 1|2|3|4|5; rejected: boolean; createdAt: string;
}

interface WearLog { id: string; outfitId: string; date: string; }   // YYYY-MM-DD

interface Profile {
  style: 'mens' | 'womens' | 'unisex'; heightCm?: number;
  bodyType?: 'slim' | 'standard' | 'solid' | 'curvy'; useLocation: boolean;
}

interface WeatherSnapshot {
  date: string; tempMax: number; tempMin: number;
  precipProb: number; snow: boolean; manual: boolean;
}
```

- 着用回数と1回あたりの単価は、WearLog から都度計算する(保存しない)。
- 好みの点数(`Preference`)は保存せず、評価済みの Outfit から都度集計する(`preference.ts`)。
  - ⭐5 = +2、⭐4 = +1、⭐3 = 0、⭐2 = −1、⭐1 / これはない = −2
  - このコーデに含まれる服のペアごと(pairScore)と、服ごと(itemScore)に加算する

## 6. コーデ評価(OutfitCritic)

総合点 = 各項目の点数の加重合計(合計100点)。

| 項目 | 配点 | ルール |
|---|---|---|
| 色の調和 | 25 | 使用色(メイン色と、面積の大きい服のサブ色)が3色以内で満点、4色で−8、5色以上で−15。ベーシック色(黒・白・グレー・チャコール・ネイビー・ベージュ・ブラウン・キャメル)以外の差し色が2色以上で−6。柄物が2点以上で−5 |
| 場面との合い方 | 25 | 服ごとに場面のフォーマル度の範囲から外れた差 × 4 を減点。禁止ルールに当たる服があれば、この項目は0点、かつ `violations` に記録する(自動提案では除外される) |
| 天気・気温 | 20 | 暖かさの合計が目標範囲内なら満点。範囲外は差1ごとに−4。降水確率50%以上で撥水でない靴は−6、スエード/キャンバスの靴は−10。雪のときは防水の靴がなければ−12 |
| テイストの統一感 | 15 | テイストの点数表(色・柄・素材・服に付いたテイスト)の平均で採点 |
| シルエット | 15 | トップスとボトムスが両方 loose なら−6。身長160cm未満でロング丈アウター+ロング丈ボトムスなら−4。体型ごとの簡易ルール(例: solid は slim 同士を避ける)で−3 |

- 出力: `{ total, breakdown: {項目: 点数}, comments: string[], violations: string[], swaps: {fromItemId, toItemId, gain}[] }`
- 改善案(swaps): 各服を同じカテゴリの手持ちの服(使えるもののみ)と1点ずつ入れ替えて再評価し、点数が上がった上位3件を返す。

## 7. コーデ作成(OutfitEngine)

1. **天気を決める**: Open-Meteo の日別予報(最高・最低気温、降水確率、降雪量)。手動で上書きした値があればそちらを優先。
2. **暖かさの目標範囲**(平均気温):
   - 25℃以上: 2〜4
   - 20〜25℃: 3〜6
   - 15〜20℃: 5〜8
   - 10〜15℃: 7〜10
   - 5〜10℃: 9〜13
   - 5℃未満: 12以上
   - 目標の下限が6以上ならアウターを必須にする
3. **絞り込み**: `status === 'available'` の服のうち、季節が合う服(季節が空欄なら通年扱い)を残す。さらに場面の禁止ルールに当たる服を除外する。
4. **組み合わせ**:
   - 土台は「トップス+ボトムス」か「ワンピース」。これに靴(必須)を加え、必要に応じてアウター、場面ルールで推奨されていればバッグ・小物を加える。
   - 各カテゴリは、単体の点数(好み・テイスト・フォーマル度の合い方)の上位8件に絞ってから組み合わせる。
   - 主役が指定されていれば、そのカテゴリはその服だけに固定する。
5. **採点**: `critic.total + 好みの点数(ペア+服ごと)× 3 − 最近7日以内に着た服1点ごとに5`。
6. **選出**: 点数順に、すでに選んだ案と共通する服が1点以下のものを最大3案選ぶ。
7. **組めない場合**: 不足しているカテゴリや必須ルールを返し、画面で「靴が未登録です」などを表示しておすすめ画面へ誘導する。

### 場面ルール(`occasionRules.ts` にデータとして定義)

| 場面 | フォーマル度 | 必須・推奨 | 禁止 |
|---|---|---|---|
| 普段 | 1〜3 | – | – |
| 通勤 | 3〜4 | 靴のフォーマル度3以上 | ダメージ加工、サンダル |
| デート | 2〜4 | – | 部屋着(フォーマル度1) |
| 雨の日 | 指定なし | 撥水の靴とアウターを優先、ボトムスは濃い色を優先 | スエード・キャンバスの靴 |
| 雪のイベント | 1〜3 | 防寒アウター、防水の靴、暖かさの目標+2 | スエード・キャンバスの靴、サンダル |
| アウトドア | 1〜2 | スニーカーかブーツ | ヒール、革靴 |
| 結婚式(ゲスト) | 4〜5 | ジャケット(メンズ)、革靴かパンプス | メイン色が白、デニム、スニーカー、サンダル、全身黒(レディース) |
| 葬儀・法事 | 5 | メイン色が黒か濃紺、無地 | 光り物、柄物、ベーシック色以外の色 |
| パーティー | 3〜5 | – | 部屋着 |

### テイストの点数表(`tasteProfiles.ts`)
テイストごとに、好まれる色・柄・素材と、それぞれの重みを定義する。例: シック = 黒・グレー・チャコール・ネイビー・ベージュ(+)、無地(+)、ウール・レザー(+)、柄物(−)、原色(−)。

## 8. 買い足し提案(recommend)

1. **不足している必須アイテム**: 選択中の場面で必須ルールを満たす服がなければ、`catalog` のテンプレートから候補を出す。
   - 例: 撥水の靴 → 「撥水 レザースニーカー 黒」
2. **買い足し効果ランキング**:
   - あらかじめ定義した約30種類の定番アイテム(白無地シャツ、ネイビーのテーラードジャケット、黒のレザーシューズ など)を、1点ずつ仮に手持ちへ加える。
   - そのうえで「普段 / 通勤 / デート / 結婚式 / 雨の日」の5場面について、70点以上のコーデが何通り組めるか数える。
   - 増えた数が多い順に上位5件を表示する。
   - 計算量を抑えるため、場面ごとの上位N件の絞り込みはエンジンと共通にする。
3. 各提案には、理由(「手持ちの〇〇・△△と合わせて8コーデ増えます」)と、コピーできる検索キーワードを付ける。

## 9. 色の自動推定(RuleRecognizer)

- 写真を `expo-image-manipulator` で 32×32 に縮小し、中央60%の範囲のピクセルを読み取る。
- 各ピクセルを、`BaseColor` の代表値との距離(Lab 色空間での差)で最も近い色に振り分け、数が多い上位2色を返す。
- ピクセルの読み取りは、ネイティブと Web で方法が異なる可能性があるため、実装の最初に検証する。どちらでも読み取れない場合は、手動選択だけで進める(PoC の成功基準には含めない)。

## 10. エラー時の扱い

- 位置情報が拒否された場合や天気の取得に失敗した場合: 手動の天気選択に切り替え、画面上部にその旨を表示する。
- カメラやアルバムの権限が拒否された場合: 理由を表示し、設定画面への導線を出す。
- 保存データの読み込みに失敗した場合(JSON が壊れているなど): 空のデータとして起動し、壊れたデータは `closet:v1:corrupt:<時刻>` に退避する。
- 写真ファイルが見つからない場合: 代わりのプレースホルダー画像を表示する。

## 11. テスト

- `domain/` の全モジュールを Jest(`jest-expo` プリセット)で単体テストする。必須のテストは次のとおり。
  - 結婚式・葬儀・雪・雨の禁止ルールに当たる服が、自動提案に含まれない
  - 暖かさの目標範囲の境界値
  - 色数による減点
  - 改善案(swaps)で点数が実際に上がる
  - ⭐評価・これはないが提案順位を変える
  - 洗濯中の服が除外される
  - 主役の服が必ず含まれる
  - 3案の間で共通する服が1点以下になる
- 画面は Web プレビュー(Playwright でスクリーンショット)で主要な流れを確認する。
- `npx tsc --noEmit` と `npx expo-doctor` が通ること。

## 12. 本番で Claude に差し替えるとき(参考、PoC では実装しない)

- `ClaudeRecognizer`: 写真から Item の属性を JSON で返させる(構造化出力)。
- `ClaudeCritic`: 写真と属性から、同じ項目立てで評価させる。ルールで拾えない質感の相性なども評価できる。
- `ClaudeEngine`: ルールで絞り込んだ候補を渡し、最終的な選出と理由の文章を任せる。
- API キーは設定画面で入力し、`expo-secure-store` に保存する。
