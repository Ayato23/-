import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ChipSelect } from '@/components/ChipSelect';
import { ItemCard } from '@/components/ItemCard';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { Body, Button, Card, Label, Screen } from '@/components/ui';
import { WeatherBar } from '@/components/WeatherBar';
import { CATEGORIES, OCCASIONS, TASTES, subcategoryLabel } from '@/domain/catalog';
import { ruleCritic } from '@/domain/critic';
import type { Category, Occasion, Taste, WeatherSnapshot } from '@/domain/types';
import { todayISO, useStore } from '@/state/store';

export default function ManualScreen() {
  const { items, profile, saveOutfit } = useStore();
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [occasion, setOccasion] = useState<Occasion>('everyday');
  const [taste, setTaste] = useState<Taste>('casual');
  const [picked, setPicked] = useState<Partial<Record<Category, string>>>({});

  const byId = new Map(items.map((i) => [i.id, i]));
  const selected = Object.values(picked)
    .map((id) => (id ? byId.get(id) : undefined))
    .filter((i) => !!i);
  const ctx = weather ? { occasion, taste, weather, profile, today: todayISO() } : null;
  const evaluation = ctx && selected.length > 0 ? ruleCritic.evaluate(selected, ctx, items) : null;

  const toggle = (cat: Category, id: string) => setPicked((p) => ({ ...p, [cat]: p[cat] === id ? undefined : id }));

  const applySwap = (fromId: string, toId: string) => {
    const to = byId.get(toId);
    if (!to) return;
    setPicked((p) => {
      const next = { ...p };
      for (const k of Object.keys(next) as Category[]) if (next[k] === fromId) next[k] = undefined;
      next[to.category] = toId;
      return next;
    });
  };

  const save = async () => {
    const o = await saveOutfit({
      itemIds: selected.map((i) => i.id),
      source: 'manual',
      occasion,
      taste,
      weather: weather ?? undefined,
      rejected: false,
    });
    router.replace(`/outfit/${o.id}`);
  };

  return (
    <Screen>
      <WeatherBar value={weather} onChange={setWeather} />
      <Label>場面</Label>
      <ChipSelect options={OCCASIONS} value={occasion} onChange={setOccasion} />
      <Label>テイスト</Label>
      <ChipSelect options={TASTES} value={taste} onChange={setTaste} />
      {CATEGORIES.map((cat) => {
        const list = items.filter((i) => i.category === cat.id);
        if (list.length === 0) return null;
        return (
          <View key={cat.id} style={{ gap: 6 }}>
            <Label>{cat.label}</Label>
            <ScrollView horizontal contentContainerStyle={styles.list}>
              {list.map((i) => (
                <View key={i.id} style={{ width: 88 }}>
                  <ItemCard item={i} selected={picked[cat.id] === i.id} onPress={() => toggle(cat.id, i.id)} />
                </View>
              ))}
            </ScrollView>
          </View>
        );
      })}
      {items.length === 0 && <Body muted>先にクローゼットに服を登録してください。</Body>}
      {evaluation && (
        <Card>
          <ScoreBreakdown evaluation={evaluation} />
          {evaluation.swaps.map((s) => {
            const from = byId.get(s.fromItemId);
            const to = byId.get(s.toItemId);
            if (!from || !to) return null;
            return (
              <Button
                key={`${s.fromItemId}-${s.toItemId}`}
                small
                variant="secondary"
                title={`${subcategoryLabel(from.subcategory)} → ${to.brand ? `${to.brand} ` : ''}${subcategoryLabel(to.subcategory)}に替えると +${s.gain}点`}
                onPress={() => applySwap(s.fromItemId, s.toItemId)}
              />
            );
          })}
        </Card>
      )}
      <Button title="このコーデを保存" onPress={save} disabled={selected.length === 0} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
});
