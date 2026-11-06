import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ChipSelect } from '@/components/ChipSelect';
import { Body, Button, Card, Label, Screen, Title } from '@/components/ui';
import { OCCASIONS } from '@/domain/catalog';
import { missingFor, rankStaples, type Suggestion } from '@/domain/recommend';
import type { Occasion } from '@/domain/types';
import { DEFAULT_WEATHER } from '@/services/weatherApi';
import { todayISO, useStore } from '@/state/store';

function SuggestionRow({ s }: { s: Suggestion }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      if (Platform.OS === 'web') await navigator.clipboard.writeText(s.searchKeyword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Card>
      <Body style={{ fontWeight: '700' }}>{s.label}</Body>
      <Body muted>{s.reason}</Body>
      <View style={styles.kwRow}>
        <Body style={{ flex: 1 }}>🔍 {s.searchKeyword}</Body>
        <Button small variant="secondary" title={copied ? 'コピーしました' : 'キーワードをコピー'} onPress={copy} />
      </View>
    </Card>
  );
}

export default function RecommendScreen() {
  const { items, outfits, wearLogs, profile, ready } = useStore();
  const [occasion, setOccasion] = useState<Occasion>('weddingGuest');
  const [ranked, setRanked] = useState<Suggestion[] | null>(null);
  const today = todayISO();

  const weather = { ...DEFAULT_WEATHER(today), precipProb: occasion === 'rain' ? 80 : 0, snow: occasion === 'snowEvent' };
  const missing = missingFor({ closet: items, ctx: { occasion, taste: 'kireime', weather, profile, today }, outfits, wearLogs });

  useEffect(() => {
    if (!ready) return;
    setRanked(null);
    const t = setTimeout(() => setRanked(rankStaples(items, profile, today, outfits)), 0);
    return () => clearTimeout(t);
  }, [ready, items, profile, outfits, today]);

  return (
    <Screen>
      <Title>今の場面で足りない服</Title>
      <ChipSelect options={OCCASIONS} value={occasion} onChange={setOccasion} />
      {missing.length === 0 ? <Body muted>この場面に必要な服はそろっています 👍</Body> : missing.map((s) => <SuggestionRow key={s.id} s={s} />)}
      <Title>買い足すと効果が大きい服</Title>
      <Label>普段・通勤・デート・結婚式・雨の日で、70点以上のコーデが増える数の順</Label>
      {ranked === null && <Body muted>計算中…</Body>}
      {ranked && ranked.length === 0 && <Body muted>今のクローゼットでは、定番アイテムを足しても増えるコーデが見つかりませんでした。まずトップス・ボトムス・靴を登録しましょう。</Body>}
      {ranked?.map((s) => <SuggestionRow key={s.id} s={s} />)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kwRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
