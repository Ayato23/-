# 全身コーデアプリ PoC-1(Web 版)実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 仕様書の PoC-1 を、Web ブラウザで動く Expo アプリとして `closet-app/` に実装する。

**Architecture:** `src/domain/` に副作用のない採点・提案・買い足しロジックを置き、Jest でテストする。`src/services/` は保存・写真・天気・色推定の外部接続を担う。`src/state/` は React フックでリポジトリを公開し、`src/app/` の expo-router 画面がそれを使う。

**Tech Stack:** Expo SDK 57、expo-router、React 19.2、TypeScript、AsyncStorage(Web では localStorage)、IndexedDB(写真)、expo-image-picker、expo-image-manipulator、expo-location、Open-Meteo、jest-expo 57。

**Spec:** `closet-app/docs/specs/2026-11-06-closet-coordinate-design.md`

## Global Constraints

- 新しいコードはすべて `closet-app/` の中に置き、リポジトリ直下の昼寝アプリには触れない。
- Expo パッケージは SDK 57 系(`~57.0.x`)に揃える。インストールは `npx expo install` で行う。
- docs.expo.dev はこのセッションから参照できない。Expo API を使う前に `node_modules/<pkg>/build/*.d.ts` を読み、v57 の実際のシグネチャに合わせる。
- 有料 API は使わない。外部への通信は Open-Meteo(`https://api.open-meteo.com/v1/forecast`)だけ。
- UI の文言は日本語にする。
- 対象は Web(`npx expo start --web` / `npx expo export -p web`)。ネイティブ向けの写真保存は今回の対象外で、`photos.ts` のネイティブ側は「未対応」のエラーを投げる。
- `domain/` のファイルは `react`、`react-native`、`expo-*` を import しない。
- 保存キーには `closet:v1:` という接頭辞を付ける。

## Review Focus

1. **服が0着、または一部のカテゴリしかない(靴が無いなど)** → エンジンは例外を投げず、`missing` に不足しているものを返す。画面には案内を表示する(Task 6)。
2. **コーデや着用記録が参照している服を削除した** → 履歴とコーデ詳細は落ちずに「削除された服」と表示する。エンジンと評価は存在しない ID を無視する(Task 6・Task 10)。
3. **位置情報が拒否された、または Open-Meteo が失敗・オフライン** → 手動の天気(20℃・晴れ)で動き続け、画面上部にその旨を表示する(Task 8)。
4. **localStorage のデータが壊れている** → 空のデータとして起動し、壊れた文字列を `closet:v1:corrupt:<時刻>` に退避する(Task 8)。
5. **季節が空欄の服、または今の月が冬で冬物が無い** → 季節が空欄の服は通年扱いで候補に残す(Task 6)。

---

### Task 1: アプリの土台を作る

**Files:**
- Create: `closet-app/package.json`, `closet-app/app.json`, `closet-app/tsconfig.json`, `closet-app/babel.config.js`(必要な場合のみ), `closet-app/.gitignore`, `closet-app/src/app/_layout.tsx`, `closet-app/src/app/(tabs)/_layout.tsx`, `closet-app/src/app/(tabs)/index.tsx`, `closet-app/src/app/(tabs)/closet.tsx`, `closet-app/src/app/(tabs)/recommend.tsx`, `closet-app/src/app/(tabs)/history.tsx`, `closet-app/src/constants/theme.ts`, `closet-app/src/hooks/use-theme.ts`
- Test: `closet-app/src/domain/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: `useTheme(): { background, surface, text, textSecondary, accent, border, danger }`。パス別名 `@/*` → `./src/*`。

- [ ] **Step 1:** package.json を作る。依存関係は、ルートの package.json から昼寝アプリ固有のもの(chart-kit、svg)を除いて引き継ぐ。名前は `closet-app`、`main` は `expo-router/entry`。scripts は `start`、`web`、`test: jest`、`typecheck: tsc --noEmit` を用意する。`npm install` を実行し、続けて `npx expo install expo-image-picker expo-image-manipulator expo-location jest-expo jest @types/jest` を実行する。
- [ ] **Step 2:** app.json を作る。name は「クローゼットコーデ」、slug は `closet-app`、scheme は `closetapp`、`web.output` は `single`。typedRoutes と reactCompiler は昼寝アプリと同じにする。アイコン類はルートの `assets/images` から必要なものだけコピーする。
- [ ] **Step 3:** package.json に Jest の設定 `"jest": { "preset": "jest-expo" }` を入れる。smoke テスト `expect(1 + 1).toBe(2)` を書き、`cd closet-app && npx jest` を実行する。期待結果は 1 passed。
- [ ] **Step 4:** タブを 4 つ並べたレイアウトを作る。index は「コーデ」👗、closet は「クローゼット」🧥、recommend は「おすすめ」🛍、history は「履歴」🗓。この時点では中身は見出しだけでよい。昼寝アプリの `(tabs)/_layout.tsx` の書き方を踏襲する。
- [ ] **Step 5:** `npx tsc --noEmit` がエラーなしで通ることを確認する。`npx expo export -p web --output-dir /tmp/closet-web` が成功し、`index.html` が出力されることを確認する。
- [ ] **Step 6:** コミットする(`feat(closet): scaffold Expo web app with tabs`)。

### Task 2: 型・カタログ・場面ルール・テイスト表・天気の範囲

**Files:**
- Create: `closet-app/src/domain/types.ts`, `catalog.ts`, `occasionRules.ts`, `tasteProfiles.ts`, `weather.ts`
- Test: `closet-app/src/domain/__tests__/weather.test.ts`, `occasionRules.test.ts`

**Interfaces:**
- Produces(`types.ts`): 仕様書 §5 の `Category`、`Season`、`Taste`、`Occasion`、`BaseColor`、`Item`、`Outfit`、`WearLog`、`Profile`、`WeatherSnapshot` を、そのままの形で定義する。追加で次の型も定義する。
  - `type ItemAttributes = Omit<Item, 'id'|'photoUri'|'createdAt'|'status'>`
  - `interface Ctx { occasion: Occasion; taste: Taste; weather: WeatherSnapshot; profile: Profile; today: string /* YYYY-MM-DD */ }`
- Produces(`catalog.ts`):
  - `CATEGORIES: {id: Category; label: string}[]`
  - `SUBCATEGORIES: {id: string; category: Category; label: string}[]`
    - 靴は最低限 `sneakers`、`leatherShoes`、`loafers`、`pumps`、`heels`、`boots`、`rainBoots`、`sandals` を入れる。
    - アウターには `tailoredJacket`、`downJacket`、`coat`、`raincoat` を、ボトムスには `jeans` を含める。
  - `MATERIALS: {id: string; label: string}[]`。`cotton`、`wool`、`linen`、`synthetic`、`leather`、`denim`、`suede`、`canvas`、`knit`、`down`、`nylon` を含める。
  - `BASE_COLORS: {id: BaseColor; label: string; hex: string}[]`
  - `BASIC_COLORS: BaseColor[]`。中身は black、white、gray、charcoal、navy、beige、brown、camel。
  - `OCCASIONS: {id: Occasion; label: string}[]`
  - `TASTES: {id: Taste; label: string}[]`
  - `seasonOf(dateISO: string): Season`。3〜5月は spring、6〜8月は summer、9〜11月は autumn、12〜2月は winter を返す。
- Produces(`weather.ts`):
  - `warmthTarget(w: WeatherSnapshot, offset = 0): { min: number; max: number }`。平均気温 `(tempMax+tempMin)/2` を仕様書 §7-2 の表に当てはめる。境界の値は上の段に含める。たとえば 25.0 は「25℃以上」、20.0 は「20〜25」に入る。「5℃未満」の段は max を 99 とする。min と max の両方に offset を足す。
  - `needsOuter(w, offset=0): boolean`。`warmthTarget(...).min >= 6` のとき true を返す。
  - `isRainy(w): boolean`。`precipProb >= 50` のとき true を返す。
  - `clothingWarmth(items: Item[]): number`。tops、bottoms、outer、onepiece の warmth を合計する。
- Produces(`occasionRules.ts`):
  - `interface Rule { id: string; label: string; test: (item: Item, profile: Profile) => boolean }`
  - `interface Requirement extends Rule { categories: Category[]; searchKeyword: string; styles?: Profile['style'][] }`
  - `interface OccasionRule { id: Occasion; formality?: [number, number]; forbid: Rule[]; outfitForbid: { label: string; test: (items: Item[], profile: Profile) => boolean }[]; require: Requirement[]; prefer: (Rule & { bonus: number })[]; warmthOffset: number }`
  - `OCCASION_RULES: Record<Occasion, OccasionRule>`。中身は仕様書 §7 の表どおりにする。補足は次のとおり。
    - ダメージ加工の項目は持たないため、通勤の禁止は「サンダル」と「フォーマル度が3未満の靴」とする。
    - 結婚式の「全身黒」の判定は、style が womens で、靴・バッグ・小物以外の服のメイン色がすべて black のときとする。
    - 雪のイベントの warmthOffset は 2 とする。
  - `violations(item: Item, occasion: Occasion, profile: Profile): string[]`。当てはまった禁止ルールのラベルを返す。
  - `outfitViolations(items: Item[], occasion, profile): string[]`

- [ ] **Step 1:** テストを書く。
  - `warmthTarget` の確認:
    - 最高30・最低20 → `{min:2,max:4}`
    - 最高22・最低18 → `{min:3,max:6}`
    - 平均がちょうど5.0 → `{min:9,max:13}`
    - 平均が4.9 → `{min:12,max:99}`
    - offset を2にすると min と max がそれぞれ+2される
  - `needsOuter` の確認: 平均12℃なら true、平均18℃なら false。
  - `violations` の確認:
    - 結婚式で、メイン色が white のシャツは「白」の違反を含む。
    - 葬儀で、shiny:true の小物は違反になる。
    - 雪のイベントで、material が suede の boots は違反になる。
    - 雨の日で、canvas の sneakers は違反になる。
  - `outfitViolations` の確認: 結婚式で womens の全身黒は違反を1件返す。mens なら0件。
- [ ] **Step 2:** `npx jest weather occasionRules` を実行し、失敗することを確認する(モジュールがまだ無いため)。
- [ ] **Step 3:** 上の Interfaces どおりに実装する。テイスト表(`tasteProfiles.ts`)は `TASTE_PROFILES: Record<Taste, { colors: Partial<Record<BaseColor, number>>; patterns: Partial<Record<Item['pattern'], number>>; materials: Record<string, number> }>` とし、重みは −1〜+1 の範囲にする。シックの中身は仕様書 §7 の例どおりにする。
- [ ] **Step 4:** `npx jest` を実行し、すべて通ることを確認する。
- [ ] **Step 5:** コミットする(`feat(closet): domain types, catalog, occasion rules`)。

### Task 3: 色

**Files:**
- Create: `closet-app/src/domain/color.ts`
- Test: `closet-app/src/domain/__tests__/color.test.ts`

**Interfaces:**
- Produces:
  - `nearestBaseColor(r: number, g: number, b: number): BaseColor`。sRGB を Lab に変換し、`BASE_COLORS` の hex の中で ΔE76 が最小の色を返す。
  - `dominantColors(pixels: Uint8ClampedArray | number[], take = 2): BaseColor[]`。RGBA の並びを受け取り、alpha が 128 未満の画素は無視する。出現数が多い順に返す。
  - `outfitColors(items: Item[]): BaseColor[]`。全アイテムのメイン色に、tops・bottoms・outer・onepiece のサブ色を加え、重複を除いて返す。

- [ ] **Step 1:** テストを書く。
  - `nearestBaseColor(0,0,0)` は `'black'`、`(255,255,255)` は `'white'`、`(20,30,90)` は `'navy'`。
  - 赤100画素・白20画素からなる配列を `dominantColors` に渡すと `['red','white']` を返す。
  - 透明な画素は数えない。
  - `outfitColors` の結果に重複がなく、靴のサブ色は含まれない。
- [ ] **Step 2:** `npx jest color` を実行し、失敗することを確認する。
- [ ] **Step 3:** 実装する。
- [ ] **Step 4:** `npx jest color` を実行し、通ることを確認する。
- [ ] **Step 5:** コミットする(`feat(closet): color utilities`)。

### Task 4: 好みの学習

**Files:**
- Create: `closet-app/src/domain/preference.ts`
- Test: `closet-app/src/domain/__tests__/preference.test.ts`

**Interfaces:**
- Produces:
  - `interface Preference { item: Record<string, number>; pair: Record<string, number> }`
  - `pairKey(a: string, b: string): string`。2つの ID を辞書順に並べ、`|` でつなぐ。
  - `buildPreference(outfits: Outfit[]): Preference`。点数は仕様書 §5 のとおりにする。rejected は rating より優先して −2 とする。rating が未設定で rejected でもない場合は無視する。
  - `preferenceScore(itemIds: string[], pref: Preference): number`。服ごとの点数の合計と、全ペアの点数の合計を足して返す。

- [ ] **Step 1:** テストを書く。
  - ⭐5 のコーデ[a,b] → `item.a===2`、`pair['a|b']===2`。
  - rejected のコーデ[a,c] → `item.a` に −2 が加算される(上と合わせて合計は0)。
  - ⭐3 は何も変えない。
  - `preferenceScore(['a','b'], pref)` は、服ごとの点数とペアの点数を足した値になる。
  - `pairKey('b','a')==='a|b'`
- [ ] **Step 2:** テストを実行し、失敗することを確認する。続けて実装する。
- [ ] **Step 3:** テストを実行し、通ることを確認する。コミットする(`feat(closet): preference scoring`)。

### Task 5: コーデ評価(Critic)

**Files:**
- Create: `closet-app/src/domain/critic.ts`
- Test: `closet-app/src/domain/__tests__/critic.test.ts`、`closet-app/src/domain/__tests__/fixtures.ts`(テスト用の `makeItem(partial): Item` と、標準的なクローゼットの定義)

**Interfaces:**
- Consumes: Task 2 と Task 3 のすべて。
- Produces:
  - `type Breakdown = { color: number; occasion: number; weather: number; taste: number; silhouette: number }`。各項目の満点は 25 / 25 / 20 / 15 / 15。
  - `interface Evaluation { total: number; breakdown: Breakdown; comments: string[]; violations: string[]; swaps: { fromItemId: string; toItemId: string; gain: number }[] }`
  - `evaluate(items: Item[], ctx: Ctx, closet?: Item[]): Evaluation`
    - 採点は仕様書 §6 の表のとおりにする。各項目の点数は0未満にならないよう切り捨て、`total` は整数に丸める。
    - `closet` を渡したときだけ swaps を計算する。差し替え候補は同じカテゴリで status が available の服から選ぶ。差し替え後の評価は swaps を計算しない(再帰しない)。gain が正のものを上位3件返す。
    - 天気の項目の目標範囲には、場面ルールの `warmthOffset` を加える。
    - 雨の靴の減点は重ねない。スエードかキャンバスなら −10、それ以外で撥水でなければ −6 とする。
    - テイストの点数は、服ごとに次の値を求めて平均し、[−1,1] の範囲を [0,15] に線形に写して求める。
      - 求める値:(メイン色の重み+柄の重み+素材の重み+(item.tastes に ctx.taste が含まれていれば 1))÷4
    - `comments` は項目ごとに最大1文とする。減点した理由を日本語で書く(例:「色が5色あり散らかって見えます」)。
  - `export const ruleCritic = { evaluate }`(OutfitCritic として使う実装)

- [ ] **Step 1:** テストを書く。
  - 黒・グレー・白の3色のコーデは color が25点。ベーシック色だけで5色(黒・白・グレー・ネイビー・ベージュ)を使った無地のコーデは10点。
  - 結婚式で白シャツを含むコーデは、occasion が0点になり、violations が1件以上ある。
  - 平均28℃で warmth の合計が10のコーデは、weather が20点未満になる。
  - 降水確率80%でスエードの靴を履くと、雨でない日に比べて weather がちょうど10点下がる。
  - tops と bottoms の両方が loose だと、silhouette が9点以下になる。
  - スエードの靴を撥水のブーツに差し替える案が swaps の先頭にあり、gain が0より大きい。
  - `total` は breakdown の合計を丸めた値と一致する。
- [ ] **Step 2:** テストを実行し、失敗することを確認する。続けて実装する。
- [ ] **Step 3:** `npx jest critic` を実行し、通ることを確認する。コミットする(`feat(closet): rule-based outfit critic`)。

### Task 6: コーデ作成(Engine)

**Files:**
- Create: `closet-app/src/domain/engine.ts`
- Test: `closet-app/src/domain/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: Task 2〜5 のすべて。
- Produces:
  - `interface Candidate { itemIds: string[]; score: number; evaluation: Evaluation }`
  - `interface SuggestInput { closet: Item[]; ctx: Ctx; outfits: Outfit[]; wearLogs: WearLog[]; heroItemId?: string; topN?: number /* 既定 8 */ }`
  - `interface SuggestResult { candidates: Candidate[]; missing: string[] }`
  - `enumerate(input: SuggestInput): Candidate[]`。採点済みの全組み合わせを、点数の高い順に返す。
  - `suggest(input: SuggestInput): SuggestResult`。`enumerate` の結果から、共通する服が1点以下になるように最大3件を選ぶ。
  - `export const ruleEngine = { suggest }`
- 手順は仕様書 §7 の 3〜7 のとおり。細かい決まりは次のとおり。
  - `score = evaluation.total + preferenceScore × 3 − 5 × (ctx.today から数えて7日以内の WearLog に含まれる服の数)`。WearLog の outfitId からコーデを引き、その itemIds を使う。
  - `require` を満たす服が組み合わせに入っていない候補は除外する。`styles` が指定されたルールは、profile.style が含まれるときだけ適用する。
  - アウターについて:
    - `needsOuter` が true ならアウターは必須にする。
    - false なら、アウターなしとアウターありの両方を候補にする。
  - バッグと小物は組み合わせの総当たりに入れない。最後に、単体の点数が最も高いものを1つずつ加え、評価が下がる場合は加えない。
  - `missing` には次を入れる。
    - 土台(トップス+ボトムス、またはワンピース)が組めない場合:「トップスかワンピースが未登録です」など
    - 靴が無い場合:「靴が未登録です」
    - 必須アウターが無い場合:「この気温に合うアウターが未登録です」
    - 場面の必須ルールを満たす服が無い場合:そのルールのラベル
  - 存在しない heroItemId や、存在しない ID は無視する。

- [ ] **Step 1:** テストを書く。いずれも fixtures の標準クローゼット(各カテゴリ3〜5着)を使う。
  - 結婚式・葬儀・雪のイベント・雨の日のそれぞれで、どの候補にも `violations` に当たる服が含まれない。
  - status が laundry の服は、どの候補にも含まれない。
  - heroItemId を指定すると、すべての候補にその服が含まれる。
  - 3案の間で共通する服は1点以下になる。
  - ⭐5 をつけたコーデ[a,b]が過去にあると、a と b を含む候補が1位になる。同じ条件で rejected にすると、1位にならない。
  - 昨日着た服を含む組み合わせは、着ていない場合より5点低くなる。
  - 靴が0足のクローゼットでは、candidates が空になり、missing に「靴が未登録です」が入る。例外は投げない。
  - クローゼットが空のときも例外を投げない。
  - seasons が空の冬物でない服は、夏でも候補に残る。
  - 存在しない ID を含む過去のコーデがあっても、例外を投げない。
- [ ] **Step 2:** テストを実行し、失敗することを確認する。続けて実装する。
- [ ] **Step 3:** `npx jest engine` を実行し、通ることを確認する。テスト全体の実行時間が5秒未満であることも確認する。
- [ ] **Step 4:** コミットする(`feat(closet): rule-based outfit engine`)。

### Task 7: 買い足し提案

**Files:**
- Create: `closet-app/src/domain/recommend.ts`、`closet-app/src/domain/staples.ts`
- Test: `closet-app/src/domain/__tests__/recommend.test.ts`

**Interfaces:**
- Consumes: Task 6 の `enumerate` と `suggest`。
- Produces:
  - `STAPLES: { id: string; label: string; searchKeyword: string; styles: Profile['style'][]; item: ItemAttributes }[]`。約30件。
  - `interface Suggestion { id: string; label: string; reason: string; searchKeyword: string; gain?: number }`
  - `missingFor(input: SuggestInput): Suggestion[]`。`suggest` が返す missing と、場面の require のうち手持ちの服で満たせないものを Suggestion に変換する。searchKeyword には Requirement の値を使う。
  - `rankStaples(closet: Item[], profile: Profile, today: string, outfits: Outfit[]): Suggestion[]`。
    - 対象の場面は everyday、office、date、weddingGuest、rain。
    - 天気は `{tempMax:22,tempMin:14,precipProb: 雨の日のみ80、それ以外は10, snow:false}` とする。
    - `enumerate` は topN 4 で呼び、70点以上の組み合わせの数を数える。
    - 定番アイテムを1点仮に加えたときの増加分を gain とし、gain が多い順に上位5件を返す。gain が0の候補は除く。
    - reason は「新たに{gain}コーデ組めます」とする。
    - profile.style が unisex の場合は、styles を問わずすべての定番アイテムを対象にする。

- [ ] **Step 1:** テストを書く。
  - 靴が無いクローゼットで `missingFor` を呼ぶと、「靴」を含む提案が出る。
  - 撥水の靴が無いクローゼットで、場面が雨の日のとき、searchKeyword に「撥水」を含む提案が出る。
  - トップスが黒1枚だけのクローゼットで `rankStaples` を呼ぶと、gain が正の結果が返り、gain の降順に並ぶ。
  - 結果は最大5件。
- [ ] **Step 2:** テストを実行し、失敗することを確認する。続けて実装する。
- [ ] **Step 3:** テストを実行し、通ることを確認する。コミットする(`feat(closet): purchase recommendations`)。

### Task 8: 外部接続(保存・天気・写真・色推定)

**Files:**
- Create: `closet-app/src/services/storage.ts`、`weatherApi.ts`、`photos.ts`、`recognizer.ts`
- Test: `closet-app/src/services/__tests__/storage.test.ts`、`weatherApi.test.ts`

**Interfaces:**
- Produces:
  - `storage.ts`
    - `createCollection<T extends { id: string }>(name: string)` は `{ load(): Promise<T[]>; save(list: T[]): Promise<void> }` を返す。キーは `closet:v1:<name>`。JSON が壊れているか配列でない場合は、元の文字列を `closet:v1:corrupt:<Date.now()>` に退避してから [] を返す。
    - `loadValue<T>(name, fallback: T): Promise<T>`
    - `saveValue<T>(name, v: T): Promise<void>`
    - `generateId(): string`
    - `resetAll(): Promise<void>`。`closet:v1:` で始まるキーをすべて消す。
  - `weatherApi.ts`
    - `parseForecast(json: unknown): WeatherSnapshot[]`。Open-Meteo の `daily.time`、`temperature_2m_max`、`temperature_2m_min`、`precipitation_probability_max`、`snowfall_sum` を変換する。snowfall_sum が0より大きければ snow を true にする。manual は false。形が不正な場合は [] を返す。
    - `fetchForecast(lat, lon): Promise<WeatherSnapshot[]>`。URL の query は `daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum&timezone=auto&forecast_days=4`。HTTP エラーのときは例外を投げる。
    - `getCurrentCoords(): Promise<{lat:number; lon:number} | null>`。expo-location を使い、拒否されたときやエラーのときは null を返す。
    - `DEFAULT_WEATHER(date): WeatherSnapshot`。中身は `{tempMax:22,tempMin:16,precipProb:0,snow:false,manual:true}`。
  - `photos.ts`
    - `pickPhoto(source: 'camera'|'library'): Promise<string | null>`。expo-image-picker で選び、expo-image-manipulator で長辺1024px・JPEG・compress 0.8 に縮小して、その uri を返す。キャンセルされたら null を返す。Web ではカメラもファイル選択になる。
    - `savePhoto(itemId: string, uri: string): Promise<string>`。Web では fetch(uri) で Blob にし、IndexedDB(DB 名 `closet-photos`、store 名 `photos`)に保存して `idb:<itemId>` を返す。ネイティブでは `Error('未対応')` を投げる。
    - `resolvePhoto(photoUri: string): Promise<string | null>`。`idb:` の場合は objectURL を返し、見つからなければ null を返す。
    - `deletePhoto(photoUri)`
    - `clearPhotos()`
  - `recognizer.ts`
    - `interface ItemRecognizer { recognize(uri: string): Promise<Partial<ItemAttributes>> }`
    - `ruleRecognizer`。32×32 に縮小した画像を canvas に描き、中央60%の画素を `dominantColors` に渡して `{ colors }` を返す。失敗したときは `{}` を返す。Web 以外では `{}` を返す。

- [ ] **Step 1:** 型定義を確認する。`node_modules/expo-image-picker/build/ImagePicker.types.d.ts`、`node_modules/expo-image-manipulator/build/*.d.ts`、`node_modules/expo-location/build/Location.d.ts` を読み、v57 の関数名・オプション・戻り値の形をメモする。以降の実装はこのメモに合わせる。
- [ ] **Step 2:** テストを書く。
  - storage: AsyncStorage の公式 jest mock(`@react-native-async-storage/async-storage/jest/async-storage-mock`)を使う。壊れた JSON を読ませると [] が返り、corrupt キーに元の文字列が残る。save したものを load すると同じ内容が返る。
  - weatherApi: サンプル JSON(4日分、2日目の snowfall_sum が1.2)を `parseForecast` に渡すと4件返り、2件目の snow が true になる。`{}` を渡すと [] が返る。
- [ ] **Step 3:** テストを実行し、失敗することを確認する。続けて実装する。テストを実行し、通ることを確認する。
- [ ] **Step 4:** コミットする(`feat(closet): storage, weather, photo and recognizer services`)。

### Task 9: 状態管理フックとクローゼット画面

**Files:**
- Create:
  - `closet-app/src/state/store.tsx`
  - `closet-app/src/components/ChipSelect.tsx`
  - `closet-app/src/components/ItemPhoto.tsx`
  - `closet-app/src/components/ItemCard.tsx`
  - `closet-app/src/app/item/new.tsx`
  - `closet-app/src/app/item/[id].tsx`
  - `closet-app/src/components/ItemForm.tsx`
- Modify: `closet-app/src/app/(tabs)/closet.tsx`、`closet-app/src/app/_layout.tsx`

**Interfaces:**
- Consumes: Task 2 と Task 8。
- Produces:
  - `<StoreProvider>` と `useStore()`。`useStore()` は次を返す。
    - データ: `{ items, outfits, wearLogs, profile, ready }`
    - 服の操作: `addItem(attrs, photoUri) => Promise<Item>`、`updateItem(id, patch)`、`deleteItem(id)`
    - コーデの操作: `saveOutfit(o: Omit<Outfit,'id'|'createdAt'>) => Promise<Outfit>`、`updateOutfit(id, patch)`
    - その他: `logWear(outfitId, date)`、`setProfile(p)`、`resetAll()`
    - deleteItem は写真も削除する。コーデから ID は消さない(Review Focus 2)。
  - `<ItemPhoto uri style />`。`resolvePhoto` で解決した画像を表示し、見つからない場合はプレースホルダー(灰色の枠に「写真なし」)を表示する。
  - `<ChipSelect options value onChange multiple? />`
  - `<ItemForm initial onSubmit />`。仕様書 §5 の Item の全属性をチップや入力欄で編集できるようにする。価格は数値、購入日は YYYY-MM-DD で入力する。

- [ ] **Step 1:** `store.tsx` を実装する。起動時に全コレクションを load し、操作のたびに save する。profile の既定値は `{style:'unisex', useLocation:true}` とする。
- [ ] **Step 2:** クローゼット画面を実装する。上部にカテゴリのチップ(「すべて」を含む)、その下に3列のグリッドを置く。洗濯中・クリーニング中の服にはバッジを付ける。右下に「＋」ボタンを置いて `/item/new` へ移動する。右上には「手組み」ボタンを置き、`/outfit/manual` へ移動する。
- [ ] **Step 3:** `item/new.tsx` を実装する。「撮影」「アルバム」のボタンで `pickPhoto` を呼び、`ruleRecognizer.recognize` の結果で色を初期入力する。そのあと ItemForm で属性を入力し、保存時に `savePhoto` と `addItem` を呼んで前の画面に戻る。
- [ ] **Step 4:** `item/[id].tsx` を実装する。写真、属性の編集、状態の切り替えチップ、着用回数(その服を含むコーデの WearLog の数)、1回あたりの単価(`price ÷ 着用回数`。着用回数が0のときは「未着用」と表示)、削除(確認ダイアログあり)を置く。
- [ ] **Step 5:** `npx tsc --noEmit` が通ることを確認する。`npx expo start --web --port 8081` を起動し、Playwright で次を確認してスクリーンショットを撮る。
  - 小さな赤い PNG を用意してファイル入力に渡す。
  - 服の登録画面で色の初期値が「赤」になる。
  - 保存するとグリッドに表示される。
  - ページを再読み込みしても残っている。
- [ ] **Step 6:** コミットする(`feat(closet): closet screens and store`)。

### Task 10: コーデ画面・コーデ詳細・手組み

**Files:**
- Create:
  - `closet-app/src/components/OutfitView.tsx`
  - `closet-app/src/components/ScoreBreakdown.tsx`
  - `closet-app/src/components/WeatherBar.tsx`
  - `closet-app/src/app/outfit/[id].tsx`
  - `closet-app/src/app/outfit/manual.tsx`
- Modify: `closet-app/src/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `useStore`、`ruleEngine.suggest`、`ruleCritic.evaluate`、`fetchForecast`、`getCurrentCoords`、`DEFAULT_WEATHER`。
- Produces:
  - `<OutfitView items: (Item|undefined)[] />`。アイテムを outer、tops、onepiece、bottoms、shoes、bag、accessory の順に縦に並べる。undefined の服は「削除された服」と表示する。
  - `<ScoreBreakdown evaluation />`。総合点、5項目の点数バー、コメント、違反を表示する。
  - `<WeatherBar value onChange />`。4日分のチップから日付を選べる。タップすると手動編集が開き、最高・最低気温と「晴れ/雨/雪」を設定できる。

- [ ] **Step 1:** WeatherBar を実装する。`profile.useLocation` が true なら座標を取得して予報を取りに行く。座標が取れないときや取得に失敗したときは、`DEFAULT_WEATHER` を使い「天気を取得できなかったため手動設定です」と表示する。
- [ ] **Step 2:** コーデ画面(index)を実装する。
  - 上から順に、WeatherBar、場面のチップ、テイストのチップ、主役の服を選ぶ欄(クローゼットから1着選ぶモーダル。解除もできる)、「コーデを組む」ボタンを置く。
  - 結果は横スクロールで最大3枚のカードとして表示する。各カードには OutfitView、総合点、上位2件のコメント、⭐1〜5、「これはない」「今日これ着る」を置く。
  - ⭐評価・「これはない」・「今日これ着る」のどれかを押すと、`saveOutfit`(source が auto、weather の値も保存)を呼ぶ。同じカードで2回目以降に押した場合は、新しく保存せず `updateOutfit` で更新する。「今日これ着る」はさらに `logWear` で今日の日付を記録する。
  - missing があれば、その内容と「おすすめを見る」のリンクを表示する。
  - 右上に設定へのリンク(⚙)を置く。
- [ ] **Step 3:** 手組み画面を実装する。カテゴリごとに横スクロールの服一覧を置き、各カテゴリで1着を選べる(もう一度タップで解除)。選んでいる間は場面とテイストのチップに合わせて ScoreBreakdown をその場で更新する。改善案 swaps は「〇〇に替えると +N点」のボタンとして表示し、押すと差し替える。保存すると source が manual で保存し、コーデ詳細へ移動する。
- [ ] **Step 4:** コーデ詳細を実装する。OutfitView、保存時の天気・場面・テイストで再評価した ScoreBreakdown、改善案(押すと差し替えて updateOutfit)、⭐評価、「これはない」、「今日これ着る」を置く。
- [ ] **Step 5:** Playwright で確認する。
  - Open-Meteo への通信を `page.route` でサンプル JSON に差し替えておく。
  - 服を7着(トップス2、ボトムス2、靴2、アウター1)登録する。
  - 場面を結婚式にして「コーデを組む」を押すと、結果のカードか不足の案内が表示される。
  - ⭐5 をつけると履歴に保存される。
  - 手組みで点数が表示される。
  - 各画面のスクリーンショットを撮る。
- [ ] **Step 6:** コミットする(`feat(closet): coordinate, manual and outfit detail screens`)。

### Task 11: おすすめ・履歴・設定画面

**Files:**
- Modify: `closet-app/src/app/(tabs)/recommend.tsx`、`closet-app/src/app/(tabs)/history.tsx`
- Create: `closet-app/src/app/settings.tsx`

- [ ] **Step 1:** おすすめ画面を実装する。2つのセクションに分ける。
  - 「今の場面で足りない服」: 場面のチップで切り替え、`missingFor` の結果を表示する。
  - 「買い足すと効果が大きい服」: `rankStaples` の結果を表示する。
  - 各行には label、reason、searchKeyword を表示し、「キーワードをコピー」ボタンを置く(Web では `navigator.clipboard.writeText`)。
  - `rankStaples` は重い処理なので、画面が表示されたあとに `setTimeout(…,0)` で計算する。計算中は「計算中…」と表示する。
- [ ] **Step 2:** 履歴画面を実装する。
  - 上のセクションは着用記録。日付の降順に、日付・コーデの縮小表示・場面を並べる。
  - 下のセクションは評価済みのコーデ。⭐の数またはこれはないの表示を付ける。
  - どちらもタップでコーデ詳細へ移動する。参照先のコーデが無い記録は「削除されたコーデ」と表示する。
- [ ] **Step 3:** 設定画面を実装する。スタイル、身長(数値)、体型、位置情報の ON/OFF、「データをすべて削除」を置く。削除は確認ダイアログのあと、`resetAll` と `clearPhotos` を呼ぶ。
- [ ] **Step 4:** Playwright で確認する。
  - おすすめ画面に「買い足すと効果が大きい服」の結果が1件以上表示される。
  - 履歴画面に Task 10 で着た記録が表示される。
  - 設定で全削除するとクローゼットが空になる。
  - 各画面のスクリーンショットを撮る。
- [ ] **Step 5:** コミットする(`feat(closet): recommend, history and settings screens`)。

### Task 12: 仕上げ

**Files:**
- Create: `closet-app/README.md`

- [ ] **Step 1:** README を書く。内容は、概要、起動方法(`cd closet-app`、`npm install`、`npm run web`)、テストの実行方法、PoC の範囲(PoC-2 と Claude への差し替えは未対応)、ネイティブ版の写真保存が未対応であること。
- [ ] **Step 2:** `npx jest`、`npx tsc --noEmit`、`npx expo export -p web --output-dir /tmp/closet-web` がすべて成功することを確認する。`npx expo-doctor` を実行し、警告があれば結果を記録する。
- [ ] **Step 3:** コミットして、`git push -u origin claude/epic-albattani-jbo7lk` でプッシュする。
