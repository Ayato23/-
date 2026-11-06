import { Link, Stack, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChipSelect } from '@/components/ChipSelect';
import { ItemCard } from '@/components/ItemCard';
import { OutfitActions } from '@/components/OutfitActions';
import { OutfitView } from '@/components/OutfitView';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { Body, Button, Card, Label, Screen } from '@/components/ui';
import { WeatherBar } from '@/components/WeatherBar';
import { OCCASIONS, TASTES, subcategoryLabel } from '@/domain/catalog';
import { ruleEngine, type SuggestResult } from '@/domain/engine';
import type { Level, Occasion, Outfit, Taste, WeatherSnapshot } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { todayISO, useStore } from '@/state/store';

export default function CoordinateScreen() {
  const theme = useTheme();
  const store = useStore();
  const { items, outfits, wearLogs, profile } = store;
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [occasion, setOccasion] = useState<Occasion>('everyday');
  const [taste, setTaste] = useState<Taste>('casual');
  const [heroId, setHeroId] = useState<string | undefined>();
  const [pickingHero, setPickingHero] = useState(false);
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [savedIds, setSavedIds] = useState<Record<number, string>>({});

  // 条件を変えたら、古い条件で組んだ提案は消す
  const changed = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setResult(null);
    setSavedIds({});
  };

  const byId = new Map(items.map((i) => [i.id, i]));
  const hero = heroId ? byId.get(heroId) : undefined;
  const today = todayISO();

  const run = () => {
    if (!weather) return;
    setSavedIds({});
    setResult(
      ruleEngine.suggest({
        closet: items,
        ctx: { occasion, taste, weather, profile, today },
        outfits,
        wearLogs,
        heroItemId: heroId,
      }),
    );
  };

  const persist = async (idx: number, itemIds: string[], patch: Partial<Outfit>): Promise<string> => {
    const existing = savedIds[idx];
    if (existing) {
      await store.updateOutfit(existing, patch);
      return existing;
    }
    const o = await store.saveOutfit({ itemIds, source: 'auto', occasion, taste, weather: weather ?? undefined, rejected: false, ...patch });
    setSavedIds((s) => ({ ...s, [idx]: o.id }));
    return o.id;
  };

  const savedOutfit = (idx: number) => outfits.find((o) => o.id === savedIds[idx]);
  const wornToday = (idx: number) => wearLogs.some((w) => w.outfitId === savedIds[idx] && w.date === today);

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable accessibilityRole="button" accessibilityLabel="設定" style={{ paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 20 }}>⚙️</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <WeatherBar value={weather} onChange={changed(setWeather)} />
      <Label>場面</Label>
      <ChipSelect options={OCCASIONS} value={occasion} onChange={changed(setOccasion)} />
      <Label>テイスト</Label>
      <ChipSelect options={TASTES} value={taste} onChange={changed(setTaste)} />
      <Label>主役の服(任意)</Label>
      <View style={styles.heroRow}>
        <Body>{hero ? `★ ${hero.brand ? `${hero.brand} ` : ''}${subcategoryLabel(hero.subcategory)}` : 'なし'}</Body>
        <Button small variant="secondary" title={pickingHero ? '閉じる' : '選ぶ'} onPress={() => setPickingHero((v) => !v)} />
        {hero && <Button small variant="secondary" title="解除" onPress={() => changed(setHeroId)(undefined)} />}
      </View>
      {pickingHero && (
        <ScrollView horizontal contentContainerStyle={styles.heroList}>
          {items.map((i) => (
            <View key={i.id} style={{ width: 88 }}>
              <ItemCard
                item={i}
                selected={i.id === heroId}
                onPress={() => {
                  changed(setHeroId)(i.id);
                  setPickingHero(false);
                }}
              />
            </View>
          ))}
          {items.length === 0 && <Body muted>服が未登録です</Body>}
        </ScrollView>
      )}
      <Button title="コーデを組む" onPress={run} disabled={!weather} />

      {result && result.missing.length > 0 && (
        <Card>
          {result.missing.map((m) => (
            <Body key={m}>・{m}</Body>
          ))}
          <Button small variant="secondary" title="おすすめを見る" onPress={() => router.push('/recommend')} />
        </Card>
      )}
      {result && result.candidates.length === 0 && result.missing.length === 0 && (
        <Body muted>条件に合うコーデが組めませんでした。場面やテイストを変えてみてください。</Body>
      )}
      {result && result.candidates.length > 0 && (
        <ScrollView horizontal contentContainerStyle={styles.cards} showsHorizontalScrollIndicator>
          {result.candidates.map((c, idx) => {
            const saved = savedOutfit(idx);
            return (
              <Card key={c.itemIds.join()} style={styles.card}>
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>案 {idx + 1}</Text>
                <OutfitView items={c.itemIds.map((id) => byId.get(id))} />
                <ScoreBreakdown evaluation={c.evaluation} commentsLimit={2} />
                <OutfitActions
                  rating={saved?.rating}
                  rejected={saved?.rejected}
                  wornToday={wornToday(idx)}
                  onRate={(r: Level) => persist(idx, c.itemIds, { rating: r, rejected: false })}
                  onReject={() => persist(idx, c.itemIds, { rejected: !saved?.rejected })}
                  onWear={async () => {
                    const id = await persist(idx, c.itemIds, {});
                    await store.logWear(id, today);
                  }}
                />
              </Card>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroList: { gap: 8, paddingVertical: 4 },
  cards: { gap: 12, paddingVertical: 4 },
  card: { width: 310 },
});
