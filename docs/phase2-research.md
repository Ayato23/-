# Phase2 リサーチメモ(仮眠科学 / 推薦ロジック / Expo SDK 57 API)

作成: 2026-10-10 / 対象: `nap-optimizer` (Expo SDK 57, RN 0.86, AsyncStorage のみ)

> 実装者向けの要約は各章冒頭の「**実装に使う値**」を参照。数値は文献ベースの「初期値(prior)」であり、
> 個人データが貯まったら個人値で上書きする前提。医療的助言ではない旨をアプリ内でも明示すること。

---

## 1. 仮眠の科学(デフォルト値・事前分布の根拠)

### 実装に使う値(まとめ)

| 項目 | 推奨デフォルト | 根拠 |
|---|---|---|
| タイマー初期値 | **20分**(実睡眠 10〜15分 + 入眠 5分程度) | Brooks & Lack 2006, Lovato & Lack 2010, NASA |
| 推奨レンジ | 10〜20分。**30分以上は「睡眠慣性あり」と警告** | Brooks & Lack 2006, Hilditch 2017 |
| 最適時間帯 | **12:00〜15:00**(特に 13〜15時)。15時以降は減点、16時以降は非推奨 | Monk 2005, 厚労省指針2014 |
| 評価リマインド遅延 | **アラーム後 15分**(30分以上の仮眠は 30分) | Tassi & Muzet 2000, Hilditch 2023 |
| コーヒーナップ | カフェイン 100〜200mg を**仮眠直前**に摂取、仮眠 15〜20分 | Reyner & Horne 1997, Hayashi 2003 |
| 睡眠負債との関係 | 負債大ほど仮眠の効果は大きいが、深睡眠に入りやすく慣性も強い → 長さは延ばさず 20分以内を維持 | Brooks & Lack 2006(5h睡眠後), Hilditch 2017 |

### 1.1 最適な仮眠の長さ
- **Brooks & Lack (2006, *Sleep*)**: 前夜 5時間睡眠の被験者に 15時に 0/5/10/20/30分の仮眠。**10分が最も即効性が高く**(主観的眠気・課題成績・反応時間ラプス改善)、効果は約2.5時間(155分)持続と報告。20分・30分は起床直後に睡眠慣性が見られ、30分では起床直後に成績が一時悪化。5分はほぼ効果なし。
  https://pubmed.ncbi.nlm.nih.gov/16796222/
- **Tietzel & Lack (2002)**: 30秒・90秒の「超短時間仮眠」は効果なし、10分は有効。 https://pubmed.ncbi.nlm.nih.gov/12220317/
- **Lovato & Lack (2010, *Prog Brain Res* 185:155-166) レビュー**: 5〜15分の短い仮眠はほぼ即座に効果が出て **1〜3時間持続**。30分超の仮眠は起床直後に睡眠慣性があるが、その後は長時間効果が続く。午後早い時間が最適。 https://pubmed.ncbi.nlm.nih.gov/21075238/
- **NASA 操縦士研究 (Rosekind et al. 1994)**: 40分の休憩機会で平均入眠 5.6分・睡眠 25.8分。着陸フェーズまで覚醒度・成績が改善(よく引用される「成績34%・覚醒54%向上」は1995年の要約論文由来で原典要確認)。 https://ntrs.nasa.gov/citations/19950006379
- **注意 (Hilditch, Dorrian & Banks 2017 レビュー)**: 「30分以内なら慣性なし」は一律には言えない。前夜の睡眠不足や時間帯次第で短い仮眠でも深睡眠(SWS)に入る。 https://digital.library.adelaide.edu.au/items/3314e5ee-e2af-4e68-a541-99e22d7a654d

**設計への含意**: タイマーは「横になってからの時間」なので入眠潜時 ~5分を足して **20分デフォルトは妥当**。30分以上を選択したら「起床後しばらくぼんやりしやすい」と表示。

### 1.2 時間帯(午後の眠気のディップ)
- **Monk (2005)**: 昼食後の眠気(post-lunch dip)は食事をとらなくても起こる内因性(概日リズムの約12時間成分)の現象。高炭水化物の昼食で増悪、朝型で顕著。 https://pubmed.ncbi.nlm.nih.gov/15892914/
- **厚生労働省「健康づくりのための睡眠指針2014」**: 「**午後の早い時刻に30分以内の短い昼寝**」が眠気解消に有効(2023年版ガイドの昼寝記載は原文未確認)。厚労省資料: https://www.mhlw.go.jp/content/10904750/001222160.pdf
- 個人差: 目安は**起床から 7〜8時間後**(6時起床なら 13〜14時)。夕方以降の仮眠は夜間睡眠を妨げやすい。

**含意**: 時間帯カテゴリの事前スコアは「12〜15時 > 10〜12時 ≈ 15〜16時 > 16時以降」。起床時刻の記録(SleepLog.wake_time)があれば「起床+7h」を個人化したピークに使える。

### 1.3 コーヒーナップ
- **Reyner & Horne (1997, *Psychophysiology*)**: 眠い被験者12名、運転シミュレータ。**カフェイン + 15分以内の仮眠**は居眠り関連インシデントを**プラセボ比 9%**まで低減(カフェイン単独は 34%)。 https://pubmed.ncbi.nlm.nih.gov/9401427/
- **Hayashi, Masuda & Hori (2003, *Clin Neurophysiol*)**: 昼食後 20分仮眠。**カフェイン 200mg を仮眠直前**に摂取した条件が主観的眠気・成績とも最良で、効果は起床後1時間持続。起床直後の高照度光も同等(成績以外)、洗顔は一時的効果のみ。n=10。 https://pubmed.ncbi.nlm.nih.gov/14652086/
- 原理: カフェインの効果発現は摂取後 20〜30分 → 仮眠明けに効き始め、睡眠慣性を打ち消す。

**含意**: NapLog に任意の `caffeine: boolean` を追加すれば「コーヒーナップ」を1カテゴリとして推薦対象にできる。カフェイン量の推奨表示は健康情報になるため「コーヒー1杯程度」の表現に留めるのが無難。夕方以降はカフェインが夜間睡眠を妨げる点も表示。

### 1.4 睡眠慣性の持続時間(評価タイミング)
- **Tassi & Muzet (2000, *Sleep Med Rev*)**: 報告は1分〜4時間と幅広いが、**大きな睡眠不足がなければ 30分を超えることは稀**。深睡眠中の起床で最も強い。 https://www.em-consulte.com/article/588100/sleep-inertia
- **Hilditch et al. (2023)**: 夜勤中 30分仮眠では回復に最大45分、**10分仮眠ではほぼ慣性なし**(事前に十分休養した被験者での最良ケース)。※原典URLは要確認(検索要約ベース)
- **Brooks & Lack (2006)**: 20〜30分仮眠では起床後少なくとも約30分は慣性の影響。

**含意(評価リマインド)**: 起床直後の「集中力」評価は慣性で過小評価され、長い仮眠ほど不利に偏る。
- 推奨: **アラーム時刻 + 15分**で「仮眠の効果を評価しましょう」通知(`duration_minutes >= 30` なら +30分)。
- 起床直後にもアプリ内で評価は可能にしつつ、`rated_at - nap_end` の分数を保存しておくと後で補正・除外できる(下記2章)。
- 評価が無いまま **3時間** 経過したら記憶バイアスが大きいので再通知しない。

### 1.5 睡眠負債と仮眠の効果
- 上記の主要研究(Brooks & Lack 2006 等)は**睡眠制限下(5時間睡眠)**で効果を確認しており、睡眠不足時に仮眠の効果が出やすい。
- **Faraut et al. (2015, *JCEM*)**: 2時間睡眠の翌日に 30分×2回の仮眠でノルアドレナリン・IL-6 が正常範囲に回復(n=11)。 https://www.endocrine.org/news-and-advocacy/news-room/2015/napping-reverses-health-effects-of-poor-sleep
- 一方、睡眠負債が大きいと**入眠が速く深睡眠に入りやすい** → 同じ20分でも慣性が強くなる(Hilditch 2017)。
- 仮眠は夜間睡眠の代替にはならない(負債の解消は夜の睡眠で)。

**含意**: 推薦ロジックでは睡眠負債を「層(stratum)」として扱う(例: 負債 <1h / 1〜2h / ≥2h)。負債が大きい日は「短め(15〜20分)+ コーヒーナップ」を優先し、30分以上を推奨しない。負債 ≥2h の日にはホームで「今夜は早めの就寝を」の一言を出す。

---

## 2. 少数データでの推薦ロジック指針

### 2.1 スコア定義
- 1回の仮眠の成果スコア(1〜5): `outcome = (post_nap_focus + (6 - post_nap_sleepiness)) / 2`(気分があれば重み 0.5 で加味)。
- 改善量を見たい場合は `delta = (6 - post_nap_sleepiness) - (6 - pre_nap_sleepiness)` も併記可能。ただし主指標は1本に絞る(UIが複雑になるため)。

### 2.2 ベイズ縮小(加重平均を事前値へ寄せる)
カテゴリ c(時間帯×長さ、場所、姿勢 など)の推定値:

```
shrunk_c = (k * prior_c + n_c * mean_c) / (k + n_c)
```
- `k`(擬似サンプル数)= **3** を推奨(2〜5で調整)。n=3 で個人データと事前値が半々。
- `prior_c` = **ユーザー全体平均**(全仮眠の outcome 平均)+ 文献ボーナス。全体データが 5件未満なら全体平均の代わりに **3.0**(5段階の中央)を使う。
- 文献ボーナス例(outcome スケール上の加点): 時間帯 12〜15時 **+0.3**、16時以降 **−0.3**、長さ 10〜20分 **+0.2**、30分以上 **−0.2**(慣性)。
- 根拠: Beta/Dirichlet 事前分布による事後平均と同形(Evan Miller "Bayesian Average Ratings")。 https://evanmiller.org/bayesian-average-ratings.html / https://www.evanmiller.org/ranking-items-with-star-ratings.html

### 2.3 最小サンプル数と信頼度表示
| 総記録数 / カテゴリ n | 表示 |
|---|---|
| 総記録 < 3 | 個人推薦は出さず「一般的なおすすめ: 13〜15時に20分」+「あと N 回記録すると個人化されます」 |
| n_c = 0〜2 | 信頼度「低」(グレー/点線)、縮小後スコアのみ |
| n_c = 3〜6 | 信頼度「中」 |
| n_c ≥ 7 | 信頼度「高」 |

- 文言例: 「あなたのデータ 5回分にもとづく(信頼度: 中)」。数値の±表示は避け、**回数とラベル**で伝えるのが分かりやすい。
- 推薦理由を1行で併記(例:「13時台・デスクで集中力の平均が最も高い(4.2, 6回)」)。

### 2.4 その他の実務ポイント
- **探索**: 常に最良カテゴリだけを出すと他を試さなくなる。5回に1回程度、n が少ないカテゴリを「試してみませんか」と提示(ε-greedy, ε≈0.2)。トンプソンサンプリングは過剰。
- **新しさの重み**(任意): 生活が変わるため、半減期 30日の指数重み `w = 0.5^(経過日数/30)` を n と mean の両方に適用。
- **交絡**: 睡眠負債・仮眠前眠気が高い日ほど outcome が変わる。データが少ないうちは層別せず、総記録 ≥20 で負債層別を検討。
- **評価遅延の除外/補正**: 起床後 5分以内の評価で長い仮眠を不当に低評価しないよう、比較では「評価遅延 ≥10分」のデータを優先(データ不足時は全件)。
- 計算は端末内で完結(AsyncStorage)。外部API不要。

---

## 3. Expo SDK 57 API メモ

> 注: 作業環境から docs.expo.dev / expo.dev に到達できなかったため、**npm 公開パッケージ(expo-notifications@57.0.22, expo-haptics@57.0.3, expo-audio@57.0.5)の型定義・CHANGELOG・ネイティブソースを直接確認**して記述した。SDK 57 リリースノート: https://expo.dev/changelog/sdk-57 / 版付きドキュメント: https://docs.expo.dev/versions/v57.0.0/sdk/notifications/ ほか。
> 現在 `package.json` にはいずれも未導入。導入は `npx expo install expo-notifications expo-haptics expo-audio`(SDK 57 対応版 `~57.0.x` が入る)。

### 3.1 expo-notifications (~57.0.22)
- **ローカル通知の N 秒後スケジュール**:
  ```ts
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: '仮眠終了', body: '起きる時間です', sound: 'default', data: { napId } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 20 * 60, channelId: 'nap-alarm' },
  });
  await Notifications.cancelScheduledNotificationAsync(id); // 早起き・中断時
  ```
  - `SchedulableTriggerInputTypes`: `CALENDAR | DAILY | WEEKLY | MONTHLY | YEARLY | DATE | TIME_INTERVAL`。**trigger は `type` 必須のオブジェクト**(旧 `{ seconds: 60 }` だけの形式や Date 直渡しの暗黙変換に頼らない)。`DATE` は `{ type: DATE, date: Date | number }`。
  - `trigger: null` で即時表示。
- **フォアグラウンド表示**: `setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) })`。**`shouldShowAlert` は非推奨**(SDK 53 で `shouldShowBanner`/`shouldShowList` に置換)。ハンドラ未設定だとアプリ前面時に通知が表示されない。
- **権限**: `getPermissionsAsync()` / `requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })` → `granted`, `canAskAgain`, `ios.status`(`IosAuthorizationStatus.PROVISIONAL` 等)。Android 13+ は POST_NOTIFICATIONS 実行時権限。**Android ではチャンネルを先に作成**してから権限要求するのが定石。
- **Android チャンネル**: `setNotificationChannelAsync('nap-alarm', { name: '仮眠アラーム', importance: Notifications.AndroidImportance.HIGH, sound: 'default', vibrationPattern: [0, 500, 500, 500] })`。音・重要度は**作成後に変更不可**(変えたいときは別IDで作り直す)。
- **通知タップ → 評価画面遷移**: `addNotificationResponseReceivedListener(r => router.push(...r.notification.request.content.data))`、コールドスタートは `useLastNotificationResponse()` または同期版 `getLastNotificationResponse()`(SDK 53+)/ `getLastNotificationResponseAsync()`。処理後 `clearLastNotificationResponse()` で二重遷移を防ぐ。
- **Android の正確性(要注意)**: ネイティブ実装は Android 12+ で `canScheduleExactAlarms()` が偽なら **`setAndAllowWhileIdle`(非正確)にフォールバック**。パッケージの manifest は `SCHEDULE_EXACT_ALARM` を含まないため、Doze 中は**数分遅れる可能性**あり。アラーム用途で厳密にしたい場合は app.json の `android.permissions` に `SCHEDULE_EXACT_ALARM` を追加しユーザーに設定画面で許可してもらう(`USE_EXACT_ALARM` は Google Play ポリシーで目覚まし/カレンダーアプリ限定)。
- **iOS**: 通知音は最大30秒。サイレントモード/集中モードでは鳴らない場合あり。`interruptionLevel: 'timeSensitive'` は Time Sensitive entitlement が必要、`'critical'` は Apple の個別承認が必要(どちらも要ユーザー判断、4章)。カスタム音は config plugin の `sounds` に登録→要開発ビルド。
- **SDK 55〜57 の破壊的変更**: 55.0.0 で Android の Expo Go で**プッシュ**を使うと例外送出(警告→throw)。56.0.0 で iOS 最小 16.4。57.x は破壊的変更なし(バグ修正のみ)。
- **Expo Go**: **ローカル通知は動作**(起動時に「Expo Go では完全サポートではない」警告が出る)。リモートプッシュは Android の Expo Go から削除済み(SDK 53〜)。本アプリはローカル通知のみなので Expo Go で検証可能。
- **Web**: `scheduleNotificationAsync` は Web 実装が無く **`UnavailabilityError` を投げる**。権限 API はブラウザ Notification API で動く(iOS Safari は denied)。→ `Platform.OS !== 'web'` でガードし、Web はアプリ内タイマー + 画面表示のみにフォールバック。

### 3.2 expo-haptics (~57.0.3)
- API: `impactAsync(ImpactFeedbackStyle.Light|Medium|Heavy|Soft|Rigid)`, `notificationAsync(NotificationFeedbackType.Success|Warning|Error)`, `selectionAsync()`, Android 専用 `performAndroidHapticsAsync(AndroidHaptics.Confirm 等)`(VIBRATE 権限不要で推奨)。
- 用途: クイックスタートのタップ = `impactAsync(Medium)`、評価保存 = `notificationAsync(Success)`。
- Web: `navigator.vibrate` 実装あり。iOS Safari は 55.0.12 以降チェックボックスを使った擬似ハプティクス。失敗しても無害なので `catch` して無視。
- Expo Go 対応。破壊的変更は 56.0.0 の iOS 最小 16.4 のみ。iOS は低電力モード・システム設定で無効時は鳴らない。

### 3.3 expo-audio (~57.0.5) — アラーム音
- **expo-av は SDK 54 が最終版(npm `latest` = 16.0.8)で SDK 55 以降は使用不可**。音声は expo-audio を使う。
- API: `const player = useAudioPlayer(require('../assets/alarm.mp3'))` → `player.loop = true; player.volume = 1; player.play(); player.pause(); await player.seekTo(0)`。フックは自動解放、`createAudioPlayer()` は手動で `player.remove()`。再生終了後に再度鳴らすには `seekTo(0)` してから `play()`。
- `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix', shouldPlayInBackground: false })`。`interruptionModeAndroid` は**非推奨**(`interruptionMode` が両OS共通に)。
- **重要**: アプリがバックグラウンド/画面ロック中は JS タイマーが止まり、iOS では音声も止まる。`shouldPlayInBackground` + config plugin `enableBackgroundPlayback` を使っても、**無音中にバックグラウンドで待機して後から鳴らすことはできない**(iOS の制約)。→ **アラームの本体はスケジュール済みローカル通知**とし、expo-audio は「アプリ前面でアラーム時刻を迎えた場合」の大きめの音・ループ用に限定する。
- Android の `shouldPlayInBackground` は lock-screen 制御なしだと約3分で停止。
- Web: HTMLMediaElement 実装で動作。ただしブラウザの自動再生制限により、**ユーザー操作(開始タップ)後でないと再生できない**ことがある → 開始ボタン押下時にプレイヤーを生成/preload しておく。
- Expo Go 対応(録音・バックグラウンド等の config plugin 設定は開発ビルドが必要)。音源ファイルは要ライセンス確認(自作 or CC0)。

---

## 4. Phase2 ロードマップ(優先度順)

1. **[P0] 仮眠終了アラーム = ローカル通知化**(開始時に `TIME_INTERVAL` で予約、中断で cancel)。Web はアプリ内タイマー表示のみ。前面時は expo-audio + haptics。
2. **[P0] 評価リマインド通知**: アラーム + 15分(≥30分仮眠は +30分)、タップで `nap/result` へ。評価済みならキャンセル。3時間で失効。`rated_at` を保存。
3. **[P0] おすすめ仮眠 v1**: 2章のベイズ縮小(k=3)+ 文献 prior + 信頼度ラベル。総記録 <3 は一般推奨(13〜15時・20分)。
4. **[P1] ワンタップ開始**: おすすめ(長さ・場所・姿勢)を初期値にして即開始。
5. **[P1] 睡眠負債連動**: 負債 ≥1h の日は「20分以内 + コーヒーナップ」を提案、15時以降は短め・カフェイン非推奨表示。
6. **[P2] コーヒーナップ記録**(`caffeine` フラグ)と比較グラフ、起床+7h の個人化ピーク表示。
7. **[P2] Android 正確アラーム権限の案内**(SCHEDULE_EXACT_ALARM、設定画面へ誘導)。

### 要ユーザー判断(費用・契約が発生しうるもの)
- **要ユーザー判断**: **Apple Developer Program(年額 99 USD)** — iOS 実機への開発ビルド配布・TestFlight・App Store 公開、通知の Time Sensitive entitlement、カスタム通知音の実機検証に必要。Expo Go での検証だけなら不要。
- **要ユーザー判断**: **Google Play Developer 登録(初回 25 USD)** — Android 配布時。`USE_EXACT_ALARM` 申告などポリシー対応も含む。
- **要ユーザー判断**: **EAS Build / EAS Update の有料プラン** — 無料枠(ビルド回数・キュー待ち制限)を超える場合。ローカルビルドなら不要。
- **要ユーザー判断**: **Critical Alerts(iOS)** — Apple への申請・審査が必要(医療/安全系向けで本アプリは通りにくい)。推奨しない。
- **要ユーザー判断**: **ウェアラブル/睡眠計測API連携**(Oura・Fitbit・Garmin 等の有料サービス / HealthKit・Health Connect は無料だが実機配布に上記開発者登録が必要)。Phase1方針(センサーなし)からの変更にもなる。
- **要ユーザー判断**: **リモートプッシュ・サーバー同期・アカウント**(サーバー費用が発生)。現状ローカル通知のみで要件を満たせるため不要。
- **要ユーザー判断**: **マネタイズ(サブスク/課金・広告)** — RevenueCat 等の手数料、App Store/Play の手数料、特商法表記など。
- **要ユーザー判断**: **有料アラーム音素材の購入** — 自作または CC0 素材なら不要。
